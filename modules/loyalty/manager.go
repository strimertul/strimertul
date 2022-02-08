package loyalty

import (
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/database"
	"github.com/strimertul/strimertul/modules/stulbe"

	jsoniter "github.com/json-iterator/go"
	kv "github.com/strimertul/kilovolt/v8"
	"go.uber.org/zap"
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
	db        *database.DBModule
	logger    *zap.Logger
	cooldowns map[string]time.Time
}

func Register(manager *modules.Manager) error {
	db, ok := manager.Modules["db"].(*database.DBModule)
	if !ok {
		return errors.New("db module not found")
	}

	logger := manager.Logger(modules.ModuleLoyalty)

	loyalty := &Manager{
		logger:    logger,
		db:        db,
		mu:        sync.Mutex{},
		cooldowns: make(map[string]time.Time),
	}
	// Ger data from DB
	if err := db.GetJSON(ConfigKey, &loyalty.config); err != nil {
		if errors.Is(err, kv.ErrorKeyNotFound) {
			logger.Warn("missing configuration for loyalty (but it's enabled). Please make sure to set it up properly!")
		} else {
			return err
		}
	}

	// Retrieve configs
	if err := db.GetJSON(RewardsKey, &loyalty.rewards); err != nil {
		if !errors.Is(err, kv.ErrorKeyNotFound) {
			return err
		}
	}
	if err := db.GetJSON(GoalsKey, &loyalty.goals); err != nil {
		if !errors.Is(err, kv.ErrorKeyNotFound) {
			return err
		}
	}
	if err := db.GetJSON(QueueKey, &loyalty.queue); err != nil {
		if !errors.Is(err, kv.ErrorKeyNotFound) {
			return err
		}
	}

	// Retrieve user points
	points, err := db.GetAll(PointsPrefix)
	if err != nil {
		if !errors.Is(err, kv.ErrorKeyNotFound) {
			return err
		}
		points = make(map[string]string)
	}
	loyalty.points = make(map[string]PointsEntry)
	for k, v := range points {
		var entry PointsEntry
		err := jsoniter.ConfigFastest.UnmarshalFromString(v, &entry)
		if err != nil {
			return err
		}
		loyalty.points[k] = entry
	}

	// Subscribe for changes
	go db.Subscribe(loyalty.update, "loyalty/")
	go db.Subscribe(loyalty.handleRemote, "stulbe/loyalty/")

	// Replicate keys on stulbe if available
	if stulbeManager, ok := manager.Modules["stulbe"].(*stulbe.Manager); ok {
		go func() {
			err := stulbeManager.ReplicateKeys([]string{
				ConfigKey,
				RewardsKey,
				GoalsKey,
				PointsPrefix,
			})
			if err != nil {
				logger.Error("failed to replicate keys", zap.Error(err))
			}
		}()
	}

	// Register module
	manager.Modules[modules.ModuleLoyalty] = loyalty

	return nil
}

func (m *Manager) Status() modules.ModuleStatus {
	config := m.Config()
	if !config.Enabled {
		return modules.ModuleStatus{
			Enabled: false,
		}
	}

	return modules.ModuleStatus{
		Enabled:      true,
		Working:      true,
		Data:         struct{}{},
		StatusString: "",
	}
}

func (m *Manager) Close() error {
	//TODO Stop subscriptions?
	return nil
}

func (m *Manager) update(key, value string) {
	var err error

	// Check for config changes/RPC
	switch key {
	case ConfigKey:
		err = func() error {
			m.mu.Lock()
			defer m.mu.Unlock()
			return jsoniter.ConfigFastest.UnmarshalFromString(value, &m.config)
		}()
	case GoalsKey:
		err = func() error {
			m.mu.Lock()
			defer m.mu.Unlock()
			return jsoniter.ConfigFastest.UnmarshalFromString(value, &m.goals)
		}()
	case RewardsKey:
		err = func() error {
			m.mu.Lock()
			defer m.mu.Unlock()
			return jsoniter.ConfigFastest.UnmarshalFromString(value, &m.rewards)
		}()
	case QueueKey:
		err = func() error {
			m.mu.Lock()
			defer m.mu.Unlock()
			return jsoniter.ConfigFastest.UnmarshalFromString(value, &m.queue)
		}()
	case CreateRedeemRPC:
		var redeem Redeem
		err = jsoniter.ConfigFastest.UnmarshalFromString(value, &redeem)
		if err == nil {
			err = m.AddRedeem(redeem)
		}
	case RemoveRedeemRPC:
		var redeem Redeem
		err = jsoniter.ConfigFastest.UnmarshalFromString(value, &redeem)
		if err == nil {
			err = m.RemoveRedeem(redeem)
		}
	default:
		// Check for prefix changes
		switch {
		// User point changed
		case strings.HasPrefix(key, PointsPrefix):
			var entry PointsEntry
			err = jsoniter.ConfigFastest.UnmarshalFromString(value, &entry)
			user := key[len(PointsPrefix):]
			func() {
				m.mu.Lock()
				defer m.mu.Unlock()
				m.points[user] = entry
			}()
		}
	}
	if err != nil {
		m.logger.Error("subscribe error: invalid JSON received on key", zap.Error(err), zap.String("key", key))
	} else {
		m.logger.Debug("updated key", zap.String("key", key))
	}
}

func (m *Manager) handleRemote(key, value string) {
	m.logger.Debug("loyalty request from stulbe", zap.String("key", key))
	switch key {
	case KVExLoyaltyRedeem:
		// Parse request
		var redeemRequest ExLoyaltyRedeem
		err := jsoniter.ConfigFastest.UnmarshalFromString(value, &redeemRequest)
		if err != nil {
			m.logger.Warn("error decoding redeem request", zap.Error(err))
			break
		}
		// Find reward
		reward := m.GetReward(redeemRequest.RewardID)
		if reward.ID == "" {
			m.logger.Warn("redeem request contains invalid reward id", zap.String("reward-id", redeemRequest.RewardID))
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
			m.logger.Warn("error performing redeem request", zap.Error(err))
		}
	case KVExLoyaltyContribute:
		// Parse request
		var contributeRequest ExLoyaltyContribute
		err := jsoniter.ConfigFastest.UnmarshalFromString(value, &contributeRequest)
		if err != nil {
			m.logger.Warn("error decoding contribution request", zap.Error(err))
			break
		}
		// Find goal
		goal := m.GetGoal(contributeRequest.GoalID)
		if goal.ID == "" {
			m.logger.Warn("contribute request contains invalid goal id", zap.String("goal-id", contributeRequest.GoalID))
			break
		}
		err = m.PerformContribution(goal, contributeRequest.Username, contributeRequest.Amount)
		if err != nil {
			m.logger.Warn("error performing contribution request", zap.Error(err))
		}
	}
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
