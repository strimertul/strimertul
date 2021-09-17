import { RouteComponentProps } from '@reach/router';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useModule } from '../../../lib/react-utils';
import { modules, TwitchBotCustomCommand } from '../../../store/api/reducer';
import Modal from '../../components/Modal';

interface CommandItemProps {
  name: string;
  item: TwitchBotCustomCommand;
  onToggleState: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
function CommandItem({
  name,
  item,
  onToggleState,
  onEdit,
  onDelete,
}: CommandItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card customcommand" style={{ marginBottom: '3px' }}>
      <header className="card-header">
        <div className="card-header-title">
          {item.enabled ? (
            <code>{name}</code>
          ) : (
            <span className="reward-disabled">
              <code>{name}</code>
            </span>
          )}{' '}
          {item.description}
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
          Response: <blockquote>{item.response}</blockquote>
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

interface CommandModalProps {
  active: boolean;
  onConfirm: (newName: string, r: TwitchBotCustomCommand) => void;
  onClose: () => void;
  initialData?: TwitchBotCustomCommand;
  initialName?: string;
  title: string;
  confirmText: string;
}

function CommandModal({
  active,
  onConfirm,
  onClose,
  initialName,
  initialData,
  title,
  confirmText,
}: CommandModalProps) {
  const [name, setName] = useState(initialName ?? '');
  const [description, setDescription] = useState(
    initialData?.description ?? '',
  );
  const [response, setResponse] = useState(initialData?.response ?? '');

  const slugify = (str: string) =>
    str.toLowerCase().replace(/[^a-zA-Z0-9!.-_@:;'"<>]/gi, '-');
  const validForm = name !== '' && response !== '';

  const confirm = () => {
    if (onConfirm) {
      onConfirm(name, {
        description,
        response,
        enabled: initialData?.enabled ?? false,
        access_level: 'everyone',
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
          <label className="label">Command</label>
        </div>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <input
                className={name !== '' ? 'input' : 'input is-danger'}
                type="text"
                placeholder="!mycommand"
                value={name}
                onChange={(ev) => setName(slugify(ev.target.value))}
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
                placeholder="What does this command do?"
                rows={1}
                onChange={(ev) => setDescription(ev.target.value)}
                value={description}
              ></textarea>
            </p>
          </div>
        </div>
      </div>
      <div className="field is-horizontal">
        <div className="field-label is-normal">
          <label className="label">Response</label>
        </div>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <textarea
                className={response !== '' ? 'textarea' : 'textarea is-danger'}
                placeholder="What does the bot reply to this command?"
                onChange={(ev) => setResponse(ev.target.value)}
                value={response}
              ></textarea>
            </p>
          </div>
        </div>
      </div>
      <div className="field is-horizontal">
        <div className="field-label is-normal">
          <label className="label">Access level</label>
        </div>
        <div className="field-body">
          <div className="field">
            <p className="control">
              <span className="select">
                <select>
                  <option value="everyone">Everyone</option>
                  <option value="vip">VIPs</option>
                  <option value="moderators">Moderators</option>
                  <option value="streamer">Streamer only</option>
                </select>
              </span>
            </p>
            <p className="help">
              This specifies the minimum level, eg. if you choose VIPs,
              moderators and streamer can still use the command
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function TwitchBotCommandsPage(
  props: RouteComponentProps<unknown>,
): React.ReactElement {
  const [commands, setCommands] = useModule(modules.twitchBotCommands);
  const dispatch = useDispatch();

  const [createModal, setCreateModal] = useState(false);
  const [showModifyCommand, setShowModifyCommand] = useState(null);
  const [commandFilter, setCommandFilter] = useState('');
  const commandFilterLC = commandFilter.toLowerCase();

  const createCommand = (cmd: string, data: TwitchBotCustomCommand): void => {
    dispatch(
      setCommands({
        ...commands,
        [cmd]: data,
      }),
    );
    setCreateModal(false);
  };

  const modifyCommand = (
    oldName: string,
    newName: string,
    data: TwitchBotCustomCommand,
  ): void => {
    dispatch(
      setCommands({
        ...commands,
        [newName]: {
          ...commands[oldName],
          ...data,
        },
        [oldName]: undefined,
      }),
    );
    setShowModifyCommand(null);
  };

  const deleteCommand = (cmd: string): void => {
    dispatch(
      setCommands({
        ...commands,
        [cmd]: undefined,
      }),
    );
  };

  const toggleCommand = (cmd: string): void => {
    dispatch(
      setCommands({
        ...commands,
        [cmd]: {
          ...commands[cmd],
          enabled: !commands[cmd].enabled,
        },
      }),
    );
  };

  return (
    <>
      <h1 className="title is-4">Bot commands</h1>
      <div className="field is-grouped">
        <p className="control">
          <button className="button" onClick={() => setCreateModal(true)}>
            New command
          </button>
        </p>

        <p className="control">
          <input
            className="input"
            type="text"
            placeholder="Search by name"
            value={commandFilter}
            onChange={(ev) => setCommandFilter(ev.target.value)}
          />
        </p>
      </div>

      <CommandModal
        title="New command"
        confirmText="Create"
        active={createModal}
        onConfirm={createCommand}
        onClose={() => setCreateModal(false)}
      />
      {showModifyCommand ? (
        <CommandModal
          title="Modify command"
          confirmText="Edit"
          active={true}
          onConfirm={(newName, cmdData) =>
            modifyCommand(showModifyCommand, newName, cmdData)
          }
          initialName={showModifyCommand}
          initialData={showModifyCommand ? commands[showModifyCommand] : null}
          onClose={() => setShowModifyCommand(null)}
        />
      ) : null}
      <div className="reward-list" style={{ marginTop: '1rem' }}>
        {Object.keys(commands ?? {})
          ?.filter((cmd) => cmd.toLowerCase().includes(commandFilterLC))
          .map((cmd) => (
            <CommandItem
              key={cmd}
              name={cmd}
              item={commands[cmd]}
              onDelete={() => deleteCommand(cmd)}
              onEdit={() => setShowModifyCommand(cmd)}
              onToggleState={() => toggleCommand(cmd)}
            />
          ))}
      </div>
    </>
  );
}
