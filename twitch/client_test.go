package twitch

import (
	"testing"

	"github.com/strimertul/strimertul/webserver"

	"go.uber.org/zap/zaptest"

	"github.com/strimertul/strimertul/database"
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
