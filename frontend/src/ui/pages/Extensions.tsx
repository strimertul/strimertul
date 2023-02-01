import Editor, { Monaco, useMonaco } from '@monaco-editor/react';
import { InputIcon, PilcrowIcon, PlusIcon } from '@radix-ui/react-icons';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { blankTemplate } from '~/lib/extensions/extension';
import { ExtensionStatus } from '~/lib/extensions/types';
import slug from '~/lib/slug';
import { useAppDispatch, useAppSelector } from '~/store';
import extensionsReducer, {
  ExtensionEntry,
  removeExtension,
  renameExtension,
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

const kilovoltDefinition = `
declare class Kilovolt {
  /**
   * Re-connect to kilovolt server
   */
  reconnect(): void;
  /**
   * Close connection to server
   */
  close(): void;
  /**
   * Wait for websocket connection to be established
   */
  wait(): Promise<void>;
  /**
   * Send a request to the server
   * @param msg Request to send
   * @returns Response from server
   */
  send<T extends KilovoltRequest>(msg: T | Omit<T, "request_id">): Promise<KilovoltMessage>;
  /**
   * Set a key to a specified value
   * @param key Key to set
   * @param data Value to set
   * @returns Reply from server
   */
  putKey(key: string, data: string): Promise<KilovoltMessage>;
  /**
   * Set multiple keys at once
   * @param data Map of key:value data to set
   * @returns Reply from server
   */
  putKeys(data: Record<string, string>): Promise<KilovoltMessage>;
  /**
   * Set a key to the JSON representation of an object
   * @param key Key to set
   * @param data Object to save
   * @returns Reply from server
   */
  putJSON<T>(key: string, data: T): Promise<KilovoltMessage>;
  /**
   * Set multiple keys at once
   * @param data Map of key:value data to set
   * @returns Reply from server
   */
  putJSONs(data: Record<string, unknown>): Promise<KilovoltMessage>;
  /**
   * Retrieve value for key
   * @param key Key to retrieve
   * @returns Reply from server
   */
  getKey(key: string): Promise<string>;
  /**
   * Retrieve value for key
   * @param keys Keys to retrieve
   * @returns Reply from server
   */
  getKeys(keys: string[]): Promise<Record<string, string>>;
  /**
   * Retrieve all keys with given prefix
   * @param prefix Prefix for keys to retrieve
   * @returns Reply from server
   */
  getKeysByPrefix(prefix: string): Promise<Record<string, string>>;
  /**
   * Retrieve object from key, deserialized from JSON.
   * It's your responsibility to make sure the object is actually what you expect
   * @param key Key to retrieve
   * @returns Reply from server
   */
  getJSON<T>(key: string): Promise<T>;
  /**
   * Retrieve objects from keys, deserialized from JSON.
   * It's your responsibility to make sure the object is actually what you expect
   * @param key Key to retrieve
   * @returns Reply from server
   */
  getJSONs<T>(keys: string[]): Promise<T>;
  /**
   * Subscribe to key changes
   * @param key Key to subscribe to
   * @param fn Callback to call when key changes
   * @returns Reply from server
   */
  subscribeKey(key: string, fn: SubscriptionHandler): Promise<KilovoltMessage>;
  /**
   * Stop calling a callback when its related key changes
   * This only
   * @param key Key to unsubscribe from
   * @param fn Callback to stop calling
   * @returns true if a subscription was removed, false otherwise
   */
  unsubscribeKey(key: string, fn: SubscriptionHandler): Promise<boolean>;
  /**
   * Subscribe to key changes on a prefix
   * @param prefix Prefix of keys to subscribe to
   * @param fn Callback to call when key changes
   * @returns Reply from server
   */
  subscribePrefix(prefix: string, fn: SubscriptionHandler): Promise<KilovoltMessage>;
  /**
   * Stop calling a callback when their prefix's related key changes
   * This only
   * @param prefix Prefix to unsubscribe from
   * @param fn Callback to stop calling
   * @returns true if a subscription was removed, false otherwise
   */
  unsubscribePrefix(prefix: string, fn: SubscriptionHandler): Promise<boolean>;
  /**
   * Returns a list of saved keys with the given prefix.
   * If no prefix is given then returns all the keys.
   * @param prefix Optional prefix
   * @returns List of keys
   */
  keyList(prefix?: string): Promise<string[]>;
  /**
   * Delete key from store
   * @param key Key to delete
   * @returns Reply from server
   */
  deleteKey(key: string): Promise<string>;
}
declare var kv: Kilovolt;`;

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
});
const ExtensionActions = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
});

const isRunning = (status: ExtensionStatus) =>
  status === ExtensionStatus.Running || status === ExtensionStatus.Finished;

type ExtensionListItemProps = {
  enabled: boolean;
  entry: ExtensionEntry;
  status: ExtensionStatus;
  onEdit: () => void;
  onRemove: () => void;
  onToggleEnable: () => void;
  onToggleStatus: () => void;
};

function ExtensionListItem(props: ExtensionListItemProps) {
  const { t } = useTranslation();
  return (
    <ExtensionRow
      status={props.enabled && isRunning(props.status) ? 'enabled' : 'disabled'}
    >
      <FlexRow>
        <ExtensionName>
          {props.entry.name} {props.enabled ? `(${props.status})` : null}
        </ExtensionName>
        <ExtensionActions>
          <MultiButton>
            <Button
              styling="multi"
              size="small"
              onClick={() => props.onToggleEnable()}
            >
              {t(
                props.entry.options.enabled
                  ? 'form-actions.disable'
                  : 'form-actions.enable',
              )}
            </Button>
            {props.enabled ? (
              <>
                <Button
                  styling="multi"
                  size="small"
                  onClick={() => props.onToggleStatus()}
                >
                  {t(
                    isRunning(props.status)
                      ? 'form-actions.stop'
                      : 'form-actions.start',
                  )}
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

  monaco.languages.typescript.javascriptDefaults.addExtraLib(source, url);
  monaco.editor.createModel(source, 'typescript', monaco.Uri.parse(url));
};

function ExtensionEditor() {
  const [dialogRename, setDialogRename] = useState({ open: false, name: '' });
  const extensions = useAppSelector((state) => state.extensions);
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const monaco = useMonaco();
  const editor = useRef(null);

  // Normally you can't navigate here without this being set but there is an instant
  // where you can and it messes up the dropdown, so don't render anything for that
  // split second
  if (!extensions.editorCurrentFile) {
    return <></>;
  }

  useEffect(() => {
    if (monaco) {
      monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
      });
      setupLibrary(monaco, kilovoltDefinition, 'ts:index.d.ts');
    }
  }, [monaco]);

  const isUnsaved =
    extensions.editorCurrentFile in extensions.unsaved &&
    extensions.unsaved[extensions.editorCurrentFile] !==
      extensions.installed[extensions.editorCurrentFile]?.source;
  const currentFile = isUnsaved
    ? extensions.unsaved[extensions.editorCurrentFile]
    : extensions.installed[extensions.editorCurrentFile]?.source;
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
              {isUnsaved ? '*' : ''}
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
          disabled={!isUnsaved}
          onClick={() => {
            void dispatch(
              saveExtension({
                name: extensions.editorCurrentFile,
                source: currentFile,
                options:
                  extensions.editorCurrentFile in extensions.installed
                    ? extensions.installed[extensions.editorCurrentFile].options
                    : { enabled: false },
              }),
            );
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
        value={currentFile}
        onChange={(ev) => {
          void dispatch(extensionsReducer.actions.extensionSourceChanged(ev));
        }}
        onMount={(instance) => {
          editor.current = instance;
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
