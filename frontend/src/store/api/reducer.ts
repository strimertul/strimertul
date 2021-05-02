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
import StrimertulWS from '../../lib/strimertul-ws';

const moduleConfigKey = 'stul-meta/modules';
const httpConfigKey = 'http/config';
const twitchBotConfigKey = 'twitchbot/config';
const stulbeConfigKey = 'stulbe/config';
const loyaltyConfigKey = 'loyalty/config';
const loyaltyStorageKey = 'loyalty/users';
const loyaltyRewardsKey = 'loyalty/rewards';
const loyaltyGoalsKey = 'loyalty/goals';
const loyaltyRedeemQueueKey = 'loyalty/redeem-queue';

interface ModuleConfig {
  configured: boolean;
  kv: boolean;
  static: boolean;
  twitchbot: boolean;
  stulbe: boolean;
  loyalty: boolean;
}

interface HTTPConfig {
  bind: string;
  path: string;
}

interface TwitchBotConfig {
  username: string;
  oauth: string;
  channel: string;
}

interface StulbeConfig {
  endpoint: string;
  token: string;
}

interface LoyaltyConfig {
  currency: string;
  enable_live_check: boolean;
  points: {
    interval: number;
    amount: number;
    activity_bonus: number;
  };
  banlist: string[];
}

export type LoyaltyStorage = Record<string, number>;

export interface LoyaltyReward {
  enabled: boolean;
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  required_info?: string;
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
}

export interface APIState {
  client: StrimertulWS;
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
    twitchBotConfig: TwitchBotConfig;
    stulbeConfig: StulbeConfig;
    loyaltyConfig: LoyaltyConfig;
  };
}

const initialState: APIState = {
  client: null,
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

export const createWSClient = createAsyncThunk(
  'api/createClient',
  async (address: string) => {
    const client = new StrimertulWS(address);
    await client.wait();
    return client;
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
  loyaltyStorage: makeModule<LoyaltyStorage>(
    loyaltyStorageKey,
    (state) => state.loyalty.users,
    (state, { payload }) => {
      state.loyalty.users = payload;
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

const apiReducer = createSlice({
  name: 'api',
  initialState,
  reducers: {
    initialLoadCompleted(state) {
      state.initialLoadComplete = true;
    },
    moduleConfigChanged(state, { payload }: PayloadAction<ModuleConfig>) {
      state.moduleConfigs.moduleConfig = payload;
    },
    httpConfigChanged(state, { payload }: PayloadAction<HTTPConfig>) {
      state.moduleConfigs.httpConfig = payload;
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
    loyaltyStorageChanged(state, { payload }: PayloadAction<LoyaltyStorage>) {
      state.loyalty.users = payload;
    },
    loyaltyRewardsChanged(state, { payload }: PayloadAction<LoyaltyReward[]>) {
      state.loyalty.rewards = payload;
    },
    loyaltyGoalsChanged(state, { payload }: PayloadAction<LoyaltyGoal[]>) {
      state.loyalty.goals = payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(createWSClient.fulfilled, (state, { payload }) => {
      state.client = payload;
    });
    Object.values(modules).forEach((mod) => {
      builder.addCase(mod.getter.fulfilled, mod.stateSetter);
      builder.addCase(mod.asyncSetter, mod.stateSetter);
    });
  },
});

export default apiReducer;
