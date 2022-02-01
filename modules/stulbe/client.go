package stulbe

import (
	"encoding/json"
	"errors"

	"github.com/strimertul/strimertul/modules/database"

	"go.uber.org/zap"

	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/stulbe-client-go"
)

type Manager struct {
	Config Config
	Client *stulbe.Client
	db     *database.DBModule
	logger *zap.Logger

	restart chan bool
}

func Register(manager *modules.Manager) error {
	db, ok := manager.Modules["db"].(*database.DBModule)
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
	go db.Subscribe(func(key, value string) {
		if key == ConfigKey {
			var config Config
			err := json.Unmarshal([]byte(value), &config)
			if err != nil {
				logger.Warn("Failed to get new config", zap.Error(err))
				return
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
			err := m.db.PutKey(kv.Key, kv.Value)
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
	return m.db.Subscribe(func(key, value string) {
		err := m.Client.KV.SetKey(key, value)
		if err != nil {
			m.logger.Error("failed to replicate key", zap.String("key", key), zap.Error(err))
		} else {
			m.logger.Debug("replicated to remote", zap.String("key", key))
		}
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
