package stulbe

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/dgraph-io/badger/v3"
	"github.com/gorilla/websocket"
	jsoniter "github.com/json-iterator/go"
	"github.com/nicklaw5/helix"
	"github.com/sirupsen/logrus"

	kv "github.com/strimertul/kilovolt/v2"
	"github.com/strimertul/stulbe/api"

	"github.com/strimertul/strimertul/utils"
)

type Client struct {
	Endpoint string

	client *http.Client
	token  string
	logger logrus.FieldLogger
	ws     *websocket.Conn
}

func NewClient(db *badger.DB, hub *kv.Hub, logger logrus.FieldLogger) (*Client, error) {
	var config Config
	err := utils.DBGetJSON(db, ConfigKey, &config)
	if err != nil {
		return nil, err
	}

	client := &Client{
		Endpoint: config.Endpoint,
		token:    "",
		logger:   logger,
		client:   &http.Client{},
		ws:       nil,
	}

	err = client.Authenticate(config.Username, config.AuthKey)
	if err != nil {
		return nil, err
	}

	err = client.ConnectToWebsocket()

	return client, err
}

func (s *Client) Close() {
	if s.ws != nil {
		s.ws.Close()
	}
}

func (s *Client) Authenticate(user string, authKey string) error {
	body := new(bytes.Buffer)
	err := jsoniter.ConfigFastest.NewEncoder(body).Encode(api.AuthRequest{User: user, AuthKey: authKey})
	if err != nil {
		return err
	}

	resp, err := s.client.Post(fmt.Sprintf("%s/api/auth", s.Endpoint), "application/json", body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		return getAPIError(resp)
	}

	var reply api.AuthResponse
	err = jsoniter.ConfigFastest.NewDecoder(resp.Body).Decode(&reply)
	if err != nil {
		return err
	}

	s.token = reply.Token
	return nil
}

func (s *Client) authenticated() bool {
	return s.token != ""
}

func (s *Client) ConnectToWebsocket() error {
	if !s.authenticated() {
		return ErrNotAuthenticated
	}

	uri, err := url.Parse(fmt.Sprintf("%s/ws", s.Endpoint))
	if err != nil {
		return err
	}
	if uri.Scheme == "https" {
		uri.Scheme = "wss"
	} else {
		uri.Scheme = "ws"
	}

	s.ws, _, err = websocket.DefaultDialer.Dial(uri.String(), http.Header{
		"Authorization": []string{"Bearer " + s.token},
	})
	if err != nil {
		return err
	}

	go func() {
		s.logger.Info("connected to ws, reading")
		for {
			_, message, err := s.ws.ReadMessage()
			if err != nil {
				s.logger.WithError(err).Error("websocket read error")
				return
			}
			s.logger.WithField("message", string(message)).Info("recv ws")
		}
	}()

	return nil
}

func (s *Client) newAuthRequest(method string, url string, body io.Reader) (*http.Request, error) {
	if !s.authenticated() {
		return nil, ErrNotAuthenticated
	}

	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+s.token)

	return req, nil
}

func (s *Client) StreamStatus(streamer string) (*helix.Stream, error) {
	uri := fmt.Sprintf("%s/api/stream/%s/status", s.Endpoint, streamer)
	req, err := s.newAuthRequest("GET", uri, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, getAPIError(resp)
	}

	var streams []helix.Stream
	err = jsoniter.ConfigFastest.NewDecoder(resp.Body).Decode(&streams)
	if len(streams) < 1 {
		return nil, err
	}
	return &streams[0], err
}

func getAPIError(r *http.Response) error {
	var apiError api.ResponseError
	err := jsoniter.ConfigFastest.NewDecoder(r.Body).Decode(&apiError)
	if err != nil {
		return err
	}
	return errors.New(apiError.Error)
}
