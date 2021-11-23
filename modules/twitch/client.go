package twitch

import (
	"errors"
	"fmt"

	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/database"
	"github.com/strimertul/strimertul/modules/loyalty"

	"github.com/nicklaw5/helix"
	"github.com/sirupsen/logrus"
)

type Client struct {
	Bot    *Bot
	db     *database.DB
	API    *helix.Client
	logger logrus.FieldLogger
}

func NewClient(manager *modules.Manager) (*Client, error) {
	db, ok := manager.Modules["db"].(*database.DB)
	if !ok {
		return nil, errors.New("db module not found")
	}

	log := manager.Logger(modules.ModuleTwitch)

	// Get Twitch config
	var config Config
	err := db.GetJSON(ConfigKey, &config)
	if err != nil {
		return nil, fmt.Errorf("failed to get twitch config: %w", err)
	}

	// Create Twitch client
	api, err := helix.NewClient(&helix.Options{
		ClientID:     config.APIClientID,
		ClientSecret: config.APIClientSecret,
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
	log.Info("obtained API access token")

	client := &Client{
		db:     db,
		API:    api,
		logger: log,
	}

	// Get Twitch bot config
	var twitchBotConfig BotConfig
	err = db.GetJSON(BotConfigKey, &twitchBotConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to get bot config: %w", err)
	}

	// Create and run IRC bot
	client.Bot = NewBot(client, twitchBotConfig)
	go func() {
		if err := client.Bot.Connect(); err != nil {
			log.WithError(err).Error("failed to connect to Twitch IRC")
		}
	}()

	// If loyalty module is enabled, set-up loyalty commands
	if loyaltyManager, ok := manager.Modules[modules.ModuleLoyalty].(*loyalty.Manager); ok && client.Bot != nil {
		client.Bot.SetupLoyalty(loyaltyManager)
	}

	manager.Modules[modules.ModuleTwitch] = client

	return client, nil
}

func (c *Client) Close() error {
	return c.Bot.Client.Disconnect()
}
