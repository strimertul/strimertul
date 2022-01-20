import { CheckIcon, PlusIcon } from '@radix-ui/react-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useModule } from '../../lib/react-utils';
import { modules } from '../../store/api/reducer';
import { LoyaltyGoal, LoyaltyReward } from '../../store/api/types';
import AlertContent from '../components/AlertContent';
import DialogContent from '../components/DialogContent';
import Interval from '../components/Interval';
import {
  Button,
  Checkbox,
  CheckboxIndicator,
  Dialog,
  DialogActions,
  Field,
  FieldNote,
  FlexRow,
  InputBox,
  Label,
  MultiButton,
  PageContainer,
  PageHeader,
  PageTitle,
  styled,
  TabButton,
  TabContainer,
  TabContent,
  TabList,
  Textarea,
  TextBlock,
} from '../theme';
import { Alert, AlertTrigger } from '../theme/alert';

const RewardList = styled('div', { marginTop: '1rem' });
const GoalList = styled('div', { marginTop: '1rem' });
const RewardItemContainer = styled('article', {
  backgroundColor: '$gray2',
  margin: '0.5rem 0',
  padding: '0.5rem',
  borderLeft: '5px solid $teal8',
  borderRadius: '0.25rem',
  borderBottom: '1px solid $gray4',
  transition: 'all 50ms',
  '&:hover': {
    backgroundColor: '$gray3',
  },
  variants: {
    status: {
      enabled: {},
      disabled: {
        borderLeftColor: '$red6',
        backgroundColor: '$gray3',
        color: '$gray10',
      },
    },
  },
});
const RewardHeader = styled('header', {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  marginBottom: '0.4rem',
});
const RewardName = styled('span', {
  color: '$teal12',
  flex: 1,
  fontWeight: 'bold',
  variants: {
    status: {
      enabled: {},
      disabled: {
        color: '$gray9',
      },
    },
  },
});
const RewardDescription = styled('span', {
  flex: 1,
  fontSize: '0.9rem',
  color: '$gray11',
});
const RewardActions = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
});
const RewardID = styled('code', {
  fontFamily: 'Space Mono',
  color: '$teal11',
});
const RewardCost = styled('div', {
  fontSize: '0.9rem',
  marginRight: '0.5rem',
});
const RewardIcon = styled('div', {
  width: '32px',
  height: '32px',
  backgroundColor: '$gray4',
  borderRadius: '0.25rem',
  display: 'flex',
  alignItems: 'center',
});
const NoneText = styled('div', {
  color: '$gray9',
  fontSize: '1.2em',
  textAlign: 'center',
  fontStyle: 'italic',
  paddingTop: '1rem',
});

interface RewardItemProps {
  name: string;
  item: LoyaltyReward;
  currency: string;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}
function RewardItem({
  name,
  item,
  currency,
  onToggle,
  onEdit,
  onDelete,
}: RewardItemProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <RewardItemContainer status={item.enabled ? 'enabled' : 'disabled'}>
      <RewardHeader>
        <RewardIcon>
          {item.image && (
            <img
              src={item.image}
              style={{ width: '32px', borderRadius: '0.25rem' }}
            />
          )}
        </RewardIcon>
        <RewardName status={item.enabled ? 'enabled' : 'disabled'}>
          {item.name} (<RewardID>{name}</RewardID>)
        </RewardName>
        <RewardCost>
          {item.price} {currency}
        </RewardCost>
        <RewardActions>
          <MultiButton>
            <Button
              styling="multi"
              size="small"
              onClick={() => (onToggle ? onToggle() : null)}
            >
              {t(item.enabled ? 'form-actions.disable' : 'form-actions.enable')}
            </Button>
            <Button
              styling="multi"
              size="small"
              onClick={() => (onEdit ? onEdit() : null)}
            >
              {t('form-actions.edit')}
            </Button>
            <Alert>
              <AlertTrigger asChild>
                <Button styling="multi" size="small">
                  {t('form-actions.delete')}
                </Button>
              </AlertTrigger>
              <AlertContent
                variation="danger"
                title={t('pages.loyalty-rewards.remove-reward-title', {
                  name: item.name,
                })}
                description={t('form-actions.warning-delete')}
                actionText={t('form-actions.delete')}
                actionButtonProps={{ variation: 'danger' }}
                showCancel={true}
                onAction={() => (onDelete ? onDelete() : null)}
              />
            </Alert>
          </MultiButton>
        </RewardActions>
      </RewardHeader>
      <RewardDescription>{item.description}</RewardDescription>
    </RewardItemContainer>
  );
}

