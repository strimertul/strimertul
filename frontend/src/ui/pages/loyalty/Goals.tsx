import { RouteComponentProps } from '@reach/router';
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useModule } from '../../../lib/react-utils';
import { RootState } from '../../../store';
import { LoyaltyGoal, modules } from '../../../store/api/reducer';
import Modal from '../../components/Modal';

interface GoalItemProps {
  item: LoyaltyGoal;
  onToggleState: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
function GoalItem({ item, onToggleState, onEdit, onDelete }: GoalItemProps) {
  const currency = useSelector(
    (state: RootState) =>
      state.api.moduleConfigs?.loyaltyConfig?.currency ?? 'points',
  );
  const [expanded, setExpanded] = useState(false);
  const placeholder = 'https://bulma.io/images/placeholders/128x128.png';
  const contributors = Object.entries(item.contributors ?? {}).sort(
    ([, pointsA], [, pointsB]) => pointsB - pointsA,
  );

  return (
    <div className="card" style={{ marginBottom: '3px' }}>
      <header className="card-header">
        <div className="card-header-title">
          <div className="media-left">
            <figure className="image is-32x32">
              <img src={item.image || placeholder} alt="Icon" />
            </figure>
          </div>
          {item.enabled ? (
            item.name
          ) : (
            <span className="goal-disabled">{item.name}</span>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.contributed >= item.total ? (
            <span className="goal-reached">Reached!</span>
          ) : (
            <>
              {item.contributed} / {item.total} {currency}
            </>
          )}
        </div>
        <a
          className="card-header-icon"
          aria-label="expand"
          onClick={() => setExpanded(!expanded)}
        >
          <span className={expanded ? 'icon expand-off' : 'icon expand-on'}>
            ❯
          </span>
        </a>
      </header>
      {expanded ? (
        <div className="content">
          {item.description}
          <div className="contributors" style={{ marginTop: '1rem' }}>
            {contributors.length > 0 ? (
              <>
                <b>Contributors:</b>
                <table className="table is-striped is-narrow">
                  <tr>
                    <th>Username</th>
                    <th>Points</th>
                  </tr>
                  {contributors.map(([user, points]) => (
                    <tr>
                      <td>{user}</td>
                      <td>
                        {points}{' '}
                        <span className="goal-point-percent">
                          ({Math.round((points / item.total) * 10000) / 100}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </table>
              </>
            ) : (
              <b>No one has contributed yet :(</b>
            )}
          </div>
          <div style={{ marginTop: '1rem' }}>
            <a className="button is-small" onClick={onToggleState}>
              {item.enabled ? 'Disable' : 'Enable'}
            </a>{' '}
            <a className="button is-small" onClick={onEdit}>
              Edit
            </a>{' '}
            <a className="button is-small" onClick={onDelete}>
              Delete
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface GoalModalProps {
  active: boolean;
  onConfirm: (r: LoyaltyGoal) => void;
  onClose: () => void;
  initialData?: LoyaltyGoal;
  title: string;
  confirmText: string;
}

function GoalModal({
  active,
  onConfirm,
  onClose,
  initialData,
  title,
  confirmText,
}: GoalModalProps) {
  const [loyaltyConfig] = useModule(modules.loyaltyConfig);
  const [goals] = useModule(modules.loyaltyGoals);

  const [id, setID] = useState(initialData?.id ?? '');
  const [name, setName] = useState(initialData?.name ?? '');
  const [image, setImage] = useState(initialData?.image ?? '');
  const [description, setDescription] = useState(
    initialData?.description ?? '',
  );
  const [total, setTotal] = useState(initialData?.total ?? 0);

  const setIDex = (newID) =>
    setID(newID.toLowerCase().replace(/[^a-zA-Z0-9]/gi, '-'));

  const slug = id || name?.toLowerCase().replace(/[^a-zA-Z0-9]/gi, '-') || '';
  const idExists = goals?.some((reward) => reward.id === slug) ?? false;
  const idInvalid = slug !== initialData?.id && idExists;

  const validForm = idInvalid === false && name !== '' && total >= 0;

  const confirm = () => {
    if (onConfirm) {
      onConfirm({
        id: slug,
        name,
        description,
        total,
        enabled: initialData?.enabled ?? false,
        image,
        contributed: initialData?.contributed ?? 0,
        contributors: initialData?.contributors ?? {},
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
          <label className="label">Reward ID</label>
        </div>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <input
                className={idInvalid ? 'input is-danger' : 'input'}
                type="text"
                placeholder="reward_id_here"
                value={slug}
                onChange={(ev) => setIDex(ev.target.value)}
              />
            </p>
            {idInvalid ? (
              <p className="help is-danger">
                There is already a reward with this ID! Please choose a
                different one.
              </p>
            ) : (
              <p className="help">
                Choose a simple name that can be referenced by other software.
                It will be auto-generated from the reward name if you leave it
                blank.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="field is-horizontal">
        <div className="field-label is-normal">
          <label className="label">Name</label>
        </div>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <input
                disabled={!active}
                className="input"
                type="text"
                placeholder="My dream goal"
                value={name ?? ''}
                onChange={(ev) => setName(ev.target.value)}
              />
            </p>
          </div>
        </div>
      </div>
      <div className="field is-horizontal">
        <div className="field-label is-normal">
          <label className="label">Icon</label>
        </div>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <input
                className="input"
                type="text"
                placeholder="Image URL"
                value={image ?? ''}
                onChange={(ev) => setImage(ev.target.value)}
              />
            </p>
          </div>
        </div>
      </div>
      <div className="field is-horizontal">
        <div className="field-label is-normal">
          <label className="label">Description</label>
        </div>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <textarea
                className="textarea"
                placeholder="What's gonna happen when we reach this goal?"
                onChange={(ev) => setDescription(ev.target.value)}
                value={description}
              ></textarea>
            </p>
          </div>
        </div>
      </div>
      <div className="field is-horizontal">
        <div className="field-label is-normal">
          <label className="label">Required</label>
        </div>
        <div className="field-body">
          <div className="field has-addons">
            <p className="control">
              <input
                className="input"
                type="number"
                placeholder="#"
                value={total ?? ''}
                onChange={(ev) => setTotal(parseInt(ev.target.value, 10))}
              />
            </p>
            <p className="control">
              <a className="button is-static">{loyaltyConfig?.currency}</a>
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function LoyaltyGoalsPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: RouteComponentProps<unknown>,
): React.ReactElement {
  const [goals, setGoals] = useModule(modules.loyaltyGoals);
  const [moduleConfig] = useModule(modules.moduleConfig);

  const dispatch = useDispatch();

  const twitchBotActive = moduleConfig?.twitchbot ?? false;
  const loyaltyEnabled = moduleConfig?.loyalty ?? false;
  const active = twitchBotActive && loyaltyEnabled;

  const [goalFilter, setGoalFilter] = useState('');
  const goalFilterLC = goalFilter.toLowerCase();

  const [createModal, setCreateModal] = useState(false);
  const [showModifyGoal, setShowModifyGoal] = useState(null);

  const createGoal = (newGoal: LoyaltyGoal) => {
    dispatch(setGoals([...(goals ?? []), newGoal]));
    setCreateModal(false);
  };

  const toggleGoal = (goalID: string) => {
    dispatch(
      setGoals(
        goals.map((entry) =>
          entry.id === goalID
            ? {
                ...entry,
                enabled: !entry.enabled,
              }
            : entry,
        ),
      ),
    );
  };

  const modifyGoal = (originalGoalID: string, goal: LoyaltyGoal) => {
    dispatch(
      setGoals(
        goals.map((entry) => (entry.id === originalGoalID ? goal : entry)),
      ),
    );
    setShowModifyGoal(null);
  };

  const deleteGoal = (goalID: string) => {
    dispatch(setGoals(goals.filter((entry) => entry.id !== goalID)));
  };

  return (
    <>
      <h1 className="title is-4">Community goals</h1>

      <div className="field is-grouped">
        <p className="control">
          <button
            className="button"
            disabled={!active}
            onClick={() => setCreateModal(true)}
          >
            New goal
          </button>
        </p>

        <p className="control">
          <input
            className="input"
            type="text"
            placeholder="Search by name"
            value={goalFilter}
            onChange={(ev) => setGoalFilter(ev.target.value)}
          />
        </p>
      </div>

      <GoalModal
        title="New goal"
        confirmText="Create"
        active={createModal}
        onConfirm={createGoal}
        onClose={() => setCreateModal(false)}
      />
      {showModifyGoal ? (
        <GoalModal
          title="Modify goal"
          confirmText="Edit"
          active={true}
          onConfirm={(goal) => modifyGoal(showModifyGoal.id, goal)}
          initialData={showModifyGoal}
          onClose={() => setShowModifyGoal(null)}
        />
      ) : null}
      <div className="goal-list" style={{ marginTop: '1rem' }}>
        {goals
          ?.filter((goal) => goal.name.toLowerCase().includes(goalFilterLC))
          .map((goal) => (
            <GoalItem
              key={goal.name}
              item={goal}
              onDelete={() => deleteGoal(goal.id)}
              onEdit={() => setShowModifyGoal(goal)}
              onToggleState={() => toggleGoal(goal.id)}
            />
          ))}
      </div>
    </>
  );
}
