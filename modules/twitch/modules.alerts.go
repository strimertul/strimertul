package twitch

import (
	"bytes"
	"context"
	"encoding/json"
	"math/rand"
	"sync"
	"text/template"
	"time"

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

type BotAlertsModule struct {
	Config BotAlertsConfig

	bot *Bot
	mu  sync.Mutex
}

func SetupAlerts(bot *Bot) *BotAlertsModule {
	mod := &BotAlertsModule{
		bot: bot,
	}

	// Load config from database
	err := bot.api.db.GetJSON(BotAlertsKey, &mod.Config)
	if err != nil {
		bot.logger.WithError(err).Debug("config load error")
		mod.Config = BotAlertsConfig{}
		// Save empty config
		bot.api.db.PutJSON(BotAlertsKey, mod.Config)
	}

	go bot.api.db.Subscribe(context.Background(), func(changed []database.ModifiedKV) error {
		for _, kv := range changed {
			if kv.Key == BotAlertsKey {
				err := jsoniter.ConfigFastest.Unmarshal(kv.Data, &mod.Config)
				if err != nil {
					bot.logger.WithError(err).Debug("error reloading timer config")
				} else {
					bot.logger.Info("reloaded timer config")
				}
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
		msg := mod.Config.Subscription.Messages[rand.Intn(len(mod.Config.Subscription.Messages))]
		// Check for variations, either by streak or gifted
		if sub.IsGift {
			for _, variation := range mod.Config.Subscription.Variations {
				if variation.IsGifted != nil && *variation.IsGifted {
					msg = variation.Messages[rand.Intn(len(variation.Messages))]
					break
				}
			}
		} else if sub.DurationMonths > 0 {
			minMonths := -1
			for _, variation := range mod.Config.Subscription.Variations {
				if variation.MinStreak != nil && sub.DurationMonths >= *variation.MinStreak && sub.DurationMonths >= minMonths {
					msg = variation.Messages[rand.Intn(len(variation.Messages))]
					minMonths = *variation.MinStreak
					break
				}
			}
		}
		writeTemplate(bot, msg, sub)
	}
	addPendingSub := func(ev interface{}) {
		switch ev.(type) {
		case helix.EventSubChannelSubscribeEvent:
			sub := ev.(helix.EventSubChannelSubscribeEvent)
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
			sub := ev.(helix.EventSubChannelSubscriptionMessageEvent)
			pendingMux.Lock()
			defer pendingMux.Unlock()
			if ev, ok := pendingSubs[sub.UserID]; ok {
				// Already pending, add extra data
				ev.StreakMonths = sub.StreakMonths
				ev.DurationMonths = sub.DurationMonths
				ev.CumulativeTotal = sub.CumulativeTotal
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
				CumulativeTotal:      sub.CumulativeTotal,
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
					bot.logger.WithError(err).Debug("error parsing webhook payload")
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
						bot.logger.WithError(err).Debug("error parsing follow event")
						continue
					}
					// Pick a random message
					msg := mod.Config.Follow.Messages[rand.Intn(len(mod.Config.Follow.Messages))]
					// Compile template and send
					writeTemplate(bot, msg, &followEv)
				case helix.EventSubTypeChannelRaid:
					// Only process if we care about raids
					if !mod.Config.Raid.Enabled {
						continue
					}
					// Parse as raid event
					var raidEv helix.EventSubChannelRaidEvent
					err := jsoniter.ConfigFastest.Unmarshal(ev.Event, &raidEv)
					if err != nil {
						bot.logger.WithError(err).Debug("error parsing raid event")
						continue
					}
					// Pick a random message from base set
					msg := mod.Config.Raid.Messages[rand.Intn(len(mod.Config.Raid.Messages))]
					// If we have variations, loop through all the available variations and pick the one with the highest minimum viewers that are met
					if len(mod.Config.Raid.Variations) > 0 {
						minViewers := -1
						for _, variation := range mod.Config.Raid.Variations {
							if variation.MinViewers != nil && *variation.MinViewers > minViewers && raidEv.Viewers >= *variation.MinViewers {
								msg = variation.Messages[rand.Intn(len(variation.Messages))]
								minViewers = *variation.MinViewers
							}
						}
					}
					// Compile template and send
					writeTemplate(bot, msg, &raidEv)
				case helix.EventSubTypeChannelCheer:
					// Only process if we care about bits
					if !mod.Config.Cheer.Enabled {
						continue
					}
					// Parse as cheer event
					var cheerEv helix.EventSubChannelCheerEvent
					err := jsoniter.ConfigFastest.Unmarshal(ev.Event, &cheerEv)
					if err != nil {
						bot.logger.WithError(err).Debug("error parsing cheer event")
						continue
					}
					// Pick a random message from base set
					msg := mod.Config.Cheer.Messages[rand.Intn(len(mod.Config.Cheer.Messages))]
					// If we have variations, loop through all the available variations and pick the one with the highest minimum amount that is met
					if len(mod.Config.Cheer.Variations) > 0 {
						minAmount := -1
						for _, variation := range mod.Config.Cheer.Variations {
							if variation.MinAmount != nil && *variation.MinAmount > minAmount && cheerEv.Bits >= *variation.MinAmount {
								msg = variation.Messages[rand.Intn(len(variation.Messages))]
								minAmount = *variation.MinAmount
							}
						}
					}
					// Compile template and send
					writeTemplate(bot, msg, &cheerEv)
				case helix.EventSubTypeChannelSubscription:
					// Only process if we care about subscriptions
					if !mod.Config.Subscription.Enabled {
						continue
					}
					// Parse as subscription event
					var subEv helix.EventSubChannelSubscribeEvent
					err := jsoniter.ConfigFastest.Unmarshal(ev.Event, &subEv)
					if err != nil {
						bot.logger.WithError(err).Debug("error parsing sub event")
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
						bot.logger.WithError(err).Debug("error parsing sub event")
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
						bot.logger.WithError(err).Debug("error parsing raid event")
						continue
					}
					// Pick a random message from base set
					msg := mod.Config.GiftSub.Messages[rand.Intn(len(mod.Config.GiftSub.Messages))]
					// If we have variations, loop through all the available variations and pick the one with the highest minimum cumulative total that are met
					if len(mod.Config.GiftSub.Variations) > 0 {
						if giftEv.IsAnonymous {
							for _, variation := range mod.Config.GiftSub.Variations {
								if variation.IsAnonymous != nil && *variation.IsAnonymous {
									msg = variation.Messages[rand.Intn(len(variation.Messages))]
									break
								}
							}
						} else if giftEv.CumulativeTotal > 0 {
							minCumulative := -1
							for _, variation := range mod.Config.GiftSub.Variations {
								if variation.MinCumulative != nil && *variation.MinCumulative > minCumulative && giftEv.CumulativeTotal >= *variation.MinCumulative {
									msg = variation.Messages[rand.Intn(len(variation.Messages))]
									minCumulative = *variation.MinCumulative
								}
							}
						}
					}
					// Compile template and send
					writeTemplate(bot, msg, &giftEv)
				}
			}
		}
		return nil
	}, "stulbe/ev/webhook")

	bot.logger.Debug("loaded bot alerts")

	return mod
}

func writeTemplate(bot *Bot, msg string, data interface{}) {
	tpl, err := template.New("").Funcs(sprig.TxtFuncMap()).Parse(msg)
	if err != nil {
		bot.logger.WithError(err).Error("error parsing template for alert")
		return
	}
	var buf bytes.Buffer
	err = tpl.Execute(&buf, data)
	if err != nil {
		bot.logger.WithError(err).Error("error executing template for alert")
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
	CumulativeTotal      int
	StreakMonths         int
	DurationMonths       int
	Message              helix.EventSubMessage
}
