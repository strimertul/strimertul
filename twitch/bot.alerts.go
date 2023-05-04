package twitch

import (
	"bytes"
	"math/rand"
	"sync"
	"text/template"
	"time"

	"github.com/Masterminds/sprig/v3"
	jsoniter "github.com/json-iterator/go"
	"github.com/nicklaw5/helix/v2"
	"go.uber.org/zap"

	"github.com/strimertul/strimertul/database"
)

const BotAlertsKey = "twitch/bot-modules/alerts/config"

type eventSubNotification struct {
	Subscription helix.EventSubSubscription `json:"subscription"`
	Challenge    string                     `json:"challenge"`
	Event        jsoniter.RawMessage        `json:"event" desc:"Event payload, as JSON object"`
}

type BotAlertsConfig struct {
	Follow struct {
		Enabled  bool     `json:"enabled" desc:"Enable chat message alert on follow"`
		Messages []string `json:"messages" desc:"List of message to write on follow, one at random will be picked"`
	} `json:"follow"`
	Subscription struct {
		Enabled    bool     `json:"enabled" desc:"Enable chat message alert on subscription"`
		Messages   []string `json:"messages" desc:"List of message to write on subscription, one at random will be picked"`
		Variations []struct {
			MinStreak *int     `json:"min_streak,omitempty"`
			IsGifted  *bool    `json:"is_gifted,omitempty"`
			Messages  []string `json:"messages"`
		} `json:"variations"`
	} `json:"subscription"`
	GiftSub struct {
		Enabled    bool     `json:"enabled" desc:"Enable chat message alert on gifted subscription"`
		Messages   []string `json:"messages" desc:"List of message to write on gifted subscription, one at random will be picked"`
		Variations []struct {
			MinCumulative *int     `json:"min_cumulative,omitempty"`
			IsAnonymous   *bool    `json:"is_anonymous,omitempty"`
			Messages      []string `json:"messages"`
		} `json:"variations"`
	} `json:"gift_sub"`
	Raid struct {
		Enabled    bool     `json:"enabled" desc:"Enable chat message alert on raid"`
		Messages   []string `json:"messages" desc:"List of message to write on raid, one at random will be picked"`
		Variations []struct {
			MinViewers *int     `json:"min_viewers,omitempty"`
			Messages   []string `json:"messages"`
		} `json:"variations"`
	} `json:"raid"`
	Cheer struct {
		Enabled    bool     `json:"enabled" desc:"Enable chat message alert on cheer"`
		Messages   []string `json:"messages" desc:"List of message to write on cheer, one at random will be picked"`
		Variations []struct {
			MinAmount *int     `json:"min_amount,omitempty"`
			Messages  []string `json:"messages"`
		} `json:"variations"`
	} `json:"cheer"`
}

type (
	templateCache    map[string]*template.Template
	templateCacheMap map[templateType]templateCache
)

type templateType string

const (
	templateTypeSubscription templateType = "subscription"
	templateTypeFollow       templateType = "follow"
	templateTypeRaid         templateType = "raid"
	templateTypeCheer        templateType = "cheer"
	templateTypeGift         templateType = "gift"
)

type BotAlertsModule struct {
	Config BotAlertsConfig

	bot       *Bot
	templates templateCacheMap

	cancelAlertSub       database.CancelFunc
	cancelTwitchEventSub database.CancelFunc

	pendingMux  sync.Mutex
	pendingSubs map[string]subMixedEvent
}

