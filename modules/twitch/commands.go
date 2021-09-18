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
	ALTEveryone   AccessLevelType = "everyone"
	ALTVIP        AccessLevelType = "vip"
	ALTModerators AccessLevelType = "moderators"
	ALTStreamer   AccessLevelType = "streamer"
)

type BotCommandHandler func(bot *Bot, message irc.PrivateMessage)

type BotCommand struct {
	Description string
	Usage       string
	AccessLevel AccessLevelType
	Handler     BotCommandHandler
	Enabled     bool
}

func cmdCustom(bot *Bot, cmd string, data BotCustomCommand, message irc.PrivateMessage) {
	// Add future logic (like counters etc) here, for now it's just fixed messages
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
			counter := 0
			if byt, err := b.api.db.GetKey(BotCounterPrefix + name); err == nil {
				counter, _ = strconv.Atoi(string(byt))
			}
			counter += 1
			b.api.db.PutKey(BotCounterPrefix+name, []byte(strconv.Itoa(counter)))
			return counter
		},
	}
}
