package extensions

import (
	"errors"

	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/database"
	"go.uber.org/zap"
)

type ExtensionHost struct {
	db     *database.DBModule
	logger *zap.Logger
}

func Register(manager *modules.Manager) error {
	db, ok := manager.Modules["db"].(*database.DBModule)
	if !ok {
		return errors.New("db module not found")
	}

	logger := manager.Logger(modules.ModuleExtensions)

	exthost := &ExtensionHost{
		db:     db,
		logger: logger,
	}

	// Register module
	manager.Modules[modules.ModuleExtensions] = exthost

	return nil
}

func (e *ExtensionHost) Close() error {
	return nil
}

func (e *ExtensionHost) Status() modules.ModuleStatus {
	return modules.ModuleStatus{
		Enabled:      true,
		Working:      true,
		Data:         struct{}{},
		StatusString: "",
	}
}
