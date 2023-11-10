package webserver

import (
	"context"
	"net/http"
	"net/http/httptest"

	"git.sr.ht/~ashkeel/containers/sync"
)

type TestServer struct {
	server *sync.Sync[*httptest.Server]
	start  chan struct{}
	close  chan error
}

func NewTestServer() *TestServer {
	return &TestServer{
		server: sync.NewSync[*httptest.Server](nil),
		close:  make(chan error),
		start:  make(chan struct{}, 10),
	}
}

func (t *TestServer) Start() error {
	server := t.server.Get()
	server.Start()
	t.start <- struct{}{}
	return <-t.close
}

func (t *TestServer) Close() error {
	t.server.Get().Close()
	t.close <- nil
	return nil
}

func (t *TestServer) Shutdown(_ context.Context) error {
	return t.Close()
}

func (t *TestServer) Factory() ServerFactory {
	return func(h http.Handler, addr string) (Server, error) {
		s := httptest.NewUnstartedServer(h)
		t.server.Set(s)
		return t, nil
	}
}

func (t *TestServer) Wait() {
	if t.server.Get() == nil {
		<-t.start
	}
}

func (t *TestServer) Client() *http.Client {
	return t.server.Get().Client()
}

func (t *TestServer) URL() string {
	return t.server.Get().URL
}
