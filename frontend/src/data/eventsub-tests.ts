const transport = {
  method: 'webhook',
  callback: 'https://example.com/webhooks/callback',
};

const sub = {
  id: 'f1c2a387-161a-49f9-a165-0f21d7a4e1c4',
  status: 'enabled',
  cost: 0,
  condition: {
    broadcaster_user_id: '1337',
  },
  created_at: '2019-11-16T10:11:12.123Z',
  transport,
};

export default {
  'channel.update': {
    subscription: {
      ...sub,
      type: 'channel.update',
      version: '1',
    },
    event: {
      broadcaster_user_id: '1337',
      broadcaster_user_login: 'cool_user',
      broadcaster_user_name: 'Cool_User',
      title: 'Best Stream Ever',
      language: 'en',
      category_id: '21779',
      category_name: 'Fortnite',
      is_mature: false,
    },
  },
  'channel.follow': {
    subscription: {
      ...sub,
      type: 'channel.follow',
      version: '1',
    },
    event: {
      user_id: '1234',
      user_login: 'cool_user',
      user_name: 'Cool_User',
      broadcaster_user_id: '1337',
      broadcaster_user_login: 'cooler_user',
      broadcaster_user_name: 'Cooler_User',
      followed_at: '2020-07-15T18:16:11.17106713Z',
    },
  },
  'channel.subscribe': {
    subscription: {
      ...sub,
      type: 'channel.subscribe',
      version: '1',
    },
    event: {
      user_id: '1234',
      user_login: 'cool_user',
      user_name: 'Cool_User',
      broadcaster_user_id: '1337',
      broadcaster_user_login: 'cooler_user',
      broadcaster_user_name: 'Cooler_User',
      tier: '1000',
      is_gift: false,
    },
  },
  'channel.subscription.gift': {
    subscription: {
      ...sub,
      type: 'channel.subscription.gift',
      version: '1',
    },
    event: {
      user_id: '1234',
      user_login: 'cool_user',
      user_name: 'Cool_User',
      broadcaster_user_id: '1337',
      broadcaster_user_login: 'cooler_user',
      broadcaster_user_name: 'Cooler_User',
      total: 2,
      tier: '1000',
      cumulative_total: 284, // null if anonymous or not shared by the user
      is_anonymous: false,
    },
  },
  'channel.subscription.message': {
    subscription: {
      ...sub,
      type: 'channel.subscription.message',
      version: '1',
    },
    event: {
      user_id: '1234',
      user_login: 'cool_user',
      user_name: 'Cool_User',
      broadcaster_user_id: '1337',
      broadcaster_user_login: 'cooler_user',
      broadcaster_user_name: 'Cooler_User',
      tier: '1000',
      message: {
        text: 'Love the stream! FevziGG',
        emotes: [
          {
            end: 30,
            id: '302976485',
          },
        ],
      },
      cumulative_months: 15,
      streak_months: 1, // null if not shared
      duration_months: 6,
    },
  },
  'channel.cheer': {
    subscription: {
      ...sub,
      type: 'channel.cheer',
      version: '1',
    },
    event: {
      is_anonymous: false,
      user_id: '1234', // null if is_anonymous=true
      user_login: 'cool_user', // null if is_anonymous=true
      user_name: 'Cool_User', // null if is_anonymous=true
      broadcaster_user_id: '1337',
      broadcaster_user_login: 'cooler_user',
      broadcaster_user_name: 'Cooler_User',
      message: 'pogchamp',
      bits: 1000,
    },
  },
  'channel.raid': {
    subscription: {
      ...sub,
      type: 'channel.raid',
      version: '1',
      condition: {
        to_broadcaster_user_id: '1337',
      },
    },
    event: {
      from_broadcaster_user_id: '1234',
      from_broadcaster_user_login: 'cool_user',
      from_broadcaster_user_name: 'Cool_User',
      to_broadcaster_user_id: '1337',
      to_broadcaster_user_login: 'cooler_user',
      to_broadcaster_user_name: 'Cooler_User',
      viewers: 9001,
    },
  },
};
