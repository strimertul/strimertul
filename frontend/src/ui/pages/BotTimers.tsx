import { PlusIcon } from '@radix-ui/react-icons';
import React, { useState } from 'react';
import { TFunction, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useModule } from '../../lib/react-utils';
import { modules } from '../../store/api/reducer';
import { TwitchBotTimer } from '../../store/api/types';
import AlertContent from '../components/AlertContent';
import DialogContent from '../components/DialogContent';
import Interval, { hours, minutes } from '../components/Interval';
import MultiInput from '../components/MultiInput';
import {
  Button,
  Dialog,
  DialogActions,
  DialogClose,
  Field,
  FlexRow,
  InputBox,
  Label,
  MultiButton,
  PageContainer,
  PageHeader,
  PageTitle,
  styled,
  TextBlock,
} from '../theme';
import { Alert, AlertTrigger } from '../theme/alert';

const TimerList = styled('div', { marginTop: '1rem' });
const TimerItemContainer = styled('article', {
  backgroundColor: '$gray2',
  margin: '0.5rem 0',
  padding: '0.5rem',
  borderLeft: '5px solid $teal8',
  borderRadius: '0.25rem',
  borderBottom: '1px solid $gray4',
  transition: 'all 50ms',
  '&:hover': {
    backgroundColor: '$gray3',
  },
  variants: {
    status: {
      enabled: {},
      disabled: {
        borderLeftColor: '$red7',
        backgroundColor: '$gray3',
        color: '$gray10',
      },
    },
  },
});
const TimerHeader = styled('header', {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  marginBottom: '0.4rem',
});
const TimerName = styled('span', {
  color: '$teal10',
  fontWeight: 'bold',
  variants: {
    status: {
      enabled: {},
      disabled: {
        color: '$gray10',
      },
    },
  },
});
const TimerDescription = styled('span', {
  flex: 1,
});
const TimerActions = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
});
const TimerText = styled('div', {
  fontFamily: 'Space Mono',
  fontSize: '10pt',
  margin: '0 -0.5rem',
  marginTop: '0',
  marginBottom: '0.3rem',
  padding: '0.5rem',
  backgroundColor: '$gray4',
  lineHeight: '1.2rem',
  '&:last-child': {
    marginBottom: '-0.5rem',
  },
});

function humanTime(t: TFunction<'translation'>, secs: number): string {
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);

  if (hrs > 0) {
    return t('time.x-hours', { time: hrs });
  }
  if (mins > 0) {
    return t('time.x-minutes', { time: mins });
  }
  return t('time.x-seconds', { time: secs });
}

interface TimerItemProps {
  name: string;
  item: TwitchBotTimer;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function TimerItem({
  name,
  item,
  onToggle,
  onEdit,
  onDelete,
}: TimerItemProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <TimerItemContainer status={item.enabled ? 'enabled' : 'disabled'}>
      <TimerHeader>
        <TimerName status={item.enabled ? 'enabled' : 'disabled'}>
          {name}
        </TimerName>
        <TimerDescription>
          (
          {t('pages.bottimers.timer-parameters', {
            time: humanTime(t, item.minimum_delay),
            messages: item.minimum_chat_activity,
            interval: humanTime(t, 300),
          })}
          )
        </TimerDescription>
        <TimerActions>
          <MultiButton>
            <Button
              styling="multi"
              size="small"
              onClick={() => (onToggle ? onToggle() : null)}
            >
              {t(item.enabled ? 'form-actions.disable' : 'form-actions.enable')}
            </Button>
            <Button
              styling="multi"
              size="small"
              onClick={() => (onEdit ? onEdit() : null)}
            >
              {t('form-actions.edit')}
            </Button>
            <Alert>
              <AlertTrigger asChild>
                <Button styling="multi" size="small">
                  {t('form-actions.delete')}
                </Button>
              </AlertTrigger>
              <AlertContent
                variation="danger"
                title={t('pages.bottimers.remove-timer-title', { name })}
                description="This cannot be undone"
                actionText="Delete"
                actionButtonProps={{ variation: 'danger' }}
                showCancel={true}
                onAction={() => (onDelete ? onDelete() : null)}
              />
            </Alert>
          </MultiButton>
        </TimerActions>
      </TimerHeader>
      {item.messages?.map((message, index) => (
        <TimerText key={index}>{message}</TimerText>
      ))}
    </TimerItemContainer>
  );
}

type DialogPrompt =
  | { kind: 'new' }
  | { kind: 'edit'; name: string; item: TwitchBotTimer };

