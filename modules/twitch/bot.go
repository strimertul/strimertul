package twitch

import (
	"strings"
	"sync"
	"text/template"
	"time"

	"github.com/strimertul/strimertul/modules/loyalty"
	"go.uber.org/zap"

	"github.com/Masterminds/sprig/v3"
	irc "github.com/gempir/go-twitch-irc/v2"
	jsoniter "github.com/json-iterator/go"
)

type Bot struct {
	Client *irc.Client

	api         *Client
	username    string
	config      BotConfig
	logger      *zap.Logger
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
	Alerts  *BotAlertsModule
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
				if !strings.HasPrefix(lcmessage, cmd) {
					continue
				}
				parts := strings.SplitN(lcmessage, " ", 2)
				if parts[0] != cmd {
					continue
				}
				go data.Handler(bot, message)
				bot.lastMessage = time.Now()
			}
		}

		// Run through custom commands
		for cmd, data := range bot.customCommands {
			if !data.Enabled {
				continue
			}
			lc := strings.ToLower(cmd)
			if !strings.HasPrefix(lcmessage, lc) {
				continue
			}
			parts := strings.SplitN(lcmessage, " ", 2)
			if parts[0] != lc {
				continue
			}
			go cmdCustom(bot, cmd, data, message)
			bot.lastMessage = time.Now()
		}
		bot.mu.Unlock()

		bot.api.db.PutJSON(ChatEventKey, message)
		if bot.config.ChatHistory > 0 {
			if len(bot.chatHistory) >= bot.config.ChatHistory {
				bot.chatHistory = bot.chatHistory[len(bot.chatHistory)-bot.config.ChatHistory+1:]
			}
			bot.chatHistory = append(bot.chatHistory, message)
			bot.api.db.PutJSON(ChatHistoryKey, bot.chatHistory)
		}

		if bot.Timers != nil {
			go bot.Timers.OnMessage(message)
		}
	})

	client.OnUserJoinMessage(func(message irc.UserJoinMessage) {
		if strings.ToLower(message.User) == bot.username {
			bot.logger.Info("joined channel", zap.String("channel", message.Channel))
		} else {
			bot.logger.Debug("user joined channel", zap.String("channel", message.Channel), zap.String("username", message.User))
		}
	})

	client.OnUserPartMessage(func(message irc.UserPartMessage) {
		if strings.ToLower(message.User) == bot.username {
			bot.logger.Info("left channel", zap.String("channel", message.Channel))
		} else {
			bot.logger.Debug("user left channel", zap.String("channel", message.Channel), zap.String("username", message.User))
		}
	})

	bot.Client.Join(config.Channel)
	bot.setupFunctions()

	// Load modules
	err := bot.LoadModules()
	if err != nil {
		bot.logger.Error("failed to load modules", zap.Error(err))
	}

	// Load custom commands
	err = api.db.GetJSON(CustomCommandsKey, &bot.customCommands)
	if err != nil {
		bot.logger.Error("failed to load custom commands", zap.Error(err))
	}

	err = bot.updateTemplates()
	if err != nil {
		bot.logger.Error("failed to parse custom commands", zap.Error(err))
	}
	go api.db.Subscribe(bot.updateCommands, CustomCommandsKey)
	go api.db.Subscribe(bot.handleWriteMessageRPC, WriteMessageRPC)

	return bot
}

func (b *Bot) updateCommands(key, value string) {
	switch key {
	case CustomCommandsKey:
		err := func() error {
			b.mu.Lock()
			defer b.mu.Unlock()
			return jsoniter.ConfigFastest.UnmarshalFromString(value, &b.customCommands)
		}()
		if err != nil {
			b.logger.Error("failed to decode new custom commands", zap.Error(err))
			return
		}
		// Recreate templates
		if err := b.updateTemplates(); err != nil {
			b.logger.Error("failed to update custom commands templates", zap.Error(err))
			return
		}
	}
}

func (b *Bot) handleWriteMessageRPC(key, value string) {
	switch key {
	case WriteMessageRPC:
		b.Client.Say(b.config.Channel, value)
	}
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

func getUserAccessLevel(user irc.User) AccessLevelType {
	// Check broadcaster
	if _, ok := user.Badges["broadcaster"]; ok {
		return ALTStreamer
	}

	// Check mods
	if _, ok := user.Badges["moderator"]; ok {
		return ALTModerators
	}

	// Check VIP
	if _, ok := user.Badges["vip"]; ok {
		return ALTVIP
	}

	// Check subscribers
	if _, ok := user.Badges["subscriber"]; ok {
		return ALTSubscribers
	}

	return ALTEveryone
}
