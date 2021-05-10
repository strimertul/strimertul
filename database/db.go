package database

import (
	"context"

	"github.com/dgraph-io/badger/v3"
	jsoniter "github.com/json-iterator/go"
	"github.com/sirupsen/logrus"
)

var json = jsoniter.ConfigFastest

var (
	ErrKeyNotFound = badger.ErrKeyNotFound
)

type DB struct {
	client *badger.DB
	logger logrus.FieldLogger
}

type ModifiedKV struct {
	Key     string
	Data    []byte
	Meta    []byte
	Version uint64
	Expires uint64
}

func Open(options badger.Options, logger logrus.FieldLogger) (*DB, error) {
	options.Logger = logger
	client, err := badger.Open(options)

	return &DB{
		client: client,
		logger: logger,
	}, err
}

func (db *DB) Client() *badger.DB {
	return db.client
}

func (db *DB) Close() {
	db.Close()
}

func (db *DB) GetKey(key string) ([]byte, error) {
	var byt []byte
	err := db.client.View(func(t *badger.Txn) error {
		item, err := t.Get([]byte(key))
		if err != nil {
			return err
		}
		byt, err = item.ValueCopy(nil)
		return err
	})
	return byt, err
}

func (db *DB) PutKey(key string, data []byte) error {
	return db.client.Update(func(t *badger.Txn) error {
		return t.Set([]byte(key), data)
	})
}

func (db *DB) Subscribe(ctx context.Context, fn func(changed []ModifiedKV) error, prefixes ...string) error {
	prefixList := make([][]byte, len(prefixes))
	for index, prefix := range prefixes {
		prefixList[index] = []byte(prefix)
	}
	return db.client.Subscribe(ctx, func(kv *badger.KVList) error {
		modified := make([]ModifiedKV, len(kv.Kv))
		for index, newKV := range kv.Kv {
			modified[index] = ModifiedKV{
				Key:     string(newKV.Key),
				Data:    newKV.Value,
				Meta:    newKV.UserMeta,
				Version: newKV.Version,
				Expires: newKV.ExpiresAt,
			}
		}
		return fn(modified)
	}, prefixList...)
}

func (db *DB) GetJSON(key string, dst interface{}) error {
	return db.client.View(func(t *badger.Txn) error {
		item, err := t.Get([]byte(key))
		if err != nil {
			return err
		}
		byt, err := item.ValueCopy(nil)
		if err != nil {
			return err
		}
		return json.Unmarshal(byt, dst)
	})
}

func (db *DB) PutJSON(key string, data interface{}) error {
	return db.client.Update(func(t *badger.Txn) error {
		byt, err := json.Marshal(data)
		if err != nil {
			return err
		}
		return t.Set([]byte(key), byt)
	})
}
