package twitchbot

import (
	"strings"
	"time"

	irc "github.com/gempir/go-twitch-irc/v2"
	"github.com/strimertul/strimertul/logger"
	"github.com/strimertul/strimertul/modules/loyalty"
)

type TwitchBot struct {
	Client *irc.Client

	username    string
	logger      logger.LogFn
	lastMessage time.Time
	activeUsers map[string]bool
	banlist     map[string]bool

	// Module specific vars
	Loyalty *loyalty.Manager
}

func NewBot(username string, token string, log logger.LogFn) *TwitchBot {
	// Create client
	client := irc.NewClient(username, token)

	bot := &TwitchBot{
		Client:      client,
		username:    strings.ToLower(username), // Normalize username
		logger:      log,
		lastMessage: time.Now(),
		activeUsers: make(map[string]bool),
		banlist:     make(map[string]bool),
	}

	client.OnPrivateMessage(func(message irc.PrivateMessage) {
		bot.logger(logger.MTDebug, "MSG: <%s> %s", message.User.Name, message.Message)
		// Ignore messages for a while or twitch will get mad!
		if message.Time.Before(bot.lastMessage.Add(time.Second * 2)) {
			bot.logger(logger.MTDebug, "message received too soon, ignoring")
			return
		}
		bot.activeUsers[message.User.Name] = true

		// Check if it's a command
		if strings.HasPrefix(message.Message, "!") {
			// Run through supported commands
			for cmd, data := range commands {
				if strings.HasPrefix(message.Message, cmd) {
					data.Handler(bot, message)
				}
			}
		}
	})

	client.OnUserJoinMessage(func(message irc.UserJoinMessage) {
		if strings.ToLower(message.User) == bot.username {
			bot.logger(logger.MTNotice, "Joined %s", message.Channel)
		} else {
			bot.logger(logger.MTDebug, "%s joined %s", message.User, message.Channel)
		}
	})
	client.OnUserPartMessage(func(message irc.UserPartMessage) {
		if strings.ToLower(message.User) == bot.username {
			bot.logger(logger.MTNotice, "Left %s", message.Channel)
		} else {
			bot.logger(logger.MTDebug, "%s left %s", message.User, message.Channel)
		}
	})

	return bot
}

func (b *TwitchBot) SetBanList(banned []string) {
	b.banlist = make(map[string]bool)
	for _, usr := range banned {
		b.banlist[usr] = true
	}
}

func (b *TwitchBot) IsBanned(user string) bool {
	banned, ok := b.banlist[user]
	return ok && banned
}

func (b *TwitchBot) IsActive(user string) bool {
	active, ok := b.activeUsers[user]
	return ok && active
}

func (b *TwitchBot) ResetActivity() {
	b.activeUsers = make(map[string]bool)
}

func (b *TwitchBot) Connect() error {
	return b.Client.Connect()
}
