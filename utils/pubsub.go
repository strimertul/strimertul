package utils

import "git.sr.ht/~hamcha/containers"

type PubSub[T Comparable] struct {
	subscribers *containers.SyncSlice[T]
}

func NewPubSub[T Comparable]() *PubSub[T] {
	return &PubSub[T]{
		subscribers: containers.NewSyncSlice[T](),
	}
}

func (p *PubSub[T]) Subscribe(handler T) {
	p.subscribers.Push(handler)
}

func (p *PubSub[T]) Unsubscribe(handler T) {
	arr := p.subscribers.Copy()
	// Use slice trick to in-place remove entry if found
	for index := range arr {
		if arr[index].Equals(handler) {
			arr[index] = arr[len(arr)-1]
			p.subscribers.Set(arr[:len(arr)-1])
			return
		}
	}
}

func (p *PubSub[T]) Subscribers() []T {
	return p.subscribers.Copy()
}

func (p *PubSub[T]) Copy(other *PubSub[T]) {
	for _, subscriber := range other.Subscribers() {
		p.Subscribe(subscriber)
	}
}
