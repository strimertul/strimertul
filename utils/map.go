package utils

import "git.sr.ht/~hamcha/containers/sync"

func MergeMap[T comparable, V any](a, b map[T]V) {
	for key, value := range b {
		a[key] = value
	}
}

func MergeSyncMap[T comparable, V any](a, b *sync.Map[T, V]) {
	merged := a.Copy()
	MergeMap(merged, b.Copy())
	a.Set(merged)
}
