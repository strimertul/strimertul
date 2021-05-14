package twitch

const ConfigKey = "twitch/config"

type Config struct {
	EnableBot       bool   `json:"enable_bot"`
	APIClientID     string `json:"api_client_id"`
	APIClientSecret string `json:"api_client_secret"`
}

const BotConfigKey = "twitch/bot-config"

type BotConfig struct {
	Username string `json:"username"`
	Token    string `json:"oauth"`
	Channel  string `json:"channel"`
}
