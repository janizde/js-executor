import { parentPort } from "worker_threads";

import {
  Command,
  CommandKind,
  FnWorkerDescriptor,
  CommandExecute,
  CommandMap,
  CommandResult,
  CommandError
} from "./common";

(() => {
  const contexts: Record<number, any> = {};
  
  parentPort.on("message", (message: Command) => {
    switch (message.cmd) {
      case CommandKind.execute:
      case CommandKind.map:
        spawnExecution(message);
        return;

      case CommandKind.sendContext:
        contexts[message.id] = message.value;
        return;
    }
  });

  function spawnExecution(command: CommandExecute | CommandMap) {
    const port = command.port;
    const taskFunction = getFunctionFromDescriptor(command.fn);
    const contextValue = typeof command.contextId === 'number' ? contexts[command.contextId] : undefined;

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

      case CommandKind.map:
        command.elements.forEach((element, index) => {
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
            .catch(error => {
              const errorCmd: CommandError = {
                cmd: CommandKind.error,
                message: error.message,
                index
              };

              port.postMessage(errorCmd);
            });
        });
    }
  }

  function getFunctionFromDescriptor(
    fnDescriptor: FnWorkerDescriptor
  ): Function {
    switch (fnDescriptor.$$exec_type) {
      case "transfer":
        return new Function("data", "context", `return (${fnDescriptor.fn})(data, context);`);

      default:
        return (data: any) => data;
    }
  }
})();
