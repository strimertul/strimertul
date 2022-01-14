import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, PageContainer, PageHeader, PageTitle, styled } from '../theme';

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
  const [warningDismissed, setWarningDismissed] = React.useState(false);

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
  return <PageContainer>WIP</PageContainer>;
}
