package loyalty

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/strimertul/strimertul/twitch"

	"git.sr.ht/~hamcha/containers/sync"
	irc "github.com/gempir/go-twitch-irc/v3"
	"go.uber.org/zap"
)

func (m *Manager) SetupTwitch() {
	bot := m.twitchManager.Client().Bot
	if bot == nil {
		return
	}

	// Add loyalty-based commands
	bot.RegisterCommand("!redeem", twitch.BotCommand{
		Description: "Redeem a reward with loyalty points",
		Usage:       "!redeem <reward-id> [request text]",
		AccessLevel: twitch.ALTEveryone,
		Handler:     m.cmdRedeemReward,
		Enabled:     true,
	})
	bot.RegisterCommand("!balance", twitch.BotCommand{
		Description: "See your current point balance",
		Usage:       "!balance",
		AccessLevel: twitch.ALTEveryone,
		Handler:     m.cmdBalance,
		Enabled:     true,
	})
	bot.RegisterCommand("!goals", twitch.BotCommand{
		Description: "Check currently active community goals",
		Usage:       "!goals",
		AccessLevel: twitch.ALTEveryone,
		Handler:     m.cmdGoalList,
		Enabled:     true,
	})
	bot.RegisterCommand("!contribute", twitch.BotCommand{
		Description: "Contribute points to a community goal",
		Usage:       "!contribute <points> [<goal-id>]",
		AccessLevel: twitch.ALTEveryone,
		Handler:     m.cmdContributeGoal,
		Enabled:     true,
	})

	// Setup message handler for tracking user activity
	bot.OnMessage.Subscribe(m)

	// Setup handler for adding points over time
	go func() {
		config := m.Config.Get()
		// Stop handler if loyalty system is disabled or there is no valid point interval
		if !config.Enabled || config.Points.Interval <= 0 {
			return
		}
		for {
			// Wait for next poll
			select {
			case <-m.ctx.Done():
				return
			case <-time.After(time.Duration(config.Points.Interval) * time.Second):
			}

			// If stream is confirmed offline, don't give points away!
			isOnline := m.twitchManager.Client().IsLive()
			if !isOnline {
				continue
			}

			// Check that bot is online and working
			bot := m.twitchManager.Client().Bot
			if bot == nil {
				m.logger.Warn("bot is offline or not configured, could not assign points")
				continue
			}

			m.logger.Debug("awarding points")

			// Get user list
			users, err := bot.Client.Userlist(bot.Config.Channel)
			if err != nil {
				m.logger.Error("error listing users", zap.Error(err))
				continue
			}

			// Iterate for each user in the list
			pointsToGive := make(map[string]int64)
			for _, user := range users {
				// Check if user is blocked
				if m.IsBanned(user) {
					continue
				}

				// Check if user was active (chatting) for the bonus dingus
				award := config.Points.Amount
				if m.IsActive(user) {
					award += config.Points.ActivityBonus
				}

				// Add to point pool if already on it, otherwise initialize
				pointsToGive[user] = award
			}

			m.ResetActivity()

			// If changes were made, save the pool!
			if len(users) > 0 {
				err := m.GivePoints(pointsToGive)
				if err != nil {
					m.logger.Error("error giving points to user", zap.Error(err))
				}
			}
		}
	}()
}

func (m *Manager) StopTwitch() {
	bot := m.twitchManager.Client().Bot
	if bot != nil {
		bot.RemoveCommand("!redeem")
		bot.RemoveCommand("!balance")
		bot.RemoveCommand("!goals")
		bot.RemoveCommand("!contribute")

		// Remove message handler
		bot.OnMessage.Unsubscribe(m)
	}
}

func (m *Manager) HandleBotMessage(message irc.PrivateMessage) {
	m.activeUsers.SetKey(message.User.Name, true)
}

func (m *Manager) SetBanList(banned []string) {
	m.banlist = make(map[string]bool)
	for _, usr := range banned {
		m.banlist[usr] = true
	}
}

func (m *Manager) IsBanned(user string) bool {
	banned, ok := m.banlist[user]
	return ok && banned
}

