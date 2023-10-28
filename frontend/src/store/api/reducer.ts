/* eslint-disable no-param-reassign */
import {
  AnyAction,
  AsyncThunk,
  CaseReducer,
  createAction,
  createAsyncThunk,
  createSlice,
  Dispatch,
  PayloadAction,
} from '@reduxjs/toolkit';
import KilovoltWS, { KilovoltMessage } from '@strimertul/kilovolt-client';
import type { kvError } from '@strimertul/kilovolt-client/types/messages';
import { AuthenticateKVClient, IsServerReady } from '@wailsapp/go/main/App';
import { delay } from '~/lib/time';
import {
  APIState,
  ConnectionStatus,
  LoyaltyPointsEntry,
  LoyaltyRedeem,
  LoyaltyStorage,
} from './types';
import { ThunkConfig } from '..';

type ThunkAPIState = { api: APIState };

interface AppThunkAPI {
  dispatch: Dispatch;
  getState: () => ThunkAPIState;
}

function makeGetSetThunks<T>(key: string) {
  const getter = createAsyncThunk<T, void, { state: ThunkAPIState }>(
    `api/get/${key}`,
    async (_, { getState }) => {
      const { api } = getState();
      return api.client.getJSON<T>(key);
    },
  );
  const setter = createAsyncThunk<KilovoltMessage, T, { state: ThunkAPIState }>(
    `api/set/${key}`,
    async (data: T, { getState, dispatch }: AppThunkAPI) => {
      const { api } = getState();
      const result = await api.client.putJSON(key, data);
      if ('ok' in result) {
        if (result.ok) {
          // Re-load value from KV
          // Need to do type fuckery to avoid cyclic redundancy
          // (unless there's a better way that I'm missing)
          void dispatch(getter() as unknown as AnyAction);
        }
      }
      return result;
    },
  );
  return { getter, setter };
}

function makeModule<T>(
  key: string,
  selector: (state: APIState) => T,
  stateSetter: CaseReducer<APIState>,
) {
  return {
    ...makeGetSetThunks<T>(key),
    key,
    selector,
    stateSetter,
    asyncSetter: createAction<T>(`asyncSetter/${key}`),
  };
}

// eslint-disable-next-line @typescript-eslint/ban-types
let setupClientReconnect: AsyncThunk<void, KilovoltWS, {}>;

// eslint-disable-next-line  @typescript-eslint/ban-types
let kvErrorReceived: AsyncThunk<void, kvError, {}>;

// Storage
const loyaltyPointsPrefix = 'loyalty/points/';
const loyaltyRewardsKey = 'loyalty/rewards';

// RPCs
const loyaltyCreateRedeemKey = 'loyalty/@create-redeem';
const loyaltyRemoveRedeemKey = 'loyalty/@remove-redeem';

