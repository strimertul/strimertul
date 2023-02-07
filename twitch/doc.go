package twitch

import (
	"reflect"

	irc "github.com/gempir/go-twitch-irc/v4"
	"github.com/nicklaw5/helix/v2"
	"github.com/strimertul/strimertul/docs/interfaces"
)

// Documentation stuff, keep updated at all times

var Keys = interfaces.KeyMap{
	ConfigKey: interfaces.KeyDef{
		Description: "General configuration for the Twitch subsystem",
		Type:        reflect.TypeOf(Config{}),
	},
	StreamInfoKey: interfaces.KeyDef{
		Description: "List of active twitch streams (1 element if live, 0 otherwise)",
		Type:        reflect.TypeOf([]helix.Stream{}),
	},
	BotConfigKey: interfaces.KeyDef{
		Description: "General configuration for the Twitch chatbot",
		Type:        reflect.TypeOf(BotConfig{}),
	},
	ChatEventKey: interfaces.KeyDef{
		Description: "On chat message received",
		Type:        reflect.TypeOf(irc.PrivateMessage{}),
		Tags:        []interfaces.KeyTag{interfaces.TagEvent},
	},
	ChatHistoryKey: interfaces.KeyDef{
		Description: "Last chat messages received",
		Type:        reflect.TypeOf([]irc.PrivateMessage{}),
		Tags:        []interfaces.KeyTag{interfaces.TagHistory},
	},
	ChatActivityKey: interfaces.KeyDef{
		Description: "Number of chat messages in the last minute",
		Type:        reflect.TypeOf(0),
	},
	CustomCommandsKey: interfaces.KeyDef{
		Description: "Chatbot custom commands",
		Type:        reflect.TypeOf(map[string]BotCustomCommand{}),
	},
	AuthKey: interfaces.KeyDef{
		Description: "User access token for the twitch subsystem",
		Type:        reflect.TypeOf(AuthResponse{}),
	},
	EventSubEventKey: interfaces.KeyDef{
		Description: "On Eventsub event received",
		Type:        reflect.TypeOf(NotificationMessagePayload{}),
		Tags:        []interfaces.KeyTag{interfaces.TagEvent},
	},
	EventSubHistoryKey: interfaces.KeyDef{
		Description: "Last eventsub notifications received",
		Type:        reflect.TypeOf([]NotificationMessagePayload{}),
		Tags:        []interfaces.KeyTag{interfaces.TagHistory},
	},
	BotAlertsKey: interfaces.KeyDef{
		Description: "Configuration of chat bot alerts",
		Type:        reflect.TypeOf(BotAlertsConfig{}),
	},
	BotTimersKey: interfaces.KeyDef{
		Description: "Configuration of chat bot timers",
		Type:        reflect.TypeOf(BotTimersConfig{}),
	},
	WriteMessageRPC: interfaces.KeyDef{
		Description: "Send plain text chat message",
		Type:        reflect.TypeOf(""),
		Tags:        []interfaces.KeyTag{interfaces.TagRPC},
	},
}

var Enums = interfaces.EnumMap{
	"AccessLevelType": interfaces.Enum{
		Values: []any{
			ALTEveryone,
			ALTSubscribers,
			ALTVIP,
			ALTModerators,
			ALTStreamer,
		},
	},
}
