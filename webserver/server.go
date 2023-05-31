package webserver

import (
	"context"
	crand "crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io/fs"
	mrand "math/rand"
	"net/http"
	"net/http/pprof"

	"git.sr.ht/~hamcha/containers/sync"
	jsoniter "github.com/json-iterator/go"
	kv "github.com/strimertul/kilovolt/v10"
	"go.uber.org/zap"

	"github.com/strimertul/strimertul/database"
)

var json = jsoniter.ConfigFastest

type WebServer struct {
	Config          *sync.RWSync[ServerConfig]
	db              *database.LocalDBClient
	logger          *zap.Logger
	server          Server
	frontend        fs.FS
	hub             *kv.Hub
	mux             *http.ServeMux
	requestedRoutes *sync.Map[string, http.Handler]
	restart         *sync.RWSync[bool]
	cancelConfigSub database.CancelFunc
	factory         ServerFactory
}

func NewServer(db *database.LocalDBClient, logger *zap.Logger, serverFactory ServerFactory) (*WebServer, error) {
	server := &WebServer{
		logger:          logger,
		db:              db,
		server:          nil,
		requestedRoutes: sync.NewMap[string, http.Handler](),
		restart:         sync.NewRWSync(false),
		Config:          sync.NewRWSync(ServerConfig{}),
		factory:         serverFactory,
	}

	var config ServerConfig
	err := db.GetJSON(ServerConfigKey, &config)
	if err != nil {
		if err != database.ErrEmptyKey {
			logger.Warn("HTTP config is corrupted or could not be read", zap.Error(err))
		}
		// Initialize with default config
		server.Config.Set(ServerConfig{
			Bind:               "localhost:4337",
			EnableStaticServer: false,
			KVPassword:         generatePassword(),
		})
		// Save
		err = db.PutJSON(ServerConfigKey, server.Config.Get())
		if err != nil {
			return nil, err
		}
	} else {
		server.Config.Set(config)
	}

	// Set hub
	server.hub = db.Hub()

	// Set password
	server.hub.SetOptions(kv.HubOptions{
		Password: server.Config.Get().KVPassword,
	})

	err, server.cancelConfigSub = db.SubscribeKey(ServerConfigKey, server.onConfigUpdate)
	if err != nil {
		return nil, fmt.Errorf("error while handling subscription to HTTP config changes: %w", err)
	}

	return server, nil
}

// StatusData contains status info for the HTTP module
type StatusData struct {
	Bind string
}

func (s *WebServer) Close() error {
	if s.cancelConfigSub != nil {
		s.cancelConfigSub()
	}

	if s.server != nil {
		err := s.server.Close()
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *WebServer) SetFrontend(files fs.FS) {
	s.frontend = files
}

func (s *WebServer) makeMux() *http.ServeMux {
	mux := http.NewServeMux()

	// Register pprof
	mux.HandleFunc("/debug/pprof/", pprof.Index)
	mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
	mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
	mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
	mux.HandleFunc("/debug/pprof/trace", pprof.Trace)
	mux.HandleFunc("/health", healthFunc)

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

func healthFunc(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "OK")
}

func (s *WebServer) RegisterRoute(route string, handler http.Handler) {
	s.requestedRoutes.SetKey(route, handler)
	s.mux = s.makeMux()
}

func (s *WebServer) UnregisterRoute(route string) {
	s.requestedRoutes.DeleteKey(route)
	s.mux = s.makeMux()
}

func (s *WebServer) Listen() error {
	// Start HTTP server
	exit := make(chan error)
	go func() {
		for {
			// Read config and make http request mux
			config := s.Config.Get()
			s.logger.Info("Starting HTTP server", zap.String("bind", config.Bind))
			s.mux = s.makeMux()

			// Make HTTP server instance
			var err error
			s.server, err = s.factory(s, config.Bind)
			if err != nil {
				exit <- err
				return
			}

			// Start HTTP server
			s.logger.Info("HTTP server started", zap.String("bind", config.Bind))
			err = s.server.Start()

			// If the server died, we need to see what to do
			s.logger.Debug("HTTP server died", zap.Error(err))
			if err != nil && !errors.Is(err, http.ErrServerClosed) {
				exit <- err
				return
			}

			// Are we trying to close or restart?
			s.logger.Debug("HTTP server stopped", zap.Bool("restart", s.restart.Get()))
			if s.restart.Get() {
				s.restart.Set(false)
				continue
			}
			break
		}
		s.logger.Debug("HTTP server stalled")
		exit <- nil
	}()

	return <-exit
}

func (s *WebServer) onConfigUpdate(value string) {
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
		s.restart.Set(true)
		err = s.server.Shutdown(context.Background())
		if err != nil {
			s.logger.Error("Failed to shutdown server", zap.Error(err))
			return
		}
	}
}

func (s *WebServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Redirect to /ui/ if root
	if r.URL.Path == "/" {
		http.Redirect(w, r, "/ui/", http.StatusFound)
		return
	}
	s.mux.ServeHTTP(w, r)
}

func generatePassword() string {
	b := make([]byte, 21) // To prevent padding characters, keep it a multiple of 3
	_, err := crand.Read(b)
	if err != nil {
		// fallback to bad rand, but this will never fail
		mrand.Read(b)
	}
	return base64.URLEncoding.EncodeToString(b)
}
