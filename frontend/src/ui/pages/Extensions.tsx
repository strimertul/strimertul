import Editor, { Monaco, useMonaco } from '@monaco-editor/react';
import {
  ExclamationTriangleIcon,
  InfoCircledIcon,
  InputIcon,
  PilcrowIcon,
  PlusIcon,
} from '@radix-ui/react-icons';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { blankTemplate } from '~/lib/extensions/extension';
import { kilovoltDefinition } from '~/lib/extensions/helpers';
import { parseExtensionMetadata } from '~/lib/extensions/metadata';
import { ExtensionStatus } from '~/lib/extensions/types';
import slug from '~/lib/slug';
import * as HoverCard from '@radix-ui/react-hover-card';
import { useAppDispatch, useAppSelector } from '~/store';
import extensionsReducer, {
  currentFile,
  ExtensionEntry,
  isUnsaved,
  removeExtension,
  renameExtension,
  saveCurrentExtension,
  saveExtension,
  startExtension,
  stopExtension,
} from '~/store/extensions/reducer';
import AlertContent from '../components/AlertContent';
import DialogContent from '../components/DialogContent';
import Loading from '../components/Loading';
import {
  Button,
  ComboBox,
  ControlledInputBox,
  Dialog,
  DialogActions,
  Field,
  FlexRow,
  InputBox,
  Label,
  MultiButton,
  PageContainer,
  PageHeader,
  PageTitle,
  styled,
  TabButton,
  TabContainer,
  TabContent,
  TabList,
} from '../theme';
import { Alert, AlertTrigger } from '../theme/alert';

const ExtensionRow = styled('article', {
  marginBottom: '0.4rem',
  backgroundColor: '$gray2',
  margin: '0.5rem 0',
  padding: '0.3rem 0.5rem',
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

const ExtensionName = styled('div', {
  flex: '1',
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'baseline',
});
const ExtensionStatusNote = styled('div', {
  textTransform: 'uppercase',
  fontSize: '10pt',
  color: '$gray10',
  variants: {
    color: {
      active: {
        color: '$teal11',
      },
      error: {
        color: '$red9',
      },
    },
  },
});
const ExtensionActions = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
});

const ExtensionInfoCard = styled(HoverCard.Content, {
  borderRadius: 6,
  display: 'flex',
  padding: '0.5rem',
  width: '300px',
  gap: '0.5rem',
  flexDirection: 'column',
  border: '2px solid $gray6',
  backgroundColor: '$gray2',
  alignItems: 'flex-start',
  boxShadow: '0px 5px 20px rgba(0,0,0,0.4)',
  animationDuration: '400ms',
  animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
  willChange: 'transform, opacity',
});

const isRunning = (status: ExtensionStatus) =>
  status === ExtensionStatus.Running || status === ExtensionStatus.Finished;

const colorByStatus = (status: ExtensionStatus) => {
  if (isRunning(status)) {
    return 'active';
  }
  if (status === ExtensionStatus.Error) {
    return 'error';
  }
  return null;
};

type ExtensionListItemProps = {
  enabled: boolean;
  entry: ExtensionEntry;
  status: ExtensionStatus;
  error?: Error | ErrorEvent;
  onEdit: () => void;
  onRemove: () => void;
  onToggleEnable: () => void;
  onToggleStatus: () => void;
};

