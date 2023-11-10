package main

import (
	"context"
	"embed"
	"fmt"
	"log"
	_ "net/http/pprof"
	"os"

	"github.com/apenwarr/fixconsole"
	jsoniter "github.com/json-iterator/go"
	"github.com/urfave/cli/v2"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"git.sr.ht/~ashkeel/strimertul/utils"
)

var json = jsoniter.ConfigFastest

var appVersion = "v0.0.0-UNKNOWN"

const (
	crashReportURL = "https://crash.strimertul.stream/upload"
	logFilename    = "strimertul.log"
	panicFilename  = "strimertul-panic.log"
)

//go:embed frontend/dist
var frontend embed.FS

func main() {
	err := fixconsole.FixConsoleIfNeeded()
	if err != nil {
		log.Fatal(err)
	}

	var panicLog *os.File

	app := &cli.App{
		Name:    "strimertul",
		Usage:   "the small broadcasting suite for Twitch",
		Version: appVersion,
		Action:  cliMain,
		Flags: []cli.Flag{
			&cli.StringFlag{Name: "log-level", Usage: "logging level (debug,info,warn,error)", Value: "info"},
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
			// Initialize logger with global flags
			level, err := zapcore.ParseLevel(ctx.String("log-level"))
			if err != nil {
				level = zapcore.InfoLevel
			}
			initLogger(level)

			// Create file for panics
			panicLog, err = os.OpenFile(panicFilename, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0o666)
			if err != nil {
				logger.Warn("Could not create panic log", zap.Error(err))
			} else {
				utils.RedirectStderr(panicLog)
			}

			zap.RedirectStdLog(logger)()

			ctx.Context = context.WithValue(ctx.Context, utils.ContextLogger, logger)
			return nil
		},
		After: func(ctx *cli.Context) error {
			if panicLog != nil {
				utils.Close(panicLog, logger)
			}

			_ = logger.Sync()

			return nil
		},
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
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
		EnableDefaultContextMenu: true,
		BackgroundColour:         &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:                app.startup,
		OnShutdown:               app.stop,
		OnBeforeClose: func(ctx context.Context) (prevent bool) {
			dialog, err := runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
				Type:    runtime.QuestionDialog,
				Title:   "Quit?",
				Message: "Are you sure you want to quit?",
			})
			if err != nil {
				return false
			}
			return dialog != "Yes"
		},
		Bind: []any{
			app,
		},
	})
	if err != nil {
		return cli.Exit(fmt.Errorf("%s: %w", "App exited unexpectedly", err), 1)
	}
	return nil
}

func warnOnError(err error, text string, fields ...zap.Field) {
	if err != nil {
		fields = append(fields, zap.Error(err))
		logger.Warn(text, fields...)
	}
}

func fatalError(err error, text string) error {
	return cli.Exit(fmt.Errorf("%s: %w", text, err), 1)
}
