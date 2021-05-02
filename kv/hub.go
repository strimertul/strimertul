package kv

import (
	"context"
	"fmt"

	"github.com/dgraph-io/badger/v3"
	"github.com/dgraph-io/badger/v3/pb"
	jsoniter "github.com/json-iterator/go"
	"github.com/strimertul/strimertul/logger"
)

type rawMessage struct {
	Client *Client
	Data   []byte
}

type clientList map[*Client]bool

type Hub struct {
	clients    clientList
	incoming   chan rawMessage
	register   chan *Client
	unregister chan *Client

	subscribers map[string]clientList

	db *badger.DB

	logger logger.LogFn
}

var json = jsoniter.ConfigDefault

func NewHub(db *badger.DB, logger logger.LogFn) *Hub {
	hub := &Hub{
		incoming:    make(chan rawMessage, 10),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		clients:     make(clientList),
		subscribers: make(map[string]clientList),
		db:          db,
		logger:      logger,
	}

	go func() {
		db.Subscribe(context.Background(), hub.update, []byte{})
	}()

	return hub
}

func (h *Hub) update(kvs *pb.KVList) error {
	for _, kv := range kvs.Kv {
		key := string(kv.Key)

		// Check for subscribers
		if subscribers, ok := h.subscribers[key]; ok {
			// Notify subscribers
			submsg, _ := json.Marshal(wsPush{"push", key, string(kv.Value)})
			for client := range subscribers {
				client.send <- submsg
			}
		}
	}
	return nil
}

func sendErr(client *Client, err string) {
	msg, _ := json.Marshal(wsError{err})
	client.send <- msg
}

func (h *Hub) ReadKey(key string) (string, error) {
	tx := h.db.NewTransaction(false)
	defer tx.Discard()

	val, err := tx.Get([]byte(key))
	if err != nil {
		return "", err
	}
	byt, err := val.ValueCopy(nil)
	return string(byt), err
}

func (h *Hub) WriteKey(key string, data string) error {
	tx := h.db.NewTransaction(true)
	defer tx.Discard()

	err := tx.Set([]byte(key), []byte(data))
	if err != nil {
		return err
	}
	return tx.Commit()
}

func (h *Hub) handleCmd(client *Client, message rawMessage) {
	var msg wsRequest
	err := json.Unmarshal(message.Data, &msg)
	if err != nil {
		sendErr(message.Client, fmt.Sprintf("invalid message format: %v", err.Error()))
		return
	}

	switch msg.CmdName {
	case CmdReadKey:
		// Check params
		key, ok := msg.Data["key"].(string)
		if !ok {
			sendErr(client, "invalid 'key' param")
			return
		}

		h.db.View(func(tx *badger.Txn) error {
			val, err := tx.Get([]byte(key))
			if err != nil {
				if err == badger.ErrKeyNotFound {
					msg, _ := json.Marshal(wsGenericResponse{"response", true, string(message.Data), string("")})
					client.send <- msg
					h.logger(logger.MTWarning, "get for inexistant key: %s", key)
					return nil
				}
				return err
			}
			byt, err := val.ValueCopy(nil)
			if err != nil {
				return err
			}
			msg, _ := json.Marshal(wsGenericResponse{"response", true, string(message.Data), string(byt)})
			client.send <- msg
			h.logger(logger.MTDebug, "get key %s: %s", key, message.Data)
			return nil
		})
	case CmdWriteKey:
		// Check params
		key, ok := msg.Data["key"].(string)
		if !ok {
			sendErr(client, "invalid 'key' param")
			return
		}
		data, ok := msg.Data["data"].(string)
		if !ok {
			sendErr(client, "invalid 'key' param")
			return
		}

		err := h.db.Update(func(tx *badger.Txn) error {
			return tx.Set([]byte(key), []byte(data))
		})
		if err != nil {
			sendErr(client, fmt.Sprintf("update failed: %v", err.Error()))
		}
		// Send OK response
		msg, _ := json.Marshal(wsEmptyResponse{"response", true, string(message.Data)})
		client.send <- msg

		h.logger(logger.MTDebug, "modified key %s: %s", key, data)
	case CmdSubscribeKey:
		// Check params
		key, ok := msg.Data["key"].(string)
		if !ok {
			sendErr(client, "invalid 'key' param")
			return
		}
		_, ok = h.subscribers[key]
		if !ok {
			h.subscribers[key] = make(clientList)
		}
		h.subscribers[key][client] = true
		h.logger(logger.MTDebug, "%s subscribed to %s", client.conn.RemoteAddr(), key)
		// Send OK response
		msg, _ := json.Marshal(wsEmptyResponse{"response", true, string(message.Data)})
		client.send <- msg
	case CmdUnsubscribeKey:
		// Check params
		key, ok := msg.Data["key"].(string)
		if !ok {
			sendErr(client, "invalid 'key' param")
			return
		}
		_, ok = h.subscribers[key]
		if !ok {
			sendErr(client, "subscription does not exist")
			return
		}
		if _, ok := h.subscribers[key][client]; !ok {
			sendErr(client, "you are not subscribed to this")
			return
		}
		delete(h.subscribers[key], client)
		h.logger(logger.MTDebug, "%s unsubscribed to %s", client.conn.RemoteAddr(), key)
		// Send OK response
		msg, _ := json.Marshal(wsEmptyResponse{"response", true, string(message.Data)})
		client.send <- msg
	default:
		sendErr(client, "unknown command")
	}
}

func (h *Hub) Run() {
	h.logger(logger.MTNotice, "running")
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			// Make sure client is considered active first
			if _, ok := h.clients[client]; !ok {
				continue
			}
			// Unsubscribe from all keys
			for key := range h.subscribers {
				delete(h.subscribers[key], client)
			}
			// Delete entry and close channel
			delete(h.clients, client)
			close(client.send)
		case message := <-h.incoming:
			h.handleCmd(message.Client, message)
		}
	}
}
