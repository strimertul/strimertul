/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { main } from '@wailsapp/go/models';

interface ProcessedLogEntry {
  time: Date;
  caller: string;
  level: string;
  message: string;
  data: object;
}

function processEntry({
  time,
  caller,
  level,
  message,
  data,
}: main.LogEntry): ProcessedLogEntry {
  return {
    time: new Date(time),
    caller,
    level,
    message,
    data: JSON.parse(data) as object,
  };
}

interface LoggingState {
  messages: ProcessedLogEntry[];
}

const initialState: LoggingState = {
  messages: [],
};

const loggingReducer = createSlice({
  name: 'logging',
  initialState,
  reducers: {
    loadedLogData(state, { payload }: PayloadAction<main.LogEntry[]>) {
      state.messages = payload.map(processEntry);
    },
    receivedEvent(state, { payload }: PayloadAction<main.LogEntry>) {
      state.messages = [...state.messages, processEntry(payload)];
    },
    clearedEvents(state) {
      state.messages = [];
    },
  },
});

export default loggingReducer;
