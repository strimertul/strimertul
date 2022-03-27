package twitch

import (
	"errors"
	"fmt"
	"time"

	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/database"
	"github.com/strimertul/strimertul/modules/loyalty"

	"git.sr.ht/~hamcha/containers"
	jsoniter "github.com/json-iterator/go"
	"github.com/nicklaw5/helix/v2"
	"go.uber.org/zap"
)

type Client struct {
	Config Config
	Bot    *Bot
	db     *database.DBModule
	API    *helix.Client
	logger *zap.Logger

	restart      chan bool
	streamOnline *containers.RWSync[bool]
}

func Register(manager *modules.Manager) error {
	db, ok := manager.Modules["db"].(*database.DBModule)
	if !ok {
		return errors.New("db module not found")
	}

	logger := manager.Logger(modules.ModuleTwitch)

	// Get Twitch config
	var config Config
	err := db.GetJSON(ConfigKey, &config)
	if err != nil {
		if !errors.Is(err, database.ErrEmptyKey) {
			return fmt.Errorf("failed to get twitch config: %w", err)
		}
		config.Enabled = false
	}

	// Create Twitch client
	var api *helix.Client

	if config.Enabled {
		api, err = getHelixAPI(config.APIClientID, config.APIClientSecret)
		if err != nil {
			return fmt.Errorf("failed to create twitch client: %w", err)
		}
	}

	client := &Client{
		Config:       config,
		db:           db,
		API:          api,
		logger:       logger,
		restart:      make(chan bool, 128),
		streamOnline: containers.NewRWSync(false),
	}

	if client.Config.EnableBot {
		if err := client.startBot(manager); err != nil {
			if !errors.Is(err, database.ErrEmptyKey) {
				return err
			}
		}
	}

	go client.runStatusPoll()

	go func() {
		for {
			if client.Config.EnableBot && client.Bot != nil {
				err := client.RunBot()
				if err != nil {
					logger.Error("failed to connect to Twitch IRC", zap.Error(err))
					// Wait for config change before retrying
					<-client.restart
				}
			} else {
				<-client.restart
			}
		}
	}()

	// Listen for config changes
	go db.Subscribe(func(key, value string) {
		switch key {
		case ConfigKey:
			err := jsoniter.ConfigFastest.UnmarshalFromString(value, &config)
			if err != nil {
				logger.Error("failed to unmarshal config", zap.Error(err))
				return
			}
			api, err := getHelixAPI(config.APIClientID, config.APIClientSecret)
			if err != nil {
				logger.Warn("failed to create new twitch client, keeping old credentials", zap.Error(err))
				return
			}
			client.API = api
			client.restart <- true
			logger.Info("reloaded/updated Twitch API")
		case BotConfigKey:
			var twitchBotConfig BotConfig
			err := jsoniter.ConfigFastest.UnmarshalFromString(value, &twitchBotConfig)
			if err != nil {
				logger.Error("failed to unmarshal config", zap.Error(err))
				return
			}
			err = client.Bot.Client.Disconnect()
			if err != nil {
				logger.Warn("failed to disconnect from Twitch IRC", zap.Error(err))
			}

			if client.Config.EnableBot {
				if err := client.startBot(manager); err != nil {
					if !errors.Is(err, database.ErrEmptyKey) {
						logger.Error("failed to re-create bot", zap.Error(err))
					}
				}
			}
			client.restart <- true

			logger.Info("reloaded/restarted Twitch bot")
		}
	}, ConfigKey, BotConfigKey)

	manager.Modules[modules.ModuleTwitch] = client

	return nil
}

func (c *Client) runStatusPoll() {
	c.logger.Info("status poll started")
	for {
		// Wait for next poll
		time.Sleep(60 * time.Second)

		// Check if streamer is online, if possible
		func() {
			status, err := c.API.GetStreams(&helix.StreamsParams{
				UserLogins: []string{c.Bot.config.Channel}, //TODO Replace with something non bot dependant
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

func (c *Client) startBot(manager *modules.Manager) error {
	// Get Twitch bot config
	var twitchBotConfig BotConfig
	err := c.db.GetJSON(BotConfigKey, &twitchBotConfig)
	if err != nil {
		if !errors.Is(err, database.ErrEmptyKey) {
			return fmt.Errorf("failed to get bot config: %w", err)
		}
		c.Config.EnableBot = false
	}

	// Create and run IRC bot
	c.Bot = NewBot(c, twitchBotConfig)

	// If loyalty module is enabled, set-up loyalty commands
	if loyaltyManager, ok := manager.Modules[modules.ModuleLoyalty].(*loyalty.Manager); ok && c.Bot != nil {
		c.Bot.SetupLoyalty(loyaltyManager)
	}

	return nil
}

func getHelixAPI(clientID string, clientSecret string) (*helix.Client, error) {
	// Create Twitch client
	api, err := helix.NewClient(&helix.Options{
		ClientID:     clientID,
		ClientSecret: clientSecret,
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

func (c *Client) Status() modules.ModuleStatus {
	if !c.Config.Enabled {
		return modules.ModuleStatus{
			Enabled: false,
		}
	}

	return modules.ModuleStatus{
		Enabled:      true,
		Working:      c.Bot != nil && c.Bot.Client != nil,
		Data:         struct{}{},
		StatusString: "",
	}
}

func (c *Client) Close() error {
	return c.Bot.Client.Disconnect()
}
