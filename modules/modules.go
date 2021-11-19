package modules

const ModuleConfigKey = "stul-meta/modules"

type ModuleConfig struct {
	CompletedOnboarding bool `json:"configured"`
	EnableKV            bool `json:"kv"`
	EnableTwitch        bool `json:"twitch"`
	EnableStulbe        bool `json:"stulbe"`
	EnableLoyalty       bool `json:"loyalty"`
}
