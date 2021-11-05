import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getInterval } from '../../lib/time-utils';

export interface TimeUnit {
  multiplier: number;
  unit: string;
}

export const seconds = { multiplier: 1, unit: 'form-common.time.seconds' };
export const minutes = { multiplier: 60, unit: 'form-common.time.minutes' };
export const hours = { multiplier: 3600, unit: 'form-common.time.hours' };

export interface IntervalProps {
  active: boolean;
  value: number;
  min?: number;
  units?: TimeUnit[];
  onChange?: (value: number) => void;
}

function Interval({ active, value, min, units, onChange }: IntervalProps) {
  const { t } = useTranslation();

  const timeUnits = units ?? [seconds, minutes, hours];

  const [numInitialValue, multInitialValue] = getInterval(value);
  const [num, setNum] = useState(numInitialValue);
  const [mult, setMult] = useState(multInitialValue);

  useEffect(() => {
    const total = num * mult;
    if (min && total < min) {
      const [minNum, minMult] = getInterval(min);
      setNum(minNum);
      setMult(minMult);
    }
    onChange(Math.max(min ?? 0, total));
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
            {timeUnits.map((unit) => (
              <option key={unit.unit} value={unit.multiplier.toString()}>
                {t(unit.unit)}
              </option>
            ))}
          </select>
        </span>
      </p>
    </>
  );
}

export default React.memo(Interval);
