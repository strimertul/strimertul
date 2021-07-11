/* eslint-disable camelcase */
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

// Storage
const moduleConfigKey = 'stul-meta/modules';
const httpConfigKey = 'http/config';
const twitchConfigKey = 'twitch/config';
const twitchBotConfigKey = 'twitch/bot-config';
const stulbeConfigKey = 'stulbe/config';
const loyaltyConfigKey = 'loyalty/config';
const loyaltyPointsPrefix = 'loyalty/points/';
const loyaltyRewardsKey = 'loyalty/rewards';
const loyaltyGoalsKey = 'loyalty/goals';
const loyaltyRedeemQueueKey = 'loyalty/redeem-queue';

// RPCs
const loyaltyCreateRedeemKey = 'loyalty/@create-redeem';
const loyaltyRemoveRedeemKey = 'loyalty/@remove-redeem';

interface ModuleConfig {
  configured: boolean;
  kv: boolean;
  static: boolean;
  twitch: boolean;
  stulbe: boolean;
  loyalty: boolean;
}

interface HTTPConfig {
  bind: string;
  path: string;
}

interface TwitchConfig {
  enable_bot: boolean;
  api_client_id: string;
  api_client_secret: string;
}

interface TwitchBotConfig {
  username: string;
  oauth: string;
  channel: string;
}

interface StulbeConfig {
  endpoint: string;
  username: string;
  auth_key: string;
}

interface LoyaltyConfig {
  currency: string;
  points: {
    interval: number;
    amount: number;
    activity_bonus: number;
  };
  banlist: string[];
}

export interface LoyaltyPointsEntry {
  points: number;
}

export type LoyaltyStorage = Record<string, LoyaltyPointsEntry>;

export interface LoyaltyReward {
  enabled: boolean;
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  required_info?: string;
  cooldown: number;
}

export interface LoyaltyGoal {
  enabled: boolean;
  id: string;
  name: string;
  description: string;
  image: string;
  total: number;
  contributed: number;
  contributors: Record<string, number>;
}

export interface LoyaltyRedeem {
  username: string;
  display_name: string;
  when: Date;
  reward: LoyaltyReward;
  request_text: string;
}

export interface APIState {
  client: KilovoltWS;
  connected: boolean;
  initialLoadComplete: boolean;
  loyalty: {
    users: LoyaltyStorage;
    rewards: LoyaltyReward[];
    goals: LoyaltyGoal[];
    redeemQueue: LoyaltyRedeem[];
  };
  moduleConfigs: {
    moduleConfig: ModuleConfig;
    httpConfig: HTTPConfig;
    twitchConfig: TwitchConfig;
    twitchBotConfig: TwitchBotConfig;
    stulbeConfig: StulbeConfig;
    loyaltyConfig: LoyaltyConfig;
  };
}

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
  moduleConfigs: {
    moduleConfig: null,
    httpConfig: null,
    twitchConfig: null,
    twitchBotConfig: null,
    stulbeConfig: null,
    loyaltyConfig: null,
  },
};

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
      userpoints[k.substr(loyaltyPointsPrefix.length)] = JSON.parse(v);
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
  moduleConfig: makeModule<ModuleConfig>(
    moduleConfigKey,
    (state) => state.moduleConfigs?.moduleConfig,
    (state, { payload }) => {
      state.moduleConfigs.moduleConfig = payload;
    },
  ),
  httpConfig: makeModule<HTTPConfig>(
    httpConfigKey,
    (state) => state.moduleConfigs?.httpConfig,
    (state, { payload }) => {
      state.moduleConfigs.httpConfig = payload;
    },
  ),
  twitchConfig: makeModule<TwitchConfig>(
    twitchConfigKey,
    (state) => state.moduleConfigs?.twitchConfig,
    (state, { payload }) => {
      state.moduleConfigs.twitchConfig = payload;
    },
  ),
  twitchBotConfig: makeModule<TwitchBotConfig>(
    twitchBotConfigKey,
    (state) => state.moduleConfigs?.twitchBotConfig,
    (state, { payload }) => {
      state.moduleConfigs.twitchBotConfig = payload;
    },
  ),
  stulbeConfig: makeModule<StulbeConfig>(
    stulbeConfigKey,
    (state) => state.moduleConfigs?.stulbeConfig,
    (state, { payload }) => {
      state.moduleConfigs.stulbeConfig = payload;
    },
  ),
  loyaltyConfig: makeModule<LoyaltyConfig>(
    loyaltyConfigKey,
    (state) => state.moduleConfigs?.loyaltyConfig,
    (state, { payload }) => {
      state.moduleConfigs.loyaltyConfig = payload;
    },
  ),
  loyaltyRewards: makeModule<LoyaltyReward[]>(
    loyaltyRewardsKey,
    (state) => state.loyalty.rewards,
    (state, { payload }) => {
      state.loyalty.rewards = payload;
    },
  ),
  loyaltyGoals: makeModule<LoyaltyGoal[]>(
    loyaltyGoalsKey,
    (state) => state.loyalty.goals,
    (state, { payload }) => {
      state.loyalty.goals = payload;
    },
  ),
  loyaltyRedeemQueue: makeModule<LoyaltyRedeem[]>(
    loyaltyRedeemQueueKey,
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

const apiReducer = createSlice({
  name: 'api',
  initialState,
  reducers: {
    initialLoadCompleted(state) {
      state.initialLoadComplete = true;
    },
    connectionStatusChanged(state, { payload }: PayloadAction<boolean>) {
      state.connected = payload;
    },
    moduleConfigChanged(state, { payload }: PayloadAction<ModuleConfig>) {
      state.moduleConfigs.moduleConfig = payload;
    },
    httpConfigChanged(state, { payload }: PayloadAction<HTTPConfig>) {
      state.moduleConfigs.httpConfig = payload;
    },
    twitchConfigChanged(state, { payload }: PayloadAction<TwitchConfig>) {
      state.moduleConfigs.twitchConfig = payload;
    },
    twitchBotConfigChanged(state, { payload }: PayloadAction<TwitchBotConfig>) {
      state.moduleConfigs.twitchBotConfig = payload;
    },
    stulbeConfigChanged(state, { payload }: PayloadAction<StulbeConfig>) {
      state.moduleConfigs.stulbeConfig = payload;
    },
    loyaltyConfigChanged(state, { payload }: PayloadAction<LoyaltyConfig>) {
      state.moduleConfigs.loyaltyConfig = payload;
    },
    loyaltyRewardsChanged(state, { payload }: PayloadAction<LoyaltyReward[]>) {
      state.loyalty.rewards = payload;
    },
    loyaltyGoalsChanged(state, { payload }: PayloadAction<LoyaltyGoal[]>) {
      state.loyalty.goals = payload;
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
