import { Context } from './../common/typings';
import ExecutorPromise, { ABORTED } from './../common/executor-promise';
import ContextifiedProxy from './../common/contextified-proxy';

declare global {
  // https://github.com/Microsoft/TypeScript/issues/21309#issuecomment-376338415
  type RequestIdleCallbackHandle = any;
  type RequestIdleCallbackOptions = {
    timeout: number;
  };

  type RequestIdleCallbackDeadline = {
    readonly didTimeout: boolean;
    timeRemaining: () => number;
  };

  interface Window {
    requestIdleCallback: (
      callback: (deadline: RequestIdleCallbackDeadline) => void,
      opts?: RequestIdleCallbackOptions
    ) => RequestIdleCallbackHandle;
    cancelIdleCallback: (handle: RequestIdleCallbackHandle) => void;
  }
}

type TaskFunction<I, O, C> = (
  data: I,
  context: C
) => O | Promise<O> | IterableIterator<O> | AsyncIterableIterator<O>;

/**
 * Interface descriptor for a `ContextifiedProxy` matching the
 * signatures of the `IdlePeriodExecutor` methods.
 */
interface IdlePeriodContextifiedProxy<C> {
  execute<I, O>(
    fn: TaskFunction<I, O, C>,
    data: I
  ): ExecutorPromise<unknown, I>;

  map<I, O>(
    fn: TaskFunction<I, O, C>,
    elements: Array<I>
  ): ExecutorPromise<I, Array<I>>;

  provideContext<C2>(value: C2): IdlePeriodContextifiedProxy<C2>;
}

/**
 * Executor implementation, which uses an `IdlePeriodQueue` to schedule tasks
 * on the main thread.
 */
export default class IdlePeriodExecutor {
  /**
   * Queue to schedule tasks on
   */
  private readonly queue: IdlePeriodQueue;
  /**
   * Internal counter for context IDs
   */
  private contextCounter: number;

  /**
   * Creates a new executor with threshold and timeout for the queue
   *
   * @param     threshold     Minimum required time of a loop iteration in ms
   * @param     timeout       Timeout parameter for `requestIdleCallback`
   */
  constructor(threshold: number, timeout: number | undefined = undefined) {
    this.queue = new IdlePeriodQueue(threshold, timeout);
    this.contextCounter = 0;
  }

  /**
   * Creates a new context with `value` and returns a `ContextifiedProxy` holding that context
   *
   * @param     value         The context value to use
   * @returns                 ContextifiedProxy holding the context
   */
  public provideContext<C>(value: C): IdlePeriodContextifiedProxy<C> {
    const context: Context<C> = {
      id: this.contextCounter++,
      value
    };

    return new ContextifiedProxy(
      this as any,
      context
    ) as IdlePeriodContextifiedProxy<C>;
  }

  /**
   * Public method for the execution of a single task element on the queue without context
   *
   * @param     fn        Task function to execute
   * @param     data      Data to pass to the task function
   * @returns             ExecutorPromise for chaining
   */
  public execute<I, O>(
    fn: TaskFunction<I, O, never>,
    data: I
  ): ExecutorPromise<unknown, O> {
    return this.__execute<I, O, never>([fn, data], undefined);
  }

  /**
   * Internal method for the execution of a single task on the queue with or without context
   *
   * @param     args      Arguments for `execute`
   * @param     context   Context value or undefined
   * @returns             ExecutorPromise for chaining
   */
  __execute<I, O, C>(
    [fn, data]: [TaskFunction<I, O, C>, I],
    context: Context<C> | undefined
  ) {
    return ExecutorPromise.forExecutor<unknown, O>(manager => {
      const handleElement = (value: O, index: number | null) => {
        if (index === null) {
          // When the element is not an intermediate result, resolve the combined Promise
          manager.resolveAll(value);
        } else {
          // When the element is an intermediate result, resolve a single element
          manager.resolveElement(value, index);
        }
      };

      const queueEl: QueueElement<I, O, C> = {
        fn,
        data,
        context: context ? context.value : undefined,
        isAborted: false,
        onElement: handleElement,
        onError: reason => manager.rejectAll(reason)
      };

      const onAbort = () => {
        queueEl.isAborted = true;
        this.queue.clearAborted();
        manager.rejectAll(ABORTED);
      };

      this.queue.submit(queueEl);
      manager.setOnAbort(onAbort);
    });
  }

