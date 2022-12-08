import { ClipboardCopyIcon, Cross2Icon, SizeIcon } from '@radix-ui/react-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from 'src/store';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { delay } from '~/lib/time-utils';
import { ProcessedLogEntry } from '~/store/logging/reducer';
import {
  Dialog,
  DialogContainer,
  DialogOverlay,
  DialogTitle,
  IconButton,
  MultiToggle,
  MultiToggleItem,
  styled,
  theme,
} from '../theme';
import Scrollbar from './utils/Scrollbar';

const Floating = styled('div', {
  position: 'fixed',
  top: '6px',
  right: '10px',
  display: 'flex',
  gap: '3px',
  zIndex: 10,
  transition: 'all 100ms',
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
  opacity: '0.5',
  '&:hover': {
    opacity: '1',
  },
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

function isSupportedLevel(level: string): level is LogLevel {
  return (levels as string[]).includes(level);
}

function formatTime(time: Date): string {
  return [time.getHours(), time.getMinutes(), time.getSeconds()]
    .map((x) => x.toString().padStart(2, '0'))
    .join(':');
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

interface LogItemProps {
  data: ProcessedLogEntry;
}

const LogEntryContainer = styled('div', {
  borderRadius: theme.borderRadius.form,
  backgroundColor: '$gray4',
  display: 'grid',
  gridTemplateColumns: '75px 1fr',
  fontSize: '0.9em',
  variants: {
    level: {
      info: {},
      warn: {
        backgroundColor: '$yellow4',
      },
      error: {
        backgroundColor: '$red6',
      },
    },
  },
});
const LogTime = styled('div', {
  backgroundColor: '$gray6',
  gridColumn: '1',
  gridRow: '1/3',
  padding: '0.2rem 0.5rem',
  textAlign: 'center',
  color: '$gray11',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  borderTopLeftRadius: theme.borderRadius.form,
  borderBottomLeftRadius: theme.borderRadius.form,
  variants: {
    level: {
      info: {},
      warn: {
        color: '$yellow11',
        backgroundColor: '$yellow6',
      },
      error: {
        color: '$red11',
        backgroundColor: '$red7',
      },
    },
  },
});
const LogMessage = styled('div', {
  gridColumn: '2',
  padding: '0.4rem 0.5rem',
  wordBreak: 'break-all',
});
const LogActions = styled('div', {
  gridColumn: '3',
  display: 'flex',
  gap: '10px',
  padding: '0.4rem 12px 0',
  '& a': {
    color: '$gray10',
    '&:hover': {
      color: '$gray12',
      cursor: 'pointer',
    },
  },
  variants: {
    level: {
      info: {},
      warn: {
        '& a:hover': {
          color: '$yellow11',
        },
      },
      error: {
        '& a:hover': {
          color: '$red11',
        },
      },
    },
  },
});
const LogDetails = styled('div', {
  gridRow: '2',
  gridColumn: '2/4',
  display: 'flex',
  gap: '1rem',
  fontSize: '0.8em',
  color: '$gray11',
  backgroundColor: '$gray3',
  padding: '0.5rem 0.5rem 0.3rem',
  borderBottomRightRadius: theme.borderRadius.form,
  borderBottomLeftRadius: theme.borderRadius.form,
  variants: {
    level: {
      info: {},
      warn: {
        backgroundColor: '$yellow3',
      },
      error: {
        backgroundColor: '$red4',
      },
    },
  },
});
const LogDetailItem = styled('div', {
  display: 'flex',
  gap: '0.5rem',
});
const LogDetailKey = styled('div', {
  color: '$teal10',
  variants: {
    level: {
      info: {},
      warn: {
        color: '$yellow11',
      },
      error: {
        color: '$red11',
      },
    },
  },
});
const LogDetailValue = styled('div', { flex: '1' });

function LogItem({ data }: LogItemProps) {
  const { t } = useTranslation();
  const levelStyle = isSupportedLevel(data.level) ? data.level : null;
  const details = Object.entries(data.data).filter(([key]) => key.length > 1);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data.data));
    setCopied(true);
    await delay(2000);
    setCopied(false);
  };
  return (
    <LogEntryContainer level={levelStyle}>
      <LogTime level={levelStyle}>{formatTime(data.time)}</LogTime>
      <LogMessage>{data.message}</LogMessage>
      <LogActions level={levelStyle}>
        {details.length > 0 ? (
          <a
            aria-label={t('logging.toggle-details')}
            title={t('logging.toggle-details')}
            onClick={() => {
              setShowDetails(!showDetails);
            }}
          >
            <SizeIcon />
          </a>
        ) : null}
        {copied ? (
          <span style={{ fontSize: '0.9em' }}>{t('logging.copied')}</span>
        ) : (
          <a
            aria-label={t('logging.copy-to-clipboard')}
            title={t('logging.copy-to-clipboard')}
            onClick={() => {
              void copyToClipboard();
            }}
          >
            <ClipboardCopyIcon />
          </a>
        )}
      </LogActions>
      {details.length > 0 && showDetails ? (
        <LogDetails level={levelStyle}>
          {details.map(([key, value]) => (
            <LogDetailItem>
              <LogDetailKey level={levelStyle}>{key}</LogDetailKey>
              <LogDetailValue>{JSON.stringify(value)}</LogDetailValue>
            </LogDetailItem>
          ))}
        </LogDetails>
      ) : null}
    </LogEntryContainer>
  );
}

const LogEntriesContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
});

interface LogDialogProps {
  initialFilter: LogLevel;
}

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

  const filtered = logEntries.filter(
    (entry) => entry.level in filter && filter[entry.level],
  );

  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogContainer style={{ padding: '0.5rem' }}>
        <DialogTitle
          style={{
            display: 'flex',
            gap: '1rem',
            margin: '-0.5rem',
            marginBottom: '0.5rem',
          }}
        >
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
        <Scrollbar
          vertical={true}
          viewport={{ maxHeight: 'calc(80vh - 100px)' }}
        >
          <LogEntriesContainer>
            {filtered.map((entry) => (
              <LogItem
                key={entry.caller + entry.time.getTime().toString()}
                data={entry}
              />
            ))}
          </LogEntriesContainer>
        </Scrollbar>
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
