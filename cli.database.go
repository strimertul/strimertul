package main

import (
	"fmt"
	"os"

	jsoniter "github.com/json-iterator/go"
	"github.com/urfave/cli/v2"
)

func cliImport(ctx *cli.Context) error {
	inStream := os.Stdin
	fileArg := ctx.String("file")
	if fileArg != "" {
		file, err := os.Open(fileArg)
		if err != nil {
			return fatalError(err, "Could not open import file for reading")
		}
		defer file.Close()
		inStream = file
	}
	var entries map[string]string
	err := jsoniter.ConfigFastest.NewDecoder(inStream).Decode(&entries)
	if err != nil {
		return fatalError(err, "Could not decode import file")
	}

	driver := getDatabaseDriver(ctx)
	dbdir := ctx.String("database-dir")
	switch driver {
	case "badger":
		return cli.Exit("Badger is not supported anymore as a database driver", 64)
	case "pebble":
		err := pebbleImport(dbdir, entries)
		if err != nil {
			return fatalError(err, "Could not import keys into database")
		}
	default:
		return cli.Exit(fmt.Sprintf("Unknown database driver: %s", driver), 64)
	}

	logger.Info("Imported database from file")
	return nil
}

func cliRestore(ctx *cli.Context) error {
	inStream := os.Stdin
	fileArg := ctx.String("file")
	if fileArg != "" {
		file, err := os.Open(fileArg)
		if err != nil {
			return fatalError(err, "Could not open import file for reading")
		}
		defer file.Close()
		inStream = file
	}

	driver := getDatabaseDriver(ctx)
	dbdir := ctx.String("database-dir")
	switch driver {
	case "badger":
		return cli.Exit("Badger is not supported anymore as a database driver", 64)
	case "pebble":
		err := pebbleRestore(dbdir, inStream)
		if err != nil {
			return fatalError(err, "Could not restore backup")
		}
	default:
		return cli.Exit(fmt.Sprintf("Unknown database driver: %s", driver), 64)
	}

	logger.Info("Restored database from backup")
	return nil
}

func cliExport(ctx *cli.Context) error {
	outStream := os.Stdout
	fileArg := ctx.String("file")
	if fileArg != "" {
		file, err := os.Create(fileArg)
		if err != nil {
			return fatalError(err, "Could not open output file for writing")
		}
		defer file.Close()
		outStream = file
	}

	driver := getDatabaseDriver(ctx)
	dbdir := ctx.String("database-dir")
	switch driver {
	case "badger":
		return cli.Exit("Badger is not supported anymore as a database driver", 64)
	case "pebble":
		err := pebbleExport(dbdir, outStream)
		if err != nil {
			return fatalError(err, "Could not import keys into database")
		}
	default:
		return cli.Exit(fmt.Sprintf("Unknown database driver: %s", driver), 64)
	}

	logger.Info("Exported database")
	return nil
}
