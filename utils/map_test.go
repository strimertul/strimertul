package utils

import (
	"git.sr.ht/~hamcha/containers/sync"
	"testing"
)

func TestMergeMap(t *testing.T) {
	// Create two map and merge them.
	m1 := map[string]string{
		"a": "1",
		"b": "2",
		"c": "3",
	}
	m2 := map[string]string{
		"a": "4",
		"d": "5",
		"e": "6",
	}
	MergeMap(m1, m2)

	// Check if the merged map is correct.
	if m1["a"] != "4" {
		t.Error("MergeMap failed: wrong value in overwritten key")
	}
	if len(m1) != 5 {
		t.Error("MergeMap failed: wrong length")
	}
}

func TestMergeSyncMap(t *testing.T) {
	// Create two map and merge them.
	m1 := sync.NewMap[string, string]()
	m1.Set(map[string]string{
		"a": "1",
		"b": "2",
		"c": "3",
	})
	m2 := sync.NewMap[string, string]()
	m2.Set(map[string]string{
		"a": "4",
		"d": "5",
		"e": "6",
	})
	MergeSyncMap(m1, m2)

	// Check if the merged map is correct.
	if val, ok := m1.GetKey("a"); !ok || val != "4" {
		t.Error("MergeSyncMap failed: wrong value in overwritten key")
	}
	if len(m1.Copy()) != 5 {
		t.Error("MergeSyncMap failed: wrong length")
	}
}
