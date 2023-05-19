package twitch

import (
	"context"
	"errors"
	"fmt"
	"time"

	"git.sr.ht/~hamcha/containers/sync"
	lru "github.com/hashicorp/golang-lru/v2"
	jsoniter "github.com/json-iterator/go"
	"github.com/nicklaw5/helix/v2"
	"go.uber.org/zap"

	"github.com/strimertul/strimertul/database"
	"github.com/strimertul/strimertul/http"
)

var json = jsoniter.ConfigFastest

type Manager struct {
	client     *Client
	cancelSubs func()
}

func NewManager(db *database.LocalDBClient, server *http.Server, logger *zap.Logger) (*Manager, error) {
	// Get Twitch config
	var config Config
	if err := db.GetJSON(ConfigKey, &config); err != nil {
		if !errors.Is(err, database.ErrEmptyKey) {
			return nil, fmt.Errorf("failed to get twitch config: %w", err)
		}
		config.Enabled = false
	}

	// Get Twitch bot config
	var botConfig BotConfig
	if err := db.GetJSON(BotConfigKey, &botConfig); err != nil {
		if !errors.Is(err, database.ErrEmptyKey) {
			return nil, fmt.Errorf("failed to get bot config: %w", err)
		}
		config.EnableBot = false
	}

	// Create new client
	client, err := newClient(config, db, server, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create twitch client: %w", err)
	}

	if config.EnableBot {
		client.Bot = newBot(client, botConfig)
		go client.Bot.Connect()
	}

	manager := &Manager{
		client: client,
	}

	// Listen for client config changes
	err, cancelConfigSub := db.SubscribeKey(ConfigKey, func(value string) {
		var newConfig Config
		if err := json.UnmarshalFromString(value, &newConfig); err != nil {
			logger.Error("Failed to decode Twitch integration config", zap.Error(err))
			return
		}

		var updatedClient *Client
		updatedClient, err = newClient(newConfig, db, server, logger)
		if err != nil {
			logger.Error("Could not create twitch client with new config, keeping old", zap.Error(err))
			return
		}

		err = manager.client.Close()
		if err != nil {
			logger.Warn("Twitch client could not close cleanly", zap.Error(err))
		}

		// New client works, replace old
		updatedClient.Merge(manager.client)
		manager.client = updatedClient

		logger.Info("Reloaded/updated Twitch integration")
	})
	if err != nil {
		logger.Error("Could not setup twitch config reload subscription", zap.Error(err))
	}

	// Listen for bot config changes
	err, cancelBotSub := db.SubscribeKey(BotConfigKey, func(value string) {
		var newBotConfig BotConfig
		if err := json.UnmarshalFromString(value, &newBotConfig); err != nil {
			logger.Error("Failed to decode bot config", zap.Error(err))
			return
		}

		if manager.client.Bot != nil {
			err = manager.client.Bot.Close()
			if err != nil {
				manager.client.logger.Warn("Failed to disconnect old bot from Twitch IRC", zap.Error(err))
			}
		}

		if manager.client.Config.Get().EnableBot {
			bot := newBot(manager.client, newBotConfig)
			go bot.Connect()
			manager.client.Bot = bot
		} else {
			manager.client.Bot = nil
		}

		manager.client.logger.Info("Reloaded/restarted Twitch bot")
	})
	if err != nil {
		client.logger.Error("Could not setup twitch bot config reload subscription", zap.Error(err))
	}

	manager.cancelSubs = func() {
		if cancelConfigSub != nil {
			cancelConfigSub()
		}
		if cancelBotSub != nil {
			cancelBotSub()
		}
	}

	return manager, nil
}

func (m *Manager) Client() *Client {
	return m.client
}

func (m *Manager) Close() error {
	m.cancelSubs()

	if err := m.client.Close(); err != nil {
		return err
	}

	return nil
}

type Client struct {
	Config     *sync.RWSync[Config]
	Bot        *Bot
	db         *database.LocalDBClient
	API        *helix.Client
	User       helix.User
	logger     *zap.Logger
	eventCache *lru.Cache[string, time.Time]
	server     *http.Server
	ctx        context.Context
	cancel     context.CancelFunc

	restart            chan bool
	streamOnline       *sync.RWSync[bool]
	savedSubscriptions map[string]bool
}

