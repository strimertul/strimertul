package main

import (
	"context"
	"embed"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"math/rand"
	"runtime"
	"time"

	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/database"
	"github.com/strimertul/strimertul/modules/http"
	"github.com/strimertul/strimertul/modules/loyalty"
	"github.com/strimertul/strimertul/modules/stulbe"
	"github.com/strimertul/strimertul/modules/twitch"

	"github.com/dgraph-io/badger/v3"
	"github.com/mattn/go-colorable"
	"github.com/pkg/browser"
	"github.com/sirupsen/logrus"

	_ "net/http/pprof"
)

const AppTitle = "strimertül"

const AppHeader = `
     _       _               _   O  O _ 
  __| |_ _ _(_)_ __  ___ _ _| |_ _  _| | 
 (_-<  _| '_| | '  \/ -_) '_|  _| || | | 
 /__/\__|_| |_|_|_|_\___|_|  \__|\_,_|_| `

var appVersion = "v0.0.0-UNKNOWN"

const DefaultBind = "localhost:4337"

//go:embed frontend/dist/*
var frontend embed.FS

var log = logrus.New()

func parseLogLevel(level string) logrus.Level {
	switch level {
	case "error":
		return logrus.ErrorLevel
	case "warn", "warning":
		return logrus.WarnLevel
	case "info", "notice":
		return logrus.InfoLevel
	case "debug":
		return logrus.DebugLevel
	case "trace":
		return logrus.TraceLevel
	default:
		return logrus.InfoLevel
	}
}

func main() {
	// Get cmd line parameters
	noheader := flag.Bool("noheader", false, "Do not print the app header")
	dbdir := flag.String("dbdir", "data", "Path to strimertül database dir")
	loglevel := flag.String("loglevel", "info", "Logging level (debug, info, warn, error)")
	flag.Parse()

	rand.Seed(time.Now().UnixNano())

	log.SetLevel(parseLogLevel(*loglevel))

	// Ok this is dumb but listen, I like colors.
	if runtime.GOOS == "windows" {
		log.SetFormatter(&logrus.TextFormatter{ForceColors: true})
		log.SetOutput(colorable.NewColorableStdout())
	}

	if !*noheader {
		// Print the app header :D
		fmt.Println(AppHeader)
		// Print version info
		fmt.Printf("\n %s - %s/%s (%s)\n\n", appVersion, runtime.GOOS, runtime.GOARCH, runtime.Version())
	}

	// Create module manager
	manager := modules.NewManager(log)

	// Loading routine
	db, err := database.Open(badger.DefaultOptions(*dbdir), manager)
	failOnError(err, "Could not open DB")
	defer db.Close()

	// Set meta keys
	_ = db.PutKey("stul-meta/version", []byte(appVersion))

	// Check if onboarding was completed
	var moduleConfig modules.ModuleConfig
	err = db.GetJSON(modules.ModuleConfigKey, &moduleConfig)
	if err != nil {
		if errors.Is(err, badger.ErrKeyNotFound) {
			moduleConfig = modules.ModuleConfig{CompletedOnboarding: false}
		} else {
			fatalError(err, "Could not read from DB")
		}
	}

	// Bootstrap if needed
	if !moduleConfig.CompletedOnboarding {
		// Initialize DB as empty and default endpoint
		failOnError(db.PutJSON(http.ServerConfigKey, http.ServerConfig{
			Bind: DefaultBind,
		}), "could not save http config")

		failOnError(db.PutJSON(modules.ModuleConfigKey, modules.ModuleConfig{
			EnableTwitch:        false,
			EnableStulbe:        false,
			CompletedOnboarding: true,
		}), "could not save onboarding config")
		fmt.Printf("It appears this is your first time running %s! Please go to http://%s and make sure to configure anything you want!\n\n", AppTitle, DefaultBind)
	}

	if moduleConfig.EnableStulbe {
		stulbeManager, err := stulbe.Initialize(manager)
		if err != nil {
			log.WithError(err).Error("Stulbe initialization failed!")
		} else {
			defer stulbeManager.Close()
		}
	}

	if moduleConfig.EnableLoyalty {
		loyaltyManager, err := loyalty.NewManager(manager)
		if err != nil {
			log.WithError(err).Error("Loyalty initialization failed!")
		} else {
			defer loyaltyManager.Close()
		}
	}

	if moduleConfig.EnableTwitch {
		// Create Twitch client
		twitchModule, err := twitch.NewClient(manager)
		if err != nil {
			log.WithError(err).Error("Twitch initialization failed!")
		} else {
			defer twitchModule.Close()
		}
	}

	// Create logger and endpoints
	httpServer, err := http.NewServer(manager)
	failOnError(err, "Could not initialize http server")
	defer httpServer.Close()

	fedir, _ := fs.Sub(frontend, "frontend/dist")
	httpServer.SetFrontend(fedir)

	go func() {
		time.Sleep(time.Second) // THIS IS STUPID
		dashboardURL := fmt.Sprintf("http://%s/ui", httpServer.Config.Bind)
		err := browser.OpenURL(dashboardURL)
		if err != nil {
			log.WithError(err).Warnf("could not open browser, dashboard URL available at: %s", dashboardURL)
		}
	}()

	go func() {
		err := db.Subscribe(context.Background(), func(changed []database.ModifiedKV) error {
			for _, pair := range changed {
				if pair.Key == modules.ModuleConfigKey {
					//TODO Enable/disable modules
				}
			}
			return nil
		}, modules.ModuleConfigKey)
		log.WithError(err).Error("Error while listening to module config changes")
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
