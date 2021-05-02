package utils

import (
	"encoding/json"

	"github.com/dgraph-io/badger/v3"
)

func GetJSONTx(t *badger.Txn, key string, dst interface{}) error {
	item, err := t.Get([]byte(key))
	if err != nil {
		return err
	}
	byt, err := item.ValueCopy(nil)
	if err != nil {
		return err
	}
	return json.Unmarshal(byt, dst)
}

func DBGetJSON(db *badger.DB, key string, dst interface{}) error {
	return db.View(func(t *badger.Txn) error {
		return GetJSONTx(t, key, dst)
	})
}
