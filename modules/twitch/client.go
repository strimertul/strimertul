package twitch

import (
	"context"
	"errors"
	"fmt"

	jsoniter "github.com/json-iterator/go"

	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/database"
	"github.com/strimertul/strimertul/modules/loyalty"

	"github.com/nicklaw5/helix/v2"
	"github.com/sirupsen/logrus"
)

type Client struct {
	Config Config
	Bot    *Bot
	db     *database.DB
	API    *helix.Client
	logger logrus.FieldLogger

	restart chan bool
}

func Register(manager *modules.Manager) error {
	db, ok := manager.Modules["db"].(*database.DB)
	if !ok {
		return errors.New("db module not found")
	}

	log := manager.Logger(modules.ModuleTwitch)

	// Get Twitch config
	var config Config
	err := db.GetJSON(ConfigKey, &config)
	if err != nil {
		return fmt.Errorf("failed to get twitch config: %w", err)
	}

	// Create Twitch client
	api, err := getHelixAPI(config.APIClientID, config.APIClientSecret)
	if err != nil {
		return fmt.Errorf("failed to create twitch client: %w", err)
	}

	client := &Client{
		Config:  config,
		db:      db,
		API:     api,
		logger:  log,
		restart: make(chan bool),
	}

	// Get Twitch bot config
	var twitchBotConfig BotConfig
	err = db.GetJSON(BotConfigKey, &twitchBotConfig)
	if err != nil {
		return fmt.Errorf("failed to get bot config: %w", err)
	}

	// Create and run IRC bot
	client.Bot = NewBot(client, twitchBotConfig)
	go func() {
		for {
			err := client.RunBot()
			if err != nil {
				log.WithError(err).Error("failed to connect to Twitch IRC")
				// Wait for config change before retrying
				<-client.restart
			}
		}
	}()

	// If loyalty module is enabled, set-up loyalty commands
	if loyaltyManager, ok := manager.Modules[modules.ModuleLoyalty].(*loyalty.Manager); ok && client.Bot != nil {
		client.Bot.SetupLoyalty(loyaltyManager)
	}

	// Listen for config changes
	go db.Subscribe(context.Background(), func(changed []database.ModifiedKV) error {
		for _, kv := range changed {
			switch kv.Key {
			case ConfigKey:
				err := jsoniter.ConfigFastest.Unmarshal(kv.Data, &config)
				if err != nil {
					log.WithError(err).Error("failed to unmarshal config")
					continue
				}
				api, err := getHelixAPI(config.APIClientID, config.APIClientSecret)
				if err != nil {
					log.WithError(err).Warn("failed to create new twitch client, keeping old credentials")
					continue
				}
				client.API = api
				log.Info("reloaded/updated Twitch API")
			case BotConfigKey:
				err := jsoniter.ConfigFastest.Unmarshal(kv.Data, &twitchBotConfig)
				if err != nil {
					log.WithError(err).Error("failed to unmarshal config")
					continue
				}
				err = client.Bot.Client.Disconnect()
				if err != nil {
					log.WithError(err).Warn("failed to disconnect from Twitch IRC")
				}
				client.Bot = NewBot(client, twitchBotConfig)
				client.restart <- true
				log.Info("reloaded/restarted Twitch bot")
			}
		}
		return nil
	}, ConfigKey, BotConfigKey)

	manager.Modules[modules.ModuleTwitch] = client

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
