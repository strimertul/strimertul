package database

import (
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/strimertul/strimertul/utils"

	"github.com/cockroachdb/pebble"
	kv "github.com/strimertul/kilovolt/v9"
	pebble_driver "github.com/strimertul/kv-pebble"
	"go.uber.org/zap"
)

type PebbleDatabase struct {
	db     *pebble.DB
	hub    *kv.Hub
	logger *zap.Logger
}

// NewPebble creates a new database driver instance with an underlying Pebble database
func NewPebble(directory string, logger *zap.Logger) (*PebbleDatabase, error) {
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
		db:     db,
		hub:    nil,
		logger: logger,
	}

	return p, nil
}

func (p *PebbleDatabase) Hub() *kv.Hub {
	if p.hub == nil {
		p.hub, _ = kv.NewHub(pebble_driver.NewPebbleBackend(p.db, true), kv.HubOptions{}, p.logger)
	}
	return p.hub
}

func (p *PebbleDatabase) Close() error {
	if p.hub != nil {
		p.hub.Close()
	}
	err := p.db.Close()
	if err != nil {
		return fmt.Errorf("could not close database: %w", err)
	}
	return nil
}

func (p *PebbleDatabase) Import(entries map[string]string) error {
	batch := p.db.NewBatch()
	for key, value := range entries {
		err := batch.Set([]byte(key), []byte(value), &pebble.WriteOptions{})
		if err != nil {
			return err
		}
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
	snapshot := p.db.NewSnapshot()
	defer utils.Close(snapshot, p.logger)

	iter := snapshot.NewIter(&pebble.IterOptions{})
	defer utils.Close(iter, p.logger)

	out := make(map[string]string)
	for iter.First(); iter.Valid(); iter.Next() {
		val, err := iter.ValueAndErr()
		if err != nil {
			return err
		}
		out[string(iter.Key())] = string(val)
	}
	return json.NewEncoder(file).Encode(out)
}
