package docs

import (
	"git.sr.ht/~ashkeel/strimertul/docs/interfaces"
	"git.sr.ht/~ashkeel/strimertul/loyalty"
	"git.sr.ht/~ashkeel/strimertul/twitch"
	"git.sr.ht/~ashkeel/strimertul/utils"
	"git.sr.ht/~ashkeel/strimertul/webserver"
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
