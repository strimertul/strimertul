package twitch

import (
	"bytes"
	"context"
	"encoding/json"
	"math/rand"
	"sync"
	"text/template"
	"time"

	"go.uber.org/zap"

	"github.com/Masterminds/sprig/v3"
	jsoniter "github.com/json-iterator/go"
	"github.com/nicklaw5/helix/v2"

	"github.com/strimertul/strimertul/modules/database"
)

const BotAlertsKey = "twitch/bot-modules/alerts/config"

type eventSubNotification struct {
	Subscription helix.EventSubSubscription `json:"subscription"`
	Challenge    string                     `json:"challenge"`
	Event        json.RawMessage            `json:"event"`
}

type BotAlertsConfig struct {
	Follow struct {
		Enabled  bool     `json:"enabled"`
		Messages []string `json:"messages"`
	} `json:"follow"`
	Subscription struct {
		Enabled    bool     `json:"enabled"`
		Messages   []string `json:"messages"`
		Variations []struct {
			MinStreak *int     `json:"min_streak,omitempty"`
			IsGifted  *bool    `json:"is_gifted,omitempty"`
			Messages  []string `json:"messages"`
		} `json:"variations"`
	} `json:"subscription"`
	GiftSub struct {
		Enabled    bool     `json:"enabled"`
		Messages   []string `json:"messages"`
		Variations []struct {
			MinCumulative *int     `json:"min_cumulative,omitempty"`
			IsAnonymous   *bool    `json:"is_anonymous,omitempty"`
			Messages      []string `json:"messages"`
		} `json:"variations"`
	} `json:"gift_sub"`
	Raid struct {
		Enabled    bool     `json:"enabled"`
		Messages   []string `json:"messages"`
		Variations []struct {
			MinViewers *int     `json:"min_viewers,omitempty"`
			Messages   []string `json:"messages"`
		} `json:"variations"`
	} `json:"raid"`
	Cheer struct {
		Enabled    bool     `json:"enabled"`
		Messages   []string `json:"messages"`
		Variations []struct {
			MinAmount *int     `json:"min_amount,omitempty"`
			Messages  []string `json:"messages"`
		} `json:"variations"`
	} `json:"cheer"`
}

type templateCache struct {
	follow struct {
		messages map[int]*template.Template
	}
	subscription struct {
		messages   map[int]*template.Template
		variations map[int]map[int]*template.Template
	}
	gift struct {
		messages   map[int]*template.Template
		variations map[int]map[int]*template.Template
	}
	raid struct {
		messages   map[int]*template.Template
		variations map[int]map[int]*template.Template
	}
	cheer struct {
		messages   map[int]*template.Template
		variations map[int]map[int]*template.Template
	}
}

type BotAlertsModule struct {
	Config BotAlertsConfig

	bot       *Bot
	mu        sync.Mutex
	templates templateCache
}

