import {
  ExclamationTriangleIcon,
  ExternalLinkIcon,
} from '@radix-ui/react-icons';
import { keyframes } from '@stitches/react';
import { GetTwitchLoggedUser, GetTwitchAuthURL } from '@wailsapp/go/main/App';
import { helix } from '@wailsapp/go/models';
import { BrowserOpenURL } from '@wailsapp/runtime/runtime';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useModule } from '~/lib/react';
import { checkTwitchKeys, TwitchCredentials } from '~/lib/twitch';
import { languages } from '~/locale/languages';
import { RootState, useAppDispatch } from '~/store';
import apiReducer, { modules } from '~/store/api/reducer';

// @ts-expect-error Asset import
import spinner from '~/assets/icon-logo.svg';

import AlertContent from '../components/AlertContent';
import BrowserLink from '../components/BrowserLink';
import DefinitionTable from '../components/DefinitionTable';
import RevealLink from '../components/utils/RevealLink';
import Channels from '../components/utils/Channels';

import {
  Button,
  ButtonGroup,
  Field,
  InputBox,
  Label,
  MultiToggle,
  MultiToggleItem,
  PageContainer,
  PasswordInputBox,
  SectionHeader,
  styled,
  TextBlock,
} from '../theme';
import { Alert } from '../theme/alert';

const Container = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
});

const TopBanner = styled('div', {
  backgroundColor: '$gray2',
  display: 'flex',
  width: '100%',
  transition: 'all 100ms ease-out',
});

const appear = keyframes({
  '0%': { opacity: 0, transform: 'translate(0, 30px)' },
  '100%': { opacity: 1, transform: 'translate(0, 0)' },
});

const HeroTitle = styled('h1', {
  fontSize: '35pt',
  fontWeight: 200,
  textAlign: 'center',
  padding: 0,
  margin: 0,
  marginBottom: '1em',
  '@media (prefers-reduced-motion: no-preference)': {
    opacity: 0,
    animation: `${appear()} 1s ease-in`,
    animationDelay: '1s',
    animationFillMode: 'forwards',
  },
});

const HeroContainer = styled('div', {
  height: 'calc(100vh - 110px)',
  boxSizing: 'border-box',
  justifyContent: 'center',
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  position: 'relative',
  overflow: 'hidden',
});

const HeroLanguageSelector = styled('div', {
  top: '10px',
  left: '10px',
  display: 'flex',
  gap: '1rem',
  position: 'absolute',
  zIndex: '10',
});

const LanguageItem = styled(MultiToggleItem, {
  fontSize: '1rem',
  padding: '5px 8px',
});

const HeroAnimation = styled('div', {
  bottom: '-50px',
  left: '50%',
  position: 'absolute',
});

const HeroContent = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  maxWidth: '1000px',
  width: '100%',
  padding: '0 3rem',
  '@media (prefers-reduced-motion: no-preference)': {
    opacity: 0,
    animation: `${appear()} 1s ease-in`,
    animationDelay: '1s',
    animationFillMode: 'forwards',
  },
  '& p': { margin: 0, padding: 0 },
});

const fadeOut = keyframes({
  '0%': { transform: 'translate(10px, 0px) rotate(-80deg)' },
  '100%': { opacity: 0, transform: 'translate(-100px, -800px) rotate(30deg)' },
});

