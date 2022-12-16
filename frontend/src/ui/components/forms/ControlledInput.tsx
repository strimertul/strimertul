// From https://stackoverflow.com/a/68928267
// Allows to have a input with text manipulation (e.g. sanitation) without
// messing with the cursor

import React, { useState, useRef, useEffect } from 'react';

const ControlledInput = (
  props: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >,
) => {
  const { value, onChange, ...rest } = props;
  const [cursor, setCursor] = useState<number>(null);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = ref.current;
    if (input) input.setSelectionRange(cursor, cursor);
  }, [ref, cursor, value]);

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => {
        setCursor(e.target.selectionStart);
        if (onChange) onChange(e);
      }}
      {...rest}
    />
  );
};

export default ControlledInput;
