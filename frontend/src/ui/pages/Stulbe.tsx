import { RouteComponentProps } from '@reach/router';
import React from 'react';
import { useDispatch } from 'react-redux';
import { useModule } from '../../lib/react-utils';
import apiReducer, { modules } from '../../store/api/reducer';

export default function StulbePage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: RouteComponentProps<unknown>,
): React.ReactElement {
  const [moduleConfig, setModuleConfig] = useModule(modules.moduleConfig);
  const [stulbeConfig, setStulbeConfig] = useModule(modules.stulbeConfig);
  const dispatch = useDispatch();

  const busy = moduleConfig === null;
  const active = moduleConfig?.stulbe ?? false;

  return (
    <>
      <h1 className="title is-4">Stulbe integration settings</h1>
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
                  stulbe: ev.target.checked,
                }),
              )
            }
          />{' '}
          Enable Stulbe integration
        </label>
      </div>
      <div className="field">
        <label className="label">Stulbe Endpoint</label>
        <p className="control">
          <input
            className="input"
            type="text"
            placeholder="https://stulbe.ovo.ovh"
            disabled={busy || !active}
            value={stulbeConfig?.endpoint ?? ''}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.stulbeConfigChanged({
                  ...stulbeConfig,
                  endpoint: ev.target.value,
                }),
              )
            }
          />
        </p>
      </div>
      <div className="field">
        <label className="label">User name</label>
        <p className="control">
          <input
            className="input"
            type="text"
            placeholder="myUserName"
            disabled={busy || !active}
            value={stulbeConfig?.username ?? ''}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.stulbeConfigChanged({
                  ...stulbeConfig,
                  username: ev.target.value,
                }),
              )
            }
          />
        </p>
      </div>
      <div className="field">
        <label className="label">Authorization key</label>
        <p className="control">
          <input
            className="input"
            type="password"
            placeholder="key goes here"
            disabled={busy || !active}
            value={stulbeConfig?.auth_key ?? ''}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.stulbeConfigChanged({
                  ...stulbeConfig,
                  auth_key: ev.target.value,
                }),
              )
            }
          />
        </p>
      </div>
      <button
        className="button"
        onClick={() => {
          dispatch(setModuleConfig(moduleConfig));
          dispatch(setStulbeConfig(stulbeConfig));
        }}
      >
        Save
      </button>
    </>
  );
}
