package stulbe

import (
	"fmt"
	"net/http"

	jsoniter "github.com/json-iterator/go"
	"github.com/nicklaw5/helix"
)

type StulbeClient struct {
	Endpoint string
}

func NewClient(endpoint string) *StulbeClient {
	return &StulbeClient{
		Endpoint: endpoint,
	}
}

func (s *StulbeClient) StreamStatus(streamer string) (*helix.Stream, error) {
	resp, err := http.Get(fmt.Sprintf("%s/api/stul/stream/%s/status", s.Endpoint, streamer))
	if err != nil {
		return nil, err
	}
	var streams []helix.Stream
	err = jsoniter.ConfigFastest.NewDecoder(resp.Body).Decode(&streams)
	if len(streams) < 1 {
		return nil, err
	}
	return &streams[0], err
}
