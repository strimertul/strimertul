import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import { useModule, useStatus } from '../../lib/react-utils';
import Stulbe from '../../lib/stulbe-lib';
import apiReducer, { modules } from '../../store/api/reducer';
import SaveButton from '../components/utils/SaveButton';
import {
  Button,
  ButtonGroup,
  Field,
  InputBox,
  Label,
  PageContainer,
  PageHeader,
  PageTitle,
  SectionHeader,
  styled,
  TabButton,
  TabContainer,
  TabContent,
  TabList,
  TextBlock,
} from '../theme';
import eventsubTests from '../../data/eventsub-tests';
import { RootState, useAppDispatch } from '../../store';
import BrowserLink from '../components/BrowserLink';

interface UserData {
  id: string;
  login: string;
  // eslint-disable-next-line camelcase
  display_name: string;
  // eslint-disable-next-line camelcase
  profile_image_url: string;
}

interface SyncError {
  ok: false;
  error: string;
}

const TwitchUser = styled('div', {
  display: 'flex',
  gap: '0.8rem',
  alignItems: 'center',
  fontSize: '14pt',
  fontWeight: '300',
});
const TwitchPic = styled('img', {
  width: '48px',
  borderRadius: '50%',
});
const TwitchName = styled('p', { fontWeight: 'bold' });

interface authChallengeRequest {
  // eslint-disable-next-line camelcase
  auth_url: string;
}

function WebhookIntegration() {
  const { t } = useTranslation();
  const [stulbeConfig] = useModule(modules.stulbeConfig);
  const kv = useSelector((state: RootState) => state.api.client);
  const [userStatus, setUserStatus] = useState<UserData | SyncError>(null);
  const [client, setClient] = useState<Stulbe>(null);

  const getUserInfo = async () => {
    try {
      const res = await client.makeRequest<UserData, null>(
        'GET',
        'api/twitch/user',
      );
      setUserStatus(res);
    } catch (e) {
      setUserStatus({ ok: false, error: (e as Error).message });
    }
  };

  const startAuthFlow = async () => {
    const res = await client.makeRequest<authChallengeRequest, null>(
      'POST',
      'api/twitch/authorize',
    );
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
        void getUserInfo();
      }
    }, 1000);
  };

  const sendFakeEvent = async (event: keyof typeof eventsubTests) => {
    const data = eventsubTests[event];
    await kv.putJSON('stulbe/ev/webhook', {
      ...data,
      subscription: {
        ...data.subscription,
        created_at: new Date().toISOString(),
      },
    });
  };

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (client) {
      // Get user info
      void getUserInfo();
    } else if (
      stulbeConfig &&
      stulbeConfig.enabled &&
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
      void tryAuth();
    }
  }, [stulbeConfig, client]);

  if (!stulbeConfig || !stulbeConfig.enabled) {
    return <h1>{t('pages.stulbe.err-not-enabled')}</h1>;
  }

  let userBlock = <i>{t('pages.stulbe.loading-data')}</i>;
  if (userStatus !== null) {
    if ('id' in userStatus) {
      userBlock = (
        <>
          <TwitchUser>
            <p>{t('pages.stulbe.authenticated-as')}</p>
            <TwitchPic
              src={userStatus.profile_image_url}
              alt={t('pages.stulbe.profile-picture')}
            />
            <TwitchName>{userStatus.display_name}</TwitchName>
          </TwitchUser>
        </>
      );
    } else {
      userBlock = <span>{t('pages.stulbe.err-no-user')}</span>;
    }
  }
  return (
    <>
      <p>{t('pages.stulbe.auth-message')}</p>
      <Button
        variation="primary"
        onClick={() => {
          void startAuthFlow();
        }}
        disabled={!client}
      >
        <ExternalLinkIcon /> {t('pages.stulbe.auth-button')}
      </Button>
      <SectionHeader>{t('pages.stulbe.current-status')}</SectionHeader>
      {userBlock}
      <SectionHeader>{t('pages.stulbe.sim-events')}</SectionHeader>
      <ButtonGroup>
        {Object.keys(eventsubTests).map((ev: keyof typeof eventsubTests) => (
          <Button
            key={ev}
            onClick={() => {
              void sendFakeEvent(ev);
            }}
          >
            {t(`pages.stulbe.sim.${ev}`, { defaultValue: ev })}
          </Button>
        ))}
      </ButtonGroup>
    </>
  );
}

