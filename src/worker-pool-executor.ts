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
  ErrorKind
} from './common';

import ContextifiedProxy from './contextified-proxy';
import ExecutorPromise from './executor-promise';

// Symbol with which the `ExecutorPromise` is rejected on abortion
export const ABORTED = Symbol('ABORTED');

/**
 * Custom error class for errors coming from a Worker
 */
export class WorkerError extends Error {
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

/**
 * Class wrapping a pool of a fixed number of workers.
 * Keeps an internal register of which context is already transferred to workers.
 */
class WorkerPool {
  /**
   * Array of worker instances. The index in the array is considered the worker DI
   */
  public readonly workers: Array<Worker>;
  /**
   * The size of the pool
   */
  public readonly size: number;
  /**
   * Iterator returning the ID of the next worker to use for execution.
   * Contains one array of context ID per worker.
   */
  private readonly workerSelector: Iterator<number>;
  /**
   * Register for transferred contexts to workers
   */
  private readonly contextRegister: Array<Array<number>>;
  /**
   * Number of contexts, which have been created for this pool
   */
  private contextCounter: number;

  /**
   * Creates a new WorkerPool by spawning `numWorkers` Worker instances with the bridge module
   *
   * @param     numWorkers      The number of workers in the pool
   */
  constructor(numWorkers: number) {
    const workers: Array<Worker> = [];
    const contextRegister: Array<Array<number>> = [];

    for (let i = 0; i < numWorkers; ++i) {
      const worker = new Worker(join(__dirname, '..', 'dist', 'bridge.js'));
      workers.push(worker);
      contextRegister.push([]);
    }

    this.size = numWorkers;
    this.workers = workers;
    this.contextRegister = contextRegister;
    this.workerSelector = roundRobinSelector(workers);
    this.contextCounter = 0;
  }

  /**
   * Creates a context object from the context `value` and `transferList`.
   * The context is assigned a unique id for this pool.
   *
   * @param     value           The context value
   * @param     transferList    TransferList for context transmission
   * @returns                   Context object with unique ID
   */
  public createContext<C>(value: C, transferList?: TransferList): Context<C> {
    return {
      id: ++this.contextCounter,
      value,
      transferList
    };
  }

  /**
   * Transfers the provided context value to a worker if it is not already transferred
   *
   * @param     context         The context to transfer
   * @param     workerId        The id of the worker to which to transfer the context
   */
  public ensureContext(context: Context<any>, workerId: number) {
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

  /**
   * Returns the ID of the worker to use for the next execution
   *
   * @returns               Worker ID
   */
  public nextWorkerId() {
    return this.workerSelector.next().value;
  }
}

/**
 * Prepares a function descriptor to be sent to a worker.
 * For `transferFn` descriptors, the function will be serialized and converted to a `FnWorkerDescriptor`.
 *
 * @param     descriptor    Input descriptor passed to `execute` or `map`
 * @returns                 Descriptor prepared for worker transmission
 */
function prepareFunctionDescriptor(
  descriptor: FnDescriptor<any, any, any>
): FnWorkerDescriptor {
  if (descriptor.$$exec_type === FnExecType.transfer) {
    return {
      $$exec_type: FnExecType.transfer,
      fn: descriptor.fn.toString()
    };
  }

  return descriptor;
}

/**
 * Creates an iterator looping over the IDs of workers passed in `workers`
 *
 * @param     workers       The workers to loop over
 * @returns                 Iterator looping over worker IDs
 */
function* roundRobinSelector(workers: Array<Worker>) {
  for (let i = 0; true; ++i) {
    yield i % workers.length;
  }
}

interface WorkerSession {
  execPort: MessagePort;
  workerPort: MessagePort;
}

/**
 * Class encapsulating the call to `execute` on a worker pool
 */
class WorkerExecuteExecution<I, O, C> {
  /**
   * The WorkerPool to execute the task on
   */

  private readonly pool: WorkerPool;
  /**
   * Descriptor of the task function
   */
  private readonly fnDescriptor: FnDescriptor<I, O, C>;
  /**
   * Input data for the task function
   */
  private readonly data: I;
  /**
   * Context to pass to task function
   */
  private readonly context: Context<C>;
  /**
   * TransferList for sent with the execution data
   */
  private readonly transferList?: TransferList;

