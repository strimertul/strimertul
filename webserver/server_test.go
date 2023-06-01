package webserver

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"git.sr.ht/~hamcha/containers/sync"

	"go.uber.org/zap/zaptest"

	"github.com/strimertul/strimertul/database"
)

func TestNewServer(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client, _ := database.CreateInMemoryLocalClient(t)
	defer database.CleanupLocalClient(client)

	_, err := NewServer(client, logger, DefaultServerFactory)
	if err != nil {
		t.Fatal(err)
	}
}

func TestNewServerWithTestFactory(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client, _ := database.CreateInMemoryLocalClient(t)
	defer database.CleanupLocalClient(client)

	testServer := NewTestServer()
	_, err := NewServer(client, logger, testServer.Factory())
	if err != nil {
		t.Fatal(err)
	}
}

func TestListen(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client, _ := database.CreateInMemoryLocalClient(t)
	defer database.CleanupLocalClient(client)

	// Create a test server
	testServer := NewTestServer()
	server, err := NewServer(client, logger, testServer.Factory())
	if err != nil {
		t.Fatal(err)
	}

	// Start the server
	finished := make(chan struct{})
	go func() {
		err := server.Listen()
		if err != nil {
			t.Error(err)
		}
		finished <- struct{}{}
	}()

	// Wait for the server to start up so we can get the client
	testServer.Wait()

	// Make a request to the server
	httpClient := testServer.Client()
	resp, err := httpClient.Get(fmt.Sprintf("%s/health", testServer.URL()))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("Expected 200, got %d", resp.StatusCode)
	}

	// Close the server
	err = server.Close()
	if err != nil {
		t.Fatal(err)
	}

	// Make sure the related goroutines have terminated
	select {
	case <-finished:
	case <-time.After(time.Second * 2):
		t.Fatal("Server did not shut down in time")
	}
}

type testCustomHandler struct {
	called *sync.Sync[bool]
}

func (t *testCustomHandler) ServeHTTP(http.ResponseWriter, *http.Request) {
	t.called.Set(true)
}

func TestCustomRoute(t *testing.T) {
	logger := zaptest.NewLogger(t)
	client, _ := database.CreateInMemoryLocalClient(t)
	defer database.CleanupLocalClient(client)

	// Create test server
	server, err := NewServer(client, logger, nil)
	if err != nil {
		t.Fatal(err)
	}
	server.makeMux()
	testServer := httptest.NewServer(server)

	// Register a custom route
	handler := &testCustomHandler{called: sync.NewSync(false)}
	server.RegisterRoute("/test", handler)

	// Make a request to the custom route
	httpClient := testServer.Client()
	path := fmt.Sprintf("%s/test", testServer.URL)
	resp, err := httpClient.Get(path)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("Expected 200, got %d", resp.StatusCode)
	}

	// Make sure the handler was called
	if !handler.called.Get() {
		t.Fatal("Handler was not called with custom route")
	}

	// Reset the handler
	handler.called.Set(false)

	// Unregister the route
	server.UnregisterRoute("/test")

	// Make a request to the custom route again
	resp, err = httpClient.Get(path)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 404 {
		t.Fatalf("Expected 404, got %d", resp.StatusCode)
	}
	if handler.called.Get() {
		t.Fatal("Handler was called with unregistered route")
	}
}

func TestGeneratePassword(t *testing.T) {
	// Generate a bunch of passwords and make sure they are different and sufficiently long
	passwords := make(map[string]bool)
	for i := 0; i < 100; i++ {
		password := generatePassword()
		if len(password) < 8 {
			t.Fatalf("Password '%s' is empty or too short", password)
		}
		if passwords[password] {
			t.Fatal("Duplicate password")
		}
		passwords[password] = true
	}
}
