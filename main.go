package main

import (
	"embed"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"io/ioutil"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/cockroachdb/pebble"

	"github.com/dgraph-io/badger/v3"
	"github.com/strimertul/strimertul/modules/database"

	kv "github.com/strimertul/kilovolt/v8"

	"go.uber.org/zap/zapcore"

	jsoniter "github.com/json-iterator/go"
	"go.uber.org/zap"

	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/http"
	"github.com/strimertul/strimertul/modules/loyalty"
	"github.com/strimertul/strimertul/modules/stulbe"
	"github.com/strimertul/strimertul/modules/twitch"

	"github.com/pkg/browser"

	_ "net/http/pprof"
)

const AppHeader = `
     _       _               _   O  O _ 
  __| |_ _ _(_)_ __  ___ _ _| |_ _  _| | 
 (_-<  _| '_| | '  \/ -_) '_|  _| || | | 
 /__/\__|_| |_|_|_|_\___|_|  \__|\_,_|_| `

var appVersion = "v0.0.0-UNKNOWN"

//go:embed frontend/dist/*
var frontend embed.FS

var logger *zap.Logger

type ModuleConstructor = func(manager *modules.Manager) error

var moduleList = map[modules.ModuleID]ModuleConstructor{
	modules.ModuleStulbe:  stulbe.Register,
	modules.ModuleLoyalty: loyalty.Register,
	modules.ModuleTwitch:  twitch.Register,
}

type dbOptions struct {
	directory      string
	restore        string
	backupDir      string
	backupInterval int
	maxBackups     int
}

func main() {
	// Get cmd line parameters
	noHeader := flag.Bool("no-header", false, "Do not print the app header")
	dbDir := flag.String("database-dir", "data", "Path to strimertül database dir")
	debug := flag.Bool("debug", false, "Start in debug mode (more logging)")
	json := flag.Bool("json", false, "Print logging in JSON format")
	exportDB := flag.Bool("export", false, "Export database as JSON")
	importDB := flag.String("import", "", "Import database from JSON file")
	restoreDB := flag.String("restore", "", "Restore database from backup file")
	backupDir := flag.String("backup-dir", "backups", "Path to directory with database backups")
	backupInterval := flag.Int("backup-interval", 60, "Backup database every X minutes, 0 to disable")
	maxBackups := flag.Int("max-backups", 20, "Maximum number of backups to keep, older ones will be deleted, set to 0 to keep all")
	driver := flag.String("driver", "auto", "Database driver to use (available: auto, badger, pebble). If 'auto' is specified with no database already in-place, the default driver (badger) will be used.")
	flag.Parse()

	rand.Seed(time.Now().UnixNano())

	if *debug {
		cfg := zap.NewDevelopmentConfig()
		if *json {
			cfg.Encoding = "json"
		}
		logger, _ = cfg.Build()
	} else {
		cfg := zap.NewProductionConfig()
		if !*json {
			cfg.Encoding = "console"
			cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
			cfg.EncoderConfig.CallerKey = zapcore.OmitKey
		}
		logger, _ = cfg.Build()
	}
	defer func() {
		_ = logger.Sync()
	}()
	undo := zap.RedirectStdLog(logger)
	defer undo()

	if !*noHeader {
		// Print the app header and version info
		_, _ = fmt.Fprintf(os.Stderr, "%s\n\n %s - %s/%s (%s)\n\n", AppHeader, appVersion, runtime.GOOS, runtime.GOARCH, runtime.Version())
	}

	// Create module manager
	manager := modules.NewManager(logger)

	// Make KV hub
	var hub *kv.Hub
	var err error
	options := dbOptions{
		directory:      *dbDir,
		restore:        *restoreDB,
		backupDir:      *backupDir,
		backupInterval: *backupInterval,
		maxBackups:     *maxBackups,
	}

	// If driver is not mentioned explicitly, run db detection
	if *driver == "auto" {
		file, err := ioutil.ReadFile(filepath.Join(options.directory, "stul-driver"))
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				*driver = "badger"
			} else {
				failOnError(err, "failed to open database driver file")
			}
		} else {
			*driver = string(file)
		}
	}

	logger.Info("opening database", zap.String("driver", *driver))
	switch *driver {
	case "badger":
		var db *badger.DB
		db, hub, err = makeBadgerHub(options)
		if err != nil {
			logger.Fatal("failed to open database", zap.Error(err))
		}
		defer badgerClose(db)
	case "pebble":
		var db *pebble.DB
		db, hub, err = makePebbleHub(options)
		if err != nil {
			logger.Fatal("failed to open database", zap.Error(err))
		}
		defer pebbleClose(db)
	default:
		logger.Fatal("Unknown database driver", zap.String("driver", *driver))
	}

	go hub.Run()

	db, err := database.NewDBModule(hub, manager)
	failOnError(err, "Failed to initialize database module")

	if *exportDB {
		// Export database to stdout
		data, err := db.GetAll("")
		failOnError(err, "Could not export database")
		failOnError(jsoniter.ConfigFastest.NewEncoder(os.Stdout).Encode(data), "Could not encode database")
		return
	}

	if *importDB != "" {
		file, err := os.Open(*importDB)
		failOnError(err, "Could not open import file")
		var entries map[string]string
		err = jsoniter.ConfigFastest.NewDecoder(file).Decode(&entries)
		failOnError(err, "Could not decode import file")
		errors := 0
		imported := 0
		for key, value := range entries {
			err = db.PutKey(key, value)
			if err != nil {
				logger.Error("Could not import entry", zap.String("key", key), zap.Error(err))
				errors += 1
			} else {
				imported += 1
			}
		}
		logger.Info("Imported database from file", zap.Int("imported", imported), zap.Int("errors", errors))
	}

	// Set meta keys
	_ = db.PutKey("stul-meta/version", appVersion)

	for module, constructor := range moduleList {
		err := constructor(manager)
		if err != nil {
			logger.Error("Could not register module", zap.String("module", string(module)), zap.Error(err))
		} else {
			//goland:noinspection GoDeferInLoop
			defer func() {
				if err := manager.Modules[module].Close(); err != nil {
					logger.Error("Could not close module", zap.String("module", string(module)), zap.Error(err))
				}
			}()
		}
	}

	// Create logger and endpoints
	httpServer, err := http.NewServer(manager)
	failOnError(err, "Could not initialize http server")
	defer func() {
		if err := httpServer.Close(); err != nil {
			logger.Error("Could not close DB", zap.Error(err))
		}
	}()

	fedir, _ := fs.Sub(frontend, "frontend/dist")
	httpServer.SetFrontend(fedir)

	go func() {
		time.Sleep(time.Second) // THIS IS STUPID
		dashboardURL := fmt.Sprintf("http://%s/ui", httpServer.Config.Bind)
		err := browser.OpenURL(dashboardURL)
		if err != nil {
			logger.Warn(fmt.Sprintf("could not open browser, dashboard URL available at: %s", dashboardURL), zap.Error(err))
		}
	}()

	// Start HTTP server
	failOnError(httpServer.Listen(), "HTTP server stopped")
}

func failOnError(err error, text string) {
	if err != nil {
		fatalError(err, text)
	}
}

func fatalError(err error, text string) {
	log.Fatalf("FATAL ERROR OCCURRED: %s\n\n%s", text, err.Error())
}
