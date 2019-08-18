import ExecutorPromise, { PromiseManager } from './executor-promise';

/**
 * Creates a Promise resolving after the next event loop tick,
 * as some assertions rely on Promises being resolved in the microtask queue
 */
const nextTick = () => new Promise(resolve => process.nextTick(resolve));

describe('ExecutorPromise', () => {
  const createDeferred = <T>() => {
    let resolve: (value: T) => void = null;
    let reject: (reason: any) => void = null;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { resolve, reject, promise };
  };

  it('should call the then callback when resolving all', async () => {
    let manager: PromiseManager<never, number> = null;
    const promise = ExecutorPromise.forExecutor(m => {
      manager = m;
    });

    const onRes = jest.fn();
    const onRej = jest.fn();
    promise.then(onRes, onRej);

    expect(onRes).not.toHaveBeenCalled();
    manager.resolveAll(12);
    await nextTick();
    expect(onRes).toHaveBeenCalledWith(12);
    expect(onRej).not.toHaveBeenCalled();
  });

  it('should call the catch callback when rejecting all', async () => {
    let manager: PromiseManager<never, number> = null;
    const promise = ExecutorPromise.forExecutor<number, number>(m => {
      manager = m;
    });

    const onRes = jest.fn();
    const onRej = jest.fn();
    promise.then(onRes, onRej);

    expect(onRej).not.toHaveBeenCalled();
    const err = new Error();
    manager.rejectAll(err);

    await nextTick();

    expect(onRes).not.toHaveBeenCalled();
    expect(onRej).toHaveBeenCalledWith(err);
  });

  it('should call .element for each resolved element', async () => {
    let manager: PromiseManager<number, number> = null;
    const promise = ExecutorPromise.forExecutor<number, number>(m => {
      manager = m;
    });
    const onElement = jest.fn();
    const onError = jest.fn();
    promise.element(onElement).error(onError);

    expect(onElement).not.toHaveBeenCalled();
    manager.resolveElement(2, 0);
    manager.resolveElement(4, 1);
    manager.resolveElement(6, 2);
    await nextTick();

    expect(onError).not.toHaveBeenCalled();
    expect(onElement).toHaveBeenCalledTimes(3);
    expect(onElement).toHaveBeenNthCalledWith(1, 2, 0);
    expect(onElement).toHaveBeenNthCalledWith(2, 4, 1);
    expect(onElement).toHaveBeenNthCalledWith(3, 6, 2);
  });

  it('should call .error when rejecting an element', async () => {
    let manager: PromiseManager<number, number> = null;
    const promise = ExecutorPromise.forExecutor<number, number>(m => {
      manager = m;
    });
    const onElement = jest.fn();
    const onError = jest.fn();
    promise.element(onElement).error(onError);

    expect(onElement).not.toHaveBeenCalled();
    manager.resolveElement(2, 0);
    const err = new Error();
    manager.rejectElement(err, 1);
    manager.resolveElement(6, 2);
    await nextTick();

    expect(onElement).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onElement).toHaveBeenNthCalledWith(1, 2, 0);
    expect(onError).toHaveBeenCalledWith(err, 1);
    expect(onElement).toHaveBeenNthCalledWith(2, 6, 2);
  });

  it.skip('should chain the callbacks for .element', async () => {
    let manager: PromiseManager<number, number> = null;
    const promise = ExecutorPromise.forExecutor<number, number>(m => {
      manager = m;
    });
    const onElement = jest.fn();
    const onError = jest.fn();
    promise
      .element(val => val * 2)
      .element(onElement)
      .error(onError);

    expect(onElement).not.toHaveBeenCalled();
    manager.resolveElement(2, 0);
    manager.resolveElement(4, 1);
    manager.resolveElement(6, 2);
    await nextTick();

    expect(onError).not.toHaveBeenCalled();
    expect(onElement).toHaveBeenCalledTimes(3);
    expect(onElement).toHaveBeenNthCalledWith(1, 4, 0);
    expect(onElement).toHaveBeenNthCalledWith(2, 8, 1);
    expect(onElement).toHaveBeenNthCalledWith(3, 12, 2);
  });

  it('should recover from rejection when the catch callback returns a value', async () => {
    let manager: PromiseManager<never, number> = null;
    const promise = ExecutorPromise.forExecutor(m => {
      manager = m;
    });

    const onRes = jest.fn();
    const onRej = jest.fn();
    promise.then(null, () => 12).then(onRes, onRej);

    expect(onRej).not.toHaveBeenCalled();
    const err = new Error();
    manager.rejectAll(err);

    await nextTick();

    expect(onRej).not.toHaveBeenCalled();
    expect(onRes).toHaveBeenCalledWith(12);
  });

  it('should chain the .then callbacks', async () => {
    let manager: PromiseManager<never, number> = null;
    const promise = ExecutorPromise.forExecutor<number, number>(m => {
      manager = m;
    });

    const onRes = jest.fn();
    const onRej = jest.fn();
    promise.then(val => val * 2).then(onRes, onRej);

    expect(onRes).not.toHaveBeenCalled();
    manager.resolveAll(12);
    await nextTick();
    expect(onRes).toHaveBeenCalledWith(24);
    expect(onRej).not.toHaveBeenCalled();
  });
});
