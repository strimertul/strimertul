package http

import "sync"

type SafeBool struct {
	val bool
	mux sync.Mutex
}

func newSafeBool(val bool) *SafeBool {
	return &SafeBool{val: val, mux: sync.Mutex{}}
}

func (s *SafeBool) Set(val bool) {
	s.mux.Lock()
	s.val = val
	s.mux.Unlock()
}

func (s *SafeBool) Get() bool {
	s.mux.Lock()
	val := s.val
	s.mux.Unlock()
	return val
}
