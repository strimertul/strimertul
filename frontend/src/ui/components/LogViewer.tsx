import { Cross2Icon } from '@radix-ui/react-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from 'src/store';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Dialog,
  DialogContainer,
  DialogOverlay,
  DialogTitle,
  IconButton,
  MultiToggle,
  MultiToggleItem,
  styled,
} from '../theme';

const Floating = styled('div', {
  position: 'fixed',
  top: '6px',
  right: '10px',
  display: 'flex',
  gap: '3px',
  zIndex: 10,
});

const LogBubble = styled('div', {
  borderRadius: '6px',
  minWidth: '10px',
  minHeight: '10px',
  backgroundColor: '$gray6',
  color: '$gray11',
  padding: '4px 5px 3px',
  lineHeight: '0.7rem',
  fontSize: '0.7rem',
  cursor: 'pointer',
  variants: {
    level: {
      info: {},
      warn: {
        backgroundColor: '$yellow6',
        color: '$yellow11',
      },
      error: {
        backgroundColor: '$red6',
        color: '$red11',
      },
    },
  },
});

const emptyFilter = {
  info: false,
  warn: false,
  error: false,
};
type LogLevel = keyof typeof emptyFilter;
const levels: LogLevel[] = ['info', 'warn', 'error'];

interface LogDialogProps {
  initialFilter: LogLevel;
}

const LevelToggle = styled(MultiToggleItem, {
  variants: {
    level: {
      info: {},
      warn: {
        backgroundColor: '$yellow4',
        '&:hover': {
          backgroundColor: '$yellow5',
        },
        "&[data-state='on']": {
          backgroundColor: '$yellow8',
        },
      },
      error: {
        backgroundColor: '$red4',
        '&:hover': {
          backgroundColor: '$red5',
        },
        "&[data-state='on']": {
          backgroundColor: '$red8',
        },
      },
    },
  },
});

function LogDialog({ initialFilter }: LogDialogProps) {
  const logEntries = useSelector((state: RootState) => state.logging.messages);
  const [filter, setFilter] = useState({
    ...emptyFilter,
    [initialFilter]: true,
  });
  const { t } = useTranslation();
  const enabled = levels.filter((level) => filter[level]);

  const count = logEntries.reduce((acc, entry) => {
    if (entry.level in acc) {
      acc[entry.level] += 1;
    } else {
      acc[entry.level] = 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogContainer>
        <DialogTitle style={{ display: 'flex', gap: '1rem' }}>
          {t('logging.dialog-title')}
          <MultiToggle
            type="multiple"
            aria-label={t(`logging.levelFilter`)}
            value={enabled}
            onValueChange={(values: LogLevel[]) => {
              const newFilter = { ...emptyFilter };
              values.forEach((level) => {
                newFilter[level] = true;
              });
              setFilter(newFilter);
            }}
          >
            {levels.map((level) => (
              <LevelToggle
                key={level}
                size="small"
                level={level}
                value={level}
                aria-label={t(`logging.level.${level}`)}
              >
                {t(`logging.level.${level}`)} ({count[level] ?? 0})
              </LevelToggle>
            ))}
          </MultiToggle>
          <DialogPrimitive.DialogClose asChild>
            <IconButton>
              <Cross2Icon />
            </IconButton>
          </DialogPrimitive.DialogClose>
        </DialogTitle>
        <p></p>
      </DialogContainer>
    </DialogPrimitive.Portal>
  );
}

function LogViewer() {
  const logEntries = useSelector((state: RootState) => state.logging.messages);
  const [activeDialog, setActiveDialog] = useState<LogLevel>(null);

  const count = logEntries.reduce((acc, entry) => {
    if (entry.level in acc) {
      acc[entry.level] += 1;
    } else {
      acc[entry.level] = 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <Floating>
        {levels.map((level) =>
          level in count && count[level] > 0 ? (
            <LogBubble
              key={level}
              level={level}
              onClick={() => setActiveDialog(level)}
            >
              {count[level]}
            </LogBubble>
          ) : null,
        )}
      </Floating>

      <Dialog
        open={!!activeDialog}
        onOpenChange={(open) => {
          if (!open) {
            // Reset dialog status on dialog close
            setActiveDialog(null);
          }
        }}
      >
        {activeDialog ? <LogDialog initialFilter={activeDialog} /> : null}
      </Dialog>
    </div>
  );
}

export default React.memo(LogViewer);
