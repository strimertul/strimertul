package http

const ServerConfigKey = "http/config"

type ServerConfig struct {
	Bind               string `json:"bind"`
	EnableStaticServer bool   `json:"enable_static_server"`
	Path               string `json:"path"`
	KVPassword         string `json:"kv_password"`
}
