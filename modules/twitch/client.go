package twitch

import (
	"fmt"

	"github.com/nicklaw5/helix"
	"github.com/sirupsen/logrus"
	"github.com/strimertul/strimertul/database"
)

type Client struct {
	Bot    *Bot
	db     *database.DB
	API    *helix.Client
	logger logrus.FieldLogger
}

func NewClient(db *database.DB, log logrus.FieldLogger) (*Client, error) {
	if log == nil {
		log = logrus.New()
	}

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

	// Get Twitchbot config
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

	return client, nil
}
