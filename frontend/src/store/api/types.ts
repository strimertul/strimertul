/* eslint-disable camelcase */

import KilovoltWS from '@strimertul/kilovolt-client';

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
  chat_keys: boolean;
  chat_history: number;
}

type AccessLevelType = 'everyone' | 'vip' | 'moderators' | 'streamer';

export interface TwitchBotCustomCommand {
  description: string;
  access_level: AccessLevelType;
  response: string;
  enabled: boolean;
}

type TwitchBotCustomCommands = Record<string, TwitchBotCustomCommand>;

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
  twitchBot: {
    commands: TwitchBotCustomCommands;
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
