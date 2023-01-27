/* eslint-disable no-param-reassign */
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Extension } from '~/lib/extensions/extension';
import {
  ExtensionDependencies,
  ExtensionOptions,
} from '~/lib/extensions/types';
import { RootState } from '..';
import { HTTPConfig } from '../api/types';

interface ExtensionsState {
  ready: boolean;
  installed: Record<string, Extension>;
  dependencies: ExtensionDependencies;
}

export interface ExtensionEntry {
  name: string;
  source: string;
  options: ExtensionOptions;
}

const initialState: ExtensionsState = {
  ready: false,
  installed: {},
  dependencies: {
    kilovolt: { address: '' },
  },
};

const extensionsReducer = createSlice({
  name: 'extensions',
  initialState,
  reducers: {
    initialized(state, { payload }: PayloadAction<ExtensionDependencies>) {
      state.dependencies = payload;
      state.ready = true;
    },
    extensionAdded(state, { payload }: PayloadAction<ExtensionEntry>) {
      state.installed[payload.name] = new Extension(
        payload.name,
        payload.source,
        payload.options,
        {
          kilovolt: { ...state.dependencies.kilovolt },
        },
      );
    },
  },
});

export const initializeExtensions = createAsyncThunk(
  'extensions/initialize',
  async (_: void, { getState, dispatch }) => {
    // Get kv client
    const { api } = getState() as RootState;

    // Get kilovolt endpoint/credentials
    const httpConfig = await api.client.getJSON<HTTPConfig>('http/config');

    // Set dependencies
    dispatch(
      extensionsReducer.actions.initialized({
        kilovolt: {
          address: `ws://${httpConfig.bind}/ws`,
          password: httpConfig.kv_password,
        },
      }),
    );
  },
);

export default extensionsReducer;
