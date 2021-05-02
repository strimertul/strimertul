package loyalty

import "time"

const ConfigKey = "loyalty/config"

type Config struct {
	Currency  string `json:"currency"`
	LiveCheck bool   `json:"enable_live_check"`
	Points    struct {
		Interval      int64 `json:"interval"` // in seconds!
		Amount        int64 `json:"amount"`
		ActivityBonus int64 `json:"activity_bonus"`
	} `json:"points"`
	BanList []string `json:"banlist"`
}

const RewardsKey = "loyalty/rewards"

type RewardStorage []Reward

const GoalsKey = "loyalty/goals"

type GoalStorage []Goal

type Reward struct {
	Enabled       bool   `json:"enabled"`
	ID            string `json:"id"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	Image         string `json:"image"`
	Price         int64  `json:"price"`
	CustomRequest string `json:"required_info,omit_empty"`
}

type Goal struct {
	Enabled      bool             `json:"enabled"`
	ID           string           `json:"id"`
	Name         string           `json:"name"`
	Description  string           `json:"description"`
	Image        string           `json:"image"`
	TotalGoal    int64            `json:"total"`
	Contributed  int64            `json:"contributed"`
	Contributors map[string]int64 `json:"contributors"`
}

const PointsKey = "loyalty/users"

type PointStorage map[string]int64

const QueueKey = "loyalty/redeem-queue"

type RedeemQueueStorage []Redeem

type Redeem struct {
	User   string    `json:"user"`
	Reward Reward    `json:"reward"`
	When   time.Time `json:"when"`
}
