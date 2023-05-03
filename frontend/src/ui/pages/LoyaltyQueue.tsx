import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModule, useUserPoints } from '~/lib/react';
import { SortFunction } from '~/lib/types';
import { useAppDispatch } from '~/store';
import { modules, removeRedeem, setUserPoints } from '~/store/api/reducer';
import { LoyaltyRedeem } from '~/store/api/types';
import { DataTable } from '../components/DataTable';
import DialogContent from '../components/DialogContent';
import {
  Button,
  Dialog,
  DialogActions,
  Field,
  FlexRow,
  InputBox,
  Label,
  NoneText,
  PageContainer,
  PageHeader,
  PageTitle,
  TabButton,
  TabContainer,
  TabContent,
  TabList,
  TextBlock,
} from '../theme';
import { TableCell, TableRow } from '../theme/table';

function RewardQueueRow({ data }: { data: LoyaltyRedeem & { date: Date } }) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  return (
    <TableRow key={`${data.when.toString()}${data.username}`}>
      <TableCell css={{ width: '22%', fontSize: '0.8rem' }}>
        {data.date.toLocaleString()}
      </TableCell>
      <TableCell css={{ width: '10%' }}>{data.username}</TableCell>
      <TableCell css={{ width: '18%' }}>{data.reward?.name}</TableCell>
      <TableCell css={{ width: '40%' }}>{data.request_text}</TableCell>
      <TableCell>
        <FlexRow spacing="1">
          <Button
            size="small"
            onClick={() => {
              void dispatch(removeRedeem(data));
            }}
          >
            {t('pages.loyalty-queue.accept')}
          </Button>
          <Button
            size="small"
            onClick={() => {
              // Give points back to the viewer
              void dispatch(
                setUserPoints({
                  user: data.username,
                  points: data.reward.price,
                  relative: true,
                }),
              );
              // Take the redeem off the list
              void dispatch(removeRedeem(data));
            }}
          >
            {t('pages.loyalty-queue.refund')}
          </Button>
        </FlexRow>
      </TableCell>
    </TableRow>
  );
}

function RewardQueue() {
  const { t } = useTranslation();
  const [queue] = useModule(modules.loyaltyRedeemQueue);

  // Big hack but this is required or refunds break
  useUserPoints();

  const data = queue?.map((q) => ({ ...q, date: new Date(q.when) })) ?? [];
  type Redeem = (typeof data)[0];

  const sortfn = (key: keyof Redeem) => (a: Redeem, b: Redeem) => {
    switch (key) {
      case 'display_name': {
        return a.display_name?.localeCompare(b.display_name);
      }
      case 'when': {
        return a.date && b.date ? a.date.getTime() - b.date.getTime() : 0;
      }
      case 'reward': {
        return a.reward?.name?.localeCompare(b.reward.name);
      }
      default:
        return 0;
    }
  };

  return (
    <>
      {(data.length > 0 && (
        <DataTable
          sort={sortfn}
          data={data}
          keyFunction={(d) => `${d.when.toString()}/${d.username}`}
          columns={[
            {
              key: 'when',
              title: t('pages.loyalty-queue.date'),
              sortable: true,
            },
            {
              key: 'username',
              title: t('pages.loyalty-queue.username'),
              sortable: true,
            },
            {
              key: 'reward',
              title: t('pages.loyalty-queue.reward'),
              sortable: true,
              attr: {
                style: {
                  textTransform: 'capitalize',
                },
              },
            },
            {
              key: 'request_text',
              title: t('pages.loyalty-queue.request'),
              sortable: false,
              attr: {
                style: {
                  width: '100%',
                  textAlign: 'left',
                },
              },
            },
            {
              key: 'actions',
              title: '',
              sortable: false,
            },
          ]}
          defaultSort={{ key: 'when', order: 'desc' }}
          rowComponent={RewardQueueRow}
        />
      )) || <NoneText>{t('pages.loyalty-queue.no-redeems')}</NoneText>}
    </>
  );
}

