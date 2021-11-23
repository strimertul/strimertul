import { configureStore } from '@reduxjs/toolkit';
import thunkMiddleware from 'redux-thunk';
import apiReducer from './api/reducer';

const store = configureStore({
  reducer: {
    api: apiReducer.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(thunkMiddleware),
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
