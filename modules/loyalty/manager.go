package loyalty

import (
	"context"
	"errors"

	"github.com/dgraph-io/badger/v3"
	"github.com/dgraph-io/badger/v3/pb"
	jsoniter "github.com/json-iterator/go"
	"github.com/sirupsen/logrus"

	kv "github.com/strimertul/kilovolt"
	"github.com/strimertul/strimertul/utils"
)

type Manager struct {
	Config      Config
	Points      PointStorage
	Rewards     RewardStorage
	Goals       GoalStorage
	RedeemQueue RedeemQueueStorage

	hub    *kv.Hub
	logger logrus.FieldLogger
}

func NewManager(db *badger.DB, hub *kv.Hub, log logrus.FieldLogger) (*Manager, error) {
	if log == nil {
		log = logrus.New()
	}

	manager := &Manager{
		logger: log,
		hub:    hub,
	}
	// Ger data from DB
	if err := utils.DBGetJSON(db, ConfigKey, &manager.Config); err != nil {
		if err == badger.ErrKeyNotFound {
			log.Warn("missing configuration for loyalty (but it's enabled). Please make sure to set it up properly!")
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
		case CreateRedeemRPC:
			var redeem Redeem
			err = jsoniter.ConfigFastest.Unmarshal(kv.Value, &redeem)
			if err == nil {
				err = m.AddRedeem(redeem)
			}
		case RemoveRedeemRPC:
			var redeem Redeem
			err = jsoniter.ConfigFastest.Unmarshal(kv.Value, &redeem)
			if err == nil {
				err = m.RemoveRedeem(redeem)
			}
		}
		if err != nil {
			m.logger.WithFields(logrus.Fields{
				"key":   string(kv.Key),
				"error": err.Error(),
			}).Error("subscribe error: invalid JSON received on key")
		} else {
			m.logger.WithField("key", string(kv.Key)).Debug("updated key")
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

func (m *Manager) AddRedeem(redeem Redeem) error {
	// Add to local list
	m.RedeemQueue = append(m.RedeemQueue, redeem)

	// Send redeem event
	data, _ := jsoniter.ConfigFastest.Marshal(redeem)
	m.hub.WriteKey(RedeemEvent, string(data))

	// Save points
	return m.SaveQueue()
}

func (m *Manager) RemoveRedeem(redeem Redeem) error {
	for index, queued := range m.RedeemQueue {
		if queued.When == redeem.When && queued.Username == redeem.Username && queued.Reward.ID == redeem.Reward.ID {
			// Remove redemption from list
			m.RedeemQueue = append(m.RedeemQueue[:index], m.RedeemQueue[index+1:]...)

			// Save points
			return m.SaveQueue()
		}
	}

	return errors.New("redeem not found")
}
