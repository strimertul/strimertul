/* eslint-disable camelcase */

import KilovoltWS from '@strimertul/kilovolt-client';
import { kvError } from '@strimertul/kilovolt-client/lib/messages';

interface ModuleConfig {
  configured: boolean;
  twitch: boolean;
  stulbe: boolean;
  loyalty: boolean;
}

interface HTTPConfig {
  bind: string;
  enable_static_server: boolean;
  kv_password: string;
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

interface TwitchModulesConfig {
  enable_timers: boolean;
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

export interface TwitchBotTimer {
  enabled: boolean;
  name: string;
  minimum_chat_activity: number;
  minimum_delay: number;
  messages: string[];
}

interface TwitchBotTimersConfig {
  timers: Record<string, TwitchBotTimer>;
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

export enum ConnectionStatus {
  NotConnected,
  AuthenticationNeeded,
  Connected,
}

export interface APIState {
  client: KilovoltWS;
  connectionStatus: ConnectionStatus;
  kvError: kvError;
  initialLoadComplete: boolean;
  loyalty: {
    users: LoyaltyStorage;
    rewards: LoyaltyReward[];
    goals: LoyaltyGoal[];
    redeemQueue: LoyaltyRedeem[];
  };
  twitchBot: {
    commands: TwitchBotCustomCommands;
    modules: TwitchModulesConfig;
    timers: TwitchBotTimersConfig;
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
