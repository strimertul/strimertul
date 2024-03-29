package twitch

import (
	"math/rand"
	"time"

	"git.sr.ht/~ashkeel/containers/sync"
	irc "github.com/gempir/go-twitch-irc/v4"
	"go.uber.org/zap"

	"git.sr.ht/~ashkeel/strimertul/database"
)

const BotTimersKey = "twitch/bot-modules/timers/config"

type BotTimersConfig struct {
	Timers map[string]BotTimer `json:"timers" desc:"List of timers as a dictionary"`
}

type BotTimer struct {
	// Whether the timer is enabled
	Enabled bool `json:"enabled" desc:"Enable the timer"`

	// Timer name (must be unique)
	Name string `json:"name" desc:"Timer name (must be unique)"`

	// Minimum chat messages in the last 5 minutes for timer to trigger
	MinimumChatActivity int `json:"minimum_chat_activity" desc:"Minimum chat messages in the last 5 minutes for timer to trigger"`

	// Minimum amount of time (in seconds) that needs to pass before it triggers again
	MinimumDelay int `json:"minimum_delay" desc:"Minimum amount of time (in seconds) that needs to pass before it triggers again"`

	// Messages to write (randomly chosen)
	Messages []string `json:"messages" desc:"Messages to write (randomly chosen)"`
}

const AverageMessageWindow = 5

type BotTimerModule struct {
	Config BotTimersConfig

	bot         *Bot
	lastTrigger *sync.Map[string, time.Time]
	messages    *sync.Slice[int]

	cancelTimerSub database.CancelFunc
}

func SetupTimers(bot *Bot) *BotTimerModule {
	mod := &BotTimerModule{
		bot:         bot,
		lastTrigger: sync.NewMap[string, time.Time](),
		messages:    sync.NewSlice[int](),
	}

	// Fill messages with zero values
	// (This can probably be done faster)
	for i := 0; i < AverageMessageWindow; i += 1 {
		mod.messages.Push(0)
	}

	// Load config from database
	err := bot.api.db.GetJSON(BotTimersKey, &mod.Config)
	if err != nil {
		bot.logger.Debug("Config load error", zap.Error(err))
		mod.Config = BotTimersConfig{
			Timers: make(map[string]BotTimer),
		}
		// Save empty config
		err = bot.api.db.PutJSON(BotTimersKey, mod.Config)
		if err != nil {
			bot.logger.Warn("Could not save default config for bot timers", zap.Error(err))
		}
	}

	err, mod.cancelTimerSub = bot.api.db.SubscribeKey(BotTimersKey, func(value string) {
		err := json.UnmarshalFromString(value, &mod.Config)
		if err != nil {
			bot.logger.Debug("Error reloading timer config", zap.Error(err))
		} else {
			bot.logger.Info("Reloaded timer config")
		}
	})
	if err != nil {
		bot.logger.Error("Could not set-up timer reload subscription", zap.Error(err))
	}

	bot.logger.Debug("Loaded timers", zap.Int("timers", len(mod.Config.Timers)))

	// Start goroutine for clearing message counters and running timers
	go mod.runTimers()

	return mod
}

func (m *BotTimerModule) runTimers() {
	for {
		// Wait until next tick (remainder until next minute, as close to 0 seconds as possible)
		currentTime := time.Now()
		nextTick := currentTime.Round(time.Minute).Add(time.Minute)
		timeUntilNextTick := nextTick.Sub(currentTime)
		time.Sleep(timeUntilNextTick)

		err := m.bot.api.db.PutJSON(ChatActivityKey, m.messages.Get())
		if err != nil {
			m.bot.logger.Warn("Error saving chat activity", zap.Error(err))
		}

		// Calculate activity
		activity := m.currentChatActivity()

		// Reset timer
		index := time.Now().Minute() % AverageMessageWindow
		messages := m.messages.Get()
		messages[index] = 0
		m.messages.Set(messages)

		// Run timers
		for name, timer := range m.Config.Timers {
			m.ProcessTimer(name, timer, activity)
		}
	}
}

func (m *BotTimerModule) ProcessTimer(name string, timer BotTimer, activity int) {
	// Must be enabled
	if !timer.Enabled {
		return
	}

	// Check if enough time has passed
	lastTriggeredTime, ok := m.lastTrigger.GetKey(name)
	if !ok {
		// If it's the first time we're checking it, start the cooldown
		lastTriggeredTime = time.Now()
		m.lastTrigger.SetKey(name, lastTriggeredTime)
	}

	minDelay := timer.MinimumDelay
	if minDelay < 60 {
		minDelay = 60
	}

	now := time.Now()
	if now.Sub(lastTriggeredTime) < time.Duration(minDelay)*time.Second {
		return
	}

	// Make sure chat activity is high enough
	if activity < timer.MinimumChatActivity {
		return
	}

	// Pick a random message
	message := timer.Messages[rand.Intn(len(timer.Messages))]

	// Write message to chat
	m.bot.WriteMessage(message)

	// Update last trigger
	m.lastTrigger.SetKey(name, now)
}

func (m *BotTimerModule) Close() {
	if m.cancelTimerSub != nil {
		m.cancelTimerSub()
	}
}

func (m *BotTimerModule) currentChatActivity() int {
	total := 0
	for _, v := range m.messages.Get() {
		total += v
	}
	return total
}

func (m *BotTimerModule) OnMessage(message irc.PrivateMessage) {
	index := message.Time.Minute() % AverageMessageWindow
	m.messages.SetIndex(index, 1)
}
