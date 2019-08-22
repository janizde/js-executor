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
  CommandMapElement,
  CommandAbort,
  ErrorKind
} from './common';

import ContextifiedProxy from './contextified-proxy';
import ExecutorPromise from './executor-promise';

interface WorkerSession {
  execPort: MessagePort;
  workerPort: MessagePort;
}

const ABORTED = Symbol('ABORTED');

class WorkerError extends Error {
  public readonly kind: ErrorKind;

  constructor(message: string, kind: ErrorKind, stack?: string) {
    super(message);
    this.stack = stack;
    this.kind = kind;
  }

  static fromMessage(message: CommandError) {
    return new WorkerError(message.message, message.kind, message.stack);
  }
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

  private __prepareDescriptor(
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

    return ExecutorPromise.forExecutor(
      ({
        resolveAll,
        rejectAll,
        resolveElement,
        rejectElement,
        setOnAbort
      }) => {
        execPort.on('error', e => rejectAll(e));
        execPort.on('message', (message: Command) => {
          switch (message.cmd) {
            case CommandKind.result: {
              if (typeof message.index === 'number') {
                resolveElement(message.value, message.index);
              } else {
                resolveAll(message.value);
              }

              break;
            }

            case CommandKind.error: {
              const err = WorkerError.fromMessage(message);

              if (typeof message.index === 'number') {
                rejectElement(err, message.index);
              } else {
                rejectAll(err);
              }

              break;
            }
          }
        });

        const execCommand: CommandExecute = {
          cmd: CommandKind.execute,
          port: workerPort,
          fn: this.__prepareDescriptor(fnDescriptor),
          data
        };

        if (context) {
          this.__maybeSendContext(context, workerIndex);
          execCommand.contextId = context.id;
        }

        worker.postMessage(execCommand, combinedTransferList);

        const handleAbort = () => {
          const message: CommandAbort = {
            cmd: CommandKind.abort
          };

          execPort.postMessage(message);
          rejectAll(ABORTED);
        };

        setOnAbort(handleAbort);
      }
    );
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
    return ExecutorPromise.forExecutor<O, Array<O | null>>(
      ({
        resolveAll,
        rejectAll,
        resolveElement,
        rejectElement,
        setOnAbort
      }) => {
        const workerSessions = new Array<WorkerSession>(this.workers.length);
        const fnDescriptorWorker = this.__prepareDescriptor(fnDescriptor);

        let isAborted = false;
        let elementCount = 0;
        let elementResults: Array<O | null> = new Array(elements.length);

        const handleAbort = () => {
          isAborted = true;
          const message: CommandAbort = {
            cmd: CommandKind.abort
          };

          workerSessions.forEach(session =>
            session.execPort.postMessage(message)
          );

          rejectAll(ABORTED);
        };

        setOnAbort(handleAbort);

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
              if (isAborted) {
                return;
              }

              elementCount++;

              switch (message.cmd) {
                case CommandKind.result:
                  resolveElement(message.value, message.index);
                  elementResults[message.index] = message.value;
                  break;

                case CommandKind.error:
                  const err = WorkerError.fromMessage(message);
                  rejectElement(err, message.index);
                  elementResults[message.index] = null;
                  break;
              }

              if (elementCount >= elements.length) {
                Promise.resolve().then(() => resolveAll(elementResults));
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
      }
    );
  }
}
