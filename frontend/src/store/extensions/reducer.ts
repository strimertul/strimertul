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
  unsaved: Record<string, string>;
  editorCurrentFile: string;
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
  unsaved: {},
  editorCurrentFile: null,
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
    editorSelectedFile(state, { payload }: PayloadAction<string>) {
      state.editorCurrentFile = payload;
    },
    extensionDrafted(state, { payload }: PayloadAction<ExtensionEntry>) {
      state.unsaved[payload.name] = payload.source;

      // If we don't have a file selected in the editor, set a default as soon as possible
      if (!state.editorCurrentFile) {
        state.editorCurrentFile = payload.name;
      }
    },
    extensionSourceChanged(state, { payload }: PayloadAction<string>) {
      state.unsaved[state.editorCurrentFile] = payload;
    },
    extensionAdded(state, { payload }: PayloadAction<ExtensionEntry>) {
      // Remove from unsaved
      if (payload.name in state.unsaved) {
        delete state.unsaved[payload.name];
      }

      // If running, terminate running instance
      if (payload.name in state.installed) {
        state.installed[payload.name]?.dispose();
      }

      // If we don't have a file selected in the editor, set a default as soon as possible
      if (!state.editorCurrentFile) {
        state.editorCurrentFile = payload.name;
      }

      // Create new instance with stored code
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

const extensionPrefix = 'ui/extensions/installed/';

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

    // Become reactive to extension changes
    await api.client.subscribePrefix(extensionPrefix, (newValue, newKey) => {
      dispatch(
        extensionsReducer.actions.extensionAdded({
          ...(JSON.parse(newValue) as ExtensionEntry),
          name: newKey.substring(extensionPrefix.length),
        }),
      );
    });

    // Get installed extensions
    const extensions = await api.client.getKeysByPrefix(extensionPrefix);
    Object.entries(extensions).forEach(([extName, extContent]) =>
      dispatch(
        extensionsReducer.actions.extensionAdded({
          ...(JSON.parse(extContent) as ExtensionEntry),
          name: extName.substring(extensionPrefix.length),
        }),
      ),
    );
  },
);

export const saveExtension = createAsyncThunk(
  'extensions/save',
  async (entry: ExtensionEntry, { getState }) => {
    // Get kv client
    const { api } = getState() as RootState;
    await api.client.putJSON(extensionPrefix + entry.name, entry);
  },
);

export default extensionsReducer;
