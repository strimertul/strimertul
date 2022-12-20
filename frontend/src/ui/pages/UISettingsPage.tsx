import React from 'react';
import { useTranslation } from 'react-i18next';
import { useModule } from '~/lib/react';
import { languages } from '~/locale/languages';
import { useAppDispatch } from '~/store';
import { modules } from '~/store/api/reducer';
import RadioGroup from '../components/forms/RadioGroup';
import {
  Button,
  Field,
  Label,
  PageContainer,
  PageHeader,
  PageTitle,
  styled,
} from '../theme';

const PartialWarning = styled('small', {
  color: '$yellow11',
});

const maxKeys = languages.reduce(
  (current, it) => Math.max(current, it.keys),
  0,
);

export default function UISettingsPage(): React.ReactElement {
  const [uiConfig, setUiConfig] = useModule(modules.uiConfig);
  const [t, i18n] = useTranslation();
  const dispatch = useAppDispatch();

  return (
    <PageContainer>
      <PageHeader css={{ paddingBottom: '1rem' }}>
        <PageTitle>{t('pages.uiconfig.title')}</PageTitle>
      </PageHeader>
      <Field size="fullWidth">
        <Label htmlFor="bind">{t('pages.uiconfig.language')}</Label>
        <RadioGroup
          aria-label={t('pages.uiconfig.language')}
          defaultValue={i18n.resolvedLanguage}
          value={uiConfig?.language ?? i18n.resolvedLanguage}
          onValueChange={(value) => {
            void dispatch(setUiConfig({ ...uiConfig, language: value }));
          }}
          values={languages.map((lang) => ({
            id: lang.code,
            label: (
              <span>
                {lang.name}{' '}
                {lang.keys < maxKeys ? (
                  <PartialWarning>
                    {t('pages.uiconfig.partial-translation')} (
                    {((lang.keys / maxKeys) * 100).toFixed(1)}% - {lang.keys}/
                    {maxKeys})
                  </PartialWarning>
                ) : null}
              </span>
            ),
          }))}
        />
      </Field>
      <Button
        type="button"
        onClick={() => {
          void dispatch(
            setUiConfig({
              ...uiConfig,
              onboardingDone: false,
              onboardingStatus: 0,
            }),
          );
        }}
      >
        {t('pages.uiconfig.repeat-onboarding')}
      </Button>
    </PageContainer>
  );
}
