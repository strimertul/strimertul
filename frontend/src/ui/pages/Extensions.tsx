import Editor from '@monaco-editor/react';
import { InputIcon, PlusIcon } from '@radix-ui/react-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { blankTemplate, Extension } from '~/lib/extensions/extension';
import slug from '~/lib/slug';
import { useAppDispatch, useAppSelector } from '~/store';
import extensionsReducer, { saveExtension } from '~/store/extensions/reducer';
import Loading from '../components/Loading';
import {
  Button,
  ComboBox,
  Field,
  FlexRow,
  InputBox,
  PageContainer,
  PageHeader,
  PageTitle,
  styled,
  TabButton,
  TabContainer,
  TabContent,
  TabList,
} from '../theme';

interface ExtensionListProps {
  extensions: Record<string, Extension>;
  onNewClicked: () => void;
}

function ExtensionList({ extensions, onNewClicked }: ExtensionListProps) {
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
          <Button variation="primary" onClick={() => onNewClicked()}>
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
      {Object.values(extensions)
        ?.filter((r) => r.name.toLowerCase().includes(filterLC))
        .map((e) => (
          <div key={e.name}>{e.name}</div>
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

function ExtensionEditor() {
  const extensions = useAppSelector((state) => state.extensions);
  const dispatch = useAppDispatch();
  const currentFile =
    extensions.editorCurrentFile in extensions.unsaved
      ? extensions.unsaved[extensions.editorCurrentFile]
      : extensions.installed[extensions.editorCurrentFile].source;
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
              {ext}*
            </option>
          ))}
        </EditorDropdown>
        <EditorButton size="small" title="rename script">
          <InputIcon />
        </EditorButton>
        <EditorButton
          size="small"
          disabled={!(extensions.editorCurrentFile in extensions.unsaved)}
          onClick={() => {
            void dispatch(
              saveExtension({
                name: extensions.editorCurrentFile,
                source: currentFile,
                options:
                  extensions.editorCurrentFile in extensions.installed
                    ? extensions.installed[extensions.editorCurrentFile].options
                    : { autostart: false },
              }),
            );
          }}
        >
          Save
        </EditorButton>
      </FlexRow>
      <Editor
        defaultLanguage="javascript"
        theme="vs-dark"
        options={{}}
        value={currentFile}
        onChange={(ev) => {
          void dispatch(extensionsReducer.actions.extensionSourceChanged(ev));
        }}
      />
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
        options: { autostart: false },
      }),
    );

    // Set it as current file in editor
    dispatch(extensionsReducer.actions.editorSelectedFile(defaultName));
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
          extensions={extensions.installed}
          onNewClicked={() => newClicked()}
        />
      </TabContent>
      <TabContent css={{ paddingTop: '0' }} value="editor">
        <ExtensionEditor />
      </TabContent>
    </TabContainer>
  );
}
