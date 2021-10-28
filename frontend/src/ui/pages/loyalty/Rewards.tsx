import { RouteComponentProps } from '@reach/router';
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import prettyTime from 'pretty-ms';
import { useTranslation } from 'react-i18next';
import { useModule } from '../../../lib/react-utils';
import { RootState } from '../../../store';
import {
  createRedeem,
  modules,
} from '../../../store/api/reducer';
import Modal from '../../components/Modal';
import { getInterval } from '../../../lib/time-utils';
import {LoyaltyReward} from "../../../store/api/types";

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
              {item.enabled ? 'Disable' : 'Enable'}
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

  const [cooldownNum, cooldownMultiplier] = getInterval(cooldown);
  const [tempCooldownNum, setTempCooldownNum] = useState(cooldownNum);
  const [tempCooldownMult, setTempCooldownMult] = useState(cooldownMultiplier);

  useEffect(() => {
    setCooldown(tempCooldownNum * tempCooldownMult);
  }, [tempCooldownNum, tempCooldownMult]);

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
      <div className="field is-horizontal">
        <div className="field-label is-normal">
          <label className="label">{t('loyalty.rewards.id')}</label>
        </div>
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
      </div>
      <div className="field is-horizontal">
        <div className="field-label is-normal">
          <label className="label">{t('loyalty.rewards.name')}</label>
        </div>
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
      </div>
      <div className="field is-horizontal">
        <div className="field-label is-normal">
          <label className="label">{t('loyalty.rewards.icon')}</label>
        </div>
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
      </div>
      <div className="field is-horizontal">
        <div className="field-label is-normal">
          <label className="label">{t('loyalty.rewards.description')}</label>
        </div>
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
      </div>
      <div className="field is-horizontal">
        <div className="field-label is-normal">
          <label className="label">{t('loyalty.rewards.cost')}</label>
        </div>
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
      </div>
      <div className="field is-horizontal">
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
      </div>
      {extraRequired ? (
        <>
          <div className="field is-horizontal">
            <div className="field-label is-normal">
              <label className="label">{t('loyalty.rewards.extra-info')}</label>
            </div>
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
          </div>
        </>
      ) : null}
      <div className="field is-horizontal">
        <div className="field-label is-normal">
          <label className="label">{t('loyalty.rewards.cooldown')}</label>
        </div>
        <div className="field-body">
          <div className="field has-addons">
            <p className="control">
              <input
                disabled={!active}
                className="input"
                type="number"
                placeholder="#"
                value={tempCooldownNum ?? ''}
                onChange={(ev) => {
                  const intNum = parseInt(ev.target.value, 10);
                  if (Number.isNaN(intNum)) {
                    return;
                  }
                  setTempCooldownNum(intNum);
                }}
              />
            </p>
            <p className="control">
              <span className="select">
                <select
                  value={tempCooldownMult.toString() ?? ''}
                  disabled={!active}
                  onChange={(ev) => {
                    const intMult = parseInt(ev.target.value, 10);
                    if (Number.isNaN(intMult)) {
                      return;
                    }
                    setTempCooldownMult(intMult);
                  }}
                >
                  <option value="1">{t('form-common.time.seconds')}</option>
                  <option value="60">{t('form-common.time.minutes')}</option>
                  <option value="3600">{t('form-common.time.hours')}</option>
                </select>
              </span>
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function LoyaltyRewardsPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: RouteComponentProps<unknown>,
): React.ReactElement {
  const [rewards, setRewards] = useModule(modules.loyaltyRewards);
  const [moduleConfig] = useModule(modules.moduleConfig);

  const dispatch = useDispatch();
  const { t } = useTranslation();

  const twitchActive = moduleConfig?.twitch ?? false;
  const loyaltyEnabled = moduleConfig?.loyalty ?? false;
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