func SetupAlerts(bot *Bot) *BotAlertsModule {
	mod := &BotAlertsModule{
		bot:         bot,
		pendingMux:  sync.Mutex{},
		pendingSubs: make(map[string]subMixedEvent),
	}

	// Load config from database
	err := bot.api.db.GetJSON(BotAlertsKey, &mod.Config)
	if err != nil {
		bot.logger.Debug("Config load error", zap.Error(err))
		mod.Config = BotAlertsConfig{}
		// Save empty config
		err = bot.api.db.PutJSON(BotAlertsKey, mod.Config)
		if err != nil {
			bot.logger.Warn("Could not save default config for bot alerts", zap.Error(err))
		}
	}

	mod.compileTemplates()

	err, mod.cancelAlertSub = bot.api.db.SubscribeKey(BotAlertsKey, func(value string) {
		err := json.UnmarshalFromString(value, &mod.Config)
		if err != nil {
			bot.logger.Warn("Error loading alert config", zap.Error(err))
		} else {
			bot.logger.Info("Reloaded alert config")
		}
		mod.compileTemplates()
	})
	if err != nil {
		bot.logger.Error("Could not set-up bot alert reload subscription", zap.Error(err))
	}

	err, mod.cancelTwitchEventSub = bot.api.db.SubscribeKey(EventSubEventKey, func(value string) {
		var ev eventSubNotification
		err := json.UnmarshalFromString(value, &ev)
		if err != nil {
			bot.logger.Warn("Error parsing webhook payload", zap.Error(err))
			return
		}
		switch ev.Subscription.Type {
		case helix.EventSubTypeChannelFollow:
			// Only process if we care about follows
			if !mod.Config.Follow.Enabled {
				return
			}
			// Parse as a follow event
			var followEv helix.EventSubChannelFollowEvent
			err := json.Unmarshal(ev.Event, &followEv)
			if err != nil {
				bot.logger.Warn("Error parsing follow event", zap.Error(err))
				return
			}
			// Pick a random message
			messageID := rand.Intn(len(mod.Config.Follow.Messages))
			// Pick compiled template or fallback to plain text
			if tpl, ok := mod.templates[templateTypeFollow][mod.Config.Follow.Messages[messageID]]; ok {
				writeTemplate(bot, tpl, &followEv)
			} else {
				bot.WriteMessage(mod.Config.Follow.Messages[messageID])
			}
			// Compile template and send
		case helix.EventSubTypeChannelRaid:
			// Only process if we care about raids
			if !mod.Config.Raid.Enabled {
				return
			}
			// Parse as raid event
			var raidEv helix.EventSubChannelRaidEvent
			err := json.Unmarshal(ev.Event, &raidEv)
			if err != nil {
				bot.logger.Warn("Error parsing raid event", zap.Error(err))
				return
			}
			// Pick a random message from base set
			messageID := rand.Intn(len(mod.Config.Raid.Messages))
			tpl, ok := mod.templates[templateTypeRaid][mod.Config.Raid.Messages[messageID]]
			if !ok {
				// Broken template!
				mod.bot.WriteMessage(mod.Config.Raid.Messages[messageID])
				return
			}
			// If we have variations, loop through all the available variations and pick the one with the highest minimum viewers that are met
			if len(mod.Config.Raid.Variations) > 0 {
				minViewers := -1
				for _, variation := range mod.Config.Raid.Variations {
					if variation.MinViewers != nil && *variation.MinViewers > minViewers && raidEv.Viewers >= *variation.MinViewers {
						messageID = rand.Intn(len(variation.Messages))
						// Make sure the template is valid
						if temp, ok := mod.templates[templateTypeRaid][variation.Messages[messageID]]; ok {
							tpl = temp
							minViewers = *variation.MinViewers
						}
					}
				}
			}
			// Compile template and send
			writeTemplate(bot, tpl, &raidEv)
		case helix.EventSubTypeChannelCheer:
			// Only process if we care about bits
			if !mod.Config.Cheer.Enabled {
				return
			}
			// Parse as cheer event
			var cheerEv helix.EventSubChannelCheerEvent
			err := json.Unmarshal(ev.Event, &cheerEv)
			if err != nil {
				bot.logger.Warn("Error parsing cheer event", zap.Error(err))
				return
			}
			// Pick a random message from base set
			messageID := rand.Intn(len(mod.Config.Cheer.Messages))
			tpl, ok := mod.templates[templateTypeCheer][mod.Config.Cheer.Messages[messageID]]
			if !ok {
				// Broken template!
				mod.bot.WriteMessage(mod.Config.Raid.Messages[messageID])
				return
			}
			// If we have variations, loop through all the available variations and pick the one with the highest minimum amount that is met
			if len(mod.Config.Cheer.Variations) > 0 {
				minAmount := -1
				for _, variation := range mod.Config.Cheer.Variations {
					if variation.MinAmount != nil && *variation.MinAmount > minAmount && cheerEv.Bits >= *variation.MinAmount {
						messageID = rand.Intn(len(variation.Messages))
						// Make sure the template is valid
						if temp, ok := mod.templates[templateTypeCheer][variation.Messages[messageID]]; ok {
							tpl = temp
							minAmount = *variation.MinAmount
						}
					}
				}
			}
			// Compile template and send
			writeTemplate(bot, tpl, &cheerEv)
		case helix.EventSubTypeChannelSubscription:
			// Only process if we care about subscriptions
			if !mod.Config.Subscription.Enabled {
				return
			}
			// Parse as subscription event
			var subEv helix.EventSubChannelSubscribeEvent
			err := json.Unmarshal(ev.Event, &subEv)
			if err != nil {
				bot.logger.Warn("Error parsing new subscription event", zap.Error(err))
				return
			}
			mod.addMixedEvent(subEv)
		case helix.EventSubTypeChannelSubscriptionMessage:
			// Only process if we care about subscriptions
			if !mod.Config.Subscription.Enabled {
				return
			}
			// Parse as subscription event
			var subEv helix.EventSubChannelSubscriptionMessageEvent
			err := json.Unmarshal(ev.Event, &subEv)
			if err != nil {
				bot.logger.Warn("Error parsing returning subscription event", zap.Error(err))
				return
			}
			mod.addMixedEvent(subEv)
		case helix.EventSubTypeChannelSubscriptionGift:
			// Only process if we care about gifted subs
			if !mod.Config.GiftSub.Enabled {
				return
			}
			// Parse as gift event
			var giftEv helix.EventSubChannelSubscriptionGiftEvent
			err := json.Unmarshal(ev.Event, &giftEv)
			if err != nil {
				bot.logger.Warn("Error parsing subscription gifted event", zap.Error(err))
				return
			}
			// Pick a random message from base set
			messageID := rand.Intn(len(mod.Config.GiftSub.Messages))
			tpl, ok := mod.templates[templateTypeGift][mod.Config.GiftSub.Messages[messageID]]
			if !ok {
				// Broken template!
				mod.bot.WriteMessage(mod.Config.GiftSub.Messages[messageID])
				return
			}
			// If we have variations, loop through all the available variations and pick the one with the highest minimum cumulative total that are met
			if len(mod.Config.GiftSub.Variations) > 0 {
				if giftEv.IsAnonymous {
					for _, variation := range mod.Config.GiftSub.Variations {
						if variation.IsAnonymous != nil && *variation.IsAnonymous {
							messageID = rand.Intn(len(variation.Messages))
							// Make sure template is valid
							if temp, ok := mod.templates[templateTypeGift][variation.Messages[messageID]]; ok {
								tpl = temp
								break
							}
						}
					}
				} else if giftEv.CumulativeTotal > 0 {
					minCumulative := -1
					for _, variation := range mod.Config.GiftSub.Variations {
						if variation.MinCumulative != nil && *variation.MinCumulative > minCumulative && giftEv.CumulativeTotal >= *variation.MinCumulative {
							messageID = rand.Intn(len(variation.Messages))
							// Make sure the template is valid
							if temp, ok := mod.templates[templateTypeGift][variation.Messages[messageID]]; ok {
								tpl = temp
								minCumulative = *variation.MinCumulative
							}
						}
					}
				}
			}
			// Compile template and send
			writeTemplate(bot, tpl, &giftEv)
		}
	})
	if err != nil {
		bot.logger.Error("Could not setup twitch alert subscription", zap.Error(err))
	}

	bot.logger.Debug("Loaded bot alerts")

	return mod
}

