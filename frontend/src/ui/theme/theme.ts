import {
  grayDark,
  tealDark,
  yellowDark,
  grassDark,
  redDark,
  blackA,
} from '@radix-ui/colors';
import { globalCss, createStitches } from '@stitches/react';

export const globalStyles = globalCss({
  '*': { boxSizing: 'border-box' },
  body: { margin: 0, padding: 0, backgroundColor: '$gray1', color: '$teal12' },
  html: {
    margin: 0,
    padding: 0,
    fontFamily: "'Intel', 'system-ui', sans-serif",
    '@supports (font-variation-settings: normal)': {
      fontFamily: "'Inter var', 'system-ui', sans-serif",
    },
  },
  a: {
    color: '$teal11',
    '&:visited': {
      color: '$teal11',
    },
  },
});

export const { styled, theme } = createStitches({
  theme: {
    colors: {
      ...grayDark,
      ...tealDark,
      ...yellowDark,
      ...grassDark,
      ...redDark,
      ...blackA,
    },
  },
});
