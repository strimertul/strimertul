package twitch

import (
	"context"
	"strings"
	"sync"
	"time"

	irc "github.com/gempir/go-twitch-irc/v2"
	jsoniter "github.com/json-iterator/go"
	"github.com/sirupsen/logrus"
	"github.com/strimertul/strimertul/database"
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
	chatHistory []irc.PrivateMessage

	commands       map[string]BotCommand
	customCommands map[string]BotCustomCommand

	mu sync.Mutex

	// Module specific vars
	Loyalty *loyalty.Manager
}

func NewBot(api *Client, config BotConfig) *Bot {
	// Create client
	client := irc.NewClient(config.Username, config.Token)

	bot := &Bot{
		Client:         client,
		username:       strings.ToLower(config.Username), // Normalize username
		config:         config,
		logger:         api.logger,
		api:            api,
		lastMessage:    time.Now(),
		activeUsers:    make(map[string]bool),
		banlist:        make(map[string]bool),
		mu:             sync.Mutex{},
		commands:       make(map[string]BotCommand),
		customCommands: make(map[string]BotCustomCommand),
	}

	client.OnPrivateMessage(func(message irc.PrivateMessage) {
		// Ignore messages for a while or twitch will get mad!
		if message.Time.Before(bot.lastMessage.Add(time.Second * 2)) {
			bot.logger.Debug("message received too soon, ignoring")
			return
		}
		bot.mu.Lock()
		bot.activeUsers[message.User.Name] = true

		// Check if it's a command
		if strings.HasPrefix(message.Message, "!") {
			// Run through supported commands
			for cmd, data := range bot.commands {
				if !data.Enabled {
					continue
				}
				if strings.HasPrefix(message.Message, cmd) {
					go data.Handler(bot, message)
					bot.lastMessage = time.Now()
				}
			}
		}

		// Run through custom commands
		for cmd, data := range bot.customCommands {
			if !data.Enabled {
				continue
			}
			if strings.HasPrefix(message.Message, cmd) {
				go cmdCustom(bot, data, message)
				bot.lastMessage = time.Now()
			}
		}
		bot.mu.Unlock()

		if bot.config.EnableChatKeys {
			bot.api.db.PutJSON(ChatEventKey, message)
			if bot.config.ChatHistory > 0 {
				if len(bot.chatHistory) >= bot.config.ChatHistory {
					bot.chatHistory = bot.chatHistory[len(bot.chatHistory)-bot.config.ChatHistory+1:]
				}
				bot.chatHistory = append(bot.chatHistory, message)
				bot.api.db.PutJSON(ChatHistoryKey, bot.chatHistory)
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

	// Load custom commands
	api.db.GetJSON(CustomCommandsKey, &bot.customCommands)
	go api.db.Subscribe(context.Background(), bot.updateCommands, CustomCommandsKey)

	return bot
}

func (b *Bot) updateCommands(kvs []database.ModifiedKV) error {
	for _, kv := range kvs {
		key := string(kv.Key)
		switch key {
		case CustomCommandsKey:
			b.mu.Lock()
			err := jsoniter.ConfigFastest.Unmarshal(kv.Data, &b.customCommands)
			b.mu.Unlock()
			return err
		}
	}
	return nil
}

func (b *Bot) Connect() error {
	return b.Client.Connect()
}
