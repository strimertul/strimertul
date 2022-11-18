package main

import (
	"embed"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/urfave/cli/v2"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/loyalty"
	"github.com/strimertul/strimertul/modules/stulbe"
	"github.com/strimertul/strimertul/modules/twitch"

	_ "net/http/pprof"
)

const databaseDefaultDriver = "pebble"

var appVersion = "v0.0.0-UNKNOWN"

var logger *zap.Logger

//go:embed frontend/dist/*
var frontend embed.FS

type ModuleConstructor = func(manager *modules.Manager) error

var moduleList = map[modules.ModuleID]ModuleConstructor{
	modules.ModuleStulbe:  stulbe.Register,
	modules.ModuleLoyalty: loyalty.Register,
	modules.ModuleTwitch:  twitch.Register,
}

func main() {
	app := &cli.App{
		Name:    "strimertul",
		Usage:   "the small broadcasting suite for Twitch",
		Version: appVersion,
		Action:  cliMain,
		Flags: []cli.Flag{
			&cli.BoolFlag{Name: "debug", Aliases: []string{"d"}, Usage: "print more logs (for debugging)", Value: false},
			&cli.BoolFlag{Name: "json-log", Usage: "print logs in JSON format", Value: false},
			&cli.StringFlag{Name: "driver", Usage: "specify database driver", Value: "auto"},
			&cli.StringFlag{Name: "database-dir", Aliases: []string{"db-dir"}, Usage: "specify database directory", Value: "data"},
			&cli.StringFlag{Name: "backup-dir", Aliases: []string{"b-dir"}, Usage: "specify backup directory", Value: "backups"},
			&cli.IntFlag{Name: "backup-interval", Aliases: []string{"b-i"}, Usage: "specify backup interval (in minutes, 0 to disable)", Value: 60},
			&cli.IntFlag{Name: "max-backups", Aliases: []string{"b-max"}, Usage: "maximum number of backups to keep, older ones will be deleted, set to 0 to keep all", Value: 20},
		},
		Commands: []*cli.Command{
			{
				Name:      "import",
				Usage:     "import database from JSON file",
				ArgsUsage: "[-f input.json]",
				Flags: []cli.Flag{
					&cli.StringFlag{Name: "file", Aliases: []string{"f"}, Usage: "file to open", DefaultText: "STDIN"},
				},
				Action: cliImport,
			},
			{
				Name:      "export",
				Usage:     "export database as JSON file",
				ArgsUsage: "[-f output.json]",
				Flags: []cli.Flag{
					&cli.StringFlag{Name: "file", Aliases: []string{"f"}, Usage: "file to save to", DefaultText: "STDOUT"},
				},
				Action: cliExport,
			},
			{
				Name:      "restore",
				Usage:     "restore database from backup",
				ArgsUsage: "[-f backup.db]",
				Flags: []cli.Flag{
					&cli.StringFlag{Name: "file", Aliases: []string{"f"}, Usage: "backup to open", DefaultText: "STDOUT"},
				},
				Action: cliRestore,
			},
		},
		Before: func(ctx *cli.Context) error {
			// Seed RNG
			rand.Seed(time.Now().UnixNano())

			// Initialize logger with global flags
			initLogger(ctx.Bool("debug"), ctx.Bool("json-log"))
			return nil
		},
		After: func(ctx *cli.Context) error {
			_ = logger.Sync()
			zap.RedirectStdLog(logger)()
			return nil
		},
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}

func initLogger(debug bool, json bool) {
	if debug {
		cfg := zap.NewDevelopmentConfig()
		if json {
			cfg.Encoding = "json"
		}
		logger, _ = cfg.Build()
	} else {
		cfg := zap.NewProductionConfig()
		if !json {
			cfg.Encoding = "console"
			cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
			cfg.EncoderConfig.CallerKey = zapcore.OmitKey
		}
		logger, _ = cfg.Build()
	}
}

func cliMain(ctx *cli.Context) error {
	// Create an instance of the app structure
	app := NewApp(ctx)

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "strimertul",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: frontend,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.stop,
		Bind: []interface{}{
			app,
		},
	})
	if err != nil {
		return cli.Exit(fmt.Errorf("%s: %w", "App exited unexpectedly", err), 1)
	}
	return nil
}

func failOnError(err error, text string) {
	if err != nil {
		logger.Fatal(text, zap.Error(err))
	}
}

func fatalError(err error, text string) error {
	return cli.Exit(fmt.Errorf("%s: %w", text, err), 1)
}
