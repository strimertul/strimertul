import React, { ReactElement } from 'react';
import { Root, Item, Indicator } from '@radix-ui/react-radio-group';

export interface RadioGroupProps {
  label: string;
  selected?: string;
  values: {
    id: string;
    label: string | ReactElement;
  }[];
  default?: string;
}

export default function RadioGroup(props: RadioGroupProps) {
  return (
    <Root
      defaultValue={props.default}
      value={props.selected}
      aria-label={props.label}
    >
      {props.values.map(({ id, label }) => (
        <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
          <Item value="default" id={`r${id}`}>
            <Indicator />
          </Item>
          <label htmlFor={`r${id}`}>{label}</label>
        </div>
      ))}
    </Root>
  );
}
