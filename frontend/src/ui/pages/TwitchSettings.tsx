import { CheckIcon } from '@radix-ui/react-icons';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useModule, useStatus } from '../../lib/react-utils';
import apiReducer, { modules } from '../../store/api/reducer';
import DefinitionTable from '../components/DefinitionTable';
import SaveButton from '../components/utils/SaveButton';
import {
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
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const active = twitchConfig?.enable_bot ?? false;

  return (
    <form
      onSubmit={(ev) => {
        dispatch(setTwitchConfig(twitchConfig));
        dispatch(setBotConfig(botConfig));
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
          disabled={!active || status?.type === 'pending'}
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
          disabled={!active || status?.type === 'pending'}
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
        </Label>
        <InputBox
          type="password"
          id="bot-oauth"
          required={active}
          disabled={!active || status?.type === 'pending'}
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
            <a href="https://twitchapps.com/tmi/">
              https://twitchapps.com/tmi/
            </a>
          </Trans>
        </FieldNote>
      </Field>
      <SectionHeader>
        {t('pages.twitch-settings.bot-chat-header')}
      </SectionHeader>
      <TextBlock>{t('pages.twitch-settings.bot-chat-history-desc')}</TextBlock>
      <Field>
        <FlexRow spacing={1}>
          <Checkbox
            disabled={!active || status?.type === 'pending'}
            checked={botConfig?.chat_keys ?? false}
            onCheckedChange={(ev) =>
              dispatch(
                apiReducer.actions.twitchBotConfigChanged({
                  ...botConfig,
                  chat_keys: !!ev,
                }),
              )
            }
            id="bot-chat-keys"
          >
            <CheckboxIndicator>{active && <CheckIcon />}</CheckboxIndicator>
          </Checkbox>

          <Label htmlFor="bot-chat-keys">
            {t('pages.twitch-settings.bot-chat-keys')}
          </Label>
        </FlexRow>
      </Field>
      <Field size="vertical">
        <Label htmlFor="bot-chat-history">
          {t('pages.twitch-settings.bot-chat-history')}
        </Label>
        <FlexRow
          css={{
            justifyContent: 'flex-start',
            gap: '0.8rem',
            backgroundColor: '$gray6',
            borderRadius: '5px',
            paddingRight: '0.8rem',
          }}
        >
          <InputBox
            type="number"
            id="bot-chat-history"
            required={active}
            disabled={!active || status?.type === 'pending'}
            value={botConfig?.chat_history ?? ''}
            css={{
              appearance: 'textfield',
              width: '4rem',
              textAlign: 'center',
            }}
            onChange={(ev) =>
              dispatch(
                apiReducer.actions.twitchBotConfigChanged({
                  ...botConfig,
                  chat_history: ev.target.value,
                }),
              )
            }
          />
          {t('pages.twitch-settings.bot-chat-history-suffix')}
        </FlexRow>
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
  const dispatch = useDispatch();

  return (
    <form
      onSubmit={(ev) => {
        dispatch(setTwitchConfig(twitchConfig));
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
            <a href="https://dev.twitch.tv/console/apps/create">
              https://dev.twitch.tv/console/apps/create
            </a>
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
              }/oauth`,
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
        </Label>
        <InputBox
          type="password"
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

export default function TwitchSettingsPage(): React.ReactElement {
  const { t } = useTranslation();
  const [twitchConfig, setTwitchConfig] = useModule(modules.twitchConfig);
  const dispatch = useDispatch();

  const active = twitchConfig?.enabled ?? false;

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>{t('pages.twitch-settings.title')}</PageTitle>
        <TextBlock>{t('pages.twitch-settings.subtitle')}</TextBlock>
        <Field>
          <FlexRow spacing={1}>
            <Checkbox
              checked={active}
              onCheckedChange={(ev) =>
                dispatch(
                  setTwitchConfig({
                    ...twitchConfig,
                    enabled: !!ev,
                  }),
                )
              }
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
            <TabButton value="bot-settings">
              {t('pages.twitch-settings.bot-settings')}
            </TabButton>
          </TabList>
          <TabContent value="api-config">
            <TwitchAPISettings />
          </TabContent>
          <TabContent value="bot-settings">
            <TwitchBotSettings />
          </TabContent>
        </TabContainer>
      </div>
    </PageContainer>
  );
}
