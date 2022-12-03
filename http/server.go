package http

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"net/http/pprof"

	"github.com/strimertul/strimertul/utils"

	"git.sr.ht/~hamcha/containers"
	jsoniter "github.com/json-iterator/go"
	"github.com/strimertul/strimertul/database"

	"go.uber.org/zap"

	kv "github.com/strimertul/kilovolt/v9"
)

var json = jsoniter.ConfigFastest

type Server struct {
	Config          *containers.RWSync[ServerConfig]
	db              *database.LocalDBClient
	logger          *zap.Logger
	server          *http.Server
	frontend        fs.FS
	hub             *kv.Hub
	mux             *http.ServeMux
	requestedRoutes *containers.SyncMap[string, http.Handler]
	cancelConfigSub database.CancelFunc
}

func NewServer(db *database.LocalDBClient, logger *zap.Logger) (*Server, error) {
	server := &Server{
		logger:          logger,
		db:              db,
		server:          &http.Server{},
		requestedRoutes: containers.NewSyncMap[string, http.Handler](),
		Config:          containers.NewRWSync(ServerConfig{}),
	}

	err := utils.LoadJSONToWrapped[ServerConfig](ServerConfigKey, server.Config)
	if err != nil {
		// Initialize with default config
		server.Config.Set(ServerConfig{
			Bind:               "localhost:4337",
			EnableStaticServer: false,
			KVPassword:         "",
		})
		// Save
		err = db.PutJSON(ServerConfigKey, server.Config)
		if err != nil {
			return nil, err
		}
	}

	// Set hub
	server.hub = db.Hub()

	// Set password
	server.hub.SetOptions(kv.HubOptions{
		Password: server.Config.Get().KVPassword,
	})

	return server, nil
}

// StatusData contains status info for the HTTP module
type StatusData struct {
	Bind string
}

func (s *Server) Close() error {
	if s.cancelConfigSub != nil {
		s.cancelConfigSub()
	}

	return s.server.Close()
}

func (s *Server) SetFrontend(files fs.FS) {
	s.frontend = files
}

func (s *Server) makeMux() *http.ServeMux {
	mux := http.NewServeMux()

	// Register pprof
	mux.HandleFunc("/debug/pprof/", pprof.Index)
	mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
	mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
	mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
	mux.HandleFunc("/debug/pprof/trace", pprof.Trace)

	if s.frontend != nil {
		mux.Handle("/ui/", http.StripPrefix("/ui/", FileServerWithDefault(http.FS(s.frontend))))
	}
	if s.hub != nil {
		mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
			kv.ServeWs(s.hub, w, r)
		})
	}
	config := s.Config.Get()
	if config.EnableStaticServer {
		mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(config.Path))))
	}
	for route, handler := range s.requestedRoutes.Copy() {
		mux.Handle(route, handler)
	}

	return mux
}

func (s *Server) RegisterRoute(route string, handler http.Handler) {
	s.requestedRoutes.SetKey(route, handler)
	s.mux = s.makeMux()
}

func (s *Server) UnregisterRoute(route string) {
	s.requestedRoutes.DeleteKey(route)
	s.mux = s.makeMux()
}

func (s *Server) Listen() error {
	// Start HTTP server
	restart := containers.NewRWSync(false)
	exit := make(chan error)
	var err error
	err, s.cancelConfigSub = s.db.SubscribeKey(ServerConfigKey, func(value string) {
		oldConfig := s.Config.Get()

		var config ServerConfig
		err := json.Unmarshal([]byte(value), &config)
		if err != nil {
			s.logger.Error("Failed to unmarshal config", zap.Error(err))
			return
		}

		s.Config.Set(config)
		s.mux = s.makeMux()
		// Restart hub if password changed
		if oldConfig.KVPassword != config.KVPassword {
			s.hub.SetOptions(kv.HubOptions{
				Password: config.KVPassword,
			})
		}
		// Restart server if bind changed
		if oldConfig.Bind != config.Bind {
			restart.Set(true)
			err = s.server.Shutdown(context.Background())
			if err != nil {
				s.logger.Error("Failed to shutdown server", zap.Error(err))
				return
			}
		}
	})
	if err != nil {
		exit <- fmt.Errorf("error while handling subscription to HTTP config changes: %w", err)
	}
	go func() {
		for {
			config := s.Config.Get()
			s.logger.Info("Starting HTTP server", zap.String("bind", config.Bind))
			s.mux = s.makeMux()
			s.server = &http.Server{
				Handler: s,
				Addr:    config.Bind,
			}
			s.logger.Info("HTTP server started", zap.String("bind", config.Bind))
			err := s.server.ListenAndServe()
			s.logger.Debug("HTTP server died", zap.Error(err))
			if err != nil && !errors.Is(err, http.ErrServerClosed) {
				exit <- err
				return
			}
			// Are we trying to close or restart?
			s.logger.Debug("HTTP server stopped", zap.Bool("restart", restart.Get()))
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
