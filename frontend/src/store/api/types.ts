/* eslint-disable camelcase */

import KilovoltWS from '@strimertul/kilovolt-client';
import type { kvError } from '@strimertul/kilovolt-client/types/messages';

export interface HTTPConfig {
  bind: string;
  enable_static_server: boolean;
  kv_password: string;
  path: string;
}

export interface TwitchConfig {
  enabled: boolean;
  enable_bot: boolean;
  api_client_id: string;
  api_client_secret: string;
}

export interface TwitchBotConfig {
  username: string;
  oauth: string;
  channel: string;
  chat_history: number;
}

export const accessLevels = [
  'everyone',
  'subscribers',
  'vip',
  'moderators',
  'streamer',
] as const;

export type AccessLevelType = (typeof accessLevels)[number];

export type ReplyType = 'chat' | 'reply' | 'whisper' | 'announce';
export interface TwitchBotCustomCommand {
  description: string;
  access_level: AccessLevelType;
  response: string;
  response_type: ReplyType;
  enabled: boolean;
}

type TwitchBotCustomCommands = Record<string, TwitchBotCustomCommand>;

interface LoyaltyConfig {
  enabled: boolean;
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

interface TwitchBotAlertsConfig {
  follow: {
    enabled: boolean;
    messages: string[];
  };
  subscription: {
    enabled: boolean;
    messages: string[];
    variations: {
      min_streak?: number;
      is_gifted?: boolean;
      messages: string[];
    }[];
  };
  gift_sub: {
    enabled: boolean;
    messages: string[];
    variations: {
      is_anonymous?: boolean;
      min_cumulative?: number;
      messages: string[];
    }[];
  };
  raid: {
    enabled: boolean;
    messages: string[];
    variations: {
      min_viewers?: number;
      messages: string[];
    }[];
  };
  cheer: {
    enabled: boolean;
    messages: string[];
    variations: {
      min_amount?: number;
      messages: string[];
    }[];
  };
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
  when: string | Date;
  reward: LoyaltyReward;
  request_text: string;
}

export interface UISettings {
  onboardingStatus: number;
  onboardingDone: boolean;
  language: string;
}

export enum ConnectionStatus {
  NotConnected,
  AuthenticationNeeded,
  Connected,
}

export type RequestStatus =
  | { type: 'pending'; updated: Date }
  | { type: 'success'; updated: Date }
  | { type: 'error'; updated: Date; error: string };

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
    timers: TwitchBotTimersConfig;
    alerts: TwitchBotAlertsConfig;
  };
  moduleConfigs: {
    httpConfig: HTTPConfig;
    twitchConfig: TwitchConfig;
    twitchBotConfig: TwitchBotConfig;
    loyaltyConfig: LoyaltyConfig;
  };
  uiConfig: UISettings;
  requestStatus: Record<string, RequestStatus>;
}
