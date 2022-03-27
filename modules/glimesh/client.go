package glimesh

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/database"

	jsoniter "github.com/json-iterator/go"
	"go.uber.org/zap"
)

type Client struct {
	Config Config
	db     *database.DBModule
	logger *zap.Logger

	token ClientCredentialsResult
}

func Register(manager *modules.Manager) error {
	db, ok := manager.Modules["db"].(*database.DBModule)
	if !ok {
		return errors.New("db module not found")
	}

	logger := manager.Logger(modules.ModuleTwitch)

	// Get Glimesh config
	var config Config
	err := db.GetJSON(ConfigKey, &config)
	if err != nil {
		if !errors.Is(err, database.ErrEmptyKey) {
			return fmt.Errorf("failed to get glimesh config: %w", err)
		}
		config.Enabled = false
	}

	client := &Client{
		Config: config,
		db:     db,
		logger: logger,
	}

	if config.Enabled {
		err = client.auth()
		if err != nil {
			logger.Error("error getting credentials")
		}
	}

	// Listen for config changes
	go db.Subscribe(func(key, value string) {
		switch key {
		case ConfigKey:
			err := jsoniter.ConfigFastest.UnmarshalFromString(value, &config)
			if err != nil {
				logger.Error("failed to unmarshal config", zap.Error(err))
				return
			}
			client.Config = config
			if config.Enabled {
				err = client.auth()
				if err != nil {
					logger.Error("error getting credentials")
				}
			}
			logger.Info("reloaded/updated Glimesh API")
		}
	}, ConfigKey)

	manager.Modules[modules.ModuleGlimesh] = client

	return nil
}

func (c *Client) Status() modules.ModuleStatus {
	if !c.Config.Enabled {
		return modules.ModuleStatus{
			Enabled: false,
		}
	}

	return modules.ModuleStatus{
		Enabled:      true,
		Working:      true, //todo change with auth status??
		Data:         struct{}{},
		StatusString: "",
	}
}

func (c *Client) Close() error {
	return nil
}

func (c *Client) auth() error {
	// Obtain a token from Glimesh OAuth
	res, err := http.Post("https://glimesh.tv/api/oauth/token", "application/x-www-form-urlencoded",
		strings.NewReader(fmt.Sprintf("grant_type=client_credentials&client_id=%s&client_secret=%s&scope=chat", c.Config.APIClientID, c.Config.APIClientSecret)))
	if err != nil {
		return fmt.Errorf("authentication failed: %w", err)
	}
	defer res.Body.Close()

	err = jsoniter.ConfigFastest.NewDecoder(res.Body).Decode(&c.token)
	if err != nil {
		return fmt.Errorf("failed decoding JSON credentials: %w", err)
	}

	return nil
}
