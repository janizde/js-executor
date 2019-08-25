import { Context } from './common';
import ExecutorPromise from './executor-promise';
import ContextifiedProxy from './contextified-proxy';

// https://github.com/Microsoft/TypeScript/issues/21309#issuecomment-376338415
type RequestIdleCallbackHandle = any;
type RequestIdleCallbackOptions = {
  timeout: number;
};

type RequestIdleCallbackDeadline = {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
};

declare global {
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

interface QueueElement<I, O, C> {
  fn: TaskFunction<I, O, C>;
  data: I;
  context: C;
  index?: number;
  onElement: (value: O, index: number | null) => void;
  onError: (reason: any) => void;
}

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

export default class IdlePeriodExecutor {
  private readonly queue: IdlePeriodQueue;
  private contextCounter: number;

  constructor(threshold: number) {
    this.queue = new IdlePeriodQueue(threshold);
    this.contextCounter = 0;
  }

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

  public execute<I, O>(fn: TaskFunction<I, O, never>, data: I) {
    return this.__execute<I, O, never>([fn, data], undefined);
  }

  __execute<I, O, C>(
    [fn, data]: [TaskFunction<I, O, C>, I],
    context: Context<C> | undefined
  ) {
    return ExecutorPromise.forExecutor(manager => {
      const handleElement = (value: O, index: number | null) => {
        if (index === null) {
          manager.resolveAll(value);
        } else {
          manager.resolveElement(value, index);
        }
      };

      const queueEl: QueueElement<I, O, C> = {
        fn,
        data,
        context: context ? context.value : undefined,
        onElement: handleElement,
        onError: reason => manager.rejectAll(reason)
      };

      this.queue.submit(queueEl);
    });
  }

  public map<I, O>(fn: TaskFunction<I, O, never>, elements: Array<I>) {
    return this.__map<I, O, never>([fn, elements], undefined);
  }

  __map<I, O, C>(
    [fn, elements]: [TaskFunction<I, O, C>, Array<I>],
    context: Context<C> | undefined
  ) {
    return ExecutorPromise.forExecutor(manager => {
      let elementResults: Array<O | null> = new Array(elements.length);
      let elementCount = 0;
      let firstError: any = null;

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

      elements.map((element, index) => {
        const handleElement = (value: O, iterIndex: number) => {
          if (iterIndex === null) {
            manager.resolveElement(value, index);
            elementResults[index] = value;
          }

          afterSettle();
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
          onElement: handleElement,
          onError: handleError
        };

        this.queue.submit(queueEl);
      });
    });
  }
}

interface ExecutionSession<I, O, C> {
  element: QueueElement<I, O, C>;
  iterator: Iterator<O> | AsyncIterator<O>;
  iterIndex: 0;
}

class IdlePeriodQueue {
  private threshold: number;
  private timeout: number | null;
  private queue: Array<QueueElement<any, any, any>>;
  private currentSession: ExecutionSession<any, any, any> | null;
  private sessionQueue: Array<ExecutionSession<any, any, any>>;
  private isCallbackScheduled: boolean;

  constructor(threshold: number, timeout: number | null = null) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.queue = [];
    this.isCallbackScheduled = false;
    this.sessionQueue = [];
    this.currentSession = null;
    this.__handleIdleCallback = this.__handleIdleCallback.bind(this);
  }

  public submit(element: QueueElement<any, any, any>) {
    this.queue.push(element);

    if (!this.isCallbackScheduled) {
      window.requestIdleCallback(this.__handleIdleCallback);
      this.isCallbackScheduled = true;
    }
  }

  private __processElement<I, O, C>(
    element: QueueElement<I, O, C>
  ): ExecutionSession<I, O, C> | null {
    try {
      const result = element.fn(element.data, element.context);

      if (
        !result ||
        (!(result as IterableIterator<O>)[Symbol.iterator] &&
          !(result as AsyncIterableIterator<O>)[Symbol.asyncIterator])
      ) {
        Promise.resolve(result as Promise<O> | O).then(res =>
          element.onElement(res, null)
        );

        return null;
      } else {
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

  private __processSessionTick<I, O, C>(
    session: ExecutionSession<I, O, C>
  ): boolean {
    try {
      const promiseOrResult = session.iterator.next();

      if (typeof (promiseOrResult as Promise<any>).then === 'function') {
        const promise = promiseOrResult as Promise<IteratorResult<O>>;
        promise.then(result => {
          if (result.done) {
            session.element.onElement(result.value, null);
          } else {
            session.element.onElement(result.value, session.iterIndex);
            session.iterIndex++;

            this.sessionQueue.push(session);
          }
        });

        return true;
      } else {
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
      session.element.onError(e);
      return true;
    }
  }

  private __handleIdleCallback(deadline: RequestIdleCallbackDeadline) {
    while (deadline.timeRemaining() > this.threshold) {
      if (this.currentSession !== null) {
        const isSessionFinished = this.__processSessionTick(
          this.currentSession
        );

        if (isSessionFinished) {
          this.currentSession = null;
        }

        continue;
      }

      if (this.sessionQueue.length > 0) {
        const session = this.sessionQueue.shift();
        const isSessionDone = this.__processSessionTick(session);

        if (!isSessionDone) {
          this.currentSession = session;
        }

        continue;
      }

      if (this.queue.length < 1) {
        this.isCallbackScheduled = false;
        return;
      }

      const element = this.queue.shift();
      const session = this.__processElement(element);

      if (session) {
        this.currentSession = this.__processSessionTick(session)
          ? null
          : session;
      }
    }

    if (this.queue.length > 0 || this.currentSession) {
      window.requestIdleCallback(this.__handleIdleCallback, {
        timeout: this.timeout
      });
    } else {
      this.isCallbackScheduled = false;
    }
  }
}
