import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { keyframes } from '@stitches/react';
import { styled } from './theme';

export const Alert = AlertDialogPrimitive.Root;
export const AlertTrigger = AlertDialogPrimitive.Trigger;
export const AlertAction = AlertDialogPrimitive.AlertDialogAction;
export const AlertCancel = AlertDialogPrimitive.AlertDialogCancel;

const overlayShow = keyframes({
  '0%': { opacity: 0 },
  '100%': { opacity: 1 },
});

const contentShow = keyframes({
  '0%': { opacity: 0, transform: 'translate(-50%, -48%) scale(.96)' },
  '100%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
});

export const AlertOverlay = styled(AlertDialogPrimitive.Overlay, {
  backgroundColor: '$blackA10',
  position: 'fixed',
  inset: 0,
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${overlayShow()} 150ms cubic-bezier(0.16, 1, 0.3, 1)`,
  },
});

export const AlertContainer = styled(AlertDialogPrimitive.Content, {
  backgroundColor: '$gray2',
  borderRadius: '0.25rem',
  boxShadow:
    'hsl(206 22% 7% / 35%) 0px 10px 38px -10px, hsl(206 22% 7% / 20%) 0px 10px 20px -15px',
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90vw',
  maxWidth: '600px',
  maxHeight: '85vh',
  padding: '1rem',
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${contentShow()} 150ms cubic-bezier(0.16, 1, 0.3, 1)`,
  },
  border: '2px solid $teal8',
  '&:focus': { outline: 'none' },
  variants: {
    variation: {
      default: {},
      danger: {
        borderColor: '$red8',
      },
    },
  },
});

export const AlertTitle = styled(AlertDialogPrimitive.Title, {
  fontWeight: 'bold',
  color: '$gray12',
  fontSize: '15pt',
  borderBottom: '1px solid $teal6',
  margin: '-1rem',
  marginBottom: '1.5rem',
  padding: '1rem',
  lineHeight: '1.25',
  variants: {
    variation: {
      default: {},
      danger: {
        borderBottomColor: '$red6',
      },
    },
  },
});

export const AlertDescription = styled(AlertDialogPrimitive.Description, {
  margin: '10px 0 20px',
  color: '$gray12',
  fontSize: 15,
  lineHeight: 1.5,
  variants: {
    variation: {
      default: {},
      danger: {
        borderBottomColor: '$red12',
      },
    },
  },
});

export const AlertActions = styled('div', {
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'flex-end',
  borderTop: '1px solid $gray6',
  margin: '-1rem',
  marginTop: '1.5rem',
  padding: '1rem 1.5rem',
});

export const IconButton = styled('button', {
  all: 'unset',
  fontFamily: 'inherit',
  borderRadius: '100%',
  height: 25,
  width: 25,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '$teal11',
  position: 'absolute',
  cursor: 'pointer',
  top: 15,
  right: 15,

  '&:hover': { backgroundColor: '$teal4' },
  '&:focus': { boxShadow: `0 0 0 2px $teal7` },
});
