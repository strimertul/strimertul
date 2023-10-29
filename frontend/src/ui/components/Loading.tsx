import React from 'react';

// @ts-expect-error Asset import
import spinner from '~/assets/icon-loading.svg';

import { lightMode, styled, TextBlock } from '../theme';

const variants = {
  size: {
    fullscreen: {
      minHeight: '100vh',
    },
    fill: {
      flex: '1',
      height: '100%',
    },
  },
};

const LoadingDiv = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '$gray1',
  color: '$gray12',
  variants,
});

const Spinner = styled('img', {
  maxWidth: '100px',
  [`.${lightMode} &`]: {
    filter: 'invert(0.5) sepia(100%) hue-rotate(140deg);',
  },
});
interface LoadingProps {
  size?: keyof typeof variants.size;
  message: string;
  theme: string;
}

export default function Loading({
  message,
  size,
  theme,
}: React.PropsWithChildren<LoadingProps>) {
  return (
    <LoadingDiv size={size} className={theme}>
      <Spinner src={spinner as string} alt="Loading..." />
      <TextBlock>{message}</TextBlock>
    </LoadingDiv>
  );
}
