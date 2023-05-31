package webserver

import (
	"reflect"

	"github.com/strimertul/strimertul/docs/interfaces"
)

// Documentation stuff, keep updated at all times

var Keys = interfaces.KeyMap{
	ServerConfigKey: interfaces.KeyDef{
		Description: "General server configuration",
		Type:        reflect.TypeOf(ServerConfig{}),
	},
}
