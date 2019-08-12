import { join } from "path";
import { Worker, MessageChannel, MessagePort } from "worker_threads";

import {
  FnDescriptorTransfer,
  FnExecType,
  FnDescriptorLoad,
  FnDescriptorRef,
  FnDescriptor,
  FnWorkerDescriptor,
  CommandResult,
  CommandError,
  CommandKind,
  Command,
  CommandMap,
  CommandExecute,
  CommandSendContext
} from "./common";

type TransferList = Array<ArrayBuffer | MessagePort>;

function transferFn<I, O, C>(
  fn: (data: I, context: C) => O
): FnDescriptorTransfer<I, O, C> {
  return {
    $$exec_type: FnExecType.transfer,
    fn
  };
}

function loadFn(path: string, name?: string): FnDescriptorLoad {
  return {
    $$exec_type: FnExecType.load,
    path,
    name
  };
}

function refFn(name: string): FnDescriptorRef {
  return {
    $$exec_type: FnExecType.ref,
    name
  };
}

function* roundRobinSelector(workers: Array<Worker>) {
  for (let i = 0; true; ++i) {
    yield i % workers.length;
  }
}

class WorkerPoolExecutor {
  private readonly workers: Array<Worker>;
  private readonly workerSelector: Iterator<number>;
  private readonly contextRegister: Array<Array<number>>;
  private contextCounter: number;

  constructor(numWorkers: number) {
    const workers: Array<Worker> = [];
    const contextRegister: Array<Array<number>> = [];

    for (let i = 0; i < numWorkers; ++i) {
      const worker = new Worker(join(__dirname, "bridge.js"));
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
      value: context.value,
    };

    const worker = this.workers[workerId];
    worker.postMessage(contextCmd, context.transferList);
  }
  
  private createContext<C>(value: C, transferList?: TransferList): Context<C> {
    return {
      id: ++this.contextCounter,
      value,
      transferList,
    };
  }

  public provideContext<C>(
    value: C,
    transferList?: TransferList
  ): ContextifiedProxy<C> {
    const context: Context<C> = {
      id: 0,
      value,
      transferList
    };

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
      execPort.on("error", e => reject(e));
      execPort.on("message", (message: Command) => {
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
    const workerIndex = this.workerSelector.next().value;
    const worker = this.workers[workerIndex];
    const { port1: execPort, port2: workerPort } = new MessageChannel();
    const combinedTransferList: TransferList = transferList
      ? transferList.concat(workerPort)
      : [workerPort];

    const deferred = elements.map(() => {
      let resolve: (value: O | PromiseLike<O>) => void = null;
      let reject: (error: Error) => void = null;

      const promise = new Promise<O>((res, rej) => {
        resolve = res;
        reject = rej;
      });

      return { resolve, reject, promise };
    });

    return new Promise<Array<O>>((resolve, reject) => {
      execPort.on("error", err => reject(err));
      execPort.on("message", (message: CommandResult | CommandError) => {
        if (typeof message.index !== "number") {
          return;
        }

        switch (message.cmd) {
          case CommandKind.result:
            deferred[message.index].resolve(message.value);
            return;

          case CommandKind.error:
            deferred[message.index].reject(new Error(message.message));
            return;
        }
      });

      const mapCommand: CommandMap = {
        cmd: CommandKind.map,
        port: workerPort,
        elements,
        fn: this.prepareDescriptor(fnDescriptor)
      };

      if (context) {
        this.__maybeSendContext(context, workerIndex);
        mapCommand.contextId = context.id;
      }

      worker.postMessage(mapCommand, combinedTransferList);

      return Promise.all<O>(deferred.map(p => p.promise)).then(resolve, reject);
    });
  }
}

interface Context<C> {
  id: number;
  value: C;
  transferList?: TransferList;
}

class ContextifiedProxy<C> {
  private readonly executor: WorkerPoolExecutor;
  private readonly context: Context<C>;

  constructor(executor: WorkerPoolExecutor, context: Context<C>) {
    this.executor = executor;
    this.context = context;
  }

  public execute<I, O>(
    fnDescriptor: FnDescriptor<I, O, C>,
    data: I,
    transferList?: TransferList
  ) {
    return this.executor.__execute<I, O, C>(
      fnDescriptor,
      data,
      transferList,
      this.context
    );
  }

  public map<I, O>(
    fnDescriptor: FnDescriptor<I, O, C>,
    elements: Array<I>,
    transferList?: TransferList
  ) {
    return this.executor.__map<I, O, C>(
      fnDescriptor,
      elements,
      transferList,
      this.context
    );
  }

  public provideContext<C2>(value: C2, transferList?: TransferList) {
    return this.executor.provideContext<C2>(value, transferList);
  }
}

const exec = new WorkerPoolExecutor(2);
async function myFunc(data: Record<string, number>) {
  return new Promise<Record<string, number>>(resolve => {
    setTimeout(() => {
      const multiplied = Object.keys(data).reduce(
        (accum, key) => ({
          ...accum,
          [key]: data[key] * 10
        }),
        {} as Record<string, number>
      );

      resolve(multiplied);
    }, 1000);
  });
}

function testExec() {
  Promise.all([
    exec.execute(transferFn(myFunc), { foo: 2 }),
    exec.execute(transferFn(myFunc), { bar: 3 })
  ])
    .then(results => console.log(results))
    .then(() => process.exit(0));
}

function testMap() {
  const ctx = {
    factor: 10000,
  };

  exec
    .provideContext(ctx)
    .map(
      transferFn(async function(data: Record<string, number>, context) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const multiplied = Object.keys(data).reduce(
          (accum, key) => ({
            ...accum,
            [key]: data[key] * context.factor
          }),
          {} as Record<string, number>
        );

        return multiplied;
      }),
      [{ foo: 2 }, { bar: 3 }]
    )
    .then(results => console.log(results))
    .then(() => process.exit(0));
}

testMap();