// Subscriptions are handled with a slight delay as info come from different events and must be aggregated
func (m *BotAlertsModule) addMixedEvent(event any) {
	switch sub := event.(type) {
	case helix.EventSubChannelSubscribeEvent:
		m.pendingMux.Lock()
		defer m.pendingMux.Unlock()
		if ev, ok := m.pendingSubs[sub.UserID]; ok {
			// Already pending, add extra data
			ev.IsGift = sub.IsGift
			m.pendingSubs[sub.UserID] = ev
			return
		}
		m.pendingSubs[sub.UserID] = subMixedEvent{
			UserID:               sub.UserID,
			UserLogin:            sub.UserLogin,
			UserName:             sub.UserName,
			BroadcasterUserID:    sub.BroadcasterUserID,
			BroadcasterUserLogin: sub.BroadcasterUserLogin,
			BroadcasterUserName:  sub.BroadcasterUserName,
			Tier:                 sub.Tier,
			IsGift:               sub.IsGift,
		}
		go func() {
			// Wait a bit to make sure we aggregate all events
			time.Sleep(time.Second * 3)
			m.processPendingSub(sub.UserID)
		}()
	case helix.EventSubChannelSubscriptionMessageEvent:
		m.pendingMux.Lock()
		defer m.pendingMux.Unlock()
		if ev, ok := m.pendingSubs[sub.UserID]; ok {
			// Already pending, add extra data
			ev.StreakMonths = sub.StreakMonths
			ev.DurationMonths = sub.DurationMonths
			ev.CumulativeMonths = sub.CumulativeMonths
			ev.Message = sub.Message
			return
		}
		m.pendingSubs[sub.UserID] = subMixedEvent{
			UserID:               sub.UserID,
			UserLogin:            sub.UserLogin,
			UserName:             sub.UserName,
			BroadcasterUserID:    sub.BroadcasterUserID,
			BroadcasterUserLogin: sub.BroadcasterUserLogin,
			BroadcasterUserName:  sub.BroadcasterUserName,
			Tier:                 sub.Tier,
			StreakMonths:         sub.StreakMonths,
			DurationMonths:       sub.DurationMonths,
			CumulativeMonths:     sub.CumulativeMonths,
			Message:              sub.Message,
		}
		go func() {
			// Wait a bit to make sure we aggregate all events
			time.Sleep(time.Second * 3)
			m.processPendingSub(sub.UserID)
		}()
	}
}

