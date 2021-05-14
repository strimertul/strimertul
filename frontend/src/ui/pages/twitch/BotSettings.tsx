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
  const [twitchConfig, setTwitchConfig] = useModule(modules.twitchConfig);
  const [twitchBotConfig, setTwitchBotConfig] = useModule(
    modules.twitchBotConfig,
  );
  const dispatch = useDispatch();

  const busy = moduleConfig === null;
  const twitchActive = moduleConfig?.twitch ?? false;
  const botActive = twitchConfig?.enable_bot ?? false;
  const active = twitchActive && botActive;

  return (
    <>
      <h1 className="title is-4">Twitch module configuration</h1>
      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={botActive}
            disabled={!twitchActive || busy}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.twitchConfigChanged({
                  ...twitchConfig,
                  enable_bot: ev.target.checked,
                }),
              )
            }
          />{' '}
          Enable twitch bot
          {twitchActive ? '' : '(Twitch integration must be enabled for this!)'}
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
          dispatch(setTwitchConfig(twitchConfig));
          dispatch(setTwitchBotConfig(twitchBotConfig));
        }}
      >
        Save
      </button>
    </>
  );
}
