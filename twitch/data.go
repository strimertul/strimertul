package twitch

const CallbackRoute = "/twitch/callback"

const ConfigKey = "twitch/config"

// Config is the general configuration for the Twitch subsystem
type Config struct {
	// Enable subsystem
	Enabled bool `json:"enabled" desc:"Enable subsystem"`

	// Enable the chatbot
	EnableBot bool `json:"enable_bot" desc:"Enable the chatbot"`

	// Twitch API App Client ID
	APIClientID string `json:"api_client_id" desc:"Twitch API App Client ID"`

	// Twitch API App Client Secret
	APIClientSecret string `json:"api_client_secret" desc:"Twitch API App Client Secret"`
}

const StreamInfoKey = "twitch/stream-info"

const BotConfigKey = "twitch/bot-config"

// BotConfig is the general configuration for the Twitch chatbot
type BotConfig struct {
	// Chatbot username (for internal use, ignored by Twitch)
	Username string `json:"username" desc:"Chatbot username (for internal use, ignored by Twitch)"`

	// OAuth key for IRC authentication
	Token string `json:"oauth" desc:"OAuth key for IRC authentication"`

	// Twitch channel to join and use
	Channel string `json:"channel" desc:"Twitch channel to join and use"`

	// How many messages to keep in twitch/chat-history
	ChatHistory int `json:"chat_history" desc:"How many messages to keep in twitch/chat-history"`

	// Global command cooldown in seconds
	CommandCooldown int `json:"command_cooldown" desc:"Global command cooldown in seconds"`
}

const (
	ChatEventKey    = "twitch/ev/chat-message"
	ChatHistoryKey  = "twitch/chat-history"
	ChatActivityKey = "twitch/chat-activity"
)

type ResponseType string

const (
	ResponseTypeDefault  ResponseType = ""
	ResponseTypeChat     ResponseType = "chat"
	ResponseTypeWhisper  ResponseType = "whisper"
	ResponseTypeReply    ResponseType = "reply"
	ResponseTypeAnnounce ResponseType = "announce"
)

// BotCustomCommand is a definition of a custom command of the chatbot
type BotCustomCommand struct {
	// Command description
	Description string `json:"description" desc:"Command description"`

	// Minimum access level needed to use the command
	AccessLevel AccessLevelType `json:"access_level" desc:"Minimum access level needed to use the command"`

	// Response template (in Go templating format)
	Response string `json:"response" desc:"Response template (in Go templating format)"`

	// Is the command enabled?
	Enabled bool `json:"enabled" desc:"Is the command enabled?"`

	// How to respond to the user
	ResponseType ResponseType `json:"response_type" desc:"How to respond to the user"`
}

const CustomCommandsKey = "twitch/bot-custom-commands"

const (
	// WritePlainMessageRPC is the old send command, will be renamed someday
	WritePlainMessageRPC = "twitch/@send-chat-message"

	WriteMessageRPC = "twitch/bot/@send-message"
)

// WriteMessageRequest is an RPC to send a chat message with extra options
type WriteMessageRequest struct {
	Message   string  `json:"message" desc:"Chat message to send"`
	ReplyTo   *string `json:"reply_to" desc:"If specified, send as reply to a message ID"`
	WhisperTo *string `json:"whisper_to" desc:"If specified, send as whisper to user ID"`
	Announce  bool    `json:"announce" desc:"If true, send as announcement"`
}

const BotCounterPrefix = "twitch/bot-counters/"

const AuthKey = "twitch/auth-keys"

const (
	EventSubEventKey   = "twitch/ev/eventsub-event"
	EventSubHistoryKey = "twitch/eventsub-history"
)

const EventSubHistorySize = 100
