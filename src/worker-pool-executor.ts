import { join } from 'path';

import { Worker, MessagePort, MessageChannel } from 'worker_threads';

import {
  FnDescriptor,
  FnWorkerDescriptor,
  FnExecType,
  Context,
  CommandSendContext,
  CommandKind,
  TransferList,
  CommandImportFunction,
  Command,
  CommandError,
  CommandExecute,
  CommandResult,
  CommandMap,
  CommandMapElement
} from './common';

import ContextifiedProxy from './contextified-proxy';

interface WorkerSession {
  execPort: MessagePort;
  workerPort: MessagePort;
}

function* roundRobinSelector(workers: Array<Worker>) {
  for (let i = 0; true; ++i) {
    yield i % workers.length;
  }
}

export default class WorkerPoolExecutor {
  private readonly workers: Array<Worker>;
  private readonly workerSelector: Iterator<number>;
  private readonly contextRegister: Array<Array<number>>;
  private contextCounter: number;

  constructor(numWorkers: number) {
    const workers: Array<Worker> = [];
    const contextRegister: Array<Array<number>> = [];

    for (let i = 0; i < numWorkers; ++i) {
      const worker = new Worker(join(__dirname, 'bridge.js'));
      workers.push(worker);
      contextRegister.push([]);
    }

    this.workers = workers;
    this.contextRegister = contextRegister;
    this.workerSelector = roundRobinSelector(workers);
    this.contextCounter = 0;
  }

  private prepareDescriptor(
    descriptor: FnDescriptor<any, any, any>
  ): FnWorkerDescriptor {
    switch (descriptor.$$exec_type) {
      case FnExecType.transfer:
        return {
          $$exec_type: FnExecType.transfer,
          fn: descriptor.fn.toString()
        };

      default:
        return descriptor;
    }
  }

  private __maybeSendContext(context: Context<any>, workerId: number) {
    if (this.contextRegister[workerId].indexOf(context.id) > -1) {
      return;
    }

    const contextCmd: CommandSendContext = {
      cmd: CommandKind.sendContext,
      id: context.id,
      value: context.value
    };

    const worker = this.workers[workerId];
    worker.postMessage(contextCmd, context.transferList);
  }

  private __createContext<C>(
    value: C,
    transferList?: TransferList
  ): Context<C> {
    return {
      id: ++this.contextCounter,
      value,
      transferList
    };
  }

  public importFunction(path: string, fnNames: Array<string>) {
    const command: CommandImportFunction = {
      cmd: CommandKind.importFunction,
      path,
      fnNames
    };

    this.workers.forEach(worker => worker.postMessage(command));
    return this;
  }

  public provideContext<C>(
    value: C,
    transferList?: TransferList
  ): ContextifiedProxy<C> {
    const context = this.__createContext(value, transferList);
    return new ContextifiedProxy(this, context);
  }

  public execute<I, O>(
    fnDescriptor: FnDescriptor<I, O, undefined>,
    data: I,
    transferList?: TransferList
  ) {
    return this.__execute<I, O, undefined>(
      fnDescriptor,
      data,
      transferList,
      undefined
    );
  }

  __execute<I, O, C>(
    fnDescriptor: FnDescriptor<I, O, C>,
    data: I,
    transferList: TransferList | undefined,
    context: Context<C> | undefined
  ) {
    const workerIndex = this.workerSelector.next().value;
    const worker = this.workers[workerIndex];
    const { port1: execPort, port2: workerPort } = new MessageChannel();
    const combinedTransferList: TransferList = transferList
      ? transferList.concat(workerPort)
      : [workerPort];

    return new Promise<O>((resolve, reject) => {
      execPort.on('error', e => reject(e));
      execPort.on('message', (message: Command) => {
        switch (message.cmd) {
          case CommandKind.result:
            resolve(message.value);
            return;

          case CommandKind.error:
            const err = new Error(message.message);
            reject(err);
            return;
        }
      });

      const execCommand: CommandExecute = {
        cmd: CommandKind.execute,
        port: workerPort,
        fn: this.prepareDescriptor(fnDescriptor),
        data
      };

      if (context) {
        this.__maybeSendContext(context, workerIndex);
        execCommand.contextId = context.id;
      }

      worker.postMessage(execCommand, combinedTransferList);
    });
  }

  public map<I, O>(
    fnDescriptor: FnDescriptor<I, O, undefined>,
    elements: Array<I>,
    transferList?: TransferList
  ) {
    return this.__map(fnDescriptor, elements, transferList, undefined);
  }

  __map<I, O, C>(
    fnDescriptor: FnDescriptor<I, O, C>,
    elements: Array<I>,
    transferList: TransferList | undefined,
    context: Context<C> | undefined
  ) {
    const workerSessions = new Array<WorkerSession>(this.workers.length);
    const fnDescriptorWorker = this.prepareDescriptor(fnDescriptor);

    const deferred = elements.map(() => {
      let resolve: (value: O | PromiseLike<O>) => void = null;
      let reject: (error: Error) => void = null;

      const promise = new Promise<O>((res, rej) => {
        resolve = res;
        reject = rej;
      });

      return { resolve, reject, promise };
    });

    const getWorkerSession = (workerId: number): WorkerSession => {
      if (workerSessions[workerId]) {
        return workerSessions[workerId];
      }

      const channel = new MessageChannel();
      const session: WorkerSession = {
        execPort: channel.port1,
        workerPort: channel.port2
      };

      workerSessions[workerId] = session;

      session.execPort.on(
        'message',
        (message: CommandResult | CommandError) => {
          switch (message.cmd) {
            case CommandKind.result:
              deferred[message.index].resolve(message.value);
              return;

            case CommandKind.error:
              console.log(message);
              deferred[message.index].reject(new Error(message.message));
              return;
          }
        }
      );

      const mapCommand: CommandMap = {
        cmd: CommandKind.map,
        fn: fnDescriptorWorker,
        port: session.workerPort
      };

      if (context) {
        this.__maybeSendContext(context, workerId);
        mapCommand.contextId = context.id;
      }

      const worker = this.workers[workerId];
      worker.postMessage(mapCommand, [session.workerPort]);
      return session;
    };

    elements.forEach((element, index) => {
      const workerId = this.workerSelector.next().value;
      const session = getWorkerSession(workerId);

      const mapElementCommand: CommandMapElement = {
        cmd: CommandKind.mapElement,
        element,
        index
      };

      session.execPort.postMessage(mapElementCommand, transferList);
    });

    return Promise.all(deferred.map(d => d.promise));
  }
}
