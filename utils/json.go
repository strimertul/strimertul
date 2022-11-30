package utils

import (
	"git.sr.ht/~hamcha/containers"
	jsoniter "github.com/json-iterator/go"
)

var json = jsoniter.ConfigFastest

func LoadJSONToWrapped[T any](data string, sync containers.Wrapped[T]) error {
	var result T
	err := json.UnmarshalFromString(data, &result)
	if err != nil {
		return err
	}
	sync.Set(result)
	return nil
}
