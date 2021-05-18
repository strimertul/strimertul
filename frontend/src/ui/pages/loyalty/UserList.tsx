import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RouteComponentProps } from '@reach/router';
import PageList from '../../components/PageList';
import { useModule, useUserPoints } from '../../../lib/react-utils';
import { RootState } from '../../../store';
import {
  LoyaltyPointsEntry,
  modules,
  setUserPoints,
} from '../../../store/api/reducer';
import Modal from '../../components/Modal';

interface UserData {
  user: string;
  entry: LoyaltyPointsEntry;
}

interface UserModalProps {
  active: boolean;
  onConfirm: (r: UserData) => void;
  onClose: () => void;
  initialData?: UserData;
  title: string;
  confirmText: string;
}

function UserModal({
  active,
  onConfirm,
  onClose,
  initialData,
  title,
  confirmText,
}: UserModalProps) {
  const currency = useSelector(
    (state: RootState) =>
      state.api.moduleConfigs?.loyaltyConfig?.currency ?? 'points',
  );

  const [user, setUser] = useState(initialData.user);
  const [entry, setEntry] = useState(initialData.entry);
  const userEditable = initialData.user !== '';

  const nameValid = user !== '';
  const pointsValid = Number.isFinite(entry.points);
  const validForm = nameValid && pointsValid;

  const confirm = () => {
    if (onConfirm) {
      onConfirm({
        user,
        entry,
      });
    }
  };

  return (
    <Modal
      active={active}
      title={title}
      showCancel={true}
      bgDismiss={true}
      confirmName={confirmText}
      confirmClass="is-success"
      confirmEnabled={validForm}
      onConfirm={() => confirm()}
      onClose={() => onClose()}
    >
      <div className="field is-horizontal">
        <div className="field-label is-normal">
          <label className="label">Username</label>
        </div>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <input
                disabled={!active || !userEditable}
                className={!nameValid ? 'input is-danger' : 'input'}
                type="text"
                placeholder="Username"
                value={user ?? ''}
                onChange={(ev) => setUser(ev.target.value)}
              />
            </p>
          </div>
        </div>
      </div>
      <div className="field is-horizontal">
        <div className="field-label is-normal">
          <label className="label" style={{ textTransform: 'capitalize' }}>
            {currency}
          </label>
        </div>
        <div className="field-body">
          <div className="field has-addons">
            <p className="control">
              <input
                className="input"
                type="number"
                placeholder="#"
                value={entry.points ?? ''}
                onChange={(ev) =>
                  setEntry({ ...entry, points: parseInt(ev.target.value, 10) })
                }
              />
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

interface SortingOrder {
  key: 'user' | 'points';
  order: 'asc' | 'desc';
}
export default function LoyaltyUserListPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: RouteComponentProps<unknown>,
): React.ReactElement {
  const [loyaltyConfig] = useModule(modules.loyaltyConfig);
  const currency = loyaltyConfig?.currency ?? 'points';
  const users = useUserPoints();
  const dispatch = useDispatch();
  const [sorting, setSorting] = useState<SortingOrder>({
    key: 'points',
    order: 'desc',
  });

  const [entriesPerPage, setEntriesPerPage] = useState(15);
  const [page, setPage] = useState(0);
  const [usernameFilter, setUsernameFilter] = useState('');
  const [editModal, setEditModal] = useState<UserData>(null);

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

  const modifyUser = ({ entry, user }: UserData) => {
    dispatch(setUserPoints({ user, points: entry.points, relative: false }));
    setEditModal(null);
  };

  return (
    <>
      {editModal ? (
        <UserModal
          title="Modify balance"
          confirmText="Edit"
          active={true}
          onConfirm={(entry) => modifyUser(entry)}
          initialData={editModal}
          onClose={() => setEditModal(null)}
        />
      ) : null}
      <h1 className="title is-4">All viewers with {currency}</h1>
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
            itemsPerPage={entriesPerPage}
            onSelectChange={(em) => setEntriesPerPage(em)}
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
                    style={{ textTransform: 'capitalize' }}
                  >
                    {currency}
                    {sorting.key === 'points' ? (
                      <span className="sort-icon">
                        {sorting.order === 'asc' ? '▴' : '▾'}
                      </span>
                    ) : null}
                  </span>
                </th>
                <th style={{ width: '10%' }}></th>
              </tr>
            </thead>

            <tbody>
              {paged.map(([user, p]) => (
                <tr key={user}>
                  <td>{user}</td>
                  <td>{p.points}</td>
                  <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                    <a
                      onClick={() =>
                        setEditModal({
                          user,
                          entry: p,
                        })
                      }
                    >
                      Edit
                    </a>
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
          Viewer list is not available (loyalty disabled or no one has points)
        </p>
      )}
    </>
  );
}
