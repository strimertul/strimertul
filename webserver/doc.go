package webserver

import (
	"reflect"

	"git.sr.ht/~ashkeel/strimertul/docs/interfaces"
)

// Documentation stuff, keep updated at all times

var Keys = interfaces.KeyMap{
	ServerConfigKey: interfaces.KeyDef{
		Description: "General server configuration",
		Type:        reflect.TypeOf(ServerConfig{}),
	},
}