  constructor(
    pool: WorkerPool,
    fnDescriptor: FnDescriptor<I, O, C>,
    data: I,
    context: Context<C>,
    transferList?: TransferList
  ) {
    this.pool = pool;
    this.fnDescriptor = fnDescriptor;
    this.data = data;
    this.context = context;
    this.transferList = transferList;
  }

  /**
   * Performs the execution of the task function with data and context
   * on the worker pool.
   *
   * Asks the pool for the next worker and sends the `.execute` message to it
   *
   * @returns         ExecutorPromise resolving with the result value or rejecting with an error.
   *                  Results yielded by a Generator function are sent through the `.element` and `.error` functions
   */
  start() {
    // Determine on which worker the task will be executed and create an exclusive `MessageChannel`
    const workerIndex = this.pool.nextWorkerId();
    const worker = this.pool.workers[workerIndex];
    const { port1: execPort, port2: workerPort } = new MessageChannel();
    // Include the port in the transferList
    const combinedTransferList: TransferList = this.transferList
      ? this.transferList.concat(workerPort)
      : [workerPort];

    return ExecutorPromise.forExecutor<unknown, O>(
      ({
        resolveAll,
        rejectAll,
        resolveElement,
        rejectElement,
        setOnAbort
      }) => {
        // Register handler for connection error
        execPort.on('error', e => {
          rejectAll(e);
          execPort.close();
        });

        // Register handler for regular messages
        execPort.on('message', (message: Command) => {
          switch (message.cmd) {
            case CommandKind.result: {
              if (typeof message.index === 'number') {
                // Results with an `index` are considered intermediate results
                resolveElement(message.value, message.index);
              } else {
                resolveAll(message.value);
                execPort.close();
              }

              break;
            }

            case CommandKind.error: {
              const err = WorkerError.fromMessage(message);

              if (typeof message.index === 'number') {
                // Results with an `index` are considered intermediate errors
                rejectElement(err, message.index);
              } else {
                rejectAll(err);
                execPort.close();
              }

              break;
            }
          }
        });

        // Initial command for the execution of work
        const execCommand: CommandExecute = {
          cmd: CommandKind.execute,
          port: workerPort,
          fn: prepareFunctionDescriptor(this.fnDescriptor),
          data: this.data
        };

        if (this.context) {
          // Make sure the provided context exists on the worker
          this.pool.ensureContext(this.context, workerIndex);
          execCommand.contextId = this.context.id;
        }

        worker.postMessage(execCommand, combinedTransferList);

        // Close the MessageChannel and reject with the ABORT symbol
        const handleAbort = () => {
          execPort.close();
          rejectAll(ABORTED);
        };

        setOnAbort(handleAbort);
      }
    );
  }
}

/**
 * Class encapsulating the call to `map` on a worker pool
 */
class WorkerMapExecution<I, O, C> {
  /**
   * The WorkerPool on which to distribute the execution
   */
  private readonly pool: WorkerPool;
  /**
   * Descriptor of the task function
   */
  private readonly fnDescriptor: FnDescriptor<I, O, C>;
  /**
   * Elements to pass per execution of the task function
   */
  private readonly elements: Array<I>;
  /**
   * The context value to pass to the task function
   */
  private readonly context: Context<C>;
  /**
   * TransferList to send with each element
   */
  private readonly transferList?: TransferList;
  /**
   * WorkerSessions which have already been set up
   */
  private readonly sessions: Array<WorkerSession>;
  /**
   * Whether the execution has been aborted
   */
  private isAborted: boolean;

  constructor(
    pool: WorkerPool,
    fnDescriptor: FnDescriptor<I, O, C>,
    elements: Array<I>,
    context: Context<C>,
    transferList?: TransferList
  ) {
    this.pool = pool;
    this.fnDescriptor = fnDescriptor;
    this.elements = elements;
    this.context = context;
    this.transferList = transferList;
    this.sessions = new Array<WorkerSession>(this.pool.workers.length);

    this.isAborted = false;
  }

