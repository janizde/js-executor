import { MessagePort } from 'worker_threads';

export const enum FnExecType {
  transfer = 'transfer',
  load = 'load',
  ref = 'ref'
}

export interface FnDescriptorTransfer<I, O, C> {
  $$exec_type: FnExecType.transfer;
  fn: (data: I, context: C) => O;
}

export interface FnDescriptorTransferSerialized {
  $$exec_type: FnExecType.transfer;
  fn: string;
}

export interface FnDescriptorLoad {
  $$exec_type: FnExecType.load;
  path: string;
  name?: string;
}

export interface FnDescriptorRef {
  $$exec_type: FnExecType.ref;
  name: string;
}

export type FnDescriptor<I, O, C> =
  | FnDescriptorTransfer<I, O, C>
  | FnDescriptorLoad
  | FnDescriptorRef;

export type FnWorkerDescriptor =
  | FnDescriptorTransferSerialized
  | FnDescriptorLoad
  | FnDescriptorRef;

export const enum CommandKind {
  importFunction = 'importFunction',
  sendContext = 'sendContext',
  execute = 'execute',
  map = 'map',
  mapElement = 'mapElement',
  mapEnd = 'mapEnd',
  result = 'result',
  error = 'error'
}

export interface CommandExecute {
  cmd: CommandKind.execute;
  port: MessagePort;
  fn: FnWorkerDescriptor;
  data: any;
  contextId?: number;
}

export interface CommandMap {
  cmd: CommandKind.map;
  port: MessagePort;
  fn: FnWorkerDescriptor;
  contextId?: number;
}

export interface CommandMapElement {
  cmd: CommandKind.mapElement;
  element: any;
  index: number;
}

export interface CommandMapEnd {
  cmd: CommandKind.mapEnd;
}

export interface CommandImportFunction {
  cmd: CommandKind.importFunction;
  path: string;
  fnNames?: Array<string>;
}

export interface CommandSendContext {
  cmd: CommandKind.sendContext;
  id: number;
  value: any;
}

export interface CommandResult {
  cmd: CommandKind.result;
  value: any;
  index?: number;
}

export const enum ErrorKind {
  internal = 'internal',
  execution = 'execution'
}

export interface CommandError {
  cmd: CommandKind.error;
  kind: ErrorKind;
  message: string;
  stack?: string;
  index?: number;
}

export type Command =
  | CommandImportFunction
  | CommandSendContext
  | CommandExecute
  | CommandMap
  | CommandMapElement
  | CommandMapEnd
  | CommandResult
  | CommandError;

export type TransferList = Array<ArrayBuffer | MessagePort>;

export interface Context<C> {
  id: number;
  value: C;
  transferList?: TransferList;
}
