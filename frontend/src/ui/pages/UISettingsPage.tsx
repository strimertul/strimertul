import React from 'react';
import { useTranslation } from 'react-i18next';
import { useModule } from '~/lib/react-utils';
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
} from '../theme';

export default function UISettingsPage(): React.ReactElement {
  const [uiConfig, setUiConfig] = useModule(modules.uiConfig);
  const [t, i18n] = useTranslation();
  const dispatch = useAppDispatch();

  const maxKeys = languages.reduce(
    (current, it) => Math.max(current, it.keys),
    0,
  );

  return (
    <PageContainer>
      <PageHeader css={{ paddingBottom: '1rem' }}>
        <PageTitle>{t('pages.uiconfig.title')}</PageTitle>
      </PageHeader>
      <Field size="fullWidth">
        <Label htmlFor="bind">{t('pages.uiconfig.language')}</Label>
        <RadioGroup
          label={t('pages.uiconfig.language')}
          default={i18n.resolvedLanguage}
          selected={uiConfig?.language ?? i18n.resolvedLanguage}
          values={languages.map((lang) => ({
            id: lang.code,
            label: (
              <span>
                {lang.name}{' '}
                {lang.keys < maxKeys ? (
                  <small>
                    {t('pages.uiconfig.partial-translation')} (
                    {((lang.keys / maxKeys) * 100).toFixed(1)}% - {lang.keys}/
                    {maxKeys})
                  </small>
                ) : null}
              </span>
            ),
          }))}
        />
      </Field>
      <Button
        type="button"
        onClick={() => {
          void dispatch(setUiConfig({ ...uiConfig, onboardingDone: false }));
        }}
      >
        {t('pages.uiconfig.repeat-onboarding')}
      </Button>
    </PageContainer>
  );
}
