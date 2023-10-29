import { CheckIcon } from '@radix-ui/react-icons';
import {
  GetBackups,
  GetLastLogs,
  RestoreBackup,
  SendCrashReport,
} from '@wailsapp/go/main/App';
import type { main } from '@wailsapp/go/models';
import { EventsOff, EventsOn } from '@wailsapp/runtime';
import React, { Fragment, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { languages } from '~/locale/languages';
import { ProcessedLogEntry, processEntry } from '~/store/logging/reducer';
import DialogContent from '~/ui/components/DialogContent';
import { LogItem } from '~/ui/components/LogViewer';
import Scrollbar from '~/ui/components/utils/Scrollbar';
import {
  Button,
  Checkbox,
  CheckboxIndicator,
  Dialog,
  DialogActions,
  Field,
  FlexRow,
  getTheme,
  InputBox,
  Label,
  MultiToggle,
  MultiToggleItem,
  PageContainer,
  PageHeader,
  SectionHeader,
  styled,
  Textarea,
  TextBlock,
} from '~/ui/theme';
import AlertContent from './components/AlertContent';
import { Alert, AlertDescription, AlertTrigger } from './theme/alert';

const Container = styled('div', {
  position: 'relative',
  display: 'flex',
  flexDirection: 'row',
  overflow: 'hidden',
  height: '100vh',
  border: '2px solid $red10',
  backgroundColor: '$gray1',
  color: '$gray12',
});

const ErrorHeader = styled('h1', {
  color: '$red10',
  textTransform: 'capitalize',
});

const ErrorDetails = styled('dl', {
  display: 'grid',
  gridTemplateColumns: '100px 1fr',
  margin: '0',
});
const ErrorDetailKey = styled('dt', {
  fontWeight: 'bold',
  textTransform: 'capitalize',
  gridColumn: '1',
});
const ErrorDetailValue = styled('dd', {
  padding: '0',
  margin: '0',
  marginBottom: '0.5rem',
  gridColumn: '2',
});

const LogContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
});

const Mono = styled('code', {
  background: '$gray5',
  padding: '3px 5px',
  borderRadius: '3px',
  whiteSpace: 'nowrap',
});

const MiniHeader = styled(SectionHeader, {
  fontSize: '14pt',
});

const LanguageSelector = styled('div', {
  top: '10px',
  right: '10px',
  display: 'flex',
  gap: '1rem',
  position: 'absolute',
  zIndex: '1',
});

const LanguageItem = styled(MultiToggleItem, {
  fontSize: '8pt',
  padding: '5px 6px 4px',
  textTransform: 'uppercase',
});

const BackupItem = styled('article', {
  backgroundColor: '$gray2',
  padding: '0.3rem 1rem 0.3rem 0.5rem',
  borderRadius: '0.25rem',
  borderBottom: '1px solid $gray5',
  transition: 'all 50ms',
  display: 'flex',
  '&:nth-child(odd)': {
    backgroundColor: '$gray3',
  },
  gap: '0.5rem',
});

const BackupDate = styled('div', {
  display: 'flex',
  alignItems: 'center',
  flex: '1',
  gap: '0.5rem',
  fontVariantNumeric: 'tabular-nums',
});
const BackupSize = styled('div', {
  color: '$gray10',
  alignItems: 'center',
  display: 'flex',
});
const BackupActions = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '0.25rem',
});

interface RecoveryDialogProps {
  open: boolean;
  onOpenChange: (state: boolean) => void;
}

// Returns a human-readable version of a byte size
function hrsize(bytes: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB'];
  let fractBytes = bytes;
  while (fractBytes >= 1024) {
    fractBytes /= 1024;
    units.shift();
  }
  return `${fractBytes.toFixed(2)} ${units[0]}`;
}

