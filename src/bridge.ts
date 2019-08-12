import { parentPort } from "worker_threads";

import {
  Command,
  CommandKind,
  FnWorkerDescriptor,
  CommandExecute,
  CommandMap,
  CommandResult,
  CommandError,
  CommandImportFunction,
  FnExecType
} from "./common";

(() => {
  const contexts: Record<number, any> = {};
  const globalFunc = Symbol('globalFunc');
  const functionsRegister: Record<symbol, Record<string, Function>> = {
    [globalFunc]: {},
  };

  parentPort.on("message", (message: Command) => {
    switch (message.cmd) {
      case CommandKind.execute:
      case CommandKind.map:
        spawnExecution(message);
        return;

      case CommandKind.sendContext:
        contexts[message.id] = message.value;
        return;
        
      case CommandKind.importFunction:
        importGlobalFunctions(message);
    }
  });

  function importGlobalFunctions(command: CommandImportFunction) {
    function registerFunction(name: string, fn: Function): void;
    function registerFunction(fn: Function): void;
    function registerFunction(fnOrName: Function | string, fn?: Function) {
      const name = typeof fnOrName === 'function' ? command.defaultName || 'default' : fnOrName;
      const theFunction = typeof fnOrName === 'function' ? fnOrName : fn;
      functionsRegister[globalFunc][name] = theFunction;
    }

    (self as any).registerTaskFunction = registerFunction;
    require(command.path);
    delete (self as any).registerTaskFunction;
  }

  function spawnExecution(command: CommandExecute | CommandMap) {
    const port = command.port;
    const taskFunction = getFunctionFromDescriptor(command.fn);
    const contextValue =
      typeof command.contextId === "number"
        ? contexts[command.contextId]
        : undefined;

    switch (command.cmd) {
      case CommandKind.execute:
        Promise.resolve()
          .then(() => taskFunction(command.data, contextValue))
          .then(result => {
            const resultCmd: CommandResult = {
              cmd: CommandKind.result,
              value: result
            };

            port.postMessage(resultCmd);
          })
          .catch(error => {
            const errorCmd: CommandError = {
              cmd: CommandKind.error,
              message: error.message
            };

            port.postMessage(errorCmd);
          });
        break;

      case CommandKind.map: {
        port.on("message", (message: Command) => {
          if (message.cmd !== CommandKind.mapElement) {
            return;
          }

          const { element, index } = message;

          Promise.resolve()
            .then(() => taskFunction(element, contextValue))
            .then(result => {
              const resultCmd: CommandResult = {
                cmd: CommandKind.result,
                value: result,
                index
              };

              port.postMessage(resultCmd);
            })
            .catch(err => {
              const errorCmd: CommandError = {
                cmd: CommandKind.error,
                message: err.message,
                index
              };

              port.postMessage(errorCmd);
            });
        });
      }
    }
  }

  function getFunctionFromDescriptor(
    fnDescriptor: FnWorkerDescriptor
  ): Function {
    switch (fnDescriptor.$$exec_type) {
      case FnExecType.transfer:
        return new Function(
          "data",
          "context",
          `return (${fnDescriptor.fn})(data, context);`
        );
        
      case FnExecType.ref: {
        const fn = functionsRegister[globalFunc][fnDescriptor.name];
        
        if (!fn) {
          throw new Error(`Global function ${fnDescriptor.name} has not been registered as a global task function.`);
        }
        
        return fn;
      };

      default:
        return (data: any) => data;
    }
  }
})();
