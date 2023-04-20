import React, { ReactElement } from 'react';
import {
  Root,
  Item,
  Indicator,
  RadioGroupProps as RootProps,
} from '@radix-ui/react-radio-group';
import { styled } from '~/ui/theme';

export interface RadioGroupProps {
  values: {
    id: string;
    label: string | ReactElement;
  }[];
}

const RadioRoot = styled(Root, {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  margin: '0.5rem 0',
  '& label': {
    cursor: 'pointer',
  },
});

const RadioItem = styled(Item, {
  backgroundColor: '$gray12',
  borderRadius: '100%',
  width: '22px',
  height: '22px',
  cursor: 'pointer',
  padding: 0,
  margin: 0,
  border: '0',
  marginRight: '0.5rem',

  '&:hover': {
    backgroundColor: '$teal12',
  },
  '&:focus': {
    boxShadow: '0 0 0 2px $gray2',
  },
});

const RadioIndicator = styled(Indicator, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  position: 'relative',
  '&::after': {
    content: '',
    display: 'block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '$teal9',
  },
});

function RadioGroup(props: RadioGroupProps & RootProps) {
  return (
    <RadioRoot {...props}>
      {props.values.map(({ id, label }) => (
        <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
          <RadioItem value={id} id={`r${id}`}>
            <RadioIndicator />
          </RadioItem>
          <label htmlFor={`r${id}`}>{label}</label>
        </div>
      ))}
    </RadioRoot>
  );
}

const PureRadioGroup = React.memo(RadioGroup);
export default PureRadioGroup;
