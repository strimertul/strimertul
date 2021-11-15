import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createHistory, LocationProvider } from '@reach/router';

import './locale/setup';

import store from './store';
import App from './ui/App';

// @ts-expect-error idk
const history = createHistory(window);

ReactDOM.render(
  <Provider store={store}>
    <LocationProvider history={history}>
      <App />
    </LocationProvider>
  </Provider>,
  document.getElementById('main'),
);
