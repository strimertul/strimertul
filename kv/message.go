package kv

// Commands
const (
	CmdReadKey        = "kget"
	CmdWriteKey       = "kset"
	CmdSubscribeKey   = "ksub"
	CmdUnsubscribeKey = "kunsub"
)

type wsRequest struct {
	CmdName string                 `json:"command"`
	Data    map[string]interface{} `json:"data"`
}

type wsError struct {
	Error string `json:"error"`
}

type wsGenericResponse struct {
	CmdType string      `json:"type"`
	Ok      bool        `json:"ok"`
	Cmd     string      `json:"cmd"`
	Data    interface{} `json:"data"`
}

type wsEmptyResponse struct {
	CmdType string `json:"type"`
	Ok      bool   `json:"ok"`
	Cmd     string `json:"cmd"`
}

type wsPush struct {
	CmdType  string `json:"type"`
	Key      string `json:"key"`
	NewValue string `json:"new_value"`
}
