import { ActionCreatorWithOptionalPayload, AsyncThunk } from '@reduxjs/toolkit';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { KilovoltMessage } from '@strimertul/kilovolt-client';
import { RootState } from '../store';
import { APIState } from '../store/api/reducer';

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

export default {
  useModule,
};
