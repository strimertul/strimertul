# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [current]

### Added

- Added a light theme, can be set during onboarding or in the UI settings
- The fatal error screen now uses the user configured language and theme
- Added the ability to hide viewer count in the dashboard
- Custom chat commands can now be sent as replies, whispers and announcements. Due to some API shenanigans yet to be solved, the latter two will always be sent from your main account, not the bot account (if they are different)
- Added a structured RPC `twitch/bot/@send-message` for sending messages as replies, announcements and whispers.

### Changed

- Chat command cooldown can now be tweaked in the bot settings screen. (This is not per-user o per-command just yet)

### Fixed

- Fixed some minor bugs regarding backup file sorting and migration procedures
- Fixed bot cooldown being unreliable due to depending on multiple time sources
- Spaces at beginning of messages are now ignored for command checking (e.g. " !lurk" will match !lurk)

## [3.2.1] - 2023-05-17

### Fixed

- Fixed the eventsub connection to not use the now broken beta URL

## [3.2.0] - 2023-05-03

### Added

- A new error page will appear if strimertul encounters a fatal error (previously this used to just crash). The error page contains both a way to send an error report with app logs and a way to restore the database to an earlier saved copy.
- Added link to the user guide in the main page
- Support for interactive authentication. This allows third party apps to ask for access to strimertul without having to manually share a password

### Changed

- A lot of log messages now are better formatted and more informative
- EventSub connections will auto restart if they drop for unexpected reasons (network hiccups and unexpected closes)

### Fixed

- The UPDATE AVAILABLE banner in prerelease builds now works properly by only appearing when a newer prerelease (or stable) version is available to download.
- Numeric input boxes in the UI should now be less of a pain to use

## [3.1.5] - 2023-03-31

### Fixed

- Updated wails so the window should not flash "connection refused" when opened
- The compiled binary now has the proper version and update notices should work again

## [3.1.4] - 2023-03-31

### Fixed

- The "Give points" dialog will now convert mixed case names to be lowercase instead of adding broken entries.
- The loyalty points entry were assigned incorrectly upon startup, this has been fixed
- Fixed having multiple messages for an alert use non-compiled templates

## [3.1.3] - 2023-03-14

### Changed

- A new log file called `strimertul-panic.log` is now created for panic information. Please attach this (as well as `strimertul.log`) when reporting crashes!

### Fixed

- Fixed changing chat history breaking the database
- Fixed panic on eventsub reconnections

## [3.1.2] - 2023-03-05

### Fixed

- Fixed some auth token shenanigans where a valid access token would not be generated when starting the app

## [3.1.1] - 2023-02-23

UPGRADE NOTE: If upgrading from an earlier version, please re-authenticate your user to make sure it has a necessary new permission for event notifications to work (even from 3.1.0).

### Fixed
- Fixed issue where event notification would not work due to Twitch deprecating the `channel.follows` V1 topic
- Fixed more database leaks

## [3.1.0] - 2023-02-21

UPGRADE NOTE: If upgrading from an earlier version, please re-authenticate your user to make sure it has a necessary new permission for the loyalty system to work.

### Added

- Added recent event list in the dashboard, please be aware that this list only refers to events that have happened while strimertul was open and is mostly for development/troubleshooting
- Added way to "replay" events, useful for overlay interactions
- Added extensions with a built-in editor (docs soon tm)

### Changed

- Bumped recent event limit to 100 to deal with some spammy events
- When closing the app a quick dialog will ask you if you are really sure (it's not a trick I just keep doing it by mistake). Sometimes it does it twice, it's a known issue.

### Fixed

- Fixed some values in the UI not updating or being assigned upon first load
- The loyalty system was non-functional after an internal rewrite in 3.0.0, this has been fixed
- Fixed a crash due to Twitch returning corrupted responses to status polling
- Fixed issue where the LIVE stream preview would overlap dialog windows
- Fixed leaked iterators on the backup procedure
- Fixed eventsub websocket reconnection not being handled properly
- Fixed bug where the interval in the loyalty configuration page would often not be set to the correct/current value
- Fixed bug where the loyalty config page had a wrong set interval on first load
- Fixed the formatting of log data so long lines are still contained in the dialog instead of clipping offscreen

## [3.0.0] - 2023-01-09

### Added

- Added support for EventSub Websocket subscriptions on Twitch, making Twitch integration fully in-app without having to rely on third party servers. Check the "Events" tab in Twitch configuration for setting it up. The new keys for redeems are `twitch/ev/eventsub-event` and `twitch/eventsub-history`. History has been reduced to 50 to alleviate memory concerns.
- A new onboarding procedure will walk first time users through setting up Twitch integration, including bot credentials (by default, the same user is used as bot).
- Application logs are now visible from the UI, check the little floating boxes in the top right!
- A new app icon drawn by [Sonic_chan](https://twitter.com/Sonic__Chan), say hello to Renko, strimertul's mascot!
- Hidden fields (Client secret, Kilovolt password) now have a "Reveal" toggle to show the hidden value
- Added a "Test connection" button in the Twitch API access page to check if the provided Client ID and secret are valid and functional
- Added language selection (so far English and Italian are the only supported languages)

### Changed

- Strimertul is now a GUI app using Wails
- The UI has been more tightly integrated with the underlying service meaning the kilovolt password will never be asked again
- Database operations (import/export/restore) are now done through a much nicer CLI interface rather than random flags, check `strimertul --help` for more info on usage.
- Changed behavior of database submodule to always return an empty key instead of NotExist errors.
- Many UI dialogs are now positioned near the top rather than vertically centered to prevent elements from moving too much as the dialog size changes
- The UI will now prevent users from overwriting existing bot commands/timers
- A password for the kilovolt server will be auto-generated when starting strimertul for the first time
- A big scary dialog will appear when changing the server config to have an empty kilovolt password

### Fixed

- Many parts of the app should now react to configuration changes without requiring a full application restart.
- The cursor in redeem/goal ID fields will now keep its position when sanitizing names (e.g. turning a whitespace to a dash) instead of jumping to the end
- The scrollbar does not overlap the copy button in the log window
- Fixed `game` command not working when the specified channel contained the @ symbol at the beginning.
- Fixed strimertul crashing at start if the database folder didn't exist and a database driver was not manually specified
- Fixed strimertul crashing after a minute of being open if Twitch was not configured.
- Fixed issue where deleted commands would still be functional until strimertul was restarted

### Removed

- Stulbe support has been removed across the board, see on Added for more notes
- Badger has been removed as a possible database, see v3 release notes on migration procedures.
- The link to Ash Keel's Twitter profile has been removed

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

[current]: https://github.com/strimertul/strimertul/compare/v3.2.1...HEAD
[3.2.1]: https://github.com/strimertul/strimertul/compare/v3.2.0...v3.2.1
[3.2.0]: https://github.com/strimertul/strimertul/compare/v3.1.5...v3.2.0
[3.1.5]: https://github.com/strimertul/strimertul/compare/v3.1.4...v3.1.5
[3.1.4]: https://github.com/strimertul/strimertul/compare/v3.1.3...v3.1.4
[3.1.3]: https://github.com/strimertul/strimertul/compare/v3.1.2...v3.1.3
[3.1.2]: https://github.com/strimertul/strimertul/compare/v3.1.1...v3.1.2
[3.1.1]: https://github.com/strimertul/strimertul/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/strimertul/strimertul/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/strimertul/strimertul/compare/v2.1.1...v3.0.0
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
