import { RouteComponentProps } from '@reach/router';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useModule } from '../../../lib/react-utils';
import apiReducer, { modules } from '../../../store/api/reducer';
import Field from '../../components/Field';
import Interval from '../../components/Interval';

export default function LoyaltySettingPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: RouteComponentProps<unknown>,
): React.ReactElement {
  const [loyaltyConfig, setLoyaltyConfig] = useModule(modules.loyaltyConfig);
  const [moduleConfig, setModuleConfig] = useModule(modules.moduleConfig);
  const [twitchConfig] = useModule(modules.twitchConfig);

  const dispatch = useDispatch();
  const { t } = useTranslation();

  const twitchActive = moduleConfig?.twitch ?? false;
  const twitchBotActive = twitchConfig?.enable_bot ?? false;
  const loyaltyEnabled = moduleConfig?.loyalty ?? false;
  const active = twitchActive && twitchBotActive && loyaltyEnabled;

  const [interval, setInterval] = useState(
    loyaltyConfig?.points?.interval ?? 0,
  );

  useEffect(() => {
    dispatch(
      apiReducer.actions.loyaltyConfigChanged({
        ...loyaltyConfig,
        points: {
          ...loyaltyConfig?.points,
          interval,
        },
      }),
    );
  }, [interval]);

  return (
    <>
      <h1 className="title is-4">{t('loyalty.config.header')}</h1>
      <Field>
        <label className="checkbox">
          <input
            type="checkbox"
            disabled={!twitchActive || !twitchBotActive}
            checked={active}
            onChange={(ev) =>
              dispatch(
                setModuleConfig({
                  ...moduleConfig,
                  loyalty: ev.target.checked,
                }),
              )
            }
          />
          {` ${t('loyalty.config.enable')} `}
          {twitchActive && twitchBotActive
            ? ''
            : t('loyalty.config.err-twitchbot-disabled')}
        </label>
      </Field>
      <Field name={t('loyalty.config.currency-name')}>
        <p className="control">
          <input
            disabled={!active}
            className="input"
            type="text"
            placeholder={t('loyalty.points-fallback')}
            value={loyaltyConfig?.currency ?? ''}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.loyaltyConfigChanged({
                  ...loyaltyConfig,
                  currency: ev.target.value,
                }),
              )
            }
          />
        </p>
      </Field>
      <Field
        name={t('loyalty.config.point-reward-frequency', {
          points: loyaltyConfig?.currency || t('loyalty.points-fallback'),
        })}
      >
        <div className="field has-addons" style={{ marginBottom: 0 }}>
          <p className="control">
            <a className="button is-static">
              {t('loyalty.config.give-points')}
            </a>
          </p>
          <p className="control">
            <input
              disabled={!active}
              className="input"
              type="number"
              placeholder="#"
              value={loyaltyConfig?.points?.amount ?? ''}
              onChange={(ev) => {
                const amount = parseInt(ev.target.value, 10);
                if (Number.isNaN(amount)) {
                  return;
                }
                dispatch(
                  apiReducer.actions.loyaltyConfigChanged({
                    ...loyaltyConfig,
                    points: {
                      ...loyaltyConfig?.points,
                      amount,
                    },
                  }),
                );
              }}
            />
          </p>
          <p className="control">
            <a className="button is-static">
              {t('loyalty.config.points-every')}
            </a>
          </p>
          <Interval value={interval} onChange={setInterval} active={active} />
        </div>
      </Field>
      <Field name={t('loyalty.config.bonus-points')}>
        <p className="control">
          <input
            disabled={!active}
            className="input"
            type="number"
            placeholder="#"
            value={loyaltyConfig?.points?.activity_bonus ?? ''}
            onChange={(ev) => {
              const bonus = parseInt(ev.target.value, 10);
              if (Number.isNaN(bonus)) {
                return;
              }
              dispatch(
                apiReducer.actions.loyaltyConfigChanged({
                  ...loyaltyConfig,
                  points: {
                    ...loyaltyConfig?.points,
                    activity_bonus: bonus,
                  },
                }),
              );
            }}
          />
        </p>
      </Field>
      <button
        className="button"
        onClick={() => {
          dispatch(setLoyaltyConfig(loyaltyConfig));
        }}
      >
        {t('actions.save')}
      </button>
    </>
  );
}