  /**
   * Returns a `WorkerSession` to use for the execution of the next element.
   * The next worker to use is determined by the WorkerPool. If a session for
   * this worker already exists, it will be reused.
   *
   * Otherwise a new session is set up by creating an exclusive `MessageChannel` and
   * registering the handlers for the `MessagePort`.
   *
   * @param     onElement     Handler function for an arriving element
   * @param     onError       Handler function for an arriving error
   * @returns                 `WorkerSession` to use for the next execution
   */
  private __nextWorkerSession(
    onElement: (element: O, index: number) => void,
    onError: (error: WorkerError, index: number) => void
  ): WorkerSession {
    const workerId = this.pool.nextWorkerId();

    if (this.sessions[workerId]) {
      // Reuse existing sessions
      return this.sessions[workerId];
    }

    const channel = new MessageChannel();
    const session: WorkerSession = {
      execPort: channel.port1,
      workerPort: channel.port2
    };

    this.sessions[workerId] = session;

    // Register message handler for MessageChannel
    // Results and errors are passed to the onElement and onError callback functions
    session.execPort.on('message', (message: CommandResult | CommandError) => {
      if (this.isAborted) {
        return;
      }

      switch (message.cmd) {
        case CommandKind.result:
          onElement(message.value, message.index);
          break;

        case CommandKind.error:
          const err = WorkerError.fromMessage(message);
          onError(err, message.index);
          break;
      }
    });

    // Command setting up the map session in the bridge module
    const mapCommand: CommandMap = {
      cmd: CommandKind.map,
      fn: prepareFunctionDescriptor(this.fnDescriptor),
      port: session.workerPort
    };

    if (this.context) {
      // Make sure the context exists in the Worker
      this.pool.ensureContext(this.context, workerId);
      mapCommand.contextId = this.context.id;
    }

    const worker = this.pool.workers[workerId];
    worker.postMessage(mapCommand, [session.workerPort]);
    return session;
  }

  /**
   * Performs the execution of the task function for each data element on the `WorkerPool`.
   * Asks the pool for a worker for each element and creates exclusive `MessageChannels`, which
   * are reused across multiple elements,
   *
   * @returns         `ExecutorPromise` resolving with an array containing all successful results or rejecting
   *                  with an error. Individual elements are passed to the `.element` and `.error` functions.
   */
  start() {
    return ExecutorPromise.forExecutor<O, Array<O | null>>(
      ({
        resolveAll,
        rejectAll,
        resolveElement,
        rejectElement,
        setOnAbort
      }) => {
        // Keep a record of all element results and the number of elements, which have been
        // responded to
        let elementCount = 0;
        let elementResults: Array<O | null> = new Array(this.elements.length);

        /**
         * Handles the abortion of the `map` execution by closing all `MessageChannels`
         * and rejecting the ExecutorPromise with the ABORTED symbol.
         */
        const handleAbort = () => {
          this.isAborted = true;
          this.sessions.forEach(session => {
            session.execPort.close();
          });

          rejectAll(ABORTED);
        };

        setOnAbort(handleAbort);

        /**
         * Checks whether all elements have been responded to and if so, resolves
         * the `ExecutorPromise` with the array of results and closes all `MessageChannels`.
         */
        const afterSettle = () => {
          if (elementCount >= this.elements.length) {
            Promise.resolve().then(() => resolveAll(elementResults));
            this.sessions.forEach(session => session.execPort.close());
          }
        };

        /**
         * Handles the result of a single element coming from a Worker by putting
         * it in the `elementResults` and resolving the element in the `ExecutorPromise`.
         *
         * @param     result      Result of a single element
         * @param     index       Index of the element
         */
        const handleElement = (result: O, index: number) => {
          elementResults[index] = result;
          resolveElement(result, index);
          afterSettle();
        };

        /**
         * Handles the error of a single element coming from a Worker by putting `null`
         * in the `elementResults` and rejecting the element in the `ExecutorPromise`.
         *
         * @param     error       Element error
         * @param     index       Index of the element
         */
        const handleError = (error: WorkerError, index: number) => {
          elementResults[index] = null;
          rejectElement(error, index);
          afterSettle();
        };

        // Request a (reused) WorkerSession per element and send the `.mapElement` command
        this.elements.forEach((element, index) => {
          const session = this.__nextWorkerSession(handleElement, handleError);

          const mapElementCommand: CommandMapElement = {
            cmd: CommandKind.mapElement,
            element,
            index
          };

          session.execPort.postMessage(mapElementCommand, this.transferList);
        });
      }
    );
  }
}

/**
 * Executor implementation executing task functions on a WorkerPool of a fixed size
 */
export default class WorkerPoolExecutor {
  /**
   * WorkerPool to execute tasks on
   */
  private readonly pool: WorkerPool;

