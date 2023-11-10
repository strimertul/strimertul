package main

import (
	"os"
	"time"

	"git.sr.ht/~ashkeel/containers/sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

const LogHistory = 50

var (
	logger       *zap.Logger
	lastLogs     *sync.Slice[LogEntry]
	incomingLogs chan LogEntry
)

func initLogger(level zapcore.Level) {
	lastLogs = sync.NewSlice[LogEntry]()
	incomingLogs = make(chan LogEntry, 100)
	logStorage := NewLogStorage(level)
	consoleLogger := zapcore.NewCore(
		zapcore.NewConsoleEncoder(zap.NewDevelopmentEncoderConfig()),
		zapcore.Lock(os.Stderr),
		level,
	)
	fileLogger := zapcore.NewCore(
		zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig()),
		zapcore.AddSync(&lumberjack.Logger{
			Filename:   logFilename,
			MaxSize:    20,
			MaxBackups: 3,
			MaxAge:     28,
		}),
		level,
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
	lastLogs.Push(logEntry)
	if lastLogs.Size() > LogHistory {
		lastLogs.Splice(0, 1)
	}
	incomingLogs <- logEntry
	return nil
}

func (core *LogStorage) Sync() error {
	return nil
}

func parseAsFields(fields map[string]any) (result []zapcore.Field) {
	for k, v := range fields {
		result = append(result, zap.Any(k, v))
	}
	return
}
