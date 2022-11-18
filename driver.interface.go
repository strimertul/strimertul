package main

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"time"

	kv "github.com/strimertul/kilovolt/v9"
	"github.com/strimertul/strimertul/utils"
	"github.com/urfave/cli/v2"
	"go.uber.org/zap"
)

// DatabaseDriver is a driver wrapping a supported database
type DatabaseDriver interface {
	Hub() *kv.Hub
	Close() error
	Import(map[string]string) error
	Export(io.Writer) error
	Restore(io.Reader) error
	Backup(io.Writer) error
}

func BackupTask(driver DatabaseDriver, options BackupOptions) {
	if options.BackupDir == "" {
		logger.Warn("backup directory not set, database backups are disabled")
		return
	}

	err := os.MkdirAll(options.BackupDir, 0o755)
	if err != nil {
		logger.Error("could not create backup directory, moving to a temporary folder", zap.Error(err))
		options.BackupDir = os.TempDir()
		logger.Info("using temporary directory", zap.String("backup-dir", options.BackupDir))
		return
	}

	ticker := time.NewTicker(time.Duration(options.BackupInterval) * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		// Run backup procedure
		file, err := os.Create(fmt.Sprintf("%s/%s.db", options.BackupDir, time.Now().Format("20060102-150405")))
		if err != nil {
			logger.Error("could not create backup file", zap.Error(err))
			continue
		}
		err = driver.Backup(file)
		if err != nil {
			logger.Error("could not backup database", zap.Error(err))
		}
		_ = file.Close()
		logger.Info("database backed up", zap.String("backup-file", file.Name()))
		// Remove old backups
		files, err := os.ReadDir(options.BackupDir)
		if err != nil {
			logger.Error("could not read backup directory", zap.Error(err))
			continue
		}
		// If maxBackups is set, remove older backups when we reach the limit
		if options.MaxBackups > 0 && len(files) > options.MaxBackups {
			// Sort by date
			sort.Sort(utils.ByDate(files))
			// Get files to remove
			toRemove := files[:len(files)-options.MaxBackups]
			for _, file := range toRemove {
				err = os.Remove(fmt.Sprintf("%s/%s", options.BackupDir, file.Name()))
				if err != nil {
					logger.Error("could not remove backup file", zap.Error(err))
				}
			}
		}
	}
}

type BackupOptions struct {
	BackupDir      string
	BackupInterval int
	MaxBackups     int
}

func getDatabaseDriverName(ctx *cli.Context) string {
	driver := ctx.String("driver")
	if driver != "auto" {
		return driver
	}

	dbdir := ctx.String("database-dir")
	file, err := os.ReadFile(filepath.Join(dbdir, "stul-driver"))
	if err != nil {
		// No driver file found (or file corrupted), use default driver
		return databaseDefaultDriver
	}
	return string(file)
}

func getDatabaseDriver(ctx *cli.Context) (DatabaseDriver, error) {
	name := getDatabaseDriverName(ctx)
	dbdir := ctx.String("database-dir")

	switch name {
	case "badger":
		return nil, cli.Exit("Badger is not supported anymore as a database driver", 64)
	case "pebble":
		return NewPebble(dbdir)
	default:
		return nil, cli.Exit(fmt.Sprintf("Unknown database driver: %s", name), 64)
	}
}