interface GoalItemProps {
  name: string;
  item: LoyaltyGoal;
  currency: string;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}
function GoalItem({
  name,
  item,
  currency,
  onToggle,
  onEdit,
  onDelete,
}: GoalItemProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <RewardItemContainer status={item.enabled ? 'enabled' : 'disabled'}>
      <RewardHeader>
        <RewardIcon>
          {item.image && (
            <img
              src={item.image}
              style={{ width: '32px', borderRadius: '0.25rem' }}
            />
          )}
        </RewardIcon>
        <RewardName status={item.enabled ? 'enabled' : 'disabled'}>
          {item.name} (<RewardID>{name}</RewardID>)
        </RewardName>
        <RewardCost>
          {item.contributed} / {item.total} {currency} (
          {Math.round((item.contributed / item.total) * 100)}%)
        </RewardCost>
        <RewardActions>
          <MultiButton>
            <Button
              styling="multi"
              size="small"
              onClick={() => (onToggle ? onToggle() : null)}
            >
              {t(item.enabled ? 'form-actions.disable' : 'form-actions.enable')}
            </Button>
            <Button
              styling="multi"
              size="small"
              onClick={() => (onEdit ? onEdit() : null)}
            >
              {t('form-actions.edit')}
            </Button>
            <Alert>
              <AlertTrigger asChild>
                <Button styling="multi" size="small">
                  {t('form-actions.delete')}
                </Button>
              </AlertTrigger>
              <AlertContent
                variation="danger"
                title={t('pages.loyalty-rewards.remove-reward-title', {
                  name: item.name,
                })}
                description={t('form-actions.warning-delete')}
                actionText={t('form-actions.delete')}
                actionButtonProps={{ variation: 'danger' }}
                showCancel={true}
                onAction={() => (onDelete ? onDelete() : null)}
              />
            </Alert>
          </MultiButton>
        </RewardActions>
      </RewardHeader>
      <RewardDescription>{item.description}</RewardDescription>
    </RewardItemContainer>
  );
}

function RewardsPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [config] = useModule(modules.loyaltyConfig);
  const [rewards, setRewards] = useModule(modules.loyaltyRewards);
  const [filter, setFilter] = useState('');
  const [dialogReward, setDialogReward] = useState<{
    open: boolean;
    new: boolean;
    reward: LoyaltyReward;
  }>({ open: false, new: false, reward: null });
  const [requiredInfo, setRequiredInfo] = useState({
    enabled: false,
    text: '',
  });
  const filterLC = filter.toLowerCase();

  const deleteReward = (id: string): void => {
    dispatch(setRewards(rewards?.filter((r) => r.id !== id) ?? []));
  };

  const toggleReward = (id: string): void => {
    dispatch(
      setRewards(
        rewards?.map((r) => {
          if (r.id === id) {
            return {
              ...r,
              enabled: !r.enabled,
            };
          }
          return r;
        }) ?? [],
      ),
    );
  };

  return (
    <>
      <Dialog
        open={dialogReward.open}
        onOpenChange={(state) =>
          setDialogReward({ ...dialogReward, open: state })
        }
      >
        <DialogContent
          title={
            dialogReward.new
              ? t('pages.loyalty-rewards.create-reward')
              : t('pages.loyalty-rewards.edit-reward')
          }
          closeButton={true}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!(e.target as HTMLFormElement).checkValidity()) {
                return;
              }
              const reward = dialogReward.reward;
              if (requiredInfo.enabled) {
                reward.required_info = requiredInfo.text;
              }
              const index = rewards?.findIndex((t) => t.id == reward.id);
              if (index >= 0) {
                const newRewards = rewards.slice(0);
                newRewards[index] = reward;
                dispatch(setRewards(newRewards));
              } else {
                dispatch(setRewards([...(rewards ?? []), reward]));
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
                      id:
                        e.target.value
                          ?.toLowerCase()
                          .replace(/[^a-zA-Z0-9]/gi, '-') ?? '',
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
              <FieldNote>{t('pages.loyalty-rewards.reward-id-hint')}</FieldNote>
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="reward-name">
                {t('pages.loyalty-rewards.reward-name')}
              </Label>
              <InputBox
                id="reward-name"
                type="text"
                required
                value={dialogReward?.reward?.name ?? ''}
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
              <FieldNote>
                {t('pages.loyalty-rewards.reward-name-hint')}
              </FieldNote>
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="reward-icon">
                {t('pages.loyalty-rewards.reward-icon')}
              </Label>
              <InputBox
                id="reward-icon"
                type="text"
                value={dialogReward?.reward?.image ?? ''}
                onChange={(e) => {
                  setDialogReward({
                    ...dialogReward,
                    reward: {
                      ...dialogReward?.reward,
                      image: e.target.value,
                    },
                  });
                }}
              />
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="reward-desc">
                {t('pages.loyalty-rewards.reward-desc')}
              </Label>
              <Textarea
                id="reward-desc"
                value={dialogReward?.reward?.description ?? ''}
                onChange={(e) => {
                  setDialogReward({
                    ...dialogReward,
                    reward: {
                      ...dialogReward?.reward,
                      description: e.target.value,
                    },
                  });
                }}
              >
                {dialogReward?.reward?.description ?? ''}
              </Textarea>
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="reward-cost">
                {t('pages.loyalty-rewards.reward-cost')}
              </Label>
              <InputBox
                id="reward-cost"
                type="number"
                required
                value={dialogReward?.reward?.price ?? '0'}
                onChange={(e) => {
                  setDialogReward({
                    ...dialogReward,
                    reward: {
                      ...dialogReward?.reward,
                      price: parseInt(e.target.value),
                    },
                  });
                }}
              />
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="reward-cooldown">
                {t('pages.loyalty-rewards.reward-cooldown')}
              </Label>
              <FlexRow align="left">
                <Interval
                  value={dialogReward?.reward?.cooldown ?? 0}
                  active={true}
                  onChange={(cooldown) => {
                    setDialogReward({
                      ...dialogReward,
                      reward: {
                        ...dialogReward?.reward,
                        cooldown,
                      },
                    });
                  }}
                />
              </FlexRow>
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <FlexRow align="left" spacing="1">
                <Checkbox
                  id="reward-details"
                  checked={requiredInfo.enabled}
                  onCheckedChange={(e) => {
                    setRequiredInfo({
                      ...requiredInfo,
                      enabled: !!e,
                    });
                  }}
                >
                  <CheckboxIndicator>
                    {requiredInfo.enabled && <CheckIcon />}
                  </CheckboxIndicator>
                </Checkbox>
                <Label htmlFor="reward-details">
                  {t('pages.loyalty-rewards.reward-details')}
                </Label>
              </FlexRow>
              <InputBox
                id="reward-details-text"
                type="text"
                disabled={!requiredInfo.enabled}
                required={requiredInfo.enabled}
                value={dialogReward?.reward?.required_info ?? ''}
                placeholder={t(
                  'pages.loyalty-rewards.reward-details-placeholder',
                )}
                onChange={(e) => {
                  setRequiredInfo({ ...requiredInfo, text: e.target.value });
                }}
              />
            </Field>
            <DialogActions>
              <Button variation="primary" type="submit">
                {dialogReward.new
                  ? t('form-actions.create')
                  : t('form-actions.edit')}
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
            onClick={() => {
              setRequiredInfo({
                enabled: false,
                text: '',
              });
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
              });
            }}
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
      <RewardList>
        {rewards ? (
          rewards
            ?.filter(
              (r) =>
                r.name.toLowerCase().includes(filterLC) ||
                r.id.toLowerCase().includes(filterLC) ||
                r.description.toLowerCase().includes(filterLC),
            )
            .map((r) => (
              <RewardItem
                key={r.id}
                name={r.id}
                item={r}
                currency={(
                  config?.currency || t('pages.loyalty-queue.points')
                ).toLowerCase()}
                onEdit={() =>
                  setDialogReward({
                    open: true,
                    new: false,
                    reward: r,
                  })
                }
                onDelete={() => deleteReward(r.id)}
                onToggle={() => toggleReward(r.id)}
              />
            ))
        ) : (
          <NoneText>{t('pages.loyalty-rewards.no-rewards')}</NoneText>
        )}
      </RewardList>
    </>
  );
}

function GoalsPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [config] = useModule(modules.loyaltyConfig);
  const [goals, setGoals] = useModule(modules.loyaltyGoals);
  const [filter, setFilter] = useState('');
  const [dialogGoal, setDialogGoal] = useState<{
    open: boolean;
    new: boolean;
    goal: LoyaltyGoal;
  }>({ open: false, new: false, goal: null });
  const [requiredInfo, setRequiredInfo] = useState({
    enabled: false,
    text: '',
  });
  const filterLC = filter.toLowerCase();

  const deleteGoal = (id: string): void => {
    dispatch(setGoals(goals?.filter((r) => r.id !== id) ?? []));
  };

  const toggleGoal = (id: string): void => {
    dispatch(
      setGoals(
        goals?.map((r) => {
          if (r.id === id) {
            return {
              ...r,
              enabled: !r.enabled,
            };
          }
          return r;
        }) ?? [],
      ),
    );
  };

  return (
    <>
      <Dialog
        open={dialogGoal.open}
        onOpenChange={(state) => setDialogGoal({ ...dialogGoal, open: state })}
      >
        <DialogContent
          title={
            dialogGoal.new
              ? t('pages.loyalty-rewards.create-goal')
              : t('pages.loyalty-rewards.edit-goal')
          }
          closeButton={true}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!(e.target as HTMLFormElement).checkValidity()) {
                return;
              }
              const goal = dialogGoal.goal;
              const index = goals?.findIndex((t) => t.id == goal.id);
              if (index >= 0) {
                const newGoals = goals.slice(0);
                newGoals[index] = goal;
                dispatch(setGoals(newGoals));
              } else {
                dispatch(setGoals([...(goals ?? []), goal]));
              }
              setDialogGoal({ ...dialogGoal, open: false });
            }}
          >
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="goal-id">
                {t('pages.loyalty-rewards.goal-id')}
              </Label>
              <InputBox
                id="goal-id"
                type="text"
                required
                disabled={!dialogGoal.new}
                value={dialogGoal?.goal?.id}
                onChange={(e) => {
                  setDialogGoal({
                    ...dialogGoal,
                    goal: {
                      ...dialogGoal?.goal,
                      id:
                        e.target.value
                          ?.toLowerCase()
                          .replace(/[^a-zA-Z0-9]/gi, '-') ?? '',
                    },
                  });
                  if (
                    dialogGoal.new &&
                    goals.find((r) => r.id === e.target.value)
                  ) {
                    (e.target as HTMLInputElement).setCustomValidity(
                      t('pages.loyalty-rewards.id-already-in-use'),
                    );
                  } else {
                    (e.target as HTMLInputElement).setCustomValidity('');
                  }
                }}
              />
              <FieldNote>{t('pages.loyalty-rewards.goal-id-hint')}</FieldNote>
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="goal-name">
                {t('pages.loyalty-rewards.goal-name')}
              </Label>
              <InputBox
                id="goal-name"
                type="text"
                required
                value={dialogGoal?.goal?.name ?? ''}
                onChange={(e) => {
                  setDialogGoal({
                    ...dialogGoal,
                    goal: {
                      ...dialogGoal?.goal,
                      name: e.target.value,
                    },
                  });
                }}
              />
              <FieldNote>{t('pages.loyalty-rewards.goal-name-hint')}</FieldNote>
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="goal-icon">
                {t('pages.loyalty-rewards.goal-icon')}
              </Label>
              <InputBox
                id="goal-icon"
                type="text"
                value={dialogGoal?.goal?.image ?? ''}
                onChange={(e) => {
                  setDialogGoal({
                    ...dialogGoal,
                    goal: {
                      ...dialogGoal?.goal,
                      image: e.target.value,
                    },
                  });
                }}
              />
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="goal-desc">
                {t('pages.loyalty-rewards.goal-desc')}
              </Label>
              <Textarea
                id="goal-desc"
                value={dialogGoal?.goal?.description ?? ''}
                onChange={(e) => {
                  setDialogGoal({
                    ...dialogGoal,
                    goal: {
                      ...dialogGoal?.goal,
                      description: e.target.value,
                    },
                  });
                }}
              >
                {dialogGoal?.goal?.description ?? ''}
              </Textarea>
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="goal-cost">
                {t('pages.loyalty-rewards.goal-cost')}
              </Label>
              <InputBox
                id="goal-cost"
                type="number"
                required
                value={dialogGoal?.goal?.total ?? '0'}
                onChange={(e) => {
                  setDialogGoal({
                    ...dialogGoal,
                    goal: {
                      ...dialogGoal?.goal,
                      total: parseInt(e.target.value),
                    },
                  });
                }}
              />
            </Field>
            <DialogActions>
              <Button variation="primary" type="submit">
                {dialogGoal.new
                  ? t('form-actions.create')
                  : t('form-actions.edit')}
              </Button>
              <Button
                type="button"
                onClick={() => setDialogGoal({ ...dialogGoal, open: false })}
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
            onClick={() => {
              setRequiredInfo({
                enabled: false,
                text: '',
              });
              setDialogGoal({
                open: true,
                new: true,
                goal: {
                  id: '',
                  enabled: true,
                  name: '',
                  description: '',
                  image: '',
                  total: 0,
                  contributed: 0,
                  contributors: {},
                },
              });
            }}
          >
            <PlusIcon /> {t('pages.loyalty-rewards.create-goal')}
          </Button>
          <InputBox
            css={{ flex: 1 }}
            placeholder={t('pages.loyalty-rewards.goal-filter')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </FlexRow>
      </Field>
      <GoalList>
        {goals ? (
          goals
            ?.filter(
              (r) =>
                r.name.toLowerCase().includes(filterLC) ||
                r.id.toLowerCase().includes(filterLC) ||
                r.description.toLowerCase().includes(filterLC),
            )
            .map((r) => (
              <GoalItem
                key={r.id}
                name={r.id}
                item={r}
                currency={(
                  config?.currency || t('pages.loyalty-queue.points')
                ).toLowerCase()}
                onEdit={() =>
                  setDialogGoal({
                    open: true,
                    new: false,
                    goal: r,
                  })
                }
                onDelete={() => deleteGoal(r.id)}
                onToggle={() => toggleGoal(r.id)}
              />
            ))
        ) : (
          <NoneText>{t('pages.loyalty-rewards.no-goals')}</NoneText>
        )}
      </GoalList>
    </>
  );
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
