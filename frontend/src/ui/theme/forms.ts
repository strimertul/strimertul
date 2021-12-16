import * as UnstyledLabel from '@radix-ui/react-label';
import { styled } from './theme';

export const Field = styled('fieldset', {
  all: 'unset',
  marginBottom: '2rem',
  display: 'flex',
  justifyContent: 'flex-start',
  variants: {
    size: {
      fullWidth: {
        flexDirection: 'column',
        gap: '0.5rem',
      },
    },
  },
});

export const FieldNote = styled('small', {
  display: 'block',
  fontSize: '0.8rem',
  padding: '0 0.2rem',
  fontWeight: '300',
});

export const Label = styled(UnstyledLabel.Root, {
  userSelect: 'none',
  fontWeight: 'bold',
});

export const InputBox = styled('input', {
  all: 'unset',
  fontWeight: '300',
  border: '1px solid $gray6',
  padding: '0.5rem',
  borderRadius: '0.3rem',
  backgroundColor: '$gray2',
  '&:hover': {
    borderColor: '$teal7',
  },
  '&:focus': {
    borderColor: '$teal7',
    backgroundColor: '$gray3',
  },
  '&:disabled': {
    backgroundColor: '$gray4',
    borderColor: '$gray5',
    color: '$gray8',
  },
});

export const ButtonGroup = styled('div', {
  display: 'flex',
  gap: '0.5rem',
});

export const Button = styled('button', {
  all: 'unset',
  cursor: 'pointer',
  fontWeight: '300',
  padding: '0.5rem 1rem',
  borderRadius: '0.3rem',
  fontSize: '1.1rem',
  border: '1px solid $teal6',
  backgroundColor: '$teal4',
  '&:hover': {
    backgroundColor: '$teal5',
  },
  '&:active': {
    background: '$teal6',
  },
  transition: 'all 0.2s',
  variants: {
    variation: {
      success: {
        border: '1px solid $grass6',
        backgroundColor: '$grass4',
        '&:hover': {
          backgroundColor: '$grass5',
        },
        '&:active': {
          background: '$grass6',
        },
      },
      error: {
        border: '1px solid $red6',
        backgroundColor: '$red4',
        '&:hover': {
          backgroundColor: '$red5',
        },
        '&:active': {
          background: '$red6',
        },
      },
    },
  },
});
