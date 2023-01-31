import * as Tabs from '@radix-ui/react-tabs';
import { styled } from './theme';

export const TabContainer = styled(Tabs.Root, {
  width: '100%',
});

export const TabList = styled(Tabs.List, {
  borderBottom: '1px solid $gray6',
});

export const TabButton = styled(Tabs.Trigger, {
  all: 'unset',
  padding: '0.6rem 1.2rem',
  borderBottom: 'none',
  borderRadius: '0.2rem 0.2rem 0 0',
  cursor: 'pointer',
  '&[data-state="active"]': {
    borderBottom: '2px solid $teal9',
  },
  marginBottom: '-1px',
  '&:disabled': {
    opacity: 0.3,
  },
});

export const TabContent = styled(Tabs.Content, {
  paddingTop: '1.5rem',
});