  /**
   * Creates a new WorkerPoolExecutor with the number of Workers to spawn
   * @param     numWorkers      Number of Workers
   */
  constructor(numWorkers: number) {
    this.pool = new WorkerPool(numWorkers);
  }

  /**
   * Makes all Workers in the pool globally import functions from `path`,
   * which can later be referenced in a `FnRefDescriptor`
   *
   * @param     path      Path to the module from which to import functions
   * @param     fnNames   Names of the exported functions or `default` for the default export
   * @returns             Executor for further chaining
   */
  public importFunction(path: string, fnNames: Array<string>) {
    const command: CommandImportFunction = {
      cmd: CommandKind.importFunction,
      path,
      fnNames
    };

    this.pool.workers.forEach(worker => worker.postMessage(command));
    return this;
  }

  /**
   * Creates a `ContextifiedProxy`, which will call methods on the executor with
   * a fixed context attached.
   *
   * @param     value           The context value
   * @param     transferList    TransferList for the context value
   * @returns                   ContextifiedProxy for further chaining
   */
  public provideContext<C>(
    value: C,
    transferList?: TransferList
  ): ContextifiedProxy<C> {
    const context = this.pool.createContext(value, transferList);
    return new ContextifiedProxy(this, context);
  }

  /**
   * Public method for the execution of a single task element without context.
   *
   * @param     fnDescriptor      The descriptor of the task function
   * @param     data              Data to pass as function parameter
   * @param     transferList      TransferList for `data`
   * @returns                     `ExecutorPromise` resolving with the execution result
   */
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

  /**
   * Internal method for the execution of a single element with or without context.
   *
   * @param     fnDescriptor      The descriptor of the task function
   * @param     data              Data to pass as function parameter
   * @param     transferList      TransferList for `data`
   * @param     context           Context object whose value to pass to the task function
   * @returns                     `ExecutorPromise` resolving with the execution result
   */
  __execute<I, O, C>(
    fnDescriptor: FnDescriptor<I, O, C>,
    data: I,
    transferList: TransferList | undefined,
    context: Context<C> | undefined
  ) {
    const execution = new WorkerExecuteExecution(
      this.pool,
      fnDescriptor,
      data,
      context,
      transferList
    );

    return execution.start();
  }

  /**
   * Public method for the distribution of multiple task elements onto the WorkerPool without context
   *
   * @param     fnDescriptor      The descriptor of the task function
   * @param     elements          Elements to pass to the task function
   * @param     transferList      TransferList for the elements
   * @returns                     `ExecutorPromise` resolving with all results and
   *                              passing single results to `.element`
   */
  public map<I, O>(
    fnDescriptor: FnDescriptor<I, O, undefined>,
    elements: Array<I>,
    transferList?: TransferList
  ) {
    return this.__map(fnDescriptor, elements, transferList, undefined);
  }

  /**
   * Internal method for the distribution of multiple task elements onto the WorkerPool
   * with or without context
   *
   * @param     fnDescriptor      The descriptor of the task function
   * @param     elements          Elements to pass to the task function
   * @param     transferList      TransferList for the elements
   * @param     context           Context whose value to pass to the task function for each element
   * @returns                     `ExecutorPromise` resolving with all results and
   *                              passing single results to `.element`
   */
  __map<I, O, C>(
    fnDescriptor: FnDescriptor<I, O, C>,
    elements: Array<I>,
    transferList: TransferList | undefined,
    context: Context<C> | undefined
  ) {
    const execution = new WorkerMapExecution(
      this.pool,
      fnDescriptor,
      elements,
      context,
      transferList
    );

    return execution.start();
  }
}
