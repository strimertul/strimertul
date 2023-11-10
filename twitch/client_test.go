package twitch

import (
	"testing"

	"go.uber.org/zap/zaptest"

	"git.sr.ht/~ashkeel/strimertul/database"
	"git.sr.ht/~ashkeel/strimertul/webserver"
)

func TestNewClient(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client, _ := database.CreateInMemoryLocalClient(t)
	defer database.CleanupLocalClient(client)

	server, err := webserver.NewServer(client, logger, webserver.DefaultServerFactory)
	if err != nil {
		t.Fatal(err)
	}

	config := Config{}
	_, err = newClient(config, client, server, logger)
	if err != nil {
		t.Fatal(err)
	}
}
