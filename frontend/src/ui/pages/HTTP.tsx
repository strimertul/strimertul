import { RouteComponentProps } from '@reach/router';
import React from 'react';
import { useDispatch } from 'react-redux';
import { useModule } from '../../lib/react-utils';
import apiReducer, { modules } from '../../store/api/reducer';

export default function HTTPPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: RouteComponentProps<unknown>,
): React.ReactElement {
  const [moduleConfig, setModuleConfig] = useModule(modules.moduleConfig);
  const [httpConfig, setHTTPConfig] = useModule(modules.httpConfig);
  const dispatch = useDispatch();

  const busy = moduleConfig === null || httpConfig === null;
  const active = moduleConfig?.static ?? false;

  return (
    <>
      <h1 className="title is-4">Web server configuration</h1>
      <div className="field">
        <label className="label">HTTP server port</label>
        <p className="control">
          <input
            disabled={busy}
            className="input"
            type="text"
            placeholder="HTTP server bind"
            value={httpConfig?.bind ?? ''}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.httpConfigChanged({
                  ...httpConfig,
                  bind: ev.target.value,
                }),
              )
            }
          />
        </p>
        <p className="help">
          Note: You must restart strimertul after changing this!
        </p>
      </div>
      <label className="label">Static content</label>
      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            disabled={busy}
            checked={active}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.moduleConfigChanged({
                  ...moduleConfig,
                  static: ev.target.checked,
                }),
              )
            }
          />{' '}
          Enable static server
        </label>
      </div>
      <div className="field">
        <label className="label">Static content root path</label>
        <p className="control">
          <input
            className="input"
            type="text"
            placeholder="HTTP server bind"
            disabled={busy || !active}
            value={httpConfig?.path ?? ''}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.httpConfigChanged({
                  ...httpConfig,
                  path: ev.target.value,
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
          dispatch(setHTTPConfig(httpConfig));
        }}
      >
        Save
      </button>
    </>
  );
}
