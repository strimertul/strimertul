import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../theme';

const WIPNotice = styled('div', {
  marginTop: '2rem',
  border: '1px solid $yellow7',
  borderRadius: '0.25rem',
  backgroundColor: '$yellow5',
  padding: '0.5rem',
});
const WIPTitle = styled('div', {
  fontWeight: 'bold',
  color: '$yellow11',
  marginBottom: '0.5rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

function WIP(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <WIPNotice>
      <WIPTitle>
        <ExclamationTriangleIcon />
        {t('special.wip.header')}
        <ExclamationTriangleIcon />
      </WIPTitle>
      {t('special.wip.text')}
    </WIPNotice>
  );
}

const PureWIP = React.memo(WIP);
export default PureWIP;
