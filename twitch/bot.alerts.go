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

type subscriptionVariation struct {
	MinStreak *int     `json:"min_streak,omitempty" desc:"Minimum streak to get this message"`
	IsGifted  *bool    `json:"is_gifted,omitempty" desc:"If true, only gifted subscriptions will get these messages"`
	Messages  []string `json:"messages" desc:"List of message to write on subscription, one at random will be picked"`
}

type giftSubVariation struct {
	MinCumulative *int     `json:"min_cumulative,omitempty" desc:"Minimum cumulative amount to get this message"`
	IsAnonymous   *bool    `json:"is_anonymous,omitempty" desc:"If true, only anonymous gifts will get these messages"`
	Messages      []string `json:"messages" desc:"List of message to write on gifted subscription, one at random will be picked"`
}

type raidVariation struct {
	MinViewers *int     `json:"min_viewers,omitempty" desc:"Minimum number of viewers to get this message"`
	Messages   []string `json:"messages" desc:"List of message to write on raid, one at random will be picked"`
}

type cheerVariation struct {
	MinAmount *int     `json:"min_amount,omitempty" desc:"Minimum amount to get this message"`
	Messages  []string `json:"messages" desc:"List of message to write on cheer, one at random will be picked"`
}

type BotAlertsConfig struct {
	Follow struct {
		Enabled  bool     `json:"enabled" desc:"Enable chat message alert on follow"`
		Messages []string `json:"messages" desc:"List of message to write on follow, one at random will be picked"`
	} `json:"follow"`
	Subscription struct {
		Enabled    bool                    `json:"enabled" desc:"Enable chat message alert on subscription"`
		Messages   []string                `json:"messages" desc:"List of message to write on subscription, one at random will be picked"`
		Variations []subscriptionVariation `json:"variations"`
	} `json:"subscription"`
	GiftSub struct {
		Enabled    bool               `json:"enabled" desc:"Enable chat message alert on gifted subscription"`
		Messages   []string           `json:"messages" desc:"List of message to write on gifted subscription, one at random will be picked"`
		Variations []giftSubVariation `json:"variations"`
	} `json:"gift_sub"`
	Raid struct {
		Enabled    bool            `json:"enabled" desc:"Enable chat message alert on raid"`
		Messages   []string        `json:"messages" desc:"List of message to write on raid, one at random will be picked"`
		Variations []raidVariation `json:"variations"`
	} `json:"raid"`
	Cheer struct {
		Enabled    bool             `json:"enabled" desc:"Enable chat message alert on cheer"`
		Messages   []string         `json:"messages" desc:"List of message to write on cheer, one at random will be picked"`
		Variations []cheerVariation `json:"variations"`
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

	err, mod.cancelTwitchEventSub = bot.api.db.SubscribeKey(EventSubEventKey, mod.onEventSubEvent)
	if err != nil {
		bot.logger.Error("Could not setup twitch alert subscription", zap.Error(err))
	}

	bot.logger.Debug("Loaded bot alerts")

	return mod
}

func (m *BotAlertsModule) onEventSubEvent(value string) {
	var ev eventSubNotification
	err := json.UnmarshalFromString(value, &ev)
	if err != nil {
		m.bot.logger.Warn("Error parsing webhook payload", zap.Error(err))
		return
	}
	switch ev.Subscription.Type {
	case helix.EventSubTypeChannelFollow:
		// Only process if we care about follows
		if !m.Config.Follow.Enabled {
			return
		}
		// Parse as a follow event
		var followEv helix.EventSubChannelFollowEvent
		err := json.Unmarshal(ev.Event, &followEv)
		if err != nil {
			m.bot.logger.Warn("Error parsing follow event", zap.Error(err))
			return
		}
		// Pick a random message
		messageID := rand.Intn(len(m.Config.Follow.Messages))
		// Pick compiled template or fallback to plain text
		if tpl, ok := m.templates[templateTypeFollow][m.Config.Follow.Messages[messageID]]; ok {
			writeTemplate(m.bot, tpl, &followEv)
		} else {
			m.bot.WriteMessage(m.Config.Follow.Messages[messageID])
		}
		// Compile template and send
	case helix.EventSubTypeChannelRaid:
		// Only process if we care about raids
		if !m.Config.Raid.Enabled {
			return
		}
		// Parse as raid event
		var raidEv helix.EventSubChannelRaidEvent
		err := json.Unmarshal(ev.Event, &raidEv)
		if err != nil {
			m.bot.logger.Warn("Error parsing raid event", zap.Error(err))
			return
		}
		// Pick a random message from base set
		messageID := rand.Intn(len(m.Config.Raid.Messages))
		tpl, ok := m.templates[templateTypeRaid][m.Config.Raid.Messages[messageID]]
		if !ok {
			// Broken template!
			m.bot.WriteMessage(m.Config.Raid.Messages[messageID])
			return
		}
		// If we have variations, get the available variations and pick the one with the highest minimum viewers that are met
		if len(m.Config.Raid.Variations) > 0 {
			variation := getBestValidVariation(m.Config.Raid.Variations, func(variation raidVariation) int {
				if variation.MinViewers != nil && raidEv.Viewers >= *variation.MinViewers {
					return *variation.MinViewers
				}
				return 0
			})
			tpl = m.replaceWithVariation(tpl, templateTypeRaid, variation.Messages)
		}
		// Compile template and send
		writeTemplate(m.bot, tpl, &raidEv)
	case helix.EventSubTypeChannelCheer:
		// Only process if we care about bits
		if !m.Config.Cheer.Enabled {
			return
		}
		// Parse as cheer event
		var cheerEv helix.EventSubChannelCheerEvent
		err := json.Unmarshal(ev.Event, &cheerEv)
		if err != nil {
			m.bot.logger.Warn("Error parsing cheer event", zap.Error(err))
			return
		}
		// Pick a random message from base set
		messageID := rand.Intn(len(m.Config.Cheer.Messages))
		tpl, ok := m.templates[templateTypeCheer][m.Config.Cheer.Messages[messageID]]
		if !ok {
			// Broken template!
			m.bot.WriteMessage(m.Config.Raid.Messages[messageID])
			return
		}
		// If we have variations, get the available variations and pick the one with the highest minimum amount that is met
		if len(m.Config.Cheer.Variations) > 0 {
			variation := getBestValidVariation(m.Config.Cheer.Variations, func(variation cheerVariation) int {
				if variation.MinAmount != nil && cheerEv.Bits >= *variation.MinAmount {
					return *variation.MinAmount
				}
				return 0
			})
			tpl = m.replaceWithVariation(tpl, templateTypeCheer, variation.Messages)
		}
		// Compile template and send
		writeTemplate(m.bot, tpl, &cheerEv)
	case helix.EventSubTypeChannelSubscription:
		// Only process if we care about subscriptions
		if !m.Config.Subscription.Enabled {
			return
		}
		// Parse as subscription event
		var subEv helix.EventSubChannelSubscribeEvent
		err := json.Unmarshal(ev.Event, &subEv)
		if err != nil {
			m.bot.logger.Warn("Error parsing new subscription event", zap.Error(err))
			return
		}
		m.addMixedEvent(subEv)
	case helix.EventSubTypeChannelSubscriptionMessage:
		// Only process if we care about subscriptions
		if !m.Config.Subscription.Enabled {
			return
		}
		// Parse as subscription event
		var subEv helix.EventSubChannelSubscriptionMessageEvent
		err := json.Unmarshal(ev.Event, &subEv)
		if err != nil {
			m.bot.logger.Warn("Error parsing returning subscription event", zap.Error(err))
			return
		}
		m.addMixedEvent(subEv)
	case helix.EventSubTypeChannelSubscriptionGift:
		// Only process if we care about gifted subs
		if !m.Config.GiftSub.Enabled {
			return
		}
		// Parse as gift event
		var giftEv helix.EventSubChannelSubscriptionGiftEvent
		err := json.Unmarshal(ev.Event, &giftEv)
		if err != nil {
			m.bot.logger.Warn("Error parsing subscription gifted event", zap.Error(err))
			return
		}
		// Pick a random message from base set
		messageID := rand.Intn(len(m.Config.GiftSub.Messages))
		tpl, ok := m.templates[templateTypeGift][m.Config.GiftSub.Messages[messageID]]
		if !ok {
			// Broken template!
			m.bot.WriteMessage(m.Config.GiftSub.Messages[messageID])
			return
		}
		// If we have variations, loop through all the available variations and pick the one with the highest minimum cumulative total that are met
		if len(m.Config.GiftSub.Variations) > 0 {
			if giftEv.IsAnonymous {
				variation := getBestValidVariation(m.Config.GiftSub.Variations, func(variation giftSubVariation) int {
					if variation.IsAnonymous != nil && *variation.IsAnonymous {
						return 1
					}
					return 0
				})
				tpl = m.replaceWithVariation(tpl, templateTypeGift, variation.Messages)
			} else if giftEv.CumulativeTotal > 0 {
				variation := getBestValidVariation(m.Config.GiftSub.Variations, func(variation giftSubVariation) int {
					if variation.MinCumulative != nil && *variation.MinCumulative > giftEv.CumulativeTotal {
						return *variation.MinCumulative
					}
					return 0
				})
				tpl = m.replaceWithVariation(tpl, templateTypeGift, variation.Messages)
			}
		}
		// Compile template and send
		writeTemplate(m.bot, tpl, &giftEv)
	}
}

func (m *BotAlertsModule) replaceWithVariation(tpl *template.Template, templateType templateType, messages []string) *template.Template {
	if messages != nil {
		messageID := rand.Intn(len(messages))
		// Make sure the template is valid
		if temp, ok := m.templates[templateType][messages[messageID]]; ok {
			return temp
		}
	}
	return tpl
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
		variation := getBestValidVariation(m.Config.Subscription.Variations, func(variation subscriptionVariation) int {
			if variation.IsGifted != nil && *variation.IsGifted {
				return 1
			}
			return 0
		})
		tpl = m.replaceWithVariation(tpl, templateTypeSubscription, variation.Messages)
	} else if sub.DurationMonths > 0 {
		// Get variation with the highest minimum streak that's met
		variation := getBestValidVariation(m.Config.Subscription.Variations, func(variation subscriptionVariation) int {
			if variation.MinStreak != nil && sub.DurationMonths >= *variation.MinStreak {
				return sub.DurationMonths
			}
			return 0
		})
		tpl = m.replaceWithVariation(tpl, templateTypeSubscription, variation.Messages)
	}
	writeTemplate(m.bot, tpl, sub)
}