func SetupAlerts(bot *Bot) *BotAlertsModule {
	mod := &BotAlertsModule{
		bot:       bot,
		mu:        sync.Mutex{},
		templates: templateCache{},
	}

	// Load config from database
	err := bot.api.db.GetJSON(BotAlertsKey, &mod.Config)
	if err != nil {
		bot.logger.Debug("config load error", zap.Error(err))
		mod.Config = BotAlertsConfig{}
		// Save empty config
		bot.api.db.PutJSON(BotAlertsKey, mod.Config)
	}

	mod.compileTemplates()

	go bot.api.db.Subscribe(context.Background(), func(changed []database.ModifiedKV) error {
		for _, kv := range changed {
			if kv.Key == BotAlertsKey {
				err := jsoniter.ConfigFastest.Unmarshal(kv.Data, &mod.Config)
				if err != nil {
					bot.logger.Debug("error reloading timer config", zap.Error(err))
				} else {
					bot.logger.Info("reloaded alert config")
				}
				mod.compileTemplates()
			}
		}
		return nil
	}, BotAlertsKey)

	// Subscriptions are handled with a slight delay as info come from different events and must be aggregated
	pendingSubs := make(map[string]subMixedEvent)
	pendingMux := sync.Mutex{}
	processPendingSub := func(user string) {
		pendingMux.Lock()
		defer pendingMux.Unlock()
		sub, ok := pendingSubs[user]
		defer delete(pendingSubs, user)
		if !ok {
			// Somehow it's gone? Return early
			return
		}
		// One last check in case config changed
		if !mod.Config.Subscription.Enabled {
			return
		}
		// Assign random message
		messageID := rand.Intn(len(mod.Config.Subscription.Messages))
		tpl, ok := mod.templates.subscription.messages[messageID]
		// If template is broken, write it as is (soft fail, plus we raise attention I guess?)
		if !ok {
			mod.bot.WriteMessage(mod.Config.Subscription.Messages[messageID])
			return
		}
		// Check for variations, either by streak or gifted
		if sub.IsGift {
			for variationIndex, variation := range mod.Config.Subscription.Variations {
				if variation.IsGifted != nil && *variation.IsGifted {
					// Make sure template is valid
					if varTemplates, ok := mod.templates.subscription.variations[variationIndex]; ok {
						if temp, ok := varTemplates[messageID]; ok {
							tpl = temp
							break
						}
					}
				}
			}
		} else if sub.DurationMonths > 0 {
			minMonths := -1
			for variationIndex, variation := range mod.Config.Subscription.Variations {
				if variation.MinStreak != nil && sub.DurationMonths >= *variation.MinStreak && sub.DurationMonths >= minMonths {
					// Make sure template is valid
					if varTemplates, ok := mod.templates.subscription.variations[variationIndex]; ok {
						if temp, ok := varTemplates[messageID]; ok {
							tpl = temp
							minMonths = *variation.MinStreak
						}
					}
				}
			}
		}
		writeTemplate(bot, tpl, sub)
	}
	addPendingSub := func(ev interface{}) {
		switch sub := ev.(type) {
		case helix.EventSubChannelSubscribeEvent:
			pendingMux.Lock()
			defer pendingMux.Unlock()
			if ev, ok := pendingSubs[sub.UserID]; ok {
				// Already pending, add extra data
				ev.IsGift = sub.IsGift
				pendingSubs[sub.UserID] = ev
				return
			}
			pendingSubs[sub.UserID] = subMixedEvent{
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
				processPendingSub(sub.UserID)
			}()
		case helix.EventSubChannelSubscriptionMessageEvent:
			pendingMux.Lock()
			defer pendingMux.Unlock()
			if ev, ok := pendingSubs[sub.UserID]; ok {
				// Already pending, add extra data
				ev.StreakMonths = sub.StreakMonths
				ev.DurationMonths = sub.DurationMonths
				ev.CumulativeMonths = sub.CumulativeMonths
				ev.Message = sub.Message
				return
			}
			pendingSubs[sub.UserID] = subMixedEvent{
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
				processPendingSub(sub.UserID)
			}()
		}
	}

	go bot.api.db.Subscribe(context.Background(), func(changed []database.ModifiedKV) error {
		for _, kv := range changed {
			if kv.Key == "stulbe/ev/webhook" {
				var ev eventSubNotification
				err := jsoniter.ConfigFastest.Unmarshal(kv.Data, &ev)
				if err != nil {
					bot.logger.Debug("error parsing webhook payload", zap.Error(err))
					continue
				}
				switch ev.Subscription.Type {
				case helix.EventSubTypeChannelFollow:
					// Only process if we care about follows
					if !mod.Config.Follow.Enabled {
						continue
					}
					// Parse as follow event
					var followEv helix.EventSubChannelFollowEvent
					err := jsoniter.ConfigFastest.Unmarshal(ev.Event, &followEv)
					if err != nil {
						bot.logger.Debug("error parsing follow event", zap.Error(err))
						continue
					}
					// Pick a random message
					messageID := rand.Intn(len(mod.Config.Follow.Messages))
					// Pick compiled template or fallback to plain text
					if tpl, ok := mod.templates.follow.messages[messageID]; ok {
						writeTemplate(bot, tpl, &followEv)
					} else {
						bot.WriteMessage(mod.Config.Follow.Messages[messageID])
					}
					// Compile template and send
				case helix.EventSubTypeChannelRaid:
					// Only process if we care about raids
					if !mod.Config.Raid.Enabled {
						continue
					}
					// Parse as raid event
					var raidEv helix.EventSubChannelRaidEvent
					err := jsoniter.ConfigFastest.Unmarshal(ev.Event, &raidEv)
					if err != nil {
						bot.logger.Debug("error parsing raid event", zap.Error(err))
						continue
					}
					// Pick a random message from base set
					messageID := rand.Intn(len(mod.Config.Raid.Messages))
					tpl, ok := mod.templates.raid.messages[messageID]
					if !ok {
						// Broken template!
						mod.bot.WriteMessage(mod.Config.Raid.Messages[messageID])
						continue
					}
					// If we have variations, loop through all the available variations and pick the one with the highest minimum viewers that are met
					if len(mod.Config.Raid.Variations) > 0 {
						minViewers := -1
						for variationIndex, variation := range mod.Config.Raid.Variations {
							if variation.MinViewers != nil && *variation.MinViewers > minViewers && raidEv.Viewers >= *variation.MinViewers {
								// Make sure the template is valid
								if varTemplates, ok := mod.templates.raid.variations[variationIndex]; ok {
									if temp, ok := varTemplates[messageID]; ok {
										tpl = temp
										minViewers = *variation.MinViewers
									}
								}
							}
						}
					}
					// Compile template and send
					writeTemplate(bot, tpl, &raidEv)
				case helix.EventSubTypeChannelCheer:
					// Only process if we care about bits
					if !mod.Config.Cheer.Enabled {
						continue
					}
					// Parse as cheer event
					var cheerEv helix.EventSubChannelCheerEvent
					err := jsoniter.ConfigFastest.Unmarshal(ev.Event, &cheerEv)
					if err != nil {
						bot.logger.Debug("error parsing cheer event", zap.Error(err))
						continue
					}
					// Pick a random message from base set
					messageID := rand.Intn(len(mod.Config.Cheer.Messages))
					tpl, ok := mod.templates.cheer.messages[messageID]
					if !ok {
						// Broken template!
						mod.bot.WriteMessage(mod.Config.Raid.Messages[messageID])
						continue
					}
					// If we have variations, loop through all the available variations and pick the one with the highest minimum amount that is met
					if len(mod.Config.Cheer.Variations) > 0 {
						minAmount := -1
						for variationIndex, variation := range mod.Config.Cheer.Variations {
							if variation.MinAmount != nil && *variation.MinAmount > minAmount && cheerEv.Bits >= *variation.MinAmount {
								// Make sure the template is valid
								if varTemplates, ok := mod.templates.cheer.variations[variationIndex]; ok {
									if temp, ok := varTemplates[messageID]; ok {
										tpl = temp
										minAmount = *variation.MinAmount
									}
								}
							}
						}
					}
					// Compile template and send
					writeTemplate(bot, tpl, &cheerEv)
				case helix.EventSubTypeChannelSubscription:
					// Only process if we care about subscriptions
					if !mod.Config.Subscription.Enabled {
						continue
					}
					// Parse as subscription event
					var subEv helix.EventSubChannelSubscribeEvent
					err := jsoniter.ConfigFastest.Unmarshal(ev.Event, &subEv)
					if err != nil {
						bot.logger.Debug("error parsing sub event", zap.Error(err))
						continue
					}
					addPendingSub(subEv)
				case helix.EventSubTypeChannelSubscriptionMessage:
					// Only process if we care about subscriptions
					if !mod.Config.Subscription.Enabled {
						continue
					}
					// Parse as subscription event
					var subEv helix.EventSubChannelSubscriptionMessageEvent
					err := jsoniter.ConfigFastest.Unmarshal(ev.Event, &subEv)
					if err != nil {
						bot.logger.Debug("error parsing sub event", zap.Error(err))
						continue
					}
					addPendingSub(subEv)
				case helix.EventSubTypeChannelSubscriptionGift:
					// Only process if we care about gifted subs
					if !mod.Config.GiftSub.Enabled {
						continue
					}
					// Parse as gift event
					var giftEv helix.EventSubChannelSubscriptionGiftEvent
					err := jsoniter.ConfigFastest.Unmarshal(ev.Event, &giftEv)
					if err != nil {
						bot.logger.Debug("error parsing raid event", zap.Error(err))
						continue
					}
					// Pick a random message from base set
					messageID := rand.Intn(len(mod.Config.GiftSub.Messages))
					tpl, ok := mod.templates.gift.messages[messageID]
					if !ok {
						// Broken template!
						mod.bot.WriteMessage(mod.Config.GiftSub.Messages[messageID])
						continue
					}
					// If we have variations, loop through all the available variations and pick the one with the highest minimum cumulative total that are met
					if len(mod.Config.GiftSub.Variations) > 0 {
						if giftEv.IsAnonymous {
							for variationIndex, variation := range mod.Config.GiftSub.Variations {
								if variation.IsAnonymous != nil && *variation.IsAnonymous {
									// Make sure template is valid
									if varTemplates, ok := mod.templates.gift.variations[variationIndex]; ok {
										if temp, ok := varTemplates[messageID]; ok {
											tpl = temp
											break
										}
									}
								}
							}
						} else if giftEv.CumulativeTotal > 0 {
							minCumulative := -1
							for variationIndex, variation := range mod.Config.GiftSub.Variations {
								if variation.MinCumulative != nil && *variation.MinCumulative > minCumulative && giftEv.CumulativeTotal >= *variation.MinCumulative {
									// Make sure the template is valid
									if varTemplates, ok := mod.templates.gift.variations[variationIndex]; ok {
										if temp, ok := varTemplates[messageID]; ok {
											tpl = temp
											minCumulative = *variation.MinCumulative
										}
									}
								}
							}
						}
					}
					// Compile template and send
					writeTemplate(bot, tpl, &giftEv)
				}
			}
		}
		return nil
	}, "stulbe/ev/webhook")

	bot.logger.Debug("loaded bot alerts")

	return mod
}

