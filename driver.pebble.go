package main

import (
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/cockroachdb/pebble"
	jsoniter "github.com/json-iterator/go"
	kv "github.com/strimertul/kilovolt/v8"
	pebble_driver "github.com/strimertul/kv-pebble"
	"go.uber.org/zap"

	"github.com/strimertul/strimertul/utils"
)

func makePebbleHub(directory string, options dbOptions) (*pebble.DB, *kv.Hub, error) {
	db, err := pebble.Open(directory, &pebble.Options{})
	if err != nil {
		return nil, nil, fmt.Errorf("Could not open DB: %w", err)
	}

	// Create file for autodetect
	err = ioutil.WriteFile(filepath.Join(directory, "stul-driver"), []byte("pebble"), 0644)
	if err != nil {
		return nil, nil, fmt.Errorf("Could not write driver file: %w", err)
	}
	// Backup database periodically
	go func() {
		if options.backupDir == "" {
			logger.Warn("Backup directory not set, database backups are disabled")
			return
		}

		err := os.MkdirAll(options.backupDir, 0755)
		if err != nil {
			logger.Error("Could not create backup directory, moving to a temporary folder", zap.Error(err))
			options.backupDir = os.TempDir()
			logger.Info("Using temporary directory", zap.String("backup-dir", options.backupDir))
			return
		}

		ticker := time.NewTicker(time.Duration(options.backupInterval) * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			// Run backup procedure
			file, err := os.Create(fmt.Sprintf("%s/%s.db", options.backupDir, time.Now().Format("20060102-150405")))
			if err != nil {
				logger.Error("Could not create backup file", zap.Error(err))
				continue
			}
			err = pebbleBackup(db, file)
			if err != nil {
				logger.Error("Could not backup database", zap.Error(err))
			}
			_ = file.Close()
			logger.Info("Database backed up", zap.String("backup-file", file.Name()))
			// Remove old backups
			files, err := os.ReadDir(options.backupDir)
			if err != nil {
				logger.Error("Could not read backup directory", zap.Error(err))
				continue
			}
			// If maxBackups is set, remove older backups when we reach the limit
			if options.maxBackups > 0 && len(files) > options.maxBackups {
				// Sort by date
				sort.Sort(utils.ByDate(files))
				// Get files to remove
				toRemove := files[:len(files)-options.maxBackups]
				for _, file := range toRemove {
					err = os.Remove(fmt.Sprintf("%s/%s", options.backupDir, file.Name()))
					if err != nil {
						logger.Error("Could not remove backup file", zap.Error(err))
					}
				}
			}
		}
	}()

	hub, err := kv.NewHub(pebble_driver.NewPebbleBackend(db, true), kv.HubOptions{}, logger)
	return db, hub, err
}

func pebbleImport(directory string, entries map[string]string) error {
	db, err := pebble.Open(directory, &pebble.Options{})
	if err != nil {
		return fmt.Errorf("Could not open DB: %w", err)
	}
	defer db.Close()

	batch := db.NewBatch()
	for key, value := range entries {
		batch.Set([]byte(key), []byte(value), &pebble.WriteOptions{})
	}
	err = batch.Commit(&pebble.WriteOptions{})
	if err != nil {
		return fmt.Errorf("Could not commit changes to database: %w", err)
	}
	return nil
}

func pebbleExport(directory string, file io.Writer) error {
	db, err := pebble.Open(directory, &pebble.Options{})
	if err != nil {
		return fmt.Errorf("Could not open DB: %w", err)
	}
	defer db.Close()

	return pebbleBackup(db, file)
}

func pebbleRestore(directory string, file io.Reader) error {
	db, err := pebble.Open(directory, &pebble.Options{})
	if err != nil {
		return fmt.Errorf("Could not open DB: %w", err)
	}
	defer db.Close()

	in := make(map[string]string)
	err = jsoniter.ConfigFastest.NewDecoder(file).Decode(&in)
	if err != nil {
		return fmt.Errorf("Could not decode backup: %w", err)
	}

	b := db.NewBatch()
	for k, v := range in {
		err = b.Set([]byte(k), []byte(v), nil)
		if err != nil {
			return fmt.Errorf("Could not set key %s: %w", k, err)
		}
	}

	err = b.Commit(&pebble.WriteOptions{Sync: true})
	if err != nil {
		return fmt.Errorf("Could not commit changes to database: %w", err)
	}
	return nil
}

func pebbleClose(db *pebble.DB) error {
	err := db.Close()
	if err != nil {
		return fmt.Errorf("Could not close database: %w", err)
	}
	return nil
}

func pebbleBackup(db *pebble.DB, file io.Writer) error {
	iter := db.NewSnapshot().NewIter(&pebble.IterOptions{})
	out := make(map[string]string)
	for iter.First(); iter.Valid(); iter.Next() {
		out[string(iter.Key())] = string(iter.Value())
	}
	return jsoniter.ConfigFastest.NewEncoder(file).Encode(out)
}
