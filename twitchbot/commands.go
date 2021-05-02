package twitchbot

import (
	"fmt"
	"strings"

	irc "github.com/gempir/go-twitch-irc/v2"
	"github.com/strimertul/strimertul/logger"
)

type AccessLevelType string

const (
	ALTEveryone   AccessLevelType = "everyone"
	ALTVIP        AccessLevelType = "vip"
	ALTModerators AccessLevelType = "moderators"
	ALTStreamer   AccessLevelType = "streamer"
)

type BotCommandHandler func(bot *TwitchBot, message irc.PrivateMessage)

type BotCommand struct {
	Description string
	Usage       string
	AccessLevel AccessLevelType
	Handler     BotCommandHandler
}

var commands = map[string]BotCommand{
	"!redeem": {
		Description: "Redeem a reward with loyalty points",
		Usage:       "!redeem reward-id",
		AccessLevel: ALTEveryone,
		Handler:     cmdRedeem,
	},
}

func cmdRedeem(bot *TwitchBot, message irc.PrivateMessage) {
	parts := strings.Fields(message.Message)
	if len(parts) < 2 {
		return
	}
	redeemID := parts[1]

	// Find reward
	for _, reward := range bot.Loyalty.Rewards {
		if reward.ID != redeemID {
			continue
		}

		// Get user balance
		balance, ok := bot.Loyalty.Points[message.User.Name]
		if !ok {
			balance = 0
		}

		// Check if user can afford the reward
		if balance-reward.Price < 0 {
			bot.Client.Say(message.Channel, fmt.Sprintf("I'm sorry %s but you cannot afford this (have %d %s, need %d)", message.User.DisplayName, balance, bot.Loyalty.Config.Currency, reward.Price))
			return
		}

		// Perform redeem
		if err := bot.Loyalty.AddRedeem(message.User.Name, message.User.DisplayName, reward); err != nil {
			bot.logger(logger.MTError, "error while adding redeem: %s", err.Error())
			return
		}

		// Remove points from user
		if err := bot.Loyalty.TakePoints(map[string]int64{message.User.Name: reward.Price}); err != nil {
			bot.logger(logger.MTError, "error while taking points for redeem: %s", err.Error())
		}

		bot.Client.Say(message.Channel, fmt.Sprintf("%s has redeemed %s! (new balance: %d %s)", message.User.DisplayName, reward.Name, bot.Loyalty.Points[message.User.Name], bot.Loyalty.Config.Currency))

		return
	}
}
