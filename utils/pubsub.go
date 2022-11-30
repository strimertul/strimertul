package utils

import "git.sr.ht/~hamcha/containers"

type PubSub[T Comparable] struct {
	subscribers *containers.RWSync[[]T]
}

func NewPubSub[T Comparable]() *PubSub[T] {
	return &PubSub[T]{
		subscribers: containers.NewRWSync([]T{}),
	}
}

func (p *PubSub[T]) Subscribe(handler T) {
	p.subscribers.Set(append(p.subscribers.Get(), handler))
}

func (p *PubSub[T]) Unsubscribe(handler T) {
	arr := p.subscribers.Get()
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
	return p.subscribers.Get()
}
