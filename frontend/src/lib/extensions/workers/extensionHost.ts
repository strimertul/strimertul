import Kilovolt from '@strimertul/kilovolt-client';
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

function start() {
  if (!extFn || !kv || extensionStatus !== ExtensionStatus.Ready)
    throw new Error('extension not ready');
  void extFn(kv).then(() => {
    setStatus(ExtensionStatus.Finished);
  });
  setStatus(ExtensionStatus.Running);
}

onmessage = async (ev: MessageEvent<ExtensionHostCommand>) => {
  const cmd = ev.data;
  switch (cmd.kind) {
    case 'arguments': {
      // Create Kilovolt instance
      kv = new Kilovolt(
        cmd.dependencies.kilovolt.address,
        cmd.dependencies.kilovolt.password,
      );
      await kv.wait();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      extFn = ExtensionFunction.constructor('kv', cmd.source);
      setStatus(ExtensionStatus.Ready);

      start();
      break;
    }
    case 'start':
      start();
      break;
  }
};
