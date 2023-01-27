import Editor from '@monaco-editor/react';
import { PlusIcon } from '@radix-ui/react-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '~/store';
import extensionsReducer, { ExtensionEntry } from '~/store/extensions/reducer';
import DialogContent from '../components/DialogContent';
import Loading from '../components/Loading';
import {
  Button,
  Dialog,
  DialogActions,
  Field,
  FlexRow,
  InputBox,
  Label,
  PageContainer,
  PageHeader,
  PageTitle,
} from '../theme';

export default function ExtensionsPage(): React.ReactElement {
  const { t } = useTranslation();
  const extensions = useAppSelector((state) => state.extensions);
  const dispatch = useAppDispatch();
  const [currentExtension, setCurrentExtension] = useState<{
    open: boolean;
    new: boolean;
    entry: ExtensionEntry;
  }>({ open: false, new: false, entry: null });
  const [filter, setFilter] = useState('');
  const filterLC = filter.toLowerCase();

  if (!extensions.ready) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>{t('pages.extensions.title')}</PageTitle>
        </PageHeader>
        <Loading
          size="fill"
          message={'one second, the extension subsystem is still not ready'}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>{t('pages.extensions.title')}</PageTitle>
      </PageHeader>
      <div>
        <Field size="fullWidth" spacing="none">
          <FlexRow css={{ flex: 1, alignItems: 'stretch' }} spacing="1">
            <Button
              variation="primary"
              onClick={() => {
                setCurrentExtension({
                  open: true,
                  new: true,
                  entry: {
                    name: '',
                    source: '',
                    options: {
                      autostart: true,
                    },
                  },
                });
              }}
            >
              <PlusIcon /> new extension
            </Button>
            <InputBox
              css={{ flex: 1 }}
              placeholder="search by name"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </FlexRow>
        </Field>
        {Object.values(extensions.installed)
          ?.filter((r) => r.name.toLowerCase().includes(filterLC))
          .map((e) => (
            <div key={e.name}>{e.name}</div>
          ))}
      </div>
      <Dialog
        open={currentExtension.open}
        onOpenChange={(state) =>
          setCurrentExtension({ ...currentExtension, open: state })
        }
      >
        <DialogContent
          title={currentExtension.new ? 'new extension' : 'edit extension'}
          closeButton={true}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if ((e.target as HTMLFormElement).checkValidity()) {
                dispatch(
                  extensionsReducer.actions.extensionAdded(
                    currentExtension.entry,
                  ),
                );
                setCurrentExtension({ ...currentExtension, open: false });
              }
            }}
          >
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="d-name">name</Label>
              <InputBox
                disabled={!currentExtension.new}
                id="d-name"
                value={currentExtension.entry?.name ?? ''}
                required={true}
                onChange={(e) =>
                  setCurrentExtension({
                    ...currentExtension,
                    entry: { ...currentExtension.entry, name: e.target.value },
                  })
                }
              />
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <Label>source</Label>
              <Editor
                height="50vh"
                defaultLanguage="javascript"
                defaultValue="// some comment"
                theme="vs-dark"
                value={currentExtension.entry?.source}
                onChange={(e) =>
                  setCurrentExtension({
                    ...currentExtension,
                    entry: { ...currentExtension.entry, source: e },
                  })
                }
              />
            </Field>
            <DialogActions>
              <Button variation="primary" type="submit">
                {t('form-actions.save')}
              </Button>
              <Button
                onClick={() =>
                  setCurrentExtension({ ...currentExtension, open: false })
                }
                type="button"
              >
                {t('form-actions.cancel')}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
