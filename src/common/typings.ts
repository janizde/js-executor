import { MessagePort } from 'worker_threads';
import ExecutorPromise from './executor-promise';
import ContextifiedProxy from './contextified-proxy';

export interface Executor {
  execute(...args: Array<any>): ExecutorPromise<any, any>;
  __execute(args: Array<any>, context: Context<any>): ExecutorPromise<any, any>;
  map(...args: Array<any>): ExecutorPromise<any, any>;
  __map(args: Array<any>, context: Context<any>): ExecutorPromise<any, any>;
  provideContext: (...args: Array<any>) => ContextifiedProxy;
}

export interface Context<C> {
  id: number;
  value: C;
  transferList?: TransferList;
}

export type TransferList = Array<ArrayBuffer | MessagePort>;
