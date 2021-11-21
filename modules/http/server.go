package http

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"net/http"

	kv "github.com/strimertul/kilovolt/v6"

	"github.com/sirupsen/logrus"

	"github.com/strimertul/strimertul/database"
)

type Server struct {
	Config   ServerConfig
	db       *database.DB
	logger   logrus.FieldLogger
	server   *http.Server
	frontend fs.FS
	hub      *kv.Hub
	mux      *http.ServeMux
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
	if err != nil {
		return nil, err
	}

	server.hub, err = kv.NewHub(db.Client(), kv.HubOptions{
		Password: server.Config.KVPassword,
	}, log.WithField("module", "kv"))
	if err != nil {
		return nil, err
	}
	go server.hub.Run()

	return server, nil
}

func (s *Server) SetFrontend(files fs.FS) {
	s.frontend = files
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
	if s.Config.EnableStaticServer {
		mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(s.Config.Path))))
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
					oldPassword := s.Config.KVPassword
					err := s.db.GetJSON(ServerConfigKey, &s.Config)
					if err != nil {
						return err
					}
					s.mux = s.makeMux()
					// Restart hub if password changed
					if oldPassword != s.Config.KVPassword {
						s.hub.SetOptions(kv.HubOptions{
							Password: s.Config.KVPassword,
						})
					}
					// Restart server if bind changed
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
