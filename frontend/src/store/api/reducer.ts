/* eslint-disable no-param-reassign */
import {
  AsyncThunk,
  CaseReducer,
  createAction,
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';
import KilovoltWS from '@strimertul/kilovolt-client';
import {
  APIState,
  LoyaltyPointsEntry,
  LoyaltyRedeem,
  LoyaltyStorage,
} from './types';

function makeGetterThunk<T>(key: string) {
  return async (_: void, { getState }) => {
    const { api } = getState() as { api: APIState };
    return api.client.getJSON<T>(key);
  };
}

function makeSetterThunk<T>(
  key: string,
  // eslint-disable-next-line @typescript-eslint/ban-types
  getter: AsyncThunk<T, void, {}>,
) {
  return async (data: T, { getState, dispatch }) => {
    const { api } = getState() as { api: APIState };
    const result = await api.client.putJSON(key, data);
    if ('ok' in result) {
      if (result.ok) {
        // Re-load value from KV
        dispatch(getter());
      }
    }
    return result;
  };
}

function makeGetSetThunks<T>(key: string) {
  const getter = createAsyncThunk(`api/get/${key}`, makeGetterThunk<T>(key));
  const setter = createAsyncThunk(
    `api/set/${key}`,
    makeSetterThunk<T>(key, getter),
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

// eslint-disable-next-line import/no-mutable-exports, @typescript-eslint/ban-types
export let setupClientReconnect: AsyncThunk<void, KilovoltWS, {}>;

// Storage
const loyaltyPointsPrefix = 'loyalty/points/';
const loyaltyRewardsKey = 'loyalty/rewards';

// RPCs
const loyaltyCreateRedeemKey = 'loyalty/@create-redeem';
const loyaltyRemoveRedeemKey = 'loyalty/@remove-redeem';

export const createWSClient = createAsyncThunk(
  'api/createClient',
  async (address: string, { dispatch }) => {
    const client = new KilovoltWS(address);
    await client.wait();
    dispatch(setupClientReconnect(client));
    return client;
  },
);

export const getUserPoints = createAsyncThunk(
  'api/getUserPoints',
  async (_: void, { getState }) => {
    const { api } = getState() as { api: APIState };
    const keys = await api.client.getKeysByPrefix(loyaltyPointsPrefix);
    const userpoints: LoyaltyStorage = {};
    Object.entries(keys).forEach(([k, v]) => {
      userpoints[k.substr(loyaltyPointsPrefix.length)] = JSON.parse(
        v as string,
      );
    });
    return userpoints;
  },
);

export const setUserPoints = createAsyncThunk(
  'api/setUserPoints',
  async (
    {
      user,
      points,
      relative,
    }: { user: string; points: number; relative: boolean },
    { getState },
  ) => {
    const { api } = getState() as { api: APIState };
    const entry: LoyaltyPointsEntry = { points };
    if (relative) {
      entry.points += api.loyalty.users[user]?.points ?? 0;
    }
    return api.client.putJSON(loyaltyPointsPrefix + user, entry);
  },
);

export const modules = {
  moduleConfig: makeModule(
    'stul-meta/modules',
    (state) => state.moduleConfigs?.moduleConfig,
    (state, { payload }) => {
      state.moduleConfigs.moduleConfig = payload;
    },
  ),
  httpConfig: makeModule(
    'http/config',
    (state) => state.moduleConfigs?.httpConfig,
    (state, { payload }) => {
      state.moduleConfigs.httpConfig = payload;
    },
  ),
  twitchConfig: makeModule(
    'twitch/config',
    (state) => state.moduleConfigs?.twitchConfig,
    (state, { payload }) => {
      state.moduleConfigs.twitchConfig = payload;
    },
  ),
  twitchBotConfig: makeModule(
    'twitch/bot-config',
    (state) => state.moduleConfigs?.twitchBotConfig,
    (state, { payload }) => {
      state.moduleConfigs.twitchBotConfig = payload;
    },
  ),
  twitchBotCommands: makeModule(
    'twitch/bot-custom-commands',
    (state) => state.twitchBot?.commands,
    (state, { payload }) => {
      state.twitchBot.commands = payload;
    },
  ),
  stulbeConfig: makeModule(
    'stulbe/config',
    (state) => state.moduleConfigs?.stulbeConfig,
    (state, { payload }) => {
      state.moduleConfigs.stulbeConfig = payload;
    },
  ),
  loyaltyConfig: makeModule(
    'loyalty/config',
    (state) => state.moduleConfigs?.loyaltyConfig,
    (state, { payload }) => {
      state.moduleConfigs.loyaltyConfig = payload;
    },
  ),
  loyaltyRewards: makeModule(
    loyaltyRewardsKey,
    (state) => state.loyalty.rewards,
    (state, { payload }) => {
      state.loyalty.rewards = payload;
    },
  ),
  loyaltyGoals: makeModule(
    'loyalty/goals',
    (state) => state.loyalty.goals,
    (state, { payload }) => {
      state.loyalty.goals = payload;
    },
  ),
  loyaltyRedeemQueue: makeModule(
    'loyalty/redeem-queue',
    (state) => state.loyalty.redeemQueue,
    (state, { payload }) => {
      state.loyalty.redeemQueue = payload;
    },
  ),
};

export const createRedeem = createAsyncThunk(
  'api/createRedeem',
  async (redeem: LoyaltyRedeem, { getState }) => {
    const { api } = getState() as { api: APIState };
    return api.client.putJSON(loyaltyCreateRedeemKey, redeem);
  },
);

export const removeRedeem = createAsyncThunk(
  'api/createRedeem',
  async (redeem: LoyaltyRedeem, { getState }) => {
    const { api } = getState() as { api: APIState };
    return api.client.putJSON(loyaltyRemoveRedeemKey, redeem);
  },
);

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
  connected: false,
  initialLoadComplete: false,
  loyalty: {
    users: null,
    rewards: null,
    goals: null,
    redeemQueue: null,
  },
  twitchBot: {
    commands: null,
  },
  moduleConfigs: {
    moduleConfig: null,
    httpConfig: null,
    twitchConfig: null,
    twitchBotConfig: null,
    stulbeConfig: null,
    loyaltyConfig: null,
  },
};

const apiReducer = createSlice({
  name: 'api',
  initialState,
  reducers: {
    ...moduleChangeReducers,
    initialLoadCompleted(state) {
      state.initialLoadComplete = true;
    },
    connectionStatusChanged(state, { payload }: PayloadAction<boolean>) {
      state.connected = payload;
    },
    loyaltyUserPointsChanged(
      state,
      {
        payload: { user, entry },
      }: PayloadAction<{ user: string; entry: LoyaltyPointsEntry }>,
    ) {
      state.loyalty.users[user] = entry;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(createWSClient.fulfilled, (state, { payload }) => {
      state.client = payload;
      state.connected = true;
    });
    builder.addCase(getUserPoints.fulfilled, (state, { payload }) => {
      state.loyalty.users = payload;
    });
    Object.values(modules).forEach((mod) => {
      builder.addCase(mod.getter.fulfilled, mod.stateSetter);
      builder.addCase(mod.asyncSetter, mod.stateSetter);
    });
  },
});

setupClientReconnect = createAsyncThunk(
  'api/setupClientReconnect',
  async (client: KilovoltWS, { dispatch }) => {
    client.on('close', () => {
      setTimeout(async () => {
        console.info('Attempting reconnection');
        client.reconnect();
      }, 5000);
      dispatch(apiReducer.actions.connectionStatusChanged(false));
    });
    client.on('open', () => {
      dispatch(apiReducer.actions.connectionStatusChanged(true));
    });
  },
);

export default apiReducer;
