import { styled } from './theme';

export const PageContainer = styled('div', {
  padding: '2rem',
  maxWidth: '1000px',
  width: '100%',
  margin: '0 auto',
});

export const PageHeader = styled('header', {
  marginBottom: '3rem',
});

export const PageTitle = styled('h1', {
  fontSize: '25pt',
  fontWeight: '600',
  marginBottom: '0.5rem',
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
});
