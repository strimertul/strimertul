import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { useModule, useStatus } from '../../lib/react-utils';
import Stulbe from '../../lib/stulbe-lib';
import apiReducer, { modules } from '../../store/api/reducer';
import SaveButton from '../components/utils/SaveButton';
import {
  Button,
  ButtonGroup,
  Field,
  InputBox,
  Label,
  PageContainer,
  PageHeader,
  PageTitle,
} from '../theme';

export default function BackendIntegrationPage(): React.ReactElement {
  const [stulbeConfig, setStulbeConfig, loadStatus] = useModule(
    modules.stulbeConfig,
  );
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const status = useStatus(loadStatus.save);
  const active = stulbeConfig?.enabled ?? false;
  const busy =
    loadStatus.load?.type !== 'success' || loadStatus.save?.type === 'pending';

  const test = async () => {
    try {
      const client = new Stulbe(stulbeConfig.endpoint);
      await client.auth(stulbeConfig.username, stulbeConfig.auth_key);
      toast.success(t('pages.stulbe.test-success'));
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>{t('pages.stulbe.title')}</PageTitle>
        <p>
          <Trans i18nKey="pages.stulbe.subtitle">
            {'Optional back-end integration (using '}
            <a href="https://github.com/strimertul/stulbe/">stulbe</a> or any
            Kilovolt compatible endpoint) for syncing keys and obtaining webhook
            events
          </Trans>
        </p>
      </PageHeader>
      <form
        onSubmit={(ev) => {
          dispatch(setStulbeConfig(stulbeConfig));
          ev.preventDefault();
        }}
      >
        <Field size="fullWidth">
          <Label htmlFor="endpoint">{t('pages.stulbe.endpoint')}</Label>
          <InputBox
            type="text"
            id="endpoint"
            placeholder={t('pages.stulbe.bind-placeholder')}
            value={stulbeConfig?.endpoint ?? ''}
            disabled={busy}
            onChange={(e) =>
              dispatch(
                apiReducer.actions.stulbeConfigChanged({
                  ...stulbeConfig,
                  enabled: e.target.value.length > 0,
                  endpoint: e.target.value,
                }),
              )
            }
          />
        </Field>
        <Field size="fullWidth">
          <Label htmlFor="username">{t('pages.stulbe.username')}</Label>
          <InputBox
            type="text"
            id="username"
            value={stulbeConfig?.username ?? ''}
            required={true}
            disabled={!active || busy}
            onChange={(e) =>
              dispatch(
                apiReducer.actions.stulbeConfigChanged({
                  ...stulbeConfig,
                  username: e.target.value,
                }),
              )
            }
          />
        </Field>
        <Field size="fullWidth">
          <Label htmlFor="password">{t('pages.stulbe.auth-key')}</Label>
          <InputBox
            type="password"
            id="password"
            value={stulbeConfig?.auth_key ?? ''}
            disabled={!active || busy}
            required={true}
            onChange={(e) =>
              dispatch(
                apiReducer.actions.stulbeConfigChanged({
                  ...stulbeConfig,
                  auth_key: e.target.value,
                }),
              )
            }
          />
        </Field>
        <ButtonGroup>
          <SaveButton status={status} />
          <Button
            type="button"
            disabled={!active || busy}
            onClick={() => test()}
          >
            {t('pages.stulbe.test-button')}
          </Button>
        </ButtonGroup>
      </form>
    </PageContainer>
  );
}
