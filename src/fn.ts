import {
  FnDescriptorTransfer,
  FnDescriptorLoad,
  FnDescriptorRef,
  FnExecType
} from './common';

/**
 * Creates a function descriptor object for a function, which is serialized
 * and transferred to a worker.
 *
 * @param     fn        The function to serialize. This function must only access the
 *                      values passed as parameters `data` and `context` and not call
 *                      any function defined in parent scopes of the function
 *
 * @returns             Function descriptor for a transferrable function
 */
export function transferFn<I, O, C>(
  fn: (data: I, context: C) => O
): FnDescriptorTransfer<I, O, C> {
  return {
    $$exec_type: FnExecType.transfer,
    fn
  };
}

/**
 * Creates a function descriptor object for a function, which is loaded
 * from the path `path` under the name `name` for the single use with an execution.
 *
 * @param     path      The path to the file to import
 * @param     name      The name of the export of that function.
 *                      When omitted, the default export is taken
 *
 * @returns             Function descriptor for a loaded function
 */
export function loadFn(path: string, name?: string): FnDescriptorLoad {
  return {
    $$exec_type: FnExecType.load,
    path,
    name
  };
}

/**
 * Creates a function descriptor object for a function, which has been imported using `.importFunction`
 * for an executor and is referenced by its name.
 *
 * @param       name      The name of the function, which has been imported
 * @returns               Function descriptor for a referenced function
 */
export function refFn(name: string): FnDescriptorRef {
  return {
    $$exec_type: FnExecType.ref,
    name
  };
}
