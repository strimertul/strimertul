import Kilovolt from '@strimertul/kilovolt-client';
import * as ts from 'typescript';
import {
  ExtensionHostCommand,
  ExtensionHostMessage,
  ExtensionStatus,
} from '../types';

const sendMessage = (
  message: ExtensionHostMessage,
  transfer?: Transferable[],
) => postMessage(message, transfer);

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
async function ExtensionFunction(kv: Kilovolt) {}

let extFn: typeof ExtensionFunction = null;
let kv: Kilovolt;

let extensionStatus = ExtensionStatus.GettingReady;
function setStatus(status: ExtensionStatus) {
  extensionStatus = status;
  sendMessage({
    kind: 'status-change',
    status,
  });
}

function log(level: string) {
  // eslint-disable-next-line func-names
  return function (...args: { toString(): string }[]) {
    const message = args.join(' ');
    sendMessage({
      kind: 'log',
      level,
      message,
    });
  };
}

function start() {
  if (!extFn || !kv || extensionStatus !== ExtensionStatus.Ready) {
    throw new Error('extension not ready');
  }

  void extFn(kv)
    .then(() => {
      setStatus(ExtensionStatus.Finished);
    })
    .catch((error: Error) => {
      sendMessage({
        kind: 'error',
        error,
      });
    });

  setStatus(ExtensionStatus.Running);
}

onmessage = async (ev: MessageEvent<ExtensionHostCommand>) => {
  const cmd = ev.data;
  switch (cmd.kind) {
    case 'arguments': {
      // Create Kilovolt instance
      kv = new Kilovolt(cmd.dependencies.kilovolt.address, {
        password: cmd.dependencies.kilovolt.password,
      });
      await kv.connect();

      try {
        // Transpile TS into JS
        const out = ts.transpileModule(cmd.source, {
          compilerOptions: { module: ts.ModuleKind.ES2022 },
        });

        // Replace console.* methods with something that logs to UI
        console.log = log('info');
        console.info = log('info');
        console.warn = log('warn');
        console.error = log('error');

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        extFn = ExtensionFunction.constructor('kv', out.outputText);
        setStatus(ExtensionStatus.Ready);
      } catch (error: unknown) {
        sendMessage({
          kind: 'error',
          error,
        });
      }

      start();
      break;
    }
    case 'start':
      start();
      break;
  }
};
