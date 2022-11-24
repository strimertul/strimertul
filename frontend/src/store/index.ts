import { configureStore } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
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

export default store;
