package loyalty

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/dgraph-io/badger/v3"
	jsoniter "github.com/json-iterator/go"
	"github.com/sirupsen/logrus"
	"github.com/strimertul/stulbe/api"

	"github.com/strimertul/strimertul/database"
)

var (
	ErrRedeemInCooldown   = errors.New("redeem is on cooldown")
	ErrGoalNotFound       = errors.New("goal not found")
	ErrGoalAlreadyReached = errors.New("goal already reached")
)

type Manager struct {
	points    map[string]PointsEntry
	config    Config
	rewards   RewardStorage
	goals     GoalStorage
	queue     RedeemQueueStorage
	mu        sync.Mutex
	db        *database.DB
	logger    logrus.FieldLogger
	cooldowns map[string]time.Time
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
		logger:    log,
		db:        db,
		mu:        sync.Mutex{},
		cooldowns: make(map[string]time.Time),
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
	go db.Subscribe(context.Background(), manager.update, "loyalty/")
	go db.Subscribe(context.Background(), manager.handleRemote, "stulbe/loyalty/")

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
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.config)
			m.mu.Unlock()
		case GoalsKey:
			m.mu.Lock()
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.goals)
			m.mu.Unlock()
		case RewardsKey:
			m.mu.Lock()
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.rewards)
			m.mu.Unlock()
		case QueueKey:
			m.mu.Lock()
			err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &m.queue)
			m.mu.Unlock()
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
				var entry PointsEntry
				err = jsoniter.ConfigFastest.Unmarshal(kv.Data, &entry)
				user := kv.Key[len(PointsPrefix):]
				m.mu.Lock()
				m.points[user] = entry
				m.mu.Unlock()
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

func (m *Manager) handleRemote(kvs []database.ModifiedKV) error {
	for _, kv := range kvs {
		m.logger.WithField("key", kv.Key).Trace("loyalty request from stulbe")
		switch kv.Key {
		case api.KVExLoyaltyRedeem:
			// Parse request
			var redeemRequest api.ExLoyaltyRedeem
			err := jsoniter.ConfigFastest.Unmarshal(kv.Data, &redeemRequest)
			if err != nil {
				m.logger.WithError(err).Warn("error decoding redeem request")
				break
			}
			// Find reward
			reward := m.GetReward(redeemRequest.RewardID)
			if reward.ID == "" {
				m.logger.WithField("reward-id", redeemRequest.RewardID).Warn("redeem request contains invalid reward id")
				break
			}
			err = m.PerformRedeem(Redeem{
				Username:    redeemRequest.Username,
				DisplayName: redeemRequest.DisplayName,
				Reward:      reward,
				When:        time.Now(),
				RequestText: redeemRequest.RequestText,
			})
			if err != nil {
				m.logger.WithError(err).Warn("error performing redeem request")
			}
		case api.KVExLoyaltyContribute:
			// Parse request
			var contributeRequest api.ExLoyaltyContribute
			err := jsoniter.ConfigFastest.Unmarshal(kv.Data, &contributeRequest)
			if err != nil {
				m.logger.WithError(err).Warn("error decoding contribution request")
				break
			}
			// Find goal
			goal := m.GetGoal(contributeRequest.GoalID)
			if goal.ID == "" {
				m.logger.WithField("goal-id", contributeRequest.GoalID).Warn("contribute request contains invalid goal id")
				break
			}
			err = m.PerformContribution(goal, contributeRequest.Username, contributeRequest.Amount)
			if err != nil {
				m.logger.WithError(err).Warn("error performing contribution request")
			}
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

func (m *Manager) GetRewardCooldown(rewardID string) time.Time {
	m.mu.Lock()
	defer m.mu.Unlock()

	cooldown, ok := m.cooldowns[rewardID]
	if !ok {
		// Return zero time for a reward with no cooldown
		return time.Time{}
	}

	return cooldown
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

	// Add cooldown if applicable
	if redeem.Reward.Cooldown > 0 {
		m.cooldowns[redeem.Reward.ID] = time.Now().Add(time.Second * time.Duration(redeem.Reward.Cooldown))
	}

	// Save points
	return m.saveQueue()
}

func (m *Manager) PerformRedeem(redeem Redeem) error {
	// Check cooldown
	if time.Now().Before(m.GetRewardCooldown(redeem.Reward.ID)) {
		return ErrRedeemInCooldown
	}

	// Add redeem
	err := m.AddRedeem(redeem)
	if err != nil {
		return err
	}

	// Remove points from user
	return m.TakePoints(map[string]int64{redeem.Username: redeem.Reward.Price})
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

func (m *Manager) PerformContribution(goal Goal, user string, points int64) error {
	// Get user balance
	balance := m.GetPoints(user)

	// If user specified more points than they have, pick the maximum possible
	if points > balance {
		points = balance
	}

	// Check if goal was reached already
	if goal.Contributed >= goal.TotalGoal {
		return ErrGoalAlreadyReached
	}

	// If remaining points are lower than what user is contributing, only take what's needed
	remaining := goal.TotalGoal - goal.Contributed
	if points > remaining {
		points = remaining
	}

	// Remove points from user
	if err := m.TakePoints(map[string]int64{user: points}); err != nil {
		return err
	}

	// Add points to goal
	return m.ContributeGoal(goal, user, points)
}

func (m *Manager) Rewards() []Reward {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.rewards[:]
}

func (m *Manager) GetReward(id string) Reward {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, reward := range m.rewards {
		if reward.ID == id {
			return reward
		}
	}
	return Reward{}
}

func (m *Manager) GetGoal(id string) Goal {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, goal := range m.goals {
		if goal.ID == id {
			return goal
		}
	}
	return Goal{}
}

func (m *Manager) Config() Config {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.config
}
