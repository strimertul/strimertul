import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInterval } from '../../lib/react-utils';

export interface IntervalProps {
  active: boolean;
  value: number;
  onChange?: (value: number) => void;
}

function Interval({ active, value, onChange }: IntervalProps) {
  const { t } = useTranslation();
  const [valueNum, num, mult, setNum, setMult] = useInterval(value);
  useEffect(() => {
    onChange(valueNum);
  }, [valueNum]);

  return (
    <>
      <p className="control">
        <input
          disabled={!active}
          className="input"
          type="number"
          placeholder="#"
          value={num ?? ''}
          onChange={(ev) => {
            const intNum = parseInt(ev.target.value, 10);
            if (Number.isNaN(intNum)) {
              return;
            }
            setNum(intNum);
          }}
        />
      </p>
      <p className="control">
        <span className="select">
          <select
            value={mult.toString() ?? ''}
            disabled={!active}
            onChange={(ev) => {
              const intMult = parseInt(ev.target.value, 10);
              if (Number.isNaN(intMult)) {
                return;
              }
              setMult(intMult);
            }}
          >
            <option value="1">{t('form-common.time.seconds')}</option>
            <option value="60">{t('form-common.time.minutes')}</option>
            <option value="3600">{t('form-common.time.hours')}</option>
          </select>
        </span>
      </p>
    </>
  );
}

export default React.memo(Interval);
