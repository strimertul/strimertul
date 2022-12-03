package utils

import "git.sr.ht/~hamcha/containers"

func MergeMap[T comparable, V any](a, b map[T]V) {
	for key, value := range b {
		a[key] = value
	}
}

func MergeSyncMap[T comparable, V any](a, b *containers.SyncMap[T, V]) {
	b.Set(a.Copy())
}
