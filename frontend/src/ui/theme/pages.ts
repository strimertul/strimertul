import { styled } from './theme';

export const PageContainer = styled('div', {
  padding: '2rem',
  paddingTop: '1rem',
  maxWidth: '1000px',
  width: '100%',
  margin: '0 auto',
  variants: {
    spacing: {
      narrow: {
        padding: '0 2rem',
        paddingTop: '0',
      },
    },
  },
});

export const PageHeader = styled('header', {});

export const PageTitle = styled('h1', {
  fontSize: '25pt',
  fontWeight: '600',
  marginBottom: '1rem',
});

export const SectionHeader = styled('h2', {
  fontSize: '18pt',
  paddingTop: '1rem',
  variants: {
    spacing: {
      none: {
        paddingTop: '0',
      },
    },
  },
});

export const TextBlock = styled('p', {
  lineHeight: '1.5',
  variants: {
    spacing: {
      none: {
        margin: '0',
      },
    },
  },
});
