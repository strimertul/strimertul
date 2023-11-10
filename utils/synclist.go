package utils

import (
	"git.sr.ht/~ashkeel/containers/sync"
)

type SyncList[T Comparable] struct {
	items *sync.Slice[T]
}

func NewSyncList[T Comparable]() *SyncList[T] {
	return &SyncList[T]{
		items: sync.NewSlice[T](),
	}
}

func (p *SyncList[T]) Add(handler T) {
	p.items.Push(handler)
}

func (p *SyncList[T]) Remove(handler T) {
	arr := p.items.Copy()
	// Use slice trick to in-place remove entry if found
	for index := range arr {
		if arr[index].Equals(handler) {
			arr[index] = arr[len(arr)-1]
			p.items.Set(arr[:len(arr)-1])
			return
		}
	}
}

func (p *SyncList[T]) Items() []T {
	return p.items.Copy()
}

func (p *SyncList[T]) Copy(other *SyncList[T]) {
	for _, subscriber := range other.Items() {
		p.Add(subscriber)
	}
}
