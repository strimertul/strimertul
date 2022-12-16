import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getInterval } from '~/lib/time-utils';
import { ComboBox, FlexRow, InputBox } from '../../theme';

export interface TimeUnit {
  multiplier: number;
  unit: string;
}

export const seconds = { multiplier: 1, unit: 'time.seconds' };
export const minutes = { multiplier: 60, unit: 'time.minutes' };
export const hours = { multiplier: 3600, unit: 'time.hours' };

export interface IntervalProps {
  active: boolean;
  value: number;
  id?: string;
  min?: number;
  units?: TimeUnit[];
  required?: boolean;
  onChange?: (value: number) => void;
}

function Interval({
  id,
  active,
  value,
  min,
  units,
  onChange,
  required,
}: IntervalProps) {
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
      <FlexRow align="left" border="form">
        <InputBox
          id={id}
          type="number"
          border="none"
          required={required}
          disabled={!active}
          css={{
            maxWidth: '5rem',
            borderRightWidth: '1px',
            borderRadius: '$borderRadius$form 0 0 $borderRadius$form',
          }}
          value={num ?? ''}
          onChange={(ev) => {
            const intNum = parseInt(ev.target.value, 10);
            if (Number.isNaN(intNum)) {
              return;
            }
            setNum(intNum);
          }}
          placeholder="#"
        />
        <ComboBox
          border="none"
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
        </ComboBox>
      </FlexRow>
    </>
  );
}

export default React.memo(Interval);
