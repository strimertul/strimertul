import React from 'react';
import { useTranslation } from 'react-i18next';

export interface MessageArrayProps {
  placeholder?: string;
  value: string[];
  onChange: (value: string[]) => void;
}

function MessageArray({ value, placeholder, onChange }: MessageArrayProps) {
  const { t } = useTranslation();

  return (
    <div className="control">
      {value.map((message, index) => (
        <div
          className="field has-addons"
          key={index}
          style={{ marginTop: index > 0 ? '0.5rem' : '' }}
        >
          <p className="control">
            <input
              placeholder={placeholder}
              onChange={(ev) => {
                const newMessages = [...value];
                newMessages[index] = ev.target.value;
                onChange(newMessages);
              }}
              value={message}
              className={message !== '' ? 'input' : 'input is-danger'}
              style={{ width: '28rem' }}
            />
          </p>
          {value.length > 1 ? (
            <p className="control">
              <button
                className="button is-danger"
                onClick={() => {
                  const newMessages = [...value];
                  newMessages.splice(index, 1);
                  onChange(newMessages.length > 0 ? newMessages : ['']);
                }}
              >
                X
              </button>
            </p>
          ) : null}
        </div>
      ))}
      <div className="field" style={{ marginTop: '0.5rem' }}>
        <p className="control">
          <button
            className="button is-success is-small"
            onClick={() => {
              onChange([...value, '']);
            }}
          >
            {t('form-common.add-new')}
          </button>
        </p>
      </div>
    </div>
  );
}

export default React.memo(MessageArray);
