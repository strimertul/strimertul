package twitch

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	irc "github.com/gempir/go-twitch-irc/v2"
	"github.com/strimertul/strimertul/modules/loyalty"
)

type AccessLevelType string

const (
	ALTEveryone   AccessLevelType = "everyone"
	ALTVIP        AccessLevelType = "vip"
	ALTModerators AccessLevelType = "moderators"
	ALTStreamer   AccessLevelType = "streamer"
)

type BotCommandHandler func(bot *Bot, message irc.PrivateMessage)

type BotCommand struct {
	Description string
	Usage       string
	AccessLevel AccessLevelType
	Handler     BotCommandHandler
}

var commands = map[string]BotCommand{
	"!redeem": {
		Description: "Redeem a reward with loyalty points",
		Usage:       "!redeem <reward-id> [request text]",
		AccessLevel: ALTEveryone,
		Handler:     cmdRedeemReward,
	},
	"!balance": {
		Description: "See your current point balance",
		Usage:       "!balance",
		AccessLevel: ALTEveryone,
		Handler:     cmdBalance,
	},
	"!goals": {
		Description: "Check currently active community goals",
		Usage:       "!goals",
		AccessLevel: ALTEveryone,
		Handler:     cmdGoalList,
	},
	"!contribute": {
		Description: "Contribute points to a community goal",
		Usage:       "!contribute <points> [<goal-id>]",
		AccessLevel: ALTEveryone,
		Handler:     cmdContributeGoal,
	},
}

func cmdBalance(bot *Bot, message irc.PrivateMessage) {
	// Get user balance
	balance := bot.Loyalty.GetPoints(message.User.Name)
	bot.Client.Say(message.Channel, fmt.Sprintf("%s: You have %d %s!", message.User.DisplayName, balance, bot.Loyalty.Config().Currency))
}

func cmdRedeemReward(bot *Bot, message irc.PrivateMessage) {
	parts := strings.Fields(message.Message)
	if len(parts) < 2 {
		return
	}
	redeemID := parts[1]

	// Find reward
	for _, reward := range bot.Loyalty.Rewards() {
		if reward.ID != redeemID {
			continue
		}

		// Reward not active, return early
		if !reward.Enabled {
			return
		}

		// Get user balance
		balance := bot.Loyalty.GetPoints(message.User.Name)
		config := bot.Loyalty.Config()

		// Check if user can afford the reward
		if balance-reward.Price < 0 {
			bot.Client.Say(message.Channel, fmt.Sprintf("I'm sorry %s but you cannot afford this (have %d %s, need %d)", message.User.DisplayName, balance, config.Currency, reward.Price))
			return
		}

		text := ""
		if len(parts) > 2 {
			text = strings.Join(parts[2:], " ")
		}

		// Perform redeem
		if err := bot.Loyalty.PerformRedeem(loyalty.Redeem{
			Username:    message.User.Name,
			DisplayName: message.User.DisplayName,
			When:        time.Now(),
			Reward:      reward,
			RequestText: text,
		}); err != nil {
			bot.logger.WithError(err).Error("error while performing redeem")
			return
		}

		bot.Client.Say(message.Channel, fmt.Sprintf("HolidayPresent %s has redeemed %s! (new balance: %d %s)", message.User.DisplayName, reward.Name, bot.Loyalty.GetPoints(message.User.Name), config.Currency))

		return
	}
}

func cmdGoalList(bot *Bot, message irc.PrivateMessage) {
	goals := bot.Loyalty.Goals()
	if len(goals) < 1 {
		bot.Client.Say(message.Channel, fmt.Sprintf("%s: There are no active community goals right now :(!", message.User.DisplayName))
		return
	}
	msg := "Current goals: "
	for _, goal := range goals {
		if !goal.Enabled {
			continue
		}
		msg += fmt.Sprintf("%s (%d/%d %s) [id: %s] | ", goal.Name, goal.Contributed, goal.TotalGoal, bot.Loyalty.Config().Currency, goal.ID)
	}
	msg += " Contribute with <!contribute POINTS GOALID>"
	bot.Client.Say(message.Channel, msg)
}

func cmdContributeGoal(bot *Bot, message irc.PrivateMessage) {
	goals := bot.Loyalty.Goals()

	// Set defaults if user doesn't provide them
	points := int64(100)
	goalIndex := -1
	hasGoals := false

	// Get first unreached goal for default
	for index, goal := range goals {
		if !goal.Enabled {
			continue
		}
		hasGoals = true
		if goal.Contributed < goal.TotalGoal {
			goalIndex = index
			break
		}
	}

	// Do we not have any goal we can contribute to? Hooray I guess?
	if goalIndex < 0 {
		if hasGoals {
			bot.Client.Say(message.Channel, fmt.Sprintf("%s: All active community goals have been reached already! ShowOfHands", message.User.DisplayName))
		} else {
			bot.Client.Say(message.Channel, fmt.Sprintf("%s: There are no active community goals right now :(!", message.User.DisplayName))
		}
		return
	}

	// Parse parameters if provided
	parts := strings.Fields(message.Message)
	if len(parts) > 1 {
		newpoints, err := strconv.ParseInt(parts[1], 10, 64)
		if err == nil {
			if newpoints <= 0 {
				bot.Client.Say(message.Channel, fmt.Sprintf("Nice try %s SoBayed", message.User.DisplayName))
				return
			}
			points = newpoints
		}
		if len(parts) > 2 {
			found := false
			goalID := parts[2]
			// Find Goal index
			for index, goal := range goals {
				if !goal.Enabled {
					continue
				}
				if goal.ID == goalID {
					goalIndex = index
					found = true
					break
				}
			}
			// Invalid goal ID provided
			if !found {
				bot.Client.Say(message.Channel, fmt.Sprintf("%s: I couldn't find that goal ID :(", message.User.DisplayName))
				return
			}
		}
	}

	// Get user balance
	balance := bot.Loyalty.GetPoints(message.User.Name)

	// If user specified more points than they have, pick the maximum possible
	if points > balance {
		points = balance
	}

	// Get goal
	selectedGoal := goals[goalIndex]

	// Check if goal was reached already
	if selectedGoal.Contributed >= selectedGoal.TotalGoal {
		bot.Client.Say(message.Channel, fmt.Sprintf("%s: This goal was already reached! ヾ(•ω•`)o", message.User.DisplayName))
		return
	}

	// If remaining points are lower than what user is contributing, only take what's needed
	remaining := selectedGoal.TotalGoal - selectedGoal.Contributed
	if points > remaining {
		points = remaining
	}

	// Remove points from user
	if err := bot.Loyalty.TakePoints(map[string]int64{message.User.Name: points}); err != nil {
		bot.logger.WithError(err).Error("error while taking points for redeem")
		return
	}

	// Add points to goal
	if err := bot.Loyalty.ContributeGoal(selectedGoal, message.User.Name, points); err != nil {
		bot.logger.WithError(err).Error("error while contributing to goal")
		return
	}

	config := bot.Loyalty.Config()
	newRemaining := selectedGoal.TotalGoal - selectedGoal.Contributed
	bot.Client.Say(message.Channel, fmt.Sprintf("ShowOfHands %s contributed %d %s to \"%s\"!! Only %d %s left!", message.User.DisplayName, points, config.Currency, selectedGoal.Name, newRemaining, config.Currency))

	// Check if goal was reached!
	// TODO Replace this with sub from loyalty system or something?
	if newRemaining <= 0 {
		bot.Client.Say(message.Channel, fmt.Sprintf("ShowOfHands The community goal \"%s\" was reached! ShowOfHands", selectedGoal.Name))
	}
}
