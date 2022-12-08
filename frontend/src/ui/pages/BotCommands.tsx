import { PlusIcon } from '@radix-ui/react-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModule } from '~/lib/react-utils';
import { useAppDispatch } from '~/store';
import { modules } from '~/store/api/reducer';
import {
  accessLevels,
  AccessLevelType,
  TwitchBotCustomCommand,
} from '~/store/api/types';
import AlertContent from '../components/AlertContent';
import DialogContent from '../components/DialogContent';
import {
  Button,
  ComboBox,
  Dialog,
  DialogActions,
  DialogClose,
  Field,
  FieldNote,
  FlexRow,
  InputBox,
  Label,
  MultiButton,
  PageContainer,
  PageHeader,
  PageTitle,
  styled,
  Textarea,
  TextBlock,
} from '../theme';
import { Alert, AlertTrigger } from '../theme/alert';

const CommandList = styled('div', { marginTop: '1rem' });
const CommandItemContainer = styled('article', {
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
        borderLeftColor: '$red6',
        backgroundColor: '$gray3',
        color: '$gray10',
      },
    },
  },
});
const CommandHeader = styled('header', {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  marginBottom: '0.4rem',
});
const CommandName = styled('span', {
  color: '$teal10',
  fontWeight: 'bold',
  variants: {
    status: {
      enabled: {},
      disabled: {
        color: '$gray9',
      },
    },
  },
});
const CommandDescription = styled('span', {
  flex: 1,
});
const CommandActions = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
});
const CommandText = styled('div', {
  fontFamily: 'Space Mono',
  fontSize: '10pt',
  margin: '-0.5rem',
  marginTop: '0',
  padding: '0.5rem',
  backgroundColor: '$gray4',
  lineHeight: '1.2rem',
});
const ACLIndicator = styled('span', {
  fontFamily: 'Space Mono',
  fontSize: '10pt',
  marginRight: '0.5rem',
});

const NoneText = styled('div', {
  color: '$gray9',
  fontSize: '1.2em',
  textAlign: 'center',
  fontStyle: 'italic',
  paddingTop: '1rem',
});

interface CommandItemProps {
  name: string;
  item: TwitchBotCustomCommand;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function CommandItem({
  name,
  item,
  onToggle,
  onEdit,
  onDelete,
}: CommandItemProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <CommandItemContainer status={item.enabled ? 'enabled' : 'disabled'}>
      <CommandHeader>
        <CommandName status={item.enabled ? 'enabled' : 'disabled'}>
          {name}
        </CommandName>
        <CommandDescription>{item.description}</CommandDescription>
        <CommandActions>
          {item.access_level !== 'everyone' && (
            <ACLIndicator>
              {t(`pages.botcommands.acl.${item.access_level}`)}
              {item.access_level !== 'streamer' && '+'}
            </ACLIndicator>
          )}
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
                title={t('pages.botcommands.remove-command-title', { name })}
                description={t('form-actions.warning-delete')}
                actionText={t('form-actions.delete')}
                actionButtonProps={{ variation: 'danger' }}
                showCancel={true}
                onAction={() => (onDelete ? onDelete() : null)}
              />
            </Alert>
          </MultiButton>
        </CommandActions>
      </CommandHeader>
      <CommandText>{item.response}</CommandText>
    </CommandItemContainer>
  );
}

type DialogPrompt =
  | { kind: 'new' }
  | { kind: 'edit'; name: string; item: TwitchBotCustomCommand };