function RecoveryDialog({ open, onOpenChange }: RecoveryDialogProps) {
  const { t } = useTranslation();
  const [backups, setBackups] = useState<main.BackupInfo[]>([]);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restored, setRestored] = useState<'idle' | 'in-progress' | 'done'>(
    'idle',
  );

  useEffect(() => {
    void GetBackups().then((backupList) => {
      setBackups(backupList);
    });
  }, []);

  const restore = async (filename: string) => {
    setRestored('in-progress');
    try {
      await RestoreBackup(filename);
      setRestoreError(null);
    } catch (err) {
      setRestoreError(err as string);
    }
    setRestored('done');
  };

  if (restored === 'done' && restoreError == null) {
    return (
      <Alert
        defaultOpen={true}
        open={open}
        onOpenChange={(state) => {
          if (onOpenChange) {
            onOpenChange(state);
          }
          setRestored('idle');
        }}
      >
        <AlertContent
          variation="default"
          title={t('pages.crash.recovery.restore-succeeded-title')}
          description={t('pages.crash.recovery.restore-succeeded-body')}
          actionText={t('form-actions.ok')}
          onAction={() => {
            if (onOpenChange) {
              onOpenChange(false);
            }
            setRestored('idle');
          }}
        />
      </Alert>
    );
  }

  return (
    <>
      <Alert
        defaultOpen={false}
        open={!!restoreError}
        onOpenChange={(val: boolean) => {
          if (!val) {
            setRestoreError(null);
          }
        }}
      >
        <AlertContent
          variation="danger"
          title={t('pages.crash.recovery.restore-failed')}
          description={t('pages.crash.recovery.restore-error', {
            error: restoreError ?? 'unknown error',
          })}
          actionText={t('form-actions.ok')}
          onAction={() => {
            setRestoreError(null);
          }}
        />
      </Alert>
      <Dialog
        open={open}
        onOpenChange={(state) => {
          if (onOpenChange) {
            onOpenChange(state);
          }
        }}
      >
        <DialogContent
          title={t('pages.crash.recovery.title')}
          closeButton={true}
        >
          <TextBlock>{t('pages.crash.recovery.text-head')}</TextBlock>
          <SectionHeader>
            {t('pages.crash.recovery.restore-head')}
          </SectionHeader>
          <TextBlock>{t('pages.crash.recovery.restore-desc-1')}</TextBlock>
          <Scrollbar
            vertical={true}
            viewport={{ maxHeight: 'calc(100vh - 450px)', minHeight: '100px' }}
          >
            {backups
              .sort((a, b) => b.date - a.date)
              .map((backup) => {
                const date = new Date(backup.date);

                return (
                  <BackupItem key={backup.filename}>
                    <BackupDate title={backup.filename}>
                      {date.toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                      })}
                      {' - '}
                      {date.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      <BackupSize>{hrsize(backup.size)}</BackupSize>
                    </BackupDate>
                    <BackupActions>
                      <Alert>
                        <AlertTrigger asChild>
                          <Button
                            size="small"
                            disabled={restored === 'in-progress'}
                          >
                            {t('pages.crash.recovery.restore-button')}
                          </Button>
                        </AlertTrigger>
                        <AlertContent
                          variation="danger"
                          title={t(
                            'pages.crash.recovery.restore-confirm-title',
                          )}
                          description={t(
                            'pages.crash.recovery.restore-confirm-body',
                          )}
                          actionText={t('pages.crash.recovery.restore-button')}
                          actionButtonProps={{ variation: 'danger' }}
                          showCancel={true}
                          onAction={() => {
                            void restore(backup.filename);
                          }}
                        />
                      </Alert>
                    </BackupActions>
                  </BackupItem>
                );
              })}
          </Scrollbar>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  errorData?: ProcessedLogEntry;
}

