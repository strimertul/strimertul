import { RouteComponentProps } from '@reach/router';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export default function DebugPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params: RouteComponentProps<unknown>,
): React.ReactElement {
  const api = useSelector((state: RootState) => state.api.client);
  const [readKey, setReadKey] = useState('');
  const [readValue, setReadValue] = useState('');
  const [writeKey, setWriteKey] = useState('');
  const [writeValue, setWriteValue] = useState('');
  const [writeErrorMsg, setWriteErrorMsg] = useState(null);

  const performRead = async () => {
    const value = await api.getKey(readKey);
    setReadValue(value);
  };
  const performWrite = async () => {
    const result = await api.putKey(writeKey, writeValue);
    console.log(result);
  };
  const fixJSON = () => {
    try {
      setWriteValue(JSON.stringify(JSON.parse(writeValue)));
      setWriteErrorMsg(null);
    } catch (e) {
      setWriteErrorMsg(e.message);
    }
  };

  return (
    <div>
      <p className="title is-3" style={{ color: '#fa3' }}>
        WELCOME TO HELL
      </p>
      <div className="columns">
        <div className="column">
          <label className="label">Read key</label>
          <div className="field has-addons">
            <div className="control">
              <input
                className="input"
                type="text"
                value={readKey}
                onChange={(ev) => setReadKey(ev.target.value)}
                placeholder="some-bucket/some-key"
              />
            </div>
            <div className="control">
              <button className="button is-primary" onClick={performRead}>
                Read
              </button>
            </div>
          </div>
          <div className="field">
            <div className="control">
              <textarea className="textarea" value={readValue} readOnly />
            </div>
          </div>
        </div>
        <div className="column">
          <label className="label">Write key</label>
          <div className="field">
            <div className="control">
              <input
                className="input"
                type="text"
                value={writeKey}
                onChange={(ev) => setWriteKey(ev.target.value)}
                placeholder="some-bucket/some-key"
              />
            </div>
          </div>
          <div className="field">
            <div className="control">
              <textarea
                className="textarea"
                value={writeValue}
                onChange={(ev) => setWriteValue(ev.target.value)}
              />
              {writeErrorMsg ? (
                <p>
                  <code>{writeErrorMsg}</code>
                </p>
              ) : null}
            </div>
          </div>
          <div className="field">
            <div className="control">
              <button className="button is-primary" onClick={performWrite}>
                Write
              </button>{' '}
              <button className="button" onClick={fixJSON}>
                Fix JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
