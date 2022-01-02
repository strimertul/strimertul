# Twitch integration

## Configuration

### Enable/disable Twitch integration

The Twitch integration can be enabled/disabled via `stul-meta/modules`, see [modules.md](./modules.md) for more details.

### Twitch integration configuration

The Twitch integration can be configured via `twitch/config` using a JSON object like this:

```js
{
	"enabled": bool,             // Enable Twitch module (required)
	"enable_bot": bool,          // Enable IRC bot
	"api_client_id": string,     // Twitch App Client ID
	"api_client_secret": string  // Twitch App Client Secret
}
```

The IRC bot has its own configuration in `twitch/bot-config` as the following JSON object:

```js
{
	"username": string, // Bot username, probably ignored
	"oauth": string,    // OAuth token
	"channel": string,  // Twitch channel to join
	"chat_keys": bool,  // True to enable chatlog keys
	"chat_history": int // How many messages to save in twitch/chat-history
}
```

If `chat_keys` is enabled, these keys will be updated every time a new message is written in the specified channel:

- `twitch/ev/chat-message` containing the message that was just written
- `twitch/chat-history` containing the updated list of the last N messages (N depends on `chat_history`)

See [this page](https://github.com/strimertul/strimertul/wiki/Extending-the-bot-with-external-modules) for info on chat message schema.

## Custom commands

The bot supports user-defined custom commands for basic things like auto-replies, counters and shoutouts.

The key `twitch/bot-custom-commands` contains a JSON dictionary of custom commands like the following:

```js
{
	"!command" : {
		"description": string,  // Command description, for UI only
		"access_level": string, // Minimum required access level, see below
		"response": string,     // Response
		"enabled": bool         // Must be true for the command to work
	},
	...
}
```

### Access levels

The `access_level` property must be a string determining what kind of users can use the command, it can be one of the following:

| Access level identifier | Minimum access level      |
| ----------------------- | ------------------------- |
| `"streamer"`            | Just the broadcaster      |
| `"moderators"`          | Moderators and up         |
| `"vip"`                 | VIP and up                |
| `"subscriber"`          | Twitch subscribers and up |
| `"everyone"`            | Everyone                  |

Every level allows people in the upper tiers to use the command as well (eg. a VIP-only command can be used by the broadcaster and moderators).

### Response templating

Responses are fully functional golang templates, please refer to [text/template](https://pkg.go.dev/text/template) for a full reference on syntax and functionality.

The following functions are available:

- Every function in [sprig](https://masterminds.github.io/sprig/)
- [`user .`] retrieves the Twitch username of whoever typed the command
- [`param N .`] retrieves the Nth word after the command (ie. "`param 1 .`" on "`!so something awful`" would return "`something`")
- [`randomInt MIN MAX`] returns a random integer between MIN and MAX
- [`game USERNAME`] returns the current game for Twitch user USERNAME
- [`count COUNTER`] increases the counter for key `COUNTER` by 1 and returns it

## Sending text as the bot

Writing any string to `twitch/@send-chat-message` will send it as a message in chat from the bot's account
