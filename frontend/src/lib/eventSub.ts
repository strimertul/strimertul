export enum EventSubNotificationType {
  ChannelUpdated = 'channel.update',
  UserUpdated = 'user.update',
  Cheered = 'channel.cheer',
  Raided = 'channel.raid',
  CustomRewardAdded = 'channel.channel_points_custom_reward.add',
  CustomRewardRemoved = 'channel.channel_points_custom_reward.remove',
  CustomRewardUpdated = 'channel.channel_points_custom_reward.update',
  CustomRewardRedemptionAdded = 'channel.channel_points_custom_reward_redemption.add',
  CustomRewardRedemptionUpdated = 'channel.channel_points_custom_reward_redemption.update',
  Followed = 'channel.follow',
  GoalBegan = 'channel.goal.begin',
  GoalEnded = 'channel.goal.end',
  GoalProgress = 'channel.goal.progress',
  HypeTrainBegan = 'channel.hype_train.begin',
  HypeTrainEnded = 'channel.hype_train.end',
  HypeTrainProgress = 'channel.hype_train.progress',
  ModeratorAdded = 'channel.moderator.add',
  ModeratorRemoved = 'channel.moderator.remove',
  PollBegan = 'channel.poll.begin',
  PollEnded = 'channel.poll.end',
  PollProgress = 'channel.poll.progress',
  PredictionBegan = 'channel.prediction.begin',
  PredictionEnded = 'channel.prediction.end',
  PredictionLocked = 'channel.prediction.lock',
  PredictionProgress = 'channel.prediction.progress',
  StreamWentOffline = 'stream.offline',
  StreamWentOnline = 'stream.online',
  Subscription = 'channel.subscribe',
  SubscriptionEnded = 'channel.subscription.end',
  SubscriptionGifted = 'channel.subscription.gift',
  SubscriptionWithMessage = 'channel.subscription.message',
  ViewerBanned = 'channel.ban',
  ViewerUnbanned = 'channel.unban',
}

export interface EventSubSubscription {
  id: string;
  type: EventSubNotificationType;
  version: string;
  status: string;
  created_at: string;
  cost: number;
}

export interface EventSubNotification {
  subscription: EventSubSubscription;
  event: unknown;
  date?: string;
}

export const unwrapEvent = (message: EventSubNotification) =>
  ({
    type: message.subscription.type,
    subscription: message.subscription,
    event: message.event,
  } as EventSubMessage);

interface TypedEventSubNotification<
  T extends EventSubNotificationType,
  Payload,
> {
  type: T;
  subscription: EventSubSubscription;
  event: Payload;
}

export type EventSubMessage =
  | TypedEventSubNotification<
      EventSubNotificationType.ChannelUpdated,
      ChannelUpdatedEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.UserUpdated,
      UserUpdatedEventData
    >
  | TypedEventSubNotification<EventSubNotificationType.Cheered, CheerEventData>
  | TypedEventSubNotification<EventSubNotificationType.Raided, RaidEventData>
  | TypedEventSubNotification<
      EventSubNotificationType.CustomRewardAdded,
      ChannelRewardEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.CustomRewardRemoved,
      ChannelRewardEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.CustomRewardUpdated,
      ChannelRewardEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.CustomRewardRedemptionAdded,
      ChannelRedemptionEventData<false>
    >
  | TypedEventSubNotification<
      EventSubNotificationType.CustomRewardRedemptionUpdated,
      ChannelRedemptionEventData<true>
    >
  | TypedEventSubNotification<
      EventSubNotificationType.Followed,
      FollowEventData
    >
  | TypedEventSubNotification<EventSubNotificationType.GoalBegan, GoalEventData>
  | TypedEventSubNotification<
      EventSubNotificationType.GoalEnded,
      GoalEndedEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.GoalProgress,
      GoalEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.HypeTrainBegan,
      HypeTrainEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.HypeTrainProgress,
      HypeTrainEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.HypeTrainEnded,
      HypeTrainEndedEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.ModeratorAdded,
      ModeratorEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.ModeratorRemoved,
      ModeratorEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.PollBegan,
      PollEventData<false>
    >
  | TypedEventSubNotification<
      EventSubNotificationType.PollProgress,
      PollEventData<true>
    >
  | TypedEventSubNotification<
      EventSubNotificationType.PollEnded,
      PollEndedEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.PredictionBegan,
      PredictionEventData<false>
    >
  | TypedEventSubNotification<
      EventSubNotificationType.PredictionProgress,
      PredictionEventData<true>
    >
  | TypedEventSubNotification<
      EventSubNotificationType.PredictionLocked,
      PredictionLockedEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.PredictionEnded,
      PredictionEndedEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.StreamWentOffline,
      StreamEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.StreamWentOnline,
      StreamWentOnlineEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.Subscription,
      SubscriptionEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.SubscriptionEnded,
      SubscriptionEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.SubscriptionGifted,
      SubscriptionGiftedEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.SubscriptionWithMessage,
      SubscriptionMessageEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.ViewerBanned,
      UserBannedEventData
    >
  | TypedEventSubNotification<
      EventSubNotificationType.ViewerUnbanned,
      UserUnbannedEventData
    >;

