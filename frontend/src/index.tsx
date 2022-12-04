import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { StrictMode } from 'react';

import 'inter-ui/inter.css';
import '@fontsource/space-mono/index.css';
import 'normalize.css/normalize.css';

import './locale/setup';

import store from './store';
import App from './ui/App';
import { globalStyles } from './ui/theme';

globalStyles();

const main = document.getElementById('main');
const root = createRoot(main);
root.render(
  <Provider store={store}>
    <HashRouter>
      <StrictMode>
        <App />
      </StrictMode>
    </HashRouter>
  </Provider>,
);
