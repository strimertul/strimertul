package logger

type MessageType int

const (
	MTDebug   MessageType = iota
	MTNotice  MessageType = iota
	MTWarning MessageType = iota
	MTError   MessageType = iota
)

type LogFn func(level MessageType, fmt string, args ...interface{})

func (m MessageType) String() string {
	switch m {
	case MTDebug:
		return "debug"
	case MTNotice:
		return "notice"
	case MTWarning:
		return "warning"
	case MTError:
		return "error"
	default:
		return "unknown"
	}
}
