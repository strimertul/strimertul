import React from 'react';

export interface FieldProps {
  name?: string;
}

function Field({ name, children }: React.PropsWithChildren<FieldProps>) {
  return (
    <div className="field">
      {name ? <label className="label">{name}</label> : null}
      {children}
    </div>
  );
}

export default React.memo(Field);
