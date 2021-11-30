package twitch

import (
	"bytes"
	"math/rand"
	"strconv"
	"strings"
	"text/template"

	irc "github.com/gempir/go-twitch-irc/v2"
	"github.com/nicklaw5/helix"
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

	// Add future logic (like counters etc.) here, for now it's just fixed messages
	var buf bytes.Buffer
	err := bot.customTemplates[cmd].Execute(&buf, message)
	if err != nil {
		bot.logger.WithError(err).Error("Failed to execute custom command template")
		return
	}
	bot.Client.Say(message.Channel, buf.String())
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
				counter, _ = strconv.Atoi(string(byt))
			}
			counter += 1
			err := b.api.db.PutKey(counterKey, []byte(strconv.Itoa(counter)))
			if err != nil {
				b.logger.WithError(err).WithField("key", counterKey).Error("error saving key")
			}
			return counter
		},
	}
}
