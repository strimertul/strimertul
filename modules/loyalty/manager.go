package loyalty

import (
	"context"
	"errors"
	"sync"

	"github.com/dgraph-io/badger/v3"
	jsoniter "github.com/json-iterator/go"
	"github.com/sirupsen/logrus"

	kv "github.com/strimertul/kilovolt/v3"
	"github.com/strimertul/strimertul/database"
)

type Manager struct {
	Config      Config
	Rewards     RewardStorage
	Goals       GoalStorage
	RedeemQueue RedeemQueueStorage

	points   PointStorage
	pointsmu sync.Mutex
	hub      *kv.Hub
	logger   logrus.FieldLogger
}

func NewManager(db *database.DB, hub *kv.Hub, log logrus.FieldLogger) (*Manager, error) {
	if log == nil {
		log = logrus.New()
	}

	manager := &Manager{
		logger:   log,
		hub:      hub,
		pointsmu: sync.Mutex{},
	}
	// Ger data from DB
	if err := db.GetJSON(ConfigKey, &manager.Config); err != nil {
		if err == badger.ErrKeyNotFound {
			log.Warn("missing configuration for loyalty (but it's enabled). Please make sure to set it up properly!")
		} else {
			return nil, err
		}
	}
	if err := db.GetJSON(PointsKey, &manager.points); err != nil {
		if err == badger.ErrKeyNotFound {
			manager.points = make(PointStorage)
		} else {
			return nil, err
		}
	}
	if err := db.GetJSON(RewardsKey, &manager.Rewards); err != nil {
		if err != badger.ErrKeyNotFound {
			return nil, err
		}
	}
	if err := db.GetJSON(GoalsKey, &manager.Goals); err != nil {
		if err != badger.ErrKeyNotFound {
			return nil, err
		}
	}
	if err := db.GetJSON(QueueKey, &manager.RedeemQueue); err != nil {
		if err != badger.ErrKeyNotFound {
			return nil, err
		}
	}

	// Subscribe for changes
	go func() {
		db.Subscribe(context.Background(), manager.update, "loyalty/")
	}()

	return manager, nil
}

func (m *Manager) update(kvs []database.ModifiedKV) error {
	for _, kv := range kvs {
		var err error
		switch string(kv.Key) {
		case ConfigKey:
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.Config)
		case PointsKey:
			m.pointsmu.Lock()
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.points)
			m.pointsmu.Unlock()
		case GoalsKey:
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.Goals)
		case RewardsKey:
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.Rewards)
		case QueueKey:
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.RedeemQueue)
		case CreateRedeemRPC:
			var redeem Redeem
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &redeem)
			if err == nil {
				err = m.AddRedeem(redeem)
			}
		case RemoveRedeemRPC:
			var redeem Redeem
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &redeem)
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
	m.pointsmu.Lock()
	defer m.pointsmu.Unlock()
	data, _ := jsoniter.ConfigFastest.Marshal(m.points)
	return m.hub.WriteKey(PointsKey, string(data))
}

func (m *Manager) GetPoints(user string) int64 {
	m.pointsmu.Lock()
	defer m.pointsmu.Unlock()
	points, ok := m.points[user]
	if ok {
		return points
	}
	return 0
}

func (m *Manager) SetPoints(user string, points int64) {
	m.pointsmu.Lock()
	defer m.pointsmu.Unlock()
	m.points[user] = points
}

func (m *Manager) GivePoints(pointsToGive map[string]int64) error {
	// Add points to each user
	for user, points := range pointsToGive {
		balance := m.GetPoints(user)
		m.SetPoints(user, balance+points)
	}

	// Save points
	return m.SavePoints()
}

func (m *Manager) TakePoints(pointsToTake map[string]int64) error {
	// Add points to each user
	for user, points := range pointsToTake {
		balance := m.GetPoints(user)
		m.SetPoints(user, balance-points)
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

func (m *Manager) SaveGoals() error {
	data, _ := jsoniter.ConfigFastest.Marshal(m.Goals)
	return m.hub.WriteKey(GoalsKey, string(data))
}

func (m *Manager) ContributeGoal(goal *Goal, user string, points int64) error {
	goal.Contributed += points
	goal.Contributors[user] += points
	return m.SaveGoals()
}
