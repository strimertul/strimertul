# Strimertül

Smol broadcasting suite, includes:

- Extremely simple/fast disk-backed KV over websocket (Kilovolt) for interacting with web-based overlays
  - oh and it has pub/sub
- Static file server for said overlays
- Loyalty system that tracks viewers and allows them to redeem rewards and contribute to community goals
  - WIP betting system
- Twitch IRC bot to tie everything together
- WIP own backend integration (stulbe)

Platform support is limited to Twitch only for the time being (sorry!)

## Getting started

Download the latest build from here: [github.com/strimertul/strimertul/releases/latest](https://github.com/strimertul/strimertul/releases/latest)

Start strimertul and the Web UI will appear when the app is done loading, you can start configuring and using it from there!

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

The entire project is licensed under [AGPL-3.0-only](LICENSE) (see `LICENSE`). For ISC exceptions, see [LICENSING.md](LICENSING.md).
