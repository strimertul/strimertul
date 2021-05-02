import { RouteComponentProps } from '@reach/router';
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useModule } from '../../../lib/react-utils';
import apiReducer, { modules } from '../../../store/api/reducer';

function getInterval(duration: number): [number, number] {
  if (duration % 3600 === 0) {
    return [duration / 3600, 3600];
  }
  if (duration % 60 === 0) {
    return [duration / 60, 60];
  }
  return [duration, 1];
}

export default function LoyaltySettingPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: RouteComponentProps<unknown>,
): React.ReactElement {
  const [loyaltyConfig, setLoyaltyConfig] = useModule(modules.loyaltyConfig);
  const [moduleConfig, setModuleConfig] = useModule(modules.moduleConfig);

  const dispatch = useDispatch();

  const twitchBotActive = moduleConfig?.twitchbot ?? false;
  const loyaltyEnabled = moduleConfig?.loyalty ?? false;
  const active = twitchBotActive && loyaltyEnabled;

  const [tempIntervalNum, setTempIntervalNum] = useState(null);
  const [tempIntervalMult, setTempIntervalMult] = useState(null);

  const [intervalNum, intervalMultiplier] = getInterval(
    loyaltyConfig?.points?.interval ?? 0,
  );

  const stulbeEnabled = moduleConfig?.stulbe ?? false;
  const liveCheck = loyaltyConfig?.enable_live_check ?? false;

  useEffect(() => {
    if (loyaltyConfig?.points) {
      if (tempIntervalNum === null) {
        setTempIntervalNum(intervalNum);
      }
      if (tempIntervalMult === null) {
        setTempIntervalMult(intervalMultiplier);
      }
    }
  }, [loyaltyConfig]);

  useEffect(() => {
    dispatch(
      apiReducer.actions.loyaltyConfigChanged({
        ...loyaltyConfig,
        points: {
          ...loyaltyConfig?.points,
          interval: tempIntervalNum * tempIntervalMult,
        },
      }),
    );
  }, [tempIntervalNum, tempIntervalMult]);

  return (
    <>
      <h1 className="title is-4">Loyalty system configuration</h1>
      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            disabled={!twitchBotActive}
            checked={active}
            onChange={(ev) =>
              dispatch(
                setModuleConfig({
                  ...moduleConfig,
                  loyalty: ev.target.checked,
                }),
              )
            }
          />{' '}
          Enable loyalty points{' '}
          {twitchBotActive ? '' : '(TwitchBot must be enabled for this!)'}
        </label>
      </div>
      <div className="field">
        <label className="label">Currency name</label>
        <p className="control">
          <input
            disabled={!active}
            className="input"
            type="text"
            placeholder="points"
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
      </div>
      <label className="label">
        How often to give {loyaltyConfig?.currency || 'points'}
      </label>
      <div className="field has-addons" style={{ marginBottom: 0 }}>
        <p className="control">
          <a className="button is-static">Give</a>
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
          <a className="button is-static">every</a>
        </p>
        <p className="control">
          <input
            disabled={!active}
            className="input"
            type="number"
            placeholder="#"
            value={intervalNum ?? ''}
            onChange={(ev) => {
              const intNum = parseInt(ev.target.value, 10);
              if (Number.isNaN(intNum)) {
                return;
              }
              setTempIntervalNum(intNum);
            }}
          />
        </p>
        <p className="control">
          <span className="select">
            <select
              value={intervalMultiplier.toString() ?? ''}
              disabled={!active}
              onChange={(ev) => {
                const intMult = parseInt(ev.target.value, 10);
                if (Number.isNaN(intMult)) {
                  return;
                }
                setTempIntervalMult(intMult);
              }}
            >
              <option value="1">seconds</option>
              <option value="60">minutes</option>
              <option value="3600">hours</option>
            </select>
          </span>
        </p>
      </div>
      <div className="field">
        <label className="label">Bonus points for active users</label>
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
      </div>
      <div className="field">
        <label className="checkbox">
          <input
            type="checkbox"
            disabled={!active || !stulbeEnabled}
            checked={liveCheck}
            onChange={(ev) =>
              dispatch(
                setLoyaltyConfig({
                  ...loyaltyConfig,
                  enable_live_check: ev.target.checked,
                }),
              )
            }
          />{' '}
          Enable check to only add points when live{' '}
          {stulbeEnabled ? (
            '(requires Stulbe)'
          ) : (
            <span className="has-text-danger">
              (Stulbe must be enabled for this!)
            </span>
          )}
        </label>
      </div>
      <button
        className="button"
        onClick={() => {
          dispatch(setLoyaltyConfig(loyaltyConfig));
        }}
      >
        Save
      </button>
    </>
  );
}
