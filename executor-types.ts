interface Executor {
  execute<I, O>(task: Task<I, O>, data: I, transferList: Array<Transferable>): ExecutorPromise<O>;
  map<I, O>(task: Task<I, O>, elements: ArrayLike<I>): ExecutorPromise<O>;
  provideContext<C>(context: C, transferList: Array<Transferable>): ContextifiedProxy<C>;
}

interface ContextifiedProxy<C> {
  execute<I, O>(task: ContextifiedTask<I, O, C>, data: I, transferList: Array<Transferable>): ExecutorPromise<O>;
  map<I, O>(task: ContextifiedTask<I, O, C>, elements: Array<I>): ExecutorPromise<O>;
}

interface Context<T> {
  value: T;
  id: number;
  transferList: Array<Transferable>;
}

interface ExecutorPromise<T> extends Promise<T> {
  element(callback: (element: T, index: number) => void): this;
  error(callback: (error: Error, index: number) => void): this;
  abort(): void;
}

type Task<I, O> = (data: I) => (O | IterableIterator<O>);
type ContextifiedTask<I, O, C> = (data: I, context: C) => O;
