# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.6.3]: https://github.com/strimertul/strimertul/compare/v1.6.2...v1.6.3
[1.6.2]: https://github.com/strimertul/strimertul/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/strimertul/strimertul/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/strimertul/strimertul/compare/v1.5.3...v1.6.0
[1.5.3]: https://github.com/strimertul/strimertul/compare/v1.5.2...v1.5.3
[1.5.2]: https://github.com/strimertul/strimertul/compare/v1.5.1...v1.5.2
[1.5.1]: https://github.com/strimertul/strimertul/compare/v1.5.0...v1.5.1
