package main

import (
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"
	"sort"
	"time"

	jsoniter "github.com/json-iterator/go"

	"github.com/cockroachdb/pebble"
	kv "github.com/strimertul/kilovolt/v8"
	pebble_driver "github.com/strimertul/kv-pebble"
	"go.uber.org/zap"
)

func makePebbleHub(options dbOptions) (*pebble.DB, *kv.Hub, error) {
	db, err := pebble.Open(options.directory, &pebble.Options{})
	failOnError(err, "Could not open DB")

	// Create file for autodetect
	err = ioutil.WriteFile(filepath.Join(options.directory, "stul-driver"), []byte("pebble"), 0644)
	failOnError(err, "Could not write driver file")

	if options.restore != "" {
		file, err := os.Open(options.restore)
		failOnError(err, "Could not open backup")
		failOnError(pebbleRestoreOverwrite(db, file), "Could not restore database")
		logger.Info("Restored database from backup")
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
				sort.Sort(ByDate(files))
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

func pebbleClose(db *pebble.DB) {
	err := db.Close()
	failOnError(err, "Could not close database")
}

func pebbleBackup(db *pebble.DB, file io.Writer) error {
	iter := db.NewSnapshot().NewIter(&pebble.IterOptions{})
	out := make(map[string]string)
	for iter.First(); iter.Valid(); iter.Next() {
		out[string(iter.Key())] = string(iter.Value())
	}
	return jsoniter.ConfigFastest.NewEncoder(file).Encode(out)
}

func pebbleRestoreOverwrite(db *pebble.DB, r io.Reader) error {
	in := make(map[string]string)
	err := jsoniter.ConfigFastest.NewDecoder(r).Decode(&in)
	if err != nil {
		return err
	}

	b := db.NewBatch()
	for k, v := range in {
		err = b.Set([]byte(k), []byte(v), nil)
		if err != nil {
			return err
		}
	}

	return b.Commit(&pebble.WriteOptions{Sync: true})
}
