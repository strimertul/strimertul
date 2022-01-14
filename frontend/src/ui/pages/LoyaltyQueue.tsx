import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useModule, useUserPoints } from '../../lib/react-utils';
import { SortFunction } from '../../lib/type-utils';
import { modules, removeRedeem, setUserPoints } from '../../store/api/reducer';
import { LoyaltyRedeem } from '../../store/api/types';
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

function RewardQueue() {
  const { t } = useTranslation();
  const [queue] = useModule(modules.loyaltyRedeemQueue);
  const dispatch = useDispatch();

  // Big hack but this is required or refunds break
  useUserPoints();

  const data = queue?.map((q) => ({ ...q, date: new Date(q.when) })) ?? [];
  type Redeem = typeof data[0];

  const sortfn = (key: keyof Redeem) => (a: Redeem, b: Redeem) => {
    switch (key) {
      case 'display_name': {
        return a.display_name?.localeCompare(b.display_name);
      }
      case 'when': {
        return a.date?.getTime() - b.date?.getTime();
      }
      case 'reward': {
        return a.reward?.name?.localeCompare(b.reward.name);
      }
    }
  };

  return (
    <>
      {(data.length > 0 && (
        <DataTable
          sort={sortfn}
          data={data}
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
          view={(entry) => (
            <TableRow key={entry.when + entry.username}>
              <TableCell css={{ width: '22%', fontSize: '0.8rem' }}>
                {entry.date.toLocaleString()}
              </TableCell>
              <TableCell css={{ width: '10%' }}>{entry.username}</TableCell>
              <TableCell css={{ width: '18%' }}>{entry.reward?.name}</TableCell>
              <TableCell css={{ width: '40%' }}>{entry.request_text}</TableCell>
              <TableCell>
                <FlexRow spacing="1">
                  <Button
                    size="small"
                    onClick={() => {
                      dispatch(removeRedeem(entry));
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      // Give points back to the viewer
                      dispatch(
                        setUserPoints({
                          user: entry.username,
                          points: entry.reward.price,
                          relative: true,
                        }),
                      );
                      // Take the redeem off the list
                      dispatch(removeRedeem(entry));
                    }}
                  >
                    Refund
                  </Button>
                </FlexRow>
              </TableCell>
            </TableRow>
          )}
        />
      )) || <p>{t('pages.loyalty-queue.no-redeems')}</p>}
    </>
  );
}

function UserList() {
  const { t } = useTranslation();
  const users = useUserPoints();
  const dispatch = useDispatch();

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
  type UserEntry = typeof filtered[0];

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

  return (
    <>
      <Dialog
        open={givePointDialog.open}
        onOpenChange={(state) =>
          setGivePointDialog({ ...givePointDialog, open: state })
        }
      >
        <DialogContent title={t('pages.loyalty-queue.give-points-dialog')}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if ((e.target as HTMLFormElement).checkValidity()) {
                dispatch(
                  setUserPoints({
                    ...givePointDialog,
                    relative: true,
                  }),
                );
                setGivePointDialog({ ...givePointDialog, open: false });
              }
            }}
          >
            <Field size="fullWidth">
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
            <Field size="fullWidth">
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
                    points: parseInt(e.target.value),
                  })
                }
              />
            </Field>
            <DialogActions>
              <Button variation="primary" type="submit">
                {t('form-actions.save')}
              </Button>
              <Button type="button" onClick={() => setCurrentEntry(null)}>
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
        <DialogContent title={t('pages.loyalty-queue.modify-balance-dialog')}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if ((e.target as HTMLFormElement).checkValidity()) {
                dispatch(
                  setUserPoints({
                    user: currentEntry.username,
                    points: currentEntry.points,
                    relative: false,
                  }),
                );
                setCurrentEntry(null);
              }
            }}
          >
            <Field size="fullWidth">
              <Label htmlFor="d-username">
                {t('pages.loyalty-queue.username')}
              </Label>
              <InputBox
                disabled={true}
                id="d-username"
                value={currentEntry?.username ?? ''}
              />
            </Field>
            <Field size="fullWidth">
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
                    points: parseInt(e.target.value),
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
            Give points
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
          view={(entry) => (
            <TableRow key={entry.username}>
              <TableCell css={{ width: '100%' }}>{entry.username}</TableCell>
              <TableCell>{entry.points}</TableCell>
              <TableCell>
                <Button onClick={() => setCurrentEntry(entry)} size="small">
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          )}
        />
      )) || <p>{t('pages.loyalty-queue.no-users')}</p>}
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
