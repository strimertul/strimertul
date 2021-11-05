import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getInterval } from '../../lib/time-utils';

export interface IntervalProps {
  active: boolean;
  value: number;
  min?: number;
  onChange?: (value: number) => void;
}

function Interval({ active, value, min, onChange }: IntervalProps) {
  const { t } = useTranslation();

  const [numInitialValue, multInitialValue] = getInterval(value);
  const [num, setNum] = useState(numInitialValue);
  const [mult, setMult] = useState(multInitialValue);

  useEffect(() => {
    const seconds = num * mult;
    if (min && seconds < min) {
      setNum(5);
      setMult(1);
    }
    onChange(Math.max(min ?? 0, seconds));
  }, [num, mult]);

  return (
    <>
      <p className="control">
        <input
          disabled={!active}
          className="input"
          type="number"
          placeholder="#"
          value={num ?? ''}
          style={{ width: '6em' }}
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
