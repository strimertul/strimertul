import { RouteComponentProps } from '@reach/router';
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import prettyTime from 'pretty-ms';
import { useTranslation } from 'react-i18next';
import { useModule } from '../../../lib/react-utils';
import { RootState } from '../../../store';
import { createRedeem, modules } from '../../../store/api/reducer';
import Modal from '../../components/Modal';
import { LoyaltyReward } from '../../../store/api/types';
import Field from '../../components/Field';
import Interval from '../../components/Interval';

interface RewardItemProps {
  item: LoyaltyReward;
  onToggleState: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
}
function RewardItem({
  item,
  onToggleState,
  onEdit,
  onDelete,
  onTest,
}: RewardItemProps) {
  const { t } = useTranslation();
  const currency = useSelector(
    (state: RootState) =>
      state.api.moduleConfigs?.loyaltyConfig?.currency ??
      t('loyalty.points-fallback'),
  );
  const [expanded, setExpanded] = useState(false);
  const placeholder = 'https://bulma.io/images/placeholders/128x128.png';

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
            <span className="reward-disabled">{item.name}</span>
          )}
          <code style={{ backgroundColor: 'transparent', color: 'inherit' }}>
            (<span style={{ color: '#1abc9c' }}>{item.id}</span>)
          </code>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.price} {currency}
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
          {item.cooldown > 0 ? (
            <div style={{ marginTop: '1rem' }}>
              <b>{t('loyalty.rewards.cooldown')}:</b>{' '}
              {prettyTime(item.cooldown * 1000)}
            </div>
          ) : null}
          {item.required_info ? (
            <div style={{ marginTop: '1rem' }}>
              <b>{t('loyalty.rewards.required-info')}:</b> {item.required_info}
            </div>
          ) : null}
          <div style={{ marginTop: '1rem' }}>
            <a className="button is-small" onClick={onTest}>
              {t('actions.test')}
            </a>{' '}
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

interface RewardModalProps {
  active: boolean;
  onConfirm: (r: LoyaltyReward) => void;
  onClose: () => void;
  initialData?: LoyaltyReward;
  title: string;
  confirmText: string;
}

