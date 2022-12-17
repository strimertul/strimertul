import React, { useState } from 'react';
import { keyframes } from '@stitches/react';
import { Trans, useTranslation } from 'react-i18next';
import { GitHubLogoIcon, TwitterLogoIcon } from '@radix-ui/react-icons';
import { useNavigate } from 'react-router-dom';

// @ts-expect-error Asset import
import logo from '~/assets/icon-logo.svg';

import { APPNAME, PageContainer, PageHeader, styled } from '../theme';
import BrowserLink from '../components/BrowserLink';

const gradientAnimation = keyframes({
  '0%': {
    backgroundPosition: '0% 50%',
  },
  '50%': {
    backgroundPosition: '100% 50%',
  },
  '100%': {
    backgroundPosition: '0% 50%',
  },
});

const LogoPic = styled('div', {
  minHeight: '170px',
  width: '220px',
  marginRight: '10px',
  maskImage: `url(${logo as string})`,
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
  animation: `${gradientAnimation()} 12s ease infinite`,
  backgroundSize: '400% 400%',
  backgroundImage: `linear-gradient(
	45deg,
	hsl(240deg 100% 20%) 0%,
	hsl(289deg 100% 21%) 11%,
	hsl(315deg 100% 27%) 22%,
	hsl(329deg 100% 36%) 33%,
	hsl(337deg 100% 43%) 44%,
	hsl(357deg 91% 59%) 56%,
	hsl(17deg 100% 59%) 67%,
	hsl(34deg 100% 53%) 78%,
	hsl(45deg 100% 50%) 89%,
	hsl(55deg 100% 50%) 100%
      )`,
});

const LogoName = styled('h1', {
  fontSize: '40pt',
  fontWeight: 200,
  textAlign: 'left',
  '@medium': {
    fontSize: '60pt',
  },
  paddingBottom: '0.5rem',
});

const Section = styled('section', {});
const SectionHeader = styled('h2', {});
const SectionParagraph = styled('p', {
  lineHeight: '1.5',
  paddingBottom: '1rem',
});
const ChannelList = styled('ul', { listStyle: 'none', padding: 0, margin: 0 });
const Channel = styled('li', {
  marginBottom: '1rem',
  fontSize: '1rem',
});
const ChannelLink = styled(BrowserLink, {
  textDecoration: 'none',
  color: '$teal11',
  display: 'inline-flex',
  flexDirection: 'row',
  gap: '0.5rem',
  alignItems: 'center',
  '&:hover': {
    textDecoration: 'underline',
  },
});

export default function StrimertulPage(): React.ReactElement {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [debugCount, setDebugCount] = useState(0);
  const countForDebug = () => {
    if (debugCount < 5) {
      setDebugCount(debugCount + 1);
    } else {
      navigate('/debug');
    }
  };

  return (
    <PageContainer>
      <PageHeader
        css={{
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          justifyContent: 'center',
          '@medium': {
            flexDirection: 'row',
          },
        }}
      >
        <LogoPic
          style={{
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
          }}
          onClick={countForDebug}
        />
        <LogoName>{APPNAME}</LogoName>
      </PageHeader>
      <Section>
        <SectionHeader>{t('pages.strimertul.need-help')}</SectionHeader>
        <SectionParagraph css={{ paddingBottom: 0 }}>
          {t('pages.strimertul.need-help-p1')}
        </SectionParagraph>
        <ChannelList>
          <Channel>
            <ChannelLink href="https://github.com/strimertul/strimertul/issues">
              <GitHubLogoIcon width={24} height={24} />
              github.com/strimertul/strimertul/issues
            </ChannelLink>
          </Channel>
        </ChannelList>
      </Section>
      <Section>
        <SectionHeader>{t('pages.strimertul.credits-header')}</SectionHeader>
        <SectionParagraph>
          <Trans
            t={t}
            i18nKey="pages.strimertul.credits-renko"
            components={{
              artist: (
                <BrowserLink href="https://twitter.com/Sonic__Chan">
                  Sonic_Chan
                </BrowserLink>
              ),
            }}
          />
        </SectionParagraph>
      </Section>
      <Section>
        <SectionHeader>{t('pages.strimertul.license-header')}</SectionHeader>
        <SectionParagraph>
          <Trans
            t={t}
            i18nKey="pages.strimertul.license-notice-strimertul"
            components={{
              license: (
                <BrowserLink href="https://github.com/strimertul/strimertul/blob/master/LICENSE">
                  GNU Affero General Public License v3.0
                </BrowserLink>
              ),
            }}
          />
        </SectionParagraph>
      </Section>
    </PageContainer>
  );
}
