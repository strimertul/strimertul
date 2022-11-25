package database

import (
	"errors"
	"fmt"

	"github.com/strimertul/strimertul/modules"

	jsoniter "github.com/json-iterator/go"
	kv "github.com/strimertul/kilovolt/v9"
	"go.uber.org/zap"
)

var json = jsoniter.ConfigFastest

var (
	// ErrUnknown is returned when a response is received that doesn't match any expected outcome.
	ErrUnknown = errors.New("unknown error")

	// ErrEmptyKey is when a key is requested as JSON object but is an empty string (or unset)
	ErrEmptyKey = errors.New("empty key")
)

type DBModule struct {
	client *kv.LocalClient
	hub    *kv.Hub
	logger *zap.Logger
}

type KvPair struct {
	Key  string
	Data string
}

func NewDBModule(hub *kv.Hub, manager *modules.Manager) (*DBModule, error) {
	logger := manager.Logger(modules.ModuleDB)
	localClient := kv.NewLocalClient(kv.ClientOptions{}, logger)
	go localClient.Run()
	hub.AddClient(localClient)
	localClient.Wait()
	err := hub.SetAuthenticated(localClient.UID(), true)
	if err != nil {
		return nil, err
	}
	module := &DBModule{
		client: localClient,
		hub:    hub,
		logger: logger,
	}

	manager.Modules[modules.ModuleDB] = module
	return module, nil
}

func (mod *DBModule) Hub() *kv.Hub {
	return mod.hub
}

func (mod *DBModule) Status() modules.ModuleStatus {
	return modules.ModuleStatus{
		Enabled:      mod.hub != nil,
		Working:      mod.client != nil,
		StatusString: "ok",
	}
}

func (mod *DBModule) Close() error {
	mod.hub.RemoveClient(mod.client)
	return nil
}

func (mod *DBModule) GetKey(key string) (string, error) {
	res, err := mod.makeRequest(kv.CmdReadKey, map[string]interface{}{"key": key})
	if err != nil {
		return "", err
	}
	return res.Data.(string), nil
}

func (mod *DBModule) PutKey(key string, data string) error {
	_, err := mod.makeRequest(kv.CmdWriteKey, map[string]interface{}{"key": key, "data": data})
	return err
}

func (mod *DBModule) Subscribe(fn kv.SubscriptionCallback, prefixes ...string) error {
	for _, prefix := range prefixes {
		_, err := mod.makeRequest(kv.CmdSubscribePrefix, map[string]interface{}{"prefix": prefix})
		if err != nil {
			return err
		}
		go mod.client.SetPrefixSubCallback(prefix, fn)
	}
	return nil
}

func (mod *DBModule) SubscribeKey(fn func(string), key string) error {
	_, err := mod.makeRequest(kv.CmdSubscribePrefix, map[string]interface{}{"prefix": key})
	if err != nil {
		return err
	}
	go mod.client.SetPrefixSubCallback(key, func(changedKey string, value string) {
		if key != changedKey {
			return
		}
		fn(value)
	})
	return nil
}

func (mod *DBModule) GetJSON(key string, dst interface{}) error {
	res, err := mod.GetKey(key)
	if err != nil {
		return err
	}
	if res == "" {
		return ErrEmptyKey
	}
	return json.Unmarshal([]byte(res), dst)
}

func (mod *DBModule) GetAll(prefix string) (map[string]string, error) {
	res, err := mod.makeRequest(kv.CmdReadPrefix, map[string]interface{}{"prefix": prefix})
	if err != nil {
		return nil, err
	}

	out := make(map[string]string)
	for key, value := range res.Data.(map[string]interface{}) {
		out[key] = value.(string)
	}
	return out, nil
}

func (mod *DBModule) PutJSON(key string, data interface{}) error {
	byt, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return mod.PutKey(key, string(byt))
}

func (mod *DBModule) PutJSONBulk(kvs map[string]interface{}) error {
	encoded := make(map[string]interface{})
	for k, v := range kvs {
		byt, err := json.Marshal(v)
		if err != nil {
			return err
		}
		encoded[k] = string(byt)
	}
	_, chn := mod.client.MakeRequest(kv.CmdWriteBulk, encoded)
	_, err := getResponse(<-chn)
	return err
}

func (mod *DBModule) RemoveKey(key string) error {
	// TODO
	return mod.PutKey(key, "")
}

func (mod *DBModule) makeRequest(cmd string, data map[string]interface{}) (kv.Response, error) {
	req, chn := mod.client.MakeRequest(cmd, data)
	mod.hub.SendMessage(req)
	return getResponse(<-chn)
}

func getResponse(response interface{}) (kv.Response, error) {
	switch c := response.(type) {
	case kv.Response:
		return c, nil
	case kv.Error:
		return kv.Response{}, &KvError{c}
	}
	return kv.Response{}, ErrUnknown
}

type KvError struct {
	ErrorData kv.Error
}

func (kv *KvError) Error() string {
	return fmt.Sprintf("%s: %s", kv.ErrorData.Error, kv.ErrorData.Details)
}
