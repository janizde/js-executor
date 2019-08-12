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
  parentPort.on("message", (message: Command) => {
    if (
      message.cmd === CommandKind.execute ||
      message.cmd === CommandKind.map
    ) {
      spawnExecution(message);
    }
  });

  function spawnExecution(command: CommandExecute | CommandMap) {
    const port = command.port;
    const taskFunction = getFunctionFromDescriptor(command.fn);

    switch (command.cmd) {
      case CommandKind.execute:
        Promise.resolve()
          .then(() => taskFunction(command.data))
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
            .then(() => taskFunction(element))
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
        return new Function("data", `return (${fnDescriptor.fn})(data);`);

      default:
        return (data: any) => data;
    }
  }
})();
