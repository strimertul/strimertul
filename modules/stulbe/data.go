package stulbe

import "errors"

const ConfigKey = "stulbe/config"

type Config struct {
	Endpoint string `json:"endpoint"`
	Username string `json:"username"`
	AuthKey  string `json:"auth_key"`
}

var (
	ErrNotAuthenticated = errors.New("not authenticated")
)
