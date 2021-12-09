package main

import (
	"embed"
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

type ModuleConstructor = func(manager *modules.Manager) error

var moduleList = map[modules.ModuleID]ModuleConstructor{
	modules.ModuleTwitch:  twitch.Register,
	modules.ModuleStulbe:  stulbe.Register,
	modules.ModuleLoyalty: loyalty.Register,
}

func main() {
	// Get cmd line parameters
	noheader := flag.Bool("noheader", false, "Do not print the app header")
	dbdir := flag.String("dbdir", "data", "Path to strimertül database dir")
	loglevel := flag.String("loglevel", "info", "Logging level (debug, info, warn, error)")
	cleanup := flag.Bool("run-gc", false, "Run garbage collection and exit immediately after")
	flag.Parse()

	rand.Seed(time.Now().UnixNano())

	log.SetLevel(parseLogLevel(*loglevel))

	// Ok this is dumb but listen, I like colors.
	if runtime.GOOS == "windows" {
		log.SetFormatter(&logrus.TextFormatter{ForceColors: true, FullTimestamp: true})
		log.SetOutput(colorable.NewColorableStdout())
	} else {
		log.SetFormatter(&logrus.TextFormatter{FullTimestamp: true})
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

	if *cleanup {
		// Run DB garbage collection until it's done
		var err error
		for err == nil {
			err = db.Client().RunValueLogGC(0.5)
		}
		return
	}

	// Set meta keys
	_ = db.PutKey("stul-meta/version", []byte(appVersion))

	runMigrations(db)

	for module, constructor := range moduleList {
		err := constructor(manager)
		if err != nil {
			log.WithError(err).WithField("module", module).Error("Could not register module")
		} else {
			//goland:noinspection GoDeferInLoop
			defer func() {
				if err := manager.Modules[module].Close(); err != nil {
					log.WithError(err).WithField("module", module).Error("Could not close module")
				}
			}()
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
