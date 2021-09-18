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
  const [moduleConfig, setModuleConfig] = useModule(modules.moduleConfig);
  const [twitchConfig, setTwitchConfig] = useModule(modules.twitchConfig);
  const [twitchBotConfig, setTwitchBotConfig] = useModule(
    modules.twitchBotConfig,
  );
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const busy = moduleConfig === null;
  const twitchActive = moduleConfig?.twitch ?? false;
  const botActive = twitchConfig?.enable_bot ?? false;
  const active = twitchActive && botActive;

  return (
    <>
      <h1 className="title is-4">{t('twitch.bot.header')}</h1>
      <Field>
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
          {t('twitch.bot.enable')}
          {twitchActive ? '' : t('twitch.bot.err-module-disabled')}
        </label>
      </Field>
      <Field name={t('twitch.bot.channel-name')}>
        <p className="control">
          <input
            disabled={!active}
            className="input"
            type="text"
            placeholder={t('twitch.bot.channel-name')}
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
      </Field>
      <Field
        name={`${t('twitch.bot.username')} (${t('twitch.bot.username-expl')})`}
      >
        <p className="control">
          <input
            disabled={!active}
            className="input"
            type="text"
            placeholder={t('twitch.bot.username')}
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
      </Field>
      <Field name={t('twitch.bot.oauth-token')}>
        <p className="control">
          <input
            disabled={!active}
            className="input"
            type="password"
            placeholder={t('twitch.bot.oauth-token')}
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
          <Trans i18nKey="twitch.bot.oauth-help">
            {
              'You can get this by logging in with the bot account and going here: '
            }
            <a href="https://twitchapps.com/tmi/">
              https://twitchapps.com/tmi/
            </a>
          </Trans>
        </p>
      </Field>
      <Field>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={twitchBotConfig?.chat_keys ?? false}
            disabled={busy}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.twitchBotConfigChanged({
                  ...twitchBotConfig,
                  chat_keys: ev.target.checked,
                }),
              )
            }
          />{' '}
          {t('twitch.bot.chat-keys')}
        </label>
      </Field>
      <Field name={t('twitch.bot.chat-history')}>
        <div className="field-body">
          <div className="field has-addons">
            <p className="control">
              <input
                className="input"
                type="number"
                disabled={!twitchBotConfig?.chat_keys ?? true}
                placeholder="#"
                value={twitchBotConfig?.chat_history ?? '5'}
                onChange={(ev) =>
                  dispatch(
                    apiReducer.actions.twitchBotConfigChanged({
                      ...twitchBotConfig,
                      chat_history: parseInt(ev.target.value, 10) ?? 0,
                    }),
                  )
                }
              />
            </p>
            <p className="control">
              <a className="button is-static">{t('twitch.bot.suf-messages')}</a>
            </p>
          </div>
        </div>
      </Field>
      <button
        className="button"
        onClick={() => {
          dispatch(setModuleConfig(moduleConfig));
          dispatch(setTwitchConfig(twitchConfig));
          dispatch(setTwitchBotConfig(twitchBotConfig));
        }}
      >
        {t('actions.save')}
      </button>
    </>
  );
}
