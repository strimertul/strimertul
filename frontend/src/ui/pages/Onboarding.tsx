import { keyframes } from '@stitches/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

// @ts-expect-error Asset import
import spinner from '~/assets/icon-logo.svg';
import { useModule } from '~/lib/react-utils';
import { useAppDispatch } from '~/store';
import { modules } from '~/store/api/reducer';

import { Button, PageContainer, styled, TextBlock } from '../theme';

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
});

const ActionContainer = styled('div', {
  flex: 1,
  display: 'flex',
  justifyContent: 'center',
  gap: '1rem',
});

enum OnboardingSteps {
  Landing = 0,
  ServerConfig = 1,
}

export default function OnboardingPage() {
  const { t } = useTranslation();
  const [animationItems, setAnimationItems] = useState<JSX.Element[]>([]);
  const [currentStep, setStep] = useState(OnboardingSteps.Landing);
  const [uiConfig, setUiConfig] = useModule(modules.uiConfig);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

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

  return (
    <Container>
      <TopBanner>
        {landing ? (
          <HeroContainer>
            <HeroAnimation>{animationItems}</HeroAnimation>
            <HeroTitle>{t('pages.onboarding.welcome-header')}</HeroTitle>
            <HeroContent>
              <TextBlock>{t('pages.onboarding.welcome-p1')}</TextBlock>
              <TextBlock css={{ color: '$gray11' }}>
                Heads up: if you're used to other platforms, this unfortunately
                will require some more work on your end.
              </TextBlock>
            </HeroContent>
          </HeroContainer>
        ) : (
          <div></div>
        )}
      </TopBanner>
      <StepContainer>
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
            onClick={() => setStep(OnboardingSteps.ServerConfig)}
          >
            {t('pages.onboarding.welcome-continue-button')}
          </Button>
        </ActionContainer>
      </StepContainer>
    </Container>
  );
}
