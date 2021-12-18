import { styled } from './theme';

export const FlexRow = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  variants: {
    spacing: {
      '1': {
        gap: '0.5rem',
      },
    },
  },
});