function ReportDialog({ open, onOpenChange, errorData }: ReportDialogProps) {
  const { t } = useTranslation();
  const [errorDesc, setErrorDesc] = useState('');
  const [contactEnabled, setContactEnabled] = useState(false);
  const [contactInfo, setContactInfo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [code, setCode] = useState('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const waiting = submitted && code.length < 1;

  if (code) {
    return (
      <Alert
        open={open}
        onOpenChange={(state) => {
          if (onOpenChange) {
            onOpenChange(state);
          }
        }}
      >
        <AlertContent
          actionText={t('form-actions.ok')}
          onAction={() => {
            setSubmissionError(null);
          }}
        >
          <AlertDescription variation="default">
            <Trans
              t={t}
              i18nKey="pages.crash.report.post-report"
              values={{ code }}
              components={{
                m: (
                  <Mono
                    css={{
                      display: 'block',
                      margin: '10px',
                      textAlign: 'center',
                    }}
                  />
                ),
              }}
            />
          </AlertDescription>
        </AlertContent>
      </Alert>
    );
  }

  return (
    <>
      <Alert
        defaultOpen={false}
        open={!!submissionError}
        onOpenChange={(val: boolean) => {
          if (!val) {
            setSubmissionError(null);
          }
        }}
      >
        <AlertContent
          variation="danger"
          description={t('pages.crash.report.error-message', {
            error: submissionError,
          })}
          actionText={t('form-actions.ok')}
          onAction={() => {
            setSubmissionError(null);
          }}
        />
      </Alert>
      <Dialog
        open={open}
        onOpenChange={(state) => {
          if (onOpenChange) {
            onOpenChange(state);
          }
        }}
      >
        <DialogContent
          title={t('pages.crash.report.dialog-title')}
          closeButton={!waiting}
        >
          <form
            style={waiting ? { opacity: 0.7 } : {}}
            onSubmit={(e) => {
              e.preventDefault();
              let desc = errorDesc;
              if (contactEnabled && contactInfo) {
                desc += `\n\nEmail contact: ${contactInfo}`;
              }
              SendCrashReport(JSON.stringify(errorData), desc)
                .then((submissionCode) => {
                  setCode(submissionCode);
                })
                .catch((err) => {
                  setSubmissionError(err as string);
                });
              setSubmitted(true);
            }}
          >
            <TextBlock css={{ fontSize: '0.9em' }}>
              {t('pages.crash.report.thanks-line')}
            </TextBlock>
            <TextBlock css={{ fontSize: '0.9em' }}>
              {t('pages.crash.report.transparency-line')}
              <ul>
                <li>
                  <Trans
                    t={t}
                    i18nKey="pages.crash.report.transparency-files"
                    values={{
                      A: 'strimertul.log',
                      B: 'strimertul-panic.log',
                    }}
                    components={{
                      m: <Mono />,
                    }}
                  />
                </li>
                <li>{t('pages.crash.report.transparency-info')}</li>
                <li>{t('pages.crash.report.transparency-user')}</li>
              </ul>
            </TextBlock>
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="error-desc">
                {t('pages.crash.report.additional-label')}
              </Label>
              <Textarea
                id="error-desc"
                rows={5}
                value={errorDesc ?? ''}
                onChange={(e) => {
                  setErrorDesc(e.target.value);
                }}
                placeholder={t('pages.crash.report.text-placeholder')}
              >
                {errorDesc ?? ''}
              </Textarea>
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="error-contact">
                <FlexRow align="left" spacing={1}>
                  <Checkbox
                    checked={contactEnabled}
                    onCheckedChange={(ev) => {
                      setContactEnabled(!!ev);
                    }}
                  >
                    <CheckboxIndicator>
                      {contactEnabled && <CheckIcon />}
                    </CheckboxIndicator>
                  </Checkbox>
                  {t('pages.crash.report.email-label')}
                </FlexRow>
              </Label>
              <InputBox
                type="email"
                id="error-contact"
                placeholder={
                  contactEnabled
                    ? t('pages.crash.report.email-placeholder')
                    : ''
                }
                value={contactInfo ?? ''}
                required={contactEnabled}
                disabled={!contactEnabled}
                onChange={(e) => setContactInfo(e.target.value)}
              />
            </Field>
            <DialogActions>
              <Button variation="primary" type="submit" disabled={waiting}>
                {t('pages.crash.report.button-send')}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ErrorWindow(): JSX.Element {
  const [t, i18n] = useTranslation();
  const [logs, setLogs] = useState<ProcessedLogEntry[]>([]);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);

  useEffect(() => {
    void i18n.changeLanguage(localStorage.getItem('language') ?? 'en');
    void GetLastLogs().then((appLogs) => {
      setLogs(appLogs.map(processEntry).reverse());
    });
    EventsOn('log-event', (event: main.LogEntry) => {
      setLogs([processEntry(event), ...logs]);
    });
    return () => {
      EventsOff('log-event');
    };
  }, []);

  const fatal = logs.find((log) => log.level === 'error');
  const theme = getTheme(localStorage.getItem('theme') ?? 'dark');

  return (
    <Container id="app-container" className={theme}>
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        errorData={fatal}
      />
      <RecoveryDialog
        open={recoveryDialogOpen}
        onOpenChange={setRecoveryDialogOpen}
      />
      <LanguageSelector>
        <MultiToggle
          value={i18n.resolvedLanguage}
          type="single"
          onValueChange={(newLang) => {
            void i18n.changeLanguage(newLang);
          }}
        >
          {languages.map((lang) => (
            <LanguageItem
              key={lang.code}
              aria-label={lang.name}
              value={lang.code}
              title={lang.name}
            >
              {lang.code}
            </LanguageItem>
          ))}
        </MultiToggle>
      </LanguageSelector>
      <Scrollbar vertical={true} viewport={{ flex: '1', maxHeight: '100vh' }}>
        <div style={{ width: '100vw' }}>
          <PageContainer>
            <PageHeader>
              <TextBlock>{t('pages.crash.fatal-message')}</TextBlock>
            </PageHeader>
            {fatal ? (
              <>
                <ErrorHeader>{fatal.message}</ErrorHeader>
                <ErrorDetails>
                  {Object.keys(fatal.data)
                    .filter((key) => key.length > 1)
                    .map((key) => (
                      <Fragment key={key}>
                        <ErrorDetailKey>{key}</ErrorDetailKey>
                        <ErrorDetailValue>{fatal.data[key]}</ErrorDetailValue>
                      </Fragment>
                    ))}
                </ErrorDetails>
              </>
            ) : null}
            <SectionHeader>{t('pages.crash.action-header')}</SectionHeader>
            <TextBlock>{t('pages.crash.action-submit-line')}</TextBlock>
            <TextBlock>{t('pages.crash.action-recover-line')}</TextBlock>
            <TextBlock>
              <Trans
                t={t}
                i18nKey="pages.crash.action-log-line"
                values={{
                  A: 'strimertul.log',
                  B: 'strimertul-panic.log',
                }}
                components={{
                  m: <Mono />,
                }}
              />
            </TextBlock>
            <FlexRow align="left" spacing={1} css={{ paddingTop: '0.5rem' }}>
              <Button
                variation={'danger'}
                onClick={() => setReportDialogOpen(true)}
              >
                {t('pages.crash.button-report')}
              </Button>
              <Button onClick={() => setRecoveryDialogOpen(true)}>
                {t('pages.crash.button-recovery')}
              </Button>
            </FlexRow>

            <MiniHeader>{t('pages.crash.app-log-header')}</MiniHeader>
            <LogContainer>
              {logs.map((log) => (
                <LogItem key={log.time.toString()} data={log} />
              ))}
            </LogContainer>
          </PageContainer>
        </div>
      </Scrollbar>
    </Container>
  );
}
