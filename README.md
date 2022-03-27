# Strimertül

Small broadcasting suite for Twitch, includes:

- Simple way to build stream overlays with minimal code
- Loyalty points system with redeems and community goals
- Twitch chat integration with custom commands
- Support for Twitch alerts and channel point redeems<sup>1</sup>

<sub>1. Requires external tool hosted somewhere</sub>

**Note:** some technical/coding experience is currently required to be able to use this effectively, see the technical overview below for more information.

## Getting started

Download the latest build from here: [github.com/strimertul/strimertul/releases/latest](https://github.com/strimertul/strimertul/releases/latest)

Start `strimertul.exe` and as soon as it's ready it will open a browser window with the Web UI you can use to configure it to your heart's content.

You can also build the project yourself, refer to the Building section below.

## Technical overview

Strimertül is a single executable app that provides the following:

- HTTP server for serving static assets and a websocket API
- Twitch bot for handling chat messages and providing custom commands
- Polling-based loyalty system for rewards and community goals

At strimertul's core is [Kilovolt](https://github.com/strimertul/kilovolt), a pub/sub key-value store accessible via websocket. You can access every functionality of strimertul through the Kilovolt API. Check [this repository](https://github.com/strimertul/kilovolt-clients) for a list of officially supported kilovolt clients (or submit your own). You should be able to easily build a client yourself by just creating a websocket connection and using the [Kilovolt protocol](https://github.com/strimertul/kilovolt/blob/main/PROTOCOL.md).

Check out the [project's wiki](https://github.com/strimertul/strimertul/wiki) for more information on how to use the API to interact with strimertul, or the `docs` folder for more technical informations.

## Building

You need to build the frontend first!

```sh
cd frontend
npm i
npm run build
```

Once that's done, just build the app like any other Go project

```sh
go build
```

## License

Kilovolt's code is based on Gorilla Websocket's server example, licensed under [BSD-2-Clause](https://github.com/gorilla/websocket/blob/master/LICENSE)

The entire project is licensed under [AGPL-3.0-only](LICENSE) (see `LICENSE`).
