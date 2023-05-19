package twitch

import (
	"bytes"
	"github.com/Masterminds/sprig/v3"
	"math/rand"
	"strconv"
	"strings"
	"text/template"
	"time"

	irc "github.com/gempir/go-twitch-irc/v4"
	"github.com/nicklaw5/helix/v2"
	"go.uber.org/zap"
)

type AccessLevelType string

const (
	ALTEveryone    AccessLevelType = "everyone"
	ALTSubscribers AccessLevelType = "subscriber"
	ALTVIP         AccessLevelType = "vip"
	ALTModerators  AccessLevelType = "moderators"
	ALTStreamer    AccessLevelType = "streamer"
)

var accessLevels = map[AccessLevelType]int{
	ALTEveryone:    0,
	ALTSubscribers: 1,
	ALTVIP:         2,
	ALTModerators:  3,
	ALTStreamer:    999,
}

type BotCommandHandler func(bot *Bot, message irc.PrivateMessage)

type BotCommand struct {
	Description string
	Usage       string
	AccessLevel AccessLevelType
	Handler     BotCommandHandler
	Enabled     bool
}

func cmdCustom(bot *Bot, cmd string, data BotCustomCommand, message irc.PrivateMessage) {
	// Check access level
	accessLevel := getUserAccessLevel(message.User)

	// Ensure that access level is high enough
	if accessLevels[accessLevel] < accessLevels[data.AccessLevel] {
		return
	}

	var buf bytes.Buffer
	tpl, ok := bot.customTemplates.GetKey(cmd)
	if !ok {
		return
	}
	if err := tpl.Execute(&buf, message); err != nil {
		bot.logger.Error("Failed to execute custom command template", zap.Error(err))
		return
	}

	switch data.ResponseType {
	case ResponseTypeDefault, ResponseTypeChat:
		bot.Client.Say(message.Channel, buf.String())
	case ResponseTypeReply:
		bot.Client.Reply(message.Channel, message.ID, buf.String())
	case ResponseTypeWhisper:
		client, err := bot.api.GetUserClient(false)
		reply, err := client.SendUserWhisper(&helix.SendUserWhisperParams{
			FromUserID: bot.api.User.ID,
			ToUserID:   message.User.ID,
			Message:    buf.String(),
		})
		if reply.Error != "" {
			bot.logger.Error("Failed to send whisper", zap.String("code", reply.Error), zap.String("message", reply.ErrorMessage))
		}
		if err != nil {
			bot.logger.Error("Failed to send whisper", zap.Error(err))
		}

	case ResponseTypeAnnounce:
		client, err := bot.api.GetUserClient(false)
		reply, err := client.SendChatAnnouncement(&helix.SendChatAnnouncementParams{
			BroadcasterID: bot.api.User.ID,
			ModeratorID:   bot.api.User.ID,
			Message:       buf.String(),
		})
		if reply.Error != "" {
			bot.logger.Error("Failed to send announcement", zap.String("code", reply.Error), zap.String("message", reply.ErrorMessage))
		}
		if err != nil {
			bot.logger.Error("Failed to send announcement", zap.Error(err))
		}
	}
}

func (b *Bot) MakeTemplate(message string) (*template.Template, error) {
	return template.New("").Funcs(sprig.TxtFuncMap()).Funcs(b.customFunctions).Parse(message)
}

var TestMessageData = irc.PrivateMessage{
	User: irc.User{
		ID:          "603448316",
		Name:        "ashkeelvt",
		DisplayName: "AshKeelVT",
		Color:       "#EC2B87",
		Badges: map[string]int{
			"subscriber":  0,
			"moments":     1,
			"broadcaster": 1,
		},
	},
	Type: 1,
	Tags: map[string]string{
		"emotes":            "",
		"first-msg":         "0",
		"id":                "e6b80ab3-d068-4226-83b2-a991da9c0cc3",
		"turbo":             "0",
		"user-id":           "603448316",
		"badges":            "broadcaster/1,subscriber/0,moments/1",
		"color":             "#EC2B87",
		"user-type":         "",
		"room-id":           "603448316",
		"tmi-sent-ts":       "1684345559394",
		"flags":             "",
		"mod":               "0",
		"returning-chatter": "0",
		"badge-info":        "subscriber/21",
		"display-name":      "AshKeelVT",
		"subscriber":        "1",
	},
	Message: "!test",
	Channel: "ashkeelvt",
	RoomID:  "603448316",
	ID:      "e6b80ab3-d068-4226-83b2-a991da9c0cc3",
	Time:    time.Now(),
	Emotes:  nil,
	Bits:    0,
	Action:  false,
}

func (b *Bot) setupFunctions() {
	b.customFunctions = template.FuncMap{
		"user": func(message irc.PrivateMessage) string {
			return message.User.DisplayName
		},
		"param": func(num int, message irc.PrivateMessage) string {
			parts := strings.Split(message.Message, " ")
			if num >= len(parts) {
				return parts[len(parts)-1]
			}
			return parts[num]
		},
		"randomInt": func(min int, max int) int {
			return rand.Intn(max-min) + min
		},
		"game": func(channel string) string {
			channel = strings.TrimLeft(channel, "@")
			info, err := b.api.API.SearchChannels(&helix.SearchChannelsParams{Channel: channel, First: 1, LiveOnly: false})
			if err != nil {
				return "unknown"
			}
			return info.Data.Channels[0].GameName
		},
		"count": func(name string) int {
			counterKey := BotCounterPrefix + name
			counter := 0
			if byt, err := b.api.db.GetKey(counterKey); err == nil {
				counter, _ = strconv.Atoi(byt)
			}
			counter += 1
			err := b.api.db.PutKey(counterKey, strconv.Itoa(counter))
			if err != nil {
				b.logger.Error("Error saving key", zap.Error(err), zap.String("key", counterKey))
			}
			return counter
		},
	}
}
