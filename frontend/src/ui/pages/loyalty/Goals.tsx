import { RouteComponentProps } from '@reach/router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { useModule } from '../../../lib/react-utils';
import { RootState } from '../../../store';
import { modules } from '../../../store/api/reducer';
import Modal from '../../components/Modal';
import { LoyaltyGoal } from '../../../store/api/types';
import Field from '../../components/Field';

interface GoalItemProps {
  item: LoyaltyGoal;
  onToggleState: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
function GoalItem({ item, onToggleState, onEdit, onDelete }: GoalItemProps) {
  const { t } = useTranslation();
  const currency = useSelector(
    (state: RootState) =>
      state.api.moduleConfigs?.loyaltyConfig?.currency ??
      t('loyalty.points-fallback'),
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
            <span className="goal-reached">{t('loyalty.goals.reached')}</span>
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
                <b>{t('loyalty.goals.contributors')}</b>
                <table className="table is-striped is-narrow">
                  <tr>
                    <th>{t('form-common.username')}</th>
                    <th>{t('loyalty.points')}</th>
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
              <b>{t('loyalty.goals.no-contributors')}</b>
            )}
          </div>
          <div style={{ marginTop: '1rem' }}>
            <a className="button is-small" onClick={onToggleState}>
              {item.enabled ? t('actions.disable') : t('actions.enable')}
            </a>{' '}
            <a className="button is-small" onClick={onEdit}>
              {t('actions.edit')}
            </a>{' '}
            <a className="button is-small" onClick={onDelete}>
              {t('actions.delete')}
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
  const { t } = useTranslation();

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
  const idExists = goals?.some((goal) => goal.id === slug) ?? false;
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
      <Field name={t('loyalty.goals.id')} horizontal>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <input
                className={idInvalid ? 'input is-danger' : 'input'}
                type="text"
                placeholder={t('loyalty.goals.id-placeholder')}
                value={slug}
                onChange={(ev) => setIDex(ev.target.value)}
              />
            </p>
            {idInvalid ? (
              <p className="help is-danger">
                {t('loyalty.goals.err-goalid-dup')}
              </p>
            ) : (
              <p className="help">{t('loyalty.goals.id-help')}</p>
            )}
          </div>
        </div>
      </Field>
      <Field name={t('loyalty.goals.name')} horizontal>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <input
                disabled={!active}
                className="input"
                type="text"
                placeholder={t('loyalty.goals.name-placeholder')}
                value={name ?? ''}
                onChange={(ev) => setName(ev.target.value)}
              />
            </p>
          </div>
        </div>
      </Field>
      <Field name={t('loyalty.goals.icon')} horizontal>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <input
                className="input"
                type="text"
                placeholder={t('loyalty.goals.icon-placeholder')}
                value={image ?? ''}
                onChange={(ev) => setImage(ev.target.value)}
              />
            </p>
          </div>
        </div>
      </Field>
      <Field name={t('loyalty.goals.description')} horizontal>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <textarea
                className="textarea"
                placeholder={t('loyalty.goals.description-placeholder')}
                onChange={(ev) => setDescription(ev.target.value)}
                value={description}
              />
            </p>
          </div>
        </div>
      </Field>
      <Field name={t('form-common.required')} horizontal>
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
      </Field>
    </Modal>
  );
}

export default function LoyaltyGoalsPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: RouteComponentProps<unknown>,
): React.ReactElement {
  const [goals, setGoals] = useModule(modules.loyaltyGoals);
  const [twitchConfig] = useModule(modules.twitchConfig);
  const [loyaltyConfig] = useModule(modules.loyaltyConfig);

  const { t } = useTranslation();
  const dispatch = useDispatch();

  const twitchActive = twitchConfig?.enabled ?? false;
  const loyaltyEnabled = loyaltyConfig?.enabled ?? false;
  const active = twitchActive && loyaltyEnabled;

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
      <h1 className="title is-4">{t('loyalty.goals.header')}</h1>

      <div className="field is-grouped">
        <p className="control">
          <button
            className="button"
            disabled={!active}
            onClick={() => setCreateModal(true)}
          >
            {t('loyalty.goals.new')}
          </button>
        </p>

        <p className="control">
          <input
            className="input"
            type="text"
            placeholder={t('loyalty.goals.search')}
            value={goalFilter}
            onChange={(ev) => setGoalFilter(ev.target.value)}
          />
        </p>
      </div>

      <GoalModal
        title={t('loyalty.goals.new')}
        confirmText={t('actions.create')}
        active={createModal}
        onConfirm={createGoal}
        onClose={() => setCreateModal(false)}
      />
      {showModifyGoal ? (
        <GoalModal
          title={t('loyalty.goals.modify')}
          confirmText={t('actions.edit')}
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
