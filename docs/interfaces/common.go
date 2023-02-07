package interfaces

import "reflect"

type Enum struct {
	Values []any
}

type KeyDef struct {
	Description string
	Type        reflect.Type
	Tags        []KeyTag
}

type (
	EnumMap map[string]Enum // Go type-system is too prehistorical to support what I need here
	KeyMap  map[string]KeyDef
)

type KeyTag string

const (
	TagEvent   KeyTag = "event"
	TagRPC     KeyTag = "rpc"
	TagHistory KeyTag = "history"
)
