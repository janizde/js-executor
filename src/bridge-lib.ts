import { MessagePort } from 'worker_threads';

import {
  Command,
  CommandKind,
  FnWorkerDescriptor,
  CommandExecute,
  CommandMap,
  CommandResult,
  CommandError,
  FnExecType,
  ErrorKind
} from './common';

export class InternalError extends Error {
  public readonly isInternal: boolean = true;
}

export const foo = {} as Record<string, number>;

/**
 * Class wrapping a register of contexts with the methods to register
 * new context values and retrieve existing context values
 */
export class ContextRegister {
  private readonly contexts: Record<number, any>;

  constructor() {
    this.contexts = {};
  }

  /**
   * Registers a context value under the key of `id`.
   *
   * @param   id        The id for which to register the context
   * @param   value     The context value to register
   * @throws            When the context already exists
   */
  public registerContextValue(id: number, value: any) {
    if (this.contexts.hasOwnProperty(id)) {
      throw new InternalError(
        `A context value with id ${id} already exists and cannot be overwritten`
      );
    }

    this.contexts[id] = value;
  }

  /**
   * Retrieves a context value by id from the `contexts` record.
   *
   * @param     id      The id of the context to retrieve
   * @returns           The context value
   * @throws            When the context does not exist
   */
  public getContextValue(id: number) {
    if (!this.contexts.hasOwnProperty(id)) {
      throw new InternalError(
        `The requested context with id ${id} does not exist in this worker`
      );
    }

    return this.contexts[id];
  }
}

export const contextRegister = new ContextRegister();
export const functionsRegister: Record<string, Function> = {};

/**
 * Handler function for messages received at the standard worker port.
 * Delegates messages of different kinds to individual handler functions.
 *
 * @param   message     The message object received
 * @param   replyPort   The port to which to reply with error messages
 */
export function handleMessage(message: Command, replyPort: MessagePort) {
  try {
    switch (message.cmd) {
      case CommandKind.execute:
      case CommandKind.map:
        spawnExecution(message);
        break;

      case CommandKind.sendContext:
        contextRegister.registerContextValue(message.id, message.value);
        break;

      case CommandKind.importFunction:
        importGlobalFunctionsFromModule(message.path, message.fnNames);
        break;
    }
  } catch (error) {
    sendError(error, replyPort);
  }
}

/**
 * Imports a single function by its name from the module under `path` and returns
 * this function
 *
 * @param       path      Path to the module from which to import the function
 * @param       name      The name of the exported member of the module
 * @returns               Promise resolving with the function or rejecting with an error
 */
export async function importFunctionFromModule(
  path: string,
  name: string = 'default'
) {
  return import(path).then(exportedModule => {
    const fn = exportedModule[name];

    if (!fn || typeof fn !== 'function') {
      throw new InternalError(
        `A function with name ${name} is not exported from module ${path} or is not a function`
      );
    }

    return fn;
  });
}

/**
 * Imports one or more functions from the module under `path` into the global function
 * register. The names of the exported members to import must be specified in `fnNames`.
 * The default export can be referred to with the string "default".
 *
 * @param     path        Path to the module from which to import the function
 * @param     fnNames     Names of the functions to import
 */
export async function importGlobalFunctionsFromModule(
  path: string,
  fnNames: Array<string> = []
) {
  return import(path).then(exportedModule => {
    for (const name of fnNames) {
      if (!exportedModule[name] || typeof exportedModule[name] !== 'function') {
        throw new InternalError(
          `Function "${name}" is not exported from module ${path} or is not a function`
        );
      }

      functionsRegister[name] = exportedModule[name];
    }
  });
}

/**
 * Creates an error command depending on the constructor of the provided error
 * and sends it as a message over `port`.
 *
 * @param   error     The error to send as message
 * @param   port      The port over which to send the message
 * @param   index     Optional index of an error when used with `map`
 */
export function sendError(error: Error, port: MessagePort, index?: number) {
  if ((error as any).isInternal === true) {
    const message: CommandError = {
      cmd: CommandKind.error,
      kind: ErrorKind.internal,
      message: error.message,
      index
    };

    port.postMessage(message);
  } else {
    const message: CommandError = {
      cmd: CommandKind.error,
      kind: ErrorKind.execution,
      message: error.message,
      stack: error.stack,
      index
    };

    port.postMessage(message);
  }
}

/**
 * Runs the function `taskFunction` by passing it `data` and `context` and sends the results
 * to the `port`.
 *
 * `taskFunction` may be a synchronous function, an async function, or a function returning
 * a synchronous or asynchronous iterator, e.g. `GeneratorFunction` or `AsyncGeneratorFunction`.
 *
 * This function can be called with an index, which will be sent in the `.result` or `.error` messages.
 * When no index is set and a function returning an iterator is passed, the iterator results will be
 * sent as intermediate results. When an index is set, intermediate values are not sent (e.g. when calling `.map`)
 *
 * When Promises are returned from functions or iterators, they will be awaited before sending the result.
 * A rejected Promise results in an `.error` message.
 *
 * @async
 * @param     taskFunction    Function to call with `data` and `context`
 * @param     data            Data to pass as the first parameter
 * @param     context         Context to pass as the second parameter
 * @param     port            MessagePort to send `.result` and `.error` messages to
 * @param     index           Index for the execution
 * @returns                   Promise resolving when the function has been run
 */
