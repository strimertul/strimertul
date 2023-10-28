import { CircleIcon, InfoCircledIcon, UpdateIcon } from '@radix-ui/react-icons';
import { Trans, useTranslation } from 'react-i18next';
import {
  EventSubNotification,
  EventSubNotificationType,
  unwrapEvent,
} from '~/lib/eventSub';
import { useLiveKey, useModule } from '~/lib/react';
import { useAppDispatch, useAppSelector } from '~/store';
import { modules } from '~/store/api/reducer';
import { PageContainer, SectionHeader, styled, TextBlock } from '../theme';
import BrowserLink from '../components/BrowserLink';
import Scrollbar from '../components/utils/Scrollbar';
import RevealLink from '../components/utils/RevealLink';

interface StreamInfo {
  id: string;
  user_name: string;
  user_login: string;
  game_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
}

const StreamBlock = styled('div', {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: '160px 1fr',
});
const StreamTitle = styled('h3', {
  gridRow: 1,
  gridColumn: 2,
  fontWeight: 400,
  margin: 0,
  marginTop: '0.5rem',
});
const StreamInfo = styled('div', {
  gridRow: 2,
  gridColumn: 2,
  fontWeight: 'bold',
  margin: 0,
  marginBottom: '0.5rem',
});
const LiveIndicator = styled('div', {
  gridRow: '1/3',
  gridColumn: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
});
const Darken = styled(BrowserLink, {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.5)',
  width: '100%',
  height: '100%',
  gap: '0.5rem',
  color: '$red11 !important',
  textDecoration: 'none !important',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    opacity: 0.5,
  },
});

const EventListContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
});

const TwitchEventContainer = styled('div', {
  background: '$gray3',
  padding: '8px',
  borderRadius: '5px',
  display: 'flex',
  alignItems: 'center',
});

const TwitchEventContent = styled('div', {
  flex: 1,
});
const TwitchEventActions = styled('div', {
  display: 'flex',
  margin: '0 10px',
  '& a': {
    color: '$gray10',
    '&:hover': {
      color: '$gray12',
      cursor: 'pointer',
    },
  },
});
const TwitchEventTime = styled('time', {
  color: '$gray10',
  fontSize: '13px',
});

const UsefulLinksMenu = styled('ul', {
  margin: '0',
  listStyleType: 'square',
  li: {
    padding: '3px',
  },
});

const supportedMessages: EventSubNotificationType[] = [
  EventSubNotificationType.Followed,
  EventSubNotificationType.CustomRewardRedemptionAdded,
  EventSubNotificationType.StreamWentOnline,
  EventSubNotificationType.StreamWentOffline,
  EventSubNotificationType.ChannelUpdated,
  EventSubNotificationType.Raided,
  EventSubNotificationType.Cheered,
  EventSubNotificationType.Subscription,
  EventSubNotificationType.SubscriptionWithMessage,
  EventSubNotificationType.SubscriptionGifted,
];

function TwitchEvent({ data }: { data: EventSubNotification }) {
  const { t } = useTranslation();
  const client = useAppSelector((state) => state.api.client);

  const replay = () => {
    void client.putJSON('twitch/ev/eventsub-event', {
      ...data,
      subscription: {
        ...data.subscription,
        created_at: new Date().toISOString(),
      },
    });
  };

  let content: JSX.Element | string;
  const message = unwrapEvent(data);
  let date = data.date ? new Date(data.date) : null;
  switch (message.type) {
    case EventSubNotificationType.Followed: {
      content = (
        <>
          <Trans
            t={t}
            i18nKey={'pages.dashboard.twitch-events.events.follow'}
            values={{ name: message.event.user_name }}
            components={{
              n: <b />,
            }}
          />
        </>
      );
      date = new Date(message.event.followed_at);
      break;
    }
    case EventSubNotificationType.CustomRewardRedemptionAdded: {
      content = (
        <>
          <Trans
            t={t}
            i18nKey={'pages.dashboard.twitch-events.events.redemption'}
            values={{
              name: message.event.user_name,
              reward: message.event.reward.title,
            }}
            components={{
              n: <b />,
              r: <b />,
            }}
          />
        </>
      );
      date = new Date(message.event.redeemed_at);
      break;
    }
    case EventSubNotificationType.StreamWentOnline: {
      content = (
        <>
          <Trans
            t={t}
            i18nKey={'pages.dashboard.twitch-events.events.stream-start'}
          />
        </>
      );
      date = new Date(message.event.started_at);
      break;
    }
    case EventSubNotificationType.StreamWentOffline: {
      content = (
        <>
          <Trans
            t={t}
            i18nKey={'pages.dashboard.twitch-events.events.stream-stop'}
          />
        </>
      );
      break;
    }
    case EventSubNotificationType.ChannelUpdated: {
      content = (
        <>
          <Trans
            t={t}
            i18nKey={'pages.dashboard.twitch-events.events.channel-updated'}
          />
        </>
      );
      break;
    }
    case EventSubNotificationType.Raided: {
      content = (
        <>
          <Trans
            t={t}
            i18nKey={'pages.dashboard.twitch-events.events.raided'}
            values={{
              name: message.event.from_broadcaster_user_name,
              viewers: message.event.viewers,
            }}
            components={{
              n: <b />,
              v: <b />,
            }}
          />
        </>
      );
      break;
    }
    case EventSubNotificationType.Cheered: {
      content = (
        <>
          <Trans
            t={t}
            i18nKey={'pages.dashboard.twitch-events.events.cheered'}
            values={{
              name: message.event.is_anonymous
                ? t('pages.dashboard.twitch-events.anonymous')
                : message.event.user_name,
              bits: message.event.bits,
            }}
            components={{
              n: <b />,
              b: <b />,
            }}
          />
        </>
      );
      break;
    }
    case EventSubNotificationType.Subscription:
      content = (
        <>
          <Trans
            t={t}
            i18nKey={'pages.dashboard.twitch-events.events.subscribed'}
            values={{
              name: message.event.user_name,
              tier: message.event.tier.substring(0, 1),
            }}
            components={{
              n: <b />,
              t: <></>,
            }}
          />
        </>
      );
      break;
    case EventSubNotificationType.SubscriptionWithMessage:
      content = (
        <>
          <Trans
            t={t}
            i18nKey={'pages.dashboard.twitch-events.events.subscribed-multi'}
            values={{
              name: message.event.user_name,
              months: message.event.cumulative_months,
              tier: message.event.tier.substring(0, 1),
            }}
            components={{
              n: <b />,
              m: <></>,
              t: <></>,
            }}
          />
        </>
      );
      break;
    case EventSubNotificationType.SubscriptionGifted:
      content = (
        <>
          <Trans
            t={t}
            i18nKey={'pages.dashboard.twitch-events.events.subscrition-gift'}
            values={{
              count: message.event.total,
              name: message.event.is_anonymous
                ? t('pages.dashboard.twitch-events.anonymous')
                : message.event.user_name,
              tier: message.event.tier.substring(0, 1),
            }}
            components={{
              n: <b />,
              c: <></>,
              t: <></>,
            }}
          />
        </>
      );
      break;
    default:
      content = <small>{message.type}</small>;
  }

  return (
    <TwitchEventContainer>
      <TwitchEventContent>{content}</TwitchEventContent>
      <TwitchEventTime
        title={date?.toLocaleString()}
        dateTime={message.subscription.created_at}
      >
        {date?.toLocaleTimeString()}
      </TwitchEventTime>
      <TwitchEventActions>
        <a
          aria-label={t('pages.dashboard.twitch-events.replay')}
          title={t('pages.dashboard.twitch-events.replay')}
          onClick={() => {
            replay();
          }}
        >
          <UpdateIcon />
        </a>
      </TwitchEventActions>
    </TwitchEventContainer>
  );
}

