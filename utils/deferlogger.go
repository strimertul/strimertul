package utils

import (
	"io"
	"reflect"
	"runtime/debug"

	"go.uber.org/zap"
)

func Close(res io.Closer, logger *zap.Logger) {
	if res == nil {
		return
	}
	err := res.Close()
	if err != nil {
		logger.Error("could not close resource", zap.String("name", reflect.TypeOf(res).String()), zap.Error(err), zap.String("stack", string(debug.Stack())))
	}
}
