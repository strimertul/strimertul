package docs

import (
	"reflect"

	"git.sr.ht/~ashkeel/strimertul/docs/interfaces"
)

// Documentation stuff, keep updated at all times

const (
	VersionKey = "strimertul/version"
	LogRPCKey  = "strimertul/@log"
)

type ExternalLog struct {
	// Log level
	Level ExternalLogLevel `json:"level"`

	// Log message
	Message string `json:"message"`

	// Additional data as non-nested dictionary
	Data map[string]any `json:"data"`
}

type ExternalLogLevel string

const (
	ExternalLogLevelDebug ExternalLogLevel = "debug"
	ExternalLogLevelInfo  ExternalLogLevel = "info"
	ExternalLogLevelWarn  ExternalLogLevel = "warn"
	ExternalLogLevelError ExternalLogLevel = "error"
)

var enums = interfaces.EnumMap{
	"ExternalLogLevel": interfaces.Enum{
		Values: []any{
			ExternalLogLevelDebug,
			ExternalLogLevelInfo,
			ExternalLogLevelWarn,
			ExternalLogLevelError,
		},
	},
}

var strimertulKeys = interfaces.KeyMap{
	VersionKey: interfaces.KeyDef{
		Description: "Strimertul version (semantic version, e.g. v3.4.0-alpha.1)",
		Type:        reflect.TypeOf(""),
	},
	LogRPCKey: interfaces.KeyDef{
		Description: "Add a log entry",
		Type:        reflect.TypeOf(ExternalLog{}),
		Tags:        []interfaces.KeyTag{interfaces.TagRPC},
	},
}
