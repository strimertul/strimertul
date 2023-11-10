package main

import (
	"os"

	"git.sr.ht/~ashkeel/strimertul/utils"

	"git.sr.ht/~ashkeel/strimertul/database"

	"github.com/urfave/cli/v2"
)

func cliImport(ctx *cli.Context) error {
	inStream := os.Stdin
	fileArg := ctx.String("file")
	if fileArg != "" {
		file, err := os.Open(fileArg)
		if err != nil {
			return fatalError(err, "could not open import file for reading")
		}
		defer utils.Close(file, logger)
		inStream = file
	}
	var entries map[string]string
	err := json.NewDecoder(inStream).Decode(&entries)
	if err != nil {
		return fatalError(err, "could not decode import file")
	}

	driver, err := database.GetDatabaseDriver(ctx)
	if err != nil {
		return fatalError(err, "could not open database")
	}

	err = driver.Import(entries)
	if err != nil {
		return fatalError(err, "import failed")
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
			return fatalError(err, "could not open import file for reading")
		}
		defer utils.Close(file, logger)
		inStream = file
	}

	driver, err := database.GetDatabaseDriver(ctx)
	if err != nil {
		return fatalError(err, "could not open database")
	}

	err = driver.Restore(inStream)
	if err != nil {
		return fatalError(err, "restore failed")
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
			return fatalError(err, "could not open output file for writing")
		}
		defer utils.Close(file, logger)
		outStream = file
	}

	driver, err := database.GetDatabaseDriver(ctx)
	if err != nil {
		return fatalError(err, "could not open database")
	}

	err = driver.Export(outStream)
	if err != nil {
		return fatalError(err, "export failed")
	}

	logger.Info("Exported database")
	return nil
}
