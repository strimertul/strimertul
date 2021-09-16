package twitch

import (
	irc "github.com/gempir/go-twitch-irc/v2"
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

type BotCustomCommand struct {
	Description string
	AccessLevel AccessLevelType
	Response    string
	Enabled     bool
}

var commands = map[string]BotCommand{}
var customCommands = map[string]BotCustomCommand{}

func cmdCustom(bot *Bot, cmd BotCustomCommand, message irc.PrivateMessage) {
	// Add future logic (like counters etc) here, for now it's just fixed messages
	bot.Client.Say(message.Channel, cmd.Response)
}
