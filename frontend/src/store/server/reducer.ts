/* eslint-disable no-param-reassign */
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GetAppVersion } from '@wailsapp/go/main/App';
import { main } from '@wailsapp/go/models';

interface ServerState {
  version: main.VersionInfo;
}

const initialState: ServerState = {
  version: null,
};

const serverReducer = createSlice({
  name: 'server',
  initialState,
  reducers: {
    loadedVersionData(state, { payload }: PayloadAction<main.VersionInfo>) {
      state.version = payload;
    },
  },
});

export const initializeServerInfo = createAsyncThunk(
  'server/init-info',
  async (_: void, { dispatch }) => {
    dispatch(serverReducer.actions.loadedVersionData(await GetAppVersion()));
  },
);

export default serverReducer;
