package main

import (
	"context"
	"runtime/debug"
	"strconv"

	"github.com/strimertul/strimertul/docs"

	"git.sr.ht/~hamcha/containers/sync"
	"github.com/nicklaw5/helix/v2"
	"github.com/urfave/cli/v2"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"go.uber.org/zap"

	"github.com/strimertul/strimertul/database"
	"github.com/strimertul/strimertul/http"
	"github.com/strimertul/strimertul/loyalty"
	"github.com/strimertul/strimertul/twitch"
)

// App struct
type App struct {
	ctx       context.Context
	cliParams *cli.Context
	driver    database.DatabaseDriver
	ready     *sync.RWSync[bool]

	db             *database.LocalDBClient
	twitchManager  *twitch.Manager
	httpServer     *http.Server
	loyaltyManager *loyalty.Manager
}

// NewApp creates a new App application struct
func NewApp(cliParams *cli.Context) *App {
	return &App{
		cliParams: cliParams,
		ready:     sync.NewRWSync(false),
	}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Make KV hub
	var err error
	a.driver, err = database.GetDatabaseDriver(a.cliParams)
	failOnError(err, "error opening database")

	// Start database backup task
	backupOpts := database.BackupOptions{
		BackupDir:      a.cliParams.String("backup-dir"),
		BackupInterval: a.cliParams.Int("backup-interval"),
		MaxBackups:     a.cliParams.Int("max-backups"),
	}
	if backupOpts.BackupInterval > 0 {
		go BackupTask(a.driver, backupOpts)
	}

	hub := a.driver.Hub()
	go hub.Run()

	a.db, err = database.NewLocalClient(hub, logger)
	failOnError(err, "failed to initialize database module")

	// Set meta keys
	_ = a.db.PutKey("stul-meta/version", appVersion)

	// Create logger and endpoints
	a.httpServer, err = http.NewServer(a.db, logger)
	failOnError(err, "could not initialize http server")

	// Create twitch client
	a.twitchManager, err = twitch.NewManager(a.db, a.httpServer, logger)
	failOnError(err, "could not initialize twitch client")

	// Initialize loyalty system
	a.loyaltyManager, err = loyalty.NewManager(a.db, a.twitchManager, logger)
	failOnError(err, "could not initialize loyalty manager")

	a.ready.Set(true)
	runtime.EventsEmit(ctx, "ready", true)
	logger.Info("app is ready")

	// Start redirecting logs to UI
	go func() {
		for entry := range incomingLogs {
			runtime.EventsEmit(ctx, "log-event", entry)
		}
	}()

	// Run HTTP server
	failOnError(a.httpServer.Listen(), "HTTP server stopped")
}

func (a *App) stop(context.Context) {
	if a.loyaltyManager != nil {
		warnOnError(a.loyaltyManager.Close(), "could not cleanly close loyalty manager")
	}
	if a.twitchManager != nil {
		warnOnError(a.twitchManager.Close(), "could not cleanly close twitch client")
	}
	if a.httpServer != nil {
		warnOnError(a.httpServer.Close(), "could not cleanly close HTTP server")
	}
	warnOnError(a.db.Close(), "could not cleanly close database")

	warnOnError(a.driver.Close(), "could not close driver")
}

func (a *App) AuthenticateKVClient(id string) {
	idInt, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return
	}
	warnOnError(a.driver.Hub().SetAuthenticated(idInt, true), "could not mark session as authenticated", zap.String("session-id", id))
}

func (a *App) IsServerReady() bool {
	return a.ready.Get()
}

func (a *App) GetKilovoltBind() string {
	if a.httpServer == nil {
		return ""
	}
	return a.httpServer.Config.Get().Bind
}

func (a *App) GetTwitchAuthURL() string {
	return a.twitchManager.Client().GetAuthorizationURL()
}

func (a *App) GetTwitchLoggedUser() (helix.User, error) {
	return a.twitchManager.Client().GetLoggedUser()
}

func (a *App) GetLastLogs() []LogEntry {
	return lastLogs.Get()
}

func (a *App) GetDocumentation() map[string]docs.KeyObject {
	return docs.Keys
}

type VersionInfo struct {
	Release   string           `json:"release"`
	BuildInfo *debug.BuildInfo `json:"build"`
}

func (a *App) GetAppVersion() VersionInfo {
	info, _ := debug.ReadBuildInfo()
	return VersionInfo{
		Release:   appVersion,
		BuildInfo: info,
	}
}
