package loyalty

import (
	"context"
	"time"

	"github.com/strimertul/strimertul/kv"
	"github.com/strimertul/strimertul/logger"
	"github.com/strimertul/strimertul/utils"

	"github.com/dgraph-io/badger/v3"
	"github.com/dgraph-io/badger/v3/pb"
	jsoniter "github.com/json-iterator/go"
)

type Manager struct {
	Config      Config
	Points      PointStorage
	Rewards     RewardStorage
	Goals       GoalStorage
	RedeemQueue RedeemQueueStorage

	hub    *kv.Hub
	logger logger.LogFn
}

func NewManager(db *badger.DB, hub *kv.Hub, log logger.LogFn) (*Manager, error) {
	manager := &Manager{
		logger: log,
		hub:    hub,
	}
	// Ger data from DB
	if err := utils.DBGetJSON(db, ConfigKey, &manager.Config); err != nil {
		if err == badger.ErrKeyNotFound {
			log(logger.MTWarning, "Missing configuration for loyalty (but it's enabled). Please make sure to set it up properly!")
		} else {
			return nil, err
		}
	}
	if err := utils.DBGetJSON(db, PointsKey, &manager.Points); err != nil {
		if err == badger.ErrKeyNotFound {
			manager.Points = make(PointStorage)
		} else {
			return nil, err
		}
	}
	if err := utils.DBGetJSON(db, RewardsKey, &manager.Rewards); err != nil {
		if err != badger.ErrKeyNotFound {
			return nil, err
		}
	}
	if err := utils.DBGetJSON(db, GoalsKey, &manager.Goals); err != nil {
		if err != badger.ErrKeyNotFound {
			return nil, err
		}
	}
	if err := utils.DBGetJSON(db, QueueKey, &manager.RedeemQueue); err != nil {
		if err != badger.ErrKeyNotFound {
			return nil, err
		}
	}

	// Subscribe for changes
	go func() {
		db.Subscribe(context.Background(), manager.update, []byte("loyalty/"))
	}()

	return manager, nil
}

func (m *Manager) update(kvs *pb.KVList) error {
	for _, kv := range kvs.Kv {
		var err error
		switch string(kv.Key) {
		case ConfigKey:
			err = jsoniter.ConfigFastest.Unmarshal(kv.Value, &m.Config)
		case PointsKey:
			err = jsoniter.ConfigFastest.Unmarshal(kv.Value, &m.Points)
		case GoalsKey:
			err = jsoniter.ConfigFastest.Unmarshal(kv.Value, &m.Goals)
		case RewardsKey:
			err = jsoniter.ConfigFastest.Unmarshal(kv.Value, &m.Rewards)
		case QueueKey:
			err = jsoniter.ConfigFastest.Unmarshal(kv.Value, &m.RedeemQueue)
		}
		if err != nil {
			m.logger(logger.MTError, "Subscribe error: invalid JSON received on key %s: %s", kv.Key, err.Error())
		} else {
			m.logger(logger.MTNotice, "Updated key %s", kv.Key)
		}
	}
	return nil
}

func (m *Manager) SavePoints() error {
	data, _ := jsoniter.ConfigFastest.Marshal(m.Points)
	return m.hub.WriteKey(PointsKey, string(data))
}

func (m *Manager) GivePoints(pointsToGive map[string]int64) error {
	// Add points to each user
	for user, points := range pointsToGive {
		m.Points[user] += points
	}

	// Save points
	return m.SavePoints()
}

func (m *Manager) TakePoints(pointsToTake map[string]int64) error {
	// Add points to each user
	for user, points := range pointsToTake {
		m.Points[user] -= points
	}

	// Save points
	return m.SavePoints()
}

func (m *Manager) SaveQueue() error {
	data, _ := jsoniter.ConfigFastest.Marshal(m.RedeemQueue)
	return m.hub.WriteKey(QueueKey, string(data))
}

func (m *Manager) AddRedeem(username string, displayName string, reward Reward) error {
	m.RedeemQueue = append(m.RedeemQueue, Redeem{
		When:        time.Now(),
		Username:    username,
		DisplayName: displayName,
		Reward:      reward,
	})

	// Save points
	return m.SaveQueue()
}
