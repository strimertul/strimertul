import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { RouteComponentProps } from '@reach/router';
import { useModule, useUserPoints } from '../../../lib/react-utils';
import {
  LoyaltyRedeem,
  modules,
  removeRedeem,
  setUserPoints,
} from '../../../store/api/reducer';
import PageList from '../../components/PageList';

interface SortingOrder {
  key: 'user' | 'when';
  order: 'asc' | 'desc';
}

export default function LoyaltyRedeemQueuePage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: RouteComponentProps<unknown>,
): React.ReactElement {
  const [redemptions] = useModule(modules.loyaltyRedeemQueue);

  // Big hack but this is required or refunds break
  useUserPoints();

  const [sorting, setSorting] = useState<SortingOrder>({
    key: 'when',
    order: 'desc',
  });

  const [entriesPerPage, setEntriesPerPage] = useState(15);
  const [page, setPage] = useState(0);
  const [usernameFilter, setUsernameFilter] = useState('');
  const dispatch = useDispatch();

  const changeSort = (key: 'user' | 'when') => {
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

  const filtered =
    redemptions?.filter(({ username }) => username.includes(usernameFilter)) ??
    [];

  const sortedEntries = filtered;
  switch (sorting.key) {
    case 'user':
      if (sorting.order === 'asc') {
        sortedEntries.sort((a, b) => (a.username > b.username ? 1 : -1));
      } else {
        sortedEntries.sort((a, b) => (a.username < b.username ? 1 : -1));
      }
      break;
    case 'when':
      if (sorting.order === 'asc') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        sortedEntries.sort(
          (a, b) =>
            Date.parse(a.when.toString()) - Date.parse(b.when.toString()),
        );
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        sortedEntries.sort(
          (a, b) =>
            Date.parse(b.when.toString()) - Date.parse(a.when.toString()),
        );
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

  const acceptRedeem = (redeem: LoyaltyRedeem) => {
    // Just take the redeem off the list
    dispatch(removeRedeem(redeem));
  };

  const refundRedeem = (redeem: LoyaltyRedeem) => {
    // Give points back to the viewer
    dispatch(
      setUserPoints({
        user: redeem.username,
        points: redeem.reward.price,
        relative: true,
      }),
    );
    // Take the redeem off the list
    dispatch(removeRedeem(redeem));
  };

  return (
    <>
      <h1 className="title is-4">Redemption queue</h1>
      {redemptions ? (
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
            itemsPerPage={entriesPerPage}
            onSelectChange={(em) => setEntriesPerPage(em)}
            onPageChange={(p) => setPage(p - 1)}
          />
          <table className="table is-striped is-fullwidth">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>
                  <span className="sortable" onClick={() => changeSort('when')}>
                    Date
                    {sorting.key === 'when' ? (
                      <span className="sort-icon">
                        {sorting.order === 'asc' ? '▴' : '▾'}
                      </span>
                    ) : null}
                  </span>
                </th>
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
                <th>Reward name</th>
                <th>Request</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {paged.map((redemption) => (
                <tr
                  key={`${redemption.when}-${redemption.username}-${redemption.reward.id}`}
                >
                  <td>{new Date(redemption.when).toLocaleString()}</td>
                  <td>
                    {redemption.display_name} ({redemption.username})
                  </td>
                  <td>{redemption.reward.name}</td>
                  <td>{redemption.request_text}</td>
                  <td style={{ textAlign: 'right' }}>
                    <a onClick={() => acceptRedeem(redemption)}>Accept</a>
                    {redemption.username !== '@PLATFORM' ? (
                      <>
                        {' 🞄 '}
                        <a onClick={() => refundRedeem(redemption)}>Refund</a>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PageList
            current={page + 1}
            min={1}
            max={totalPages + 1}
            itemsPerPage={entriesPerPage}
            onSelectChange={(em) => setEntriesPerPage(em)}
            onPageChange={(p) => setPage(p - 1)}
          />
        </>
      ) : (
        <p>
          Redemption queue is not available (loyalty disabled or no one has
          redeemed anything yet)
        </p>
      )}
    </>
  );
}
