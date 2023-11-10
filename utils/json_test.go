package utils

import (
	"testing"

	"git.sr.ht/~ashkeel/containers/sync"
	jsoniter "github.com/json-iterator/go"
)

func TestLoadJSONToWrapped(t *testing.T) {
	// Create test struct and object
	type test struct {
		TestValue string
	}
	testObj := test{
		TestValue: "test",
	}

	// Encode test object to JSON
	testStr, err := jsoniter.ConfigFastest.MarshalToString(testObj)
	if err != nil {
		t.Fatal(err)
	}

	// Create a wrapped instance of the test object
	wrapped := sync.NewSync[test](test{})

	// Load JSON to wrapped
	err = LoadJSONToWrapped[test](testStr, wrapped)
	if err != nil {
		t.Fatal(err)
	}

	// Get the wrapped value and compare to original
	if wrapped.Get().TestValue != testObj.TestValue {
		t.Fatal("JSON was not loaded correctly")
	}
}