function TimerDialog({
  kind,
  name,
  item,
  onSubmit,
}: {
  kind: 'new' | 'edit';
  name?: string;
  item?: TwitchBotTimer;
  onSubmit?: (name: string, item: TwitchBotTimer) => void;
}) {
  const [timerName, setName] = useState(name ?? '');
  const [messages, setMessages] = useState(item?.messages ?? ['']);
  const [minDelay, setMinDelay] = useState(item?.minimum_delay ?? 300);
  const [minActivity, setMinActivity] = useState(
    item?.minimum_chat_activity ?? 5,
  );
  const { t } = useTranslation();

  return (
    <DialogContent title={t(`pages.bottimers.timer-header-${kind}`)}>
      <form
        onSubmit={(e) => {
          if (!(e.target as HTMLFormElement).checkValidity()) {
            return;
          }
          e.preventDefault();
          if (onSubmit) {
            onSubmit(timerName, {
              ...item,
              messages,
              minimum_delay: minDelay,
              minimum_chat_activity: minActivity,
            });
          }
        }}
      >
        <Field spacing="narrow" size="fullWidth">
          <Label htmlFor="timer-name">{t('pages.bottimers.timer-name')}</Label>
          <InputBox
            id="timer-name"
            value={timerName}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('pages.bottimers.timer-name-placeholder')}
            required={true}
          />
        </Field>
        <Field spacing="narrow" size="fullWidth">
          <Label htmlFor="timer-interval">
            {t('pages.bottimers.timer-interval')}
          </Label>
          <FlexRow align="left">
            <Interval
              id="timer-interval"
              value={minDelay}
              onChange={setMinDelay}
              active={true}
              min={60}
              units={[minutes, hours]}
              required={true}
            />
          </FlexRow>
        </Field>
        <Field spacing="narrow" size="fullWidth">
          <Label htmlFor="timer-activity">
            {t('pages.bottimers.timer-activity')}
          </Label>
          <FlexRow align="left" spacing={1}>
            <InputBox
              id="timer-activity"
              value={minActivity}
              type="number"
              css={{
                width: '5rem',
              }}
              required={true}
              onChange={(ev) => {
                const intNum = parseInt(ev.target.value, 10);
                if (Number.isNaN(intNum)) {
                  return;
                }
                setMinActivity(intNum);
              }}
              placeholder="#"
            />
            <span>{t('pages.bottimers.timer-activity-desc')}</span>
          </FlexRow>
        </Field>

        <Field spacing="narrow" size="fullWidth">
          <Label>{t('pages.bottimers.timer-messages')}</Label>
          <MultiInput required={true} value={messages} onChange={setMessages} />
        </Field>

        <DialogActions>
          <Button variation="primary">
            {t(`pages.bottimers.timer-action-${kind}`)}
          </Button>
          <DialogClose asChild>
            <Button type="button">{t('form-actions.cancel')}</Button>
          </DialogClose>
        </DialogActions>
      </form>
    </DialogContent>
  );
}

export default function TwitchBotTimersPage(): React.ReactElement {
  const [timerConfig, setTimerConfig] = useModule(modules.twitchBotTimers);
  const [filter, setFilter] = useState('');
  const [activeDialog, setActiveDialog] = useState<DialogPrompt>(null);
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const filterLC = filter.toLowerCase();

  const setTimer = (newName: string, data: TwitchBotTimer): void => {
    switch (activeDialog.kind) {
      case 'new':
        dispatch(
          setTimerConfig({
            ...timerConfig,
            timers: {
              ...timerConfig.timers,
              [newName]: {
                ...data,
                enabled: true,
              },
            },
          }),
        );
        break;
      case 'edit': {
        const oldName = activeDialog.name;
        dispatch(
          setTimerConfig({
            ...timerConfig,
            timers: {
              ...timerConfig.timers,
              [oldName]: undefined,
              [newName]: data,
            },
          }),
        );
        break;
      }
    }
    setActiveDialog(null);
  };

  const deleteTimer = (cmd: string): void => {
    dispatch(
      setTimerConfig({
        ...timerConfig,
        timers: {
          ...timerConfig.timers,
          [cmd]: undefined,
        },
      }),
    );
  };

  const toggleTimer = (cmd: string): void => {
    dispatch(
      setTimerConfig({
        ...timerConfig,
        timers: {
          ...timerConfig.timers,
          [cmd]: {
            ...timerConfig.timers[cmd],
            enabled: !timerConfig.timers[cmd].enabled,
          },
        },
      }),
    );
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>{t('pages.bottimers.title')}</PageTitle>
        <TextBlock>{t('pages.bottimers.desc')}</TextBlock>
      </PageHeader>

      <FlexRow spacing="1" align="left">
        <Button
          variation="primary"
          onClick={() => setActiveDialog({ kind: 'new' })}
        >
          <PlusIcon /> {t('pages.bottimers.add-button')}
        </Button>

        <InputBox
          css={{ flex: 1 }}
          placeholder={t('pages.bottimers.search-placeholder')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </FlexRow>
      <TimerList>
        {Object.keys(timerConfig?.timers ?? {})
          ?.filter((cmd) => cmd.toLowerCase().includes(filterLC))
          .sort()
          .map((cmd) => (
            <TimerItem
              key={cmd}
              name={cmd}
              item={timerConfig.timers[cmd]}
              onToggle={() => toggleTimer(cmd)}
              onEdit={() =>
                setActiveDialog({
                  kind: 'edit',
                  name: cmd,
                  item: timerConfig.timers[cmd],
                })
              }
              onDelete={() => deleteTimer(cmd)}
            />
          ))}
      </TimerList>

      <Dialog
        open={!!activeDialog}
        onOpenChange={(open) => {
          if (!open) {
            // Reset dialog status on dialog close
            setActiveDialog(null);
          }
        }}
      >
        {activeDialog && (
          <TimerDialog
            {...activeDialog}
            onSubmit={(name, data) => setTimer(name, data)}
          />
        )}
      </Dialog>
    </PageContainer>
  );
}
