import {
  ExtensionStatus,
  ExtensionOptions,
  ExtensionDependencies,
  ExtensionHostMessage,
  ExtensionHostCommand,
} from './types';

export class Extension extends EventTarget {
  private readonly worker: Worker;

  private workerStatus = ExtensionStatus.GettingReady;

  private workerError?: ErrorEvent;

  constructor(
    public readonly name: string,
    public readonly source: string,
    options: ExtensionOptions,
    dependencies: ExtensionDependencies,
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
      source,
      options,
      dependencies,
    });
  }

  private send(cmd: ExtensionHostCommand) {
    console.log(cmd);
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
    this.worker.terminate();
    this.workerStatus = ExtensionStatus.Terminated;
    this.dispatchEvent(
      new CustomEvent('statusChanged', { detail: this.workerStatus }),
    );
  }
}

export default { Extension };
