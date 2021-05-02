import { RouteComponentProps } from '@reach/router';
import React from 'react';

export default function LoyaltyPage({
  children,
}: RouteComponentProps<React.PropsWithChildren<unknown>>): React.ReactElement {
  return <>{children}</>;
}
