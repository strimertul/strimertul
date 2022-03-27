package glimesh

const ConfigKey = "glimesh/config"

type Config struct {
	Enabled         bool   `json:"enabled"`
	APIClientID     string `json:"api_client_id"`
	APIClientSecret string `json:"api_client_secret"`
	ChannelID       uint64 `json:"channel_id"`
}

type GQLQuery struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables"`
}

type ClientCredentialsResult struct {
	AccessToken  string  `json:"access_token"`
	RefreshToken *string `json:"refresh_token"`
	CreatedAt    string  `json:"created_at"`
	Expires      int     `json:"expires_in"`
	Scope        string  `json:"scope"`
	TokenType    string  `json:"token_type"`
}

type ChatMessage struct {
	Message string `json:"message"`
	User    struct {
		Username string `json:"username"`
	} `json:"user"`
}

type ChatMessageResult struct {
	Result struct {
		Data struct {
			ChatMessage ChatMessage `json:"chatMessage"`
		} `json:"data"`
	} `json:"result"`
}
