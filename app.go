package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	nethttp "net/http"
	"os"
	"runtime/debug"
	"strconv"

	"git.sr.ht/~hamcha/containers/sync"
	"github.com/nicklaw5/helix/v2"
	"github.com/postfinance/single"
	"github.com/urfave/cli/v2"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"go.uber.org/zap"

	"github.com/strimertul/strimertul/database"
	"github.com/strimertul/strimertul/docs"
	"github.com/strimertul/strimertul/http"
	"github.com/strimertul/strimertul/loyalty"
	"github.com/strimertul/strimertul/twitch"
)

// App struct
type App struct {
	ctx           context.Context
	lock          *single.Single
	cliParams     *cli.Context
	driver        database.DatabaseDriver
	ready         *sync.RWSync[bool]
	isFatalError  *sync.RWSync[bool]
	backupOptions database.BackupOptions

	db             *database.LocalDBClient
	twitchManager  *twitch.Manager
	httpServer     *http.Server
	loyaltyManager *loyalty.Manager
}

// NewApp creates a new App application struct
func NewApp(cliParams *cli.Context) *App {
	return &App{
		cliParams:    cliParams,
		ready:        sync.NewRWSync(false),
		isFatalError: sync.NewRWSync(false),
	}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	// Ensure only one copy of strimertul is running at all times
	var err error
	a.lock, err = single.New("strimertul")
	if err != nil {
		log.Fatal(err)
	}
	if err = a.lock.Lock(); err != nil {
		_, _ = runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "strimertul is already running",
			Message: "Only one copy of strimertul can run at the same time, make sure to close other instances first",
		})
		log.Fatal(err)
	}

	defer func() {
		if r := recover(); r != nil {
			a.stop(ctx)
			_ = logger.Sync()
			switch v := r.(type) {
			case error:
				a.showFatalError(v, v.Error())
			default:
				a.showFatalError(errors.New(fmt.Sprint(v)), "Runtime error encountered")
			}
		}
	}()

	a.ctx = ctx
	a.backupOptions = database.BackupOptions{
		BackupDir:      a.cliParams.String("backup-dir"),
		BackupInterval: a.cliParams.Int("backup-interval"),
		MaxBackups:     a.cliParams.Int("max-backups"),
	}

	// Make KV hub
	a.driver, err = database.GetDatabaseDriver(a.cliParams)
	if err != nil {
		a.showFatalError(err, "Error opening database")
		return
	}

	// Start database backup task
	if a.backupOptions.BackupInterval > 0 {
		go BackupTask(a.driver, a.backupOptions)
	}

	hub := a.driver.Hub()
	go hub.Run()

	a.db, err = database.NewLocalClient(hub, logger)
	if err != nil {
		a.showFatalError(err, "Failed to initialize database module")
		return
	}

	// Set meta keys
	_ = a.db.PutKey("stul-meta/version", appVersion)

	// Create logger and endpoints
	a.httpServer, err = http.NewServer(a.db, logger)
	if err != nil {
		a.showFatalError(err, "Could not initialize http server")
		return
	}

	// Create twitch client
	a.twitchManager, err = twitch.NewManager(a.db, a.httpServer, logger)
	if err != nil {
		a.showFatalError(err, "Could not initialize twitch client")
		return
	}

	// Initialize loyalty system
	a.loyaltyManager, err = loyalty.NewManager(a.db, a.twitchManager, logger)
	if err != nil {
		a.showFatalError(err, "Could not initialize loyalty manager")
		return
	}

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
	if err := a.httpServer.Listen(); err != nil {
		a.showFatalError(err, "HTTP server stopped")
		return
	}
}

func (a *App) stop(context.Context) {
	if a.lock != nil {
		warnOnError(a.lock.Unlock(), "could not remove lock file")
	}
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

func (a *App) IsFatalError() bool {
	return a.isFatalError.Get()
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

func (a *App) SendCrashReport(errorData string, info string) (string, error) {
	var b bytes.Buffer
	w := multipart.NewWriter(&b)

	// Add text fields
	if err := w.WriteField("error", errorData); err != nil {
		logger.Error("could not encode field error for crash report", zap.Error(err))
	}
	if len(info) > 0 {
		if err := w.WriteField("info", info); err != nil {
			logger.Error("could not encode field info for crash report", zap.Error(err))
		}
	}

	// Add log files
	_ = logger.Sync()
	addFile(w, "log", logFilename)
	addFile(w, "paniclog", panicFilename)

	if err := w.Close(); err != nil {
		logger.Error("could not prepare request for crash report", zap.Error(err))
		return "", err
	}

	resp, err := nethttp.Post(crashReportURL, w.FormDataContentType(), &b)
	if err != nil {
		logger.Error("could not send crash report", zap.Error(err))
		return "", err
	}

	// Check the response
	if resp.StatusCode != nethttp.StatusOK {
		byt, _ := io.ReadAll(resp.Body)
		logger.Error("crash report server returned error", zap.String("status", resp.Status), zap.String("response", string(byt)))
		return "", fmt.Errorf("crash report server returned error: %s - %s", resp.Status, string(byt))
	}

	byt, err := io.ReadAll(resp.Body)
	return string(byt), err
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

func (a *App) showFatalError(err error, text string, fields ...zap.Field) {
	if err != nil {
		fields = append(fields, zap.Error(err))
		fields = append(fields, zap.String("Z", string(debug.Stack())))
		logger.Error(text, fields...)
		runtime.EventsEmit(a.ctx, "fatalError")
		a.isFatalError.Set(true)
	}
}

func addFile(m *multipart.Writer, field string, filename string) {
	logfile, err := m.CreateFormFile(field, filename)
	if err != nil {
		logger.Error("could not encode field log for crash report", zap.Error(err))
		return
	}

	file, err := os.Open(filename)
	if err != nil {
		logger.Error("could not open file for including in crash report", zap.Error(err), zap.String("file", filename))
		return
	}

	if _, err = io.Copy(logfile, file); err != nil {
		logger.Error("could not read from file for including in crash report", zap.Error(err), zap.String("file", filename))
	}
}
