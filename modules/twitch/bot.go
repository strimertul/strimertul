package twitch

import (
	"strings"
	"sync"
	"time"

	irc "github.com/gempir/go-twitch-irc/v2"
	"github.com/nicklaw5/helix"
	"github.com/sirupsen/logrus"
	"github.com/strimertul/strimertul/modules/loyalty"
)

type Bot struct {
	Client *irc.Client

	api         *Client
	username    string
	config      BotConfig
	logger      logrus.FieldLogger
	lastMessage time.Time
	activeUsers map[string]bool
	banlist     map[string]bool

	mu sync.Mutex

	// Module specific vars
	Loyalty *loyalty.Manager
}

func NewBot(api *Client, config BotConfig) *Bot {
	// Create client
	client := irc.NewClient(config.Username, config.Token)

	bot := &Bot{
		Client:      client,
		username:    strings.ToLower(config.Username), // Normalize username
		config:      config,
		logger:      api.logger,
		api:         api,
		lastMessage: time.Now(),
		activeUsers: make(map[string]bool),
		banlist:     make(map[string]bool),
		mu:          sync.Mutex{},
	}

	client.OnPrivateMessage(func(message irc.PrivateMessage) {
		bot.logger.Debugf("MSG: <%s> %s", message.User.Name, message.Message)
		// Ignore messages for a while or twitch will get mad!
		if message.Time.Before(bot.lastMessage.Add(time.Second * 2)) {
			bot.logger.Debug("message received too soon, ignoring")
			return
		}
		bot.mu.Lock()
		bot.activeUsers[message.User.Name] = true
		bot.mu.Unlock()

		// Check if it's a command
		if strings.HasPrefix(message.Message, "!") {
			// Run through supported commands
			for cmd, data := range commands {
				if strings.HasPrefix(message.Message, cmd) {
					go data.Handler(bot, message)
					bot.lastMessage = time.Now()
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

	bot.Client.Join(config.Channel)

	return bot
}

func (b *Bot) SetupLoyalty(loyalty *loyalty.Manager) {
	config := loyalty.Config()
	b.Loyalty = loyalty
	b.SetBanList(config.BanList)
	b.Client.OnConnect(func() {
		if config.Points.Interval > 0 {
			go func() {
				b.logger.Info("loyalty poll started")
				for {
					// Wait for next poll
					time.Sleep(time.Duration(config.Points.Interval) * time.Second)

					// Check if streamer is online, if possible
					streamOnline := true
					status, err := b.api.API.GetStreams(&helix.StreamsParams{
						UserLogins: []string{b.config.Channel},
					})
					if err != nil {
						b.logger.WithError(err).Error("Error checking stream status")
					} else {
						streamOnline = len(status.Data.Streams) > 0
					}

					// If stream is confirmed offline, don't give points away!
					if !streamOnline {
						b.logger.Debug("loyalty poll active but stream is offline!")
						continue
					} else {
						b.logger.Debug("awarding points")
					}

					// Get user list
					users, err := b.Client.Userlist(b.config.Channel)
					if err != nil {
						b.logger.WithError(err).Error("error listing users")
						continue
					}

					// Iterate for each user in the list
					pointsToGive := make(map[string]int64)
					for _, user := range users {
						// Check if user is blocked
						if b.IsBanned(user) {
							continue
						}

						// Check if user was active (chatting) for the bonus dingus
						award := config.Points.Amount
						if b.IsActive(user) {
							award += config.Points.ActivityBonus
						}

						// Add to point pool if already on it, otherwise initialize
						pointsToGive[user] = award
					}

					b.ResetActivity()

					// If changes were made, save the pool!
					if len(users) > 0 {
						b.Loyalty.GivePoints(pointsToGive)
					}
				}
			}()
		}
	})
}

func (b *Bot) SetBanList(banned []string) {
	b.banlist = make(map[string]bool)
	for _, usr := range banned {
		b.banlist[usr] = true
	}
}

func (b *Bot) IsBanned(user string) bool {
	banned, ok := b.banlist[user]
	return ok && banned
}

func (b *Bot) IsActive(user string) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	active, ok := b.activeUsers[user]
	return ok && active
}

func (b *Bot) ResetActivity() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.activeUsers = make(map[string]bool)
}

func (b *Bot) Connect() error {
	return b.Client.Connect()
}