function CommandDialog({
  kind,
  name,
  item,
  onSubmit,
}: {
  kind: 'new' | 'edit';
  name?: string;
  item?: TwitchBotCustomCommand;
  onSubmit?: (name: string, item: TwitchBotCustomCommand) => void;
}) {
  const [commands] = useModule(modules.twitchBotCommands);
  const [commandName, setCommandName] = useState(name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [response, setResponse] = useState(item?.response ?? '');
  const [accessLevel, setAccessLevel] = useState(
    item?.access_level ?? 'everyone',
  );
  const { t } = useTranslation();

  return (
    <DialogContent
      title={t(`pages.botcommands.command-header-${kind}`)}
      closeButton={true}
    >
      <form
        onSubmit={(e) => {
          if (!(e.target as HTMLFormElement).checkValidity()) {
            return;
          }
          e.preventDefault();
          if (onSubmit) {
            onSubmit(commandName, {
              ...item,
              description,
              response,
              access_level: accessLevel,
            });
          }
        }}
      >
        <Field spacing="narrow" size="fullWidth">
          <Label htmlFor="command-name">
            {t('pages.botcommands.command-name')}
          </Label>
          <InputBox
            id="command-name"
            value={commandName}
            required={true}
            onChange={(e) => {
              setCommandName(e.target.value);
              // If command name is different but matches another defined command, set as invalid
              if (e.target.value !== name && e.target.value in commands) {
                (e.target as HTMLInputElement).setCustomValidity(
                  t('pages.botcommands.command-already-in-use'),
                );
              } else {
                (e.target as HTMLInputElement).setCustomValidity('');
              }
            }}
            placeholder={t('pages.botcommands.command-name-placeholder')}
          />
        </Field>
        <Field spacing="narrow" size="fullWidth">
          <Label htmlFor="command-description">
            {t('pages.botcommands.command-desc')}
          </Label>
          <InputBox
            id="command-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('pages.botcommands.command-desc-placeholder')}
          />
        </Field>
        <Field spacing="narrow" size="fullWidth">
          <Label htmlFor="command-response">
            {t('pages.botcommands.command-response')}
          </Label>
          <Textarea
            value={response}
            required={true}
            onChange={(e) => setResponse(e.target.value)}
            id="command-response"
            placeholder={t('pages.botcommands.command-response-placeholder')}
          >
            {item?.response}
          </Textarea>
        </Field>
        <Field spacing="narrow" size="fullWidth">
          <Label htmlFor="command-acl">
            {t('pages.botcommands.command-acl')}
          </Label>
          <ComboBox
            id="command-acl"
            value={accessLevel}
            onChange={(e) => setAccessLevel(e.target.value as AccessLevelType)}
          >
            {accessLevels.map((level) => (
              <option key={level} value={level}>
                {t(`pages.botcommands.acl.${level}`)}
              </option>
            ))}
          </ComboBox>
          <FieldNote>{t('pages.botcommands.command-acl-help')}</FieldNote>
        </Field>
        <DialogActions>
          <Button variation="primary">
            {kind === 'new' ? t('form-actions.create') : t('form-actions.edit')}
          </Button>
          <DialogClose asChild>
            <Button type="button">{t('form-actions.cancel')}</Button>
          </DialogClose>
        </DialogActions>
      </form>
    </DialogContent>
  );
}

export default function TwitchBotCommandsPage(): React.ReactElement {
  const [commands, setCommands] = useModule(modules.twitchBotCommands);
  const [filter, setFilter] = useState('');
  const [activeDialog, setActiveDialog] = useState<DialogPrompt>(null);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const filterLC = filter.toLowerCase();

  const setCommand = (newName: string, data: TwitchBotCustomCommand): void => {
    switch (activeDialog.kind) {
      case 'new':
        void dispatch(
          setCommands({
            ...commands,
            [newName]: {
              ...data,
              enabled: true,
            },
          }),
        );
        break;
      case 'edit': {
        const oldName = activeDialog.name;
        void dispatch(
          setCommands({
            ...commands,
            [oldName]: undefined,
            [newName]: data,
          }),
        );
        break;
      }
    }
    setActiveDialog(null);
  };

  const deleteCommand = (cmd: string): void => {
    void dispatch(
      setCommands({
        ...commands,
        [cmd]: undefined,
      }),
    );
  };

  const toggleCommand = (cmd: string): void => {
    void dispatch(
      setCommands({
        ...commands,
        [cmd]: {
          ...commands[cmd],
          enabled: !commands[cmd].enabled,
        },
      }),
    );
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>{t('pages.botcommands.title')}</PageTitle>
        <TextBlock>{t('pages.botcommands.desc')}</TextBlock>
      </PageHeader>

      <FlexRow spacing="1" align="left">
        <Button
          variation="primary"
          onClick={() => setActiveDialog({ kind: 'new' })}
        >
          <PlusIcon /> {t('pages.botcommands.add-button')}
        </Button>

        <InputBox
          css={{ flex: 1 }}
          placeholder={t('pages.botcommands.search-placeholder')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </FlexRow>
      <CommandList>
        {commands ? (
          Object.keys(commands ?? {})
            ?.filter(
              (cmd) =>
                cmd.toLowerCase().includes(filterLC) ||
                commands[cmd].description.toLowerCase().includes(filterLC),
            )
            .sort()
            .map((cmd) => (
              <CommandItem
                key={cmd}
                name={cmd}
                item={commands[cmd]}
                onToggle={() => toggleCommand(cmd)}
                onEdit={() =>
                  setActiveDialog({
                    kind: 'edit',
                    name: cmd,
                    item: commands[cmd],
                  })
                }
                onDelete={() => deleteCommand(cmd)}
              />
            ))
        ) : (
          <NoneText>{t('pages.botcommands.no-commands')}</NoneText>
        )}
      </CommandList>

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
          <CommandDialog
            {...activeDialog}
            onSubmit={(name, data) => setCommand(name, data)}
          />
        )}
      </Dialog>
    </PageContainer>
  );
}
