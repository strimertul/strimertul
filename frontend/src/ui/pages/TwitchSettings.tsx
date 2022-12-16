import { CheckIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import { GetTwitchAuthURL, GetTwitchLoggedUser } from '@wailsapp/go/main/App';
import { helix } from '@wailsapp/go/models';
import { BrowserOpenURL } from '@wailsapp/runtime/runtime';
import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import eventsubTests from '~/data/eventsub-tests';
import { useModule, useStatus } from '~/lib/react-utils';
import { RootState, useAppDispatch } from '~/store';
import apiReducer, { modules } from '~/store/api/reducer';
import BrowserLink from '../components/BrowserLink';
import DefinitionTable from '../components/DefinitionTable';
import RevealLink from '../components/utils/RevealLink';
import SaveButton from '../components/forms/SaveButton';
import {
  Button,
  ButtonGroup,
  Checkbox,
  CheckboxIndicator,
  Field,
  FieldNote,
  FlexRow,
  InputBox,
  Label,
  PageContainer,
  PageHeader,
  PageTitle,
  PasswordInputBox,
  SectionHeader,
  styled,
  TabButton,
  TabContainer,
  TabContent,
  TabList,
  TextBlock,
} from '../theme';

const StepList = styled('ul', {
  lineHeight: '1.5',
  listStyleType: 'none',
  listStylePosition: 'outside',
});
const Step = styled('li', {
  marginBottom: '0.5rem',
  paddingLeft: '1rem',
  '&::marker': {
    color: '$teal11',
    content: '▧',
    display: 'inline-block',
    marginLeft: '-0.5rem',
  },
});

function TwitchBotSettings() {
  const [botConfig, setBotConfig, loadStatus] = useModule(
    modules.twitchBotConfig,
  );
  const [twitchConfig, setTwitchConfig] = useModule(modules.twitchConfig);
  const status = useStatus(loadStatus.save);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [revealBotToken, setRevealBotToken] = useState(false);
  const active = twitchConfig?.enable_bot ?? false;
  const disabled = !active || status?.type === 'pending';

  return (
    <form
      onSubmit={(ev) => {
        void dispatch(setTwitchConfig(twitchConfig));
        void dispatch(setBotConfig(botConfig));
        ev.preventDefault();
      }}
    >
      <TextBlock>{t('pages.twitch-settings.bot-settings-copy')}</TextBlock>
      <Field>
        <FlexRow spacing={1}>
          <Checkbox
            checked={active}
            onCheckedChange={(ev) =>
              dispatch(
                apiReducer.actions.twitchConfigChanged({
                  ...twitchConfig,
                  enable_bot: !!ev,
                }),
              )
            }
            id="enable-bot"
          >
            <CheckboxIndicator>{active && <CheckIcon />}</CheckboxIndicator>
          </Checkbox>

          <Label htmlFor="enable-bot">
            {t('pages.twitch-settings.enable-bot')}
          </Label>
        </FlexRow>
      </Field>
      <Field size="fullWidth">
        <Label htmlFor="bot-channel">
          {t('pages.twitch-settings.bot-channel')}
        </Label>
        <InputBox
          type="text"
          id="bot-channel"
          required={active}
          disabled={disabled}
          value={botConfig?.channel ?? ''}
          onChange={(ev) =>
            dispatch(
              apiReducer.actions.twitchBotConfigChanged({
                ...botConfig,
                channel: ev.target.value,
              }),
            )
          }
        />
      </Field>
      <SectionHeader>
        {t('pages.twitch-settings.bot-info-header')}
      </SectionHeader>
      <Field size="fullWidth">
        <Label htmlFor="bot-username">
          {t('pages.twitch-settings.bot-username')}
        </Label>
        <InputBox
          type="text"
          id="bot-username"
          required={active}
          disabled={disabled}
          value={botConfig?.username ?? ''}
          onChange={(ev) =>
            dispatch(
              apiReducer.actions.twitchBotConfigChanged({
                ...botConfig,
                username: ev.target.value,
              }),
            )
          }
        />
      </Field>
      <Field size="fullWidth">
        <Label htmlFor="bot-oauth">
          {t('pages.twitch-settings.bot-oauth')}
          <RevealLink value={revealBotToken} setter={setRevealBotToken} />
        </Label>
        <PasswordInputBox
          reveal={revealBotToken}
          id="bot-oauth"
          required={active}
          disabled={disabled}
          value={botConfig?.oauth ?? ''}
          onChange={(ev) =>
            dispatch(
              apiReducer.actions.twitchBotConfigChanged({
                ...botConfig,
                oauth: ev.target.value,
              }),
            )
          }
        />
        <FieldNote>
          <Trans i18nKey="pages.twitch-settings.bot-oauth-note">
            {' '}
            <BrowserLink href="https://twitchapps.com/tmi/">
              https://twitchapps.com/tmi/
            </BrowserLink>
          </Trans>
        </FieldNote>
      </Field>
      <SectionHeader>
        {t('pages.twitch-settings.bot-chat-header')}
      </SectionHeader>
      <Field size="fullWidth">
        <Label htmlFor="bot-chat-history">
          {t('pages.twitch-settings.bot-chat-history')}
        </Label>
        <InputBox
          type="number"
          id="bot-chat-history"
          required={active}
          disabled={disabled}
          value={botConfig?.chat_history ?? ''}
          onChange={(ev) =>
            dispatch(
              apiReducer.actions.twitchBotConfigChanged({
                ...botConfig,
                chat_history: ev.target.value,
              }),
            )
          }
        />
      </Field>
      <SaveButton status={status} />
    </form>
  );
}

function TwitchAPISettings() {
  const { t } = useTranslation();
  const [httpConfig] = useModule(modules.httpConfig);
  const [twitchConfig, setTwitchConfig, loadStatus] = useModule(
    modules.twitchConfig,
  );
  const status = useStatus(loadStatus.save);
  const dispatch = useAppDispatch();
  const [revealClientSecret, setRevealClientSecret] = useState(false);

  return (
    <form
      onSubmit={(ev) => {
        void dispatch(setTwitchConfig(twitchConfig));
        ev.preventDefault();
      }}
    >
      <SectionHeader spacing={'none'}>
        {t('pages.twitch-settings.api-subheader')}
      </SectionHeader>
      <TextBlock>{t('pages.twitch-settings.apiguide-1')}</TextBlock>
      <StepList>
        <Step>
          <Trans i18nKey="pages.twitch-settings.apiguide-2">
            {' '}
            <BrowserLink href="https://dev.twitch.tv/console/apps/create">
              https://dev.twitch.tv/console/apps/create
            </BrowserLink>
          </Trans>
        </Step>
        <Step>
          {t('pages.twitch-settings.apiguide-3')}

          <DefinitionTable
            entries={{
              'OAuth Redirect URLs': `http://${
                httpConfig?.bind.indexOf(':') > 0
                  ? httpConfig.bind
                  : `localhost${httpConfig?.bind ?? ':4337'}`
              }/twitch/callback`,
              Category: 'Broadcasting Suite',
            }}
          />
        </Step>
        <Step>
          <Trans i18nKey="pages.twitch-settings.apiguide-4">
            {'str1 '}
            <b>str2</b>
          </Trans>
        </Step>
      </StepList>
      <Field size="fullWidth" css={{ marginTop: '2rem' }}>
        <Label htmlFor="clientid">
          {t('pages.twitch-settings.app-client-id')}
        </Label>
        <InputBox
          type="text"
          id="clientid"
          placeholder={t('pages.twitch-settings.app-client-id')}
          required={true}
          value={twitchConfig?.api_client_id ?? ''}
          onChange={(ev) =>
            dispatch(
              apiReducer.actions.twitchConfigChanged({
                ...twitchConfig,
                api_client_id: ev.target.value,
              }),
            )
          }
        />
      </Field>

      <Field size="fullWidth">
        <Label htmlFor="clientsecret">
          {t('pages.twitch-settings.app-client-secret')}
          <RevealLink
            value={revealClientSecret}
            setter={setRevealClientSecret}
          />
        </Label>
        <PasswordInputBox
          reveal={revealClientSecret}
          id="clientsecret"
          placeholder={t('pages.twitch-settings.app-client-secret')}
          required={true}
          value={twitchConfig?.api_client_secret ?? ''}
          onChange={(ev) =>
            dispatch(
              apiReducer.actions.twitchConfigChanged({
                ...twitchConfig,
                api_client_secret: ev.target.value,
              }),
            )
          }
        />
      </Field>
      <SaveButton status={status} />
    </form>
  );
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

function TwitchEventSubSettings() {
  const { t } = useTranslation();
  const [userStatus, setUserStatus] = useState<helix.User | SyncError>(null);
  const kv = useSelector((state: RootState) => state.api.client);

  const getUserInfo = async () => {
    try {
      const res = await GetTwitchLoggedUser();
      setUserStatus(res);
    } catch (e) {
      console.error(e);
      setUserStatus({ ok: false, error: (e as Error).message });
    }
  };

  const startAuthFlow = async () => {
    const url = await GetTwitchAuthURL();
    BrowserOpenURL(url);
  };

  const sendFakeEvent = async (event: keyof typeof eventsubTests) => {
    const data = eventsubTests[event];
    await kv.putJSON('twitch/ev/eventsub-event', {
      ...data,
      subscription: {
        ...data.subscription,
        created_at: new Date().toISOString(),
      },
    });
  };

  useEffect(() => {
    // Get user info
    void getUserInfo();
  }, []);

  let userBlock = <i>{t('pages.twitch-settings.events.loading-data')}</i>;
  if (userStatus !== null) {
    if ('id' in userStatus) {
      userBlock = (
        <>
          <TwitchUser>
            <p>{t('pages.twitch-settings.events.authenticated-as')}</p>
            <TwitchPic
              src={userStatus.profile_image_url}
              alt={t('pages.twitch-settings.events.profile-picture')}
            />
            <TwitchName>{userStatus.display_name}</TwitchName>
          </TwitchUser>
        </>
      );
    } else {
      userBlock = <span>{t('pages.twitch-settings.events.err-no-user')}</span>;
    }
  }
  return (
    <>
      <p>{t('pages.twitch-settings.events.auth-message')}</p>
      <Button
        variation="primary"
        onClick={() => {
          void startAuthFlow();
        }}
      >
        <ExternalLinkIcon /> {t('pages.twitch-settings.events.auth-button')}
      </Button>
      <SectionHeader>
        {t('pages.twitch-settings.events.current-status')}
      </SectionHeader>
      {userBlock}
      <SectionHeader>
        {t('pages.twitch-settings.events.sim-events')}
      </SectionHeader>
      <ButtonGroup>
        {Object.keys(eventsubTests).map((ev: keyof typeof eventsubTests) => (
          <Button
            key={ev}
            onClick={() => {
              void sendFakeEvent(ev);
            }}
          >
            {t(`pages.twitch-settings.events.sim.${ev}`, { defaultValue: ev })}
          </Button>
        ))}
      </ButtonGroup>
    </>
  );
}

export default function TwitchSettingsPage(): React.ReactElement {
  const { t } = useTranslation();
  const [twitchConfig, setTwitchConfig] = useModule(modules.twitchConfig);
  const dispatch = useAppDispatch();

  const active = twitchConfig?.enabled ?? false;

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>{t('pages.twitch-settings.title')}</PageTitle>
        <TextBlock>{t('pages.twitch-settings.subtitle')}</TextBlock>
        <Field css={{ paddingTop: '1rem' }}>
          <FlexRow spacing={1}>
            <Checkbox
              checked={active}
              onCheckedChange={(ev) => {
                void dispatch(
                  setTwitchConfig({
                    ...twitchConfig,
                    enabled: !!ev,
                  }),
                );
              }}
              id="enable"
            >
              <CheckboxIndicator>{active && <CheckIcon />}</CheckboxIndicator>
            </Checkbox>

            <Label htmlFor="enable">{t('pages.twitch-settings.enable')}</Label>
          </FlexRow>
        </Field>
      </PageHeader>
      <div style={{ display: active ? '' : 'none' }}>
        <TabContainer defaultValue="api-config">
          <TabList>
            <TabButton value="api-config">
              {t('pages.twitch-settings.api-configuration')}
            </TabButton>
            <TabButton value="eventsub">
              {t('pages.twitch-settings.eventsub')}
            </TabButton>
            <TabButton value="bot-settings">
              {t('pages.twitch-settings.bot-settings')}
            </TabButton>
          </TabList>
          <TabContent value="api-config">
            <TwitchAPISettings />
          </TabContent>
          <TabContent value="eventsub">
            <TwitchEventSubSettings />
          </TabContent>
          <TabContent value="bot-settings">
            <TwitchBotSettings />
          </TabContent>
        </TabContainer>
      </div>
    </PageContainer>
  );
}
