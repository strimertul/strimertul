import { CheckIcon } from '@radix-ui/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { RequestStatus } from '~/store/api/types';
import { Button } from '../../theme';

interface SaveButtonProps {
  status: RequestStatus;
}

function SaveButton(
  props: SaveButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { t } = useTranslation();

  switch (props.status?.type) {
    case 'success':
      return (
        <Button variation="success" {...props}>
          {t('form-actions.saved')} <CheckIcon />
        </Button>
      );
    case 'error':
      return (
        <Button variation="error" {...props}>
          {t('form-actions.error')}
        </Button>
      );
    default:
      return <Button variation="primary">{t('form-actions.save')}</Button>;
  }
}

export default React.memo(SaveButton);