  /**
   * Public method for the distribution of multiple task elements onto
   * the IdlePeriodQueue without context
   *
   * @param     fn        Task function to execute
   * @param     elements  Elements to pass to the task function
   * @returns             ExecutorPromise for chaining
   */
  public map<I, O>(
    fn: TaskFunction<I, O, never>,
    elements: Array<I>
  ): ExecutorPromise<O, Array<O>> {
    return this.__map<I, O, never>([fn, elements], undefined);
  }

  /**
   * Internal method for the distribution of multiple task elements onto
   * the IdlePeriodQueue with or without context
   *
   * @param     args      Arguments for `map` method
   * @param     context   Context to pass to the task function
   */
  __map<I, O, C>(
    [fn, elements]: [TaskFunction<I, O, C>, Array<I>],
    context: Context<C> | undefined
  ): ExecutorPromise<O, Array<O>> {
    return ExecutorPromise.forExecutor<O, Array<O>>(manager => {
      // Keep track of the results, that have been sent back from the queue
      let elementResults: Array<O | null> = new Array(elements.length);
      let elementCount = 0;
      let firstError: any = null;

      /**
       * Increases the element count and resolves the combined promise when all
       * elements have been responded to with the array of all results.
       * When an error has occurred, the combined Promise is rejects with the first
       * error occurred.
       */
      const afterSettle = () => {
        elementCount++;

        if (elementCount >= elements.length) {
          Promise.resolve().then(() => {
            if (firstError !== null) {
              manager.rejectAll(firstError);
            } else {
              manager.resolveAll(elementResults);
            }
          });
        }
      };

      // Create QueueElements for each input element
      const queueElements = elements.map((element, index) => {
        const handleElement = (value: O, iterIndex: number) => {
          if (iterIndex === null) {
            manager.resolveElement(value, index);
            elementResults[index] = value;
            afterSettle();
          }
        };

        const handleError = (reason: any) => {
          manager.rejectElement(reason, index);
          elementResults[index] = null;
          afterSettle();
        };

        const queueEl: QueueElement<I, O, C> = {
          fn,
          data: element,
          context: context ? context.value : undefined,
          index,
          isAborted: false,
          onElement: handleElement,
          onError: handleError
        };

        return queueEl;
      });

      // Submit all elements to the queue
      queueElements.forEach(queueElement => this.queue.submit(queueElement));

      // Callback setting the `isAborted` flag on all QueueElements and rejecting
      // the combined Promise with the `ABORTED` symbol
      const onAbort = () => {
        queueElements.forEach(el => {
          el.isAborted = true;
        });

        this.queue.clearAborted();

        manager.rejectAll(ABORTED);
      };

      manager.setOnAbort(onAbort);
    });
  }
}

/**
 * Represents an element for the default `IdlePeriodQueue` containing the task function,
 * data, context and index. Results are reported by invoking `onElement` and `onError`
 */
interface QueueElement<I, O, C> {
  fn: TaskFunction<I, O, C>;
  data: I;
  context: C;
  index?: number;
  isAborted: boolean;
  onElement: (value: O, index: number | null) => void;
  onError: (reason: any) => void;
}

/**
 * Represents a session of execution, which is iterated by one step in the loop.
 * The `iterator` may be synchronous or asynchronous. `iterIndex` refers to the index
 * of the iteration, which is about to be executed.
 */
interface IterableSession<I, O, C> {
  element: QueueElement<I, O, C>;
  iterator: Iterator<O> | AsyncIterator<O>;
  iterIndex: number;
}

/**
 * Queue of tasks, which are executed inside `window.requestIdleCallback` callback functions.
 *
 * When elements are added to the queue, a loop is started, which takes the oldest element from
 * the queue and processes it until the `deadline.timeRemaining()` is lower than `threshold`.
 *
 * When a task function returns a sync or async iterator, an `IterableSession` is created, which
 * will iterate the iterator in the next loop ticks.
 *
 * When the iterator is asynchronous, the session will be put into the `sessionQueue` when the Promise
 * resolves, which acts as a high priority queue.
 */