function TwitchEventLog({ events }: { events: EventSubNotification[] }) {
  const { t } = useTranslation();
  return (
    <>
      <SectionHeader>
        {t('pages.dashboard.twitch-events.header')}
        <a
          style={{ marginLeft: '10px' }}
          title={t('pages.dashboard.twitch-events.warning')}
        >
          <InfoCircledIcon />
        </a>
      </SectionHeader>
      <Scrollbar vertical={true} viewport={{ maxHeight: '250px' }}>
        <EventListContainer>
          {events
            .filter((ev) => supportedMessages.includes(ev.subscription.type))
            .sort((a, b) =>
              a.date && b.date ? Date.parse(b.date) - Date.parse(a.date) : 0,
            )
            .map((ev) => (
              <TwitchEvent key={`${ev.subscription.id}-${ev.date}`} data={ev} />
            ))}
        </EventListContainer>
      </Scrollbar>
    </>
  );
}

function TwitchStreamStatus({ info }: { info: StreamInfo }) {
  const { t } = useTranslation();
  const [uiConfig, setUiConfig] = useModule(modules.uiConfig);
  const dispatch = useAppDispatch();
  console.log(uiConfig);
  return (
    <StreamBlock>
      <LiveIndicator
        css={{
          backgroundImage: `url(${info.thumbnail_url
            .replace('{width}', '160')
            .replace('{height}', '90')})`,
        }}
      >
        <Darken target="_blank" href={`https://twitch.tv/${info.user_login}`}>
          <CircleIcon /> {t('pages.dashboard.live')}
        </Darken>
      </LiveIndicator>
      <StreamTitle>{info.title}</StreamTitle>
      <StreamInfo>
        {info.game_name} -{' '}
        {t('pages.dashboard.x-viewers', {
          num: uiConfig.hideViewers ? '...' : `${info.viewer_count}`,
        })}{' '}
        <RevealLink
          value={!uiConfig.hideViewers}
          setter={(newVal) => {
            console.log(newVal);
            void dispatch(setUiConfig({ ...uiConfig, hideViewers: !newVal }));
          }}
        />
      </StreamInfo>
    </StreamBlock>
  );
}

function TwitchSection() {
  const { t } = useTranslation();
  const twitchInfo = useLiveKey<StreamInfo[]>('twitch/stream-info');
  // const twitchActivity = useLiveKey<StreamInfo[]>('twitch/chat-activity');
  const twitchEvents = useLiveKey<EventSubNotification[]>(
    'twitch/eventsub-history',
  );

  return (
    <>
      <SectionHeader spacing="none">
        {t('pages.dashboard.twitch-status')}
      </SectionHeader>
      {twitchInfo && twitchInfo.length > 0 ? (
        <TwitchStreamStatus info={twitchInfo[0]} />
      ) : (
        <TextBlock>{t('pages.dashboard.not-live')}</TextBlock>
      )}
      {twitchEvents ? <TwitchEventLog events={twitchEvents} /> : null}
    </>
  );
}

export default function Dashboard(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <PageContainer>
      <TwitchSection />
      <SectionHeader>{t('pages.dashboard.quick-links')}</SectionHeader>
      <UsefulLinksMenu>
        <li>
          <BrowserLink href="https://strimertul.stream/guide/">
            {t('pages.dashboard.link-user-guide')}
          </BrowserLink>
        </li>
        <li>
          <BrowserLink href="https://strimertul.stream/api/v31/">
            {t('pages.dashboard.link-api')}
          </BrowserLink>
        </li>
      </UsefulLinksMenu>
    </PageContainer>
  );
}
