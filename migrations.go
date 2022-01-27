package main

import (
	"errors"

	"github.com/strimertul/strimertul/modules/database"
	"github.com/strimertul/strimertul/modules/loyalty"
	"github.com/strimertul/strimertul/modules/stulbe"
	"github.com/strimertul/strimertul/modules/twitch"

	"github.com/dgraph-io/badger/v3"
	"go.uber.org/zap"
)

func runMigrations(db *database.DB) {
	pre180MigrateModuleConfig(db)
}

// pre180MigrateModuleConfig migrates <1.8 module configs to 1.8+
func pre180MigrateModuleConfig(db *database.DB) {
	const pre180ModuleConfigKey = "stul-meta/modules"

	type pre180ModuleConfig struct {
		CompletedOnboarding bool `json:"configured"`
		EnableTwitch        bool `json:"twitch"`
		EnableStulbe        bool `json:"stulbe"`
		EnableLoyalty       bool `json:"loyalty"`
	}

	// Check if onboarding was completed
	var moduleConfig pre180ModuleConfig
	err := db.GetJSON(pre180ModuleConfigKey, &moduleConfig)
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
		failOnError(db.RemoveKey(pre180ModuleConfigKey), "Failed to remove pre-1.8 module config")
		return
	}

	// Migrate to new config by updating every related module
	var twitchConfig twitch.Config
	err = db.GetJSON(twitch.ConfigKey, &twitchConfig)
	if err != nil {
		if !errors.Is(err, badger.ErrKeyNotFound) {
			fatalError(err, "Could not read from DB")
		}
	} else {
		twitchConfig.Enabled = moduleConfig.EnableTwitch
		if err := db.PutJSON(twitch.ConfigKey, twitchConfig); err != nil {
			logger.Error("Failed to update twitch config during 1.8 migration", zap.Error(err))
		}
	}

	var stulbeConfig stulbe.Config
	err = db.GetJSON(stulbe.ConfigKey, &stulbeConfig)
	if err != nil {
		if !errors.Is(err, badger.ErrKeyNotFound) {
			fatalError(err, "Could not read from DB")
		}
	} else {
		stulbeConfig.Enabled = moduleConfig.EnableStulbe
		if err := db.PutJSON(stulbe.ConfigKey, stulbeConfig); err != nil {
			logger.Error("Failed to update stulbe config during 1.8 migration", zap.Error(err))
		}
	}

	var loyaltyConfig loyalty.Config
	err = db.GetJSON(loyalty.ConfigKey, &loyaltyConfig)
	if err != nil {
		if !errors.Is(err, badger.ErrKeyNotFound) {
			fatalError(err, "Could not read from DB")
		}
	} else {
		loyaltyConfig.Enabled = moduleConfig.EnableLoyalty
		if err := db.PutJSON(loyalty.ConfigKey, loyaltyConfig); err != nil {
			logger.Error("Failed to update loyalty config during 1.8 migration", zap.Error(err))
		}
	}

	logger.Info("Migrated module config to 1.8+")

	// Remove old config key
	failOnError(db.RemoveKey(pre180ModuleConfigKey), "Failed to remove pre-1.8 module config")
}
