package twitch

import (
	"errors"
	"strings"
	"text/template"
	"time"

	"git.sr.ht/~hamcha/containers/sync"
	"github.com/Masterminds/sprig/v3"
	irc "github.com/gempir/go-twitch-irc/v4"
	"go.uber.org/zap"

	"github.com/strimertul/strimertul/database"
	"github.com/strimertul/strimertul/utils"
)

type Bot struct {
	Client *irc.Client
	Config BotConfig

	api         *Client
	username    string
	logger      *zap.Logger
	lastMessage *sync.RWSync[time.Time]
	chatHistory *sync.Slice[irc.PrivateMessage]

	commands        *sync.Map[string, BotCommand]
	customCommands  *sync.Map[string, BotCustomCommand]
	customTemplates *sync.Map[string, *template.Template]
	customFunctions template.FuncMap

	OnConnect *utils.PubSub[BotConnectHandler]
	OnMessage *utils.PubSub[BotMessageHandler]

	cancelUpdateSub   database.CancelFunc
	cancelWriteRPCSub database.CancelFunc

	// Module specific vars
	Timers *BotTimerModule
	Alerts *BotAlertsModule
}

type BotConnectHandler interface {
	utils.Comparable
	HandleBotConnect()
}

type BotMessageHandler interface {
	utils.Comparable
	HandleBotMessage(message irc.PrivateMessage)
}

func (b *Bot) Migrate(old *Bot) {
	utils.MergeSyncMap(b.commands, old.commands)
	// Get registered commands and handlers from old bot
	b.OnConnect.Copy(old.OnConnect)
	b.OnMessage.Copy(old.OnMessage)
}

func newBot(api *Client, config BotConfig) *Bot {
	// Create client
	client := irc.NewClient(config.Username, config.Token)

	bot := &Bot{
		Client: client,
		Config: config,

		username:        strings.ToLower(config.Username), // Normalize username
		logger:          api.logger,
		api:             api,
		lastMessage:     sync.NewRWSync(time.Now()),
		commands:        sync.NewMap[string, BotCommand](),
		customCommands:  sync.NewMap[string, BotCustomCommand](),
		customTemplates: sync.NewMap[string, *template.Template](),
		chatHistory:     sync.NewSlice[irc.PrivateMessage](),

		OnConnect: utils.NewPubSub[BotConnectHandler](),
		OnMessage: utils.NewPubSub[BotMessageHandler](),
	}

	client.OnConnect(bot.onConnectHandler)
	client.OnPrivateMessage(bot.onMessageHandler)
	client.OnUserJoinMessage(bot.onJoinHandler)
	client.OnUserPartMessage(bot.onPartHandler)

	bot.Client.Join(config.Channel)
	bot.setupFunctions()

	// Load modules
	bot.Timers = SetupTimers(bot)
	bot.Alerts = SetupAlerts(bot)

	// Load custom commands
	var customCommands map[string]BotCustomCommand
	err := api.db.GetJSON(CustomCommandsKey, &customCommands)
	if err != nil {
		if errors.Is(err, database.ErrEmptyKey) {
			customCommands = make(map[string]BotCustomCommand)
		} else {
			bot.logger.Error("Failed to load custom commands", zap.Error(err))
		}
	}
	bot.customCommands.Set(customCommands)

	err = bot.updateTemplates()
	if err != nil {
		bot.logger.Error("Failed to parse custom commands", zap.Error(err))
	}
	err, bot.cancelUpdateSub = api.db.SubscribeKey(CustomCommandsKey, bot.updateCommands)
	if err != nil {
		bot.logger.Error("Could not set-up bot command reload subscription", zap.Error(err))
	}
	err, bot.cancelWriteRPCSub = api.db.SubscribeKey(WriteMessageRPC, bot.handleWriteMessageRPC)
	if err != nil {
		bot.logger.Error("Could not set-up bot command reload subscription", zap.Error(err))
	}

	return bot
}

func (b *Bot) onJoinHandler(message irc.UserJoinMessage) {
	if strings.ToLower(message.User) == b.username {
		b.logger.Info("Twitch bot joined channel", zap.String("channel", message.Channel))
	} else {
		b.logger.Debug("User joined channel", zap.String("channel", message.Channel), zap.String("username", message.User))
	}
}

func (b *Bot) onPartHandler(message irc.UserPartMessage) {
	if strings.ToLower(message.User) == b.username {
		b.logger.Info("Twitch bot left channel", zap.String("channel", message.Channel))
	} else {
		b.logger.Debug("User left channel", zap.String("channel", message.Channel), zap.String("username", message.User))
	}
}

