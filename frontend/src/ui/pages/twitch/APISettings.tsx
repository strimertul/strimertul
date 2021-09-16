import { RouteComponentProps } from '@reach/router';
import React from 'react';
import { useDispatch } from 'react-redux';
import { useModule } from '../../../lib/react-utils';
import apiReducer, { modules } from '../../../store/api/reducer';
import Field from '../../components/Field';

export default function TwitchBotSettingsPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: RouteComponentProps<unknown>,
): React.ReactElement {
  const [moduleConfig, setModuleConfig] = useModule(modules.moduleConfig);
  const [twitchConfig, setTwitchConfig] = useModule(modules.twitchConfig);
  const dispatch = useDispatch();

  const busy = moduleConfig === null;
  const active = moduleConfig?.twitch ?? false;

  return (
    <>
      <h1 className="title is-4">Twitch module configuration</h1>
      <Field>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={active}
            disabled={busy}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.moduleConfigChanged({
                  ...moduleConfig,
                  twitch: ev.target.checked,
                }),
              )
            }
          />{' '}
          Enable twitch integration
        </label>
      </Field>
      <div className="copyblock">
        <p>You will need to create an application, here's how:</p>
        <p>
          - Go to{' '}
          <a href="https://dev.twitch.tv/console/apps/create">
            https://dev.twitch.tv/console/apps/create
          </a>
          .
        </p>
        <p>- Use the following data for the required fields:</p>
        <dl className="inline-dl">
          <dt>OAuth Redirect URLs</dt>
          <dd>http://localhost:4337/oauth</dd>
          <dt>Category</dt>
          <dd>Broadcasting Suite</dd>
        </dl>
        - Once created, create a <b>New Secret</b>, then copy both fields below!
      </div>
      <Field name="App Client ID">
        <p className="control">
          <input
            disabled={!active}
            className="input"
            type="text"
            placeholder="App Client ID"
            value={twitchConfig?.api_client_id ?? ''}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.twitchConfigChanged({
                  ...twitchConfig,
                  api_client_id: ev.target.value,
                }),
              )
            }
          />
        </p>
      </Field>
      <Field name="App Client Secret">
        <p className="control">
          <input
            disabled={!active}
            className="input"
            type="password"
            placeholder="App Client Secret"
            value={twitchConfig?.api_client_secret ?? ''}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.twitchConfigChanged({
                  ...twitchConfig,
                  api_client_secret: ev.target.value,
                }),
              )
            }
          />
        </p>
      </Field>
      <button
        className="button"
        onClick={() => {
          dispatch(setModuleConfig(moduleConfig));
          dispatch(setTwitchConfig(twitchConfig));
        }}
      >
        Save
      </button>
    </>
  );
}