function ExtensionListItem(props: ExtensionListItemProps) {
  const { t } = useTranslation();
  const metadata = parseExtensionMetadata(props.entry.source);
  const version = useAppSelector((state) => state.server.version?.release);
  const isDev = version && version.startsWith('v0.0.0');
  const showIncompatibleWarning =
    !isDev && version && version < `v${metadata.apiversion}`;

  return (
    <ExtensionRow
      status={props.enabled && isRunning(props.status) ? 'enabled' : 'disabled'}
    >
      <FlexRow>
        <ExtensionName>
          {metadata ? (
            <HoverCard.Root>
              <HoverCard.Trigger asChild>
                <FlexRow css={{ gap: '0.3rem' }}>
                  {props.entry.name}
                  <InfoCircledIcon />
                </FlexRow>
              </HoverCard.Trigger>
              <HoverCard.Portal>
                <ExtensionInfoCard sideOffset={5}>
                  <div>
                    <b>{metadata.name || 'Unnamed extension'}</b>{' '}
                    {metadata.version ? `v${metadata.version}` : null}
                    {metadata.author ? ` by ${metadata.author}` : null}
                  </div>
                  {metadata.description ? (
                    <small>{metadata.description}</small>
                  ) : null}
                </ExtensionInfoCard>
              </HoverCard.Portal>
            </HoverCard.Root>
          ) : (
            props.entry.name
          )}
          {props.enabled ? (
            <>
              <ExtensionStatusNote color={colorByStatus(props.status)}>
                {t(`pages.extensions.statuses.${props.status}`)}
              </ExtensionStatusNote>
              {showIncompatibleWarning ? (
                <Alert>
                  <AlertTrigger asChild>
                    <Button variation="warning" size="small">
                      <ExclamationTriangleIcon />
                    </Button>
                  </AlertTrigger>
                  <AlertContent
                    title={t('pages.extensions.incompatible-warning')}
                    showCancel={false}
                  >
                    {t('pages.extensions.incompatible-body', {
                      version: metadata.apiversion,
                      appversion: version,
                    })}
                  </AlertContent>
                </Alert>
              ) : null}
              {props.error ? (
                <Alert>
                  <AlertTrigger asChild>
                    <Button variation="danger" size="small">
                      <ExclamationTriangleIcon />
                    </Button>
                  </AlertTrigger>
                  <AlertContent
                    variation="danger"
                    title={t('pages.extensions.error-alert', {
                      name: props.entry.name,
                    })}
                    actionButtonProps={{
                      variation: 'danger',
                    }}
                    showCancel={false}
                  >
                    <code>{props.error.toString()}</code>
                  </AlertContent>
                </Alert>
              ) : null}
            </>
          ) : null}
        </ExtensionName>
        <ExtensionActions>
          <MultiButton>
            <Button
              styling="multi"
              size="small"
              onClick={() => props.onToggleEnable()}
            >
              {props.entry.options.enabled
                ? t('form-actions.disable')
                : t('form-actions.enable')}
            </Button>
            {props.enabled ? (
              <>
                <Button
                  styling="multi"
                  size="small"
                  onClick={() => props.onToggleStatus()}
                >
                  {isRunning(props.status)
                    ? t('form-actions.stop')
                    : t('form-actions.start')}
                </Button>
              </>
            ) : null}

            <Button styling="multi" size="small" onClick={() => props.onEdit()}>
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
                title={t('pages.extensions.remove-alert', {
                  name: props.entry.name,
                })}
                description={t('form-actions.warning-delete')}
                actionText={t('form-actions.delete')}
                actionButtonProps={{ variation: 'danger' }}
                showCancel={true}
                onAction={() => props.onRemove()}
              />
            </Alert>
          </MultiButton>
        </ExtensionActions>
      </FlexRow>
    </ExtensionRow>
  );
}

interface ExtensionListProps {
  onNew: () => void;
  onEdit: (name: string) => void;
}

