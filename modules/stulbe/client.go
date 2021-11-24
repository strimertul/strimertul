package stulbe

import (
	"context"
	"errors"

	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/database"

	"github.com/sirupsen/logrus"
	"github.com/strimertul/stulbe-client-go"
)

type Manager struct {
	Client *stulbe.Client
	db     *database.DB
	logger logrus.FieldLogger

	restart chan bool
}

func Initialize(manager *modules.Manager) (*Manager, error) {
	db, ok := manager.Modules["db"].(*database.DB)
	if !ok {
		return nil, errors.New("db module not found")
	}

	logger := manager.Logger(modules.ModuleStulbe)

	var config Config
	err := db.GetJSON(ConfigKey, &config)
	if err != nil {
		return nil, err
	}

	// Create client
	stulbeClient, err := stulbe.NewClient(stulbe.ClientOptions{
		Endpoint: config.Endpoint,
		Username: config.Username,
		AuthKey:  config.AuthKey,
		Logger:   logger,
	})
	if err != nil {
		return nil, err
	}

	// Create manager
	stulbeManager := &Manager{
		Client:  stulbeClient,
		db:      db,
		logger:  logger,
		restart: make(chan bool),
	}

	// Register module
	manager.Modules[modules.ModuleStulbe] = stulbeManager

	// Receive key updates
	go func() {
		for {
			err := stulbeManager.ReceiveEvents()
			if err != nil {
				logger.WithError(err).Error("Stulbe subscription died unexpectedly!")
				// Wait for config change before retrying
				<-stulbeManager.restart
			}
		}
	}()

	// Listen for config changes
	go db.Subscribe(context.Background(), func(changed []database.ModifiedKV) error {
		for _, kv := range changed {
			if kv.Key == ConfigKey {
				var config Config
				err := db.GetJSON(ConfigKey, &config)
				if err != nil {
					logger.WithError(err).Warn("Failed to get config")
					continue
				}

				client, err := stulbe.NewClient(stulbe.ClientOptions{
					Endpoint: config.Endpoint,
					Username: config.Username,
					AuthKey:  config.AuthKey,
					Logger:   logger,
				})
				if err != nil {
					logger.WithError(err).Warn("Failed to update stulbe client, keeping old settings")
				} else {
					stulbeManager.Client.Close()
					stulbeManager.Client = client
					stulbeManager.restart <- true
					logger.Info("updated/restarted stulbe client")
				}
			}
		}
		return nil
	}, ConfigKey)

	return stulbeManager, nil
}

func (m *Manager) ReceiveEvents() error {
	chn, err := m.Client.KV.SubscribePrefix("stulbe/")
	if err != nil {
		return err
	}
	for {
		select {
		case kv := <-chn:
			err := m.db.PutKey(kv.Key, []byte(kv.Value))
			if err != nil {
				return err
			}
		case <-m.restart:
			return nil
		}

	}
}

func (m *Manager) Close() error {
	m.Client.Close()
	return nil
}

func (m *Manager) ReplicateKey(prefix string) error {
	// Set key to current value
	vals, err := m.db.GetAll(prefix)
	if err != nil {
		return err
	}

	// Add prefix to keys
	newvals := make(map[string]string)
	for k, v := range vals {
		newvals[prefix+k] = v
	}

	err = m.Client.KV.SetKeys(newvals)
	if err != nil {
		return err
	}

	m.logger.WithFields(logrus.Fields{
		"prefix": prefix,
	}).Debug("synced to remote")

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

func (m *Manager) ReplicateKeys(prefixes []string) error {
	for _, prefix := range prefixes {
		err := m.ReplicateKey(prefix)
		if err != nil {
			return err
		}
	}

	return nil
}
