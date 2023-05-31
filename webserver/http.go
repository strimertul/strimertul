package webserver

import (
	"context"
	"net/http"
)

type ServerFactory = func(h http.Handler, addr string) (Server, error)

func DefaultServerFactory(h http.Handler, addr string) (Server, error) {
	return &HTTPServer{http.Server{
		Addr:    addr,
		Handler: h,
	}}, nil
}

type Server interface {
	Start() error
	Close() error
	Shutdown(ctx context.Context) error
}

type HTTPServer struct {
	http.Server
}

func (s *HTTPServer) Start() error {
	return s.ListenAndServe()
}