function UserList() {
  const { t } = useTranslation();
  const users = useUserPoints();
  const dispatch = useAppDispatch();

  const [currentEntry, setCurrentEntry] = useState<UserEntry>(null);
  const [givePointDialog, setGivePointDialog] = useState({
    open: false,
    user: '',
    points: 0,
  });
  const [config] = useModule(modules.loyaltyConfig);
  const [usernameFilter, setUsernameFilter] = useState('');
  const filtered = Object.entries(users ?? [])
    .filter(([user]) => user.includes(usernameFilter))
    .map(([username, data]) => ({
      username,
      ...data,
    }));
  type UserEntry = (typeof filtered)[0];

  const sortfn = (key: keyof UserEntry): SortFunction<UserEntry> => {
    switch (key) {
      case 'username': {
        return (a, b) => a.username.localeCompare(b.username);
      }
      case 'points': {
        return (a: UserEntry, b: UserEntry) => a.points - b.points;
      }
    }
  };

  const UserListRow = ({ data }: { data: UserEntry }) => (
    <TableRow key={data.username}>
      <TableCell css={{ width: '100%' }}>{data.username}</TableCell>
      <TableCell>{data.points}</TableCell>
      <TableCell>
        <Button onClick={() => setCurrentEntry(data)} size="small">
          {t('form-actions.edit')}
        </Button>
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <Dialog
        open={givePointDialog.open}
        onOpenChange={(state) =>
          setGivePointDialog({ ...givePointDialog, open: state })
        }
      >
        <DialogContent
          title={t('pages.loyalty-queue.give-points-dialog')}
          closeButton={true}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if ((e.target as HTMLFormElement).checkValidity()) {
                void dispatch(
                  setUserPoints({
                    ...givePointDialog,
                    user: givePointDialog.user.toLowerCase(),
                    relative: true,
                  }),
                );
                setGivePointDialog({ ...givePointDialog, open: false });
              }
            }}
          >
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="d-username">
                {t('pages.loyalty-queue.username')}
              </Label>
              <InputBox
                id="d-username"
                required={true}
                value={givePointDialog?.user ?? ''}
                onChange={(e) =>
                  setGivePointDialog({
                    ...givePointDialog,
                    user: e.target.value,
                  })
                }
              />
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="d-points" css={{ textTransform: 'capitalize' }}>
                {config?.currency || t('pages.loyalty-queue.points')}
              </Label>
              <InputBox
                type="number"
                id="d-points"
                value={givePointDialog?.points ?? '0'}
                onChange={(e) =>
                  setGivePointDialog({
                    ...givePointDialog,
                    points: parseInt(e.target.value, 10),
                  })
                }
              />
            </Field>
            <DialogActions>
              <Button variation="primary" type="submit">
                {t('form-actions.save')}
              </Button>
              <Button
                type="button"
                onClick={() =>
                  setGivePointDialog({ ...givePointDialog, open: false })
                }
              >
                {t('form-actions.cancel')}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={currentEntry !== null}
        onOpenChange={(state) => setCurrentEntry(state ? currentEntry : null)}
      >
        <DialogContent
          title={t('pages.loyalty-queue.modify-balance-dialog')}
          closeButton={true}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if ((e.target as HTMLFormElement).checkValidity()) {
                void dispatch(
                  setUserPoints({
                    user: currentEntry.username.toLowerCase(),
                    points: currentEntry.points,
                    relative: false,
                  }),
                );
                setCurrentEntry(null);
              }
            }}
          >
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="d-username">
                {t('pages.loyalty-queue.username')}
              </Label>
              <InputBox
                disabled={true}
                id="d-username"
                value={currentEntry?.username ?? ''}
              />
            </Field>
            <Field size="fullWidth" spacing="narrow">
              <Label htmlFor="d-points" css={{ textTransform: 'capitalize' }}>
                {config?.currency || t('pages.loyalty-queue.points')}
              </Label>
              <InputBox
                type="number"
                id="d-points"
                value={currentEntry?.points ?? '0'}
                onChange={(e) =>
                  setCurrentEntry({
                    ...currentEntry,
                    points: parseInt(e.target.value, 10),
                  })
                }
              />
            </Field>
            <DialogActions>
              <Button variation="primary" type="submit">
                {t('form-actions.save')}
              </Button>
              <Button onClick={() => setCurrentEntry(null)} type="button">
                {t('form-actions.cancel')}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
      <Field size="fullWidth" spacing="none">
        <FlexRow css={{ flex: 1, alignItems: 'stretch' }} spacing="1">
          <Button
            onClick={() =>
              setGivePointDialog({ open: true, user: '', points: 0 })
            }
          >
            {t('pages.loyalty-queue.give-points-dialog')}
          </Button>
          <InputBox
            css={{ flex: 1 }}
            placeholder={t('pages.loyalty-queue.username-filter')}
            value={usernameFilter}
            onChange={(e) => setUsernameFilter(e.target.value)}
          />
        </FlexRow>
      </Field>
      {(filtered.length > 0 && (
        <DataTable
          sort={sortfn}
          data={filtered}
          keyFunction={(entry) => entry.username}
          columns={[
            {
              key: 'username',
              title: t('pages.loyalty-queue.username'),
              sortable: true,
              attr: {
                style: {
                  width: '100%',
                  textAlign: 'left',
                },
              },
            },
            {
              key: 'points',
              title: config?.currency || t('pages.loyalty-queue.points'),
              sortable: true,
              attr: {
                style: {
                  textTransform: 'capitalize',
                },
              },
            },
            {
              key: 'actions',
              title: '',
              sortable: false,
            },
          ]}
          defaultSort={{ key: 'points', order: 'desc' }}
          rowComponent={UserListRow}
        />
      )) || <NoneText>{t('pages.loyalty-queue.no-users')}</NoneText>}
    </>
  );
}

export default function LoyaltyQueuePage(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>{t('pages.loyalty-queue.title')}</PageTitle>
        <TextBlock>{t('pages.loyalty-queue.subtitle')}</TextBlock>
      </PageHeader>
      <TabContainer defaultValue="queue">
        <TabList>
          <TabButton value="queue">
            {t('pages.loyalty-queue.queue-tab')}
          </TabButton>
          <TabButton value="users">
            {t('pages.loyalty-queue.users-tab')}
          </TabButton>
        </TabList>
        <TabContent value="queue">
          <RewardQueue />
        </TabContent>
        <TabContent value="users">
          <UserList />
        </TabContent>
      </TabContainer>
    </PageContainer>
  );
}
