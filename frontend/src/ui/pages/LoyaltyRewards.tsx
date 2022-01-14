import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageContainer, PageHeader, PageTitle } from '../theme';

export default function LoyaltyRewardsPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>{t('pages.loyalty-rewards.title')}</PageTitle>
      </PageHeader>
    </PageContainer>
  );
}
