import React, { useEffect } from 'react';

function TabbedView({
  children,
}: // eslint-disable-next-line @typescript-eslint/ban-types
React.PropsWithChildren<{}>): React.ReactElement {
  const [activeTab, setActiveTab] = React.useState(null);

  const tabs = React.Children.map(children, (elem, i) => {
    const id =
      (typeof elem === 'object' && 'props' in elem
        ? elem.props['data-name']
        : null) ?? `TAB#${i}`;
    return {
      id,
      tabContent: elem,
    };
  });

  useEffect(() => {
    if (activeTab === null) {
      setActiveTab(tabs[0].id);
    }
  }, [children, activeTab]);

  if (activeTab === null) {
    return <div></div>;
  }

  const active = tabs.find((elem) => elem.id === activeTab);
  return (
    <>
      <div className="tabs is-boxed" style={{ marginBottom: 0 }}>
        <ul>
          {tabs.map((t) => (
            <li key={t.id}>
              <a
                className={activeTab === t.id ? 'is-active' : ''}
                onClick={() => setActiveTab(t.id)}
              >
                {t.id}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="tabContent">{active.tabContent}</div>
    </>
  );
}

export default React.memo(TabbedView);
