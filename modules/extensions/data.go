package extensions

const ScriptPrefix = "extensions/scripts/"

type Script struct {
	Name    string `json:"name"`
	Enabled bool   `json:"enabled"`
	Source  string `json:"source"`
}
