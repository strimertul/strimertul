import { Link } from '@reach/router';
import React from 'react';

export interface TabItem {
  route: string;
  name: string;
}

export interface TabbedViewProps {
  tabs: TabItem[];
}

export default function TabbedView({
  tabs,
  children,
}: React.PropsWithChildren<TabbedViewProps>): React.ReactElement {
  return (
    <>
      <div className="tabs is-boxed" style={{ marginBottom: 0 }}>
        <ul>
          {tabs.map(({ route, name }) => (
            <li key={route}>
              <Link
                getProps={({ isCurrent }) => ({
                  className: isCurrent ? 'is-active' : '',
                })}
                to={route}
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="tabContent">{children}</div>
    </>
  );
}
