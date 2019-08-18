type AbortCallback = () => void;

/**
 * Specifies an object, which is passed to an `ExecutorPromise` executor
 * function, providing methods to manage the promise
 *
 * @template    E     The type that a single element resolves with
 * @template    A     The type that the combined promise resolves with
 */
export interface PromiseManager<E, A> {
  /**
   * Resolves the combined promise with the provided value
   */
  resolveAll(value: A): void;
  /**
   * Rejects the combined promise with the provided reason
   */
  rejectAll(reason: any): void;
  /**
   * Resolves a single element with the provided value and index
   */
  resolveElement(value: E, index: number): void;
  /**
   * Rejects a single element with the provided reason and index
   */
  rejectElement(reason: any, index: number): void;
}

/**
 * Represents the type of a callback function passed to `.then`
 * @template    T       The input type of the callback
 * @template    R       The result type of the callback
 */
type ThenCallback<T, R> = ((value: T) => R | PromiseLike<R>) | undefined | null;

/**
 * Represents the type of a callback function passed to `.catch`
 * @template    R       The result type of the callback
 */
type CatchCallback<R> =
  | ((reason: any) => R | PromiseLike<R>)
  | undefined
  | null;

/**
 * Represents the type of a callback function passed to `.element`
 * @template    T       The input type of the callback
 * @template    R       The result type of the callback
 */
type ElementCallback<T, R> =
  | ((value: T, index: number) => R | PromiseLike<R>)
  | undefined
  | null;

/**
 * Represents the type of a callback function passed to `.error`
 * @template    R       The result type of the callback
 */
type ErrorCallback<R> =
  | ((reason: any, index: number) => R | PromiseLike<R>)
  | undefined
  | null;

type PromiseArray<T> = Array<PromiseLike<T> | undefined>;

/**
 * Encapsulated an array of Promises with the provided resolve and reject
 * callbacks and provides methods for chaining.
 *
 * When creating a `MultiPromise`, all promises from the constructor parameter
 * are immediately chained with the `elementCb` and `errorCb` callbacks.
 *
 * When calling `element` or `error`, a new `MultiPromise` is created with the
 * provided resolve and reject callbacks.
 *
 * When `introducePromise` is called with a new promise, this promise is immediately
 * chained with the `elementCb` and `errorCb` and inserted into the `promises` array.
 * The introduction of the new promise is propagated to the child promises.
 */
class MultiPromise<T, R1, R2> {
  private readonly promises: PromiseArray<R1 | R2>;
  private readonly elementCb: ElementCallback<T, R1>;
  private readonly errorCb: ErrorCallback<R2>;
  private readonly children: Array<MultiPromise<R1 | R2, any, any>>;

  public constructor(
    promises: PromiseArray<T>,
    elementCb: ElementCallback<T, R1>,
    errorCb: ErrorCallback<R2>
  ) {
    this.elementCb = elementCb;
    this.errorCb = errorCb;
    this.promises = promises.map((p, i) => this.__chainPromise(p, i));
    this.children = [];
  }

  public element<RR1 = T, RR2 = never>(
    onElement?: ElementCallback<R1 | R2, RR1>,
    onError?: ErrorCallback<RR2>
  ) {
    const mp = new MultiPromise<R1 | R2, RR1, RR2>(
      this.promises,
      onElement,
      onError
    );

    this.children.push(mp);
    return mp;
  }

  public error<RR2>(onError?: ErrorCallback<RR2>) {
    return this.element(null, onError);
  }

  public introducePromise(promise: PromiseLike<T>, index: number) {
    const chained = this.__chainPromise(promise, index);
    this.promises[index] = chained;
    this.children.forEach(child => child.introducePromise(chained, index));
  }

  private __chainPromise(
    promise: PromiseLike<T> | undefined,
    index: number
  ): PromiseLike<R1 | R2> | undefined {
    if (!promise) {
      return promise as undefined;
    }

    const thenCb: ThenCallback<T, R1> = this.elementCb
      ? value => this.elementCb(value, index)
      : undefined;

    const catchCb: CatchCallback<R2> = this.errorCb
      ? reason => this.errorCb(reason, index)
      : undefined;

    return promise.then(thenCb, catchCb);
  }
}

class ExecutorPromise<E, A> {
  private readonly onAbort: AbortCallback | undefined;
  private readonly allPromise: Promise<A>;
  private readonly elementPromise: MultiPromise<E, any, any>;

  /**
   * Creates a new ExecutorPromise with a parent promise and a PromiseRecord
   * representing the promise relating to the combined result
   *
   * @param     parent      Parent ExecutorPromise or `null` if it is the root promise
   * @param     allPromise  PromiseRecord corresponding to the combined result
   */
  private constructor(
    allPromise: Promise<A>,
    elementPromise: MultiPromise<E, any, any>,
    onAbort?: AbortCallback
  ) {
    this.allPromise = allPromise;
    this.elementPromise = elementPromise;
    this.onAbort = onAbort;
  }

  static forExecutor<E, A>(
    executor: (manager: PromiseManager<E, A>) => void,
    onAbort?: AbortCallback
  ): ExecutorPromise<E, A> {
    let resolveAll: (value: A) => void;
    let rejectAll: (reason: any) => void;
    const allPromise = new Promise<A>((res, rej) => {
      resolveAll = res;
      rejectAll = rej;
    });

    const elementPromise = new MultiPromise<E, E, never>(
      [],
      undefined,
      undefined
    );

    const promise = new ExecutorPromise<E, A>(
      allPromise,
      elementPromise,
      onAbort
    );

    const resolveElement = (element: E, index: number) => {
      const promise = Promise.resolve(element);
      elementPromise.introducePromise(promise, index);
    };

    const rejectElement = (reason: Error, index: number) => {
      const promise = Promise.reject(reason);
      elementPromise.introducePromise(promise, index);
    };

    const manager: PromiseManager<E, A> = {
      resolveAll,
      rejectAll,
      resolveElement,
      rejectElement
    };

    executor(manager);
    return promise;
  }

  public then<R1 = A, R2 = never>(
    onFulfilled?: ((value: A) => R1 | PromiseLike<R1>) | undefined | null,
    onRejected?: ((reason: any) => R2 | PromiseLike<R2>) | undefined | null
  ) {
    const chainedPromise = this.allPromise.then(onFulfilled, onRejected);
    return new ExecutorPromise<E, R1 | R2>(
      chainedPromise,
      this.elementPromise,
      this.onAbort
    );
  }

  public catch<R2 = never>(
    onRejected?: ((reason: any) => R2 | PromiseLike<R2>) | undefined | null
  ) {
    return this.then(null, onRejected);
  }

  public finally(onFinally: () => void) {
    return this.allPromise.finally(onFinally);
  }

  public element<R1 = E, R2 = never>(
    onElement?: ElementCallback<E, R1>,
    onError?: ErrorCallback<R2>
  ) {
    const chainedPromise = this.elementPromise.element<R1, R2>(
      onElement,
      onError
    );
    return new ExecutorPromise<R1 | R2, A>(
      this.allPromise,
      chainedPromise,
      this.onAbort
    );
  }

  public error<R2 = never>(
    onError?: ((reason: Error) => R2 | PromiseLike<R2>) | undefined | null
  ) {
    return this.element(null, onError);
  }

  public abort() {
    if (this.onAbort) {
      this.onAbort();
    }
  }
}

export default ExecutorPromise;