func (b *Bot) onMessageHandler(message irc.PrivateMessage) {
	for _, handler := range b.OnMessage.Subscribers() {
		if handler != nil {
			handler.HandleBotMessage(message)
		}
	}

	// Ignore messages for a while or twitch will get mad!
	if message.Time.Before(b.lastMessage.Get().Add(time.Second * 2)) {
		b.logger.Debug("Message received too soon, ignoring")
		return
	}

	lowercaseMessage := strings.ToLower(message.Message)

	// Check if it's a command
	if strings.HasPrefix(message.Message, "!") {
		// Run through supported commands
		for cmd, data := range b.commands.Copy() {
			if !data.Enabled {
				continue
			}
			if !strings.HasPrefix(lowercaseMessage, cmd) {
				continue
			}
			parts := strings.SplitN(lowercaseMessage, " ", 2)
			if parts[0] != cmd {
				continue
			}
			go data.Handler(b, message)
			b.lastMessage.Set(time.Now())
		}
	}

	// Run through custom commands
	for cmd, data := range b.customCommands.Copy() {
		if !data.Enabled {
			continue
		}
		lc := strings.ToLower(cmd)
		if !strings.HasPrefix(lowercaseMessage, lc) {
			continue
		}
		parts := strings.SplitN(lowercaseMessage, " ", 2)
		if parts[0] != lc {
			continue
		}
		go cmdCustom(b, cmd, data, message)
		b.lastMessage.Set(time.Now())
	}

	err := b.api.db.PutJSON(ChatEventKey, message)
	if err != nil {
		b.logger.Warn("Could not save chat message to key", zap.String("key", ChatEventKey), zap.Error(err))
	}
	if b.Config.ChatHistory > 0 {
		history := b.chatHistory.Get()
		if len(history) >= b.Config.ChatHistory {
			history = history[len(history)-b.Config.ChatHistory+1:]
		}
		b.chatHistory.Set(append(history, message))
		err = b.api.db.PutJSON(ChatHistoryKey, b.chatHistory.Get())
		if err != nil {
			b.logger.Warn("Could not save message to chat history", zap.Error(err))
		}
	}

	if b.Timers != nil {
		go b.Timers.OnMessage(message)
	}
}

func (b *Bot) onConnectHandler() {
	for _, handler := range b.OnConnect.Subscribers() {
		if handler != nil {
			handler.HandleBotConnect()
		}
	}
}

func (b *Bot) Close() error {
	if b.cancelUpdateSub != nil {
		b.cancelUpdateSub()
	}
	if b.cancelWriteRPCSub != nil {
		b.cancelWriteRPCSub()
	}
	if b.Timers != nil {
		b.Timers.Close()
	}
	if b.Alerts != nil {
		b.Alerts.Close()
	}
	return b.Client.Disconnect()
}

func (b *Bot) updateCommands(value string) {
	err := utils.LoadJSONToWrapped[map[string]BotCustomCommand](value, b.customCommands)
	if err != nil {
		b.logger.Error("Failed to decode new custom commands", zap.Error(err))
		return
	}
	// Recreate templates
	if err := b.updateTemplates(); err != nil {
		b.logger.Error("Failed to update custom commands templates", zap.Error(err))
		return
	}
}

func (b *Bot) handleWriteMessageRPC(value string) {
	b.Client.Say(b.Config.Channel, value)
}

func (b *Bot) updateTemplates() error {
	b.customTemplates.Set(make(map[string]*template.Template))
	for cmd, tmpl := range b.customCommands.Copy() {
		tpl, err := template.New("").Funcs(sprig.TxtFuncMap()).Funcs(b.customFunctions).Parse(tmpl.Response)
		if err != nil {
			return err
		}
		b.customTemplates.SetKey(cmd, tpl)
	}
	return nil
}

func (b *Bot) Connect() {
	err := b.Client.Connect()
	if err != nil {
		if errors.Is(err, irc.ErrClientDisconnected) {
			b.logger.Info("Twitch bot connection terminated", zap.Error(err))
		} else {
			b.logger.Error("Twitch bot connection terminated unexpectedly", zap.Error(err))
		}
	}
}

func (b *Bot) WriteMessage(message string) {
	b.Client.Say(b.Config.Channel, message)
}

func (b *Bot) RegisterCommand(trigger string, command BotCommand) {
	b.commands.SetKey(trigger, command)
}

func (b *Bot) RemoveCommand(trigger string) {
	b.commands.DeleteKey(trigger)
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
