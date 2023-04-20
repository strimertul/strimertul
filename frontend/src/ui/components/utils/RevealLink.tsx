import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../theme';

export interface RevealLinkProps {
  value: boolean;
  setter: (newValue: boolean) => void;
}

function RevealLink({ value, setter }: RevealLinkProps) {
  const { t } = useTranslation();
  const text = value
    ? t('form-actions.password-hide')
    : t('form-actions.password-reveal');
  return (
    <Button
      type="button"
      css={{ display: 'inline-flex', marginLeft: '0.5rem' }}
      onClick={() => {
        if (setter) {
          setter(!value);
        }
      }}
      size={'smaller'}
    >
      {text}
    </Button>
  );
}

const PureRevealLink = React.memo(RevealLink);
export default PureRevealLink;
