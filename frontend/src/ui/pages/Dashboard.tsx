import { CircleIcon } from '@radix-ui/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveKey } from '~/lib/react';
import {
  EventSubNotification,
  EventSubNotificationType,
  unwrapEvent,
} from '~/lib/eventSub';
import { PageContainer, SectionHeader, styled, TextBlock } from '../theme';
import WIPNotice from '../components/utils/WIPNotice';
import BrowserLink from '../components/BrowserLink';
import Scrollbar from '../components/utils/Scrollbar';

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
  zIndex: 2,
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
});

const supportedMessages: EventSubNotificationType[] = [
  EventSubNotificationType.Followed,
];

function TwitchEvent({ data }: { data: EventSubNotification }) {
  let content: JSX.Element | string;
  const message = unwrapEvent(data);
  switch (message.type) {
    case EventSubNotificationType.Followed: {
      content = `${message.event.user_name} followed you!`;
      break;
    }
    default:
      content = <small>{message.type}</small>;
  }
  return <TwitchEventContainer>{content}</TwitchEventContainer>;
}

function TwitchEventLog({ events }: { events: EventSubNotification[] }) {
  // TODO Include a note specifying that it's not ALL events!!
  return (
    <>
      <SectionHeader>Latest events</SectionHeader>
      <Scrollbar vertical={true} viewport={{ maxHeight: '200px' }}>
        <EventListContainer>
          {events
            .filter((ev) => supportedMessages.includes(ev.subscription.type))
            .map((ev) => (
              <TwitchEvent
                key={`${ev.subscription.id}-${ev.subscription.created_at}`}
                data={ev}
              />
            ))}
        </EventListContainer>
      </Scrollbar>
    </>
  );
}

function TwitchStreamStatus({ info }: { info: StreamInfo }) {
  const { t } = useTranslation();
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
          count: info.viewer_count,
        })}
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
  console.log(twitchEvents);

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
  return (
    <PageContainer>
      <TwitchSection />
      <WIPNotice />
    </PageContainer>
  );
}
