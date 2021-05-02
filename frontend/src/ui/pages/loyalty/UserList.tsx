import React, { useState } from 'react';
import { RouteComponentProps } from '@reach/router';
import { useModule } from '../../../lib/react-utils';
import { modules } from '../../../store/api/reducer';
import PageList from '../../components/PageList';

interface SortingOrder {
  key: 'user' | 'points';
  order: 'asc' | 'desc';
}
export default function LoyaltyUserListPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: RouteComponentProps<unknown>,
): React.ReactElement {
  const [users] = useModule(modules.loyaltyStorage);

  const [sorting, setSorting] = useState<SortingOrder>({
    key: 'points',
    order: 'desc',
  });

  const [entriesPerPage, setEntriesPerPage] = useState(15);
  const [page, setPage] = useState(0);
  const [usernameFilter, setUsernameFilter] = useState('');

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
        sortedEntries.sort(([_a, pointsA], [_b, pointsB]) => pointsA - pointsB);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        sortedEntries.sort(([_a, pointsA], [_b, pointsB]) => pointsB - pointsA);
      }
      break;
    default:
    // unreacheable
  }

  const paged = sortedEntries.slice(
    page * entriesPerPage,
    (page + 1) * entriesPerPage,
  );
  const totalPages = Math.floor(sortedEntries.length / entriesPerPage);

  return (
    <>
      <h1 className="title is-4">All viewers with points</h1>
      {users ? (
        <>
          <div className="field">
            <input
              className="input is-small"
              type="text"
              placeholder="Search by username"
              value={usernameFilter}
              onChange={(ev) =>
                setUsernameFilter(ev.target.value.toLowerCase())
              }
            />
          </div>
          <PageList
            current={page + 1}
            min={1}
            max={totalPages + 1}
            onPageChange={(p) => setPage(p - 1)}
          />
          <table className="table is-striped is-fullwidth">
            <thead>
              <tr>
                <th>
                  <span className="sortable" onClick={() => changeSort('user')}>
                    Username
                    {sorting.key === 'user' ? (
                      <span className="sort-icon">
                        {sorting.order === 'asc' ? '▴' : '▾'}
                      </span>
                    ) : null}
                  </span>
                </th>
                <th style={{ width: '20%' }}>
                  <span
                    className="sortable"
                    onClick={() => changeSort('points')}
                  >
                    Points
                    {sorting.key === 'points' ? (
                      <span className="sort-icon">
                        {sorting.order === 'asc' ? '▴' : '▾'}
                      </span>
                    ) : null}
                  </span>
                </th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {paged.map(([user, points]) => (
                <tr key={user}>
                  <td>{user}</td>
                  <td>{points}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
          <PageList
            current={page + 1}
            min={1}
            max={totalPages + 1}
            onPageChange={(p) => setPage(p - 1)}
          />
        </>
      ) : (
        <p>
          Viewer list is not available (loyalty disabled or no one has points)
        </p>
      )}
    </>
  );
}
