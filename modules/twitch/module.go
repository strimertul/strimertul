package twitch

const ConfigKey = "twitch/config"

type Config struct {
	EnableBot       bool   `json:"enable_bot"`
	APIClientID     string `json:"api_client_id"`
	APIClientSecret string `json:"api_client_secret"`
}

const BotConfigKey = "twitch/bot-config"

type BotConfig struct {
	Username       string `json:"username"`
	Token          string `json:"oauth"`
	Channel        string `json:"channel"`
	EnableChatKeys bool   `json:"chat_keys"`
	ChatHistory    int    `json:"chat_history"`
}

const ChatEventKey = "twitch/ev/chat-message"
const ChatHistoryKey = "twitch/chat-history"

type BotCustomCommand struct {
	Description string          `json:"description"`
	AccessLevel AccessLevelType `json:"access_level"`
	Response    string          `json:"response"`
	Enabled     bool            `json:"enabled"`
}

const CustomCommandsKey = "twitch/bot-custom-commands"

const WriteMessageRPC = "twitch/@send-chat-message"
