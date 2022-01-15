import { PlusIcon } from '@radix-ui/react-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useModule } from '../../lib/react-utils';
import { modules } from '../../store/api/reducer';
import { LoyaltyReward } from '../../store/api/types';
import DialogContent from '../components/DialogContent';
import {
  Button,
  Dialog,
  DialogActions,
  Field,
  FlexRow,
  InputBox,
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

function RewardsPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [rewards, setRewards] = useModule(modules.loyaltyRewards);
  const [filter, setFilter] = useState('');
  const [dialogReward, setDialogReward] = useState<{
    open: boolean;
    new: boolean;
    reward: LoyaltyReward;
  }>({ open: false, new: false, reward: null });

  return (
    <>
      <Dialog
        open={dialogReward.open}
        onOpenChange={(state) =>
          setDialogReward({ ...dialogReward, open: state })
        }
      >
        <DialogContent title={t('pages.loyalty-rewards.create-reward')}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!(e.target as HTMLFormElement).checkValidity()) {
                return;
              }
              const reward = dialogReward.reward;
              const index = rewards.findIndex((t) => t.id == reward.id);
              if (index >= 0) {
                const newRewards = rewards.slice(0);
                newRewards[index] = reward;
                dispatch(setRewards(newRewards));
              } else {
                dispatch(setRewards([...rewards, reward]));
              }
              setDialogReward({ ...dialogReward, open: false });
            }}
          >
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="reward-id">
                {t('pages.loyalty-rewards.reward-id')}
              </Label>
              <InputBox
                id="reward-id"
                type="text"
                required
                disabled={!dialogReward.new}
                value={dialogReward?.reward?.id}
                onChange={(e) => {
                  setDialogReward({
                    ...dialogReward,
                    reward: {
                      ...dialogReward?.reward,
                      id: e.target.value,
                    },
                  });
                  if (
                    dialogReward.new &&
                    rewards.find((r) => r.id === e.target.value)
                  ) {
                    (e.target as HTMLInputElement).setCustomValidity(
                      t('pages.loyalty-rewards.id-already-in-use'),
                    );
                  } else {
                    (e.target as HTMLInputElement).setCustomValidity('');
                  }
                }}
              />
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="reward-name">
                {t('pages.loyalty-rewards.reward-name')}
              </Label>
              <InputBox
                id="reward-name"
                type="text"
                required
                value={dialogReward?.reward?.name}
                onChange={(e) => {
                  setDialogReward({
                    ...dialogReward,
                    reward: {
                      ...dialogReward?.reward,
                      name: e.target.value,
                    },
                  });
                }}
              />
            </Field>
            <DialogActions>
              <Button variation="primary" type="submit">
                {t('form-actions.create')}
              </Button>
              <Button
                type="button"
                onClick={() =>
                  setDialogReward({ ...dialogReward, open: false })
                }
              >
                {t('form-actions.cancel')}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
      <Field size="fullWidth" spacing="none">
        <FlexRow css={{ flex: 1, alignItems: 'stretch' }} spacing="1">
          <Button
            variation="primary"
            onClick={() =>
              setDialogReward({
                open: true,
                new: true,
                reward: {
                  id: '',
                  enabled: true,
                  name: '',
                  description: '',
                  image: '',
                  price: 0,
                  cooldown: 0,
                },
              })
            }
          >
            <PlusIcon /> {t('pages.loyalty-rewards.create-reward')}
          </Button>
          <InputBox
            css={{ flex: 1 }}
            placeholder={t('pages.loyalty-rewards.reward-filter')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </FlexRow>
      </Field>
    </>
  );
}

function GoalsPage() {
  const { t } = useTranslation();

  return <></>;
}

export default function LoyaltyRewardsPage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>{t('pages.loyalty-rewards.title')}</PageTitle>
        <TextBlock>{t('pages.loyalty-rewards.subtitle')}</TextBlock>
      </PageHeader>
      <TabContainer defaultValue="rewards">
        <TabList>
          <TabButton value="rewards">
            {t('pages.loyalty-rewards.rewards-tab')}
          </TabButton>
          <TabButton value="goals">
            {t('pages.loyalty-rewards.goals-tab')}
          </TabButton>
        </TabList>
        <TabContent value="rewards">
          <RewardsPage />
        </TabContent>
        <TabContent value="goals">
          <GoalsPage />
        </TabContent>
      </TabContainer>
    </PageContainer>
  );
}
