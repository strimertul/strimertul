package stulbe

import (
	"context"

	"github.com/sirupsen/logrus"

	"github.com/strimertul/stulbe-client-go"

	"github.com/strimertul/strimertul/database"
)

type Manager struct {
	Client *stulbe.Client
	db     *database.DB
	logger logrus.FieldLogger
}

func Initialize(db *database.DB, logger logrus.FieldLogger) (*Manager, error) {
	var config Config
	err := db.GetJSON(ConfigKey, &config)
	if err != nil {
		return nil, err
	}

	stulbeClient, err := stulbe.NewClient(stulbe.ClientOptions{
		Endpoint: config.Endpoint,
		Username: config.Username,
		AuthKey:  config.AuthKey,
		Logger:   logger,
	})
	if err != nil {
		return nil, err
	}

	return &Manager{
		Client: stulbeClient,
		db:     db,
		logger: logger,
	}, err
}

func (m *Manager) Close() {
	m.Client.Close()
}

func (m *Manager) ReplicateKey(key string) error {
	// Set key to current value
	val, err := m.db.GetKey(key)
	if err != nil {
		return err
	}

	err = m.Client.KV.SetKey(key, string(val))
	if err != nil {
		return err
	}
	m.logger.WithFields(logrus.Fields{
		"key": key,
	}).Debug("set to remote")

	// Subscribe to local datastore and update remote on change
	return m.db.Subscribe(context.Background(), func(pairs []database.ModifiedKV) error {
		for _, changed := range pairs {
			err := m.Client.KV.SetKey(changed.Key, string(changed.Data))
			if err != nil {
				return err
			}
			m.logger.WithFields(logrus.Fields{
				"key": changed.Key,
			}).Debug("replicated to remote")
		}

		return nil
	}, key)
}
