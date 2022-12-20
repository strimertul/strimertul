import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { keyframes } from '@stitches/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

// @ts-expect-error Asset import
import spinner from '~/assets/icon-logo.svg';
import { useModule, useStatus } from '~/lib/react';
import { languages } from '~/locale/languages';
import { useAppDispatch } from '~/store';
import apiReducer, { modules } from '~/store/api/reducer';
import AlertContent from '../components/AlertContent';
import SaveButton from '../components/forms/SaveButton';
import RevealLink from '../components/utils/RevealLink';

import {
  Button,
  Field,
  FieldNote,
  InputBox,
  Label,
  MultiToggle,
  MultiToggleItem,
  PageContainer,
  PageHeader,
  PageTitle,
  PasswordInputBox,
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
        color: '$teal12',
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
  TwitchBot = 2,
  Done = 999,
}

const steps = [
  OnboardingSteps.Landing,
  OnboardingSteps.TwitchIntegration,
  OnboardingSteps.TwitchBot,
  OnboardingSteps.Done,
];

const stepI18n = {
  [OnboardingSteps.Landing]: 'pages.onboarding.sections.landing',
  [OnboardingSteps.TwitchIntegration]:
    'pages.onboarding.sections.twitch-config',
  [OnboardingSteps.TwitchBot]: 'pages.onboarding.sections.twitch-bot',
  [OnboardingSteps.Done]: 'pages.onboarding.sections.done',
};

const maxKeys = languages.reduce(
  (current, it) => Math.max(current, it.keys),
  0,
);

export default function OnboardingPage() {
  const [t, i18n] = useTranslation();
  const [animationItems, setAnimationItems] = useState<JSX.Element[]>([]);
  const [uiConfig, setUiConfig] = useModule(modules.uiConfig);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const currentStep = steps[uiConfig?.onboardingStatus || 0];
  const landing = currentStep === OnboardingSteps.Landing;

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
