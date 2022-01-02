import { PlusIcon } from '@radix-ui/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  FlexRow,
  InputBox,
  PageContainer,
  PageHeader,
  PageTitle,
  TextBlock,
} from '../theme';

export default function TwitchBotCommandsPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>{t('pages.botcommands.title')}</PageTitle>
        <TextBlock>{t('pages.botcommands.desc')}</TextBlock>
      </PageHeader>

      <FlexRow spacing="1" align="left">
        <Button>
          <PlusIcon /> {t('pages.botcommands.add-button')}
        </Button>
        <InputBox
          css={{ flex: 1 }}
          placeholder={t('pages.botcommands.search-placeholder')}
        />
      </FlexRow>
    </PageContainer>
  );
}