function RewardModal({
  active,
  onConfirm,
  onClose,
  initialData,
  title,
  confirmText,
}: RewardModalProps) {
  const { t } = useTranslation();
  const currency = useSelector(
    (state: RootState) =>
      state.api.moduleConfigs?.loyaltyConfig?.currency ?? 'points',
  );
  const [rewards] = useModule(modules.loyaltyRewards);

  const [id, setID] = useState(initialData?.id ?? '');
  const [name, setName] = useState(initialData?.name ?? '');
  const [image, setImage] = useState(initialData?.image ?? '');
  const [description, setDescription] = useState(
    initialData?.description ?? '',
  );
  const [price, setPrice] = useState(initialData?.price ?? 0);
  const [extraDetails, setExtraDetails] = useState(
    initialData?.required_info ?? '',
  );
  const [extraRequired, setExtraRequired] = useState(extraDetails !== '');

  const [cooldown, setCooldown] = useState(initialData?.cooldown ?? 0);

  const setIDex = (newID) =>
    setID(newID.toLowerCase().replace(/[^a-zA-Z0-9]/gi, '-'));

  const slug = id || name?.toLowerCase().replace(/[^a-zA-Z0-9]/gi, '-') || '';
  const idExists = rewards?.some((reward) => reward.id === slug) ?? false;
  const idInvalid = slug !== initialData?.id && idExists;

  const validForm = idInvalid === false && name !== '' && price >= 0;

  const confirm = () => {
    if (onConfirm) {
      onConfirm({
        id: slug,
        name,
        description,
        price,
        enabled: initialData?.enabled ?? false,
        image,
        required_info: extraRequired ? extraDetails : undefined,
        cooldown,
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
      <Field name={t('loyalty.rewards.id')} horizontal>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <input
                className={idInvalid ? 'input is-danger' : 'input'}
                type="text"
                placeholder={t('loyalty.rewards.id-placeholder')}
                value={slug}
                onChange={(ev) => setIDex(ev.target.value)}
              />
            </p>
            {idInvalid ? (
              <p className="help is-danger">
                {t('loyalty.rewards.err-rewid-dup')}
              </p>
            ) : (
              <p className="help">{t('loyalty.rewards.id-help')}</p>
            )}
          </div>
        </div>
      </Field>
      <Field name={t('loyalty.rewards.name')} horizontal>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <input
                disabled={!active}
                className="input"
                type="text"
                placeholder={t('loyalty.rewards.name-placeholder')}
                value={name ?? ''}
                onChange={(ev) => setName(ev.target.value)}
              />
            </p>
          </div>
        </div>
      </Field>
      <Field name={t('loyalty.rewards.icon')} horizontal>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <input
                className="input"
                type="text"
                placeholder={t('loyalty.rewards.icon-placeholder')}
                value={image ?? ''}
                onChange={(ev) => setImage(ev.target.value)}
              />
            </p>
          </div>
        </div>
      </Field>
      <Field name={t('loyalty.rewards.description')} horizontal>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <textarea
                className="textarea"
                placeholder={t('loyalty.rewards.description-placeholder')}
                onChange={(ev) => setDescription(ev.target.value)}
                value={description}
              />
            </p>
          </div>
        </div>
      </Field>
      <Field name={t('loyalty.rewards.cost')} horizontal>
        <div className="field-body">
          <div className="field has-addons">
            <p className="control">
              <input
                className="input"
                type="number"
                placeholder="#"
                value={price ?? ''}
                onChange={(ev) => setPrice(parseInt(ev.target.value, 10))}
              />
            </p>
            <p className="control">
              <a className="button is-static">{currency}</a>
            </p>
          </div>
        </div>
      </Field>
      <Field horizontal>
        <div className="field-label is-normal" />
        <div className="field-body">
          <div className="field">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={extraRequired}
                onChange={(ev) => setExtraRequired(ev.target.checked)}
              />{' '}
              {t('loyalty.rewards.requires-extra-info')}
            </label>
          </div>
        </div>
      </Field>
      {extraRequired ? (
        <>
          <Field name={t('loyalty.rewards.extra-info')} horizontal>
            <div className="field-body">
              <div className="field">
                <p className="control">
                  <input
                    disabled={!active}
                    className="input"
                    type="text"
                    placeholder={t('loyalty.rewards.extra-info-placeholder')}
                    value={extraDetails ?? ''}
                    onChange={(ev) => setExtraDetails(ev.target.value)}
                  />
                </p>
              </div>
            </div>
          </Field>
        </>
      ) : null}
      <Field horizontal name={t('loyalty.rewards.cooldown')}>
        <div className="field-body">
          <div className="field has-addons">
            <Interval active={active} value={cooldown} onChange={setCooldown} />
          </div>
        </div>
      </Field>
    </Modal>
  );
}

export default function LoyaltyRewardsPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: RouteComponentProps<unknown>,
): React.ReactElement {
  const [rewards, setRewards] = useModule(modules.loyaltyRewards);
  const [twitchConfig] = useModule(modules.twitchConfig);
  const [loyaltyConfig] = useModule(modules.loyaltyConfig);

  const dispatch = useDispatch();
  const { t } = useTranslation();

  const twitchActive = twitchConfig?.enabled ?? false;
  const loyaltyEnabled = loyaltyConfig?.enabled ?? false;
  const active = twitchActive && loyaltyEnabled;

  const [rewardFilter, setRewardFilter] = useState('');
  const rewardFilterLC = rewardFilter.toLowerCase();

  const [createModal, setCreateModal] = useState(false);
  const [showModifyReward, setShowModifyReward] = useState(null);

  const createReward = (newReward: LoyaltyReward) => {
    dispatch(setRewards([...(rewards ?? []), newReward]));
    setCreateModal(false);
  };

  const toggleReward = (rewardID: string) => {
    dispatch(
      setRewards(
        rewards.map((entry) =>
          entry.id === rewardID
            ? {
                ...entry,
                enabled: !entry.enabled,
              }
            : entry,
        ),
      ),
    );
  };

  const modifyReward = (originRewardID: string, reward: LoyaltyReward) => {
    dispatch(
      setRewards(
        rewards.map((entry) => (entry.id === originRewardID ? reward : entry)),
      ),
    );
    setShowModifyReward(null);
  };

  const deleteReward = (rewardID: string) => {
    dispatch(setRewards(rewards.filter((entry) => entry.id !== rewardID)));
  };

  const testRedeem = (reward: LoyaltyReward) => {
    dispatch(
      createRedeem({
        username: '@PLATFORM',
        display_name: 'me :3',
        when: new Date(),
        reward,
        request_text: '',
      }),
    );
  };

  return (
    <>
      <h1 className="title is-4">{t('loyalty.rewards.header')}</h1>

      <div className="field is-grouped">
        <p className="control">
          <button
            className="button"
            disabled={!active}
            onClick={() => setCreateModal(true)}
          >
            {t('loyalty.rewards.new-reward')}
          </button>
        </p>

        <p className="control">
          <input
            className="input"
            type="text"
            placeholder={t('loyalty.rewards.search')}
            value={rewardFilter}
            onChange={(ev) => setRewardFilter(ev.target.value)}
          />
        </p>
      </div>

      <RewardModal
        title={t('loyalty.rewards.new-reward')}
        confirmText={t('actions.create')}
        active={createModal}
        onConfirm={createReward}
        onClose={() => setCreateModal(false)}
      />
      {showModifyReward ? (
        <RewardModal
          title={t('loyalty.rewards.modify-reward')}
          confirmText={t('actions.edit')}
          active={true}
          onConfirm={(reward) => modifyReward(showModifyReward.id, reward)}
          initialData={showModifyReward}
          onClose={() => setShowModifyReward(null)}
        />
      ) : null}
      <div className="reward-list" style={{ marginTop: '1rem' }}>
        {rewards
          ?.filter((reward) =>
            reward.name.toLowerCase().includes(rewardFilterLC),
          )
          .map((reward) => (
            <RewardItem
              key={reward.id}
              item={reward}
              onDelete={() => deleteReward(reward.id)}
              onEdit={() => setShowModifyReward(reward)}
              onToggleState={() => toggleReward(reward.id)}
              onTest={() => testRedeem(reward)}
            />
          ))}
      </div>
    </>
  );
}
