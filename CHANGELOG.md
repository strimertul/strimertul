# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [current]

### Removed

- Stulbe support has been nuked across the board, see on Added for more notes
- Badger has been removed as a possible database, see v3 release notes on migration procedures.

### Added

- Added support for EventSub Websocket subscriptions on Twitch, making Twitch integration fully in-app without having to rely on third party servers. Check the "Events" tab in Twitch configuration for setting it up. The new keys for redeems are `twitch/ev/eventsub-event` and `twitch/eventsub-history`. History has been reduced to 50 to alleviate memory concerns.
- Application logs are now visible from the UI, check the little floating boxes in the top right!
- A new app icon drawn by [Sonic_chan](https://twitter.com/Sonic__Chan), say hello to Renko, strimertul's mascot!

### Changed

- Strimertul is now a GUI app using Wails
- The UI has been more tightly integrated with the underlying service meaning the kilovolt password will never be asked again
- Database operations (import/export/restore) are now done through a much nicer CLI interface rather than random flags, check `strimertul --help` for more info on usage.
- Changed behavior of database submodule to always return an empty key instead of NotExist errors.
- Many UI dialogs are now positioned near the top rather than vertically centered to prevent elements from moving too much as the dialog size changes
- The UI will now prevent users from overwriting existing bot commands/timers

### Fixed

- Many parts of the app should now react to configuration changes without requiring a full application restart.
- The cursor in redeem/goal ID fields will now keep its position when sanitizing names (e.g. turning a whitespace to a dash) instead of jumping to the end
- The scrollbar does not overlap the copy button in the log window
- Fixed `game` command not working when the specified channel contained the @ symbol at the beginning.
- Fixed strimertul crashing at start if the database folder didn't exist and a database driver was not manually specified
- Fixed strimertul crashing after a minute of being open if Twitch was not configured.

## [2.1.1] - 2022-03-24

### Added

- [pprof](https://github.com/google/pprof) endpoints have been added for taking CPU/memory snapshots at `/debug/pprof`

### Changed

- Updated dependencies, most notably the Twitch IRC bot has been bumped to v3 and now includes emoji positions for easier embedding of them in chat overlays.

## [2.1.0] - 2022-02-08

### Added

- **Pebble driver**: You can now use [Pebble](https://github.com/cockroachdb/pebble) as a database. Just use `-driver=pebble`
- **Auto driver detection**: The `-driver` option now defaults to `auto`, which will try to identify which database is in use. This means the `-driver` argument is realistically only needed when you first start strimertul. `auto` defaults to BadgerDB if no database is found (to preserve compatibility)

### Fixed

- Fixed nasty sync bug that would make strimertul unresponsive when it would detect streaming on Twitch.

## [2.0.0] - 2022-02-01

### Added

- **New UI**: Strimertul now features a more slick and better organized UI.
- **Multiple database options**: Strimertul now supports multiple databases drivers. BadgerDB will remain as default (and currently the only option) for the time being but other databases are coming in the future.
- **Database operations**: You can now export and import the entire database as JSON files
- **Database backups**: The database will periodically save optimized copies of itself in a backup directory. Backup directory, intervals and how many to keep at once are all configurable via new command line flags (Defaults: "backup" directory in the current working directory, taken every hour, up to 20 backups).
- **Exposed internal metrics via keys**: `twitch/chat-activity` and `twitch/stream-status` now expose previously internal-only info about the current stream.

### Changed

- The logging library has been changed to zap, the format of logs will therefore be wildly different.
- A lot of the command line parameters have changed syntax (eg. from -noheader to -no-header), please check the new formats using `-h` if you rely on them.
- Database schema has slightly changed, strimertul will auto-migrate to the new format if it detects old schema in use.

### Removed

- Twitch chat history doesn't have an explicit toggle anymore, they are always enabled unless the `chat_history` setting is set to 0.
- Loyalty point migration from v1.2.0 and earlier has been removed. If you are somehow running such an old version of strimertul and using loyalty points, run any version of strimertul between v1.3.0 and v1.7.0 first to make sure all points are migrated to the new format.

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

[current]: https://github.com/strimertul/strimertul/compare/v2.1.1...HEAD
[2.1.1]: https://github.com/strimertul/strimertul/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/strimertul/strimertul/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/strimertul/strimertul/compare/v1.7.0...v2.0.0
[1.7.0]: https://github.com/strimertul/strimertul/compare/v1.6.3...v1.7.0
[1.6.3]: https://github.com/strimertul/strimertul/compare/v1.6.2...v1.6.3
[1.6.2]: https://github.com/strimertul/strimertul/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/strimertul/strimertul/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/strimertul/strimertul/compare/v1.5.3...v1.6.0
[1.5.3]: https://github.com/strimertul/strimertul/compare/v1.5.2...v1.5.3
[1.5.2]: https://github.com/strimertul/strimertul/compare/v1.5.1...v1.5.2
[1.5.1]: https://github.com/strimertul/strimertul/compare/v1.5.0...v1.5.1
