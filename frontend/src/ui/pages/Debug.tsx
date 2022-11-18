import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  Button,
  Field,
  FieldNote,
  FlexRow,
  InputBox,
  Label,
  PageContainer,
  PageHeader,
  PageTitle,
  styled,
  Textarea,
} from '../theme';

const Disclaimer = styled('div', {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'column',
  flex: '1',
  height: '100vh',
});

const DisclaimerTitle = styled('h1', {
  margin: 0,
});

const DisclaimerParagraph = styled('p', {
  margin: '2rem 1rem',
});

export default function DebugPage(): React.ReactElement {
  const { t } = useTranslation();
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [readKey, setReadKey] = useState('');
  const [readValue, setReadValue] = useState('');
  const [writeKey, setWriteKey] = useState('');
  const [writeValue, setWriteValue] = useState('');
  const [writeErrorMsg, setWriteErrorMsg] = useState<string>(null);
  const api = useSelector((state: RootState) => state.api.client);

  const performRead = async () => {
    const value = await api.getKey(readKey);
    setReadValue(value);
  };
  const performWrite = async () => {
    await api.putKey(writeKey, writeValue);
  };
  const fixJSON = () => {
    try {
      setWriteValue(JSON.stringify(JSON.parse(writeValue)));
      setWriteErrorMsg(null);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setWriteErrorMsg(e.message);
      }
    }
  };
  const dumpKeys = async () => {
    console.log(await api.keyList());
  };
  const dumpAll = async () => {
    console.log(await api.getKeysByPrefix(''));
  };

  if (!warningDismissed) {
    return (
      <Disclaimer>
        <DisclaimerTitle>{t('pages.debug.disclaimer-header')}</DisclaimerTitle>
        <DisclaimerParagraph>
          {t('pages.debug.big-ass-warning')}
        </DisclaimerParagraph>
        <Button variation="primary" onClick={() => setWarningDismissed(true)}>
          {t('pages.debug.dismiss-warning')}
        </Button>
      </Disclaimer>
    );
  }
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>{t('pages.debug.title')}</PageTitle>
      </PageHeader>
      <Field size="fullWidth">
        <Label htmlFor="read-key">{t('pages.debug.console-ops')}</Label>
        <FlexRow align="left" spacing="1">
          <Button
            type="button"
            onClick={() => {
              void dumpKeys();
            }}
          >
            {t('pages.debug.dump-keys')}
          </Button>
          <Button
            type="button"
            onClick={() => {
              void dumpAll();
            }}
          >
            {t('pages.debug.dump-all')}
          </Button>
        </FlexRow>
      </Field>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if ((e.target as HTMLFormElement).checkValidity()) {
            void performRead();
          }
        }}
      >
        <Field size="fullWidth">
          <Label htmlFor="read-key">{t('pages.debug.read-key')}</Label>
          <FlexRow spacing="1">
            <InputBox
              required
              value={readKey ?? ''}
              onChange={(e) => setReadKey(e.target.value)}
              id="read-key"
              css={{ flex: '1' }}
            />
            <Button type="submit">{t('form-actions.submit')}</Button>
          </FlexRow>
          <Textarea value={readValue ?? ''} readOnly>
            {readValue ?? ''}
          </Textarea>
        </Field>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if ((e.target as HTMLFormElement).checkValidity()) {
            void performWrite();
          }
        }}
      >
        <Field size="fullWidth">
          <Label htmlFor="write-key">{t('pages.debug.write-key')}</Label>
          <FlexRow spacing={1}>
            <InputBox
              required
              value={writeKey ?? ''}
              onChange={(e) => setWriteKey(e.target.value)}
              id="write-key"
              css={{ flex: '1' }}
            />
            <Button type="button" onClick={() => fixJSON()}>
              {t('pages.debug.fix-json')}
            </Button>
            <Button type="submit">{t('form-actions.submit')}</Button>
          </FlexRow>
          <Textarea
            required
            value={writeValue ?? ''}
            onChange={(e) => setWriteValue(e.target.value)}
          >
            {writeValue ?? ''}
          </Textarea>
          {writeErrorMsg && <FieldNote>{writeErrorMsg}</FieldNote>}
        </Field>
      </form>
    </PageContainer>
  );
}
