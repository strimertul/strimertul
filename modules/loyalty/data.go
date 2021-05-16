package loyalty

import "time"

const ConfigKey = "loyalty/config"

type Config struct {
	Currency string `json:"currency"`
	Points   struct {
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
	CustomRequest string `json:"required_info,omitempty"`
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

const PointsPrefix = "loyalty/points/"

type PointsEntry struct {
	Points int64 `json:"points"`
}

const QueueKey = "loyalty/redeem-queue"

type RedeemQueueStorage []Redeem

type Redeem struct {
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	Reward      Reward    `json:"reward"`
	When        time.Time `json:"when"`
}

const CreateRedeemRPC = "loyalty/@create-redeem"
const RemoveRedeemRPC = "loyalty/@remove-redeem"
const RedeemEvent = "loyalty/ev/new-redeem"