func (m *Manager) IsActive(user string) bool {
	active, ok := m.activeUsers.GetKey(user)
	return ok && active
}

func (m *Manager) ResetActivity() {
	m.activeUsers = sync.NewMap[string, bool]()
}

func (m *Manager) cmdBalance(bot *twitch.Bot, message irc.PrivateMessage) {
	// Get user balance
	balance := m.GetPoints(message.User.Name)
	bot.Client.Say(message.Channel, fmt.Sprintf("%s: You have %d %s!", message.User.DisplayName, balance, m.Config.Get().Currency))
}

func (m *Manager) cmdRedeemReward(bot *twitch.Bot, message irc.PrivateMessage) {
	parts := strings.Fields(message.Message)
	if len(parts) < 2 {
		return
	}
	redeemID := parts[1]

	// Find reward
	reward := m.GetReward(redeemID)
	if reward.ID == "" {
		return
	}

	// Reward not active, return early
	if !reward.Enabled {
		return
	}

	// Get user balance
	balance := m.GetPoints(message.User.Name)
	config := m.Config.Get()

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
	if err := m.PerformRedeem(Redeem{
		Username:    message.User.Name,
		DisplayName: message.User.DisplayName,
		When:        time.Now(),
		Reward:      reward,
		RequestText: text,
	}); err != nil {
		switch err {
		case ErrRedeemInCooldown:
			nextAvailable := m.GetRewardCooldown(reward.ID)
			bot.Client.Say(message.Channel, fmt.Sprintf("%s: That reward is in cooldown (available in %s)", message.User.DisplayName,
				time.Until(nextAvailable).Truncate(time.Second)))
		default:
			m.logger.Error("error while performing redeem", zap.Error(err))
		}
		return
	}

	bot.Client.Say(message.Channel, fmt.Sprintf("HolidayPresent %s has redeemed %s! (new balance: %d %s)", message.User.DisplayName, reward.Name, m.GetPoints(message.User.Name), config.Currency))
}

func (m *Manager) cmdGoalList(bot *twitch.Bot, message irc.PrivateMessage) {
	goals := m.Goals.Get()
	if len(goals) < 1 {
		bot.Client.Say(message.Channel, fmt.Sprintf("%s: There are no active community goals right now :(!", message.User.DisplayName))
		return
	}
	msg := "Current goals: "
	for _, goal := range goals {
		if !goal.Enabled {
			continue
		}
		msg += fmt.Sprintf("%s (%d/%d %s) [id: %s] | ", goal.Name, goal.Contributed, goal.TotalGoal, m.Config.Get().Currency, goal.ID)
	}
	msg += " Contribute with <!contribute POINTS GOALID>"
	bot.Client.Say(message.Channel, msg)
}

func (m *Manager) cmdContributeGoal(bot *twitch.Bot, message irc.PrivateMessage) {
	goals := m.Goals.Get()

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

	// Get goal
	selectedGoal := goals[goalIndex]

	// Check if goal was reached already
	if selectedGoal.Contributed >= selectedGoal.TotalGoal {
		bot.Client.Say(message.Channel, fmt.Sprintf("%s: This goal was already reached! ヾ(•ω•`)o", message.User.DisplayName))
		return
	}

	// Add points to goal
	if err := m.PerformContribution(selectedGoal, message.User.Name, points); err != nil {
		m.logger.Error("error while contributing to goal", zap.Error(err))
		return
	}

	config := m.Config.Get()
	newRemaining := selectedGoal.TotalGoal - selectedGoal.Contributed
	bot.Client.Say(message.Channel, fmt.Sprintf("ShowOfHands %s contributed %d %s to \"%s\"!! Only %d %s left!", message.User.DisplayName, points, config.Currency, selectedGoal.Name, newRemaining, config.Currency))

	// Check if goal was reached!
	// TODO Replace this with sub from loyalty system or something?
	if newRemaining <= 0 {
		bot.Client.Say(message.Channel, fmt.Sprintf("ShowOfHands The community goal \"%s\" was reached! ShowOfHands", selectedGoal.Name))
	}
}
