import { CircleIcon } from '@radix-ui/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveKey } from '~/lib/react';
import { PageContainer, SectionHeader, styled, TextBlock } from '../theme';
import WIPNotice from '../components/utils/WIPNotice';
import BrowserLink from '../components/BrowserLink';

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

function TwitchSection() {
  const { t } = useTranslation();
  const twitchInfo = useLiveKey<StreamInfo[]>('twitch/stream-info');
  // const twitchActivity = useLiveKey<StreamInfo[]>('twitch/chat-activity');

  return (
    <>
      <SectionHeader>{t('pages.dashboard.twitch-status')}</SectionHeader>
      {twitchInfo && twitchInfo.length > 0 ? (
        <StreamBlock>
          <LiveIndicator
            css={{
              backgroundImage: `url(${twitchInfo[0].thumbnail_url
                .replace('{width}', '160')
                .replace('{height}', '90')})`,
            }}
          >
            <Darken
              target="_blank"
              href={`https://twitch.tv/${twitchInfo[0].user_login}`}
            >
              <CircleIcon /> {t('pages.dashboard.live')}
            </Darken>
          </LiveIndicator>
          <StreamTitle>{twitchInfo[0].title}</StreamTitle>
          <StreamInfo>
            {twitchInfo[0].game_name} -{' '}
            {t('pages.dashboard.x-viewers', {
              count: twitchInfo[0].viewer_count,
            })}
          </StreamInfo>
        </StreamBlock>
      ) : (
        <TextBlock>{t('pages.dashboard.not-live')}</TextBlock>
      )}
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
