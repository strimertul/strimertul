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

	"github.com/strimertul/strimertul/modules/http"

	kv "github.com/strimertul/kilovolt/v5"

	"github.com/strimertul/strimertul/database"
	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/loyalty"
	"github.com/strimertul/strimertul/modules/stulbe"
	"github.com/strimertul/strimertul/modules/twitch"

	"github.com/dgraph-io/badger/v3"

	"github.com/pkg/browser"

	"github.com/mattn/go-colorable"
	"github.com/sirupsen/logrus"

	_ "net/http/pprof"
)

const AppTitle = "strimertül"

const AppHeader = `
     _       _               _   O  O _ 
  __| |_ _ _(_)_ __  ___ _ _| |_ _  _| | 
 (_-<  _| '_| | '  \/ -_) '_|  _| || | | 
 /__/\__|_| |_|_|_|_\___|_|  \__|\_,_|_| `

const DefaultBind = "localhost:4337"

//go:embed frontend/dist/*
var frontend embed.FS

var log = logrus.New()

func wrapLogger(module string) logrus.FieldLogger {
	return log.WithField("module", module)
}

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
	dbdir := flag.String("dbdir", "data", "Path to strimertul database dir")
	loglevel := flag.String("loglevel", "info", "Logging level (debug, info, warn, error)")
	flag.Parse()

	rand.Seed(time.Now().UnixNano())

	log.SetLevel(parseLogLevel(*loglevel))

	// Ok this is dumb but listen, I like colors.
	if runtime.GOOS == "windows" {
		log.SetFormatter(&logrus.TextFormatter{ForceColors: true})
		log.SetOutput(colorable.NewColorableStdout())
	}

	// Print the app header :D
	fmt.Println(AppHeader)

	// Loading routine
	dblogger := wrapLogger("db")
	db, err := database.Open(badger.DefaultOptions(*dbdir).WithLogger(dblogger), dblogger)
	failOnError(err, "Could not open DB")
	defer func() { logOnError(db.Close(), "Could not close DB") }()

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

	if !moduleConfig.CompletedOnboarding {
		// Initialize DB as empty and default endpoint
		failOnError(db.PutJSON(http.ServerConfigKey, http.ServerConfig{
			Bind: DefaultBind,
		}), "could not save http config")

		failOnError(db.PutJSON(modules.ModuleConfigKey, modules.ModuleConfig{
			EnableKV:            true,
			EnableTwitch:        false,
			EnableStulbe:        false,
			CompletedOnboarding: true,
		}), "could not save onboarding config")
		fmt.Printf("It appears this is your first time running %s! Please go to http://%s and make sure to configure anything you want!\n\n", AppTitle, DefaultBind)
	}

	// Initialize KV (required)
	hub, err := kv.NewHub(db.Client(), wrapLogger("kv"))
	failOnError(err, "Could not initialize kilovolt hub")
	go hub.Run()

	// Get Stulbe config, if enabled
	var stulbeManager *stulbe.Manager = nil
	if moduleConfig.EnableStulbe {
		stulbeLogger := wrapLogger("stulbe")
		stulbeManager, err = stulbe.Initialize(db, stulbeLogger)
		if err != nil {
			log.WithError(err).Error("Stulbe initialization failed! Module was temporarely disabled")
			moduleConfig.EnableStulbe = false
		} else {
			defer stulbeManager.Close()
			go func() {
				err := stulbeManager.ReceiveEvents()
				stulbeLogger.WithError(err).Error("Stulbe subscription died unexpectedly!")
			}()
		}
	}

	var loyaltyManager *loyalty.Manager
	loyaltyLogger := wrapLogger("loyalty")
	if moduleConfig.EnableLoyalty {
		loyaltyManager, err = loyalty.NewManager(db, loyaltyLogger)
		if err != nil {
			log.WithError(err).Error("Loyalty initialization failed! Module was temporarily disabled")
			moduleConfig.EnableLoyalty = false
		}

		if stulbeManager != nil {
			go func() {
				logOnError(stulbeManager.ReplicateKeys([]string{
					loyalty.ConfigKey,
					loyalty.RewardsKey,
					loyalty.GoalsKey,
					loyalty.PointsPrefix,
				}), "Could not replicate loyalty keys")
			}()
		}
	}

	//TODO Refactor this to something sane
	if moduleConfig.EnableTwitch {
		// Create logger
		twitchLogger := wrapLogger("twitch")

		// Create Twitch client
		twitchClient, err := twitch.NewClient(db, twitchLogger)
		if err != nil {
			log.WithError(err).Error("Twitch initialization failed! Module was temporarily disabled")
			moduleConfig.EnableTwitch = false
		} else {
			if twitchClient.Bot != nil && moduleConfig.EnableLoyalty {
				twitchClient.Bot.SetupLoyalty(loyaltyManager)
			}
		}
	}

	// Create logger and endpoints
	httpLogger := wrapLogger("http")
	httpServer, err := http.NewServer(db, httpLogger)
	failOnError(err, "Could not initialize http server")

	fedir, _ := fs.Sub(frontend, "frontend/dist")
	httpServer.SetFrontend(fedir)
	httpServer.SetHub(hub)

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

	// Start HTTP server
	failOnError(httpServer.Listen(), "HTTP server stopped")
}

func failOnError(err error, text string) {
	if err != nil {
		fatalError(err, text)
	}
}

func logOnError(err error, text string) {
	if err != nil {
		log.WithError(err).Error(text)
	}
}

func fatalError(err error, text string) {
	log.Fatalf("FATAL ERROR OCCURRED: %s\n\n%s", text, err.Error())
}
