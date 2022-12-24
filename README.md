# <center><img src="https://raw.githubusercontent.com/strimertul/strimertul/master/frontend/assets/images/readme-logo.svg"/></center>

Small broadcasting suite for Twitch, includes:

- Simple way to build stream overlays with minimal code
- Loyalty points system with redeems and community goals
- Twitch chat integration with custom commands
- Support for Twitch alerts and channel point redeems

**Note:** some technical/coding experience is currently required to be able to use this effectively, see the technical overview below for more information.

## Getting started

Download the latest build from here: [github.com/strimertul/strimertul/releases/latest](https://github.com/strimertul/strimertul/releases/latest)

Start `strimertul.exe` (or whatever for your operating system) and it should open a windows with the dashboard as soon as it's ready.

You can also build the project yourself, refer to the Building section below.

## Technical overview

Strimertül is a single executable app that provides the following:

- HTTP server for serving static assets and a websocket API
- Twitch bot for handling chat messages and providing custom commands
- Polling-based loyalty system for rewards and community goals

At strimertül's core is [Kilovolt](https://github.com/strimertul/kilovolt), a pub/sub key-value store accessible via websocket. You can access every functionality of strimertul through the Kilovolt API. Check [this repository](https://github.com/strimertul/kilovolt-clients) for a list of officially supported kilovolt clients (or submit your own). You should be able to easily build a client yourself by just creating a websocket connection and using the [Kilovolt protocol](https://github.com/strimertul/kilovolt/blob/main/PROTOCOL.md).

Check out the [project's wiki](https://github.com/strimertul/strimertul/wiki) for more information on how to use the API to interact with strimertul, or the `docs` folder for more technical information.

## Development

This project uses Wails, check out the [Getting Started](https://wails.io/docs/gettingstarted/installation) guide on how to install it.

To run in live development mode, run `wails dev` in the project directory. This will run a Vite development server that will provide hot reload of frontend changes, while hard-reloading on backend changes.

## Building

To build a redistributable, production mode package, use `wails build`.

## Credits

- Renko, strimertül's mascot and app icon, was drawn by [Sonic_Chan]

[Sonic_Chan]: https://twitter.com/Sonic__Chan

## License

Kilovolt's code is based on Gorilla Websocket's server example, licensed under [BSD-2-Clause](https://github.com/gorilla/websocket/blob/master/LICENSE)

The entire project is licensed under [AGPL-3.0-only](LICENSE) (see `LICENSE`).
