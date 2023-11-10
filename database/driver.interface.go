package database

import (
	"fmt"
	"io"
	"os"
	"path/filepath"

	kv "github.com/strimertul/kilovolt/v11"
	"github.com/urfave/cli/v2"
	"go.uber.org/zap"

	"git.sr.ht/~ashkeel/strimertul/utils"
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

type BackupOptions struct {
	BackupDir      string
	BackupInterval int
	MaxBackups     int
}

const databaseDefaultDriver = "pebble"

func getDatabaseDriverName(ctx *cli.Context) string {
	driver := ctx.String("driver")
	if driver != "auto" {
		return driver
	}

	dbDirectory := ctx.String("database-dir")
	file, err := os.ReadFile(filepath.Join(dbDirectory, "stul-driver"))
	if err != nil {
		// No driver file found (or file corrupted), use default driver
		return databaseDefaultDriver
	}
	return string(file)
}

func GetDatabaseDriver(ctx *cli.Context) (DatabaseDriver, error) {
	name := getDatabaseDriverName(ctx)
	dbDirectory := ctx.String("database-dir")
	logger := ctx.Context.Value(utils.ContextLogger).(*zap.Logger)

	switch name {
	case "badger":
		return nil, cli.Exit("Badger is not supported anymore as a database driver", 64)
	case "pebble":
		db, err := NewPebble(dbDirectory, logger)
		if err != nil {
			return nil, cli.Exit(err.Error(), 64)
		}
		return db, nil
	default:
		return nil, cli.Exit(fmt.Sprintf("Unknown database driver: %s", name), 64)
	}
}
