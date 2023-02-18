package loyalty

import "time"

const ConfigKey = "loyalty/config"

type Config struct {
	Enabled  bool   `json:"enabled" desc:"Enable the loyalty system"`
	Currency string `json:"currency" desc:"Name of the currency"`
	Points   struct {
		Interval      int64 `json:"interval" desc:"How often to distribute points, in seconds"` // in seconds!
		Amount        int64 `json:"amount" desc:"How many points to award every interval"`
		ActivityBonus int64 `json:"activity_bonus" desc:"Extra points for active chatters"`
	} `json:"points" desc:"Settings for distributing currency to online viewers"`
	BanList []string `json:"banlist" desc:"Usernames to exclude from currency distribution"`
}

const RewardsKey = "loyalty/rewards"

const GoalsKey = "loyalty/goals"

type Reward struct {
	Enabled       bool   `json:"enabled" desc:"Is the reward enabled (redeemable)?"`
	ID            string `json:"id" desc:"Reward ID"`
	Name          string `json:"name" desc:"Name of the reward"`
	Description   string `json:"description" desc:"Description of the reward"`
	Image         string `json:"image" desc:"Reward icon URL"`
	Price         int64  `json:"price" desc:"How much does is cost"`
	CustomRequest string `json:"required_info,omitempty" desc:"If present, reward requires user input and this field is the help text"`
	Cooldown      int64  `json:"cooldown" desc:"Time in seconds to wait before this reward can be redeemed again"`
}

type Goal struct {
	Enabled      bool             `json:"enabled" desc:"Is the goal enabled?"`
	ID           string           `json:"id" desc:"Community goal ID"`
	Name         string           `json:"name" desc:"Name of the community goal"`
	Description  string           `json:"description" desc:"Description of the goal"`
	Image        string           `json:"image" desc:"Goal icon URL"`
	TotalGoal    int64            `json:"total" desc:"How many points does the goal need to be met in total"`
	Contributed  int64            `json:"contributed" desc:"How many points have been contributed so far"`
	Contributors map[string]int64 `json:"contributors" desc:"Dictionary of how much every viewer has contributed"`
}

const PointsPrefix = "loyalty/points/"

type PointsEntry struct {
	Points int64 `json:"points" desc:"Currency balance"`
}

const QueueKey = "loyalty/redeem-queue"

type Redeem struct {
	Username    string    `json:"username" desc:"Username of who redeemed the reward"`
	DisplayName string    `json:"display_name" desc:"Display name of who redeemed the reward"`
	Reward      Reward    `json:"reward" desc:"Reward that was redeemed"`
	When        time.Time `json:"when" desc:"Time of the redeem"`
	RequestText string    `json:"request_text" desc:"If the reward required user input it will be here"`
}

const (
	CreateRedeemRPC = "loyalty/@create-redeem"
	RemoveRedeemRPC = "loyalty/@remove-redeem"
	RedeemEvent     = "loyalty/ev/new-redeem"
)
