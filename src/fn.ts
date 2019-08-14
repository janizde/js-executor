import {
  FnDescriptorTransfer,
  FnDescriptorLoad,
  FnDescriptorRef,
  FnExecType
} from "./common";

export function transferFn<I, O, C>(
  fn: (data: I, context: C) => O
): FnDescriptorTransfer<I, O, C> {
  return {
    $$exec_type: FnExecType.transfer,
    fn
  };
}

export function loadFn(path: string, name?: string): FnDescriptorLoad {
  return {
    $$exec_type: FnExecType.load,
    path,
    name
  };
}

export function refFn(name: string): FnDescriptorRef {
  return {
    $$exec_type: FnExecType.ref,
    name
  };
}
