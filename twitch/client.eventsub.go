package twitch

import (
	"fmt"
	"time"

	"github.com/gorilla/websocket"
	jsoniter "github.com/json-iterator/go"
	"github.com/nicklaw5/helix/v2"
	"go.uber.org/zap"
)

const websocketEndpoint = "wss://eventsub-beta.wss.twitch.tv/ws"

func (c *Client) connectWebsocket() {
	connection, _, err := websocket.DefaultDialer.Dial(websocketEndpoint, nil)
	if err != nil {
		c.logger.Error("could not connect to eventsub ws", zap.Error(err))
		return
	}
	defer connection.Close()

	received := make(chan []byte)
	wsErr := make(chan error)
	go func(recv chan<- []byte) {
		for {
			messageType, messageData, err := connection.ReadMessage()
			if err != nil {
				c.logger.Warn("eventsub ws read error", zap.Error(err))
				wsErr <- err
				return
			}
			if messageType != websocket.TextMessage {
				continue
			}

			recv <- messageData
		}
	}(received)

	for {
		// Wait for next message or closing/error
		var messageData []byte
		select {
		case <-c.ctx.Done():
			return
		case <-wsErr:
			return
		case messageData = <-received:
		}

		var wsMessage EventSubWebsocketMessage
		err = json.Unmarshal(messageData, &wsMessage)
		if err != nil {
			c.logger.Error("eventsub ws decode error", zap.Error(err))
			continue
		}

		switch wsMessage.Metadata.MessageType {
		case "session_keepalive":
			// Nothing to do
		case "session_welcome":
			var welcomeData WelcomeMessagePayload
			err = json.Unmarshal(wsMessage.Payload, &welcomeData)
			if err != nil {
				c.logger.Error("eventsub ws decode error", zap.String("message-type", wsMessage.Metadata.MessageType), zap.Error(err))
			}
			c.logger.Info("eventsub ws connection established", zap.String("session-id", welcomeData.Session.Id))
			// Add subscription to websocket session
			err = c.addSubscriptionsForSession(welcomeData.Session.Id)
			if err != nil {
				c.logger.Error("could not add subscriptions", zap.Error(err))
			}
		case "session_reconnect":
			var reconnectData WelcomeMessagePayload
			err = json.Unmarshal(wsMessage.Payload, &reconnectData)
			if err != nil {
				c.logger.Error("eventsub ws decode error", zap.String("message-type", wsMessage.Metadata.MessageType), zap.Error(err))
			}
			c.logger.Info("eventsub ws connection reset requested", zap.String("session-id", reconnectData.Session.Id), zap.String("reconnect-url", reconnectData.Session.ReconnectUrl))

			// Try reconnecting to the new URL
			newConnection, _, err := websocket.DefaultDialer.Dial(reconnectData.Session.ReconnectUrl, nil)
			if err != nil {
				c.logger.Error("eventsub ws reconnect error", zap.Error(err))
			} else {
				_ = connection.Close()
				connection = newConnection
			}
		case "notification":
			go c.processEvent(wsMessage)
		case "revocation":
			// TODO idk what to do here
		}
	}
}

func (c *Client) processEvent(message EventSubWebsocketMessage) {
	// Check if we processed this already
	if message.Metadata.MessageId != "" {
		if c.eventCache.Contains(message.Metadata.MessageId) {
			c.logger.Debug("Received duplicate event, ignoring", zap.String("message-id", message.Metadata.MessageId))
			return
		}
	}
	defer c.eventCache.Add(message.Metadata.MessageId, message.Metadata.MessageTimestamp)

	// Decode data
	var notificationData NotificationMessagePayload
	err := json.Unmarshal(message.Payload, &notificationData)
	if err != nil {
		c.logger.Error("eventsub ws decode error", zap.String("message-type", message.Metadata.MessageType), zap.Error(err))
	}

	err = c.db.PutJSON(EventSubEventKey, notificationData)
	if err != nil {
		c.logger.Error("error saving event to db", zap.String("key", EventSubEventKey), zap.Error(err))
	}

	var archive []NotificationMessagePayload
	err = c.db.GetJSON(EventSubHistoryKey, &archive)
	if err != nil {
		archive = []NotificationMessagePayload{}
	}
	archive = append(archive, notificationData)
	if len(archive) > EventSubHistorySize {
		archive = archive[len(archive)-EventSubHistorySize:]
	}
	err = c.db.PutJSON(EventSubHistoryKey, archive)
	if err != nil {
		c.logger.Error("error saving event to db", zap.String("key", EventSubHistoryKey), zap.Error(err))
	}
}