function BackendConfiguration() {
  const [stulbeConfig, setStulbeConfig, loadStatus] = useModule(
    modules.stulbeConfig,
  );
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const status = useStatus(loadStatus.save);
  const active = stulbeConfig?.enabled ?? false;
  const busy =
    loadStatus.load?.type !== 'success' || loadStatus.save?.type === 'pending';

  const test = async () => {
    try {
      const client = new Stulbe(stulbeConfig.endpoint);
      await client.auth(stulbeConfig.username, stulbeConfig.auth_key);
      toast.success(t('pages.stulbe.test-success'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <form
      onSubmit={(ev) => {
        void dispatch(setStulbeConfig(stulbeConfig));
        ev.preventDefault();
      }}
    >
      <Field size="fullWidth">
        <Label htmlFor="endpoint">{t('pages.stulbe.endpoint')}</Label>
        <InputBox
          type="text"
          id="endpoint"
          placeholder={t('pages.stulbe.bind-placeholder')}
          value={stulbeConfig?.endpoint ?? ''}
          disabled={busy}
          onChange={(e) => {
            void dispatch(
              apiReducer.actions.stulbeConfigChanged({
                ...stulbeConfig,
                enabled: e.target.value.length > 0,
                endpoint: e.target.value,
              }),
            );
          }}
        />
      </Field>
      <Field size="fullWidth">
        <Label htmlFor="username">{t('pages.stulbe.username')}</Label>
        <InputBox
          type="text"
          id="username"
          value={stulbeConfig?.username ?? ''}
          required={true}
          disabled={!active || busy}
          onChange={(e) => {
            void dispatch(
              apiReducer.actions.stulbeConfigChanged({
                ...stulbeConfig,
                username: e.target.value,
              }),
            );
          }}
        />
      </Field>
      <Field size="fullWidth">
        <Label htmlFor="password">{t('pages.stulbe.auth-key')}</Label>
        <InputBox
          type="password"
          id="password"
          value={stulbeConfig?.auth_key ?? ''}
          disabled={!active || busy}
          required={true}
          onChange={(e) => {
            void dispatch(
              apiReducer.actions.stulbeConfigChanged({
                ...stulbeConfig,
                auth_key: e.target.value,
              }),
            );
          }}
        />
      </Field>
      <ButtonGroup>
        <SaveButton status={status} />
        <Button
          type="button"
          disabled={!active || busy}
          onClick={() => {
            void test();
          }}
        >
          {t('pages.stulbe.test-button')}
        </Button>
      </ButtonGroup>
    </form>
  );
}

export default function BackendIntegrationPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>{t('pages.stulbe.title')}</PageTitle>
        <TextBlock>
          <Trans i18nKey="pages.stulbe.subtitle">
            {' '}
            <BrowserLink href="https://github.com/strimertul/stulbe/">
              stulbe
            </BrowserLink>
          </Trans>
        </TextBlock>
      </PageHeader>

      <TabContainer defaultValue="configuration">
        <TabList>
          <TabButton value="configuration">
            {t('pages.stulbe.configuration')}
          </TabButton>
          <TabButton value="webhook">
            {t('pages.stulbe.twitch-events')}
          </TabButton>
        </TabList>
        <TabContent value="configuration">
          <BackendConfiguration />
        </TabContent>
        <TabContent value="webhook">
          <WebhookIntegration />
        </TabContent>
      </TabContainer>
    </PageContainer>
  );
}
