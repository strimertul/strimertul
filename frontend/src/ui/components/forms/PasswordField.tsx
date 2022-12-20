import React from 'react';

export interface PasswordFieldProps {
  reveal: boolean;
}

function PasswordField(
  props: PasswordFieldProps &
    React.PropsWithChildren<
      React.DetailedHTMLProps<
        React.InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      >
    >,
) {
  const subprops = { ...props };
  delete subprops.reveal;
  return (
    <input type={props.reveal ? 'text' : 'password'} {...subprops}>
      {props.children}
    </input>
  );
}

export default React.memo(PasswordField);