func (m *BotAlertsModule) compileTemplates() {
	for index, msg := range m.Config.Follow.Messages {
		m.templates.follow.messages = make(map[int]*template.Template)
		m.addTemplate(m.templates.follow.messages, index, msg)
	}
	for index, msg := range m.Config.Subscription.Messages {
		m.templates.subscription.messages = make(map[int]*template.Template)
		m.addTemplate(m.templates.subscription.messages, index, msg)
	}
	for varIndex, variation := range m.Config.Subscription.Variations {
		m.templates.subscription.variations = make(map[int]map[int]*template.Template)
		for index, msg := range variation.Messages {
			m.templates.subscription.variations[varIndex] = make(map[int]*template.Template)
			m.addTemplate(m.templates.subscription.variations[varIndex], index, msg)
		}
	}
	for index, msg := range m.Config.Raid.Messages {
		m.templates.raid.messages = make(map[int]*template.Template)
		m.addTemplate(m.templates.raid.messages, index, msg)
	}
	for varIndex, variation := range m.Config.Raid.Variations {
		m.templates.raid.variations = make(map[int]map[int]*template.Template)
		for index, msg := range variation.Messages {
			m.templates.raid.variations[varIndex] = make(map[int]*template.Template)
			m.addTemplate(m.templates.raid.variations[varIndex], index, msg)
		}
	}
	for index, msg := range m.Config.Cheer.Messages {
		m.templates.cheer.messages = make(map[int]*template.Template)
		m.addTemplate(m.templates.cheer.messages, index, msg)
	}
	for varIndex, variation := range m.Config.Cheer.Variations {
		m.templates.cheer.variations = make(map[int]map[int]*template.Template)
		for index, msg := range variation.Messages {
			m.templates.cheer.variations[varIndex] = make(map[int]*template.Template)
			m.addTemplate(m.templates.cheer.variations[varIndex], index, msg)
		}
	}
	for index, msg := range m.Config.GiftSub.Messages {
		m.templates.gift.messages = make(map[int]*template.Template)
		m.addTemplate(m.templates.gift.messages, index, msg)
	}
	for varIndex, variation := range m.Config.GiftSub.Variations {
		m.templates.gift.variations = make(map[int]map[int]*template.Template)
		for index, msg := range variation.Messages {
			m.templates.gift.variations[varIndex] = make(map[int]*template.Template)
			m.addTemplate(m.templates.gift.variations[varIndex], index, msg)
		}
	}
}

func (m *BotAlertsModule) addTemplate(templateList map[int]*template.Template, id int, msg string) {
	tpl, err := template.New("").Funcs(m.bot.customFunctions).Funcs(sprig.TxtFuncMap()).Parse(msg)
	if err != nil {
		m.bot.logger.Error("error compiling template", zap.Error(err))
		return
	}
	templateList[id] = tpl
}

// writeTemplate renders the template and sends the message to the channel
func writeTemplate(bot *Bot, tpl *template.Template, data interface{}) {
	var buf bytes.Buffer
	err := tpl.Execute(&buf, data)
	if err != nil {
		bot.logger.Error("error executing template for alert", zap.Error(err))
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
