package extensions

import (
	"errors"
	"fmt"

	"github.com/d5/tengo/v2"
	jsoniter "github.com/json-iterator/go"
	"github.com/strimertul/strimertul/modules"
	"github.com/strimertul/strimertul/modules/database"
	"go.uber.org/zap"
)

type ExtensionHost struct {
	db      *database.DBModule
	logger  *zap.Logger
	scripts map[string]*ExtensionScript
}

type ExtensionScript struct {
	Info   Script
	Script *tengo.Script
}

func Register(manager *modules.Manager) error {
	db, ok := manager.Modules["db"].(*database.DBModule)
	if !ok {
		return errors.New("db module not found")
	}

	logger := manager.Logger(modules.ModuleExtensions)

	exthost := &ExtensionHost{
		db:      db,
		logger:  logger,
		scripts: map[string]*ExtensionScript{},
	}

	// Register module
	manager.Modules[modules.ModuleExtensions] = exthost

	// Load scripts
	err := exthost.loadScripts()
	if err != nil {
		return fmt.Errorf("failed to load scripts: %w", err)
	}

	db.Subscribe(func(key string, value string) {
		//todo reload scripts
	}, ScriptPrefix)

	return nil
}

func (exthost *ExtensionHost) loadScripts() error {
	entries, err := exthost.db.GetAll(ScriptPrefix)
	if err != nil {
		return fmt.Errorf("failed to get scripts from db: %w", err)
	}

	for key, entry := range entries {
		var script Script
		err := jsoniter.ConfigFastest.UnmarshalFromString(entry, &script)
		if err != nil {
			return fmt.Errorf("failed to decode script %s: %w", key, err)
		}

		exthost.scripts[key] = &ExtensionScript{
			Info:   script,
			Script: exthost.makeScript(script.Source),
		}
	}

	return nil
}

func (exthost *ExtensionHost) Close() error {
	return nil
}

func (exthost *ExtensionHost) Status() modules.ModuleStatus {
	return modules.ModuleStatus{
		Enabled:      true,
		Working:      true,
		Data:         struct{}{},
		StatusString: "",
	}
}

func (exthost *ExtensionHost) makeScript(code string) *tengo.Script {
	script := tengo.NewScript([]byte(code))
	// TODO add bindings
	return script
}
