package twitch

const CallbackRoute = "/twitch/callback"

const ConfigKey = "twitch/config"

type Config struct {
	Enabled         bool   `json:"enabled"`
	EnableBot       bool   `json:"enable_bot"`
	APIClientID     string `json:"api_client_id"`
	APIClientSecret string `json:"api_client_secret"`
}

const StreamInfoKey = "twitch/stream-info"

const BotConfigKey = "twitch/bot-config"

type BotConfig struct {
	Username    string `json:"username"`
	Token       string `json:"oauth"`
	Channel     string `json:"channel"`
	ChatHistory int    `json:"chat_history"`
}

const (
	ChatEventKey    = "twitch/ev/chat-message"
	ChatHistoryKey  = "twitch/chat-history"
	ChatActivityKey = "twitch/chat-activity"
)

type BotCustomCommand struct {
	Description string          `json:"description"`
	AccessLevel AccessLevelType `json:"access_level"`
	Response    string          `json:"response"`
	Enabled     bool            `json:"enabled"`
}

const CustomCommandsKey = "twitch/bot-custom-commands"

const WriteMessageRPC = "twitch/@send-chat-message"

const BotCounterPrefix = "twitch/bot-counters/"

const AuthKey = "twitch/auth-keys"

const (
	EventSubEventKey   = "twitch/ev/eventsub-event"
	EventSubHistoryKey = "twitch/eventsub-history"
)

const EventSubHistorySize = 100
