package modules

import "github.com/sirupsen/logrus"

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
	ModuleLoyalty ModuleID = "loyalty"
	ModuleTwitch  ModuleID = "twitch"
	ModuleStulbe  ModuleID = "stulbe"
	ModuleDB      ModuleID = "db"
	ModuleHTTP    ModuleID = "http"
)

type Manager struct {
	Modules map[ModuleID]Module

	logger logrus.FieldLogger
}

func NewManager(log logrus.FieldLogger) *Manager {
	return &Manager{
		Modules: make(map[ModuleID]Module),
		logger:  log,
	}
}

func (m *Manager) Logger(module ModuleID) logrus.FieldLogger {
	return m.logger.WithField("module", module)
}
