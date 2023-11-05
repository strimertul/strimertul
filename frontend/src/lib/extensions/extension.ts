import { ExtensionEntry } from '~/store/extensions/reducer';
import {
  ExtensionStatus,
  ExtensionDependencies,
  ExtensionHostMessage,
  ExtensionHostCommand,
  ExtensionRunOptions,
} from './types';

export const blankTemplate = (slug: string) => `// ==Extension==
// @name        ${slug}
// @version     1.0
// @author      Put your name here!
// @description A new extension for strimertul
// @apiversion  3.1.0 
// ==/Extension==
`;

export class Extension extends EventTarget {
  private readonly worker: Worker;

  private workerStatus = ExtensionStatus.GettingReady;

  private workerError?: ErrorEvent | Error;

  constructor(
    public readonly info: ExtensionEntry,
    dependencies: ExtensionDependencies,
    runOptions: ExtensionRunOptions = { autostart: false },
  ) {
    super();

    this.worker = new Worker(
      new URL('./workers/extensionHost.ts', import.meta.url),
      { type: 'module' },
    );
    this.worker.onerror = (ev) => {
      this.status = ExtensionStatus.Error;
      this.dispatchEvent(new CustomEvent('error', { detail: ev }));
    };
    this.worker.onmessage = (ev: MessageEvent<ExtensionHostMessage>) =>
      this.messageReceived(ev);

    // Initialize ext host
    this.send({
      kind: 'arguments',
      source: info.source,
      options: runOptions,
      name: info.name,
      dependencies,
    });
  }

  private send(cmd: ExtensionHostCommand) {
    this.worker.postMessage(cmd);
  }

  private messageReceived(ev: MessageEvent<ExtensionHostMessage>) {
    const msg = ev.data;
    switch (msg.kind) {
      case 'status-change':
        this.status = msg.status;
        break;
      case 'error':
        if (msg.error instanceof Error) {
          this.workerError = msg.error;
        } else {
          this.workerError = new Error(JSON.stringify(msg.error));
        }
        this.status = ExtensionStatus.Error;
        break;
    }
  }

  private set status(newValue: ExtensionStatus) {
    this.workerStatus = newValue;
    this.dispatchEvent(new CustomEvent('statusChanged', { detail: newValue }));
  }

  public get status() {
    return this.workerStatus;
  }

  public get error() {
    return this.workerError;
  }

  public get running() {
    return (
      this.status === ExtensionStatus.Running ||
      this.status === ExtensionStatus.Finished
    );
  }

  start() {
    switch (this.status) {
      case ExtensionStatus.Ready:
        return this.send({
          kind: 'start',
        });
      case ExtensionStatus.GettingReady:
      case ExtensionStatus.Error:
        throw new Error('extension is not ready');
      case ExtensionStatus.Running:
      case ExtensionStatus.Finished:
        throw new Error('extension is already running');
      case ExtensionStatus.Terminated:
        throw new Error(
          'extension has been terminated, did you forget to trash this instance?',
        );
    }
  }

  stop() {
    if (this.status === ExtensionStatus.Terminated) {
      return;
    }
    this.worker.terminate();
    this.status = ExtensionStatus.Terminated;
  }

  dispose() {
    this.stop();
  }
}

export default { Extension };
