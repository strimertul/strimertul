import React from 'react';
import { BrowserOpenURL } from '@wailsapp/runtime';

function BrowserLink(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!props.href) {
    return <a {...props}></a>;
  }

  const properties = { ...props };
  delete properties.href;
  return (
    <a
      {...properties}
      style={{ ...properties.style, cursor: 'pointer' }}
      onClick={() => {
        BrowserOpenURL(props.href);
      }}
    ></a>
  );
}

const PureBrowserLink = React.memo(BrowserLink);
export default PureBrowserLink;
