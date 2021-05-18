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

func (m *Manager) ReceiveEvents() error {
	chn, err := m.Client.KV.SubscribePrefix("stulbe/")
	if err != nil {
		return err
	}
	for {
		kv := <-chn
		err := m.db.PutKey(kv.Key, []byte(kv.Value))
		if err != nil {
			return err
		}
	}
}

func (m *Manager) Close() {
	m.Client.Close()
}

func (m *Manager) ReplicateKey(prefix string) error {
	// Set key to current value
	vals, err := m.db.GetAll(prefix)
	if err != nil {
		return err
	}

	err = m.Client.KV.SetKeys(vals)
	if err != nil {
		return err
	}

	m.logger.WithFields(logrus.Fields{
		"prefix": prefix,
	}).Debug("synched to remote")

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
	}, prefix)
}
