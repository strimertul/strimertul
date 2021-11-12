package twitch

import (
	"context"
	"strings"
	"sync"
	"text/template"
	"time"

	"github.com/Masterminds/sprig"
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

	commands        map[string]BotCommand
	customCommands  map[string]BotCustomCommand
	customTemplates map[string]*template.Template
	customFunctions template.FuncMap

	mu sync.Mutex

	// Module specific vars
	Loyalty *loyalty.Manager
	Timers  *BotTimerModule
}

func NewBot(api *Client, config BotConfig) *Bot {
	// Create client
	client := irc.NewClient(config.Username, config.Token)

	bot := &Bot{
		Client:          client,
		username:        strings.ToLower(config.Username), // Normalize username
		config:          config,
		logger:          api.logger,
		api:             api,
		lastMessage:     time.Now(),
		activeUsers:     make(map[string]bool),
		banlist:         make(map[string]bool),
		mu:              sync.Mutex{},
		commands:        make(map[string]BotCommand),
		customCommands:  make(map[string]BotCustomCommand),
		customTemplates: make(map[string]*template.Template),
	}

	client.OnPrivateMessage(func(message irc.PrivateMessage) {
		// Ignore messages for a while or twitch will get mad!
		if message.Time.Before(bot.lastMessage.Add(time.Second * 2)) {
			bot.logger.Debug("message received too soon, ignoring")
			return
		}
		bot.mu.Lock()
		bot.activeUsers[message.User.Name] = true

		lcmessage := strings.ToLower(message.Message)

		// Check if it's a command
		if strings.HasPrefix(message.Message, "!") {
			// Run through supported commands
			for cmd, data := range bot.commands {
				if !data.Enabled {
					continue
				}
				if strings.HasPrefix(lcmessage, cmd) {
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
			lc := strings.ToLower(cmd)
			if strings.HasPrefix(lcmessage, lc) {
				go cmdCustom(bot, cmd, data, message)
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

		if bot.Timers != nil {
			go bot.Timers.OnMessage(message)
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

	// Load modules
	err := bot.LoadModules()
	if err != nil {
		bot.logger.WithError(err).Error("failed to load modules")
	}

	// Load custom commands
	bot.setupFunctions()
	api.db.GetJSON(CustomCommandsKey, &bot.customCommands)
	err = bot.updateTemplates()
	if err != nil {
		bot.logger.WithError(err).Error("failed to load custom commands")
	}
	go api.db.Subscribe(context.Background(), bot.updateCommands, CustomCommandsKey)
	go api.db.Subscribe(context.Background(), bot.handleWriteMessageRPC, WriteMessageRPC)

	return bot
}

func (b *Bot) updateCommands(kvs []database.ModifiedKV) error {
	for _, kv := range kvs {
		switch kv.Key {
		case CustomCommandsKey:
			err := func() error {
				b.mu.Lock()
				defer b.mu.Unlock()
				return jsoniter.ConfigFastest.Unmarshal(kv.Data, &b.customCommands)
			}()
			if err != nil {
				return err
			}
			// Recreate templates
			if err := b.updateTemplates(); err != nil {
				return err
			}
		}
	}
	return nil
}

func (b *Bot) handleWriteMessageRPC(kvs []database.ModifiedKV) error {
	for _, kv := range kvs {
		switch kv.Key {
		case WriteMessageRPC:
			b.Client.Say(b.config.Channel, string(kv.Data))
		}
	}
	return nil
}

func (b *Bot) updateTemplates() error {
	for cmd, tmpl := range b.customCommands {
		var err error
		b.customTemplates[cmd], err = template.New("").Funcs(sprig.TxtFuncMap()).Funcs(b.customFunctions).Parse(tmpl.Response)
		if err != nil {
			return err
		}
	}
	return nil
}

func (b *Bot) Connect() error {
	return b.Client.Connect()
}

func (b *Bot) WriteMessage(message string) {
	b.Client.Say(b.config.Channel, message)
}
