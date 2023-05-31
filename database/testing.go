package database

import (
	"testing"

	kv "github.com/strimertul/kilovolt/v10"
	"go.uber.org/zap/zaptest"
)

func CreateInMemoryLocalClient(t *testing.T) (*LocalDBClient, kv.Driver) {
	logger := zaptest.NewLogger(t)

	// Create in-memory store and hub
	inMemoryStore := kv.MakeBackend()
	hub, err := kv.NewHub(inMemoryStore, kv.HubOptions{}, logger)
	if err != nil {
		t.Fatal(err)
	}
	go hub.Run()

	// Create local client
	client, err := NewLocalClient(hub, logger)
	if err != nil {
		t.Fatal(err)
	}

	return client, inMemoryStore
}

func CleanupLocalClient(client *LocalDBClient) {
	if client.hub != nil {
		_ = client.Close()
		client.hub.Close()
	}
}