export interface StreamEventData {
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
}

export interface StreamWentOnlineEventData extends StreamEventData {
  id: string;
  type: 'live' | 'playlist' | 'watch_party' | 'premiere' | 'rerun';
  started_at: string;
}

type Optional<field extends string, Extra> =
  | ({ [key in field]: true } & Extra)
  | { [key in field]: false };

type UserBannedEventData = StreamEventData & {
  user_id: string;
  user_login: string;
  user_name: string;
  moderator_user_id: string;
  moderator_user_login: string;
  moderator_user_name: string;
  reason: string;
  banned_at: string;
} & Optional<'is_permanent', { ends_at: string }>;

export interface UserUnbannedEventData {
  user_id: string;
  user_login: string;
  user_name: string;
  moderator_user_id: string;
  moderator_user_login: string;
  moderator_user_name: string;
}

export interface ChannelUpdatedEventData extends StreamEventData {
  title: string;
  language: string;
  category_id: string;
  category_name: string;
  is_mature: boolean;
}

export interface FollowEventData extends StreamEventData {
  user_id: string;
  user_login: string;
  user_name: string;
  followed_at: string;
}

export interface UserUpdatedEventData {
  user_id: string;
  user_login: string;
  user_name: string;
  email?: string;
  email_verified: boolean;
  description: string;
}

export interface CheerEventData extends StreamEventData {
  is_anonymous: boolean;
  user_id: string | null;
  user_login: string | null;
  user_name: string | null;
  message: string;
  bits: number;
}

export interface RaidEventData {
  from_broadcaster_user_id: string;
  from_broadcaster_user_login: string;
  from_broadcaster_user_name: string;
  to_broadcaster_user_id: string;
  to_broadcaster_user_login: string;
  to_broadcaster_user_name: string;
  viewers: number;
}

export interface ChannelRewardEventData extends StreamEventData {
  id: string;
  is_enabled: boolean;
  is_paused: boolean;
  is_in_stock: boolean;
  title: string;
  cost: number;
  prompt: string;
  is_user_input_required: boolean;
  should_redemptions_skip_request_queue: boolean;
  cooldown_expires_at: string | null;
  redemptions_redeemed_current_stream: number | null;
  max_per_stream: Optional<'is_enabled', { value: number }>;
  max_per_user_per_stream: Optional<'is_enabled', { value: number }>;
  global_cooldown: Optional<'is_enabled', { seconds: number }>;
  background_color: string;
  image: {
    url_1x: string;
    url_2x: string;
    url_4x: string;
  } | null;
  default_image: {
    url_1x: string;
    url_2x: string;
    url_4x: string;
  };
}

export interface ChannelRedemptionEventData<Updated extends boolean>
  extends StreamEventData {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  user_input: string;
  status: Updated extends true
    ? 'fulfilled' | 'canceled'
    : 'unfulfilled' | 'unknown' | 'fulfilled' | 'canceled';
  reward: ChannelRewardEventData;
  redeemed_at: string;
}

