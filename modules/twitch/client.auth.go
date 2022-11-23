package twitch

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/nicklaw5/helix/v2"
)

type AuthResponse struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	TokenType    string   `json:"token_type"`
	ExpiresIn    int      `json:"expires_in"`
	Scope        []string `json:"scope"`
	Time         time.Time
}

func (c *Client) GetAuthorizationURL() string {
	return c.API.GetAuthorizationURL(&helix.AuthorizationURLParams{
		ResponseType: "code",
		Scopes:       []string{"bits:read channel:read:subscriptions channel:read:redemptions channel:read:polls channel:read:predictions channel:read:hype_train user_read"},
	})
}

func (c *Client) GetLoggedUser() (helix.User, error) {
	var authResp AuthResponse
	err := c.db.GetJSON(AuthKey, &authResp)
	if err != nil {
		return helix.User{}, err
	}
	client, err := helix.NewClient(&helix.Options{
		ClientID:        c.Config.APIClientID,
		ClientSecret:    c.Config.APIClientSecret,
		UserAccessToken: authResp.AccessToken,
	})
	users, err := client.GetUsers(&helix.UsersParams{})
	if err != nil {
		return helix.User{}, fmt.Errorf("failed looking up user: %w", err)
	}
	if len(users.Data.Users) < 1 {
		return helix.User{}, fmt.Errorf("no users found")
	}
	return users.Data.Users[0], nil
}

func (c *Client) AuthorizeCallback(w http.ResponseWriter, req *http.Request) {
	// Get code from params
	code := req.URL.Query().Get("code")
	if code == "" {
		// TODO Nice error page
		http.Error(w, "missing code", http.StatusBadRequest)
		return
	}
	redirectURI, err := c.getRedirectURI()
	if err != nil {
		http.Error(w, "failed getting redirect uri", http.StatusInternalServerError)
		return
	}
	// Exchange code for access/refresh tokens
	query := url.Values{
		"client_id":     {c.Config.APIClientID},
		"client_secret": {c.Config.APIClientSecret},
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {redirectURI},
	}
	authRequest, err := http.NewRequest("POST", "https://id.twitch.tv/oauth2/token?"+query.Encode(), nil)
	if err != nil {
		http.Error(w, "failed creating auth request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	resp, err := http.DefaultClient.Do(authRequest)
	if err != nil {
		http.Error(w, "failed sending auth request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	var authResp AuthResponse
	err = json.NewDecoder(resp.Body).Decode(&authResp)
	if err != nil && err != io.EOF {
		http.Error(w, "failed reading auth response: "+err.Error(), http.StatusInternalServerError)
		return
	}
	authResp.Time = time.Now()
	err = c.db.PutJSON(AuthKey, authResp)
	if err != nil {
		http.Error(w, "error saving auth data for user: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Add("Content-Type", "text/html")
	fmt.Fprintf(w, `<html><body><h2>All done, you can close me now!</h2><script>window.close();</script></body></html>`)
}

func (c *Client) getRedirectURI() (string, error) {
	var severConfig struct {
		Bind string `json:"bind"`
	}
	err := c.db.GetJSON("http/config", &severConfig)
	return fmt.Sprintf("http://%s/twitch/callback", severConfig.Bind), err
}