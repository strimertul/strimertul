package main

import (
	"os"

	"git.sr.ht/~ashkeel/strimertul/docs"
	jsoniter "github.com/json-iterator/go"
)

func main() {
	enc := jsoniter.ConfigFastest.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(docs.Keys)
}
