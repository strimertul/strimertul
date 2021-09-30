/* eslint-disable camelcase */
import { RouteComponentProps } from '@reach/router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import eventsubTests from '../../../data/eventsub-tests';
import { useModule } from '../../../lib/react-utils';
import Stulbe from '../../../lib/stulbe-lib';
import { modules } from '../../../store/api/reducer';
import { RootState } from '../../../store';

interface UserData {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

interface SyncError {
  ok: false;
  error: string;
}

const eventSubTestFn = {
  'channel.update': (send) => {
    send(eventsubTests['channel.update']);
  },
  'channel.follow': (send) => {
    send(eventsubTests['channel.follow']);
  },
  'channel.subscribe': (send) => {
    send(eventsubTests['channel.subscribe']);
  },
  'channel.subscription.gift': (send) => {
    send(eventsubTests['channel.subscription.gift']);
    setTimeout(() => {
      send(eventsubTests['channel.subscribe']);
    }, 2000);
  },
  'channel.subscription.message': (send) => {
    send(eventsubTests['channel.subscribe']);
    setTimeout(() => {
      send(eventsubTests['channel.subscription.message']);
    }, 2000);
  },
  'channel.cheer': (send) => {
    send(eventsubTests['channel.cheer']);
  },
  'channel.raid': (send) => {
    send(eventsubTests['channel.raid']);
  },
};

export default function StulbeWebhooksPage(
  props: RouteComponentProps<unknown>,
): React.ReactElement {
  const { t } = useTranslation();
  const kv = useSelector((state: RootState) => state.api.client);
  const [moduleConfig] = useModule(modules.moduleConfig);
  const [stulbeConfig] = useModule(modules.stulbeConfig);
  const [userStatus, setUserStatus] = useState<UserData | SyncError>(null);
  const [client, setClient] = useState<Stulbe>(null);

  const getUserInfo = async () => {
    try {
      const res = (await client.makeRequest(
        'GET',
        'api/twitch/user',
      )) as UserData;
      setUserStatus(res);
    } catch (e) {
      setUserStatus({ ok: false, error: e.message });
    }
  };
  const startAuthFlow = async () => {
    const res = (await client.makeRequest('POST', 'api/twitch/authorize')) as {
      auth_url: string;
    };
    const win = window.open(
      res.auth_url,
      '_blank',
      'height=800,width=520,scrollbars=yes,status=yes',
    );
    // Hack, have to poll because no events are reliable for this
    const iv = setInterval(() => {
      if (win.closed) {
        clearInterval(iv);
        setUserStatus(null);
        getUserInfo();
      }
    }, 1000);
  };

  const sendFakeEvent = async (event: keyof typeof eventSubTestFn) => {
    eventSubTestFn[event]((data) => {
      kv.putJSON('stulbe/ev/webhook', {
        ...data,
        subscription: {
          ...data.subscription,
          created_at: new Date().toISOString(),
        },
      });
    });
  };

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (client) {
      // Get user info
      getUserInfo();
    } else if (
      moduleConfig &&
      moduleConfig.stulbe &&
      stulbeConfig &&
      stulbeConfig.endpoint &&
      stulbeConfig.auth_key &&
      stulbeConfig.username
    ) {
      const tryAuth = async () => {
        // Try authenticating
        const stulbeClient = new Stulbe(stulbeConfig.endpoint);
        await stulbeClient.auth(stulbeConfig.username, stulbeConfig.auth_key);
        setClient(stulbeClient);
      };
      tryAuth();
    }
  }, [moduleConfig, stulbeConfig, client]);

  if (!moduleConfig || !moduleConfig.stulbe) {
    return (
      <>
        <h1 className="title is-4">{t('backend.webhook.err-not-enabled')}</h1>
      </>
    );
  }

  let userBlock = <i>{t('backend.webhook.loading')}</i>;
  if (userStatus !== null) {
    if ('id' in userStatus) {
      userBlock = (
        <>
          <div
            className="is-flex"
            style={{ alignItems: 'center', gap: '0.25rem' }}
          >
            <p>{t('backend.config.authenticated')}</p>
            <img
              style={{ width: '20px', borderRadius: '5px' }}
              src={userStatus.profile_image_url}
            />
            <b>{userStatus.display_name}</b>
          </div>
        </>
      );
    } else {
      userBlock = t('backend.webhook.err-no-user');
    }
  }

  return (
    <>
      <h1 className="title is-4">{t('backend.webhook.header')}</h1>
      <div className="box">
        <div className="title is-5" style={{ marginBottom: '0.75rem' }}>
          {t('backend.webhook.current-status')}
        </div>
        <p>{userBlock}</p>
      </div>
      <div className="field">
        <p>{t('backend.webhook.auth-message')}</p>
      </div>
      <button className="button" onClick={startAuthFlow} disabled={!client}>
        {t('backend.webhook.auth-button')}
      </button>
      <h2 className="title is-4" style={{ marginTop: '2rem' }}>
        {t('backend.webhook.fake-header')}
      </h2>
      {Object.keys(eventSubTestFn).map((ev: keyof typeof eventsubTests) => (
        <button
          className="button"
          onClick={() => sendFakeEvent(ev)}
          style={{ margin: '0.2rem' }}
        >
          {t(`backend.webhook.sim-${ev}`, { defaultValue: ev })}
        </button>
      ))}
    </>
  );
}
