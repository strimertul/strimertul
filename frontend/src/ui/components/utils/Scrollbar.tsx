import React from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { styled } from '../../theme';

export interface ScrollbarProps {
  vertical?: boolean;
  horizontal?: boolean;
  root?: React.CSSProperties;
  viewport?: React.CSSProperties;
}

const StyledScrollbar = styled(ScrollArea.Scrollbar, {
  display: 'flex',
  userSelect: 'none',
  touchAction: 'none',
  padding: '2px',
  background: '$blackA6',
  transition: 'background 160ms ease-out',
  '&:hover': {
    background: '$blackA8',
  },
});

const StyledThumb = styled(ScrollArea.Thumb, {
  flex: '1',
  background: '$teal6',
  borderRadius: '10px',
  position: 'relative',
  '&:hover': {
    background: '$teal8',
  },
});

function Scrollbar({
  vertical,
  horizontal,
  root,
  viewport,
  children,
}: React.PropsWithChildren<ScrollbarProps>): React.ReactElement {
  return (
    <ScrollArea.Root style={root ?? {}}>
      <ScrollArea.Viewport style={viewport ?? {}}>
        {children}
      </ScrollArea.Viewport>
      {vertical ? (
        <StyledScrollbar orientation="vertical" style={{ width: '10px' }}>
          <StyledThumb />
        </StyledScrollbar>
      ) : null}
      {horizontal ? (
        <StyledScrollbar
          orientation="horizontal"
          style={{ flexDirection: 'column', height: '10px' }}
        >
          <StyledThumb />
        </StyledScrollbar>
      ) : null}
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
}

export default React.memo(Scrollbar);