export interface GoalEventData extends StreamEventData {
  id: string;
  type: 'follower' | 'subscription';
  description: string;
  current_amount: number;
  target_amount: number;
  started_at: Date;
}

export interface GoalEndedEventData extends GoalEventData {
  is_achieved: boolean;
  ended_at: Date;
}

export interface HypeTrainContribution {
  user_id: string;
  user_login: string;
  user_name: string;
  type: 'bits' | 'subscription' | 'other';
  total: number;
}

interface HypeTrainBaseData extends StreamEventData {
  id: string;
  level: number;
  total: number;
  top_contributions:
    | [HypeTrainContribution]
    | [HypeTrainContribution, HypeTrainContribution]
    | null;
  started_at: string;
}

export interface HypeTrainEventData extends HypeTrainBaseData {
  progress: number;
  goal: number;
  last_contribution: HypeTrainContribution;
  expires_at: string;
}

export interface HypeTrainEndedEventData extends HypeTrainBaseData {
  ended_at: string;
  cooldown_ends_at: string;
}

export interface ModeratorEventData extends StreamEventData {
  user_id: string;
  user_login: string;
  user_name: string;
}

interface PollBaseData<Running extends boolean> extends StreamEventData {
  id: string;
  title: string;
  choices: Running extends true
    ? {
        id: string;
        title: string;
        bits_votes: number;
        channel_points_votes: number;
        votes: number;
      }
    : {
        id: string;
        title: string;
      };
  bits_voting: Optional<'is_enabled', { amount_per_vote: number }>;
  channel_points_voting: Optional<'is_enabled', { amount_per_vote: number }>;
  started_at: string;
}

export interface PollEventData<Running extends boolean>
  extends PollBaseData<Running> {
  started_at: string;
  ends_at: string;
}

export interface PollEndedEventData extends PollBaseData<true> {
  status: 'completed' | 'archived' | 'terminated';
  ended_at: string;
}

type PredictionColor = 'blue' | 'pink';
interface Outcome<Color extends PredictionColor> {
  id: string;
  title: string;
  color: Color;
}
interface RunningOutcome<Color extends PredictionColor> extends Outcome<Color> {
  users: number;
  channel_points: number;
  top_predictors: {
    user_name: string;
    user_login: string;
    user_id: string;
    channel_points_won: number | null;
    channel_points_used: number;
  }[];
}

type UnorderedTuple<A, B> = [A, B] | [B, A];

interface PredictionBaseData<Running extends boolean> extends StreamEventData {
  id: string;
  title: string;
  started_at: string;
  outcomes: Running extends true
    ? UnorderedTuple<RunningOutcome<'blue'>, RunningOutcome<'pink'>>
    : UnorderedTuple<Outcome<'blue'>, Outcome<'pink'>>;
}

export interface PredictionEventData<Running extends boolean>
  extends PredictionBaseData<Running> {
  locks_at: string;
}

export interface PredictionLockedEventData extends PredictionBaseData<true> {
  locked_at: string;
}

export interface PredictionEndedEventData extends PredictionBaseData<true> {
  winning_outcome_id: string | null;
  status: 'resolved' | 'canceled';
  ended_at: string;
}

interface SubscriptionBaseData extends StreamEventData {
  user_id: string;
  user_login: string;
  user_name: string;
  tier: '1000' | '2000' | '3000';
}

export interface SubscriptionEventData extends SubscriptionBaseData {
  is_gift: boolean;
}

export interface SubscriptionGiftedEventData extends SubscriptionBaseData {
  total: number;
  cumulative_total: number | null;
  is_anonymous: boolean;
}

export interface SubscriptionMessageEventData extends SubscriptionBaseData {
  message: {
    text: string;
    emotes: {
      begin: number;
      end: number;
      id: string;
    }[]; // Oh god not this again
  };
  cumulative_months: number;
  streak_months: number | null;
  duration_months: number;
}
