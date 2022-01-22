import { ActionCreatorWithOptionalPayload, AsyncThunk } from '@reduxjs/toolkit';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  KilovoltMessage,
  SubscriptionHandler,
} from '@strimertul/kilovolt-client';
import { RootState } from '../store';
import apiReducer, { getUserPoints } from '../store/api/reducer';
import { APIState, LoyaltyStorage, RequestStatus } from '../store/api/types';

interface LoadStatus {
  load: RequestStatus;
  save: RequestStatus;
}

export function useLiveKeyRaw(key: string) {
  const client = useSelector((state: RootState) => state.api.client);
  const [data, setData] = useState<string>(null);

  useEffect(() => {
    const subscriber: SubscriptionHandler = (v) => setData(v);
    client.subscribeKey(key, subscriber);
    return () => {
      client.unsubscribeKey(key, subscriber);
    };
  }, []);

  return data;
}

export function useLiveKey<T>(key: string): T {
  const data = useLiveKeyRaw(key);
  return data ? JSON.parse(data) : null;
}

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
}): [
  T,
  // eslint-disable-next-line @typescript-eslint/ban-types
  AsyncThunk<KilovoltMessage, T, {}>,
  LoadStatus,
] {
  const client = useSelector((state: RootState) => state.api.client);
  const data = useSelector((state: RootState) => selector(state.api));
  const loadStatus = useSelector(
    (state: RootState) => state.api.requestStatus[`load-${key}`],
  );
  const saveStatus = useSelector(
    (state: RootState) => state.api.requestStatus[`save-${key}`],
  );
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getter());
    const subscriber = (newValue) => {
      dispatch(asyncSetter(JSON.parse(newValue) as T));
    };
    client.subscribeKey(key, subscriber);
    return () => {
      client.unsubscribeKey(key, subscriber);
      dispatch(
        apiReducer.actions.requestKeysRemoved([`save-${key}`, `load-${key}`]),
      );
    };
  }, []);
  return [
    data,
    setter,
    {
      load: loadStatus,
      save: saveStatus,
    },
  ];
}

export function useStatus(
  status: RequestStatus | null,
  interval = 5000,
): RequestStatus | null {
  const [localStatus, setlocalStatus] = useState(status);
  const maxTime = Date.now() - interval;
  useEffect(() => {
    const remaining = status?.updated.getTime() - maxTime;
    if (remaining) {
      setTimeout(() => {
        setlocalStatus(null);
      }, remaining);
    }
    setlocalStatus(status);
  }, [status]);

  return status?.updated.getTime() > maxTime ? localStatus : null;
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
      client.unsubscribePrefix(prefix, subscriber);
    };
  }, []);
  return data;
}

export default {
  useModule,
  useStatus,
  useUserPoints,
};
