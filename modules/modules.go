package modules

const ModuleConfigKey = "stul-meta/modules"

type ModuleConfig struct {
	CompletedOnboarding bool `json:"configured"`
	EnableKV            bool `json:"kv"`
	EnableStaticServer  bool `json:"static"`
	EnableTwitchbot     bool `json:"twitchbot"`
	EnableStulbe        bool `json:"stulbe"`
	EnableLoyalty       bool `json:"loyalty"`
}

const HTTPServerConfigKey = "http/config"

type HTTPServerConfig struct {
	Bind string `json:"bind"`
	Path string `json:"path"`
}

const TwitchBotConfigKey = "twitchbot/config"

type TwitchBotConfig struct {
	Username string `json:"username"`
	Token    string `json:"oauth"`
	Channel  string `json:"channel"`
}

const StulbeConfigKey = "stulbe/config"

type StulbeConfig struct {
	Endpoint      string `json:"endpoint"`
	Token         string `json:"token"`
	EnableLoyalty bool   `json:"enable_loyalty"`
}
