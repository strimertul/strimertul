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

	kv "github.com/strimertul/kilovolt/v10"

	"git.sr.ht/~hamcha/containers/sync"
	"github.com/nicklaw5/helix/v2"
	"github.com/postfinance/single"
	"github.com/urfave/cli/v2"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"go.uber.org/zap"

	"github.com/strimertul/strimertul/database"
	"github.com/strimertul/strimertul/docs"
	"github.com/strimertul/strimertul/loyalty"
	"github.com/strimertul/strimertul/twitch"
	"github.com/strimertul/strimertul/webserver"
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
	httpServer     *webserver.WebServer
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

	logger.Info("Started", zap.String("version", appVersion))

	a.ctx = ctx

	a.backupOptions = database.BackupOptions{
		BackupDir:      a.cliParams.String("backup-dir"),
		BackupInterval: a.cliParams.Int("backup-interval"),
		MaxBackups:     a.cliParams.Int("max-backups"),
	}

	// Initialize database
	if err = a.initializeDatabase(); err != nil {
		a.showFatalError(err, "Failed to initialize database")
		return
	}

	// Initialize components
	if err = a.initializeComponents(); err != nil {
		a.showFatalError(err, "Failed to initialize required component")
		return
	}

	// Set meta keys
	_ = a.db.PutKey("stul-meta/version", appVersion)

	a.ready.Set(true)
	runtime.EventsEmit(ctx, "ready", true)
	logger.Info("Strimertul is ready")

	// Start redirecting logs to UI
	go a.forwardLogs()

	// Run HTTP server
	if err = a.httpServer.Listen(); err != nil {
		a.showFatalError(err, "HTTP server stopped")
		return
	}
}

func (a *App) initializeDatabase() error {
	var err error

	// Make KV hub
	a.driver, err = database.GetDatabaseDriver(a.cliParams)
	if err != nil {
		return fmt.Errorf("could not get database driver: %w", err)
	}

	// Start database backup task
	if a.backupOptions.BackupInterval > 0 {
		go BackupTask(a.driver, a.backupOptions)
	}

	hub := a.driver.Hub()
	go hub.Run()
	hub.UseInteractiveAuth(a.interactiveAuth)

	a.db, err = database.NewLocalClient(hub, logger)
	if err != nil {
		return fmt.Errorf("could not initialize database client: %w", err)
	}

	return nil
}

func (a *App) initializeComponents() error {
	var err error

	// Create logger and endpoints
	a.httpServer, err = webserver.NewServer(a.db, logger, webserver.DefaultServerFactory)
	if err != nil {
		return fmt.Errorf("could not initialize http server: %w", err)
	}

	// Create twitch client
	a.twitchManager, err = twitch.NewManager(a.db, a.httpServer, logger)
	if err != nil {
		return fmt.Errorf("could not initialize twitch client: %w", err)
	}

	// Initialize loyalty system
	a.loyaltyManager, err = loyalty.NewManager(a.db, a.twitchManager, logger)
	if err != nil {
		return fmt.Errorf("could not initialize loyalty manager: %w", err)
	}

	return nil
}

func (a *App) forwardLogs() {
	for entry := range incomingLogs {
		runtime.EventsEmit(a.ctx, "log-event", entry)
	}
}

func (a *App) stop(context.Context) {
	if a.lock != nil {
		warnOnError(a.lock.Unlock(), "Could not remove lock file")
	}
	if a.loyaltyManager != nil {
		warnOnError(a.loyaltyManager.Close(), "Could not cleanly close loyalty manager")
	}
	if a.twitchManager != nil {
		warnOnError(a.twitchManager.Close(), "Could not cleanly close twitch client")
	}
	if a.httpServer != nil {
		warnOnError(a.httpServer.Close(), "Could not cleanly close HTTP server")
	}
	warnOnError(a.db.Close(), "Could not cleanly close database")

	warnOnError(a.driver.Close(), "Could not close driver")
}

func (a *App) AuthenticateKVClient(id string) {
	idInt, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return
	}
	warnOnError(a.driver.Hub().SetAuthenticated(idInt, true), "Could not mark session as authenticated", zap.String("session-id", id))
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
		logger.Error("Could not encode field error for crash report", zap.Error(err))
	}
	if len(info) > 0 {
		if err := w.WriteField("info", info); err != nil {
			logger.Error("Could not encode field info for crash report", zap.Error(err))
		}
	}

	// Add log files
	_ = logger.Sync()
	addFile(w, "log", logFilename)
	addFile(w, "paniclog", panicFilename)

	if err := w.Close(); err != nil {
		logger.Error("Could not prepare request for crash report", zap.Error(err))
		return "", err
	}

	resp, err := nethttp.Post(crashReportURL, w.FormDataContentType(), &b)
	if err != nil {
		logger.Error("Could not send crash report", zap.Error(err))
		return "", err
	}

	// Check the response
	if resp.StatusCode != nethttp.StatusOK {
		byt, _ := io.ReadAll(resp.Body)
		logger.Error("Crash report server returned error", zap.String("status", resp.Status), zap.String("response", string(byt)))
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

func (a *App) TestTemplate(message string, data any) error {
	tpl, err := a.twitchManager.Client().Bot.MakeTemplate(message)
	if err != nil {
		return err
	}
	return tpl.Execute(io.Discard, data)
}

func (a *App) TestCommandTemplate(message string) error {
	return a.TestTemplate(message, twitch.TestMessageData)
}

func (a *App) interactiveAuth(client kv.Client, message map[string]any) bool {
	callbackID := fmt.Sprintf("auth-callback-%d", client.UID())
	authResult := make(chan bool)
	runtime.EventsOnce(a.ctx, callbackID, func(optional ...any) {
		if len(optional) == 0 {
			authResult <- false
			return
		}
		val, _ := optional[0].(bool)
		authResult <- val
	})
	runtime.EventsEmit(a.ctx, "interactiveAuth", client.UID(), message, callbackID)

	return <-authResult
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
		logger.Error("Could not encode field log for crash report", zap.Error(err))
		return
	}

	file, err := os.Open(filename)
	if err != nil {
		logger.Error("Could not open file for including in crash report", zap.Error(err), zap.String("file", filename))
		return
	}

	if _, err = io.Copy(logfile, file); err != nil {
		logger.Error("Could not read from file for including in crash report", zap.Error(err), zap.String("file", filename))
	}
}
