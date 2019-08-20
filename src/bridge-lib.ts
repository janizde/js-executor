import { MessagePort } from 'worker_threads';

import {
  Command,
  CommandKind,
  FnWorkerDescriptor,
  CommandExecute,
  CommandMap,
  CommandResult,
  CommandError,
  CommandImportFunction,
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
        importGlobalFunctions(message);
        break;
    }
  } catch (error) {
    sendError(error, replyPort);
  }
}

/**
 * Imports global functions from the path specified in the command object.
 * Registers a global function `registerFunction`, which can be accessed from the
 * imported script to register a function by name.
 *
 * @param   command     The command object containing path and defaultName
 */
export function importGlobalFunctions(command: CommandImportFunction) {
  function registerFunction(fnOrName: Function | string, fn?: Function) {
    const name =
      typeof fnOrName === 'function'
        ? command.defaultName || 'default'
        : fnOrName;
    const theFunction = typeof fnOrName === 'function' ? fnOrName : fn;
    functionsRegister[name] = theFunction;
  }

  (global as any).registerTaskFunction = registerFunction;
  require(command.path);
  delete (global as any).registerTaskFunction;
}

/**
 * Imports a function for single used from `path`. The function must be
 * registered by the specified `name` when given. When no name is specified
 * the function registered as `default` is used.
 *
 * @param   path      Path to the module registering the task function
 * @param   name      Name of the function to import
 * @returns           The function imported from the script
 * @throws            When the function was not registered or the registered value is not a function
 */
export function importSingleUseFunction(path: string, name?: string) {
  let importedFunction: Function | null = null;
  function registerFunction(fnOrName: Function | string, fn?: Function) {
    if (!name && typeof fnOrName === 'function') {
      importedFunction = fnOrName;
    } else if (typeof fnOrName === 'string' && name === fnOrName) {
      importedFunction = fn;
    }
  }

  (global as any).registerTaskFunction = registerFunction;
  require(path);
  delete (global as any).registerFunction;

  if (typeof importedFunction !== 'function') {
    throw new InternalError(
      `Function for path ${path} was not registered or the registered value is not a function`
    );
  }

  return importedFunction;
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

export async function runTaskFunction(
  taskFunction: Function,
  data: any,
  context: any,
  port: MessagePort,
  index?: number
) {
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
    const result = taskFunction(data, context);

    if (result[Symbol.asyncIterator] || result[Symbol.iterator]) {
      const isAsync = !!result[Symbol.asyncIterator];
      const iterator = isAsync
        ? (result[Symbol.asyncIterator]() as AsyncIterableIterator<unknown>)
        : (result[Symbol.iterator]() as IterableIterator<unknown>);

      let iterCount = -1;
      let iterResult: IteratorResult<unknown> = null;

      do {
        iterCount++;
        iterResult = isAsync
          ? await (iterator as AsyncIterableIterator<unknown>).next()
          : (iterator as IterableIterator<unknown>).next();

        if (!iterResult.done && typeof index !== 'number') {
          sendResult(iterResult.value, iterCount);
        }
      } while (!iterResult.done);

      return sendResult(iterResult.value, index);
    } else {
      return sendResult(result, index);
    }
  } catch (error) {
    return sendError(error, port, index);
  }
}

/**
 * Performs the execution of `taskFunction` with the data from the `execute` command
 * and the provided context. When the `taskFunction` is asynchronous and returns a Promise,
 * the resolve value of the promise is sent.
 *
 * @param   command         The command containing the execution payload
 * @param   taskFunction    Function to execute with data and context
 * @param   contextValue    Context value for the execution
 */
export function performExecute(
  command: CommandExecute,
  taskFunction: Function,
  contextValue: any
) {
  runTaskFunction(taskFunction, command.data, contextValue, command.port);
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
export function performMap(
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
export function spawnExecution(command: CommandExecute | CommandMap) {
  try {
    const taskFunction = getFunctionFromDescriptor(command.fn);
    const contextValue =
      typeof command.contextId === 'number'
        ? contextRegister.getContextValue(command.contextId)
        : undefined;

    switch (command.cmd) {
      case CommandKind.execute:
        performExecute(command, taskFunction, contextValue);
        break;

      case CommandKind.map: {
        performMap(command, taskFunction, contextValue);
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
export function getFunctionFromDescriptor(
  fnDescriptor: FnWorkerDescriptor
): Function {
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
      const fn = importSingleUseFunction(fnDescriptor.path, fnDescriptor.name);

      if (!fn) {
        throw new Error(
          `Single use function for path ${fnDescriptor.path} and name ${fnDescriptor.name} could not be found.`
        );
      }

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
