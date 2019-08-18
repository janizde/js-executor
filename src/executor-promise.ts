type AbortCallback = () => void;

export interface PromiseManager<E, A> {
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
type ThenCallback<A, O> = (value: A) => O;
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
  private onAbort?: AbortCallback;
  private allPromise: Promise<A>;
  private readonly elementPromises: Array<PromiseRecord<E>> = [];
  private thenCallback?: ThenCallback<A, any>;
  private catchCallback?: CatchCallback;
  private elementCallback?: ElementCallback<E>;
  private errorCallback?: ErrorCallback;
  private readonly successRegister: Array<{ value: E; index: number }> = [];
  private readonly errorRegister: Array<{ reason: Error; index: number }> = [];
  private readonly parent: ExecutorPromise<E, A> | null = null;

  /**
   * Creates a new ExecutorPromise with a parent promise and a PromiseRecord
   * representing the promise relating to the combined result
   *
   * @param     parent      Parent ExecutorPromise or `null` if it is the root promise
   * @param     allPromise  PromiseRecord corresponding to the combined result
   */
  private constructor(
    parent: ExecutorPromise<any, any> | null,
    allPromise: Promise<A>
  ) {
    this.parent = parent;
    this.allPromise = allPromise;
  }

  static forExecutor<E, A>(
    executor: (manager: PromiseManager<E, A>) => void,
    onAbort?: AbortCallback
  ): ExecutorPromise<E, A> {
    const {
      resolve: resolveAll,
      reject: rejectAll,
      promise: allPromise
    } = createPromiseRecord<A>();

    const promise = new ExecutorPromise<E, A>(null, allPromise);
    promise.onAbort = onAbort;

    const resolveElement = (element: E, index: number) =>
      promise.getElementPromise(index).resolve(element);

    const rejectElement = (error: Error, index: number) =>
      promise.getElementPromise(index).reject(error);

    const manager: PromiseManager<E, A> = {
      resolveAll,
      rejectAll,
      resolveElement,
      rejectElement
    };

    executor(manager);
    return promise;
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

  public then<R1 = A, R2 = never>(
    onFulfilled?: ((value: A) => R1 | PromiseLike<R1>) | undefined | null,
    onRejected?: ((reason: any) => R2 | PromiseLike<R2>) | undefined | null
  ) {
    const chainedPromise = this.allPromise.then(onFulfilled, onRejected);
    return new ExecutorPromise<E, R1 | R2>(this, chainedPromise);
  }

  public catch(onRejected: CatchCallback) {
    this.then(undefined, onRejected);
    return this;
  }

  public finally(onFinally: () => void) {
    return this.allPromise.finally(onFinally);
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
