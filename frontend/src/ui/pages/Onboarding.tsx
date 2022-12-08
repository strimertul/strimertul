import { keyframes } from '@stitches/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// @ts-expect-error Asset import
import spinner from '~/assets/icon-logo.svg';

import { styled } from '../theme';

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
  '@media (prefers-reduced-motion: no-preference)': {
    opacity: 0,
    animation: `${appear()} 1s ease-in`,
    animationDelay: '1s',
    animationFillMode: 'forwards',
  },
});

const HeroContainer = styled('div', {
  maxHeight: '30vh',
  height: '300px',
  justifyContent: 'center',
  alignItems: 'center',
  display: 'flex',
  width: '100%',
  position: 'relative',
  overflow: 'hidden',
});

const HeroAnimation = styled('div', {
  bottom: '-50px',
  left: '50%',
  position: 'absolute',
});

const fadeOut = keyframes({
  '0%': { transform: 'translate(10px, 0px) rotate(-80deg)' },
  '100%': { opacity: 0, transform: 'translate(-100px, -400px) rotate(30deg)' },
});

const Spinner = styled('img', {
  width: '100px',
  position: 'absolute',
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${fadeOut()} 2s ease-in`,
    animationFillMode: 'forwards',
  },
});

export default function OnboardingPage() {
  const { t } = useTranslation();
  const [animationItems, setAnimationItems] = useState<JSX.Element[]>([]);

  useEffect(() => {
    const spinners = new Array<string>(40).fill(spinner as string);
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
            opacity: `${0.2 + Math.random() * 0.5}`,
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
        <HeroContainer>
          <HeroAnimation>{animationItems}</HeroAnimation>
          <HeroTitle>{t('pages.onboarding.welcome-header')}</HeroTitle>
        </HeroContainer>
      </TopBanner>
    </Container>
  );
}
