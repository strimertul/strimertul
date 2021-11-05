import { RouteComponentProps } from '@reach/router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useModule } from '../../../lib/react-utils';
import Stulbe from '../../../lib/stulbe-lib';
import apiReducer, { modules } from '../../../store/api/reducer';
import Field from '../../components/Field';

export default function StulbeConfigPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: RouteComponentProps<unknown>,
): React.ReactElement {
  const { t } = useTranslation();
  const [moduleConfig, setModuleConfig] = useModule(modules.moduleConfig);
  const [stulbeConfig, setStulbeConfig] = useModule(modules.stulbeConfig);
  const [testResult, setTestResult] = useState<string>(null);
  const dispatch = useDispatch();

  const busy = moduleConfig === null;
  const active = moduleConfig?.stulbe ?? false;

  const test = async () => {
    try {
      const client = new Stulbe(stulbeConfig.endpoint);
      await client.auth(stulbeConfig.username, stulbeConfig.auth_key);
      setTestResult(t('backend.config.auth-success-message'));
    } catch (e) {
      setTestResult(e.message);
    }
  };

  return (
    <>
      <h1 className="title is-4">{t('backend.config.header')}</h1>
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
                  stulbe: ev.target.checked,
                }),
              )
            }
          />{' '}
          {t('backend.config.enable')}
        </label>
      </Field>
      <Field name={t('backend.config.endpoint')}>
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
      </Field>
      <Field name={t('backend.config.username')}>
        <p className="control">
          <input
            className="input"
            type="text"
            placeholder={t('backend.config.username-placeholder')}
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
      </Field>
      <Field name={t('backend.config.auth-key')}>
        <p className="control">
          <input
            className="input"
            type="password"
            placeholder={t('backend.config.auth-key-placeholder')}
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
      </Field>
      <button
        className="button"
        onClick={() => {
          dispatch(setModuleConfig(moduleConfig));
          dispatch(setStulbeConfig(stulbeConfig));
        }}
      >
        {t('actions.save')}
      </button>
      <button className="button" onClick={test}>
        {t('actions.test')}
      </button>
      {testResult ? (
        <div className="notification" style={{ marginTop: '1rem' }}>
          {testResult}
        </div>
      ) : null}
    </>
  );
}
