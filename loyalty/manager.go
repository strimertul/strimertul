package loyalty

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/strimertul/strimertul/database"
	"github.com/strimertul/strimertul/twitch"
	"github.com/strimertul/strimertul/utils"

	"git.sr.ht/~hamcha/containers/sync"
	jsoniter "github.com/json-iterator/go"
	"go.uber.org/zap"
)

var json = jsoniter.ConfigFastest

var (
	ErrRedeemNotFound     = errors.New("redeem not found")
	ErrRedeemInCooldown   = errors.New("redeem is on cooldown")
	ErrGoalNotFound       = errors.New("goal not found")
	ErrGoalAlreadyReached = errors.New("goal already reached")
)

type Manager struct {
	points               *sync.Map[string, PointsEntry]
	Config               *sync.RWSync[Config]
	Rewards              *sync.Slice[Reward]
	Goals                *sync.Slice[Goal]
	Queue                *sync.Slice[Redeem]
	db                   *database.LocalDBClient
	logger               *zap.Logger
	cooldowns            map[string]time.Time
	banlist              map[string]bool
	activeUsers          *sync.Map[string, bool]
	twitchManager        *twitch.Manager
	ctx                  context.Context
	cancelFn             context.CancelFunc
	cancelSub            database.CancelFunc
	restartTwitchHandler chan struct{}
}

func NewManager(db *database.LocalDBClient, twitchManager *twitch.Manager, logger *zap.Logger) (*Manager, error) {
	ctx, cancelFn := context.WithCancel(context.Background())
	loyalty := &Manager{
		Config:  sync.NewRWSync(Config{Enabled: false}),
		Rewards: sync.NewSlice[Reward](),
		Goals:   sync.NewSlice[Goal](),
		Queue:   sync.NewSlice[Redeem](),

		logger:               logger,
		db:                   db,
		points:               sync.NewMap[string, PointsEntry](),
		cooldowns:            make(map[string]time.Time),
		banlist:              make(map[string]bool),
		activeUsers:          sync.NewMap[string, bool](),
		twitchManager:        twitchManager,
		ctx:                  ctx,
		cancelFn:             cancelFn,
		restartTwitchHandler: make(chan struct{}),
	}
	// Get data from DB
	var config Config
	if err := db.GetJSON(ConfigKey, &config); err == nil {
		loyalty.Config.Set(config)
	} else {
		if !errors.Is(err, database.ErrEmptyKey) {
			return nil, fmt.Errorf("could not retrieve loyalty config: %w", err)
		}
	}

	// Retrieve configs
	var rewards []Reward
	if err := db.GetJSON(RewardsKey, &rewards); err == nil {
		loyalty.Rewards.Set(rewards)
	} else {
		if !errors.Is(err, database.ErrEmptyKey) {
			return nil, err
		}
	}

	var goals []Goal
	if err := db.GetJSON(GoalsKey, &goals); err == nil {
		loyalty.Goals.Set(goals)
	} else {
		if !errors.Is(err, database.ErrEmptyKey) {
			return nil, err
		}
	}

	var queue []Redeem
	if err := db.GetJSON(QueueKey, &queue); err == nil {
		loyalty.Queue.Set(queue)
	} else {
		if !errors.Is(err, database.ErrEmptyKey) {
			return nil, err
		}
	}

	// Retrieve user points
	points, err := db.GetAll(PointsPrefix)
	if err != nil {
		if !errors.Is(err, database.ErrEmptyKey) {
			return nil, err
		}
		points = make(map[string]string)
	}

	for k, v := range points {
		var entry PointsEntry
		err := json.UnmarshalFromString(v, &entry)
		if err != nil {
			return nil, err
		}

		loyalty.points.SetKey(k[len(PointsPrefix):], entry)
	}

	// SubscribePrefix for changes
	err, loyalty.cancelSub = db.SubscribePrefix(loyalty.update, "loyalty/")
	if err != nil {
		logger.Error("Could not setup loyalty reload subscription", zap.Error(err))
	}

	loyalty.SetBanList(config.BanList)

	// Setup twitch integration
	loyalty.SetupTwitch()

	return loyalty, nil
}

func (m *Manager) Close() error {
	// Stop subscription
	if m.cancelSub != nil {
		m.cancelSub()
	}

	// Send cancellation
	m.cancelFn()

	// Teardown twitch integration
	m.StopTwitch()

	return nil
}

