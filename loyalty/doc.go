package loyalty

import (
	"reflect"

	"git.sr.ht/~ashkeel/strimertul/docs/interfaces"
)

// Documentation stuff, keep updated at all times

var Keys = interfaces.KeyMap{
	ConfigKey: interfaces.KeyDef{
		Description: "General configuration for the loyalty system",
		Type:        reflect.TypeOf(Config{}),
	},
	RewardsKey: interfaces.KeyDef{
		Description: "List of available rewards",
		Type:        reflect.TypeOf([]Reward{}),
	},
	GoalsKey: interfaces.KeyDef{
		Description: "List of all goals",
		Type:        reflect.TypeOf([]Goal{}),
	},
	PointsPrefix + "<user>": interfaces.KeyDef{
		Description: "Point entry for a given user",
		Type:        reflect.TypeOf(PointsEntry{}),
	},
	QueueKey: interfaces.KeyDef{
		Description: "All pending redeems",
		Type:        reflect.TypeOf([]Redeem{}),
	},
	RedeemEvent: interfaces.KeyDef{
		Description: "On reward redeemed",
		Type:        reflect.TypeOf(Redeem{}),
		Tags:        []interfaces.KeyTag{interfaces.TagEvent},
	},
	CreateRedeemRPC: interfaces.KeyDef{
		Description: "Create a new pending redeem",
		Type:        reflect.TypeOf(Redeem{}),
		Tags:        []interfaces.KeyTag{interfaces.TagRPC},
	},
	RemoveRedeemRPC: interfaces.KeyDef{
		Description: "Remove a redeem from the queue",
		Type:        reflect.TypeOf(Redeem{}),
		Tags:        []interfaces.KeyTag{interfaces.TagRPC},
	},
}
