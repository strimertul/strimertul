import { Link, Redirect, Router, useLocation } from '@reach/router';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { createWSClient } from '../store/api/reducer';
import Home from './pages/Home';
import HTTPPage from './pages/HTTP';
import TwitchPage from './pages/twitch/Main';
import StulbePage from './pages/Stulbe';
import LoyaltyPage from './pages/loyalty/Main';
import DebugPage from './pages/Debug';
import LoyaltySettingPage from './pages/loyalty/Settings';
import LoyaltyRewardsPage from './pages/loyalty/Rewards';
import LoyaltyUserListPage from './pages/loyalty/UserList';
import LoyaltyGoalsPage from './pages/loyalty/Goals';
import LoyaltyRedeemQueuePage from './pages/loyalty/Queue';
import TwitchSettingsPage from './pages/twitch/APISettings';
import TwitchBotSettingsPage from './pages/twitch/BotSettings';

interface RouteItem {
  name: string;
  route: string;
  subroutes?: RouteItem[];
}

const menu: RouteItem[] = [
  {
    name: 'Home',
    route: '/',
  },
  {
    name: 'Web server',
    route: '/http',
  },
  {
    name: 'Twitch integration',
    route: '/twitch/',
    subroutes: [
      {
        name: 'Module Configuration',
        route: '/twitch/settings',
      },
      {
        name: 'Bot Configuration',
        route: '/twitch/bot/settings',
      },
    ],
  },
  {
    name: 'Loyalty points',
    route: '/loyalty/',
    subroutes: [
      {
        name: 'Configuration',
        route: '/loyalty/settings',
      },
      {
        name: 'Viewer points',
        route: '/loyalty/users',
      },
      {
        name: 'Redempions',
        route: '/loyalty/queue',
      },
      {
        name: 'Rewards',
        route: '/loyalty/rewards',
      },
      {
        name: 'Goals',
        route: '/loyalty/goals',
      },
    ],
  },
  {
    name: 'Back-end integration',
    route: '/stulbe',
  },
];

export default function App(): React.ReactElement {
  const loc = useLocation();

  const client = useSelector((state: RootState) => state.api.client);
  const connected = useSelector((state: RootState) => state.api.connected);
  const dispatch = useDispatch();

  // Create WS client
  useEffect(() => {
    if (!client) {
      dispatch(
        createWSClient(
          process.env.NODE_ENV === 'development'
            ? 'ws://localhost:4337/ws'
            : `ws://${loc.host}/ws`,
        ),
      );
    }
  }, []);

  if (!client) {
    return <div className="container">Loading...</div>;
  }

  const basepath = process.env.NODE_ENV === 'development' ? '/' : '/ui/';

  const routeItem = ({ route, name, subroutes }: RouteItem) => (
    <li key={route}>
      <Link
        getProps={({ isPartiallyCurrent, isCurrent }) => {
          const active = isCurrent || (subroutes && isPartiallyCurrent);
          return {
            className: active ? 'is-active' : '',
          };
        }}
        to={`${basepath}${route}`.replace(/\/\//gi, '/')}
      >
        {name}
      </Link>
      {subroutes ? (
        <ul className="subroute">{subroutes.map(routeItem)}</ul>
      ) : null}
    </li>
  );

  return (
    <section className="main-content columns is-fullheight">
      <section className="notifications">
        {!connected ? (
          <div className="notification is-danger">
            Connection to server was lost, retrying...
          </div>
        ) : null}
      </section>
      <aside className="menu sidebar column is-3 is-fullheight section">
        <p className="menu-label is-hidden-touch">Navigation</p>
        <ul className="menu-list">{menu.map(routeItem)}</ul>
      </aside>

      <div className="app-content column is-9">
        <div className="content-pad">
          <Router basepath={basepath}>
            <Home path="/" />
            <HTTPPage path="http" />
            <TwitchPage path="twitch">
              <Redirect from="/" to="settings" noThrow />
              <TwitchSettingsPage path="settings" />
              <TwitchBotSettingsPage path="bot/settings" />
            </TwitchPage>
            <LoyaltyPage path="loyalty">
              <Redirect from="/" to="settings" noThrow />
              <LoyaltySettingPage path="settings" />
              <LoyaltyUserListPage path="users" />
              <LoyaltyRedeemQueuePage path="queue" />
              <LoyaltyRewardsPage path="rewards" />
              <LoyaltyGoalsPage path="goals" />
            </LoyaltyPage>
            <StulbePage path="stulbe" />
            <DebugPage path="debug" />
          </Router>
        </div>
      </div>
    </section>
  );
}