func (m *BotAlertsModule) processPendingSub(user string) {
	m.pendingMux.Lock()
	defer m.pendingMux.Unlock()
	sub, ok := m.pendingSubs[user]
	defer delete(m.pendingSubs, user)
	if !ok {
		// Somehow it's gone? Return early
		return
	}

	// One last check in case config changed
	if !m.Config.Subscription.Enabled {
		return
	}

	// Assign random message
	messageID := rand.Intn(len(m.Config.Subscription.Messages))
	tpl, ok := m.templates[templateTypeSubscription][m.Config.Subscription.Messages[messageID]]

	// If template is broken, write it as is (soft fail, plus we raise attention I guess?)
	if !ok {
		m.bot.WriteMessage(m.Config.Subscription.Messages[messageID])
		return
	}

	// Check for variations, either by streak or gifted
	if sub.IsGift {
		for _, variation := range m.Config.Subscription.Variations {
			if variation.IsGifted != nil && *variation.IsGifted {
				// Get random template from variations
				messageID = rand.Intn(len(variation.Messages))
				// Make sure template is valid
				if temp, ok := m.templates[templateTypeSubscription][variation.Messages[messageID]]; ok {
					tpl = temp
					break
				}
			}
		}
	} else if sub.DurationMonths > 0 {
		minMonths := -1
		for _, variation := range m.Config.Subscription.Variations {
			if variation.MinStreak != nil && sub.DurationMonths >= *variation.MinStreak && sub.DurationMonths >= minMonths {
				// Get random template from variations
				messageID = rand.Intn(len(variation.Messages))
				// Make sure template is valid
				if temp, ok := m.templates[templateTypeSubscription][variation.Messages[messageID]]; ok {
					tpl = temp
					minMonths = *variation.MinStreak
				}
			}
		}
	}
	writeTemplate(m.bot, tpl, sub)
}

func (m *BotAlertsModule) compileTemplates() {
	m.templates = templateCacheMap{
		templateTypeSubscription: make(templateCache),
		templateTypeFollow:       make(templateCache),
		templateTypeRaid:         make(templateCache),
		templateTypeCheer:        make(templateCache),
		templateTypeGift:         make(templateCache),
	}

	for _, msg := range m.Config.Follow.Messages {
		m.addTemplate(m.templates[templateTypeFollow], msg)
	}
	for _, msg := range m.Config.Subscription.Messages {
		m.addTemplate(m.templates[templateTypeSubscription], msg)
	}
	for _, variation := range m.Config.Subscription.Variations {
		for _, msg := range variation.Messages {
			m.addTemplate(m.templates[templateTypeSubscription], msg)
		}
	}
	for _, msg := range m.Config.Raid.Messages {
		m.addTemplate(m.templates[templateTypeRaid], msg)
	}
	for _, variation := range m.Config.Raid.Variations {
		for _, msg := range variation.Messages {
			m.addTemplate(m.templates[templateTypeRaid], msg)
		}
	}
	for _, msg := range m.Config.Cheer.Messages {
		m.addTemplate(m.templates[templateTypeCheer], msg)
	}
	for _, variation := range m.Config.Cheer.Variations {
		for _, msg := range variation.Messages {
			m.addTemplate(m.templates[templateTypeCheer], msg)
		}
	}
	for _, msg := range m.Config.GiftSub.Messages {
		m.addTemplate(m.templates[templateTypeGift], msg)
	}
	for _, variation := range m.Config.GiftSub.Variations {
		for _, msg := range variation.Messages {
			m.addTemplate(m.templates[templateTypeGift], msg)
		}
	}
}

func (m *BotAlertsModule) addTemplate(templateList templateCache, msg string) {
	tpl, err := template.New("").Funcs(m.bot.customFunctions).Funcs(sprig.TxtFuncMap()).Parse(msg)
	if err != nil {
		m.bot.logger.Error("Error compiling alert template", zap.Error(err))
		return
	}
	templateList[msg] = tpl
}

func (m *BotAlertsModule) Close() {
	if m.cancelAlertSub != nil {
		m.cancelAlertSub()
	}
	if m.cancelTwitchEventSub != nil {
		m.cancelTwitchEventSub()
	}
}

// writeTemplate renders the template and sends the message to the channel
func writeTemplate(bot *Bot, tpl *template.Template, data interface{}) {
	var buf bytes.Buffer
	err := tpl.Execute(&buf, data)
	if err != nil {
		bot.logger.Error("Error executing template for bot alert", zap.Error(err))
		return
	}
	bot.WriteMessage(buf.String())
}

type subMixedEvent struct {
	UserID               string
	UserLogin            string
	UserName             string
	BroadcasterUserID    string
	BroadcasterUserLogin string
	BroadcasterUserName  string
	Tier                 string
	IsGift               bool
	CumulativeMonths     int
	StreakMonths         int
	DurationMonths       int
	Message              helix.EventSubMessage
}
