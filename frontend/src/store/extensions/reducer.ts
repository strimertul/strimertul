/* eslint-disable no-param-reassign */
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Extension } from '~/lib/extensions/extension';
import {
  ExtensionDependencies,
  ExtensionOptions,
  ExtensionRunOptions,
  ExtensionStatus,
} from '~/lib/extensions/types';
import { ThunkConfig } from '..';
import { HTTPConfig } from '../api/types';

interface ExtensionsState {
  ready: boolean;
  installed: Record<string, ExtensionEntry>;
  running: Record<string, Extension>;
  unsaved: Record<string, string>;
  status: Record<string, ExtensionStatus>;
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
  running: {},
  unsaved: {},
  editorCurrentFile: null,
  status: {},
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
    extensionStatusChanged(
      state,
      { payload }: PayloadAction<{ name: string; status: ExtensionStatus }>,
    ) {
      state.status[payload.name] = payload.status;
    },
    extensionAdded(state, { payload }: PayloadAction<ExtensionEntry>) {
      // Remove from unsaved
      if (payload.name in state.unsaved) {
        delete state.unsaved[payload.name];
      }

      // If we don't have a file selected in the editor, set a default as soon as possible
      if (!state.editorCurrentFile) {
        state.editorCurrentFile = payload.name;
      }

      state.installed[payload.name] = payload;
    },
    extensionInstanceAdded(state, { payload }: PayloadAction<Extension>) {
      // If running, terminate running instance
      if (payload.info.name in state.running) {
        state.running[payload.info.name]?.dispose();
      }

      // Create new instance with stored code
      state.status[payload.info.name] = ExtensionStatus.GettingReady;
      state.running[payload.info.name] = payload;
    },
    extensionRemoved(state, { payload }: PayloadAction<string>) {
      // If running, terminate running instance
      if (payload in state.running) {
        state.running[payload]?.dispose();
      }

      // Remove from other lists
      delete state.installed[payload];
      delete state.running[payload];
      delete state.unsaved[payload];
      delete state.status[payload];

      // If it's the currently selected file in the editor, select another or none
      if (state.editorCurrentFile === payload) {
        const others = Object.keys(state.installed);
        state.editorCurrentFile = others.length > 0 ? others[0] : null;
      }
    },
  },
});

const extensionPrefix = 'ui/extensions/installed/';

export const createExtensionInstance = createAsyncThunk<
  void,
  {
    entry: ExtensionEntry;
    dependencies: ExtensionDependencies;
    runOptions?: ExtensionRunOptions;
  },
  ThunkConfig
>('extensions/new-instance', (payload, { dispatch }) => {
  const ext = new Extension(
    payload.entry,
    payload.dependencies,
    payload.runOptions,
  );
  ext.addEventListener('statusChanged', (ev: CustomEvent<ExtensionStatus>) => {
    dispatch(
      extensionsReducer.actions.extensionStatusChanged({
        name: payload.entry.name,
        status: ev.detail,
      }),
    );
  });
  dispatch(extensionsReducer.actions.extensionAdded(payload.entry));
  dispatch(extensionsReducer.actions.extensionInstanceAdded(ext));
});

export const refreshExtensionInstance = createAsyncThunk<
  void,
  ExtensionEntry,
  ThunkConfig
>('extensions/refresh-instance', async (payload, { dispatch, getState }) => {
  const { extensions } = getState();
  if (payload.options.enabled) {
    await dispatch(
      createExtensionInstance({
        entry: payload,
        dependencies: extensions.dependencies,
      }),
    );
  } else {
    // If running, terminate running instance
    if (payload.name in extensions.running) {
      extensions.running[payload.name]?.dispose();
    }

    dispatch(extensionsReducer.actions.extensionAdded(payload));
  }
});

