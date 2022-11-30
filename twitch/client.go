package twitch

import (
	"errors"
	"fmt"
	"time"

	"git.sr.ht/~hamcha/containers"
	lru "github.com/hashicorp/golang-lru"
	jsoniter "github.com/json-iterator/go"
	"github.com/nicklaw5/helix/v2"
	"github.com/strimertul/strimertul/database"
	"github.com/strimertul/strimertul/http"
	"go.uber.org/zap"
)

var json = jsoniter.ConfigFastest

type Client struct {
	Config     Config
	Bot        *Bot
	db         *database.LocalDBClient
	API        *helix.Client
	logger     *zap.Logger
	eventCache *lru.Cache

	restart            chan bool
	streamOnline       *containers.RWSync[bool]
	savedSubscriptions map[string]bool
}

func NewClient(db *database.LocalDBClient, server *http.Server, logger *zap.Logger) (*Client, error) {
	eventCache, err := lru.New(128)
	if err != nil {
		return nil, fmt.Errorf("could not create LRU cache for events: %w", err)
	}

	// Get Twitch Config
	var config Config
	err = db.GetJSON(ConfigKey, &config)
	if err != nil {
		if !errors.Is(err, database.ErrEmptyKey) {
			return nil, fmt.Errorf("failed to get twitch Config: %w", err)
		}
		config.Enabled = false
	}

	// Create Twitch client
	client := &Client{
		Config:             config,
		db:                 db,
		logger:             logger.With(zap.String("service", "twitch")),
		restart:            make(chan bool, 128),
		streamOnline:       containers.NewRWSync(false),
		eventCache:         eventCache,
		savedSubscriptions: make(map[string]bool),
	}

	// Listen for Config changes
	err = db.SubscribeKey(ConfigKey, func(value string) {
		err := json.UnmarshalFromString(value, &config)
		if err != nil {
			client.logger.Error("failed to unmarshal Config", zap.Error(err))
			return
		}
		api, err := client.getHelixAPI(config)
		if err != nil {
			client.logger.Warn("failed to create new twitch client, keeping old credentials", zap.Error(err))
			return
		}
		client.API = api
		client.Config = config

		client.logger.Info("reloaded/updated Twitch API")
	})
	if err != nil {
		client.logger.Error("could not setup twitch Config reload subscription", zap.Error(err))
	}

	err = db.SubscribeKey(BotConfigKey, func(value string) {
		var twitchBotConfig BotConfig
		err := json.UnmarshalFromString(value, &twitchBotConfig)
		if err != nil {
			client.logger.Error("failed to unmarshal Config", zap.Error(err))
			return
		}
		err = client.Bot.Client.Disconnect()
		if err != nil {
			client.logger.Warn("failed to disconnect from Twitch IRC", zap.Error(err))
		}
		if client.Config.EnableBot {
			if err := client.startBot(); err != nil {
				if !errors.Is(err, database.ErrEmptyKey) {
					client.logger.Error("failed to re-create bot", zap.Error(err))
				}
			}
		}
		client.restart <- true
		client.logger.Info("reloaded/restarted Twitch bot")
	})
	if err != nil {
		client.logger.Error("could not setup twitch bot Config reload subscription", zap.Error(err))
	}

	if config.Enabled {
		client.API, err = client.getHelixAPI(config)
		if err != nil {
			client.logger.Error("failed to create twitch client", zap.Error(err))
		} else {
			server.SetRoute("/twitch/callback", client.AuthorizeCallback)

			go client.runStatusPoll()
			go client.connectWebsocket()
		}
	}

	if client.Config.EnableBot {
		if err := client.startBot(); err != nil {
			if !errors.Is(err, database.ErrEmptyKey) {
				return nil, err
			}
		}
	}

	go func() {
		for {
			if client.Config.EnableBot && client.Bot != nil {
				err := client.RunBot()
				if err != nil {
					client.logger.Error("failed to connect to Twitch IRC", zap.Error(err))
					// Wait for Config change before retrying
					<-client.restart
				}
			} else {
				<-client.restart
			}
		}
	}()

	return client, nil
}

func (c *Client) runStatusPoll() {
	c.logger.Info("status poll started")
	for {
		// Wait for next poll
		time.Sleep(60 * time.Second)

		// Make sure we're configured and connected properly first
		if !c.Config.Enabled || c.Bot == nil || c.Bot.Config.Channel == "" {
			continue
		}

		// Check if streamer is online, if possible
		func() {
			status, err := c.API.GetStreams(&helix.StreamsParams{
				UserLogins: []string{c.Bot.Config.Channel}, // TODO Replace with something non bot dependant
			})
			if err != nil {
				c.logger.Error("Error checking stream status", zap.Error(err))
			} else {
				c.streamOnline.Set(len(status.Data.Streams) > 0)
			}

			err = c.db.PutJSON(StreamInfoKey, status.Data.Streams)
			if err != nil {
				c.logger.Warn("Error saving stream info", zap.Error(err))
			}
		}()
	}
}

func (c *Client) startBot() error {
	// Get Twitch bot Config
	var twitchBotConfig BotConfig
	err := c.db.GetJSON(BotConfigKey, &twitchBotConfig)
	if err != nil {
		if !errors.Is(err, database.ErrEmptyKey) {
			return fmt.Errorf("failed to get bot Config: %w", err)
		}
		c.Config.EnableBot = false
	}

	// Create and run IRC bot
	c.Bot = NewBot(c, twitchBotConfig)

	return nil
}

func (c *Client) getHelixAPI(config Config) (*helix.Client, error) {
	redirectURI, err := c.getRedirectURI()
	if err != nil {
		return nil, err
	}

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

func (c *Client) RunBot() error {
	cherr := make(chan error)
	go func() {
		cherr <- c.Bot.Connect()
	}()
	select {
	case <-c.restart:
		return nil
	case err := <-cherr:
		return err
	}
}

func (c *Client) IsLive() bool {
	return c.streamOnline.Get()
}

func (c *Client) Close() error {
	return c.Bot.Client.Disconnect()
}
