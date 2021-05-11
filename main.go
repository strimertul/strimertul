package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"net/http"
	"runtime"
	"time"

	kv "github.com/strimertul/kilovolt/v3"

	"github.com/strimertul/strimertul/database"
	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/loyalty"
	"github.com/strimertul/strimertul/modules/stulbe"
	"github.com/strimertul/strimertul/twitchbot"

	"github.com/dgraph-io/badger/v3"

	"github.com/pkg/browser"

	"github.com/mattn/go-colorable"
	"github.com/sirupsen/logrus"
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

	log.SetLevel(parseLogLevel(*loglevel))

	// Ok this is dumb but listen, I like colors.
	if runtime.GOOS == "windows" {
		log.SetFormatter(&logrus.TextFormatter{ForceColors: true})
		log.SetOutput(colorable.NewColorableStdout())
	}

	// Print the app header :D
	fmt.Println(AppHeader)

	// Loading routine
	db, err := database.Open(badger.DefaultOptions(*dbdir), wrapLogger("db"))
	failOnError(err, "Could not open DB")
	defer db.Close()

	// Check if onboarding was completed
	var moduleConfig modules.ModuleConfig
	err = db.GetJSON(modules.ModuleConfigKey, &moduleConfig)
	if err != nil {
		if err == badger.ErrKeyNotFound {
			moduleConfig = modules.ModuleConfig{CompletedOnboarding: false}
		} else {
			fatalError(err, "Could not read from DB")
		}
	}

	if !moduleConfig.CompletedOnboarding {
		// Initialize DB as empty and default endpoint
		failOnError(db.PutJSON(modules.HTTPServerConfigKey, modules.HTTPServerConfig{
			Bind: DefaultBind,
		}), "could not save http config")

		failOnError(db.PutJSON(modules.ModuleConfigKey, modules.ModuleConfig{
			EnableKV:            true,
			EnableStaticServer:  false,
			EnableTwitchbot:     false,
			EnableStulbe:        false,
			CompletedOnboarding: true,
		}), "could not save onboarding config")
		fmt.Printf("It appears this is your first time running %s! Please go to http://%s and make sure to configure anything you want!\n\n", AppTitle, DefaultBind)
	}

	// Initialize KV (required)
	hub := kv.NewHub(db.Client(), wrapLogger("kv"))
	go hub.Run()

	// Get HTTP config
	var httpConfig modules.HTTPServerConfig
	failOnError(db.GetJSON(modules.HTTPServerConfigKey, &httpConfig), "Could not retrieve HTTP server config")

	// Get Stulbe config, if enabled
	var stulbeManager *stulbe.Manager = nil
	if moduleConfig.EnableStulbe {
		stulbeManager, err = stulbe.Initialize(db, wrapLogger("stulbe"))
		if err != nil {
			log.WithError(err).Error("Stulbe initialization failed! Module was temporarely disabled")
			moduleConfig.EnableStulbe = false
		}
		defer stulbeManager.Close()
	}

	var loyaltyManager *loyalty.Manager
	loyaltyLogger := wrapLogger("loyalty")
	if moduleConfig.EnableLoyalty {
		loyaltyManager, err = loyalty.NewManager(db, hub, loyaltyLogger)
		if err != nil {
			log.WithError(err).Error("Loyalty initialization failed! Module was temporarely disabled")
			moduleConfig.EnableLoyalty = false
		}

		if stulbeManager != nil {
			go stulbeManager.ReplicateKey(loyalty.ConfigKey)
			go stulbeManager.ReplicateKey(loyalty.GoalsKey)
			go stulbeManager.ReplicateKey(loyalty.RewardsKey)
			go stulbeManager.ReplicateKey(loyalty.PointsKey)
		}
	}

	//TODO Refactor this to something sane
	if moduleConfig.EnableTwitchbot {
		// Create logger
		twitchLogger := wrapLogger("twitchbot")

		// Get Twitchbot config
		var twitchConfig modules.TwitchBotConfig
		failOnError(db.GetJSON(modules.TwitchBotConfigKey, &twitchConfig), "Could not retrieve twitch bot config")

		bot := twitchbot.NewBot(twitchConfig.Username, twitchConfig.Token, twitchLogger)

		if moduleConfig.EnableLoyalty {
			bot.Loyalty = loyaltyManager
			bot.SetBanList(loyaltyManager.Config.BanList)
		}

		bot.Client.Join(twitchConfig.Channel)

		if moduleConfig.EnableLoyalty {
			bot.Client.OnConnect(func() {
				if loyaltyManager.Config.Points.Interval > 0 {
					go func() {
						twitchLogger.Info("loyalty poll started")
						for {
							// Wait for next poll
							time.Sleep(time.Duration(loyaltyManager.Config.Points.Interval) * time.Second)

							// Check if streamer is online, if possible
							streamOnline := true
							if loyaltyManager.Config.LiveCheck && stulbeManager != nil {
								status, err := stulbeManager.Client.StreamStatus(twitchConfig.Channel)
								if err != nil {
									twitchLogger.WithError(err).Error("Error checking stream status")
								} else {
									streamOnline = status != nil
								}
							}

							// If stream is confirmed offline, don't give points away!
							if !streamOnline {
								twitchLogger.Info("loyalty poll active but stream is offline!")
								continue
							}

							// Get user list
							users, err := bot.Client.Userlist(twitchConfig.Channel)
							if err != nil {
								twitchLogger.WithError(err).Error("error listing users")
								continue
							}

							// Iterate for each user in the list
							pointsToGive := make(map[string]int64)
							for _, user := range users {
								// Check if user is blocked
								if bot.IsBanned(user) {
									continue
								}

								// Check if user was active (chatting) for the bonus dingus
								award := loyaltyManager.Config.Points.Amount
								if bot.IsActive(user) {
									award += loyaltyManager.Config.Points.ActivityBonus
								}

								// Add to point pool if already on it, otherwise initialize
								pointsToGive[user] = award
							}

							bot.ResetActivity()

							// If changes were made, save the pool!
							if len(users) > 0 {
								loyaltyManager.GivePoints(pointsToGive)
							}
						}
					}()
				}
			})
		}

		go func() {
			failOnError(bot.Connect(), "connection failed")
		}()
	}

	// Create logger and endpoints
	httpLogger := wrapLogger("http")

	fedir, _ := fs.Sub(frontend, "frontend/dist")
	http.Handle("/ui/", http.StripPrefix("/ui/", FileServerWithDefault(http.FS(fedir))))
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		kv.ServeWs(hub, w, r)
	})
	if moduleConfig.EnableStaticServer {
		http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(httpConfig.Path))))
		httpLogger.WithField("path", httpConfig.Path).Info("serving %s")
	}

	go func() {
		time.Sleep(time.Second) // THIS IS STUPID
		browser.OpenURL(fmt.Sprintf("http://%s/ui", httpConfig.Bind))
	}()

	// Start HTTP server
	fatalError(http.ListenAndServe(httpConfig.Bind, nil), "HTTP server died unexepectedly")
}

func failOnError(err error, text string) {
	if err != nil {
		fatalError(err, text)
	}
}

func fatalError(err error, text string) {
	log.Fatalf("FATAL ERROR OCCURRED: %s\n\n%s", text, err.Error())
}
