package http

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"net/http"

	kv "github.com/strimertul/kilovolt/v5"

	"github.com/sirupsen/logrus"

	"github.com/strimertul/strimertul/database"
)

type Server struct {
	Config     ServerConfig
	db         *database.DB
	logger     logrus.FieldLogger
	server     *http.Server
	frontend   fs.FS
	hub        *kv.Hub
	staticPath string
	mux        *http.ServeMux
}

func NewServer(db *database.DB, log logrus.FieldLogger) (*Server, error) {
	if log == nil {
		log = logrus.New()
	}

	server := &Server{
		logger: log,
		db:     db,
		server: &http.Server{},
	}
	err := db.GetJSON(ServerConfigKey, &server.Config)

	return server, err
}

func (s *Server) SetFrontend(files fs.FS) {
	s.frontend = files
}

func (s *Server) SetHub(hub *kv.Hub) {
	s.hub = hub
}

func (s *Server) SetStaticPath(path string) {
	s.staticPath = path
}

func (s *Server) makeMux() *http.ServeMux {
	mux := http.NewServeMux()

	if s.frontend != nil {
		mux.Handle("/ui/", http.StripPrefix("/ui/", FileServerWithDefault(http.FS(s.frontend))))
	}
	if s.hub != nil {
		mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
			kv.ServeWs(s.hub, w, r)
		})
	}
	if s.staticPath != "" {
		mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(s.staticPath))))
	}

	return mux
}

func (s *Server) Listen() error {
	// Start HTTP server
	restart := newSafeBool(false)
	exit := make(chan error)
	go func() {
		err := s.db.Subscribe(context.Background(), func(changed []database.ModifiedKV) error {
			for _, pair := range changed {
				if pair.Key == ServerConfigKey {
					oldBind := s.Config.Bind
					err := s.db.GetJSON(ServerConfigKey, &s.Config)
					if err != nil {
						return err
					}
					s.mux = s.makeMux()
					if oldBind != s.Config.Bind {
						restart.Set(true)
						err = s.server.Shutdown(context.Background())
						if err != nil {
							s.logger.WithError(err).Error("Failed to shutdown server")
							return err
						}
					}
				}
			}
			return nil
		}, ServerConfigKey)
		if err != nil {
			exit <- fmt.Errorf("error while handling subscription to HTTP config changes: %w", err)
		}
	}()
	go func() {
		for {
			s.logger.WithField("bind", s.Config.Bind).Info("Starting HTTP server")
			s.mux = s.makeMux()
			s.server = &http.Server{
				Handler: s,
				Addr:    s.Config.Bind,
			}
			err := s.server.ListenAndServe()
			if err != nil && !errors.Is(err, http.ErrServerClosed) {
				exit <- err
				return
			}
			// Are we trying to close or restart?
			s.logger.WithField("restart", restart).Debug("HTTP server stopped")
			if restart.Get() {
				restart.Set(false)
				continue
			}
			break
		}
		s.logger.Debug("HTTP server stalled")
		exit <- nil
	}()

	return <-exit
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Redirect to /ui/ if root
	if r.URL.Path == "/" {
		http.Redirect(w, r, "/ui/", http.StatusFound)
		return
	}
	s.mux.ServeHTTP(w, r)
}
