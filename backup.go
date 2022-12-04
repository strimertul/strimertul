package main

import (
	"fmt"
	"os"
	"sort"
	"time"

	"go.uber.org/zap"

	"github.com/strimertul/strimertul/database"
	"github.com/strimertul/strimertul/utils"
)

func BackupTask(driver database.DatabaseDriver, options database.BackupOptions) {
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
