import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import 'inter-ui/inter.css';
import 'normalize.css/normalize.css';

import './locale/setup';
import './style.css';

import store from './store';
import App from './ui/App';

ReactDOM.render(
  <Provider store={store}>
    <BrowserRouter basename="/ui">
      <App />
    </BrowserRouter>
  </Provider>,
  document.getElementById('main'),
);
