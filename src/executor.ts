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
  CommandMap
} from "./common";

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

  constructor(numWorkers: number) {
    const workers = [];

    for (let i = 0; i < numWorkers; ++i) {
      const worker = new Worker(join(__dirname, "bridge.js"));
      workers.push(worker);
    }

    this.workers = workers;
    this.workerSelector = roundRobinSelector(workers);
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

  execute<I, O>(
    fnDescriptor: FnDescriptor<I, O, undefined>,
    data: I,
    transferList?: Array<ArrayBuffer | MessagePort>
  ) {
    const workerIndex = this.workerSelector.next().value;
    const worker = this.workers[workerIndex];
    const { port1: execPort, port2: workerPort } = new MessageChannel();
    const combinedTransferList: Array<ArrayBuffer | MessagePort> = transferList
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

      worker.postMessage(
        {
          cmd: "execute",
          port: workerPort,
          fn: this.prepareDescriptor(fnDescriptor),
          data
        },
        combinedTransferList
      );
    });
  }

  map<I, O>(
    fnDescriptor: FnDescriptor<I, O, undefined>,
    elements: Array<I>,
    transferList: Array<ArrayBuffer | MessagePort>
  ) {
    const workerIndex = this.workerSelector.next().value;
    const worker = this.workers[workerIndex];
    const { port1: execPort, port2: workerPort } = new MessageChannel();
    const combinedTransferList: Array<ArrayBuffer | MessagePort> = transferList
      ? transferList.concat(workerPort)
      : [workerPort];

    const deferred = elements.map(element => {
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

      worker.postMessage(mapCommand, combinedTransferList);

      return Promise.all<O>(deferred.map(p => p.promise)).then(resolve, reject);
    });
  }
}

interface Context<C> {
  id: number;
  value: C;
  transferList?: Array<Transferable>;
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

Promise.all([
  exec.execute(transferFn(myFunc), { foo: 2 }),
  exec.execute(transferFn(myFunc), { bar: 3 })
]).then(results => console.log(results));