class IdlePeriodQueue {
  /**
   * Minimum `timeRemaining` for a loop tick to start
   */
  private threshold: number;
  /**
   * Timeout parameter, which enforces the execution of idle callbacks after a fixed amount of ms
   */
  private timeout: number | null;
  /**
   * Default queue containing `QueueElements` to be processed
   */
  private queue: Array<QueueElement<any, any, any>>;
  /**
   * Current `IterableSession`, which is synchronously iterated until finished
   */
  private currentSession: IterableSession<any, any, any> | null;
  /**
   * Queue of asynchronous `IterableSession`s, containing AsyncIterators
   */
  private asyncSessionQueue: Array<IterableSession<any, any, any>>;
  /**
   * Whether an idle callback is currently scheduled
   */
  private isCallbackScheduled: boolean;

  /**
   * Creates a new IdlePeriodQueue
   *
   * @param     threshold       The minimum time to execute a loop tick. When `deadline.timeRemaining()` is below
   *                            this value, a new IdleCallback is requested
   * @param     timeout         `timeout` parameter of `requestIdleCallback`, which enforces the execution after the timeout
   */
  constructor(threshold: number, timeout: number | null = null) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.queue = [];
    this.isCallbackScheduled = false;
    this.asyncSessionQueue = [];
    this.currentSession = null;
    this.__handleIdleCallback = this.__handleIdleCallback.bind(this);
  }

  /**
   * Submits the QueueElement to the default queue and scheduled an idle callback
   * if none is in progress.
   *
   * @param     element       The element to add to the queue
   */
  public submit(element: QueueElement<any, any, any>) {
    this.queue.push(element);

    if (!this.isCallbackScheduled) {
      window.requestIdleCallback(this.__handleIdleCallback);
      this.isCallbackScheduled = true;
    }
  }

  /**
   * Explicitly clears elements, whose `isAborted` flag is set from the `queue`.
   * Aborted elements are not considered in the loop, but when multiple elements are aborted
   * it is usually faster to clear them in advance.
   */
  public clearAborted() {
    for (let i = this.queue.length - 1; i >= 0; --i) {
      if (this.queue[i].isAborted) {
        this.queue.splice(i, 1);
      }
    }
  }

  /**
   * Processes a single QueueElement by invoking the task function with data and context.
   * When `fn` returns a Promise, `onElement` and `onError` will be called when the Promise has
   * settled. Otherwise, the callbacks are invoked directly.
   *
   * When an `iterator` or `asyncIterator` is returned by the task function, an `IterableSession`
   * is created and returned.
   *
   * @param     element       Queue element to be executed
   * @returns                 IterableSession for an iterator or `null` if the task function
   *                          does not return an iterator
   */
  private __processElement<I, O, C>(
    element: QueueElement<I, O, C>
  ): IterableSession<I, O, C> | null {
    try {
      const result = element.fn(element.data, element.context);

      if (
        !result ||
        (!(result as IterableIterator<O>)[Symbol.iterator] &&
          !(result as AsyncIterableIterator<O>)[Symbol.asyncIterator])
      ) {
        // When the result is not an iterator, call onElement and onError and return `null`
        Promise.resolve(result as Promise<O> | O).then(
          res => !element.isAborted && element.onElement(res, null),
          reason => !element.isAborted && element.onError(reason)
        );

        return null;
      } else {
        // When the result is an iterator,
        return {
          element,
          iterator: result as IterableIterator<O> | AsyncIterableIterator<O>,
          iterIndex: 0
        };
      }
    } catch (err) {
      element.onError(err);
    }
  }

  /**
   * Processes the next tick of an `IterableSession` by invoking the `next` method and returns
   * a boolean indicating whether the session should be removed from the `currentSession`.
   *
   * When `next` returns a Promise, this Promise is chained with a callback, which will insert
   * the session into the `asyncSessionQueue` after finishing the step and returns `true` to remove
   * the session as `currentSession`.
   *
   * When `next` synchronously returns an `IteratorResult`, the `onElement` and `onError` callbacks are
   * invoked accordingly and the `done` flag is returned.
   *
   * @param     session     The `IterableSession` to iterate
   * @returns               Whether the session is done as a synchronous session
   */
  private __processSessionIteration<I, O, C>(
    session: IterableSession<I, O, C>
  ): boolean {
    if (session.element.isAborted) {
      session.iterator.return();
    }

    try {
      const promiseOrResult = session.iterator.next();

      if (typeof (promiseOrResult as Promise<any>).then === 'function') {
        // When the result is PromiseLike, chain the Promise with completion callbacks
        const promise = promiseOrResult as Promise<IteratorResult<O>>;
        promise.then(
          result => {
            if (session.element.isAborted) {
              return;
            }

            if (result.done) {
              session.element.onElement(result.value, null);
            } else {
              session.element.onElement(result.value, session.iterIndex);
              session.iterIndex++;

              // Push the session into the `asyncSessionQueue` once the Promise resolved
              this.asyncSessionQueue.push(session);
            }
          },
          reason => {
            // When an error occurs, call `onError` and do not add the session to the `asyncSessionQueue`
            !session.element.isAborted && session.element.onError(reason);
          }
        );

        // Act as if the iterator is finished and will be removed as `currentSession`
        return true;
      } else {
        // When the iterator returns synchronously call `onElement` and `onError` accordingly
        // and return the `done` flag of the iterator result
        const result = promiseOrResult as IteratorResult<O>;

        if (result.done) {
          session.element.onElement(result.value, null);
          return true;
        } else {
          session.element.onElement(result.value, session.iterIndex);
          session.iterIndex++;
          return false;
        }
      }
    } catch (e) {
      // When an error occurs, treat iterator as finished
      session.element.onError(e);
      return true;
    }
  }

  /**
   * Callback function for `window.requestIdleCallback`. Loops until the `deadline.timeRemaining()` is less than `threshold`.
   * In each loop iteration the following priorities exist:
   *
   * 1. When a `currentSession` exists, this session will be iterated by one iteration. Then the loop begins again.
   * 2. When there are elements in the `asyncSessionQueue`, takes the oldest element and iterates this by one. Then the loop starts again.
   * 3. When there are are elements in the `queue`, takes the oldest element from the queue and processes this element.
   * 4. When none of the above match, the loop is stopped.
   * 5. When the `timeRemaining` is lower than `threshold`, the loop is stopped and a new Idle Callback is requested.
   *
   * @param     deadline      Deadline containing the remaining time for the callback
   */
  private __handleIdleCallback(deadline: RequestIdleCallbackDeadline) {
    while (deadline.timeRemaining() > this.threshold) {
      // Process the next iteration tick of the current synchronous `IterableSession` if it exists
      if (this.currentSession !== null) {
        const isSessionFinished = this.__processSessionIteration(
          this.currentSession
        );

        // When the session is finished, remove it
        if (isSessionFinished) {
          this.currentSession = null;
        }

        continue;
      }

      // If there are elements in the `asyncSessionQueue`, take the oldest and process the next
      // iteration.
      if (this.asyncSessionQueue.length > 0) {
        const session = this.asyncSessionQueue.shift();
        const isSessionFinished = this.__processSessionIteration(session);

        // When it is synchronous in the iteration, set it as the `currentSession`
        if (!isSessionFinished) {
          this.currentSession = session;
        }

        continue;
      }

      // If the queue is empty, break the loop
      if (this.queue.length < 1) {
        this.isCallbackScheduled = false;
        return;
      }

      // Take the oldest element from the queue
      const element = this.queue.shift();

      if (element.isAborted) {
        continue;
      }

      const session = this.__processElement(element);

      if (session) {
        // If the element results in an `IterableSession`, perform the first tick
        // in this loop cycle.
        this.currentSession = this.__processSessionIteration(session)
          ? null
          : session;
      }
    }

    // When the deadline is exceeded and there are still elements to process, schedule another Idle Callback
    if (
      this.queue.length > 0 ||
      this.currentSession ||
      this.asyncSessionQueue.length > 0
    ) {
      window.requestIdleCallback(this.__handleIdleCallback, {
        timeout: this.timeout
      });
    } else {
      this.isCallbackScheduled = false;
    }
  }
}
