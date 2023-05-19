package database

import (
	kv "github.com/strimertul/kilovolt/v10"
	"go.uber.org/zap/zaptest"
	"testing"
)

func TestLocalDBClient_PutKey(t *testing.T) {
	client, store := createLocalClient(t)
	defer cleanupClient(client)

	// Store a key using the local client
	key := "test"
	value := "value"
	err := client.PutKey(key, value)
	if err != nil {
		t.Fatal(err)
	}

	// Retrieve the key from the store and verify it
	stored, err := store.Get(key)
	if err != nil {
		t.Fatal(err)
	}
	if stored != value {
		t.Fatalf("expected %s, got %s", value, stored)
	}
}

func TestLocalDBClient_GetKey(t *testing.T) {
	client, store := createLocalClient(t)
	defer cleanupClient(client)

	// Store a key directly in the store
	key := "test"
	value := "value"

	err := store.Set(key, value)
	if err != nil {
		t.Fatal(err)
	}

	// Retrieve the key using the local client
	stored, err := client.GetKey(key)
	if err != nil {
		t.Fatal(err)
	}
	if stored != value {
		t.Fatalf("expected %s, got %s", value, stored)
	}
}

func createLocalClient(t *testing.T) (*LocalDBClient, kv.Driver) {
	logger := zaptest.NewLogger(t)

	// Create in-memory store and hub
	inmemStore := kv.MakeBackend()
	hub, err := kv.NewHub(inmemStore, kv.HubOptions{}, logger)
	if err != nil {
		t.Fatal(err)
	}
	go hub.Run()

	// Create local client
	client, err := NewLocalClient(hub, logger)
	if err != nil {
		t.Fatal(err)
	}

	return client, inmemStore
}

func cleanupClient(client *LocalDBClient) {
	if client.hub != nil {
		_ = client.Close()
		client.hub.Close()
	}
}
