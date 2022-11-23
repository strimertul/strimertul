package main

import (
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/cockroachdb/pebble"
	"github.com/labstack/gommon/log"
	kv "github.com/strimertul/kilovolt/v9"
	pebble_driver "github.com/strimertul/kv-pebble"
)

type PebbleDatabase struct {
	db  *pebble.DB
	hub *kv.Hub
}

// NewPebble creates a new database driver instance with an underlying Pebble database
func NewPebble(directory string) (*PebbleDatabase, error) {
	db, err := pebble.Open(directory, &pebble.Options{})
	if err != nil {
		return nil, fmt.Errorf("could not open DB: %w", err)
	}

	// Create file for autodetect
	err = os.WriteFile(filepath.Join(directory, "stul-driver"), []byte("pebble"), 0o644)
	if err != nil {
		return nil, fmt.Errorf("could not write driver file: %w", err)
	}

	p := &PebbleDatabase{
		db:  db,
		hub: nil,
	}

	return p, nil
}

func (p *PebbleDatabase) Hub() *kv.Hub {
	if p.hub == nil {
		p.hub, _ = kv.NewHub(pebble_driver.NewPebbleBackend(p.db, true), kv.HubOptions{}, logger)
	}
	return p.hub
}

func (p *PebbleDatabase) Close() error {
	err := p.db.Close()
	log.Info("database was closed")
	if err != nil {
		return fmt.Errorf("Could not close database: %w", err)
	}
	return nil
}

func (p *PebbleDatabase) Import(entries map[string]string) error {
	batch := p.db.NewBatch()
	for key, value := range entries {
		batch.Set([]byte(key), []byte(value), &pebble.WriteOptions{})
	}
	return batch.Commit(&pebble.WriteOptions{})
}

func (p *PebbleDatabase) Export(file io.Writer) error {
	return p.Backup(file)
}

func (p *PebbleDatabase) Restore(file io.Reader) error {
	in := make(map[string]string)
	err := json.NewDecoder(file).Decode(&in)
	if err != nil {
		return fmt.Errorf("Could not decode backup: %w", err)
	}

	b := p.db.NewBatch()
	for k, v := range in {
		err = b.Set([]byte(k), []byte(v), nil)
		if err != nil {
			return fmt.Errorf("Could not set key %s: %w", k, err)
		}
	}

	return b.Commit(&pebble.WriteOptions{Sync: true})
}

func (p *PebbleDatabase) Backup(file io.Writer) error {
	iter := p.db.NewSnapshot().NewIter(&pebble.IterOptions{})
	out := make(map[string]string)
	for iter.First(); iter.Valid(); iter.Next() {
		out[string(iter.Key())] = string(iter.Value())
	}
	return json.NewEncoder(file).Encode(out)
}
