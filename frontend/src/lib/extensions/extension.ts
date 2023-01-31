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
// ==/Extension==
`;

export class Extension extends EventTarget {
  private readonly worker: Worker;

  private workerStatus = ExtensionStatus.GettingReady;

  private workerError?: ErrorEvent;

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
      this.workerError = ev;
      this.dispatchEvent(new CustomEvent('error', { detail: ev }));
    };
    this.worker.onmessage = (ev: MessageEvent<ExtensionHostMessage>) =>
      this.messageReceived(ev);

    // Initialize ext host
    this.send({
      kind: 'arguments',
      source: info.source,
      options: runOptions,
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
        this.workerStatus = msg.status;
        this.dispatchEvent(
          new CustomEvent('statusChanged', { detail: msg.status }),
        );
        break;
    }
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
    if (this.workerStatus === ExtensionStatus.Terminated) {
      return;
    }
    this.worker.terminate();
    this.workerStatus = ExtensionStatus.Terminated;
    this.dispatchEvent(
      new CustomEvent('statusChanged', { detail: this.workerStatus }),
    );
  }

  dispose() {
    this.stop();
  }
}

export default { Extension };
