import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ChatBubbleIcon,
  DashboardIcon,
  FrameIcon,
  GearIcon,
  Link2Icon,
  MixerHorizontalIcon,
  StarIcon,
  TableIcon,
  TimerIcon,
} from '@radix-ui/react-icons';
import { Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import Dashboard from './pages/Dashboard';
import Sidebar, { RouteSection } from './components/Sidebar';
import ServerSettingsPage from './pages/ServerSettings';
import { RootState } from '../store';
import { createWSClient } from '../store/api/reducer';
import { ConnectionStatus } from '../store/api/types';
import { styled } from './theme';

// @ts-expect-error Asset import
import spinner from '../assets/icon-loading.svg';
import BackendIntegrationPage from './pages/BackendIntegration';

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
      <Spinner src={spinner} alt="Loading..." />
    </LoadingDiv>
  );
}

function AuthDialog() {
  const AuthWrapper = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  });

  return <AuthWrapper></AuthWrapper>;
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
      {
        title: 'menu.pages.strimertul.stulbe',
        url: '/backend',
        icon: <Link2Icon />,
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
  display: 'flex',
  flexDirection: 'row',
  minHeight: '100vh',
});

const PageContent = styled('main', {
  display: 'flex',
  flexDirection: 'row',
  flex: 1,
  overflow: 'auto',
});

export default function App(): JSX.Element {
  const client = useSelector((state: RootState) => state.api.client);
  const connected = useSelector(
    (state: RootState) => state.api.connectionStatus,
  );
  const dispatch = useDispatch();

  useEffect(() => {
    if (!client) {
      dispatch(
        createWSClient({
          address:
            process.env.NODE_ENV === 'development'
              ? 'ws://localhost:4337/ws'
              : `ws://${window.location.host}/ws`,
          password: localStorage.password,
        }),
      );
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
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/http" element={<ServerSettingsPage />} />
          <Route path="/backend" element={<BackendIntegrationPage />} />
        </Routes>
      </PageContent>
      <ToastContainer position="bottom-center" autoClose={5000} theme="dark" />
    </Container>
  );
}
