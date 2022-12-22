import {
  ActionCreatorWithOptionalPayload,
  AsyncThunk,
  Draft,
} from '@reduxjs/toolkit';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  KilovoltMessage,
  SubscriptionHandler,
} from '@strimertul/kilovolt-client';
import { RootState, useAppDispatch } from '~/store';
import apiReducer, { getUserPoints } from '~/store/api/reducer';
import {
  APIState,
  LoyaltyPointsEntry,
  LoyaltyStorage,
  RequestStatus,
} from '~/store/api/types';

interface LoadStatus {
  load: RequestStatus;
  save: RequestStatus;
}

export function useLiveKeyString(key: string) {
  const client = useSelector((state: RootState) => state.api.client);
  const [data, setData] = useState<string>(null);

  useEffect(() => {
    const subscriber: SubscriptionHandler = (v) => setData(v);
    void client.subscribeKey(key, subscriber);
    return () => {
      void client.unsubscribeKey(key, subscriber);
    };
  }, []);

  return data;
}

export function useLiveKey<T>(key: string): T {
  const data = useLiveKeyString(key);
  return data ? (JSON.parse(data) as T) : null;
}

export function useModule<T>({
  key,
  selector,
  getter,
  setter,
  asyncSetter,
}: {
  key: string;
  selector: (state: Draft<APIState>) => T;
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
  const dispatch = useAppDispatch();
  useEffect(() => {
    void dispatch(getter());
    const subscriber: SubscriptionHandler = (newValue) => {
      void dispatch(asyncSetter(JSON.parse(newValue) as T));
    };
    void client.subscribeKey(key, subscriber);
    return () => {
      void client.unsubscribeKey(key, subscriber);
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
    const remaining = status ? status.updated.getTime() - maxTime : null;
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
  const dispatch = useAppDispatch();
  useEffect(() => {
    void dispatch(getUserPoints());
    const subscriber: SubscriptionHandler = (newValue, key) => {
      const user = key.substring(prefix.length);
      const entry = JSON.parse(newValue) as LoyaltyPointsEntry;
      void dispatch(
        apiReducer.actions.loyaltyUserPointsChanged({ user, entry }),
      );
    };
    void client.subscribePrefix(prefix, subscriber);
    return () => {
      void client.unsubscribePrefix(prefix, subscriber);
    };
  }, []);
  return data;
}

export default {
  useModule,
  useStatus,
  useUserPoints,
};