function ExtensionList({ onNew, onEdit }: ExtensionListProps) {
  const extensions = useAppSelector((state) => state.extensions);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const filterLC = filter.toLowerCase();

  return (
    <PageContainer spacing="narrow">
      <PageHeader>
        <PageTitle>{t('pages.extensions.title')}</PageTitle>
      </PageHeader>
      <Field size="fullWidth" spacing="none">
        <FlexRow css={{ flex: 1, alignItems: 'stretch' }} spacing="1">
          <Button variation="primary" onClick={() => onNew()}>
            <PlusIcon /> {t('pages.extensions.create')}
          </Button>
          <InputBox
            css={{ flex: 1 }}
            placeholder={t('pages.extensions.search')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </FlexRow>
      </Field>
      {Object.values(extensions.installed)
        ?.filter((r) => r.name.toLowerCase().includes(filterLC))
        .map((e) => (
          <ExtensionListItem
            key={e.name}
            entry={e}
            enabled={e.options.enabled}
            status={extensions.status[e.name]}
            error={extensions.running[e.name]?.error}
            onEdit={() => onEdit(e.name)}
            onRemove={() => {
              // Toggle enabled status
              void dispatch(removeExtension(e.name));
            }}
            onToggleEnable={() => {
              // Toggle enabled status
              void dispatch(
                saveExtension({
                  ...e,
                  options: {
                    ...e.options,
                    enabled: !e.options.enabled,
                  },
                }),
              );
            }}
            onToggleStatus={() => {
              if (isRunning(extensions.status[e.name])) {
                void dispatch(stopExtension(e.name));
              } else {
                void dispatch(startExtension(e.name));
              }
            }}
          />
        ))}
    </PageContainer>
  );
}

const EditorButton = styled(Button, {
  borderRadius: '0',
  border: 'none',
  '&:disabled': {
    border: '0',
    backgroundColor: '$gray5',
    color: '$gray9',
    cursor: 'not-allowed',
  },
});
const EditorDropdown = styled(ComboBox, {
  borderRadius: '0',
  border: 'none',
  padding: '0.3rem 0.5rem',
  fontSize: '0.9rem',
});

const setupLibrary = (monaco: Monaco, source: string, url: string) => {
  // Prevent model from being added twice
  const models = monaco.editor.getModels();
  if (models.some((lt) => lt.uri.toString() === url)) {
    return;
  }

  monaco.languages.typescript.typescriptDefaults.addExtraLib(source, url);
  monaco.editor.createModel(source, 'typescript', monaco.Uri.parse(url));
};

function ExtensionEditor() {
  const [dialogRename, setDialogRename] = useState({ open: false, name: '' });
  const extensions = useAppSelector((state) => state.extensions);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const monaco = useMonaco();
  const editor = useRef(null);

  useEffect(() => {
    if (monaco) {
      monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        diagnosticCodesToIgnore: [1375, 2792],
      });
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        allowNonTsExtensions: true,
      });
      setupLibrary(monaco, kilovoltDefinition, 'ts:index.d.ts');
    }
  }, [monaco]);

  // Normally you can't navigate here without this being set but there is an instant
  // where you can and it messes up the dropdown, so don't render anything for that
  // split second
  if (!extensions.editorCurrentFile) {
    return <></>;
  }

  const isModified = isUnsaved(extensions);
  const currentFileSource = currentFile(extensions);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 40px)',
      }}
    >
      <FlexRow
        css={{ alignItems: 'stretch', borderBottom: '1px solid $gray5' }}
        align="left"
      >
        <EditorDropdown
          value={extensions.editorCurrentFile}
          onChange={(ev) => {
            void dispatch(
              extensionsReducer.actions.editorSelectedFile(ev.target.value),
            );
          }}
          css={{ flex: '1' }}
        >
          {Object.values(extensions.installed)
            .filter((ext) => !(ext.name in extensions.unsaved)) // Hide those with changes
            .map((ext) => (
              <option key={ext.name} value={ext.name}>
                {ext.name}
              </option>
            ))}
          {Object.keys(extensions.unsaved).map((ext) => (
            <option key={ext} value={ext}>
              {ext}
              {isModified ? '*' : ''}
            </option>
          ))}
        </EditorDropdown>
        <EditorButton
          size="small"
          title={t('pages.extensions.rename')}
          onClick={() =>
            setDialogRename({ open: true, name: extensions.editorCurrentFile })
          }
        >
          <InputIcon />
        </EditorButton>
        <EditorButton
          size="small"
          title={t('pages.extensions.format')}
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            editor.current.getAction('editor.action.formatDocument').run();
          }}
        >
          <PilcrowIcon />
        </EditorButton>
        <EditorButton
          size="small"
          disabled={!isModified}
          onClick={() => {
            void dispatch(saveCurrentExtension());
          }}
        >
          {t('form-actions.save')}
        </EditorButton>
      </FlexRow>
      <Editor
        language="typescript"
        theme="vs-dark"
        options={{
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,
          wordWrap: 'on',
          automaticLayout: true,
        }}
        value={currentFileSource}
        onChange={(ev) => {
          void dispatch(extensionsReducer.actions.extensionSourceChanged(ev));
        }}
        onMount={(instance, m) => {
          editor.current = instance;
          instance.addCommand(
            // eslint-disable-next-line no-bitwise
            m.KeyMod.CtrlCmd | m.KeyCode.KeyS,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            () => {
              void dispatch(saveCurrentExtension());
            },
          );
        }}
      />
      <Dialog
        open={dialogRename.open}
        onOpenChange={(state) =>
          setDialogRename({ ...dialogRename, open: state })
        }
      >
        <DialogContent
          title={t('pages.extensions.rename-dialog', {
            name: extensions.editorCurrentFile,
          })}
          closeButton={true}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!(e.target as HTMLFormElement).checkValidity()) {
                return;
              }

              // Only rename if it changed
              if (extensions.editorCurrentFile !== dialogRename.name) {
                void dispatch(
                  renameExtension({
                    from: extensions.editorCurrentFile,
                    to: dialogRename.name,
                  }),
                );
              }

              setDialogRename({ ...dialogRename, open: false });
            }}
          >
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="renamed">
                {t('pages.extensions.rename-new-name')}
              </Label>
              <ControlledInputBox
                id="renamed"
                type="text"
                required
                value={dialogRename.name}
                onChange={(e) => {
                  setDialogRename({
                    ...dialogRename,
                    name: e.target.value,
                  });
                  if (
                    Object.values(extensions.installed).find(
                      (r) => r.name === e.target.value,
                    )
                  ) {
                    (e.target as HTMLInputElement).setCustomValidity(
                      t('pages.extensions.name-already-in-use'),
                    );
                  } else {
                    (e.target as HTMLInputElement).setCustomValidity('');
                  }
                }}
              />
            </Field>
            <DialogActions>
              <Button variation="primary" type="submit">
                {t('form-actions.rename')}
              </Button>
              <Button
                type="button"
                onClick={() =>
                  setDialogRename({ ...dialogRename, open: false })
                }
              >
                {t('form-actions.cancel')}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ExtensionsPage(): React.ReactElement {
  const { t } = useTranslation();
  const extensions = useAppSelector((state) => state.extensions);
  const dispatch = useAppDispatch();
  const [currentTab, setCurrentTab] = useState('list');

  const newClicked = () => {
    // Create new empty file
    let defaultName = '';
    do {
      defaultName = slug();
    } while (
      defaultName in extensions.installed ||
      defaultName in extensions.unsaved
    );

    // Add as draft
    dispatch(
      extensionsReducer.actions.extensionDrafted({
        name: defaultName,
        source: blankTemplate(defaultName),
        options: { enabled: false },
      }),
    );

    // Set it as current file in editor
    dispatch(extensionsReducer.actions.editorSelectedFile(defaultName));
    setCurrentTab('editor');
  };

  const editClicked = (name: string) => {
    // Set it as current file in editor
    dispatch(extensionsReducer.actions.editorSelectedFile(name));
    setCurrentTab('editor');
  };

  if (!extensions.ready) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>{t('pages.extensions.title')}</PageTitle>
        </PageHeader>
        <Loading size="fill" message={t('pages.extensions.loading')} />
      </PageContainer>
    );
  }

  return (
    <TabContainer
      value={currentTab}
      onValueChange={(newval) => setCurrentTab(newval)}
    >
      <TabList>
        <TabButton value="list">{t('pages.extensions.tab-manage')}</TabButton>
        <TabButton value="editor" disabled={!extensions.editorCurrentFile}>
          {t('pages.extensions.tab-editor')}
        </TabButton>
      </TabList>
      <TabContent css={{ paddingTop: '1rem' }} value="list">
        <ExtensionList
          onNew={() => newClicked()}
          onEdit={(name) => editClicked(name)}
        />
      </TabContent>
      <TabContent css={{ paddingTop: '0' }} value="editor">
        <ExtensionEditor />
      </TabContent>
    </TabContainer>
  );
}
