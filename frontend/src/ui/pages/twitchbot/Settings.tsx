import { RouteComponentProps } from '@reach/router';
import React from 'react';
import { useDispatch } from 'react-redux';
import { useModule } from '../../../lib/react-utils';
import apiReducer, { modules } from '../../../store/api/reducer';

export default function TwitchBotSettingsPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: RouteComponentProps<unknown>,
): React.ReactElement {
  const [moduleConfig, setModuleConfig] = useModule(modules.moduleConfig);
  const [twitchBotConfig, setTwitchBotConfig] = useModule(
    modules.twitchBotConfig,
  );
  const dispatch = useDispatch();

  const busy = moduleConfig === null;
  const active = moduleConfig?.twitchbot ?? false;

  return (
    <>
      <h1 className="title is-4">Twitch bot configuration</h1>
      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={active}
            disabled={busy}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.moduleConfigChanged({
                  ...moduleConfig,
                  twitchbot: ev.target.checked,
                }),
              )
            }
          />{' '}
          Enable twitch bot
        </label>
      </div>
      <div className="field">
        <label className="label">Twitch channel</label>
        <p className="control">
          <input
            disabled={!active}
            className="input"
            type="text"
            placeholder="Twitch channel name"
            value={twitchBotConfig?.channel ?? ''}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.twitchBotConfigChanged({
                  ...twitchBotConfig,
                  channel: ev.target.value,
                }),
              )
            }
          />
        </p>
      </div>
      <div className="field">
        <label className="label">
          Bot username (must be a valid Twitch account)
        </label>
        <p className="control">
          <input
            disabled={!active}
            className="input"
            type="text"
            placeholder="Bot username"
            value={twitchBotConfig?.username ?? ''}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.twitchBotConfigChanged({
                  ...twitchBotConfig,
                  username: ev.target.value,
                }),
              )
            }
          />
        </p>
      </div>
      <div className="field">
        <label className="label">Bot OAuth token</label>
        <p className="control">
          <input
            disabled={!active}
            className="input"
            type="password"
            placeholder="Bot OAuth token"
            value={twitchBotConfig?.oauth ?? ''}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.twitchBotConfigChanged({
                  ...twitchBotConfig,
                  oauth: ev.target.value,
                }),
              )
            }
          />
        </p>
        <p className="help">
          You can get this by logging in with the bot account and going here:{' '}
          <a href="https://twitchapps.com/tmi/">https://twitchapps.com/tmi/</a>
        </p>
      </div>
      <button
        className="button"
        onClick={() => {
          dispatch(setModuleConfig(moduleConfig));
          dispatch(setTwitchBotConfig(twitchBotConfig));
        }}
      >
        Save
      </button>
    </>
  );
}
