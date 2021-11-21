import { Link, Redirect, Router, useLocation } from '@reach/router';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { RootState } from '../store';
import { createWSClient } from '../store/api/reducer';
import Home from './pages/Home';
import HTTPPage from './pages/HTTP';
import TwitchPage from './pages/twitch/Main';
import StulbePage from './pages/stulbe/Main';
import LoyaltyPage from './pages/loyalty/Main';
import DebugPage from './pages/Debug';
import LoyaltySettingPage from './pages/loyalty/Settings';
import LoyaltyRewardsPage from './pages/loyalty/Rewards';
import LoyaltyUserListPage from './pages/loyalty/UserList';
import LoyaltyGoalsPage from './pages/loyalty/Goals';
import LoyaltyRedeemQueuePage from './pages/loyalty/Queue';
import TwitchSettingsPage from './pages/twitch/APISettings';
import TwitchBotSettingsPage from './pages/twitch/BotSettings';
import TwitchBotCommandsPage from './pages/twitch/Commands';
import TwitchBotModulesPage from './pages/twitch/Modules';
import StulbeConfigPage from './pages/stulbe/Config';
import StulbeWebhooksPage from './pages/stulbe/Webhook';
import TwitchBotTimersPage from './pages/twitch/Timers';
import { ConnectionStatus } from '../store/api/types';
import Field from './components/Field';

interface RouteItem {
  name?: string;
  route: string;
  subroutes?: RouteItem[];
}

const menu: RouteItem[] = [
  { route: '/' },
  { route: '/http' },
  {
    route: '/twitch',
    subroutes: [
      { route: '/twitch/settings' },
      { route: '/twitch/bot/settings' },
      { route: '/twitch/bot/commands' },
      { route: '/twitch/bot/timers' },
      { route: '/twitch/bot/modules' },
    ],
  },
  {
    route: '/loyalty',
    subroutes: [
      { route: '/loyalty/settings' },
      { route: '/loyalty/users' },
      { route: '/loyalty/queue' },
      { route: '/loyalty/rewards' },
      { route: '/loyalty/goals' },
    ],
  },
  {
    route: '/stulbe',
    subroutes: [{ route: '/stulbe/config' }, { route: '/stulbe/webhooks' }],
  },
];

function AuthModal(): React.ReactElement {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>();

  useEffect(() => {
    if (inputRef?.current) {
      inputRef.current.focus();
    }
  });

  const submit = () => {
    localStorage.setItem('password', password);
    window.location.reload();
  };

  return (
    <div className="modal is-active">
      <div className="modal-background"></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">{t('auth.header')}</p>
        </header>
        <section className="modal-card-body">
          <Field>{t('auth.message')}</Field>
          <Field>
            <input
              className="input"
              type="password"
              placeholder={t('auth.placeholder')}
              value={password ?? ''}
              ref={inputRef}
              onChange={(ev) => setPassword(ev.target.value)}
              onKeyUp={(ev) => {
                if (ev.key === 'Enter' || ev.code === 'Enter') {
                  submit();
                }
              }}
            />
          </Field>
        </section>
        <footer className="modal-card-foot">
          <button className="button is-success" onClick={() => submit()}>
            {t('auth.button')}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function App(): React.ReactElement {
  const loc = useLocation();
  const { t } = useTranslation();

  const client = useSelector((state: RootState) => state.api.client);
  const connected = useSelector(
    (state: RootState) => state.api.connectionStatus,
  );
  const dispatch = useDispatch();

  // Create WS client
  useEffect(() => {
    if (!client) {
      dispatch(
        createWSClient({
          address:
            process.env.NODE_ENV === 'development'
              ? 'ws://localhost:4337/ws'
              : `ws://${loc.host}/ws`,
          password: localStorage.password,
        }),
      );
    }
  }, []);

  if (connected === ConnectionStatus.AuthenticationNeeded) {
    return <AuthModal />;
  }

  if (!client) {
    return <div className="container">{t('system.loading')}</div>;
  }

  const basepath = '/ui/';

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
        {name ?? t(`pages.${route}`)}
      </Link>
      {subroutes ? (
        <ul className="subroute">{subroutes.map(routeItem)}</ul>
      ) : null}
    </li>
  );

  return (
    <section className="main-content columns is-fullheight">
      <section className="notifications">
        {connected !== ConnectionStatus.Connected ? (
          <div className="notification is-danger">
            {t('system.connection-lost')}
          </div>
        ) : null}
      </section>
      <aside className="menu sidebar column is-3 is-fullheight section">
        <p className="menu-label is-hidden-touch">{t('system.menu-header')}</p>
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
              <TwitchBotCommandsPage path="bot/commands" />
              <TwitchBotTimersPage path="bot/timers" />
              <TwitchBotModulesPage path="bot/modules" />
            </TwitchPage>
            <LoyaltyPage path="loyalty">
              <Redirect from="/" to="settings" noThrow />
              <LoyaltySettingPage path="settings" />
              <LoyaltyUserListPage path="users" />
              <LoyaltyRedeemQueuePage path="queue" />
              <LoyaltyRewardsPage path="rewards" />
              <LoyaltyGoalsPage path="goals" />
            </LoyaltyPage>
            <StulbePage path="stulbe">
              <Redirect from="/" to="config" noThrow />
              <StulbeConfigPage path="config" />
              <StulbeWebhooksPage path="webhooks" />
            </StulbePage>
            <DebugPage path="debug" />
          </Router>
        </div>
      </div>
    </section>
  );
}
