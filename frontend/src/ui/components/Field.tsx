import React from 'react';

export interface FieldProps {
  name?: string;
  className?: string;
  horizontal?: boolean;
}

function Field({
  name,
  className,
  horizontal,
  children,
}: React.PropsWithChildren<FieldProps>) {
  let classes = className ?? '';
  if (horizontal) {
    classes += ' is-horizontal';
  }
  let nameEl = null;
  if (name) {
    nameEl = <label className="label">{name}</label>;
    if (horizontal) {
      nameEl = <div className="field-label is-normal">{nameEl}</div>;
    }
  }
  return (
    <div className={`field ${classes}`}>
      {nameEl}
      {children}
    </div>
  );
}

export default React.memo(Field);
