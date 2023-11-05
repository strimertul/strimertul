package docs

import (
	"github.com/strimertul/strimertul/docs/interfaces"
	"github.com/strimertul/strimertul/loyalty"
	"github.com/strimertul/strimertul/twitch"
	"github.com/strimertul/strimertul/utils"
	"github.com/strimertul/strimertul/webserver"
)

var (
	Enums = interfaces.EnumMap{}
	Keys  = map[string]KeyObject{}
)

func addKeys(keyMap interfaces.KeyMap) {
	for key, obj := range keyMap {
		Keys[key] = KeyObject{
			Description: obj.Description,
			Tags:        obj.Tags,
			Schema:      parseType(obj.Type),
		}
	}
}

func init() {
	// Put all enums here
	utils.MergeMap(Enums, twitch.Enums)
	utils.MergeMap(Enums, enums)

	// Put all keys here
	addKeys(strimertulKeys)
	addKeys(twitch.Keys)
	addKeys(loyalty.Keys)
	addKeys(webserver.Keys)
}