func (c *Client) Merge(old *Client) {
	// Copy bot instance and some params
	c.streamOnline.Set(old.streamOnline.Get())
	c.Bot = old.Bot
	c.ensureRoute()
}

// Hacky function to deal with sync issues when restarting client
func (c *Client) ensureRoute() {
	if c.Config.Get().Enabled {
		c.server.RegisterRoute(CallbackRoute, c)
	}
}

func newClient(config Config, db *database.LocalDBClient, server *http.Server, logger *zap.Logger) (*Client, error) {
	eventCache, err := lru.New[string, time.Time](128)
	if err != nil {
		return nil, fmt.Errorf("could not create LRU cache for events: %w", err)
	}

	// Create Twitch client
	ctx, cancel := context.WithCancel(context.Background())
	client := &Client{
		Config:             sync.NewRWSync(config),
		db:                 db,
		logger:             logger.With(zap.String("service", "twitch")),
		restart:            make(chan bool, 128),
		streamOnline:       sync.NewRWSync(false),
		eventCache:         eventCache,
		savedSubscriptions: make(map[string]bool),
		ctx:                ctx,
		cancel:             cancel,
		server:             server,
	}

	baseurl, err := client.baseURL()
	if err != nil {
		return nil, err
	}

	if config.Enabled {
		api, err := getHelixAPI(config, baseurl)
		if err != nil {
			return nil, fmt.Errorf("failed to create twitch client: %w", err)
		}

		client.API = api
		server.RegisterRoute(CallbackRoute, client)

		if userClient, err := client.GetUserClient(true); err == nil {
			users, err := userClient.GetUsers(&helix.UsersParams{})
			if err != nil {
				client.logger.Error("Failed looking up user", zap.Error(err))
			} else if len(users.Data.Users) < 1 {
				client.logger.Error("No users found, please authenticate in Twitch configuration -> Events")
			} else {
				client.User = users.Data.Users[0]
				go client.eventSubLoop(userClient)
			}
		} else {
			client.logger.Warn("Twitch user not identified, this will break most features")
		}

		go client.runStatusPoll()
	}

	return client, nil
}

func (c *Client) runStatusPoll() {
	c.logger.Info("Started polling for stream status")
	for {
		// Make sure we're configured and connected properly first
		if !c.Config.Get().Enabled || c.Bot == nil || c.Bot.Config.Channel == "" {
			continue
		}

		// Check if streamer is online, if possible
		func() {
			status, err := c.API.GetStreams(&helix.StreamsParams{
				UserLogins: []string{c.Bot.Config.Channel}, // TODO Replace with something non bot dependant
			})
			if err != nil {
				c.logger.Error("Error checking stream status", zap.Error(err))
				return
			} else {
				c.streamOnline.Set(len(status.Data.Streams) > 0)
			}

			err = c.db.PutJSON(StreamInfoKey, status.Data.Streams)
			if err != nil {
				c.logger.Warn("Error saving stream info", zap.Error(err))
			}
		}()

		// Wait for next poll (or cancellation)
		select {
		case <-c.ctx.Done():
			return
		case <-time.After(60 * time.Second):
		}
	}
}

func getHelixAPI(config Config, baseurl string) (*helix.Client, error) {
	redirectURI := getRedirectURI(baseurl)

	// Create Twitch client
	api, err := helix.NewClient(&helix.Options{
		ClientID:     config.APIClientID,
		ClientSecret: config.APIClientSecret,
		RedirectURI:  redirectURI,
	})
	if err != nil {
		return nil, err
	}

	// Get access token
	resp, err := api.RequestAppAccessToken([]string{"user:read:email"})
	if err != nil {
		return nil, err
	}
	// Set the access token on the client
	api.SetAppAccessToken(resp.Data.AccessToken)

	return api, nil
}

func (c *Client) baseURL() (string, error) {
	var severConfig struct {
		Bind string `json:"bind"`
	}
	err := c.db.GetJSON("http/config", &severConfig)
	return severConfig.Bind, err
}

func (c *Client) IsLive() bool {
	return c.streamOnline.Get()
}

func (c *Client) Close() error {
	c.server.UnregisterRoute(CallbackRoute)
	defer c.cancel()

	if c.Bot != nil {
		if err := c.Bot.Close(); err != nil {
			return err
		}
	}

	return nil
}
