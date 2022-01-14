import * as ToolbarPrimitive from '@radix-ui/react-toolbar';
import { styled, theme } from './theme';

export const Toolbar = styled(ToolbarPrimitive.Root, {
  display: 'flex',
  padding: '0.4rem',
  margin: '0.5rem 0',
  width: '100%',
  minWidth: 'max-content',
  borderRadius: theme.borderRadius.toolbar,
  backgroundColor: '$gray2',
  alignItems: 'center',
});

const itemStyles = {
  all: 'unset',
  flex: '0 0 auto',
  color: '$gray12',
  padding: '0.6rem 0.8rem',
  borderRadius: theme.borderRadius.form,
  display: 'flex',
  fontSize: '0.9rem',
  lineHeight: 1,
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
};

export const ToolbarButton = styled(ToolbarPrimitive.Button, {
  ...itemStyles,
  cursor: 'pointer',
  backgroundColor: '$gray4',
  border: '1px solid $gray6',
});

export const ToolbarComboBox = styled('select', {
  flex: '0 0 auto',
  color: '$gray12',
  display: 'inline-flex',
  lineHeight: 1,
  fontSize: '0.9rem',
  margin: 0,
  fontWeight: '300',
  border: '1px solid $gray6',
  padding: '0.5rem 0.25rem',
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
});
