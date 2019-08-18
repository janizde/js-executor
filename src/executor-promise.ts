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
 *
 * @template    T     The type with which the passed-in promises resolve
 * @template    R1    The return type of the success callback
 * @template    R2    The return type of the error callback
 */
class MultiPromise<T, R1, R2> {
  /**
   * Array of promises, that are already chained with `elementCb` and `errorCb`
   */
  private readonly promises: PromiseArray<R1 | R2>;

  /**
   * Success callback to chain onto promises
   */
  private readonly elementCb: ElementCallback<T, R1>;

  /**
   * Error callback to chain onto promises
   */
  private readonly errorCb: ErrorCallback<R2>;

  /**
   * Array of child instances to notify about new promise introductions
   */
  private readonly children: Array<MultiPromise<R1 | R2, any, any>>;

  /**
   * Creates a new `MultiPromise` by chaining the provided `promises` with
   * the callbacks `elementCb` and `errorCb`
   *
   * @param     promises    The unchained promises to use
   * @param     elementCb   The success callback to chain
   * @param     errorCb     The error callback to chain
   */
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

  /**
   * Creates a new `MultiPromise`, which is chained with the provided
   * `onElement` and `onError` callbacks.
   *
   * @template    RR1         Return type of the new elementCb
   * @template    RR2         Return type of the new errorCb
   * @param       onElement   Element callback to chain onto the existing promises
   * @param       onError     Error callback to chain onto the existing promises
   * @returns                 `MultiPromise` chained with `onElement` and `onError`
   */
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

  /**
   * Convenience method to pass only an `onError` callback to `.element`
   *
   * @template    RR2       Return type of the error function
   * @param       onError   Error callback to chain onto the existing promises
   * @returns               `MultiPromise` chained with `onError`
   */
  public error<RR2>(onError?: ErrorCallback<RR2>) {
    return this.element(null, onError);
  }

  /**
   * Introduces a new promise, which is not yet contained in `promises` to
   * the `MultiPromise` by immediately chaining `elementCb` and `errorCb` onto
   * that promise and inserting it into the `promises` array for further calls to
   * `.element` and `.error`.
   *
   * The introduction is propagated to all children.
   *
   * @param     promise     The new promise to introduce
   * @param     index       The index that this promise corresponds to
   */
  public introducePromise(promise: PromiseLike<T>, index: number) {
    const chained = this.__chainPromise(promise, index);
    this.promises[index] = chained;
    this.children.forEach(child => child.introducePromise(chained, index));
  }

  /**
   * Chains a promise with callbacks, translating the regular promise callback
   * signatures to the element and error callback signatures, containing an index.
   *
   * @param     promise     The promise object to chain
   * @param     index       The index of this promise object
   * @returns               Promise chained with `elementCb` and `errorCb`
   */
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

/**
 * Extended promise, that provides callbacks for the handling of single
 * promise elements as success or error callbacks.
 *
 * The `.then` and `.catch` methods behave similar to the equivalents of
 * regular promises and support promise chaining.
 * The `.element` and `.error` callbacks are the equivalents of `.then` and `.catch`
 * for single elements of a combined promise.
 *
 * Instances should be created using the `ExecutorPromise.forExecutor(executor, onAbort)`
 * factory method, which receives a callback function `executor`, which is immediately
 * called on creation. `executor` receives a `PromiseManager` providing methods for the
 * management of `ExecutorPromise`.
 *
 * @template    E       The type that a single element resolves with
 * @template    A       The type that the combined promise resolves with
 */
class ExecutorPromise<E, A> {
  /**
   * Callback function to be called the `.abort()` is invokes.
   */
  private readonly onAbort: AbortCallback | undefined;
  /**
   * Promise representing the combined result
   */
  private readonly allPromise: Promise<A>;
  /**
   * MultiPromise wrapper for the single promise elements
   */
  private readonly elementPromise: MultiPromise<E, any, any>;

  /**
   * Creates a new ExecutorPromise
   *
   * @param     allPromise      Promise representing the combined promise
   * @param     elementPromise  MultiPromise for single promise elements
   * @param     onAbort         Callback to abort the asynchronous operation
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

  /**
   * Creates a new `ExecutorPromise` for the use with an `executor` callback.
   * The `executor` callback behaves like the first parameter to a `Promise` constructor
   * and receives an object providing methods for the management of the promise state.
   *
   * @static
   * @template    E         The type that a single element resolves with
   * @template    A         The type that the combined promise resolves with
   * @param       executor  Executor callback containing the asynchronous operation
   * @param       onAbort   Function to be called when `abort()` is invoked
   * @returns               `ExecutorPromise` for `executor`
   */
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

    // Start with an empty promise array, promises will be introduced
    // when calling `resolveElement` or `rejectElement`
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

  /**
   * Chains the `onFulfilled` and `onRejects` callbacks onto the `allPromise`
   * and returns a new `ExecutorPromise` holding this chained promise
   *
   * @template  R1              Return value of the success callback
   * @template  R2              Return value of the error callback
   * @param     onFulfilled     The success callback for the combined result
   * @param     onRejected      The error callback for the combined result
   * @returns                   New `ExecutorPromise` with chained `allPromise`
   */
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

  /**
   * Convenience method to chain only a `onRejected` callback onto the `allPromise`
   *
   * @template  R2              Return type of the error callback
   * @param     onRejected      Error callback for the combined result
   * @returns                   New `ExecutorPromise` with chained `allPromise`
   */
  public catch<R2 = never>(
    onRejected?: ((reason: any) => R2 | PromiseLike<R2>) | undefined | null
  ) {
    return this.then(null, onRejected);
  }

  /**
   * Chains a `finally` callback onto the combined promise, which is invoked
   * when the combined promise is settled.
   *
   * @param   onFinally         Callback invoked when the promise is settled
   * @returns                   New `ExecutorPromise` with chained combined result
   */
  public finally(onFinally: () => void | undefined | null) {
    const chainedPromise = this.allPromise.finally(onFinally);
    return new ExecutorPromise<E, A>(
      chainedPromise,
      this.elementPromise,
      this.onAbort
    );
  }

  /**
   * Chains the `onElement` and `onError` callbacks onto the single element
   * promises and returns a new `ExecutorPromise`
   *
   *
   * @template  R1              Return value of the success callback
   * @template  R2              Return value of the error callback
   * @param     onElement       The success callback for the element results
   * @param     onError         The error callback for the element result
   * @returns                   New `ExecutorPromise` with chained `elementPromise`
   */
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

  /**
   * Convenience method to chain only an `onError` callback onto the `elementPromise`
   *
   * @template  R2              Return type of the error callback
   * @param     onRejected      Error callback for the element results
   * @returns                   New `ExecutorPromise` with chained `elementPromise`
   */
  public error<R2 = never>(
    onError?: ((reason: Error) => R2 | PromiseLike<R2>) | undefined | null
  ) {
    return this.element(null, onError);
  }

  /**
   * Invokes the `onAbort` callback if set
   */
  public abort() {
    if (this.onAbort) {
      this.onAbort();
    }
  }
}

export default ExecutorPromise;
