import { RouteComponentProps } from '@reach/router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useModule } from '../../../lib/react-utils';
import apiReducer, { modules } from '../../../store/api/reducer';
import Field from '../../components/Field';
import MessageArray from '../../components/MessageArray';
import TabbedView from '../../components/TabbedView';

export default function TwitchBotAlertsPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: RouteComponentProps<unknown>,
): React.ReactElement {
  const [twitchConfig] = useModule(modules.twitchConfig);
  const [moduleConfig] = useModule(modules.moduleConfig);
  const [twitchBotAlerts, setTwitchBotAlerts] = useModule(
    modules.twitchBotAlerts,
  );
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const botActive = twitchConfig?.enable_bot ?? false;
  const stulbeActive = moduleConfig?.stulbe ?? false;

  if (!botActive) {
    return (
      <>
        <h1 className="title is-4">{t('twitch.bot-alerts.header')}</h1>
        <p>{t('twitch.bot-alerts.err-twitchbot-disabled')}</p>
      </>
    );
  }

  if (!stulbeActive) {
    return (
      <>
        <h1 className="title is-4">{t('twitch.bot-alerts.header')}</h1>
        <p>{t('twitch.bot-alerts.err-stulbe-disabled')}</p>
      </>
    );
  }

  return (
    <>
      <h1 className="title is-4">{t('twitch.bot-alerts.header')}</h1>
      <TabbedView>
        <article data-name={t('twitch.bot-alerts.follow')}>
          <Field horizontal>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={twitchBotAlerts?.follow?.enabled ?? false}
                onChange={(ev) =>
                  dispatch(
                    apiReducer.actions.twitchBotAlertsChanged({
                      ...twitchBotAlerts,
                      follow: {
                        ...twitchBotAlerts.follow,
                        enabled: ev.target.checked,
                      },
                    }),
                  )
                }
              />{' '}
              {t('twitch.bot-alerts.follow-enabled')}
            </label>
          </Field>
          <Field name={t('twitch.bot-alerts.messages')}>
            <MessageArray
              value={twitchBotAlerts?.follow?.messages ?? ['']}
              onChange={(messages) =>
                dispatch(
                  apiReducer.actions.twitchBotAlertsChanged({
                    ...twitchBotAlerts,
                    follow: {
                      ...twitchBotAlerts.follow,
                      messages,
                    },
                  }),
                )
              }
            />
          </Field>
        </article>
        <article data-name={t('twitch.bot-alerts.subscription')}>
          <Field horizontal>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={twitchBotAlerts?.subscription?.enabled ?? false}
                onChange={(ev) =>
                  dispatch(
                    apiReducer.actions.twitchBotAlertsChanged({
                      ...twitchBotAlerts,
                      subscription: {
                        ...twitchBotAlerts.subscription,
                        enabled: ev.target.checked,
                      },
                    }),
                  )
                }
              />{' '}
              {t('twitch.bot-alerts.sub-enabled')}
            </label>
          </Field>
          <Field name={t('twitch.bot-alerts.messages')}>
            <MessageArray
              value={twitchBotAlerts?.subscription?.messages ?? ['']}
              onChange={(messages) =>
                dispatch(
                  apiReducer.actions.twitchBotAlertsChanged({
                    ...twitchBotAlerts,
                    subscription: {
                      ...twitchBotAlerts.subscription,
                      messages,
                    },
                  }),
                )
              }
            />
          </Field>
          <hr />
          <section className="variations">
            <h3 className="title is-5">
              {t('twitch.bot-alerts.variation-header')}
            </h3>
            {twitchBotAlerts?.subscription?.variations?.map((variation, i) => (
              <article key={i} className="box">
                <Field name={t('twitch.bot-alerts.variation-condition')}>
                  <div className="control">
                    <label className="radio">
                      <input
                        type="radio"
                        name={`sub-var-${i}`}
                        checked={variation.is_gifted ?? false}
                        onChange={(ev) =>
                          dispatch(
                            apiReducer.actions.twitchBotAlertsChanged({
                              ...twitchBotAlerts,
                              subscription: {
                                ...twitchBotAlerts.subscription,
                                variations:
                                  // Replace messages in nth variation
                                  twitchBotAlerts?.subscription?.variations.map(
                                    (v, j) =>
                                      j === i
                                        ? {
                                            ...v,
                                            is_gifted: ev.target.checked,
                                            min_streak: null,
                                          }
                                        : v,
                                  ),
                              },
                            }),
                          )
                        }
                      />
                      Is gifted
                    </label>
                  </div>
                  <div className="control">
                    <label className="radio">
                      <input
                        type="radio"
                        checked={!!variation.min_streak}
                        name={`sub-var-${i}`}
                        onChange={(ev) =>
                          dispatch(
                            apiReducer.actions.twitchBotAlertsChanged({
                              ...twitchBotAlerts,
                              subscription: {
                                ...twitchBotAlerts.subscription,
                                variations:
                                  // Replace messages in nth variation
                                  twitchBotAlerts?.subscription?.variations.map(
                                    (v, j) =>
                                      j === i
                                        ? {
                                            ...v,
                                            min_streak: ev.target.checked
                                              ? 1
                                              : null,
                                            is_gifted: false,
                                          }
                                        : v,
                                  ),
                              },
                            }),
                          )
                        }
                      />
                      Subscription months
                    </label>
                  </div>
                </Field>
                {variation.min_streak ? (
                  <Field name={t('twitch.bot-alerts.min-months')}>
                    <input
                      type="number"
                      className="input"
                      min="1"
                      step="1"
                      value={variation.min_streak}
                      onChange={(ev) =>
                        dispatch(
                          apiReducer.actions.twitchBotAlertsChanged({
                            ...twitchBotAlerts,
                            subscription: {
                              ...twitchBotAlerts.subscription,
                              variations:
                                // Replace messages in nth variation
                                twitchBotAlerts?.subscription?.variations.map(
                                  (v, j) =>
                                    j === i
                                      ? {
                                          ...v,
                                          min_streak: ev.target.value,
                                        }
                                      : v,
                                ),
                            },
                          }),
                        )
                      }
                    />
                  </Field>
                ) : null}
                <Field name={t('twitch.bot-alerts.messages')}>
                  <MessageArray
                    value={variation?.messages ?? ['']}
                    onChange={(messages) =>
                      dispatch(
                        apiReducer.actions.twitchBotAlertsChanged({
                          ...twitchBotAlerts,
                          subscription: {
                            ...twitchBotAlerts.subscription,
                            variations:
                              // Replace messages in nth variation
                              twitchBotAlerts?.subscription?.variations.map(
                                (v, j) => (j === i ? { ...v, messages } : v),
                              ),
                          },
                        }),
                      )
                    }
                  />
                </Field>
                <button
                  className="button is-small is-danger"
                  onClick={() => {
                    const variations =
                      twitchBotAlerts?.subscription?.variations ?? [];
                    dispatch(
                      apiReducer.actions.twitchBotAlertsChanged({
                        ...twitchBotAlerts,
                        subscription: {
                          ...twitchBotAlerts.subscription,
                          variations: variations.filter((v, j) => j !== i),
                        },
                      }),
                    );
                  }}
                >
                  {t('twitch.bot-alerts.delete-variation')}
                </button>
              </article>
            ))}
            <button
              className="button is-small is-success"
              onClick={() =>
                dispatch(
                  apiReducer.actions.twitchBotAlertsChanged({
                    ...twitchBotAlerts,
                    subscription: {
                      ...twitchBotAlerts.subscription,
                      variations: [
                        ...(twitchBotAlerts?.subscription?.variations ?? []),
                        {
                          messages: [''],
                        },
                      ],
                    },
                  }),
                )
              }
            >
              {t('twitch.bot-alerts.add-variation')}
            </button>
          </section>
        </article>
        <article data-name={t('twitch.bot-alerts.gift-sub')}>
          <Field horizontal>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={twitchBotAlerts?.gift_sub?.enabled ?? false}
                onChange={(ev) =>
                  dispatch(
                    apiReducer.actions.twitchBotAlertsChanged({
                      ...twitchBotAlerts,
                      gift_sub: {
                        ...twitchBotAlerts.gift_sub,
                        enabled: ev.target.checked,
                      },
                    }),
                  )
                }
              />{' '}
              {t('twitch.bot-alerts.gift-sub-enabled')}
            </label>
          </Field>
          <Field name={t('twitch.bot-alerts.messages')}>
            <MessageArray
              value={twitchBotAlerts?.gift_sub?.messages ?? ['']}
              onChange={(messages) =>
                dispatch(
                  apiReducer.actions.twitchBotAlertsChanged({
                    ...twitchBotAlerts,
                    gift_sub: {
                      ...twitchBotAlerts.gift_sub,
                      messages,
                    },
                  }),
                )
              }
            />
          </Field>
        </article>
        <article data-name={t('twitch.bot-alerts.raid')}>
          <Field horizontal>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={twitchBotAlerts?.raid?.enabled ?? false}
                onChange={(ev) =>
                  dispatch(
                    apiReducer.actions.twitchBotAlertsChanged({
                      ...twitchBotAlerts,
                      raid: {
                        ...twitchBotAlerts.raid,
                        enabled: ev.target.checked,
                      },
                    }),
                  )
                }
              />{' '}
              {t('twitch.bot-alerts.raid-enabled')}
            </label>
          </Field>
          <Field name={t('twitch.bot-alerts.messages')}>
            <MessageArray
              value={twitchBotAlerts?.raid?.messages ?? ['']}
              onChange={(messages) =>
                dispatch(
                  apiReducer.actions.twitchBotAlertsChanged({
                    ...twitchBotAlerts,
                    raid: {
                      ...twitchBotAlerts.raid,
                      messages,
                    },
                  }),
                )
              }
            />
          </Field>
        </article>
        <article data-name={t('twitch.bot-alerts.cheer')}>
          <Field horizontal>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={twitchBotAlerts?.cheer?.enabled ?? false}
                onChange={(ev) =>
                  dispatch(
                    apiReducer.actions.twitchBotAlertsChanged({
                      ...twitchBotAlerts,
                      cheer: {
                        ...twitchBotAlerts.cheer,
                        enabled: ev.target.checked,
                      },
                    }),
                  )
                }
              />{' '}
              {t('twitch.bot-alerts.cheer-enabled')}
            </label>
          </Field>
          <Field name={t('twitch.bot-alerts.messages')}>
            <MessageArray
              value={twitchBotAlerts?.cheer?.messages ?? ['']}
              onChange={(messages) =>
                dispatch(
                  apiReducer.actions.twitchBotAlertsChanged({
                    ...twitchBotAlerts,
                    cheer: {
                      ...twitchBotAlerts.cheer,
                      messages,
                    },
                  }),
                )
              }
            />
          </Field>
        </article>
      </TabbedView>
      <br />
      <button
        className="button"
        onClick={() => {
          dispatch(setTwitchBotAlerts(twitchBotAlerts));
        }}
      >
        {t('actions.save')}
      </button>
    </>
  );
}
