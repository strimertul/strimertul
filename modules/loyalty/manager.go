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

var (
	ErrGoalNotFound = errors.New("goal not found")
)

type Manager struct {
	points  PointStorage
	config  Config
	rewards RewardStorage
	goals   GoalStorage
	queue   RedeemQueueStorage
	mu      sync.Mutex
	hub     *kv.Hub
	logger  logrus.FieldLogger
}

func NewManager(db *database.DB, hub *kv.Hub, log logrus.FieldLogger) (*Manager, error) {
	if log == nil {
		log = logrus.New()
	}

	manager := &Manager{
		logger: log,
		hub:    hub,
		mu:     sync.Mutex{},
	}
	// Ger data from DB
	if err := db.GetJSON(ConfigKey, &manager.config); err != nil {
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
	if err := db.GetJSON(RewardsKey, &manager.rewards); err != nil {
		if err != badger.ErrKeyNotFound {
			return nil, err
		}
	}
	if err := db.GetJSON(GoalsKey, &manager.goals); err != nil {
		if err != badger.ErrKeyNotFound {
			return nil, err
		}
	}
	if err := db.GetJSON(QueueKey, &manager.queue); err != nil {
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
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, kv := range kvs {
		var err error
		switch string(kv.Key) {
		case ConfigKey:
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.config)
		case PointsKey:
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.points)
		case GoalsKey:
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.goals)
		case RewardsKey:
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.rewards)
		case QueueKey:
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.queue)
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
	m.mu.Lock()
	defer m.mu.Unlock()
	data, _ := jsoniter.ConfigFastest.Marshal(m.points)
	return m.hub.WriteKey(PointsKey, string(data))
}

func (m *Manager) GetPoints(user string) int64 {
	m.mu.Lock()
	defer m.mu.Unlock()
	points, ok := m.points[user]
	if ok {
		return points
	}
	return 0
}

func (m *Manager) SetPoints(user string, points int64) {
	m.mu.Lock()
	defer m.mu.Unlock()
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

func (m *Manager) saveQueue() error {
	data, _ := jsoniter.ConfigFastest.Marshal(m.queue)
	return m.hub.WriteKey(QueueKey, string(data))
}

func (m *Manager) AddRedeem(redeem Redeem) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Add to local list
	m.queue = append(m.queue, redeem)

	// Send redeem event
	data, _ := jsoniter.ConfigFastest.Marshal(redeem)
	m.hub.WriteKey(RedeemEvent, string(data))

	// Save points
	return m.saveQueue()
}

func (m *Manager) RemoveRedeem(redeem Redeem) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for index, queued := range m.queue {
		if queued.When == redeem.When && queued.Username == redeem.Username && queued.Reward.ID == redeem.Reward.ID {
			// Remove redemption from list
			m.queue = append(m.queue[:index], m.queue[index+1:]...)

			// Save points
			return m.saveQueue()
		}
	}

	return errors.New("redeem not found")
}

func (m *Manager) SaveGoals() error {
	data, _ := jsoniter.ConfigFastest.Marshal(m.goals)
	return m.hub.WriteKey(GoalsKey, string(data))
}

func (m *Manager) Goals() []Goal {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.goals[:]
}

func (m *Manager) ContributeGoal(goal Goal, user string, points int64) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for i, savedGoal := range m.goals {
		if savedGoal.ID != goal.ID {
			continue
		}
		m.goals[i].Contributed += points
		m.goals[i].Contributors[user] += points
		return m.SaveGoals()
	}
	return ErrGoalNotFound
}

func (m *Manager) Rewards() []Reward {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.rewards[:]
}

func (m *Manager) Config() Config {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.config
}