export const createWSClient = createAsyncThunk(
  'api/createClient',
  async (options: { address: string; password?: string }, { dispatch }) => {
    // Wait for server to be ready
    let ready = false;
    while (!ready) {
      // eslint-disable-next-line no-await-in-loop
      ready = await IsServerReady();
      if (ready) {
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await delay(1000);
    }
    // Connect to websocket
    const client = new KilovoltWS(options.address, {
      password: options.password,
    });
    client.on('error', (err: CustomEvent<kvError>) => {
      void dispatch(kvErrorReceived(err.detail));
    });
    await client.connect();
    await dispatch(setupClientReconnect(client));
    return client;
  },
);

export const getUserPoints = createAsyncThunk<
  LoyaltyStorage,
  void,
  ThunkConfig
>('api/getUserPoints', async (_, { getState }) => {
  const { api } = getState();
  const keys = await api.client.getKeysByPrefix(loyaltyPointsPrefix);
  const userpoints: LoyaltyStorage = {};
  Object.entries(keys).forEach(([k, v]) => {
    userpoints[k.substring(loyaltyPointsPrefix.length)] = JSON.parse(
      v,
    ) as LoyaltyPointsEntry;
  });
  return userpoints;
});

export const setUserPoints = createAsyncThunk<
  KilovoltMessage,
  { user: string; points: number; relative: boolean },
  ThunkConfig
>('api/setUserPoints', async ({ user, points, relative }, { getState }) => {
  const { api } = getState();
  const entry: LoyaltyPointsEntry = { points };
  if (relative) {
    entry.points += api.loyalty.users[user]?.points ?? 0;
  }
  return api.client.putJSON(loyaltyPointsPrefix + user, entry);
});

export const modules = {
  httpConfig: makeModule(
    'http/config',
    (state) => state.moduleConfigs?.httpConfig,
    (state, { payload }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      state.moduleConfigs.httpConfig = payload;
    },
  ),
  twitchConfig: makeModule(
    'twitch/config',
    (state) => state.moduleConfigs?.twitchConfig,
    (state, { payload }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      state.moduleConfigs.twitchConfig = payload;
    },
  ),
  twitchBotConfig: makeModule(
    'twitch/bot-config',
    (state) => state.moduleConfigs?.twitchBotConfig,
    (state, { payload }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      state.moduleConfigs.twitchBotConfig = payload;
    },
  ),
  twitchBotCommands: makeModule(
    'twitch/bot-custom-commands',
    (state) => state.twitchBot?.commands,
    (state, { payload }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      state.twitchBot.commands = payload;
    },
  ),
  twitchBotTimers: makeModule(
    'twitch/bot-modules/timers/config',
    (state) => state.twitchBot?.timers,
    (state, { payload }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      state.twitchBot.timers = payload;
    },
  ),
  twitchBotAlerts: makeModule(
    'twitch/bot-modules/alerts/config',
    (state) => state.twitchBot?.alerts,
    (state, { payload }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      state.twitchBot.alerts = payload;
    },
  ),
  loyaltyConfig: makeModule(
    'loyalty/config',
    (state) => state.moduleConfigs?.loyaltyConfig,
    (state, { payload }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      state.moduleConfigs.loyaltyConfig = payload;
    },
  ),
  loyaltyRewards: makeModule(
    loyaltyRewardsKey,
    (state) => state.loyalty.rewards,
    (state, { payload }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      state.loyalty.rewards = payload;
    },
  ),
  loyaltyGoals: makeModule(
    'loyalty/goals',
    (state) => state.loyalty.goals,
    (state, { payload }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      state.loyalty.goals = payload;
    },
  ),
  loyaltyRedeemQueue: makeModule(
    'loyalty/redeem-queue',
    (state) => state.loyalty.redeemQueue,
    (state, { payload }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      state.loyalty.redeemQueue = payload;
    },
  ),
  uiConfig: makeModule(
    'ui/settings',
    (state) => state.uiConfig,
    (state, { payload }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      state.uiConfig = payload;
    },
  ),
};

export const createRedeem = createAsyncThunk<
  KilovoltMessage,
  LoyaltyRedeem,
  ThunkConfig
>('api/createRedeem', async (redeem: LoyaltyRedeem, { getState }) => {
  const { api } = getState();
  return api.client.putJSON(loyaltyCreateRedeemKey, redeem);
});

export const removeRedeem = createAsyncThunk<
  KilovoltMessage,
  LoyaltyRedeem,
  ThunkConfig
>('api/removeRedeem', async (redeem: LoyaltyRedeem, { getState }) => {
  const { api } = getState();
  return api.client.putJSON(loyaltyRemoveRedeemKey, redeem);
});

const moduleChangeReducers = Object.fromEntries(
  Object.entries(modules).map(([key, mod]) => [
    `${key}Changed`,
    mod.stateSetter,
  ]),
) as Record<
  `${keyof typeof modules}Changed`,
  (state: APIState, action: PayloadAction<unknown>) => never
>;

const initialState: APIState = {
  client: null,
  connectionStatus: ConnectionStatus.NotConnected,
  kvError: null,
  initialLoadComplete: false,
  loyalty: {
    users: null,
    rewards: null,
    goals: null,
    redeemQueue: null,
  },
  twitchBot: {
    commands: null,
    timers: null,
    alerts: null,
  },
  moduleConfigs: {
    httpConfig: null,
    twitchConfig: null,
    twitchBotConfig: null,
    loyaltyConfig: null,
  },
  uiConfig: null,
  requestStatus: {},
};

const apiReducer = createSlice({
  name: 'api',
  initialState,
  reducers: {
    ...moduleChangeReducers,
    initialLoadCompleted(state) {
      state.initialLoadComplete = true;
    },
    connectionStatusChanged(
      state,
      { payload }: PayloadAction<ConnectionStatus>,
    ) {
      state.connectionStatus = payload;
    },
    kvErrorReceived(state, { payload }: PayloadAction<kvError>) {
      state.kvError = payload;
    },
    loyaltyUserPointsChanged(
      state,
      {
        payload: { user, entry },
      }: PayloadAction<{ user: string; entry: LoyaltyPointsEntry }>,
    ) {
      state.loyalty.users[user] = entry;
    },
    requestKeysRemoved(state, { payload }: PayloadAction<string[]>) {
      payload.forEach((key) => {
        delete state.requestStatus[key];
      });
    },
  },
  extraReducers: (builder) => {
    builder.addCase(createWSClient.fulfilled, (state, { payload }) => {
      state.client = payload;
      state.connectionStatus = ConnectionStatus.Connected;
    });
    builder.addCase(getUserPoints.fulfilled, (state, { payload }) => {
      state.loyalty.users = payload;
    });
    Object.values(modules).forEach((mod) => {
      builder.addCase(mod.getter.pending, (state) => {
        state.requestStatus[`load-${mod.key}`] = {
          type: 'pending',
          updated: new Date(),
        };
      });
      builder.addCase(mod.getter.fulfilled, (state, action) => {
        state.requestStatus[`load-${mod.key}`] = {
          type: 'success',
          updated: new Date(),
        };
        mod.stateSetter(state, action);
      });
      builder.addCase(mod.getter.rejected, (state, { error }) => {
        state.requestStatus[`load-${mod.key}`] = {
          type: 'error',
          error: error.message,
          updated: new Date(),
        };
      });
      builder.addCase(mod.setter.pending, (state) => {
        state.requestStatus[`save-${mod.key}`] = {
          type: 'pending',
          updated: new Date(),
        };
      });
      builder.addCase(mod.setter.fulfilled, (state) => {
        state.requestStatus[`save-${mod.key}`] = {
          type: 'success',
          updated: new Date(),
        };
      });
      builder.addCase(mod.setter.rejected, (state, { error }) => {
        state.requestStatus[`save-${mod.key}`] = {
          type: 'error',
          error: error.message,
          updated: new Date(),
        };
      });
      builder.addCase(mod.asyncSetter, mod.stateSetter);
    });
  },
});

setupClientReconnect = createAsyncThunk(
  'api/setupClientReconnect',
  (client: KilovoltWS, { dispatch }) => {
    client.on('close', () => {
      setTimeout(() => {
        console.info('Attempting reconnection');
        client.reconnect();
      }, 5000);
      dispatch(
        apiReducer.actions.connectionStatusChanged(
          ConnectionStatus.NotConnected,
        ),
      );
    });
    client.on('open', () => {
      dispatch(
        apiReducer.actions.connectionStatusChanged(ConnectionStatus.Connected),
      );
    });
  },
);

kvErrorReceived = createAsyncThunk(
  'api/kvErrorReceived',
  (error: kvError, { dispatch }) => {
    switch (error.error) {
      case 'authentication required':
      case 'authentication failed':
        dispatch(
          apiReducer.actions.connectionStatusChanged(
            ConnectionStatus.AuthenticationNeeded,
          ),
        );
        break;
      default:
        // Unsupported error
        dispatch(apiReducer.actions.kvErrorReceived(error));
    }
  },
);

export const useAuthBypass = createAsyncThunk<void, void, ThunkConfig>(
  'api/authBypass',
  async (_: void, { getState, dispatch }) => {
    const { api } = getState();
    const response = await api.client.send({ command: '_uid' });
    if ('ok' in response && response.ok && 'data' in response) {
      const uid = response.data as string;
      await AuthenticateKVClient(uid.toString());
      dispatch(
        apiReducer.actions.connectionStatusChanged(ConnectionStatus.Connected),
      );
    }
  },
);

export default apiReducer;
