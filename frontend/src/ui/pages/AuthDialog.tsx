import { styled } from '@stitches/react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { APPNAME, Button, InputBox, TextBlock } from '../theme';

const AuthWrapper = styled('div', {
  alignItems: 'center',
  minHeight: '100vh',
  maxWidth: '600px',
  display: 'flex',
  justifyContent: 'center',
  width: '90vw',
  margin: '0 auto',
});
const AuthTitle = styled('div', {
  fontWeight: 'bold',
  color: '$teal12',
  fontSize: '15pt',
  borderBottom: '1px solid $teal6',
  padding: '1rem 1.5rem',
  margin: '0',
  lineHeight: '1.25',
});
const AuthDialogContainer = styled('form', {
  display: 'flex',
  flexDirection: 'column',
  padding: '0',
  backgroundColor: '$gray2',
  borderRadius: '0.25rem',
  boxShadow:
    'hsl(206 22% 7% / 35%) 0px 10px 38px -10px, hsl(206 22% 7% / 20%) 0px 10px 20px -15px',
});
const Content = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  padding: '1.5rem',
  gap: '1rem',
});
const Actions = styled('div', {
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'flex-end',
  borderTop: '1px solid $gray6',
  padding: '1rem 1.5rem',
});

export default function AuthDialog(): React.ReactElement {
  const [password, setPassword] = useState('');
  const { t } = useTranslation();

  return (
    <AuthWrapper>
      <AuthDialogContainer
        onSubmit={(e) => {
          e.preventDefault();
          localStorage.setItem('password', password);
          window.location.reload();
        }}
      >
        <AuthTitle>{t('pages.auth.title')}</AuthTitle>
        <Content>
          <TextBlock spacing="none">
            {t('pages.auth.desc', { APPNAME })}
          </TextBlock>
          <TextBlock spacing="none">{t('pages.auth.no-pwd-note')}</TextBlock>
        </Content>
        <Actions>
          <InputBox
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            css={{ flex: 1 }}
            placeholder={t('pages.auth.password')}
          />
          <Button variation="primary" type="submit">
            {t('pages.auth.submit')}
          </Button>
        </Actions>
      </AuthDialogContainer>
    </AuthWrapper>
  );
}
