export interface ExtensionDependencies {
  kilovolt: {
    address: string;
    password?: string;
  };
}

export interface ExtensionOptions {
  autostart: boolean;
}

export enum ExtensionStatus {
  GettingReady = 'not-ready',
  Ready = 'ready',
  Running = 'running',
  Finished = 'main-loop-finished',
  Error = 'error',
  Terminated = 'terminated',
}

export type ExtensionHostCommand = EHParamMessage | EHStartMessage;
export type ExtensionHostMessage = EHStatusChangeMessage;
interface EHParamMessage {
  kind: 'arguments';
  options: ExtensionOptions;
  dependencies: ExtensionDependencies;
  source: string;
}
interface EHStartMessage {
  kind: 'start';
}
interface EHStatusChangeMessage {
  kind: 'status-change';
  status: ExtensionStatus;
}
