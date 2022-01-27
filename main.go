package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"math/rand"
	"os"
	"runtime"
	"time"

	"go.uber.org/zap/zapcore"

	jsoniter "github.com/json-iterator/go"
	"go.uber.org/zap"

	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/database"
	"github.com/strimertul/strimertul/modules/http"
	"github.com/strimertul/strimertul/modules/loyalty"
	"github.com/strimertul/strimertul/modules/stulbe"
	"github.com/strimertul/strimertul/modules/twitch"

	"github.com/dgraph-io/badger/v3"
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

func main() {
	// Get cmd line parameters
	noHeader := flag.Bool("no-header", false, "Do not print the app header")
	dbDir := flag.String("database-dir", "data", "Path to strimertül database dir")
	debug := flag.Bool("debug", false, "Start in debug mode (more logging)")
	json := flag.Bool("json", false, "Print logging in JSON format")
	cleanup := flag.Bool("run-gc", false, "Run garbage collection and exit immediately after")
	exportDB := flag.Bool("export", false, "Export database as JSON")
	importDB := flag.String("import", "", "Import database from JSON file")
	restoreDB := flag.String("restore", "", "Restore database from backup file")
	backupDir := flag.String("backup-dir", "backups", "Path to directory with database backups")
	backupInterval := flag.Int("backup-interval", 60, "Backup database every X minutes, 0 to disable")
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
	defer logger.Sync()
	undo := zap.RedirectStdLog(logger)
	defer undo()

	if !*noHeader {
		// Print the app header and version info
		_, _ = fmt.Fprintf(os.Stderr, "%s\n\n %s - %s/%s (%s)\n\n", AppHeader, appVersion, runtime.GOOS, runtime.GOARCH, runtime.Version())
	}

	// Create module manager
	manager := modules.NewManager(logger)

	// Loading routine
	db, err := database.Open(badger.DefaultOptions(*dbDir), manager)
	failOnError(err, "Could not open DB")
	defer func() {
		if err := db.Close(); err != nil {
			logger.Error("Could not close DB", zap.Error(err))
		}
	}()

	if *cleanup {
		// Run DB garbage collection until it's done
		var err error
		for err == nil {
			err = db.Client().RunValueLogGC(0.5)
		}
		return
	}

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
			err = db.PutKey(key, []byte(value))
			if err != nil {
				logger.Error("Could not import entry", zap.String("key", key), zap.Error(err))
				errors += 1
			} else {
				imported += 1
			}
		}
		_ = db.Client().Sync()
		logger.Info("Imported database from file", zap.Int("imported", imported), zap.Int("errors", errors))
	}

	if *restoreDB != "" {
		file, err := os.Open(*restoreDB)
		failOnError(err, "Could not open backup")
		err = db.RestoreOverwrite(file)
		failOnError(err, "Could not restore database")
		_ = db.Client().Sync()
		logger.Info("Restored database from backup")
	}

	// Set meta keys
	_ = db.PutKey("stul-meta/version", []byte(appVersion))

	runMigrations(db)

	for module, constructor := range moduleList {
		err := constructor(manager)
		if err != nil {
			logger.Error("Could not register module", zap.String("module", string(module)))
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

	// Run garbage collection every once in a while
	go func() {
		ticker := time.NewTicker(15 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			// Run DB garbage collection until it's done
			var err error
			for err == nil {
				err = db.Client().RunValueLogGC(0.5)
			}
		}
	}()

	// Backup database periodically
	go func() {
		if *backupDir == "" {
			logger.Warn("Backup directory not set, database backups are disabled (this is dangerous, power loss will result in your database being potentially wiped!)")
			return
		}

		err := os.MkdirAll(*backupDir, 0755)
		if err != nil {
			logger.Error("Could not create backup directory, moving to a temporary folder", zap.Error(err))
			*backupDir = os.TempDir()
			logger.Info("Using temporary directory", zap.String("backup-dir", *backupDir))
			return
		}

		ticker := time.NewTicker(time.Duration(*backupInterval) * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			// Run backup procedure
			file, err := os.Create(fmt.Sprintf("%s/%s.db", *backupDir, time.Now().Format("20060102-150405")))
			if err != nil {
				logger.Error("Could not create backup file", zap.Error(err))
				continue
			}
			_, err = db.Client().Backup(file, 0)
			if err != nil {
				logger.Error("Could not backup database", zap.Error(err))
			}
			_ = file.Close()
			logger.Info("Database backed up", zap.String("backup-file", file.Name()))
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
