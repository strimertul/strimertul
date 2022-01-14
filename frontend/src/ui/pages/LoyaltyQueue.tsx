import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useModule, useUserPoints } from '../../lib/react-utils';
import { modules } from '../../store/api/reducer';
import { DataTable } from '../components/DataTable';
import {
  Button,
  Field,
  InputBox,
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

interface UserSortingOrder {
  key: 'user' | 'points';
  order: 'asc' | 'desc';
}

function RewardQueue() {
  const { t } = useTranslation();
  const [queue, setQueue] = useModule(modules.loyaltyRedeemQueue);
  const dispatch = useDispatch();

  // Big hack but this is required or refunds break
  useUserPoints();

  return <></>;
}

function UserList() {
  const { t } = useTranslation();
  const users = useUserPoints();
  const dispatch = useDispatch();

  const [config] = useModule(modules.loyaltyConfig);
  const [usernameFilter, setUsernameFilter] = useState('');
  const filtered = Object.entries(users ?? [])
    .filter(([user]) => user.includes(usernameFilter))
    .map(([username, data]) => ({
      username,
      ...data,
    }));
  type UserEntry = typeof filtered[0];

  type SortFn = (a: UserEntry, b: UserEntry) => number;

  const sortfn = (key: keyof UserEntry): SortFn => {
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
      <Field size="fullWidth" spacing="none">
        <InputBox
          placeholder={t('pages.loyalty-queue.username-filter')}
          value={usernameFilter}
          onChange={(e) => setUsernameFilter(e.target.value)}
        />
      </Field>
      <DataTable
        sort={sortfn}
        data={filtered}
        columns={[
          {
            key: 'username',
            title: t('pages.loyalty-queue.username'),
            sortable: true,
            style: {
              width: '100%',
              textAlign: 'left',
            },
          },
          {
            key: 'points',
            title: config?.currency || t('pages.loyalty-queue.points'),
            sortable: true,
            style: {
              textTransform: 'capitalize',
            },
          },
          {
            key: 'actions',
            title: '',
            sortable: false,
          },
        ]}
        defaultSort={{ key: 'points', order: 'desc' }}
        view={({ username, points }) => (
          <TableRow key="username">
            <TableCell css={{ width: '100%' }}>{username}</TableCell>
            <TableCell>{points}</TableCell>
            <TableCell>
              <Button size="small">Edit</Button>
            </TableCell>
          </TableRow>
        )}
      />
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
      <TabContainer defaultValue="users">
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
