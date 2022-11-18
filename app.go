package main

import (
	"context"
	"strconv"

	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/database"
	"github.com/strimertul/strimertul/modules/http"

	"github.com/urfave/cli/v2"
	"go.uber.org/zap"
)

// App struct
type App struct {
	ctx       context.Context
	cliParams *cli.Context
	driver    DatabaseDriver
	manager   *modules.Manager
}

// NewApp creates a new App application struct
func NewApp(cliParams *cli.Context) *App {
	return &App{
		cliParams: cliParams,
	}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Create module manager
	a.manager = modules.NewManager(logger)

	// Make KV hub
	var err error
	a.driver, err = getDatabaseDriver(a.cliParams)
	failOnError(err, "error opening database")

	// Start database backup task
	backupOpts := BackupOptions{
		BackupDir:      a.cliParams.String("backup-dir"),
		BackupInterval: a.cliParams.Int("backup-interval"),
		MaxBackups:     a.cliParams.Int("max-backups"),
	}
	if backupOpts.BackupInterval > 0 {
		go BackupTask(a.driver, backupOpts)
	}

	hub := a.driver.Hub()
	go hub.Run()

	db, err := database.NewDBModule(hub, a.manager)
	failOnError(err, "failed to initialize database module")

	// Set meta keys
	_ = db.PutKey("stul-meta/version", appVersion)

	for module, constructor := range moduleList {
		err := constructor(a.manager)
		if err != nil {
			logger.Error("could not register module", zap.String("module", string(module)), zap.Error(err))
		} else {
			//goland:noinspection GoDeferInLoop
			defer func() {
				if err := a.manager.Modules[module].Close(); err != nil {
					logger.Error("could not close module", zap.String("module", string(module)), zap.Error(err))
				}
			}()
		}
	}

	// Create logger and endpoints
	httpServer, err := http.NewServer(a.manager)
	failOnError(err, "could not initialize http server")
	defer func() {
		if err := httpServer.Close(); err != nil {
			logger.Error("could not close DB", zap.Error(err))
		}
	}()

	// Run HTTP server
	go failOnError(httpServer.Listen(), "HTTP server stopped")

	// Wait until server is up
}

func (a *App) stop(context.Context) {
	failOnError(a.driver.Close(), "could not close driver")
}

func (a *App) AuthenticateKVClient(id string) {
	idInt, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return
	}
	a.driver.Hub().SetAuthenticated(idInt, true)
}

func (a *App) IsServerReady() bool {
	return a.manager.Modules[modules.ModuleHTTP].Status().Working
}

func (a *App) GetKilovoltBind() string {
	return a.manager.Modules[modules.ModuleHTTP].Status().Data.(http.StatusData).Bind
}