export const initializeExtensions = createAsyncThunk<void, void, ThunkConfig>(
  'extensions/initialize',
  async (_, { getState, dispatch }) => {
    // Get kv client
    const { api } = getState();

    // Get kilovolt endpoint/credentials
    const httpConfig = await api.client.getJSON<HTTPConfig>('http/config');

    // Set dependencies
    const deps = {
      kilovolt: {
        address: `ws://${httpConfig.bind}/ws`,
        password: httpConfig.kv_password,
      },
    };
    dispatch(extensionsReducer.actions.initialized(deps));

    // Become reactive to extension changes
    await api.client.subscribePrefix(extensionPrefix, (newValue, newKey) => {
      const name = newKey.substring(extensionPrefix.length);
      // Check for deleted
      if (!newValue) {
        void dispatch(extensionsReducer.actions.extensionRemoved(name));
        return;
      }
      void dispatch(
        refreshExtensionInstance({
          ...(JSON.parse(newValue) as ExtensionEntry),
          name,
        }),
      );
    });

    // Get installed extensions
    const installed = await api.client.getKeysByPrefix(extensionPrefix);
    await Promise.all(
      Object.entries(installed).map(async ([extName, extContent]) => {
        const entry = {
          ...(JSON.parse(extContent) as ExtensionEntry),
          name: extName.substring(extensionPrefix.length),
        };
        if (entry.options.enabled) {
          await dispatch(
            createExtensionInstance({
              entry,
              dependencies: deps,
            }),
          );
        } else {
          dispatch(extensionsReducer.actions.extensionAdded(entry));
        }
      }),
    );
  },
);

export const startExtension = createAsyncThunk<void, string, ThunkConfig>(
  'extensions/start',
  async (name, { getState, dispatch }) => {
    const { extensions } = getState();

    // If terminated, re-create extension
    if (extensions.running[name].status === ExtensionStatus.Terminated) {
      await dispatch(
        createExtensionInstance({
          entry: extensions.installed[name],
          dependencies: extensions.dependencies,
          runOptions: { autostart: true },
        }),
      );
      return;
    }

    extensions.running[name].start();
  },
);

export const stopExtension = createAsyncThunk<void, string, ThunkConfig>(
  'extensions/stop',
  (name, { getState }) => {
    const { extensions } = getState();
    extensions.running[name].stop();
  },
);

export const saveExtension = createAsyncThunk<
  void,
  ExtensionEntry,
  ThunkConfig
>('extensions/save', async (entry, { getState }) => {
  // Get kv client
  const { api } = getState();
  await api.client.putJSON(extensionPrefix + entry.name, entry);
});

export const isUnsaved = (ext: ExtensionsState) =>
  ext.editorCurrentFile in ext.unsaved &&
  ext.unsaved[ext.editorCurrentFile] !==
    ext.installed[ext.editorCurrentFile]?.source;

export const currentFile = (ext: ExtensionsState) =>
  isUnsaved(ext)
    ? ext.unsaved[ext.editorCurrentFile]
    : ext.installed[ext.editorCurrentFile]?.source;

export const saveCurrentExtension = createAsyncThunk<void, void, ThunkConfig>(
  'extensions/save-current',
  async (_, { getState, dispatch }) => {
    const { extensions } = getState();
    if (!isUnsaved(extensions)) {
      return;
    }
    await dispatch(
      saveExtension({
        name: extensions.editorCurrentFile,
        source: currentFile(extensions),
        options:
          extensions.editorCurrentFile in extensions.installed
            ? extensions.installed[extensions.editorCurrentFile].options
            : { enabled: false },
      }),
    );
  },
);

export const removeExtension = createAsyncThunk<void, string, ThunkConfig>(
  'extensions/remove',
  async (name, { getState }) => {
    // Get kv client
    const { api } = getState();
    await api.client.deleteKey(extensionPrefix + name);
  },
);

export const renameExtension = createAsyncThunk<
  void,
  { from: string; to: string },
  ThunkConfig
>('extensions/rename', async (payload, { getState, dispatch }) => {
  const { extensions } = getState();

  // Save old entries
  const unsaved = extensions.unsaved[payload.from];
  const entry = extensions.installed[payload.from];

  // Remove and re-add under new name
  await dispatch(removeExtension(payload.from));
  await dispatch(
    saveExtension({
      ...entry,
      name: payload.to,
    }),
  );

  // Set unsaved and current file
  dispatch(extensionsReducer.actions.editorSelectedFile(payload.to));
  if (unsaved) {
    dispatch(extensionsReducer.actions.extensionSourceChanged(unsaved));
  }
});

export default extensionsReducer;
