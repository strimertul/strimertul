# Module configuration

Strimertul modules can be toggled on and off by setting flags in the `stul-meta/modules` key, which is a JSON object with the following schema:

```js
{
	"configured": true, // Setting this to false will restore defaults at the next boot
	"twitch": bool,     // Twitch integration
	"stulbe": bool,     // Back-end integration
	"loyalty": bool     // Loyalty system
}
```

Currently modules are not turned on/off until the next time strimertul is restarted, this is a known bug and it's being tracked in [issue #8](https://github.com/strimertul/strimertul/issues/8).
