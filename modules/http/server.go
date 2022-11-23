package http

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"mime"
	"net/http"
	"net/http/pprof"

	"github.com/strimertul/strimertul/modules/twitch"

	"git.sr.ht/~hamcha/containers"
	jsoniter "github.com/json-iterator/go"

	"github.com/strimertul/strimertul/modules/database"

	"go.uber.org/zap"

	kv "github.com/strimertul/kilovolt/v9"
	"github.com/strimertul/strimertul/modules"
)

var json = jsoniter.ConfigFastest

type Server struct {
	Config   ServerConfig
	db       *database.DBModule
	logger   *zap.Logger
	server   *http.Server
	frontend fs.FS
	hub      *kv.Hub
	mux      *http.ServeMux
	manager  *modules.Manager
}

func NewServer(manager *modules.Manager) (*Server, error) {
	db, ok := manager.Modules["db"].(*database.DBModule)
	if !ok {
		return nil, errors.New("db module not found")
	}

	logger := manager.Logger(modules.ModuleHTTP)

	// Fix mime type bug in Windows (fixed in Go 1.19)
	err := mime.AddExtensionType(".js", "text/javascript; charset=utf-8")
	if err != nil {
		logger.Warn("Failed to set fix for mime-type bug", zap.Error(err))
	}

	server := &Server{
		logger:  logger,
		db:      db,
		server:  &http.Server{},
		manager: manager,
	}
	err = db.GetJSON(ServerConfigKey, &server.Config)
	if err != nil {
		// Initialize with default config
		server.Config = ServerConfig{
			Bind:               "localhost:4337",
			EnableStaticServer: false,
			KVPassword:         "",
		}
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
		Password: server.Config.KVPassword,
	})

	// Register module
	manager.Modules[modules.ModuleHTTP] = server

	return server, nil
}

// StatusData contains status info for the HTTP module
type StatusData struct {
	Bind string
}

func (s *Server) Status() modules.ModuleStatus {
	return modules.ModuleStatus{
		Enabled: true,
		Working: s.server != nil,
		Data: StatusData{
			s.server.Addr,
		},
		StatusString: s.server.Addr,
	}
}

func (s *Server) Close() error {
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
	if s.Config.EnableStaticServer {
		mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(s.Config.Path))))
	}
	if s.manager.Modules[modules.ModuleTwitch].Status().Enabled {
		mux.HandleFunc("/twitch/callback", s.manager.Modules[modules.ModuleTwitch].(*twitch.Client).AuthorizeCallback)
	}

	return mux
}

func (s *Server) Listen() error {
	// Start HTTP server
	restart := containers.NewRWSync(false)
	exit := make(chan error)
	go func() {
		err := s.db.Subscribe(func(key, value string) {
			if key == ServerConfigKey {
				oldBind := s.Config.Bind
				oldPassword := s.Config.KVPassword
				err := json.Unmarshal([]byte(value), &s.Config)
				if err != nil {
					s.logger.Error("Failed to unmarshal config", zap.Error(err))
					return
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
						s.logger.Error("Failed to shutdown server", zap.Error(err))
						return
					}
				}
			}
		}, ServerConfigKey)
		if err != nil {
			exit <- fmt.Errorf("error while handling subscription to HTTP config changes: %w", err)
		}
	}()
	go func() {
		for {
			s.logger.Info("Starting HTTP server", zap.String("bind", s.Config.Bind))
			s.mux = s.makeMux()
			s.server = &http.Server{
				Handler: s,
				Addr:    s.Config.Bind,
			}
			s.logger.Info("HTTP server started", zap.String("bind", s.Config.Bind))
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
