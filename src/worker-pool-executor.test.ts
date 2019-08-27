import WorkerPoolExecutor, {
  WorkerError,
} from './worker-pool-executor';

import { ABORTED } from './executor-promise';
import { transferFn } from './fn';
import { ErrorKind } from './common';

describe('worker-pool-executor', () => {
  describe('execute', () => {
    describe('sync function', () => {
      it('should execute a transferred function and resolve with the result', async () => {
        const exec = new WorkerPoolExecutor(1);
        const result = await exec.execute(
          transferFn(function(data: number) {
            return data * 2;
          }),
          4
        );

        expect(result).toBe(8);
      });

      it('should pass an error thrown in the task function', async () => {
        expect.assertions(2);

        const exec = new WorkerPoolExecutor(1);
        return exec
          .execute(
            transferFn(function(data: number) {
              throw new Error('GenericError');
            }),
            2
          )
          .catch(err => {
            expect(err.message).toBe('GenericError');
            expect(err.stack).toEqual(expect.any(String));
          });
      });

      it('should throw an error when accessing scope variables in a transferred function', async () => {
        expect.assertions(2);

        const exec = new WorkerPoolExecutor(1);
        const factor = 2;
        return exec
          .execute(
            transferFn(function(data: number) {
              return data * factor;
            }),
            2
          )
          .catch(err => {
            expect(err.message).toBe('factor is not defined');
            expect(err.stack).toEqual(expect.any(String));
          });
      });

      it('should not invoke element callbacks for a regular execution', async () => {
        const exec = new WorkerPoolExecutor(1);
        const onElement = jest.fn();
        const onError = jest.fn();
        const result = await exec
          .execute(
            transferFn(function(data: number) {
              return data * 2;
            }),
            4
          )
          .element(onElement, onError);

        expect(result).toBe(8);
        expect(onElement).not.toHaveBeenCalled();
        expect(onError).not.toHaveBeenCalled();
      });
    });

    describe('context', () => {
      it('should pass a context send through provideContext', async () => {
        const exec = new WorkerPoolExecutor(1);
        const result = await exec.provideContext({ factor: 2 }).execute(
          transferFn(function(data: number, context) {
            return data * context.factor;
          }),
          4
        );

        expect(result).toBe(8);
      });
    });

    describe('async function', () => {
      it('should return the result of an asynchronous execution', async () => {
        const exec = new WorkerPoolExecutor(1);
        const result = await exec.execute(
          transferFn(async function(data: number) {
            const result = await new Promise(resolve =>
              setTimeout(() => resolve(data * 2), 5)
            );
            return result;
          }),
          4
        );

        expect(result).toBe(8);
      });

      it('should throw an error when a returned promise rejects', async () => {
        expect.assertions(3);
        const exec = new WorkerPoolExecutor(1);
        return exec
          .execute(
            transferFn(async function(data: number) {
              return new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Generic error')), 5)
              );
            }),
            4
          )
          .catch(err => {
            expect(err).toBeInstanceOf(WorkerError);
            expect(err.kind).toBe(ErrorKind.execution);
            expect(err.message).toBe('Generic error');
          });
      });
    });

    describe('generator functions', () => {
      it('should send intermediate results of a generator function to .element', async () => {
        const onElement = jest.fn();
        const onError = jest.fn();

        const exec = new WorkerPoolExecutor(1);
        const result = await exec
          .execute(
            transferFn(function*(data: number) {
              yield data * 2;
              yield data * 3;
              return data * 4;
            }),
            4
          )
          .element(onElement, onError);

        expect(result).toBe(16);
        expect(onElement).toHaveBeenCalledTimes(2);
        expect(onError).not.toHaveBeenCalled();

        expect(onElement).toHaveBeenNthCalledWith(1, 8, 0);
        expect(onElement).toHaveBeenNthCalledWith(2, 12, 1);
      });

      it('should send intermediate results of a generator function yielding promises to .element', async () => {
        const onElement = jest.fn();
        const onError = jest.fn();

        const exec = new WorkerPoolExecutor(1);
        const result = await exec
          .execute(
            transferFn(function*(data: number) {
              const asPromise = <T>(resolveVal: T): Promise<T> =>
                new Promise(resolve =>
                  setTimeout(() => resolve(resolveVal), 5)
                );

              yield asPromise(data * 2);
              yield asPromise(data * 3);
              return asPromise(data * 4);
            }),
            4
          )
          .element(onElement, onError);

        expect(result).toBe(16);
        expect(onElement).toHaveBeenCalledTimes(2);
        expect(onError).not.toHaveBeenCalled();

        expect(onElement).toHaveBeenNthCalledWith(1, 8, 0);
        expect(onElement).toHaveBeenNthCalledWith(2, 12, 1);
      });

      it('should call onError for a intermediate promise which rejects', async () => {
        const onElement = jest.fn();
        const onError = jest.fn();
        const onCatch = jest.fn();

        const exec = new WorkerPoolExecutor(1);
        const result = await exec
          .execute(
            transferFn(function*(data: number) {
              const asPromise = <T>(resolveVal: T): Promise<T> =>
                new Promise(resolve =>
                  setTimeout(() => resolve(resolveVal), 5)
                );

              yield asPromise(data * 2);

              yield new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Foo Error')), 5)
              );

              return asPromise(data * 4);
            }),
            4
          )
          .element(onElement, onError)
          .catch(onCatch);

        expect(result).toBe(16);
        expect(onElement).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onCatch).not.toHaveBeenCalled();

        expect(onElement).toHaveBeenCalledWith(8, 0);
        expect(onError).toHaveBeenCalledWith(expect.any(WorkerError), 1);
      });

      it('should reject the whole promise when an error during generator execution occurs', async () => {
        const onElement = jest.fn();
        const onError = jest.fn();
        expect.assertions(3);

        const exec = new WorkerPoolExecutor(1);
        return exec
          .execute(
            transferFn(function*(data: number) {
              const asPromise = <T>(resolveVal: T): Promise<T> =>
                new Promise(resolve =>
                  setTimeout(() => resolve(resolveVal), 5)
                );

              yield asPromise(data * 2);
              throw new Error('GenericError');
              yield asPromise(data * 3);
              return asPromise(data * 4);
            }),
            4
          )
          .element(onElement, onError)
          .catch(err => {
            expect(err).toBeInstanceOf(WorkerError);
            expect(onError).not.toHaveBeenCalled();
            expect(onElement).not.toHaveBeenCalled();
          });
      });
    });

    describe('async generator functions', () => {
      it('should send intermediate results of a async generator function to .element', async () => {
        const onElement = jest.fn();
        const onError = jest.fn();

        const exec = new WorkerPoolExecutor(1);
        const result = await exec
          .execute(
            transferFn(async function*(data: number) {
              const wait = () => new Promise(r => setTimeout(r, 5));
              await wait();
              yield data * 2;
              await wait();
              yield data * 3;
              await wait();
              return data * 4;
            }),
            4
          )
          .element(onElement, onError);

        expect(result).toBe(16);
        expect(onElement).toHaveBeenCalledTimes(2);
        expect(onError).not.toHaveBeenCalled();

        expect(onElement).toHaveBeenNthCalledWith(1, 8, 0);
        expect(onElement).toHaveBeenNthCalledWith(2, 12, 1);
      });

      it('should call onError for a intermediate promise which rejects in an async generator', async () => {
        const onElement = jest.fn();
        const onError = jest.fn();

        const exec = new WorkerPoolExecutor(1);
        return exec
          .execute(
            transferFn(async function*(data: number) {
              const asPromise = <T>(resolveVal: T): Promise<T> =>
                new Promise(resolve =>
                  setTimeout(() => resolve(resolveVal), 5)
                );

              await asPromise(null);
              yield asPromise(data * 2);

              await asPromise(null);

              // Yielding a promise from an asynchronous generator makes `iter.next()`
              // await this promise, so a rejected yielded promise acts like an Error thrown
              // directly in the function body
              yield new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Foo Error')), 5)
              );

              return asPromise(data * 4);
            }),
            4
          )
          .element(onElement, onError)
          .catch(err => {
            expect(err).toBeInstanceOf(WorkerError);
            expect(onError).not.toHaveBeenCalled();
            expect(onElement).toHaveBeenCalledWith(8, 0);
          });
      });
    });

    describe('abort', () => {
      it('should reject the promise with ABORTED when aborting immediately', () => {
        expect.hasAssertions();
        const onThen = jest.fn();
        const exec = new WorkerPoolExecutor(1);
        return exec
          .execute(
            transferFn(function(data: number) {
              return data * 2;
            }),
            4
          )
          .then(onThen)
          .catch(value => {
            expect(onThen).not.toHaveBeenCalled();
            expect(value).toBe(ABORTED);
          })
          .abort();
      });
    });
  });

  describe('map', () => {
    describe('sync function', () => {
      it('should execute a transferred function and resolve with the results', async () => {
        const exec = new WorkerPoolExecutor(2);
        const onElement = jest.fn();
        const onError = jest.fn();

        const result = await exec
          .map(
            transferFn(function(data: number) {
              return data * 2;
            }),
            [0, 1, 2]
          )
          .element(onElement, onError);

        expect(result).toEqual([0, 2, 4]);
        expect(onElement).toHaveBeenCalledTimes(3);
        expect(onElement).toHaveBeenCalledWith(0, 0);
        expect(onElement).toHaveBeenCalledWith(2, 1);
        expect(onElement).toHaveBeenCalledWith(4, 2);
        expect(onError).not.toHaveBeenCalled();
      });

      it('should reject the promise when one element throws and error and call .element appropriately', async () => {
        expect.hasAssertions();

        const exec = new WorkerPoolExecutor(2);
        const onElement = jest.fn();
        const onError = jest.fn();

        return exec
          .map(
            transferFn(function(data: number) {
              if (data === 1) {
                throw new Error('GenericError');
              }

              return data * 2;
            }),
            [0, 1, 2]
          )
          .element(onElement, onError)
          .catch(err => {
            expect(err).toBeInstanceOf(WorkerError);
            expect(err.kind).toBe(ErrorKind.execution);
            expect(err.index).toBe(1);
            expect(err.message).toBe('GenericError');
            expect(err.stack).toEqual(expect.any(String));

            // onElement and onError should be called with *all* elements, before the catch callback runs
            expect(onElement).toHaveBeenCalledTimes(2);
            expect(onElement).toHaveBeenCalledWith(0, 0);
            expect(onElement).toHaveBeenCalledWith(4, 2);

            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(expect.any(WorkerError), 1);
          });
      });
    });

    describe('context', () => {
      it('should provide a context for the task function', async () => {
        const exec = new WorkerPoolExecutor(2);
        const context = { factor: 5 };

        const result = await exec.provideContext(context).map(
          transferFn(function(data: number, context) {
            return data * context.factor;
          }),
          [0, 1, 2]
        );

        expect(result).toEqual([0, 5, 10]);
      });
    });

    describe('async function', () => {
      it('should return the results of the asynchronous executions', async () => {
        const exec = new WorkerPoolExecutor(2);
        const onElement = jest.fn();
        const onError = jest.fn();

        const result = await exec
          .map(
            transferFn(async function(data: number) {
              const result = await new Promise(r =>
                setTimeout(() => r(data * 2), 5)
              );
              return result;
            }),
            [0, 1, 2]
          )
          .element(onElement, onError);

        expect(result).toEqual([0, 2, 4]);
        expect(onElement).toHaveBeenCalledTimes(3);
        expect(onElement).toHaveBeenCalledWith(0, 0);
        expect(onElement).toHaveBeenCalledWith(2, 1);
        expect(onElement).toHaveBeenCalledWith(4, 2);
        expect(onError).not.toHaveBeenCalled();
      });

      it('should reject a single promise when an asynchronous function rejects', async () => {
        expect.hasAssertions();

        const exec = new WorkerPoolExecutor(2);
        const onElement = jest.fn();
        const onError = jest.fn();

        return exec
          .map(
            transferFn(async function(data: number) {
              if (data === 1) {
                return new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('GenericError')), 5)
                );
              }

              return new Promise(r => setTimeout(() => r(data * 2), 5));
            }),
            [0, 1, 2]
          )
          .element(onElement, onError)
          .catch(err => {
            expect(err).toBeInstanceOf(WorkerError);
            expect(err.kind).toBe(ErrorKind.execution);
            expect(err.index).toBe(1);
            expect(err.message).toBe('GenericError');
            expect(err.stack).toEqual(expect.any(String));

            // onElement and onError should be called with *all* elements, before the catch callback runs
            expect(onElement).toHaveBeenCalledTimes(2);
            expect(onElement).toHaveBeenCalledWith(0, 0);
            expect(onElement).toHaveBeenCalledWith(4, 2);

            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(expect.any(WorkerError), 1);
          });
      });
    });

    describe('generator functions', () => {
      it('should resolve with the return values of the generators and ignore intermediate results', async () => {
        const exec = new WorkerPoolExecutor(2);
        const onElement = jest.fn();
        const onError = jest.fn();

        const result = await exec
          .map(
            transferFn(function*(data: number) {
              yield data * 1;
              yield data * 2;
              return data * 3;
            }),
            [1, 2]
          )
          .element(onElement, onError);

        expect(result).toEqual([3, 6]);
        expect(onError).not.toHaveBeenCalled();
        expect(onElement).toHaveBeenCalledTimes(2);
        expect(onElement).toHaveBeenCalledWith(3, 0);
        expect(onElement).toHaveBeenCalledWith(6, 1);
      });

      it('should resolve with the resolve values of returned promises and ignore intermediate results', async () => {
        const exec = new WorkerPoolExecutor(2);
        const onElement = jest.fn();
        const onError = jest.fn();

        const result = await exec
          .map(
            transferFn(function*(data: number) {
              yield new Promise(resolve =>
                setTimeout(() => resolve(data * 2), 5)
              );
              yield new Promise((_, reject) =>
                setTimeout(() => reject(new Error('GenericError')), 5)
              );
              return new Promise(resolve =>
                setTimeout(() => resolve(data * 3), 5)
              );
            }),
            [1, 2]
          )
          .element(onElement, onError);

        expect(result).toEqual([3, 6]);
        expect(onError).not.toHaveBeenCalled();
        expect(onElement).toHaveBeenCalledTimes(2);
        expect(onElement).toHaveBeenCalledWith(3, 0);
        expect(onElement).toHaveBeenCalledWith(6, 1);
      });
    });

    describe('async generator functions', () => {
      it('should resolve with the return values of the generators and ignore intermediate results', async () => {
        const exec = new WorkerPoolExecutor(2);
        const onElement = jest.fn();
        const onError = jest.fn();

        const result = await exec
          .map(
            transferFn(async function*(data: number) {
              const wait = () => new Promise(r => setTimeout(r, 5));
              await wait();
              yield data * 1;
              await wait();
              yield data * 2;
              await wait();
              return data * 3;
            }),
            [1, 2]
          )
          .element(onElement, onError);

        expect(result).toEqual([3, 6]);
        expect(onError).not.toHaveBeenCalled();
        expect(onElement).toHaveBeenCalledTimes(2);
        expect(onElement).toHaveBeenCalledWith(3, 0);
        expect(onElement).toHaveBeenCalledWith(6, 1);
      });

      it('should reject an element when an intermediately yielded Promise rejects', async () => {
        const exec = new WorkerPoolExecutor(2);
        const onElement = jest.fn();
        const onError = jest.fn();

        return exec
          .map(
            transferFn(async function*(data: number) {
              const wait = () => new Promise(r => setTimeout(r, 5));

              await wait();
              yield new Promise(resolve =>
                setTimeout(() => resolve(data * 2), 5)
              );
              await wait();
              yield new Promise((_, reject) =>
                setTimeout(() => reject(new Error('GenericError')), 5)
              );
              await wait();
              return new Promise(resolve =>
                setTimeout(() => resolve(data * 3), 5)
              );
            }),
            [1, 2]
          )
          .element(onElement, onError)
          .catch(err => {
            expect(err).toBeInstanceOf(WorkerError);
            expect(err.message).toBe('GenericError');
            // We cannot be sure which worker responds first
            expect(err.index).toEqual(expect.any(Number));
            expect(err.kind).toBe(ErrorKind.execution);

            expect(onElement).not.toHaveBeenCalled();
            expect(onError).toHaveBeenCalledTimes(2);
          });
      });
    });
  });
});
