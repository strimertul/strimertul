import * as UnstyledLabel from '@radix-ui/react-label';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { styled } from './theme';

export const Field = styled('fieldset', {
  all: 'unset',
  marginBottom: '2rem',
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',
  gap: '0.5rem',
  variants: {
    size: {
      fullWidth: {
        flexDirection: 'column',
        alignItems: 'stretch',
      },
      vertical: {
        flexDirection: 'column',
        alignItems: 'flex-start',
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

export const Checkbox = styled(CheckboxPrimitive.Root, {
  all: 'unset',
  width: 25,
  height: 25,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid $teal6',
  backgroundColor: '$teal4',
  '&:hover': {
    backgroundColor: '$teal5',
  },
  '&:active': {
    background: '$teal6',
  },
  '&:disabled': {
    backgroundColor: '$gray4',
    borderColor: '$gray5',
    color: '$gray8',
  },
});

export const CheckboxIndicator = styled(CheckboxPrimitive.Indicator, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '$teal11',
});
