import { styled } from '@stitches/react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useMatch, useResolvedPath } from 'react-router-dom';

// @ts-expect-error Asset import
import logo from '~/assets/icon-logo.svg';

import { useAppSelector } from '~/store';
import { APPNAME, APPREPO } from '../theme';
import BrowserLink from './BrowserLink';
import Scrollbar from './utils/Scrollbar';

export interface RouteSection {
  title: string;
  links: Route[];
}

export interface Route {
  title: string;
  url: string;
  icon?: JSX.Element;
}

interface SidebarProps {
  sections: RouteSection[];
}

const Container = styled('section', {
  background: '$gray1',
  maxWidth: '220px',
  borderRight: '1px solid $gray6',
});

const Header = styled('div', {
  padding: '0.8rem 1rem 1rem 0.8rem',
  textAlign: 'center',
});

const AppName = styled('h1', {
  userSelect: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.2rem',
  fontSize: '1.4rem',
  margin: '0.5rem 0 0.5rem 0',
  fontWeight: 300,
  paddingRight: '0.5rem',
});

const AppLink = styled(Link, {
  userSelect: 'none',
  all: 'unset',
  cursor: 'pointer',
  color: '$teal12',
  '&:visited': {
    color: '$teal12',
  },
  display: 'flex',
  flexDirection: 'column',
  variants: {
    status: {
      active: {
        backgroundColor: '$teal4',
        borderRadius: '0.5rem',
      },
      default: {},
    },
  },
});

const VersionLabel = styled('div', {
  userSelect: 'none',
  textTransform: 'uppercase',
  fontSize: '0.75rem',
  fontWeight: 'bold',
  color: '$teal8',
  textAlign: 'center',
  paddingBottom: '0.4rem',
});

const UpdateButton = styled(BrowserLink, {
  textTransform: 'uppercase',
  fontSize: '0.75rem',
  fontWeight: 'bold',
  color: '$yellow12 !important',
  border: '1px solid $yellow7',
  padding: '0.2rem 0.4rem',
  marginTop: '0.5rem',
  backgroundColor: '$yellow5',
  borderRadius: '0.2rem',
  display: 'inline-block',
  cursor: 'pointer',
  textDecoration: 'none',
  '&:hover': {
    backgroundColor: '$yellow6',
  },
});

const MenuSection = styled('article', {
  display: 'flex',
  flexDirection: 'column',
  padding: '0.2rem 0 0.5rem 0',
});
const MenuHeader = styled('header', {
  textTransform: 'uppercase',
  fontSize: '0.75rem',
  fontWeight: 'bold',
  padding: '0.5rem 0 0.5rem 0.8rem',
  color: '$teal9',
  userSelect: 'none',
});
const MenuLink = styled(Link, {
  userSelect: 'none',
  color: '$teal13 !important',
  display: 'flex',
  alignItems: 'center',
  textDecoration: 'none',
  gap: '0.6rem',
  padding: '0.6rem 1.6rem 0.6rem 1rem',
  fontSize: '0.9rem',
  fontWeight: '300',
  variants: {
    status: {
      selected: {
        color: '$teal13 !important',
        backgroundColor: '$teal5',
      },
      clickable: {
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: '$teal4',
        },
      },
    },
  },
});

function SidebarLink({ route: { title, url, icon } }: { route: Route }) {
  const { t } = useTranslation();
  const resolved = useResolvedPath(url);
  const match = useMatch({ path: resolved.pathname, end: true });
  return (
    <MenuLink
      status={match ? 'selected' : 'clickable'}
      to={url.replace(/\/\//gi, '/')}
      key={`${title}-${url}`}
    >
      {icon}
      {t(title)}
    </MenuLink>
  );
}

export default function Sidebar({
  sections,
}: SidebarProps): React.ReactElement {
  const { t } = useTranslation();
  const resolved = useResolvedPath('/about');
  const matchApp = useMatch({ path: resolved.pathname, end: true });
  const version = useAppSelector((state) => state.server.version?.release);
  const [lastVersion, setLastVersion] = useState<{ url: string; name: string }>(
    null,
  );
  const dev = version && version.startsWith('v0.0.0');

  async function fetchLastVersion() {
    try {
      const req = await fetch(
        `https://api.github.com/repos/${APPREPO}/releases/latest`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );
      const data = (await req.json()) as { html_url: string; name: string };
      setLastVersion({
        url: data.html_url,
        name: data.name,
      });
    } catch (e) {
      // TODO Report error nicely
      console.warn('Failed checking upstream for latest version', e);
    }
  }

  useEffect(() => {
    void fetchLastVersion();
  }, []);

  return (
    <Container>
      <Scrollbar vertical={true} viewport={{ maxHeight: '100vh' }}>
        <Header>
          <AppLink to={'/about'} status={matchApp ? 'active' : 'default'}>
            <AppName>
              <img
                src={logo as string}
                style={{ height: '28px', marginBottom: '-2px' }}
              />
              {APPNAME}
            </AppName>
            <VersionLabel>
              {version && !dev ? version : t('debug.dev-build')}
            </VersionLabel>
          </AppLink>
          {!dev &&
            version &&
            lastVersion &&
            !version.startsWith(lastVersion.name) && (
              <UpdateButton href={lastVersion.url}>
                {t('menu.messages.update-available')}
              </UpdateButton>
            )}
        </Header>
        {sections.map(({ title: sectionTitle, links }) => (
          <MenuSection key={sectionTitle}>
            <MenuHeader>{t(sectionTitle)}</MenuHeader>
            {links.map((route) => (
              <SidebarLink route={route} key={`${route.title}-${route.url}`} />
            ))}
          </MenuSection>
        ))}
      </Scrollbar>
    </Container>
  );
}