// For variations, some variations are better than others, this function returns the best one
// by using a provided score function. The score is 0 or less if the variation is not valid,
// and 1 or more if it is valid. The variation with the highest score is returned.
func getBestValidVariation[T any](variations []T, filterFunc func(T) int) T {
	var best T
	var bestScore int
	for _, variation := range variations {
		score := filterFunc(variation)
		if score > bestScore {
			best = variation
			bestScore = score
		}
	}
	return best
}

func (m *BotAlertsModule) compileTemplates() {
	// Reset caches
	m.templates = templateCacheMap{
		templateTypeSubscription: make(templateCache),
		templateTypeFollow:       make(templateCache),
		templateTypeRaid:         make(templateCache),
		templateTypeCheer:        make(templateCache),
		templateTypeGift:         make(templateCache),
	}

	// Add base templates
	m.addTemplatesForType(templateTypeFollow, m.Config.Follow.Messages)
	m.addTemplatesForType(templateTypeSubscription, m.Config.Subscription.Messages)
	m.addTemplatesForType(templateTypeRaid, m.Config.Raid.Messages)
	m.addTemplatesForType(templateTypeCheer, m.Config.Cheer.Messages)
	m.addTemplatesForType(templateTypeGift, m.Config.GiftSub.Messages)

	// Add variations
	for _, variation := range m.Config.Subscription.Variations {
		m.addTemplatesForType(templateTypeSubscription, variation.Messages)
	}
	for _, variation := range m.Config.Raid.Variations {
		m.addTemplatesForType(templateTypeRaid, variation.Messages)
	}
	for _, variation := range m.Config.Cheer.Variations {
		m.addTemplatesForType(templateTypeCheer, variation.Messages)
	}
	for _, variation := range m.Config.GiftSub.Variations {
		m.addTemplatesForType(templateTypeGift, variation.Messages)
	}
}

func (m *BotAlertsModule) addTemplate(templateList templateCache, message string) {
	tpl, err := template.New("").Funcs(m.bot.customFunctions).Funcs(sprig.TxtFuncMap()).Parse(message)
	if err != nil {
		m.bot.logger.Error("Error compiling alert template", zap.Error(err))
		return
	}
	templateList[message] = tpl
}

func (m *BotAlertsModule) addTemplatesForType(templateList templateType, messages []string) {
	for _, message := range messages {
		m.addTemplate(m.templates[templateList], message)
	}
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
