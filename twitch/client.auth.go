package twitch

import (
	"fmt"
	"net/http"
	"time"

	"github.com/nicklaw5/helix/v2"
)

type AuthResponse struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	ExpiresIn    int      `json:"expires_in"`
	Scope        []string `json:"scope"`
	Time         time.Time
}

func (c *Client) GetAuthorizationURL() string {
	if c.API == nil {
		return "twitch-not-configured"
	}
	return c.API.GetAuthorizationURL(&helix.AuthorizationURLParams{
		ResponseType: "code",
		Scopes:       []string{"bits:read channel:read:subscriptions channel:read:redemptions channel:read:polls channel:read:predictions channel:read:hype_train user_read chat:read chat:edit channel:moderate whispers:read whispers:edit"},
	})
}

func (c *Client) GetUserClient() (*helix.Client, error) {
	var authResp AuthResponse
	err := c.db.GetJSON(AuthKey, &authResp)
	if err != nil {
		return nil, err
	}
	// Handle token expiration
	if time.Now().After(authResp.Time.Add(time.Duration(authResp.ExpiresIn) * time.Second)) {
		// Refresh tokens
		refreshed, err := c.API.RefreshUserAccessToken(authResp.RefreshToken)
		if err != nil {
			return nil, err
		}
		authResp.AccessToken = refreshed.Data.AccessToken
		authResp.RefreshToken = refreshed.Data.RefreshToken
		authResp.Time = time.Now().Add(time.Duration(refreshed.Data.ExpiresIn) * time.Second)

		// Save new token pair
		err = c.db.PutJSON(AuthKey, authResp)
		if err != nil {
			return nil, err
		}
	}

	config := c.Config.Get()
	return helix.NewClient(&helix.Options{
		ClientID:        config.APIClientID,
		ClientSecret:    config.APIClientSecret,
		UserAccessToken: authResp.AccessToken,
	})
}

func (c *Client) GetLoggedUser() (helix.User, error) {
	client, err := c.GetUserClient()
	if err != nil {
		return helix.User{}, fmt.Errorf("failed getting API client for user: %w", err)
	}

	users, err := client.GetUsers(&helix.UsersParams{})
	if err != nil {
		return helix.User{}, fmt.Errorf("failed looking up user: %w", err)
	}
	if len(users.Data.Users) < 1 {
		return helix.User{}, fmt.Errorf("no users found")
	}

	return users.Data.Users[0], nil
}

func (c *Client) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	// Get code from params
	code := req.URL.Query().Get("code")
	if code == "" {
		// TODO Nice error page
		http.Error(w, "missing code", http.StatusBadRequest)
		return
	}

	// Exchange code for access/refresh tokens
	userTokenResponse, err := c.API.RequestUserAccessToken(code)
	if err != nil {
		http.Error(w, "failed auth token request: "+err.Error(), http.StatusInternalServerError)
		return
	}

	err = c.db.PutJSON(AuthKey, AuthResponse{
		AccessToken:  userTokenResponse.Data.AccessToken,
		RefreshToken: userTokenResponse.Data.RefreshToken,
		ExpiresIn:    userTokenResponse.Data.ExpiresIn,
		Scope:        userTokenResponse.Data.Scopes,
		Time:         time.Now(),
	})
	if err != nil {
		http.Error(w, "error saving auth data for user: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Add("Content-Type", "text/html")
	fmt.Fprintf(w, `<html><body><h2>All done, you can close me now!</h2><script>window.close();</script></body></html>`)
}

type RefreshResponse struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	TokenType    string   `json:"token_type"`
	Scope        []string `json:"scope"`
}

func getRedirectURI(baseurl string) string {
	return fmt.Sprintf("http://%s/twitch/callback", baseurl)
}
