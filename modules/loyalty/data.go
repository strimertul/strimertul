package loyalty

import "time"

const ConfigKey = "loyalty/config"

type Config struct {
	Enabled  bool   `json:"enabled"`
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
	Cooldown      int64  `json:"cooldown"`
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
	RequestText string    `json:"request_text"`
}

const (
	CreateRedeemRPC = "loyalty/@create-redeem"
	RemoveRedeemRPC = "loyalty/@remove-redeem"
	RedeemEvent     = "loyalty/ev/new-redeem"
)

// Stulbe events

type ExLoyaltyRedeem struct {
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Channel     string `json:"channel"`
	RewardID    string `json:"reward_id"`
	RequestText string `json:"request_text"`
}

type ExLoyaltyContribute struct {
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Channel     string `json:"channel"`
	GoalID      string `json:"goal_id"`
	Amount      int64  `json:"amount"`
}
