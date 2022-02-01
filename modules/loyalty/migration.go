package loyalty

import (
	"errors"

	kv "github.com/strimertul/kilovolt/v8"

	"github.com/strimertul/strimertul/modules/database"

	"go.uber.org/zap"
)

const OldPointsKey = "loyalty/users"

type OldPointStorage map[string]int64

func migratePoints(db *database.DBModule, log *zap.Logger) error {
	// Retrieve old storage
	var oldStorage OldPointStorage
	err := db.GetJSON(OldPointsKey, &oldStorage)
	if errors.Is(err, kv.ErrorKeyNotFound) {
		// No migration needed, points are already kaput
		return nil
	}
	if err != nil {
		return err
	}

	// Move to new format
	newStorage := make(map[string]interface{})
	for user, points := range oldStorage {
		userkey := PointsPrefix + user
		newStorage[userkey] = PointsEntry{
			Points: points,
		}
	}

	// Bulk add to database
	if err := db.PutJSONBulk(newStorage); err != nil {
		return err
	}

	log.Info("Migrated to new loyalty point format")

	// Remove old key
	return db.RemoveKey(OldPointsKey)
}
