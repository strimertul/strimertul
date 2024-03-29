import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@radix-ui/react-icons';
import { useModule, useStatus } from '~/lib/react';
import apiReducer, { modules } from '~/store/api/reducer';
import { useAppDispatch } from '~/store';
import MultiInput from '../components/forms/MultiInput';
import {
  Checkbox,
  CheckboxIndicator,
  Field,
  FlexRow,
  Label,
  PageContainer,
  PageHeader,
  PageTitle,
  TabButton,
  TabContainer,
  TabContent,
  TabList,
  TextBlock,
} from '../theme';
import SaveButton from '../components/forms/SaveButton';

export default function ChatAlertsPage(): React.ReactElement {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [alerts, setAlerts, loadStatus] = useModule(modules.twitchBotAlerts);
  const status = useStatus(loadStatus.save);

  return (
    <PageContainer>
      <form
        onSubmit={(ev) => {
          void dispatch(setAlerts(alerts));
          ev.preventDefault();
        }}
      >
        <PageHeader>
          <PageTitle>{t('pages.alerts.title')}</PageTitle>
          <TextBlock>{t('pages.alerts.desc')}</TextBlock>
        </PageHeader>
        <TabContainer defaultValue="follow">
          <TabList>
            <TabButton value="follow">
              {t('pages.alerts.events.follow')}
            </TabButton>
            <TabButton value="sub">
              {t('pages.alerts.events.subscription')}
            </TabButton>
            <TabButton value="gift">
              {t('pages.alerts.events.gift-sub')}
            </TabButton>
            <TabButton value="raid">{t('pages.alerts.events.raid')}</TabButton>
            <TabButton value="cheer">
              {t('pages.alerts.events.cheer')}
            </TabButton>
          </TabList>
          <TabContent value="follow">
            <Field size="fullWidth">
              <FlexRow spacing={1} align="left">
                <Checkbox
                  checked={alerts?.follow?.enabled ?? false}
                  onCheckedChange={(ev) => {
                    void dispatch(
                      apiReducer.actions.twitchBotAlertsChanged({
                        ...alerts,
                        follow: {
                          ...alerts.follow,
                          enabled: !!ev,
                        },
                      }),
                    );
                  }}
                  id="follow-enabled"
                >
                  <CheckboxIndicator>
                    {alerts?.follow?.enabled && <CheckIcon />}
                  </CheckboxIndicator>
                </Checkbox>

                <Label htmlFor="follow-enabled">
                  {t('pages.alerts.follow-enable')}
                </Label>
              </FlexRow>
            </Field>
            <Field size="fullWidth">
              <Label>{t('pages.alerts.messages')}</Label>
              <small>{t('pages.alerts.msg-info')}</small>
              <MultiInput
                value={alerts?.follow?.messages ?? ['']}
                disabled={!alerts?.follow?.enabled ?? true}
                required={alerts?.follow?.enabled ?? false}
                onChange={(messages) => {
                  dispatch(
                    apiReducer.actions.twitchBotAlertsChanged({
                      ...alerts,
                      follow: { ...alerts.follow, messages },
                    }),
                  );
                }}
              />
            </Field>
          </TabContent>
          <TabContent value="sub">
            <Field size="fullWidth">
              <FlexRow spacing={1} align="left">
                <Checkbox
                  checked={alerts?.subscription?.enabled ?? false}
                  onCheckedChange={(ev) => {
                    void dispatch(
                      apiReducer.actions.twitchBotAlertsChanged({
                        ...alerts,
                        subscription: {
                          ...alerts.subscription,
                          enabled: !!ev,
                        },
                      }),
                    );
                  }}
                  id="subscription-enabled"
                >
                  <CheckboxIndicator>
                    {alerts?.subscription?.enabled && <CheckIcon />}
                  </CheckboxIndicator>
                </Checkbox>

                <Label htmlFor="subscription-enabled">
                  {t('pages.alerts.subscription-enable')}
                </Label>
              </FlexRow>
            </Field>
            <Field size="fullWidth">
              <Label>{t('pages.alerts.messages')}</Label>
              <small>{t('pages.alerts.msg-info')}</small>
              <MultiInput
                value={alerts?.subscription?.messages ?? ['']}
                disabled={!alerts?.subscription?.enabled ?? true}
                required={alerts?.subscription?.enabled ?? false}
                onChange={(messages) => {
                  void dispatch(
                    apiReducer.actions.twitchBotAlertsChanged({
                      ...alerts,
                      subscription: { ...alerts.subscription, messages },
                    }),
                  );
                }}
              />
            </Field>
          </TabContent>

          <TabContent value="gift">
            <Field size="fullWidth">
              <FlexRow spacing={1} align="left">
                <Checkbox
                  checked={alerts?.gift_sub?.enabled ?? false}
                  onCheckedChange={(ev) => {
                    void dispatch(
                      apiReducer.actions.twitchBotAlertsChanged({
                        ...alerts,
                        gift_sub: {
                          ...alerts.gift_sub,
                          enabled: !!ev,
                        },
                      }),
                    );
                  }}
                  id="gift_sub-enabled"
                >
                  <CheckboxIndicator>
                    {alerts?.gift_sub?.enabled && <CheckIcon />}
                  </CheckboxIndicator>
                </Checkbox>

                <Label htmlFor="gift_sub-enabled">
                  {t('pages.alerts.gift_sub-enable')}
                </Label>
              </FlexRow>
            </Field>
            <Field size="fullWidth">
              <Label>{t('pages.alerts.messages')}</Label>
              <small>{t('pages.alerts.msg-info')}</small>
              <MultiInput
                value={alerts?.gift_sub?.messages ?? ['']}
                disabled={!alerts?.gift_sub?.enabled ?? true}
                required={alerts?.gift_sub?.enabled ?? false}
                onChange={(messages) => {
                  void dispatch(
                    apiReducer.actions.twitchBotAlertsChanged({
                      ...alerts,
                      gift_sub: { ...alerts.gift_sub, messages },
                    }),
                  );
                }}
              />
            </Field>
          </TabContent>

          <TabContent value="raid">
            <Field size="fullWidth">
              <FlexRow spacing={1} align="left">
                <Checkbox
                  checked={alerts?.raid?.enabled ?? false}
                  onCheckedChange={(ev) => {
                    void dispatch(
                      apiReducer.actions.twitchBotAlertsChanged({
                        ...alerts,
                        raid: {
                          ...alerts.raid,
                          enabled: !!ev,
                        },
                      }),
                    );
                  }}
                  id="raid-enabled"
                >
                  <CheckboxIndicator>
                    {alerts?.raid?.enabled && <CheckIcon />}
                  </CheckboxIndicator>
                </Checkbox>

                <Label htmlFor="raid-enabled">
                  {t('pages.alerts.raid-enable')}
                </Label>
              </FlexRow>
            </Field>
            <Field size="fullWidth">
              <Label>{t('pages.alerts.messages')}</Label>
              <small>{t('pages.alerts.msg-info')}</small>
              <MultiInput
                value={alerts?.raid?.messages ?? ['']}
                disabled={!alerts?.raid?.enabled ?? true}
                required={alerts?.raid?.enabled ?? false}
                onChange={(messages) => {
                  void dispatch(
                    apiReducer.actions.twitchBotAlertsChanged({
                      ...alerts,
                      raid: { ...alerts.raid, messages },
                    }),
                  );
                }}
              />
            </Field>
          </TabContent>

          <TabContent value="cheer">
            <Field size="fullWidth">
              <FlexRow spacing={1} align="left">
                <Checkbox
                  checked={alerts?.cheer?.enabled ?? false}
                  onCheckedChange={(ev) => {
                    void dispatch(
                      apiReducer.actions.twitchBotAlertsChanged({
                        ...alerts,
                        cheer: {
                          ...alerts.cheer,
                          enabled: !!ev,
                        },
                      }),
                    );
                  }}
                  id="raid-enabled"
                >
                  <CheckboxIndicator>
                    {alerts?.cheer?.enabled && <CheckIcon />}
                  </CheckboxIndicator>
                </Checkbox>

                <Label htmlFor="cheer-enabled">
                  {t('pages.alerts.cheer-enable')}
                </Label>
              </FlexRow>
            </Field>
            <Field size="fullWidth">
              <Label>{t('pages.alerts.messages')}</Label>
              <small>{t('pages.alerts.msg-info')}</small>
              <MultiInput
                value={alerts?.cheer?.messages ?? ['']}
                disabled={!alerts?.cheer?.enabled ?? true}
                required={alerts?.cheer?.enabled ?? false}
                onChange={(messages) => {
                  void dispatch(
                    apiReducer.actions.twitchBotAlertsChanged({
                      ...alerts,
                      cheer: { ...alerts.cheer, messages },
                    }),
                  );
                }}
              />
            </Field>
          </TabContent>
        </TabContainer>
        <SaveButton status={status} type="submit" />
      </form>
    </PageContainer>
  );
}
