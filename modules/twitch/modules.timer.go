package twitch

import (
	"math/rand"
	"sync"
	"time"

	"go.uber.org/zap"

	irc "github.com/gempir/go-twitch-irc/v3"
	jsoniter "github.com/json-iterator/go"
)

const BotTimersKey = "twitch/bot-modules/timers/config"

type BotTimersConfig struct {
	Timers map[string]BotTimer `json:"timers"`
}

type BotTimer struct {
	Enabled             bool     `json:"enabled"`               // Whether the timer is enabled
	Name                string   `json:"name"`                  // Timer name (must be unique)
	MinimumChatActivity int      `json:"minimum_chat_activity"` // Minimum chat messages in the last 5 minutes
	MinimumDelay        int      `json:"minimum_delay"`         // In seconds
	Messages            []string `json:"messages"`              // Messages to write (randomly chosen)
}

const AverageMessageWindow = 5

type BotTimerModule struct {
	Config BotTimersConfig

	lastTrigger map[string]time.Time
	bot         *Bot
	messages    [AverageMessageWindow]int
	mu          sync.Mutex
	startTime   time.Time
}

func SetupTimers(bot *Bot) *BotTimerModule {
	mod := &BotTimerModule{
		bot:         bot,
		startTime:   time.Now().Round(time.Minute),
		lastTrigger: make(map[string]time.Time),
		mu:          sync.Mutex{},
	}

	// Load config from database
	err := bot.api.db.GetJSON(BotTimersKey, &mod.Config)
	if err != nil {
		bot.logger.Debug("config load error", zap.Error(err))
		mod.Config = BotTimersConfig{
			Timers: make(map[string]BotTimer),
		}
		// Save empty config
		bot.api.db.PutJSON(BotTimersKey, mod.Config)
	}

	go bot.api.db.Subscribe(func(key, value string) {
		if key == BotTimersKey {
			err := jsoniter.ConfigFastest.UnmarshalFromString(value, &mod.Config)
			if err != nil {
				bot.logger.Debug("error reloading timer config", zap.Error(err))
			} else {
				bot.logger.Info("reloaded timer config")
			}
		}
	}, BotTimersKey)

	bot.logger.Debug("loaded timers", zap.Int("timers", len(mod.Config.Timers)))

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

		err := m.bot.api.db.PutJSON(ChatActivityKey, m.messages)
		if err != nil {
			m.bot.logger.Warn("error saving chat activity", zap.Error(err))
		}

		// Calculate activity
		activity := m.currentChatActivity()

		// Reset timer
		func() {
			index := time.Now().Minute() % AverageMessageWindow
			m.mu.Lock()
			defer m.mu.Unlock()
			m.messages[index] = 0
		}()

		// Run timers
		func() {
			now := time.Now()
			m.mu.Lock()
			defer m.mu.Unlock()
			for name, timer := range m.Config.Timers {
				// Must be enabled
				if !timer.Enabled {
					continue
				}
				// Check if enough time has passed
				lastTriggeredTime, ok := m.lastTrigger[name]
				if !ok {
					// If it's the first time we're checking it, start the cooldown
					lastTriggeredTime = time.Now()
					m.lastTrigger[name] = lastTriggeredTime
				}
				minDelay := timer.MinimumDelay
				if minDelay < 60 {
					minDelay = 60
				}
				if now.Sub(lastTriggeredTime) < time.Duration(minDelay)*time.Second {
					continue
				}
				// Make sure chat activity is high enough
				if activity < timer.MinimumChatActivity {
					continue
				}

				// Pick a random message
				message := timer.Messages[rand.Intn(len(timer.Messages))]

				// Write message to chat
				m.bot.WriteMessage(message)

				// Update last trigger
				m.lastTrigger[name] = now
			}
		}()
	}
}

func (m *BotTimerModule) currentChatActivity() int {
	total := 0
	for _, v := range m.messages {
		total += v
	}
	return total
}

func (m *BotTimerModule) OnMessage(message irc.PrivateMessage) {
	index := message.Time.Minute() % AverageMessageWindow
	m.mu.Lock()
	defer m.mu.Unlock()
	m.messages[index] += 1
}
