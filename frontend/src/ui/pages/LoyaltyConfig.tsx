import React from 'react';
import { CheckIcon } from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useModule, useStatus } from '../../lib/react-utils';
import apiReducer, { modules } from '../../store/api/reducer';
import {
  PageContainer,
  PageHeader,
  PageTitle,
  TextBlock,
  Field,
  FlexRow,
  Label,
  Checkbox,
  CheckboxIndicator,
  InputBox,
  FieldNote,
} from '../theme';
import SaveButton from '../components/utils/SaveButton';
import Interval from '../components/Interval';

export default function LoyaltySettingsPage(): React.ReactElement {
  const { t } = useTranslation();
  const [config, setConfig, loadStatus] = useModule(modules.loyaltyConfig);
  const dispatch = useDispatch();
  const status = useStatus(loadStatus.save);
  const busy =
    loadStatus.load?.type !== 'success' || loadStatus.save?.type === 'pending';

  const active = config?.enabled ?? false;

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>{t('pages.loyalty-settings.title')}</PageTitle>
        <TextBlock>{t('pages.loyalty-settings.subtitle')}</TextBlock>
        <TextBlock>{t('pages.loyalty-settings.note')}</TextBlock>
        <Field css={{ paddingTop: '1rem' }}>
          <FlexRow spacing={1}>
            <Checkbox
              checked={active}
              onCheckedChange={(ev) =>
                dispatch(
                  setConfig({
                    ...config,
                    enabled: !!ev,
                  }),
                )
              }
              id="enable"
            >
              <CheckboxIndicator>{active && <CheckIcon />}</CheckboxIndicator>
            </Checkbox>
            <Label htmlFor="enable">{t('pages.loyalty-settings.enable')}</Label>
          </FlexRow>
        </Field>
      </PageHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!(e.target as HTMLFormElement).checkValidity()) {
            return;
          }
          dispatch(setConfig(config));
        }}
      >
        <Field size="fullWidth">
          <Label htmlFor="currency">
            {t('pages.loyalty-settings.currency-name')}
          </Label>
          <InputBox
            type="text"
            id="currency"
            placeholder={t('pages.loyalty-settings.currency-placeholder')}
            value={config?.currency ?? ''}
            disabled={!active || busy}
            required={true}
            onChange={(e) =>
              dispatch(
                apiReducer.actions.loyaltyConfigChanged({
                  ...config,
                  currency: e.target.value,
                }),
              )
            }
          />
          <FieldNote>
            {t('pages.loyalty-settings.currency-name-hint')}
          </FieldNote>
        </Field>

        <Field size="fullWidth">
          <Label htmlFor="reward">
            {t('pages.loyalty-settings.reward', {
              currency:
                config?.currency ??
                t('pages.loyalty-settings.currency-placeholder'),
            })}
          </Label>
          <FlexRow align="left" spacing={1}>
            <InputBox
              type="number"
              id="reward"
              placeholder={'0'}
              css={{ maxWidth: '5rem' }}
              value={config?.points?.amount ?? '0'}
              disabled={!active || busy}
              required={true}
              onChange={(e) => {
                const intNum = parseInt(e.target.value, 10);
                if (Number.isNaN(intNum)) {
                  return;
                }
                dispatch(
                  apiReducer.actions.loyaltyConfigChanged({
                    ...config,
                    points: {
                      ...config.points,
                      amount: intNum,
                    },
                  }),
                );
              }}
            />
            <div>{t('pages.loyalty-settings.every')}</div>
            <Interval
              id="timer-interval"
              value={config?.points?.interval ?? 120}
              onChange={(interval) => {
                dispatch(
                  apiReducer.actions.loyaltyConfigChanged({
                    ...(config ?? {}),
                    points: {
                      ...config?.points,
                      interval,
                    },
                  }),
                );
              }}
              active={active && !busy}
              min={5}
              required={true}
            />
          </FlexRow>
        </Field>

        <Field size="fullWidth">
          <Label htmlFor="bonus">
            {t('pages.loyalty-settings.bonus-points')}
          </Label>
          <InputBox
            type="number"
            id="bonus"
            placeholder={'0'}
            value={config?.points?.activity_bonus ?? '0'}
            disabled={!active || busy}
            required={true}
            onChange={(e) => {
              const intNum = parseInt(e.target.value, 10);
              if (Number.isNaN(intNum)) {
                return;
              }
              dispatch(
                apiReducer.actions.loyaltyConfigChanged({
                  ...config,
                  points: {
                    ...config.points,
                    activity_bonus: intNum,
                  },
                }),
              );
            }}
          />
          <FieldNote>{t('pages.loyalty-settings.bonus-points-hint')}</FieldNote>
        </Field>

        <SaveButton type="submit" status={status} />
      </form>
    </PageContainer>
  );
}
