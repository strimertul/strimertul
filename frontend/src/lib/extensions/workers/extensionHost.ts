import Kilovolt from '@strimertul/kilovolt-client';
import ts from 'typescript';
import {
  ExtensionHostCommand,
  ExtensionHostMessage,
  ExtensionStatus,
} from '../types';
import { SourceMapMappings, parseSourceMap } from '../sourceMap';

const sendMessage = (
  message: ExtensionHostMessage,
  transfer?: Transferable[],
) => postMessage(message, transfer);

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function, no-empty-function
async function ExtensionFunction(_kv: Kilovolt) {}

let extFn: typeof ExtensionFunction = null;
let kv: Kilovolt;
let name: string;

let extensionStatus = ExtensionStatus.GettingReady;
function setStatus(status: ExtensionStatus) {
  extensionStatus = status;
  sendMessage({
    kind: 'status-change',
    status,
  });
}

function log(level: string, sourceMap: SourceMapMappings) {
  // eslint-disable-next-line func-names
  return function (...args: { toString(): string }[]) {
    const message = args.join(' ');
    void kv.putJSON('strimertul/@log', {
      level,
      message,
      data: {
        extension: name,
      },
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
      name = cmd.name;

      // Create Kilovolt instance
      kv = new Kilovolt(cmd.dependencies.kilovolt.address, {
        password: cmd.dependencies.kilovolt.password,
      });
      await kv.connect();

      try {
        // Transpile TS into JS
        const out = ts.transpileModule(cmd.source, {
          compilerOptions: {
            module: ts.ModuleKind.ES2022,
            sourceMap: true,
          },
        });

        const sourceMap = parseSourceMap(out.sourceMapText);

        // Replace console.* methods with something that logs to UI
        console.log = log('info', sourceMap);
        console.info = log('info', sourceMap);
        console.warn = log('warn', sourceMap);
        console.error = log('error', sourceMap);

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
