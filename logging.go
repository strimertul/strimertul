package main

import (
	"os"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

var logger *zap.Logger

const LogHistory = 50

var (
	lastLogs     []LogEntry
	incomingLogs chan LogEntry
)

func initLogger() {
	lastLogs = make([]LogEntry, 0)
	incomingLogs = make(chan LogEntry, 100)
	logStorage := NewLogStorage(zap.InfoLevel)
	consoleLogger := zapcore.NewCore(
		zapcore.NewConsoleEncoder(zap.NewDevelopmentEncoderConfig()),
		zapcore.Lock(os.Stderr),
		zap.InfoLevel,
	)
	fileLogger := zapcore.NewCore(
		zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig()),
		zapcore.AddSync(&lumberjack.Logger{
			Filename:   "strimertul.log",
			MaxSize:    500,
			MaxBackups: 3,
			MaxAge:     28,
		}),
		zap.DebugLevel,
	)
	core := zapcore.NewTee(
		consoleLogger,
		fileLogger,
		logStorage,
	)
	logger = zap.New(core, zap.AddCaller())
}

type LogEntry struct {
	Caller  string `json:"caller"`
	Time    string `json:"time"`
	Level   string `json:"level"`
	Message string `json:"message"`
	Data    string `json:"data"`
}

type LogStorage struct {
	zapcore.LevelEnabler
	fields  []zapcore.Field
	encoder zapcore.Encoder
}

func NewLogStorage(enabler zapcore.LevelEnabler) *LogStorage {
	return &LogStorage{
		LevelEnabler: enabler,
		encoder:      zapcore.NewJSONEncoder(zap.NewDevelopmentEncoderConfig()),
	}
}

func (core *LogStorage) With(fields []zapcore.Field) zapcore.Core {
	clone := *core
	clone.fields = append(clone.fields, fields...)
	return &clone
}

func (core *LogStorage) Check(entry zapcore.Entry, checked *zapcore.CheckedEntry) *zapcore.CheckedEntry {
	if core.Enabled(entry.Level) {
		return checked.AddCore(entry, core)
	}
	return checked
}

func (core *LogStorage) Write(entry zapcore.Entry, fields []zapcore.Field) error {
	buf, err := core.encoder.EncodeEntry(entry, append(core.fields, fields...))
	if err != nil {
		return err
	}
	logEntry := LogEntry{
		Caller:  entry.Caller.String(),
		Time:    entry.Time.Format(time.RFC3339),
		Level:   entry.Level.String(),
		Message: entry.Message,
		Data:    buf.String(),
	}
	lastLogs = append(lastLogs, logEntry)
	if len(lastLogs) > LogHistory {
		lastLogs = lastLogs[1:]
	}
	incomingLogs <- logEntry
	return nil
}

func (core *LogStorage) Sync() error {
	return nil
}
