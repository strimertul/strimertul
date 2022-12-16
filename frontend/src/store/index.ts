import { configureStore } from '@reduxjs/toolkit';
import { EqualityFn, useDispatch, useSelector } from 'react-redux';
import thunkMiddleware from 'redux-thunk';

import apiReducer from './api/reducer';
import loggingReducer from './logging/reducer';

const store = configureStore({
  reducer: {
    api: apiReducer.reducer,
    logging: loggingReducer.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(thunkMiddleware),
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: <Selected = unknown>(
  selector: (state: RootState) => Selected,
  equalityFn?: EqualityFn<Selected> | undefined,
) => Selected = useSelector;

export default store;
