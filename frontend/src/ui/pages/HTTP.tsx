import { RouteComponentProps } from '@reach/router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useModule } from '../../lib/react-utils';
import apiReducer, { modules } from '../../store/api/reducer';
import Field from '../components/Field';

export default function HTTPPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: RouteComponentProps<unknown>,
): React.ReactElement {
  const { t } = useTranslation();
  const [httpConfig, setHTTPConfig] = useModule(modules.httpConfig);
  const dispatch = useDispatch();

  const busy = httpConfig === null;
  const active = httpConfig?.enable_static_server ?? false;

  return (
    <>
      <h1 className="title is-4">{t('http.header')}</h1>
      <Field name={t('http.server-bind')}>
        <p className="control">
          <input
            disabled={busy}
            className="input"
            type="text"
            placeholder=":8080"
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
      </Field>
      <Field name={t('http.kv-password')}>
        <p className="control">
          <input
            className="input"
            type="password"
            disabled={busy}
            placeholder="None"
            value={httpConfig?.kv_password ?? ''}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.httpConfigChanged({
                  ...httpConfig,
                  kv_password: ev.target.value,
                }),
              )
            }
          />
        </p>
        <p className="help">Leave empty to disable authentication</p>
      </Field>
      <Field name={t('http.static-content')}>
        <label className="checkbox">
          <input
            type="checkbox"
            disabled={busy}
            checked={active}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.httpConfigChanged({
                  ...httpConfig,
                  enable_static_server: ev.target.checked,
                }),
              )
            }
          />{' '}
          {t('http.enable-static')}
        </label>
      </Field>
      {active && (
        <Field name={t('http.static-root-path')}>
          <p className="control">
            <input
              className="input"
              type="text"
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
        </Field>
      )}
      <button
        className="button"
        onClick={() => {
          dispatch(setHTTPConfig(httpConfig));
          const port = httpConfig.bind.split(':', 2)[1] ?? '4337';
          if (port !== window.location.port) {
            window.location.port = port;
          }
        }}
      >
        {t('actions.save')}
      </button>
    </>
  );
}