func (m *Manager) update(key, value string) {
	var err error
	// Check for config changes/RPC
	switch key {
	case ConfigKey:
		err = utils.LoadJSONToWrapped[Config](value, m.Config)
		if err == nil {
			m.SetBanList(m.Config.Get().BanList)
			m.restartTwitchHandler <- struct{}{}
			m.StopTwitch()
			m.SetupTwitch()
		}
	case GoalsKey:
		err = utils.LoadJSONToWrapped[[]Goal](value, m.Goals)
	case RewardsKey:
		err = utils.LoadJSONToWrapped[[]Reward](value, m.Rewards)
	case QueueKey:
		err = utils.LoadJSONToWrapped[[]Redeem](value, m.Queue)
	case CreateRedeemRPC:
		var redeem Redeem
		err = json.UnmarshalFromString(value, &redeem)
		if err == nil {
			err = m.AddRedeem(redeem)
		}
	case RemoveRedeemRPC:
		var redeem Redeem
		err = json.UnmarshalFromString(value, &redeem)
		if err == nil {
			err = m.RemoveRedeem(redeem)
		}
	default:
		// Check for prefix changes
		switch {
		// User point changed
		case strings.HasPrefix(key, PointsPrefix):
			var entry PointsEntry
			err = json.UnmarshalFromString(value, &entry)
			user := key[len(PointsPrefix):]
			m.points.SetKey(user, entry)
		}
	}
	if err != nil {
		m.logger.Error("Subscribe error: invalid JSON received on key", zap.Error(err), zap.String("key", key))
	} else {
		m.logger.Debug("Updated key", zap.String("key", key))
	}
}

func (m *Manager) GetPoints(user string) int64 {
	points, ok := m.points.GetKey(user)
	if ok {
		return points.Points
	}
	return 0
}

func (m *Manager) setPoints(user string, points int64) error {
	entry := PointsEntry{
		Points: points,
	}
	m.points.SetKey(user, entry)
	return m.db.PutJSON(PointsPrefix+user, entry)
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
	return m.db.PutJSON(QueueKey, m.Queue.Get())
}

func (m *Manager) GetRewardCooldown(rewardID string) time.Time {
	cooldown, ok := m.cooldowns[rewardID]
	if !ok {
		// Return zero time for a reward with no cooldown
		return time.Time{}
	}

	return cooldown
}

func (m *Manager) AddRedeem(redeem Redeem) error {
	// Add to local list
	m.Queue.Set(append(m.Queue.Get(), redeem))

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
	queue := m.Queue.Get()
	for index, queued := range queue {
		if queued.When == redeem.When && queued.Username == redeem.Username && queued.Reward.ID == redeem.Reward.ID {
			// Remove redemption from list
			m.Queue.Set(append(queue[:index], queue[index+1:]...))

			// Save points
			return m.saveQueue()
		}
	}

	return ErrRedeemNotFound
}

func (m *Manager) SaveGoals() error {
	return m.db.PutJSON(GoalsKey, m.Goals.Get())
}

func (m *Manager) ContributeGoal(goal Goal, user string, points int64) error {
	goals := m.Goals.Get()
	for i, savedGoal := range goals {
		if savedGoal.ID != goal.ID {
			continue
		}
		goals[i].Contributed += points
		goals[i].Contributors[user] += points
		m.Goals.Set(goals)
		return m.SaveGoals()
	}
	return ErrGoalNotFound
}

func (m *Manager) PerformContribution(goal Goal, user string, points int64) (int64, error) {
	// Get user balance
	balance := m.GetPoints(user)

	// If user specified more points than they have, pick the maximum possible
	if points > balance {
		points = balance
	}

	// Check if goal was reached already
	if goal.Contributed >= goal.TotalGoal {
		return 0, ErrGoalAlreadyReached
	}

	// If remaining points are lower than what user is contributing, only take what's needed
	remaining := goal.TotalGoal - goal.Contributed
	if points > remaining {
		points = remaining
	}

	// Remove points from user
	if err := m.TakePoints(map[string]int64{user: points}); err != nil {
		return 0, err
	}

	// Add points to goal
	return points, m.ContributeGoal(goal, user, points)
}

func (m *Manager) GetReward(id string) Reward {
	for _, reward := range m.Rewards.Get() {
		if reward.ID == id {
			return reward
		}
	}
	return Reward{}
}

func (m *Manager) GetGoal(id string) Goal {
	for _, goal := range m.Goals.Get() {
		if goal.ID == id {
			return goal
		}
	}
	return Goal{}
}

func (m *Manager) Equals(c utils.Comparable) bool {
	if manager, ok := c.(*Manager); ok {
		return m == manager
	}
	return false
}
