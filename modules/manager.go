package modules

import (
	"go.uber.org/zap"
)

type ModuleStatus struct {
	Enabled      bool
	Working      bool
	Data         interface{}
	StatusString string
}

func (m ModuleStatus) String() string {
	return m.StatusString
}

type Module interface {
	Status() ModuleStatus
	Close() error
}

type ModuleID string

const (
	// Required
	ModuleDB   ModuleID = "db"
	ModuleHTTP ModuleID = "http"

	// Feature modules
	ModuleLoyalty ModuleID = "loyalty"
	ModuleStulbe  ModuleID = "stulbe"

	// Streaming providers
	ModuleTwitch  ModuleID = "twitch"
	ModuleGlimesh ModuleID = "glimesh"
)

type Manager struct {
	Modules map[ModuleID]Module

	logger *zap.Logger
}

func NewManager(log *zap.Logger) *Manager {
	return &Manager{
		Modules: make(map[ModuleID]Module),
		logger:  log,
	}
}

func (m *Manager) Logger(module ModuleID) *zap.Logger {
	return m.logger.With(zap.String("module", string(module)))
}
