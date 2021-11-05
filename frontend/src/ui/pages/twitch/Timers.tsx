import { RouteComponentProps } from '@reach/router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useModule } from '../../../lib/react-utils';
import { modules } from '../../../store/api/reducer';
import Modal from '../../components/Modal';
import { TwitchBotTimer } from '../../../store/api/types';
import Field from '../../components/Field';
import Interval from '../../components/Interval';

interface TimerItemProps {
  item: TwitchBotTimer;
  onToggleState: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
function TimerItem({ item, onToggleState, onEdit, onDelete }: TimerItemProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card customcommand" style={{ marginBottom: '3px' }}>
      <header className="card-header">
        <div className="card-header-title">
          {item.enabled ? (
            <code>{item.name}</code>
          ) : (
            <span className="reward-disabled">
              <code>{item.name}</code>
            </span>
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
          {t('twitch.timers.messages')}:{' '}
          {item.messages.map((message) => (
            <blockquote>{message}</blockquote>
          ))}
          <div style={{ marginTop: '1rem' }}>
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

interface TimerModalProps {
  active: boolean;
  onConfirm: (newName: string, r: TwitchBotTimer) => void;
  onClose: () => void;
  initialData?: TwitchBotTimer;
  initialName?: string;
  title: string;
  confirmText: string;
}

function TimerModal({
  active,
  onConfirm,
  onClose,
  initialName,
  initialData,
  title,
  confirmText,
}: TimerModalProps) {
  const [name, setName] = useState(initialName ?? '');
  const [messages, setMessages] = useState(initialData?.messages ?? ['']);
  const [minDelay, setMinDelay] = useState(initialData?.minimum_delay ?? 300);
  const [minActivity, setMinActivity] = useState(
    initialData?.minimum_chat_activity ?? 5,
  );

  const { t } = useTranslation();
  const validForm = name !== '' && messages.length > 0 && messages[0] !== '';

  const confirm = () => {
    if (onConfirm) {
      onConfirm(name, {
        name,
        messages,
        minimum_chat_activity: 0,
        minimum_delay: 0,
        enabled: initialData?.enabled ?? false,
      });
    }
  };

  const setMessageIndex = (value: string, index: number) => {
    const newMessages = [...messages];
    newMessages[index] = value;
    setMessages(newMessages);
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
      <Field name={t('twitch.timers.name')} horizontal>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <input
                className={name !== '' ? 'input' : 'input is-danger'}
                type="text"
                placeholder={t('twitch.timers.name-hint')}
                value={name}
                onChange={(ev) => setName(ev.target.value)}
              />
            </p>
          </div>
        </div>
      </Field>
      <Field name={t('twitch.timers.minimum-delay')} horizontal>
        <div className="field-body">
          <div className="field has-addons" style={{ marginBottom: 0 }}>
            <Interval
              value={minDelay}
              onChange={setMinDelay}
              active={active}
              min={5}
            />
          </div>
        </div>
      </Field>
      <Field name={t('twitch.timers.minimum-activity')} horizontal>
        <div className="field-body">
          <div className="field has-addons" style={{ marginBottom: 0 }}>
            <p className="control">
              <input
                disabled={!active}
                className="input"
                type="number"
                placeholder="#"
                style={{ width: '6rem' }}
                value={minActivity ?? 0}
                onChange={(ev) => {
                  const amount = parseInt(ev.target.value, 10);
                  if (Number.isNaN(amount)) {
                    return;
                  }
                  setMinActivity(amount);
                }}
              />
            </p>
            <p className="control">
              <a className="button is-static">
                {t('twitch.timers.minimum-activity-post')}
              </a>
            </p>
          </div>
        </div>
      </Field>
      <Field name={t('twitch.timers.messages')} horizontal>
        <div className="field-body">
          {messages.map((message, index) => (
            <div className="field">
              <p className="control">
                <textarea
                  className={message !== '' ? 'textarea' : 'textarea is-danger'}
                  placeholder={t('twitch.timers.message-help')}
                  onChange={(ev) => setMessageIndex(ev.target.value, index)}
                  value={message}
                />
              </p>
            </div>
          ))}
        </div>
      </Field>
    </Modal>
  );
}

export default function TwitchBotTimersPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: RouteComponentProps<unknown>,
): React.ReactElement {
  const [timers, setTimers] = useModule(modules.twitchBotTimers);
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const [createModal, setCreateModal] = useState(false);
  const [showModifyTimer, setShowModifyTimer] = useState(null);
  const [timerFilter, setTimerFilter] = useState('');
  const timerFilterLC = timerFilter.toLowerCase();

  const createTimer = (name: string, data: TwitchBotTimer): void => {
    dispatch(
      setTimers({
        ...timers,
        [name]: data,
      }),
    );
    setCreateModal(false);
  };

  const modifyTimer = (
    oldName: string,
    newName: string,
    data: TwitchBotTimer,
  ): void => {
    dispatch(
      setTimers({
        ...timers,
        [oldName]: undefined,
        [newName]: {
          ...timers[oldName],
          ...data,
        },
      }),
    );
    setShowModifyTimer(null);
  };

  const deleteTimer = (cmd: string): void => {
    dispatch(
      setTimers({
        ...timers,
        [cmd]: undefined,
      }),
    );
  };

  const toggleTimer = (cmd: string): void => {
    dispatch(
      setTimers({
        ...timers,
        [cmd]: {
          ...timers[cmd],
          enabled: !timers[cmd].enabled,
        },
      }),
    );
  };

  return (
    <>
      <h1 className="title is-4">{t('twitch.timers.header')}</h1>
      <div className="field is-grouped">
        <p className="control">
          <button className="button" onClick={() => setCreateModal(true)}>
            {t('twitch.timers.new-timer')}
          </button>
        </p>

        <p className="control">
          <input
            className="input"
            type="text"
            placeholder={t('twitch.timers.search')}
            value={timerFilter}
            onChange={(ev) => setTimerFilter(ev.target.value)}
          />
        </p>
      </div>

      <TimerModal
        title={t('twitch.timers.new-timer')}
        confirmText={t('actions.create')}
        active={createModal}
        onConfirm={createTimer}
        onClose={() => setCreateModal(false)}
      />
      {showModifyTimer ? (
        <TimerModal
          title={t('twitch.timers.modify-timer')}
          confirmText={t('actions.edit')}
          active={true}
          onConfirm={(newName, cmdData) =>
            modifyTimer(showModifyTimer, newName, cmdData)
          }
          initialName={showModifyTimer}
          initialData={showModifyTimer ? timers[showModifyTimer] : null}
          onClose={() => setShowModifyTimer(null)}
        />
      ) : null}
      <div className="reward-list" style={{ marginTop: '1rem' }}>
        {Object.keys(timers ?? {})
          ?.filter((cmd) => cmd.toLowerCase().includes(timerFilterLC))
          .map((timer) => (
            <TimerItem
              key={timer}
              item={timer[timer]}
              onDelete={() => deleteTimer(timer)}
              onEdit={() => setShowModifyTimer(timer)}
              onToggleState={() => toggleTimer(timer)}
            />
          ))}
      </div>
    </>
  );
}