export async function runTaskFunction(
  taskFunction: Function,
  data: any,
  context: any,
  port: MessagePort,
  index?: number
) {
  // Keep track of the aborted state to stop generators from being iterated
  let isAborted = false;
  const handleClosePort = () => {
    isAborted = true;
  };

  port.on('close', handleClosePort);

  /**
   * Sends a result or a promise with the specified index as a `.result` message to `port`.
   * When `resultOrPromise` is PromiseLike, it will be awaited. Rejections are sent as `.error` messages.
   * When the result is a `$$Transfer` wrapper, the `transferList` is be passed to `port.postMessage`.
   *
   * @param   resultOrPromise     The result or Promise resolving with the result
   * @param   resultIndex         The index of the result
   */
  const sendResult = async (
    resultOrPromise: any,
    resultIndex: number | undefined
  ) => {
    try {
      const result = await Promise.resolve(resultOrPromise);

      const hasTransfer =
        typeof result === 'object' && result.$$transfer === true;

      const resultValue = hasTransfer ? result.value : result;
      const transferList = hasTransfer ? result.transferList : [];
      const message: CommandResult = {
        cmd: CommandKind.result,
        value: resultValue,
        index: resultIndex
      };

      port.postMessage(message, transferList);
    } catch (err) {
      sendError(err, port, index);
    }
  };

  try {
    // Run the task function with data and context
    const result = taskFunction(data, context);

    if (result[Symbol.asyncIterator] || result[Symbol.iterator]) {
      // If the result has an `asyncIterator` or `iterator`, this iterator is spun
      // until the iterator is done
      const isAsync = !!result[Symbol.asyncIterator];
      const iterator = isAsync
        ? (result[Symbol.asyncIterator]() as AsyncIterableIterator<unknown>)
        : (result[Symbol.iterator]() as IterableIterator<unknown>);

      let iterCount = -1;
      let iterResult: IteratorResult<unknown> = null;

      do {
        iterCount++;

        // If the session is aborted no more iterator steps
        // have to be run
        if (isAborted) {
          break;
        }

        // When the iterator is asynchronous, the iterator result is awaited
        // otherwise it is returned synchronously
        iterResult = isAsync
          ? await (iterator as AsyncIterableIterator<unknown>).next()
          : (iterator as IterableIterator<unknown>).next();

        if (!iterResult.done && typeof index !== 'number') {
          // When an intermediate result arrives and no index for the execution
          // is specified, fork the sending of the intermediate result with the iteration index
          sendResult(iterResult.value, iterCount);
        }
      } while (!iterResult.done);

      return sendResult(iterResult.value, index);
    } else {
      return sendResult(result, index);
    }
  } catch (error) {
    return sendError(error, port, index);
  } finally {
    port.off('close', handleClosePort);
  }
}

/**
 * Performs the execution of `taskFunction` for each elements, which is sent as `.mapElement`
 * commands over the exclusive message channel.
 *
 * Results of executions are sent as `.result` messages including the corresponding index of the element.
 * When the `.mapEnd` command is sent, the message handler is unregistered.
 *
 * @param     command         The `.map` command object containing the exclusive MessagePort
 * @param     taskFunction    The task function to call for each element
 * @param     contextValue    The value of the context to pass to the task function
 */
export function startMapSession(
  command: CommandMap,
  taskFunction: Function,
  contextValue: any
) {
  const { port } = command;

  /**
   * Handles for a single command sent over the exclusive MessageChannel for
   * the current map session.
   *
   * @param   message     The message sent over the message channel.
   */
  const handleMapMessage = (message: Command) => {
    if (message.cmd === CommandKind.mapEnd) {
      // Remove the listener so no reference to the function exists
      port.off('message', handleMapMessage);
      return;
    }

    if (message.cmd === CommandKind.mapElement) {
      runTaskFunction(
        taskFunction,
        message.element,
        contextValue,
        port,
        message.index
      );
    }
  };

  port.on('message', handleMapMessage);
}

/**
 * Handles a call to `execute` or `map` by preparing the task function and
 * the context and calling the individual handler functions.
 *
 * Errors thrown during the execution or preparation of function and context
 * are caught and sent as `.error` commands over the exclusive MessageChannel
 *
 * @param     command       The command representing the execution
 */
export async function spawnExecution(command: CommandExecute | CommandMap) {
  try {
    const taskFunction = await getFunctionFromDescriptor(command.fn);
    const contextValue =
      typeof command.contextId === 'number'
        ? contextRegister.getContextValue(command.contextId)
        : undefined;

    switch (command.cmd) {
      case CommandKind.execute:
        runTaskFunction(taskFunction, command.data, contextValue, command.port);
        break;

      case CommandKind.map: {
        startMapSession(command, taskFunction, contextValue);
      }
    }
  } catch (err) {
    sendError(err as Error, command.port);
  }
}

/**
 * Converts the descriptor object of a function to a callable function
 * based on the descriptor `$$exec_type`
 *
 * @param   fnDescriptor    The descriptor object of the function
 * @returns                 Callable task function
 * @throws                  When the function could not be retrieved
 */
export async function getFunctionFromDescriptor(
  fnDescriptor: FnWorkerDescriptor
): Promise<Function> {
  switch (fnDescriptor.$$exec_type) {
    case FnExecType.transfer:
      return new Function(
        'data',
        'context',
        `return (${fnDescriptor.fn})(data, context);`
      );

    case FnExecType.ref: {
      const fn = functionsRegister[fnDescriptor.name];

      if (!fn) {
        throw new InternalError(
          `Global function ${fnDescriptor.name} has not been registered as a global task function.`
        );
      }

      return fn;
    }

    case FnExecType.load: {
      const fn = await importFunctionFromModule(
        fnDescriptor.path,
        fnDescriptor.name
      );

      return fn;
    }

    default:
      throw new InternalError(
        `Function descriptor $$exec_type "${
          (fnDescriptor as FnWorkerDescriptor).$$exec_type
        }" is not supported`
      );
  }
}
