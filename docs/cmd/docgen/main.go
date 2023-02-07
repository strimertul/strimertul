package main

import (
	"os"

	jsoniter "github.com/json-iterator/go"
	"github.com/strimertul/strimertul/docs"
)

func main() {
	enc := jsoniter.ConfigFastest.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(docs.Keys)
}
