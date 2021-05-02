package twitchbot

import (
	"strings"
	"time"

	irc "github.com/gempir/go-twitch-irc/v2"
	"github.com/sirupsen/logrus"
	"github.com/strimertul/strimertul/modules/loyalty"
)

type TwitchBot struct {
	Client *irc.Client

	username    string
	logger      logrus.FieldLogger
	lastMessage time.Time
	activeUsers map[string]bool
	banlist     map[string]bool

	// Module specific vars
	Loyalty *loyalty.Manager
}

func NewBot(username string, token string, log logrus.FieldLogger) *TwitchBot {
	if log == nil {
		log = logrus.New()
	}

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
		bot.logger.Debugf("MSG: <%s> %s", message.User.Name, message.Message)
		// Ignore messages for a while or twitch will get mad!
		if message.Time.Before(bot.lastMessage.Add(time.Second * 2)) {
			bot.logger.Debug("message received too soon, ignoring")
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
			bot.logger.WithField("channel", message.Channel).Info("joined channel")
		} else {
			bot.logger.WithFields(logrus.Fields{
				"username": message.User,
				"channel":  message.Channel,
			}).Debug("user joined channel")
		}
	})
	client.OnUserPartMessage(func(message irc.UserPartMessage) {
		if strings.ToLower(message.User) == bot.username {
			bot.logger.WithField("channel", message.Channel).Info("left channel")
		} else {
			bot.logger.WithFields(logrus.Fields{
				"username": message.User,
				"channel":  message.Channel,
			}).Debug("user left channel")
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
