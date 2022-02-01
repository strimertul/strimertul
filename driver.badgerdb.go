package main

import (
	"bufio"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/dgraph-io/badger/v3"
	"github.com/dgraph-io/badger/v3/pb"
	"github.com/golang/protobuf/proto"

	badger_driver "github.com/strimertul/kv-badgerdb"

	kv "github.com/strimertul/kilovolt/v8"
	"github.com/strimertul/strimertul/modules/loyalty"
	"github.com/strimertul/strimertul/modules/stulbe"
	"github.com/strimertul/strimertul/modules/twitch"

	jsoniter "github.com/json-iterator/go"
	"go.uber.org/zap"
)

func makeBadgerHub(options dbOptions) (*badger.DB, *kv.Hub, error) {
	// Loading routine
	db, err := badger.Open(badger.DefaultOptions(options.directory).WithSyncWrites(true))
	failOnError(err, "Could not open DB")

	// Run migrations
	pre200MigrateModuleConfig(db)

	// Run garbage collection every once in a while
	go func() {
		ticker := time.NewTicker(15 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			// Run DB garbage collection until it's done
			var err error
			for err == nil {
				err = db.RunValueLogGC(0.5)
			}
		}
	}()

	if options.restore != "" {
		file, err := os.Open(options.restore)
		failOnError(err, "Could not open backup")
		failOnError(badgerRestoreOverwrite(db, file), "Could not restore database")
		_ = db.Sync()
		logger.Info("Restored database from backup")
	}

	// Backup database periodically
	go func() {
		if options.backupDir == "" {
			logger.Warn("Backup directory not set, database backups are disabled (this is dangerous, power loss will result in your database being potentially wiped!)")
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
			_, err = db.Backup(file, 0)
			if err != nil {
				logger.Error("Could not backup database", zap.Error(err))
			}
			_ = file.Close()
			logger.Info("Database backed up", zap.String("backup-file", file.Name()))
		}
	}()

	hub, err := kv.NewHub(badger_driver.NewBadgerBackend(db), kv.HubOptions{}, logger)
	return db, hub, err
}

func badgerClose(db *badger.DB) error {
	return db.Close()
}

func badgerRestoreOverwrite(db *badger.DB, r io.Reader) error {
	br := bufio.NewReaderSize(r, 16<<10)
	unmarshalBuf := make([]byte, 1<<10)

	for {
		var sz uint64
		err := binary.Read(br, binary.LittleEndian, &sz)
		if err == io.EOF {
			break
		} else if err != nil {
			return err
		}

		if cap(unmarshalBuf) < int(sz) {
			unmarshalBuf = make([]byte, sz)
		}

		if _, err = io.ReadFull(br, unmarshalBuf[:sz]); err != nil {
			return err
		}

		list := &pb.KVList{}
		if err := proto.Unmarshal(unmarshalBuf[:sz], list); err != nil {
			return err
		}

		err = db.Update(func(txn *badger.Txn) error {
			for _, kvpair := range list.Kv {
				err := txn.Set(kvpair.Key, kvpair.Value)
				if err != nil {
					return err
				}
			}
			return nil
		})
		if err != nil {
			return err
		}
	}

	return nil
}

// pre200MigrateModuleConfig migrates <2.0 module configs to 2.0+
func pre200MigrateModuleConfig(db *badger.DB) {
	const pre180ModuleConfigKey = "stul-meta/modules"

	type pre180ModuleConfig struct {
		CompletedOnboarding bool `json:"configured"`
		EnableTwitch        bool `json:"twitch"`
		EnableStulbe        bool `json:"stulbe"`
		EnableLoyalty       bool `json:"loyalty"`
	}

	// Check if onboarding was completed
	var moduleConfig pre180ModuleConfig
	err := db.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte(pre180ModuleConfigKey))
		if err != nil {
			return err
		}
		err = item.Value(func(val []byte) error {
			return jsoniter.Unmarshal(val, &moduleConfig)
		})
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, badger.ErrKeyNotFound) {
			// Either first boot or migration already done
			return
		} else {
			fatalError(err, "Could not read from DB")
		}
	}

	// ?? Should never happen, maybe we just have an empty key?
	if !moduleConfig.CompletedOnboarding {
		err = db.Update(func(txn *badger.Txn) error {
			return txn.Delete([]byte(pre180ModuleConfigKey))
		})
		failOnError(err, "Failed to remove pre-1.8 module config")
		return
	}

	// Migrate to new config by updating every related module
	var twitchConfig twitch.Config
	err = db.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte(twitch.ConfigKey))
		if err != nil {
			return err
		}
		err = item.Value(func(val []byte) error {
			return jsoniter.Unmarshal(val, &twitchConfig)
		})
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		if !errors.Is(err, badger.ErrKeyNotFound) {
			fatalError(err, "Could not read from DB")
		}
	} else {
		twitchConfig.Enabled = moduleConfig.EnableTwitch
		err = db.Update(func(txn *badger.Txn) error {
			byt, err := jsoniter.ConfigFastest.Marshal(twitchConfig)
			if err != nil {
				return err
			}
			return txn.Set([]byte(twitch.ConfigKey), byt)
		})
		if err != nil {
			logger.Error("Failed to update twitch config during 1.8 migration", zap.Error(err))
		}
	}

	var stulbeConfig stulbe.Config
	err = db.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte(stulbe.ConfigKey))
		if err != nil {
			return err
		}
		err = item.Value(func(val []byte) error {
			return jsoniter.Unmarshal(val, &stulbeConfig)
		})
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		if !errors.Is(err, badger.ErrKeyNotFound) {
			fatalError(err, "Could not read from DB")
		}
	} else {
		stulbeConfig.Enabled = moduleConfig.EnableStulbe
		err = db.Update(func(txn *badger.Txn) error {
			byt, err := jsoniter.ConfigFastest.Marshal(stulbeConfig)
			if err != nil {
				return err
			}
			return txn.Set([]byte(stulbe.ConfigKey), byt)
		})
		if err != nil {
			logger.Error("Failed to update stulbe config during 1.8 migration", zap.Error(err))
		}
	}

	var loyaltyConfig loyalty.Config
	err = db.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte(loyalty.ConfigKey))
		if err != nil {
			return err
		}
		err = item.Value(func(val []byte) error {
			return jsoniter.Unmarshal(val, &loyaltyConfig)
		})
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		if !errors.Is(err, badger.ErrKeyNotFound) {
			fatalError(err, "Could not read from DB")
		}
	} else {
		loyaltyConfig.Enabled = moduleConfig.EnableLoyalty
		err = db.Update(func(txn *badger.Txn) error {
			byt, err := jsoniter.ConfigFastest.Marshal(loyaltyConfig)
			if err != nil {
				return err
			}
			return txn.Set([]byte(loyalty.ConfigKey), byt)
		})
		if err != nil {
			logger.Error("Failed to update loyalty config during 1.8 migration", zap.Error(err))
		}
	}

	logger.Info("Migrated module config to 2.0+")

	// Remove old config key
	err = db.Update(func(txn *badger.Txn) error {
		return txn.Delete([]byte(pre180ModuleConfigKey))
	})
	failOnError(err, "Failed to remove pre-1.8 module config")
}
