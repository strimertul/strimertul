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
  return (
    <input type={props.reveal ? 'text' : 'password'} {...props}>
      {props.children}
    </input>
  );
}

export default React.memo(PasswordField);
