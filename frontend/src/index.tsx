import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { StrictMode, useEffect, useState } from 'react';
import { EventsOff, EventsOn } from '@wailsapp/runtime';
import { IsFatalError } from '@wailsapp/go/main/App';

import 'inter-ui/inter.css';
import '@fontsource/space-mono/index.css';
import 'normalize.css/normalize.css';
import './locale/setup';

import store from './store';
import App from './ui/App';
import ErrorWindow from './ui/ErrorWindow';
import { globalStyles } from './ui/theme';

globalStyles();

function AppWrapper() {
  const [fatalErrorEncountered, setFatalErrorStatus] = useState(false);
  useEffect(() => {
    void IsFatalError().then(setFatalErrorStatus);
    EventsOn('fatalError', () => {
      setFatalErrorStatus(true);
    });
    return () => {
      EventsOff('fatalError');
    };
  }, []);

  if (fatalErrorEncountered) {
    return <ErrorWindow />;
  }
  return <App />;
}

const main = document.getElementById('main');
const root = createRoot(main);
root.render(
  <Provider store={store}>
    <HashRouter>
      <StrictMode>
        <AppWrapper />
      </StrictMode>
    </HashRouter>
  </Provider>,
);
