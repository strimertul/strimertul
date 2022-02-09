package http

import "sync"

type SafeBool struct {
	val bool
	mux sync.RWMutex
}

func newSafeBool(val bool) *SafeBool {
	return &SafeBool{val: val, mux: sync.RWMutex{}}
}

func (s *SafeBool) Set(val bool) {
	s.mux.Lock()
	s.val = val
	s.mux.Unlock()
}

func (s *SafeBool) Get() bool {
	s.mux.RLock()
	val := s.val
	s.mux.RUnlock()
	return val
}