func (c *Client) addSubscriptionsForSession(session string) error {
	if c.savedSubscriptions[session] {
		// Already subscribed
		return nil
	}

	client, err := c.GetUserClient()
	if err != nil {
		return fmt.Errorf("failed getting API client for user: %w", err)
	}

	users, err := client.GetUsers(&helix.UsersParams{})
	if err != nil {
		return fmt.Errorf("failed looking up user: %w", err)
	}
	if len(users.Data.Users) < 1 {
		return fmt.Errorf("no users found")
	}
	user := users.Data.Users[0]

	transport := helix.EventSubTransport{
		Method:    "websocket",
		SessionID: session,
	}
	for topic, version := range subscriptionVersions {
		sub, err := client.CreateEventSubSubscription(&helix.EventSubSubscription{
			Type:      topic,
			Version:   version,
			Status:    "enabled",
			Transport: transport,
			Condition: topicCondition(topic, user.ID),
		})
		if sub.Error != "" || sub.ErrorMessage != "" {
			c.logger.Error("subscription error", zap.String("err", sub.Error), zap.String("message", sub.ErrorMessage))
			return fmt.Errorf("%s: %s", sub.Error, sub.ErrorMessage)
		}
		if err != nil {
			return fmt.Errorf("error subscribing to %s: %w", topic, err)
		}
	}
	c.savedSubscriptions[session] = true
	return nil
}

func topicCondition(topic string, id string) helix.EventSubCondition {
	switch topic {
	case "channel.raid":
		return helix.EventSubCondition{
			ToBroadcasterUserID: id,
		}
	default:
		return helix.EventSubCondition{
			BroadcasterUserID: id,
		}
	}
}

type EventSubWebsocketMessage struct {
	Metadata EventSubMetadata    `json:"metadata"`
	Payload  jsoniter.RawMessage `json:"payload"`
}

type WelcomeMessagePayload struct {
	Session struct {
		Id                      string    `json:"id"`
		Status                  string    `json:"status"`
		ConnectedAt             time.Time `json:"connected_at"`
		KeepaliveTimeoutSeconds int       `json:"keepalive_timeout_seconds"`
		ReconnectUrl            string    `json:"reconnect_url,omitempty"`
	} `json:"session"`
}

type NotificationMessagePayload struct {
	Subscription helix.EventSubSubscription `json:"subscription"`
	Event        jsoniter.RawMessage        `json:"event"`
}

type EventSubMetadata struct {
	MessageId           string    `json:"message_id"`
	MessageType         string    `json:"message_type"`
	MessageTimestamp    time.Time `json:"message_timestamp"`
	SubscriptionType    string    `json:"subscription_type"`
	SubscriptionVersion string    `json:"subscription_version"`
}

var subscriptionVersions = map[string]string{
	helix.EventSubTypeChannelUpdate:                             "1",
	helix.EventSubTypeChannelFollow:                             "1",
	helix.EventSubTypeChannelSubscription:                       "1",
	helix.EventSubTypeChannelSubscriptionGift:                   "1",
	helix.EventSubTypeChannelSubscriptionMessage:                "1",
	helix.EventSubTypeChannelCheer:                              "1",
	helix.EventSubTypeChannelRaid:                               "1",
	helix.EventSubTypeChannelPollBegin:                          "1",
	helix.EventSubTypeChannelPollProgress:                       "1",
	helix.EventSubTypeChannelPollEnd:                            "1",
	helix.EventSubTypeChannelPredictionBegin:                    "1",
	helix.EventSubTypeChannelPredictionProgress:                 "1",
	helix.EventSubTypeChannelPredictionLock:                     "1",
	helix.EventSubTypeChannelPredictionEnd:                      "1",
	helix.EventSubTypeHypeTrainBegin:                            "1",
	helix.EventSubTypeHypeTrainProgress:                         "1",
	helix.EventSubTypeHypeTrainEnd:                              "1",
	helix.EventSubTypeChannelPointsCustomRewardAdd:              "1",
	helix.EventSubTypeChannelPointsCustomRewardUpdate:           "1",
	helix.EventSubTypeChannelPointsCustomRewardRemove:           "1",
	helix.EventSubTypeChannelPointsCustomRewardRedemptionAdd:    "1",
	helix.EventSubTypeChannelPointsCustomRewardRedemptionUpdate: "1",
	helix.EventSubTypeStreamOnline:                              "1",
	helix.EventSubTypeStreamOffline:                             "1",
}
