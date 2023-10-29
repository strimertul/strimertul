import * as UnstyledLabel from '@radix-ui/react-label';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { lightMode, styled, theme } from './theme';
import ControlledInput from '../components/forms/ControlledInput';
import PasswordField from '../components/forms/PasswordField';

export const Field = styled('fieldset', {
  all: 'unset',
  marginBottom: '2rem',
  display: 'flex',
  justifyContent: 'flex-start',
  alignItems: 'center',
  gap: '0.5rem',
  variants: {
    spacing: {
      narrow: {
        marginBottom: '1rem',
      },
      none: {
        marginBottom: 0,
      },
    },
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

const inputStyles = {
  all: 'unset',
  fontWeight: '300',
  border: '1px solid $gray6',
  padding: '0.5rem',
  borderRadius: theme.borderRadius.form,
  backgroundColor: '$gray2',
  transition: 'all 80ms',
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
  '&:invalid': {
    borderColor: '$red5',
  },
  variants: {
    border: {
      none: {
        borderWidth: '0',
      },
    },
  },
  [`.${lightMode} &`]: {
    border: '1px solid $gray7',
    '&:disabled': {
      borderColor: '$gray4',
    },
  },
} as const;

export const InputBox = styled('input', inputStyles);
export const ControlledInputBox = styled(ControlledInput, inputStyles);
export const PasswordInputBox = styled(PasswordField, inputStyles);

export const Textarea = styled('textarea', {
  all: 'unset',
  fontWeight: '300',
  border: '1px solid $gray6',
  padding: '0.5rem',
  borderRadius: theme.borderRadius.form,
  backgroundColor: '$gray2',
  transition: 'all 80ms',
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
  '&:invalid': {
    borderColor: '$red5',
  },
  [`.${lightMode} &`]: {
    '&:disabled': {
      borderColor: '$gray4',
    },
  },
  variants: {
    border: {
      none: {
        borderWidth: '0',
      },
    },
  },
});

export const ButtonGroup = styled('div', {
  display: 'flex',
  gap: '0.5rem',
});

export const MultiButton = styled('div', {
  display: 'flex',
});

function buttonStyle(hueName: string) {
  return {
    border: `1px solid $${hueName}6`,
    backgroundColor: `$${hueName}4`,
    '&:not(:disabled)': {
      '&:hover': {
        backgroundColor: `$${hueName}5`,
        borderColor: `$${hueName}8`,
      },
      '&:active': {
        background: `$${hueName}6`,
      },
    },
    [`.${lightMode} &`]: {
      border: `1px solid $${hueName}10`,
      backgroundColor: `$${hueName}10`,
      color: `$${hueName}2`,
      '&:not(:disabled)': {
        '&:hover': {
          backgroundColor: `$${hueName}11`,
        },
        '&:active': {
          background: `$${hueName}11`,
        },
      },
    },
  };
}

const button = {
  all: 'unset',
  cursor: 'pointer',
  userSelect: 'none',
  color: '$gray12',
  fontWeight: '300',
  borderRadius: theme.borderRadius.form,
  fontSize: '1.1rem',
  padding: '0.5rem 1rem',
  border: '1px solid $gray6',
  backgroundColor: '$gray4',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  '&:not(:disabled)': {
    '&:hover': {
      backgroundColor: '$gray5',
      borderColor: '$gray8',
    },
    '&:active': {
      background: '$gray6',
    },
  },
  '&:disabled': {
    border: '1px solid $gray4',
    backgroundColor: '$gray3',
    cursor: 'not-allowed',
  },
  [`.${lightMode} &`]: {
    backgroundColor: '$gray2',
    border: '1px solid $gray7',
    '&:disabled': {
      border: '1px solid $gray4',
      backgroundColor: '$gray3',
      cursor: 'not-allowed',
    },
  },
  transition: 'all 0.2s',
  variants: {
    border: {
      none: {
        borderWidth: '0',
      },
    },
    styling: {
      form: {
        padding: '0.65rem',
      },
      link: {
        backgroundColor: 'transparent',
        border: 'none',
        color: '$teal11',
        textDecoration: 'underline',
      },
      multi: {
        borderRadius: '0',
        margin: '0 -1px',
        '&:first-child': {
          borderRadius: `$borderRadius$form 0 0 $borderRadius$form`,
        },
        '&:last-child': {
          borderRadius: `0 $borderRadius$form $borderRadius$form 0`,
        },
        '&:hover': {
          zIndex: '1',
        },
      },
    },
    size: {
      small: {
        padding: '0.3rem 0.5rem',
        fontSize: '0.9rem',
      },
      smaller: {
        padding: '5px',
        paddingBottom: '3px',
        fontSize: '0.8rem',
      },
    },
    variation: {
      primary: buttonStyle('teal'),
      success: buttonStyle('grass'),
      error: buttonStyle('red'),
      warning: buttonStyle('yellow'),
      danger: buttonStyle('red'),
    },
  },
} as const;

export const MultiToggle = styled(ToggleGroup.Root, {
  display: 'inline-flex',
  borderRadius: theme.borderRadius.form,
  backgroundColor: '$gray4',
});

export const MultiToggleItem = styled(ToggleGroup.Item, {
  ...button,
  borderRadius: 0,
  border: 0,
  '&:first-child': {
    borderTopLeftRadius: theme.borderRadius.form,
    borderBottomLeftRadius: theme.borderRadius.form,
  },
  '&:last-child': {
    borderTopRightRadius: theme.borderRadius.form,
    borderBottomRightRadius: theme.borderRadius.form,
  },
  '&:not(:disabled)': {
    '&:hover': {
      ...button['&:not(:disabled)']['&:hover'],
    },
    "&[data-state='on']": {
      ...button['&:not(:disabled)']['&:active'],
      backgroundColor: '$gray8',
    },
  },
});

export const Button = styled('button', {
  ...button,
});

export const ComboBox = styled('select', {
  margin: 0,
  color: '$teal13',
  fontWeight: '300',
  border: '1px solid $gray6',
  padding: '0.5rem',
  borderRadius: theme.borderRadius.form,
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
  variants: {
    border: {
      none: {
        borderWidth: '0',
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
  border: '1px solid $gray6',
  backgroundColor: '$gray3',
  transition: 'all 60ms',
  '&:hover': {
    borderColor: '$teal6',
    backgroundColor: '$gray5',
  },
  '&:active': {
    background: '$gray6',
  },
  '&:disabled': {
    backgroundColor: '$gray4',
    borderColor: '$gray5',
    color: '$gray8',
  },
  variants: {
    variation: {
      primary: {
        border: '1px solid $teal6',
        backgroundColor: '$teal4',
        '&:hover': {
          backgroundColor: '$teal5',
        },
        '&:active': {
          background: '$teal6',
        },
      },
    },
  },
});

export const CheckboxIndicator = styled(CheckboxPrimitive.Indicator, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '$teal11',
});
