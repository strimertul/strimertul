# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [CURRENT]

### Added

- **Manual garbage collection**: You can now launch strimertul with `--run-gc` to manually trigger garbage collection for the database. This will launch strimertul, execute a round of garbage collection and exit.

### Changed

- Database schema has slightly changed, strimertul will auto-migrate to the new format if it detects old schema in use.

## [1.7.0] - 2021-12-07

### Added

- **Chat alerts based on webhooks**: You can now add follow/sub/cheer/raid messages in chat. Basic messages are fully functional, advanced features are still in works (such as variations for certain thresholds, e.g. a different raid message if the raid has more than X viewers coming in).
- Strimertul now prints its own version when starting up, useful for troubleshooting.

### Changed

- Timers do not have a "enabled" toggle anymore, they are always enabled (just non-functional if you have none).

### Fixed

- Twitch bot: fixed command checking, previous matching only checked for prefix (eg. !verylong could be called by writing !verylonglongbaaah)
- DB was not getting garbage collected, this is now fixed with a GC run every 15 minutes.

## [1.6.3] - 2021-11-30

### Added

- ACL on bot commands are now fully working and not a placeholder anymore!
- ACL level "Subscriber" for Twitch subscribers

## [1.6.2] - 2021-11-24

### Fixed

- Fixed oversight in bot timer cooldown calculation that made them never start
- Fixed timer configuration never getting applied when changed

## [1.6.1] - 2021-11-24

### Changed

- Twitch and Stulbe modules now reload/restart when their configuration changes instead of requiring strimertul to be closed and reopened manually.

## [1.6.0] - 2021-11-21

### Added

- KV Authentication using Kilovolt v6, check out [the authentication documentation](https://github.com/strimertul/kilovolt/blob/main/PROTOCOL.md#authentication) for more info.

### Changed

- The webserver now restarts when the bind address is changed, and the Web UI should auto-redirect to the new URL.
- The static server will react to configuration changes and auto-restart instead of requiring strimertul to be closed and reopened manually.
- Added a couple buttons in the secret debug page to dump all keys and their content

## [1.5.3] - 2021-11-12

### Added

- Added KV RPC `twitch/@send-chat-message` for writing text messages to chat

## [1.5.2] - 2021-11-05

### Added

- Chat timers

## [1.5.1] - 2021-10-05

### Added

- Stulbe integration for alerts

[CURRENT]: https://github.com/strimertul/strimertul/compare/v1.7.0...HEAD
[1.7.0]: https://github.com/strimertul/strimertul/compare/v1.6.3...v1.7.0
[1.6.3]: https://github.com/strimertul/strimertul/compare/v1.6.2...v1.6.3
[1.6.2]: https://github.com/strimertul/strimertul/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/strimertul/strimertul/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/strimertul/strimertul/compare/v1.5.3...v1.6.0
[1.5.3]: https://github.com/strimertul/strimertul/compare/v1.5.2...v1.5.3
[1.5.2]: https://github.com/strimertul/strimertul/compare/v1.5.1...v1.5.2
[1.5.1]: https://github.com/strimertul/strimertul/compare/v1.5.0...v1.5.1