const Spinner = styled('img', {
  width: '100px',
  position: 'absolute',
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${fadeOut()} 2s ease-in`,
    animationFillMode: 'forwards',
  },
});

const StepContainer = styled(PageContainer, {
  display: 'flex',
  flexDirection: 'column',
  paddingTop: '1rem',
  '& p': {
    margin: '1.5rem 0',
  },
});

const ActionContainer = styled('div', {
  flex: 1,
  display: 'flex',
  justifyContent: 'center',
  gap: '1rem',
  paddingTop: '1rem',
});

const StepList = styled('nav', {
  flex: '1',
  display: 'flex',
  alignItems: 'center',
  padding: '0 1rem',
  flexWrap: 'wrap',
  flexDirection: 'row',
  justifyContent: 'flex-start',
});

const StepName = styled('div', {
  padding: '0.5rem',
  color: '$gray10',
  '&:not(:last-child)::after': {
    color: '$gray10',
    content: '›',
    margin: '0 0 0 1rem',
  },
  display: 'none',
  '@thin': {
    display: 'inherit',
  },
  variants: {
    status: {
      active: {
        color: '$gray12',
        display: 'inherit',
      },
    },
    interaction: {
      clickable: {
        cursor: 'pointer',
      },
    },
  },
});

enum OnboardingSteps {
  Landing = 0,
  TwitchIntegration = 1,
  TwitchEvents = 2,
  Done = 999,
}

const steps = [
  OnboardingSteps.Landing,
  OnboardingSteps.TwitchIntegration,
  OnboardingSteps.TwitchEvents,
  OnboardingSteps.Done,
];

const stepI18n = {
  [OnboardingSteps.Landing]: 'pages.onboarding.sections.landing',
  [OnboardingSteps.TwitchIntegration]:
    'pages.onboarding.sections.twitch-config',
  [OnboardingSteps.TwitchEvents]: 'pages.onboarding.sections.twitch-events',
  [OnboardingSteps.Done]: 'pages.onboarding.sections.done',
};

const maxKeys = languages.reduce(
  (current, it) => Math.max(current, it.keys),
  0,
);

type TestResult = { open: boolean; error?: Error };

const TwitchStepList = styled('ul', {
  lineHeight: '1.5',
  listStyleType: 'none',
  listStylePosition: 'outside',
});
const TwitchStep = styled('li', {
  marginBottom: '0.5rem',
  paddingLeft: '1rem',
  '&::marker': {
    color: '$teal11',
    content: '▧',
    display: 'inline-block',
    marginLeft: '-0.5rem',
  },
});

function TwitchIntegrationStep() {
  const { t } = useTranslation();
  const [httpConfig] = useModule(modules.httpConfig);
  const [twitchConfig, setTwitchConfig] = useModule(modules.twitchConfig);
  const [uiConfig, setUiConfig] = useModule(modules.uiConfig);
  const dispatch = useAppDispatch();
  const [revealClientSecret, setRevealClientSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>({
    open: false,
  });

  const checkCredentials = async () => {
    setTesting(true);
    if (twitchConfig) {
      try {
        await checkTwitchKeys(
          twitchConfig.api_client_id,
          twitchConfig.api_client_secret,
        );
        void dispatch(
          setTwitchConfig({
            ...twitchConfig,
            enabled: true,
          }),
        );
        void dispatch(
          setUiConfig({
            ...uiConfig,
            onboardingStatus: uiConfig.onboardingStatus + 1,
          }),
        );
      } catch (e: unknown) {
        setTestResult({ open: true, error: e as Error });
      }
    }
    setTesting(false);
  };

  function skipTwitch() {
    void dispatch(
      setUiConfig({
        ...uiConfig,
        onboardingStatus:
          steps.findIndex((val) => val === OnboardingSteps.TwitchEvents) + 1,
      }),
    );
  }

  const allFields =
    (twitchConfig?.api_client_id?.length > 0 ?? false) &&
    (twitchConfig?.api_client_secret?.length > 0 ?? false);

  return (
    <form
      onSubmit={(ev) => {
        void dispatch(setTwitchConfig(twitchConfig));
        ev.preventDefault();
      }}
    >
      <TextBlock>{t('pages.onboarding.twitch-p1')}</TextBlock>
      <TwitchStepList>
        <TwitchStep>
          <Trans i18nKey="pages.twitch-settings.apiguide-2">
            {' '}
            <BrowserLink href="https://dev.twitch.tv/console/apps/create">
              https://dev.twitch.tv/console/apps/create
            </BrowserLink>
          </Trans>
        </TwitchStep>
        <TwitchStep>
          {t('pages.twitch-settings.apiguide-3')}

          <DefinitionTable
            entries={{
              [t('pages.twitch-settings.app-oauth-redirect-url')]: `http://${
                httpConfig?.bind.indexOf(':') > 0
                  ? httpConfig.bind
                  : `localhost${httpConfig?.bind ?? ':4337'}`
              }/twitch/callback`,
              [t('pages.twitch-settings.app-category')]: 'Broadcasting Suite',
            }}
          />
        </TwitchStep>
        <TwitchStep>
          <Trans i18nKey="pages.twitch-settings.apiguide-4">
            {'str1 '}
            <b>str2</b>
          </Trans>
        </TwitchStep>
      </TwitchStepList>
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
      <TextBlock>{t('pages.onboarding.twitch-p2')}</TextBlock>
      <ButtonGroup>
        <Button
          type="button"
          variation={'primary'}
          onClick={() => {
            void checkCredentials();
          }}
          disabled={!allFields || testing}
        >
          {t('pages.twitch-settings.test-button')}
        </Button>
        <Button
          type="button"
          onClick={() => {
            skipTwitch();
          }}
        >
          {t('pages.onboarding.twitch-skip')}
        </Button>
      </ButtonGroup>
      <Alert
        defaultOpen={false}
        open={testResult.open}
        onOpenChange={(val: boolean) => {
          setTestResult({ ...testResult, open: val });
        }}
      >
        <AlertContent
          variation={testResult.error ? 'danger' : 'default'}
          description={
            testResult.error
              ? t('pages.twitch-settings.test-failed', [
                  testResult.error.message,
                ])
              : t('pages.twitch-settings.test-succeeded')
          }
          actionText={t('form-actions.ok')}
          onAction={() => {
            setTestResult({ ...testResult, open: false });
          }}
        />
      </Alert>
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

function TwitchEventsStep() {
  const { t } = useTranslation();
  const [userStatus, setUserStatus] = useState<helix.User | SyncError>(null);
  const [twitchConfig, setTwitchConfig] = useModule(modules.twitchConfig);
  const [botConfig, setBotConfig] = useModule(modules.twitchBotConfig);
  const [uiConfig, setUiConfig] = useModule(modules.uiConfig);
  const [authKeys, setAuthKeys] = useState<TwitchCredentials>(null);
  const kv = useSelector((state: RootState) => state.api.client);
  const dispatch = useAppDispatch();

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

  const finishStep = async () => {
    if ('id' in userStatus) {
      // Set bot config to sane defaults
      await dispatch(
        setTwitchConfig({
          ...twitchConfig,
          enable_bot: true,
        }),
      );
      await dispatch(
        setBotConfig({
          ...botConfig,
          username: userStatus.login,
          oauth: `oauth:${authKeys.access_token}`,
          channel: userStatus.login,
          chat_history: 5,
        }),
      );
    }
    await dispatch(
      setUiConfig({
        ...uiConfig,
        onboardingStatus:
          steps.findIndex((val) => val === OnboardingSteps.TwitchEvents) + 1,
      }),
    );
  };

  useEffect(() => {
    // Get user info
    void getUserInfo();

    const onKeyChange = (newValue: string) => {
      setAuthKeys(JSON.parse(newValue) as TwitchCredentials);
      void getUserInfo();
    };

    void kv.getKey('twitch/auth-keys').then((auth) => {
      if (auth) {
        setAuthKeys(JSON.parse(auth) as TwitchCredentials);
      }
    });

    void kv.subscribeKey('twitch/auth-keys', onKeyChange);
    return () => {
      void kv.unsubscribeKey('twitch/auth-keys', onKeyChange);
    };
  }, []);

  let userBlock = <i>{t('pages.twitch-settings.events.loading-data')}</i>;
  if (userStatus !== null) {
    if ('id' in userStatus) {
      userBlock = (
        <>
          <TwitchUser>
            <TextBlock>
              {t('pages.twitch-settings.events.authenticated-as')}
            </TextBlock>
            <TwitchPic
              src={userStatus.profile_image_url}
              alt={t('pages.twitch-settings.events.profile-picture')}
            />
            <TwitchName>{userStatus.display_name}</TwitchName>
          </TwitchUser>
          <TextBlock>{t('pages.onboarding.twitch-ev-p3')}</TextBlock>
          <Button
            variation={'primary'}
            onClick={() => {
              void finishStep();
            }}
          >
            {t('pages.onboarding.twitch-complete')}
          </Button>
        </>
      );
    } else {
      userBlock = <span>{t('pages.twitch-settings.events.err-no-user')}</span>;
    }
  }
  return (
    <div>
      <TextBlock>{t('pages.onboarding.twitch-ev-p1')}</TextBlock>
      <TextBlock>{t('pages.twitch-settings.events.auth-message')}</TextBlock>
      <ButtonGroup>
        <Button
          variation="primary"
          onClick={() => {
            void startAuthFlow();
          }}
        >
          <ExternalLinkIcon /> {t('pages.twitch-settings.events.auth-button')}
        </Button>
      </ButtonGroup>
      <SectionHeader>
        {t('pages.twitch-settings.events.current-status')}
      </SectionHeader>
      {userBlock}
    </div>
  );
}

function DoneStep() {
  const { t } = useTranslation();
  const [uiConfig, setUiConfig] = useModule(modules.uiConfig);
  const dispatch = useAppDispatch();

  const done = () => {
    void dispatch(
      setUiConfig({
        ...uiConfig,
        onboardingDone: true,
      }),
    );
  };

  return (
    <div>
      <SectionHeader>{t('pages.onboarding.done-header')}</SectionHeader>
      <TextBlock>{t('pages.onboarding.done-p1')}</TextBlock>
      <TextBlock>{t('pages.onboarding.done-p2')}</TextBlock>
      {Channels}
      <TextBlock>{t('pages.onboarding.done-p3')}</TextBlock>
      <Button variation={'primary'} onClick={() => done()}>
        {t('pages.onboarding.done-button')}
      </Button>
    </div>
  );
}

export default function OnboardingPage() {
  const [t, i18n] = useTranslation();
  const [animationItems, setAnimationItems] = useState<JSX.Element[]>([]);
  const [uiConfig, setUiConfig] = useModule(modules.uiConfig);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const currentStep = steps[uiConfig?.onboardingStatus || 0];
  const landing = currentStep === OnboardingSteps.Landing;

  // Skip onboarding if we've already done it
  const onboardingDone = uiConfig?.onboardingDone;
  useEffect(() => {
    if (onboardingDone) {
      navigate('/');
    }
  }, [onboardingDone]);

  const skip = () => {
    void dispatch(
      setUiConfig({
        ...uiConfig,
        onboardingDone: true,
      }),
    );
  };

  useEffect(() => {
    const spinners = new Array<string>(30).fill(spinner as string);
    setAnimationItems(
      spinners.map((url, i) => (
        <Spinner
          key={i}
          src={url}
          css={{
            marginLeft: `${Math.trunc(Math.random() * 1000) - 500}px`,
            animationDelay: `${(i / spinners.length) * 1000}ms`,
            marginTop: `${Math.trunc(Math.random() * 200 - 50)}px`,
            animationDuration: `${Math.trunc(Math.random() * 1000 + 1000)}ms`,
            width: `${Math.trunc(100 + Math.random() * 100)}px`,
            opacity: `${0.1 + Math.random() * 0.2}`,
            filter: `sepia(100%) saturate(1300%) hue-rotate(${Math.trunc(
              Math.random() * 180,
            )}deg) brightness(120%) contrast(120%)`,
          }}
        />
      )),
    );
  }, []);

  let currentStepBody: JSX.Element = null;
  switch (currentStep) {
    case OnboardingSteps.Landing:
      currentStepBody = (
        <ActionContainer>
          <Button
            css={{ width: '20vw', justifyContent: 'center' }}
            onClick={() => skip()}
          >
            {t('pages.onboarding.skip-button')}
          </Button>
          <Button
            css={{ width: '20vw', justifyContent: 'center' }}
            variation="primary"
            onClick={() => {
              void dispatch(
                setUiConfig({
                  ...uiConfig,
                  onboardingStatus: (uiConfig?.onboardingStatus ?? 0) + 1,
                }),
              );
            }}
          >
            {t('pages.onboarding.welcome-continue-button')}
          </Button>
        </ActionContainer>
      );
      break;
    case OnboardingSteps.TwitchIntegration:
      currentStepBody = <TwitchIntegrationStep />;
      break;
    case OnboardingSteps.TwitchEvents:
      currentStepBody = <TwitchEventsStep />;
      break;
    case OnboardingSteps.Done:
      currentStepBody = <DoneStep />;
      break;
  }

  return (
    <Container>
      <TopBanner>
        {landing ? (
          <HeroContainer>
            <HeroLanguageSelector>
              <MultiToggle
                value={uiConfig?.language ?? i18n.resolvedLanguage}
                type="single"
                onValueChange={(newLang) => {
                  void dispatch(
                    setUiConfig({ ...uiConfig, language: newLang }),
                  );
                }}
              >
                {languages.map((lang) => (
                  <LanguageItem
                    key={lang.code}
                    aria-label={lang.name}
                    value={lang.code}
                    title={`${lang.name} ${
                      lang.keys < maxKeys
                        ? `(${t('pages.uiconfig.partial-translation')})`
                        : ''
                    }`}
                  >
                    {lang.name}
                    {lang.keys < maxKeys ? <ExclamationTriangleIcon /> : null}
                  </LanguageItem>
                ))}
              </MultiToggle>
            </HeroLanguageSelector>
            <HeroAnimation>{animationItems}</HeroAnimation>
            <HeroTitle>{t('pages.onboarding.welcome-header')}</HeroTitle>
            <HeroContent>
              <TextBlock>{t('pages.onboarding.welcome-p1')}</TextBlock>
              <TextBlock>
                <Trans
                  t={t}
                  i18nKey={'pages.onboarding.welcome-guide'}
                  components={{
                    g: (
                      <BrowserLink href="https://strimertul.stream/guide/getting-started/first-time-setup/" />
                    ),
                  }}
                />
              </TextBlock>
              <TextBlock css={{ color: '$gray11' }}>
                {t('pages.onboarding.welcome-p2')}
              </TextBlock>
            </HeroContent>
          </HeroContainer>
        ) : (
          <StepList>
            {steps.map((step) => (
              <StepName
                key={step}
                interaction={step < currentStep ? 'clickable' : undefined}
                status={step === currentStep ? 'active' : undefined}
                onClick={() => {
                  // Can't skip ahead
                  if (step >= currentStep) {
                    return;
                  }
                  void dispatch(
                    setUiConfig({
                      ...uiConfig,
                      onboardingStatus:
                        steps.findIndex((val) => val === step) ?? 0,
                    }),
                  );
                }}
              >
                {t(stepI18n[step])}
              </StepName>
            ))}
          </StepList>
        )}
      </TopBanner>
      <StepContainer>{currentStepBody}</StepContainer>
    </Container>
  );
}
