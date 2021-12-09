import { RouteComponentProps } from '@reach/router';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useModule } from '../../../lib/react-utils';
import apiReducer, { modules } from '../../../store/api/reducer';
import Field from '../../components/Field';

export default function TwitchBotSettingsPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: RouteComponentProps<unknown>,
): React.ReactElement {
  const { t } = useTranslation();
  const [twitchConfig, setTwitchConfig] = useModule(modules.twitchConfig);
  const dispatch = useDispatch();

  const busy = twitchConfig === null;
  const active = twitchConfig?.enabled ?? false;

  return (
    <>
      <h1 className="title is-4">{t('twitch.config.header')}</h1>
      <Field>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={active}
            disabled={busy}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.twitchConfigChanged({
                  ...twitchConfig,
                  enabled: ev.target.checked,
                }),
              )
            }
          />{' '}
          {t('twitch.config.enable')}
        </label>
      </Field>
      <div className="copyblock">
        <p>{t('twitch.config.apiguide-1')}</p>
        <p>
          {'- '}
          <Trans i18nKey="twitch.config.apiguide-2">
            {'Go to '}
            <a href="https://dev.twitch.tv/console/apps/create">
              https://dev.twitch.tv/console/apps/create
            </a>
          </Trans>
        </p>
        <p>
          {'- '}
          {t('twitch.config.apiguide-3')}
        </p>
        <dl className="inline-dl">
          <dt>OAuth Redirect URLs</dt>
          <dd>http://localhost:4337/oauth</dd>
          <dt>Category</dt>
          <dd>Broadcasting Suite</dd>
        </dl>
        {'- '}
        <Trans i18nKey="twitch.config.apiguide-4">
          Once created, create a <b>New Secret</b>, then copy both fields below!
        </Trans>
      </div>
      <Field name={t('twitch.config.app-client-id')}>
        <p className="control">
          <input
            disabled={!active}
            className="input"
            type="text"
            placeholder={t('twitch.config.app-client-id')}
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
      <Field name={t('twitch.config.app-client-secret')}>
        <p className="control">
          <input
            disabled={!active}
            className="input"
            type="password"
            placeholder={t('twitch.config.app-client-secret')}
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
          dispatch(setTwitchConfig(twitchConfig));
        }}
      >
        {t('actions.save')}
      </button>
    </>
  );
}
