package stulbe

import (
	"context"
	"errors"

	"go.uber.org/zap"

	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/database"

	"github.com/strimertul/stulbe-client-go"
)

type Manager struct {
	Config Config
	Client *stulbe.Client
	db     *database.DB
	logger *zap.Logger

	restart chan bool
}

func Register(manager *modules.Manager) error {
	db, ok := manager.Modules["db"].(*database.DB)
	if !ok {
		return errors.New("db module not found")
	}

	logger := manager.Logger(modules.ModuleStulbe)

	var config Config
	err := db.GetJSON(ConfigKey, &config)
	if err != nil {
		return err
	}

	// Create client
	stulbeClient, err := stulbe.NewClient(stulbe.ClientOptions{
		Endpoint: config.Endpoint,
		Username: config.Username,
		AuthKey:  config.AuthKey,
	})
	if err != nil {
		return err
	}

	// Create manager
	stulbeManager := &Manager{
		Config:  config,
		Client:  stulbeClient,
		db:      db,
		logger:  logger,
		restart: make(chan bool),
	}

	// Receive key updates
	go func() {
		for {
			err := stulbeManager.ReceiveEvents()
			if err != nil {
				logger.Error("Stulbe subscription died unexpectedly!", zap.Error(err))
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
					logger.Warn("Failed to get config", zap.Error(err))
					continue
				}

				client, err := stulbe.NewClient(stulbe.ClientOptions{
					Endpoint: config.Endpoint,
					Username: config.Username,
					AuthKey:  config.AuthKey,
				})
				if err != nil {
					logger.Warn("Failed to update stulbe client, keeping old settings", zap.Error(err))
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

	// Register module
	manager.Modules[modules.ModuleStulbe] = stulbeManager

	return nil
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

func (m *Manager) Status() modules.ModuleStatus {
	if !m.Config.Enabled {
		return modules.ModuleStatus{
			Enabled: false,
		}
	}

	return modules.ModuleStatus{
		Enabled:      true,
		Working:      m.Client != nil,
		Data:         struct{}{},
		StatusString: "",
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

	m.logger.Debug("synced to remote", zap.String("prefix", prefix))

	// Subscribe to local datastore and update remote on change
	return m.db.Subscribe(context.Background(), func(pairs []database.ModifiedKV) error {
		for _, changed := range pairs {
			err := m.Client.KV.SetKey(changed.Key, string(changed.Data))
			if err != nil {
				return err
			}
			m.logger.Debug("replicated to remote", zap.String("key", changed.Key))
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
