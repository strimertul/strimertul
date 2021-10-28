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
	client, err := badger.Open(options)

	return &DB{
		client: client,
		logger: logger,
	}, err
}

func (db *DB) Client() *badger.DB {
	return db.client
}

func (db *DB) Close() error {
	return db.client.Close()
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

func (db *DB) GetAll(prefix string) (map[string]string, error) {
	out := make(map[string]string)
	err := db.client.View(func(t *badger.Txn) error {
		opt := badger.DefaultIteratorOptions
		opt.Prefix = []byte(prefix)
		it := t.NewIterator(opt)
		defer it.Close()
		for it.Rewind(); it.Valid(); it.Next() {
			item := it.Item()
			byt, err := item.ValueCopy(nil)
			if err != nil {
				return err
			}
			out[string(item.Key()[len(prefix):])] = string(byt)
		}
		return nil
	})
	return out, err
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

func (db *DB) PutJSONBulk(kvs map[string]interface{}) error {
	return db.client.Update(func(t *badger.Txn) error {
		for k, v := range kvs {
			byt, err := json.Marshal(v)
			if err != nil {
				return err
			}
			err = t.Set([]byte(k), byt)
			if err != nil {
				return err
			}
		}
		return nil
	})
}

func (db *DB) RemoveKey(key string) error {
	return db.client.Update(func(t *badger.Txn) error {
		return t.Delete([]byte(key))
	})
}
