# Strimertül

Smol broadcasting suite, includes:

- Extremely simple/fast disk-backed KV over websocket for interacting with web-based overlays
  - oh and it has pub/sub
- Static file server for said overlays
- Loyalty system that tracks viewers and allows them to redeem rewards and contribute to community goals
  - WIP betting system
- Twitch IRC bot to tie everything together
- WIP own backend integration (stulbe)

Platform support is limited to Twitch only for the time being (sorry!)

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

The entire project is licensed under [AGPL-3.0-only](LICENSE) (see `LICENSE`). For ISC exceptions, see [LICENSING.md](LICENSING.md).
