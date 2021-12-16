import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import 'inter-ui/inter.css';
import 'normalize.css/normalize.css';
import 'react-toastify/dist/ReactToastify.css';
import 'overlayscrollbars/css/OverlayScrollbars.css';

import './locale/setup';

import store from './store';
import App from './ui/App';
import { globalStyles } from './ui/theme';

globalStyles();

ReactDOM.render(
  <Provider store={store}>
    <BrowserRouter basename="/ui">
      <App />
    </BrowserRouter>
  </Provider>,
  document.getElementById('main'),
);
