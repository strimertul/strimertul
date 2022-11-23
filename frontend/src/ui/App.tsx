import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  ChatBubbleIcon,
  DashboardIcon,
  FrameIcon,
  GearIcon,
  MixerHorizontalIcon,
  StarIcon,
  TableIcon,
  TimerIcon,
} from '@radix-ui/react-icons';
import { Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { GetKilovoltBind } from '@wailsapp/go/main/App';

import { delay } from 'src/lib/time-utils';
import Dashboard from './pages/Dashboard';
import Sidebar, { RouteSection } from './components/Sidebar';
import ServerSettingsPage from './pages/ServerSettings';
import { RootState, useAppDispatch } from '../store';
import { createWSClient, useAuthBypass } from '../store/api/reducer';
import { ConnectionStatus } from '../store/api/types';
import { styled } from './theme';

// @ts-expect-error Asset import
import spinner from '../assets/icon-loading.svg';
import TwitchSettingsPage from './pages/TwitchSettings';
import TwitchBotCommandsPage from './pages/BotCommands';
import TwitchBotTimersPage from './pages/BotTimers';
import AuthDialog from './pages/AuthDialog';
import ChatAlertsPage from './pages/ChatAlerts';
import LoyaltyConfigPage from './pages/LoyaltyConfig';
import LoyaltyQueuePage from './pages/LoyaltyQueue';
import StrimertulPage from './pages/Strimertul';
import DebugPage from './pages/Debug';
import LoyaltyRewardsPage from './pages/LoyaltyRewards';

const LoadingDiv = styled('div', {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
});

const Spinner = styled('img', {
  maxWidth: '100px',
});

function Loading() {
  return (
    <LoadingDiv>
      <Spinner src={spinner as string} alt="Loading..." />
    </LoadingDiv>
  );
}
const sections: RouteSection[] = [
  {
    title: 'menu.sections.monitor',
    links: [
      {
        title: 'menu.pages.monitor.dashboard',
        url: '/',
        icon: <DashboardIcon />,
      },
    ],
  },
  {
    title: 'menu.sections.strimertul',
    links: [
      {
        title: 'menu.pages.strimertul.settings',
        url: '/http',
        icon: <GearIcon />,
      },
    ],
  },
  {
    title: 'menu.sections.twitch',
    links: [
      {
        title: 'menu.pages.twitch.configuration',
        url: '/twitch/settings',
        icon: <MixerHorizontalIcon />,
      },
      {
        title: 'menu.pages.twitch.bot-commands',
        url: '/twitch/bot/commands',
        icon: <ChatBubbleIcon />,
      },
      {
        title: 'menu.pages.twitch.bot-timers',
        url: '/twitch/bot/timers',
        icon: <TimerIcon />,
      },
      {
        title: 'menu.pages.twitch.bot-alerts',
        url: '/twitch/bot/alerts',
        icon: <FrameIcon />,
      },
    ],
  },
  {
    title: 'menu.sections.loyalty',
    links: [
      {
        title: 'menu.pages.loyalty.configuration',
        url: '/loyalty/settings',
        icon: <MixerHorizontalIcon />,
      },
      {
        title: 'menu.pages.loyalty.points',
        url: '/loyalty/users',
        icon: <TableIcon />,
      },
      {
        title: 'menu.pages.loyalty.rewards',
        url: '/loyalty/rewards',
        icon: <StarIcon />,
      },
    ],
  },
];

const Container = styled('div', {
  position: 'relative',
  display: 'flex',
  flexDirection: 'row',
  overflow: 'hidden',
  height: '100vh',
});

const PageContent = styled('main', {
  flex: 1,
  overflow: 'auto',
});

const PageWrapper = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  flex: 1,
  overflow: 'hidden',
});

export default function App(): JSX.Element {
  const client = useSelector((state: RootState) => state.api.client);
  const connected = useSelector(
    (state: RootState) => state.api.connectionStatus,
  );
  const dispatch = useAppDispatch();

  const connectToKV = async () => {
    let address = '';
    while (address === '') {
      // eslint-disable-next-line no-await-in-loop
      address = await GetKilovoltBind();
      if (address === '') {
        // Server not ready yet, wait a second
        // eslint-disable-next-line no-await-in-loop
        await delay(1000);
      }
    }
    await dispatch(
      createWSClient({
        address: `ws://${address}/ws`,
      }),
    );
  };

  useEffect(() => {
    if (!client) {
      void connectToKV();
    }
    if (connected === ConnectionStatus.AuthenticationNeeded) {
      void dispatch(useAuthBypass());
    }
  });

  if (connected === ConnectionStatus.NotConnected) {
    return <Loading />;
  }

  if (connected === ConnectionStatus.AuthenticationNeeded) {
    return <AuthDialog />;
  }

  return (
    <Container>
      <Sidebar sections={sections} />
      <PageContent>
        <PageWrapper role="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/about" element={<StrimertulPage />} />
            <Route path="/debug" element={<DebugPage />} />
            <Route path="/http" element={<ServerSettingsPage />} />
            <Route path="/twitch/settings" element={<TwitchSettingsPage />} />
            <Route
              path="/twitch/bot/commands"
              element={<TwitchBotCommandsPage />}
            />
            <Route
              path="/twitch/bot/timers"
              element={<TwitchBotTimersPage />}
            />
            <Route path="/twitch/bot/alerts" element={<ChatAlertsPage />} />
            <Route path="/loyalty/settings" element={<LoyaltyConfigPage />} />
            <Route path="/loyalty/users" element={<LoyaltyQueuePage />} />
            <Route path="/loyalty/rewards" element={<LoyaltyRewardsPage />} />
          </Routes>
        </PageWrapper>
      </PageContent>
      <ToastContainer position="bottom-center" autoClose={5000} theme="dark" />
    </Container>
  );
}
