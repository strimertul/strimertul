/* eslint-disable import/prefer-default-export */

import { theme } from '.';
import { styled } from './theme';

export const FlexRow = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  variants: {
    border: {
      form: {
        border: '1px solid $gray6',
        borderRadius: theme.borderRadius.form,
      },
    },
    spacing: {
      '1': {
        gap: '0.5rem',
      },
    },
    align: {
      left: {
        justifyContent: 'flex-start',
      },
    },
  },
});
