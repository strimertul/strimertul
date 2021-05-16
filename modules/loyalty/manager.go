package loyalty

import (
	"context"
	"errors"
	"strings"
	"sync"

	"github.com/dgraph-io/badger/v3"
	jsoniter "github.com/json-iterator/go"
	"github.com/sirupsen/logrus"

	"github.com/strimertul/strimertul/database"
)

var (
	ErrGoalNotFound = errors.New("goal not found")
)

type Manager struct {
	points  map[string]PointsEntry
	config  Config
	rewards RewardStorage
	goals   GoalStorage
	queue   RedeemQueueStorage
	mu      sync.Mutex
	db      *database.DB
	logger  logrus.FieldLogger
}

func NewManager(db *database.DB, log logrus.FieldLogger) (*Manager, error) {
	if log == nil {
		log = logrus.New()
	}

	// Check if we need to migrate
	// TODO Remove this in the future
	err := migratePoints(db, log)
	if err != nil {
		return nil, err
	}

	manager := &Manager{
		logger: log,
		db:     db,
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

	// Retrieve configs
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

	// Retrieve user points
	points, err := db.GetAll(PointsPrefix)
	if err != nil {
		if err != badger.ErrKeyNotFound {
			return nil, err
		}
		points = make(map[string]string)
	}
	manager.points = make(map[string]PointsEntry)
	for k, v := range points {
		var entry PointsEntry
		err := jsoniter.ConfigFastest.UnmarshalFromString(v, &entry)
		if err != nil {
			return nil, err
		}
		manager.points[k] = entry
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
		key := string(kv.Key)

		// Check for config changes/RPC
		switch key {
		case ConfigKey:
			m.mu.Lock()
			defer m.mu.Unlock()
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.config)
		case GoalsKey:
			m.mu.Lock()
			defer m.mu.Unlock()
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.goals)
		case RewardsKey:
			m.mu.Lock()
			defer m.mu.Unlock()
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.rewards)
		case QueueKey:
			m.mu.Lock()
			defer m.mu.Unlock()
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
		default:
			// Check for prefix changes
			switch {
			// User point changed
			case strings.HasPrefix(kv.Key, PointsPrefix):
				m.mu.Lock()
				defer m.mu.Unlock()
				var entry PointsEntry
				err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &entry)
				user := kv.Key[len(PointsPrefix):]
				m.points[user] = entry
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

func (m *Manager) GetPoints(user string) int64 {
	m.mu.Lock()
	defer m.mu.Unlock()
	points, ok := m.points[user]
	if ok {
		return points.Points
	}
	return 0
}

func (m *Manager) setPoints(user string, points int64) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.points[user] = PointsEntry{
		Points: points,
	}
	return m.db.PutJSON(PointsPrefix+user, m.points[user])
}

func (m *Manager) GivePoints(pointsToGive map[string]int64) error {
	// Add points to each user
	for user, points := range pointsToGive {
		balance := m.GetPoints(user)
		if err := m.setPoints(user, balance+points); err != nil {
			return err
		}
	}
	return nil
}

func (m *Manager) TakePoints(pointsToTake map[string]int64) error {
	// Add points to each user
	for user, points := range pointsToTake {
		balance := m.GetPoints(user)
		if err := m.setPoints(user, balance-points); err != nil {
			return err
		}
	}
	return nil
}

func (m *Manager) saveQueue() error {
	return m.db.PutJSON(QueueKey, m.queue)
}

func (m *Manager) AddRedeem(redeem Redeem) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Add to local list
	m.queue = append(m.queue, redeem)

	// Send redeem event
	if err := m.db.PutJSON(RedeemEvent, redeem); err != nil {
		return err
	}

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
	return m.db.PutJSON(GoalsKey, m.goals)
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
