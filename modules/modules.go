package modules

const ModuleConfigKey = "stul-meta/modules"

type ModuleConfig struct {
	CompletedOnboarding bool `json:"configured"`
	EnableKV            bool `json:"kv"`
	EnableStaticServer  bool `json:"static"`
	EnableTwitch        bool `json:"twitch"`
	EnableStulbe        bool `json:"stulbe"`
	EnableLoyalty       bool `json:"loyalty"`
}

const HTTPServerConfigKey = "http/config"

type HTTPServerConfig struct {
	Bind string `json:"bind"`
	Path string `json:"path"`
}
