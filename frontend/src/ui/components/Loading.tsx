import React from 'react';

// @ts-expect-error Asset import
import spinner from '~/assets/icon-loading.svg';

import { styled, TextBlock } from '../theme';

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
  variants,
});

const Spinner = styled('img', {
  maxWidth: '100px',
});
interface LoadingProps {
  size?: keyof typeof variants.size;
  message: string;
}

export default function Loading({
  message,
  size,
}: React.PropsWithChildren<LoadingProps>) {
  return (
    <LoadingDiv size={size}>
      <Spinner src={spinner as string} alt="Loading..." />
      <TextBlock>{message}</TextBlock>
    </LoadingDiv>
  );
}
