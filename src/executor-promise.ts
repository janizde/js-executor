type AbortCallback = () => void;

interface PromiseManager<E, A> {
  resolveAll: (value: A) => void;
  rejectAll: (error: Error) => void;
  resolveElement: (value: E, index: number) => void;
  rejectElement: (error: Error, index: number) => void;
}

interface PromiseRecord<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
}

type ElementCallback<E> = (element: E, index: number) => void;
type ErrorCallback = (error: Error, index: number) => void;
type ThenCallback<A> = (value: A) => any;
type CatchCallback = (reason: any) => any;

function createPromiseRecord<T>(): PromiseRecord<T> {
  let resolve: (value: T) => void;
  let reject: (reason: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { resolve, reject, promise };
}

class ExecutorPromise<E, A> {
  private readonly onAbort: AbortCallback;
  private readonly allPromise: PromiseRecord<A>;
  private readonly elementPromises: Array<PromiseRecord<E>>;
  private thenCallback?: ThenCallback<A>;
  private catchCallback?: CatchCallback;
  private elementCallback?: ElementCallback<E>;
  private errorCallback?: ErrorCallback;

  constructor(
    executor: (manager: PromiseManager<E, A>) => void,
    onAbort: AbortCallback
  ) {
    this.onAbort = onAbort;
    this.allPromise = createPromiseRecord<A>();
    this.elementPromises = [];

    const resolveAll = (value: A) => this.allPromise.resolve(value);
    const rejectAll = (reason: any) => this.allPromise.reject(reason);

    const resolveElement = (element: E, index: number) =>
      this.getElementPromise(index).resolve(element);

    const rejectElement = (error: Error, index: number) =>
      this.getElementPromise(index).reject(error);

    const manager: PromiseManager<E, A> = {
      resolveAll,
      rejectAll,
      resolveElement,
      rejectElement
    };

    executor(manager);
  }

  private getElementPromise(index: number) {
    if (this.elementPromises[index]) {
      return this.elementPromises[index];
    }

    const elementPromise = createPromiseRecord<E>();
    this.elementPromises[index] = elementPromise;
    elementPromise.promise.then(
      value => {
        this.elementCallback && this.elementCallback(value, index);
      },
      reason => {
        this.errorCallback && this.errorCallback(reason, index);
      }
    );

    return elementPromise;
  }

  public then(onFulfilled?: ThenCallback<A>, onRejected?: CatchCallback) {
    this.allPromise.promise.then(onFulfilled, onRejected);
    return this;
  }

  public catch(onRejected: CatchCallback) {
    this.then(undefined, onRejected);
    return this;
  }

  public finally(onFinally: () => void) {
    return this.allPromise.promise.finally(onFinally);
  }

  public element(onElement: ElementCallback<E>) {
    this.elementCallback = onElement;
    return this;
  }

  public error(onError: ErrorCallback) {
    this.errorCallback = onError;
    return this;
  }

  public abort() {}
}

export default ExecutorPromise;
