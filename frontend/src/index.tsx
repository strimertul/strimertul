import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';

import 'inter-ui/inter.css';
import '@fontsource/space-mono/index.css';
import 'normalize.css/normalize.css';

import './locale/setup';

import store from './store';
import App from './ui/App';
import { globalStyles } from './ui/theme';

globalStyles();

ReactDOM.render(
  <Provider store={store}>
    <HashRouter>
      <App />
    </HashRouter>
  </Provider>,
  document.getElementById('main'),
);
