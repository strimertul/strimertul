import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useModule, useUserPoints } from '../../lib/react-utils';
import { modules } from '../../store/api/reducer';
import PageList from '../components/PageList';
import {
  PageContainer,
  PageHeader,
  PageTitle,
  TabButton,
  TabContainer,
  TabContent,
  TabList,
  TextBlock,
} from '../theme';

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

  const [entriesPerPage, setEntriesPerPage] = useState(15);
  const [page, setPage] = useState(0);
  const [usernameFilter, setUsernameFilter] = useState('');
  const [sorting, setSorting] = useState<UserSortingOrder>({
    key: 'points',
    order: 'desc',
  });

  const changeSort = (key: 'user' | 'points') => {
    if (sorting.key === key) {
      // Same key, swap sorting order
      setSorting({
        ...sorting,
        order: sorting.order === 'asc' ? 'desc' : 'asc',
      });
    } else {
      // Different key, change to sort that key
      setSorting({ ...sorting, key, order: 'asc' });
    }
  };

  const rawEntries = Object.entries(users ?? []);
  const filtered = rawEntries.filter(([user]) => user.includes(usernameFilter));

  const sortedEntries = filtered;
  switch (sorting.key) {
    case 'user':
      if (sorting.order === 'asc') {
        sortedEntries.sort(([userA], [userB]) => (userA > userB ? 1 : -1));
      } else {
        sortedEntries.sort(([userA], [userB]) => (userA < userB ? 1 : -1));
      }
      break;
    case 'points':
      if (sorting.order === 'asc') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        sortedEntries.sort(([_a, a], [_b, b]) => a.points - b.points);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        sortedEntries.sort(([_a, a], [_b, b]) => b.points - a.points);
      }
      break;
    default:
    // unreacheable
  }

  const offset = page * entriesPerPage;
  const paged = sortedEntries.slice(offset, offset + entriesPerPage);
  const totalPages = Math.floor(sortedEntries.length / entriesPerPage);

  return (
    <>
      <PageList
        current={page + 1}
        min={1}
        max={totalPages + 1}
        itemsPerPage={entriesPerPage}
        onSelectChange={(em) => setEntriesPerPage(em)}
        onPageChange={(p) => setPage(p - 1)}
      />

      {paged.map(([user, { points }]) => (
        <article key={user}>
          {user} - {points}
        </article>
      ))}

      <PageList
        current={page + 1}
        min={1}
        max={totalPages + 1}
        itemsPerPage={entriesPerPage}
        onSelectChange={(em) => setEntriesPerPage(em)}
        onPageChange={(p) => setPage(p - 1)}
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
