package twitch

import (
	"github.com/nicklaw5/helix"
	"github.com/sirupsen/logrus"
	"github.com/strimertul/strimertul/database"
)

type Client struct {
	db     *database.DB
	API    *helix.Client
	logger logrus.FieldLogger
}

func NewClient(db *database.DB, config Config, log logrus.FieldLogger) (*Client, error) {
	if log == nil {
		log = logrus.New()
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

	return &Client{
		db:     db,
		API:    api,
		logger: log,
	}, nil
}
