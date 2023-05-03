package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"go.uber.org/zap"

	"github.com/strimertul/strimertul/database"
	"github.com/strimertul/strimertul/utils"
)

func BackupTask(driver database.DatabaseDriver, options database.BackupOptions) {
	if options.BackupDir == "" {
		logger.Warn("Backup directory not set, database backups are disabled")
		return
	}

	err := os.MkdirAll(options.BackupDir, 0o755)
	if err != nil {
		logger.Error("Could not create backup directory, moving to a temporary folder", zap.Error(err))
		options.BackupDir = os.TempDir()
		logger.Info("Using temporary directory", zap.String("backup-dir", options.BackupDir))
		return
	}

	ticker := time.NewTicker(time.Duration(options.BackupInterval) * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		performBackup(driver, options)
	}
}

func performBackup(driver database.DatabaseDriver, options database.BackupOptions) {
	// Run backup procedure
	file, err := os.Create(fmt.Sprintf("%s/%s.db", options.BackupDir, time.Now().Format("20060102-150405")))
	if err != nil {
		logger.Error("Could not create backup file", zap.Error(err))
		return
	}

	err = driver.Backup(file)
	if err != nil {
		logger.Error("Could not backup database", zap.Error(err))
	}
	_ = file.Close()
	logger.Info("Database backup created", zap.String("backup-file", file.Name()))

	// Remove old backups
	files, err := os.ReadDir(options.BackupDir)
	if err != nil {
		logger.Error("Could not read backup directory", zap.Error(err))
		return
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
				logger.Error("Could not remove backup file", zap.Error(err))
			}
		}
	}
}

type BackupInfo struct {
	Filename string `json:"filename"`
	Date     int64  `json:"date"`
	Size     int64  `json:"size"`
}

func (a *App) GetBackups() (list []BackupInfo) {
	files, err := os.ReadDir(a.backupOptions.BackupDir)
	if err != nil {
		logger.Error("Could not read backup directory", zap.Error(err))
		return nil
	}

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		info, err := file.Info()
		if err != nil {
			logger.Error("Could not get info for backup file", zap.Error(err))
			continue
		}

		list = append(list, BackupInfo{
			Filename: file.Name(),
			Date:     info.ModTime().UnixMilli(),
			Size:     info.Size(),
		})
	}
	return
}

func (a *App) RestoreBackup(backupName string) error {
	path := filepath.Join(a.backupOptions.BackupDir, backupName)

	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("could not open import file for reading: %w", err)
	}
	defer utils.Close(file, logger)
	inStream := file

	if a.driver == nil {
		a.driver, err = database.GetDatabaseDriver(a.cliParams)
		if err != nil {
			return fmt.Errorf("could not open database: %w", err)
		}
	}

	err = a.driver.Restore(inStream)
	if err != nil {
		return fmt.Errorf("could not restore database: %w", err)
	}

	logger.Info("Restored database from backup")
	return nil
}
