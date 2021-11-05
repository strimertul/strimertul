import { ActionCreatorWithOptionalPayload, AsyncThunk } from '@reduxjs/toolkit';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  KilovoltMessage,
  SubscriptionHandler,
} from '@strimertul/kilovolt-client';
import { RootState } from '../store';
import apiReducer, { getUserPoints } from '../store/api/reducer';
import { APIState, LoyaltyStorage } from '../store/api/types';
import { getInterval } from './time-utils';

export function useModule<T>({
  key,
  selector,
  getter,
  setter,
  asyncSetter,
}: {
  key: string;
  selector: (state: APIState) => T;
  // eslint-disable-next-line @typescript-eslint/ban-types
  getter: AsyncThunk<T, void, {}>;
  // eslint-disable-next-line @typescript-eslint/ban-types
  setter: AsyncThunk<KilovoltMessage, T, {}>;
  asyncSetter: ActionCreatorWithOptionalPayload<T, string>;
  // eslint-disable-next-line @typescript-eslint/ban-types
}): [T, AsyncThunk<KilovoltMessage, T, {}>] {
  const client = useSelector((state: RootState) => state.api.client);
  const data = useSelector((state: RootState) => selector(state.api));
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getter());
    const subscriber = (newValue) => {
      dispatch(asyncSetter(JSON.parse(newValue) as T));
    };
    client.subscribeKey(key, subscriber);
    return () => {
      client.unsubscribeKey(key, subscriber);
    };
  }, []);
  return [data, setter];
}

export function useUserPoints(): LoyaltyStorage {
  const prefix = 'loyalty/points/';
  const client = useSelector((state: RootState) => state.api.client);
  const data = useSelector((state: RootState) => state.api.loyalty.users);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getUserPoints());
    const subscriber: SubscriptionHandler = (newValue, key) => {
      const user = key.substring(prefix.length);
      const entry = JSON.parse(newValue);
      dispatch(apiReducer.actions.loyaltyUserPointsChanged({ user, entry }));
    };
    client.subscribePrefix(prefix, subscriber);
    return () => {
      client.subscribePrefix(prefix, subscriber);
    };
  }, []);
  return data;
}

export function useInterval(
  initialValue: number,
): [
  number,
  number,
  number,
  (newNum: number) => void,
  (newMult: number) => void,
] {
  const [value, setValue] = useState(initialValue);

  const [numInitialValue, multInitialValue] = getInterval(value);
  const [num, setNum] = useState(numInitialValue);
  const [mult, setMult] = useState(multInitialValue);

  useEffect(() => {
    setValue(num * mult);
  }, [num, mult]);

  return [value, num, mult, setNum, setMult];
}

export default {
  useModule,
  useUserPoints,
  useInterval,
};
