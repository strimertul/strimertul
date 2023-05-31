package database

import (
	"testing"
	"time"

	jsoniter "github.com/json-iterator/go"
	kv "github.com/strimertul/kilovolt/v10"
)

func TestLocalDBClientPutKey(t *testing.T) {
	client, store := CreateInMemoryLocalClient(t)
	defer CleanupLocalClient(client)

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

func TestLocalDBClientPutJSON(t *testing.T) {
	client, store := CreateInMemoryLocalClient(t)
	defer CleanupLocalClient(client)

	type test struct {
		A string
		B int
	}

	testStruct := test{
		A: "test",
		B: 42,
	}

	// Store a key using the local client
	key := "test"
	err := client.PutJSON(key, testStruct)
	if err != nil {
		t.Fatal(err)
	}

	// Retrieve the key from the store and verify it
	stored, err := store.Get(key)
	if err != nil {
		t.Fatal(err)
	}

	var testStored test
	err = jsoniter.ConfigFastest.UnmarshalFromString(stored, &testStored)
	if err != nil {
		t.Fatal(err)
	}

	if testStored.A != testStruct.A {
		t.Fatalf("expected A to be %s, got %s", testStruct.A, testStored.A)
	}
	if testStored.B != testStruct.B {
		t.Fatalf("expected B to be %d, got %d", testStruct.B, testStored.B)
	}
}

func TestLocalDBClientPutJSONBulk(t *testing.T) {
	client, store := CreateInMemoryLocalClient(t)
	defer CleanupLocalClient(client)

	type test struct {
		A string
		B int
	}

	testA := test{
		A: "test",
		B: 42,
	}
	testB := test{
		A: "test2",
		B: 43,
	}

	// Store some keys using the local client
	err := client.PutJSONBulk(map[string]any{
		"test":  testA,
		"test2": testB,
	})
	if err != nil {
		t.Fatal(err)
	}

	// Retrieve both keys from the store and verify them
	keys, err := store.GetBulk([]string{"test", "test2"})
	if err != nil {
		t.Fatal(err)
	}

	var testStored1 test
	err = jsoniter.ConfigFastest.UnmarshalFromString(keys["test"], &testStored1)
	if err != nil {
		t.Fatal(err)
	}

	var testStored2 test
	err = jsoniter.ConfigFastest.UnmarshalFromString(keys["test2"], &testStored2)
	if err != nil {
		t.Fatal(err)
	}

	if testStored1.A != testA.A {
		t.Fatalf("expected test A to be %s, got %s", testA.A, testStored1.A)
	}
	if testStored1.B != testA.B {
		t.Fatalf("expected test B to be %d, got %d", testA.B, testStored1.B)
	}
	if testStored2.A != testB.A {
		t.Fatalf("expected test2 A to be %s, got %s", testB.A, testStored2.A)
	}
	if testStored2.B != testB.B {
		t.Fatalf("expected test2 B to be %d, got %d", testB.B, testStored2.B)
	}
}

func TestLocalDBClientGetKey(t *testing.T) {
	client, store := CreateInMemoryLocalClient(t)
	defer CleanupLocalClient(client)

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

func TestLocalDBClientGetJSON(t *testing.T) {
	client, store := CreateInMemoryLocalClient(t)
	defer CleanupLocalClient(client)

	type test struct {
		A string
		B int
	}

	testStruct := test{
		A: "test",
		B: 42,
	}

	// Store a key directly in the store
	key := "test"
	byt, err := jsoniter.ConfigFastest.MarshalToString(testStruct)
	if err != nil {
		t.Fatal(err)
	}

	err = store.Set(key, byt)
	if err != nil {
		t.Fatal(err)
	}

	// Retrieve the key using the local client
	var stored test
	err = client.GetJSON(key, &stored)
	if err != nil {
		t.Fatal(err)
	}

	if stored.A != testStruct.A {
		t.Fatalf("expected A to be %s, got %s", testStruct.A, stored.A)
	}
	if stored.B != testStruct.B {
		t.Fatalf("expected B to be %d, got %d", testStruct.B, stored.B)
	}
}

func TestLocalDBClientGetAll(t *testing.T) {
	client, store := CreateInMemoryLocalClient(t)
	defer CleanupLocalClient(client)

	// Store a bunch of keys directly in the store
	keys := map[string]string{
		"test":  "value",
		"test2": "value2",
		"test3": "value3",
	}
	err := store.SetBulk(keys)
	if err != nil {
		t.Fatal(err)
	}

	// Retrieve the keys using the local client
	stored, err := client.GetAll("test")
	if err != nil {
		t.Fatal(err)
	}

	// Verify the correct keys are returned
	if len(stored) != 3 {
		t.Fatalf("expected 3 keys, got %d", len(stored))
	}
	for key, value := range keys {
		storedValue, ok := stored[key]
		if !ok {
			t.Errorf("expected key %s to be returned", key)
		}
		if storedValue != value {
			t.Errorf("expected key %s to be %s, got %s", key, value, storedValue)
		}
	}
}

func TestLocalDBClientRemoveKey(t *testing.T) {
	client, store := CreateInMemoryLocalClient(t)
	defer CleanupLocalClient(client)

	// Store a key directly in the store
	key := "test"
	err := store.Set(key, "value")
	if err != nil {
		t.Fatal(err)
	}

	// Remove the key using the local client
	err = client.RemoveKey(key)
	if err != nil {
		t.Fatal(err)
	}

	// Verify the key is removed
	_, err = store.Get(key)
	if err == nil {
		t.Fatal("expected key to be removed")
	} else if err != kv.ErrorKeyNotFound {
		t.Fatalf("expected key to be removed, got %s", err)
	}
}

func TestLocalDBClientSubscribeKey(t *testing.T) {
	client, _ := CreateInMemoryLocalClient(t)
	defer CleanupLocalClient(client)

	// Subscribe to a key using the local client
	key := "test"
	ch := make(chan string, 1)
	err, cancel := client.SubscribeKey(key, func(newValue string) {
		ch <- newValue
	})
	if err != nil {
		t.Fatal(err)
	}
	defer cancel()

	// Store a key
	err = client.PutKey(key, "value")
	if err != nil {
		t.Fatal(err)
	}

	select {
	case newValue := <-ch:
		if newValue != "value" {
			t.Fatalf("expected value to be %s, got %s", "value", newValue)
		}
	case <-time.After(time.Second * 2):
		t.Fatal("expected value to be received")
	}
}

func TestLocalDBClientSubscribePrefix(t *testing.T) {
	client, _ := CreateInMemoryLocalClient(t)
	defer CleanupLocalClient(client)

	// Subscribe to a prefix using the local client
	prefix := "test"
	ch := make(chan string, 1)
	err, cancel := client.SubscribePrefix(func(newKey, newValue string) {
		ch <- newValue
	}, prefix)
	if err != nil {
		t.Fatal(err)
	}
	defer cancel()

	// Write a key
	err = client.PutKey("testWithStuff", "value")
	if err != nil {
		t.Fatal(err)
	}

	select {
	case newValue := <-ch:
		if newValue != "value" {
			t.Fatalf("expected value to be %s, got %s", "value", newValue)
		}
	case <-time.After(time.Second * 2):
		t.Fatal("expected value to be received")
	}
}
