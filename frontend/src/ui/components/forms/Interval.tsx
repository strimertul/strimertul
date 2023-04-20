import { useTranslation } from 'react-i18next';
import { getInterval } from '~/lib/time';
import { ComboBox, FlexRow, InputBox } from '../../theme';
import { seconds, minutes, hours } from './units';

export interface TimeUnit {
  multiplier: number;
  unit: string;
}

export interface IntervalProps {
  active: boolean;
  value: number;
  id?: string;
  min?: number;
  units?: TimeUnit[];
  required?: boolean;
  onChange?: (value: number) => void;
}

export default function Interval({
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

  const [num, mult] = getInterval(value);

  const change = (newNum: number, newMult: number) => {
    onChange(Math.max(min ?? 0, newNum * newMult));
  };

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
            const parsedNum = parseInt(ev.target.value, 10);
            if (Number.isNaN(parsedNum)) {
              return;
            }
            change(parsedNum, mult);
          }}
          placeholder="#"
        />
        <ComboBox
          border="none"
          value={mult.toString() ?? ''}
          disabled={!active}
          onChange={(ev) => {
            const parsedMult = parseInt(ev.target.value, 10);
            if (Number.isNaN(parsedMult)) {
              return;
            }
            change(num, parsedMult);
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
