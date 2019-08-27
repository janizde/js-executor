import { MessagePort } from 'worker_threads';
import * as BridgeType from './bridge-lib';
import { CommandError, CommandKind, ErrorKind, CommandResult } from './typings';

/**
 * Creates a Promise resolving after the next event loop tick,
 * as some assertions rely on Promises being resolved in the microtask queue
 */
const spinLoop = () =>
  new Promise(resolve => {
    setTimeout(resolve, 0);
    jest.runAllTimers();
  });

const createFakePort = () => {
  return ({
    postMessage: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  } as unknown) as MessagePort;
};

describe('bridge-lib', () => {
  // Make sure that in each test a new version of the module
  // is loaded to prevent persistent state across tests
  let Bridge: typeof BridgeType = null as any;
  beforeEach(() => {
    jest.resetModules();
    Bridge = require('./bridge-lib');
  });

  afterEach(() => {
    Bridge = null;
  });

  describe('ContextRegister', () => {
    it('should register a context value which can be retrieved', () => {
      const register = new Bridge.ContextRegister();
      const context = { foo: 'bar' };
      register.registerContextValue(1, context);
      const result = register.getContextValue(1);
      expect(result).toBe(context);
    });

    it('should throw an error when registering a context which already exists', () => {
      const register = new Bridge.ContextRegister();
      const context = { foo: 'bar' };
      register.registerContextValue(1, context); // Ok
      register.registerContextValue(2, context); // Ok

      expect(() => register.registerContextValue(1, context)).toThrow(
        Bridge.InternalError
      );
    });

    it('should throw an error when accessing a context which is not registered', () => {
      const register = new Bridge.ContextRegister();
      const context = { foo: 'bar' };
      register.registerContextValue(1, context);

      expect(() => register.getContextValue(2)).toThrow(Bridge.InternalError);
    });
  });

  describe('sendError', () => {
    it('should send an InternalError without stack', async () => {
      const err = new Bridge.InternalError('InternalError');
      const port = createFakePort();
      BridgeType.sendError(err, port, 2);

      const expected: CommandError = {
        cmd: CommandKind.error,
        kind: ErrorKind.internal,
        message: 'InternalError',
        stack: undefined,
        index: 2
      };

      expect(port.postMessage).toHaveBeenCalledWith(expected);
    });

    it('should send an Error with stack', async () => {
      const err = new Error('GenericError');
      const port = createFakePort();
      BridgeType.sendError(err, port, 2);

      const expected: CommandError = {
        cmd: CommandKind.error,
        kind: ErrorKind.execution,
        message: 'GenericError',
        stack: expect.any(String),
        index: 2
      };

      expect(port.postMessage).toHaveBeenCalledWith(expected);
    });
  });

  describe('runTaskFunction', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('should run a synchronous task function with no index and post the result', async () => {
      const port = createFakePort();
      const data = 2;
      const context = { factor: 4 };
      function taskFn(data: number, ctx: typeof context) {
        expect(data).toBe(2);
        expect(ctx).toBe(context);
        return data * context.factor;
      }

      Bridge.runTaskFunction(taskFn, data, context, port);

      await spinLoop();

      const expected: CommandResult = {
        cmd: CommandKind.result,
        value: 8,
        index: undefined
      };

      expect(port.postMessage).toHaveBeenCalledWith(expected, []);
    });

    it('should handle a $$transfer object and transfer the value with the transferList', async () => {
      const port = createFakePort();
      const data = 2;
      const context = { factor: 4 };
      let arr: Uint8Array = null;
      function taskFn(data: number, ctx: typeof context) {
        arr = new Uint8Array(new ArrayBuffer(1));
        arr[0] = data * context.factor;

        return {
          $$transfer: true,
          value: { foo: arr },
          transferList: [arr]
        };
      }

      Bridge.runTaskFunction(taskFn, data, context, port);

      await spinLoop();

      const expected: CommandResult = {
        cmd: CommandKind.result,
        value: { foo: expect.any(Uint8Array) },
        index: undefined
      };

      expect(port.postMessage).toHaveBeenCalledWith(expected, [
        expect.any(Uint8Array)
      ]);
    });

    it('should wait for a promise resolve before sending the result in an asynchronous function', async () => {
      const port = createFakePort();
      const data = 2;
      const context = { factor: 4 };
      function taskFn(data: number, ctx: typeof context) {
        expect(data).toBe(2);
        expect(ctx).toBe(context);

        return new Promise(resolve =>
          setTimeout(() => resolve(data * context.factor), 0)
        );
      }

      await Promise.all([
        Bridge.runTaskFunction(taskFn, data, context, port),
        spinLoop()
      ]);

      const expected: CommandResult = {
        cmd: CommandKind.result,
        value: 8,
        index: undefined
      };

      expect(port.postMessage).toHaveBeenCalledWith(expected, []);
    });

    it('should send the intermediate results of a generator when index is not set', async () => {
      const port = createFakePort();
      const data = 2;
      const context = { factor: 4 };
      function* taskFn(data: number, ctx: typeof context) {
        let sum: number = 0;

        for (let i = 0; i < 3; ++i) {
          const res = data * ctx.factor * i;
          yield res;
          sum += res;
        }

        return sum;
      }

      await Bridge.runTaskFunction(taskFn, data, context, port);

      expect(port.postMessage).toHaveBeenCalledTimes(4);

      expect(port.postMessage).toHaveBeenNthCalledWith(
        1,
        {
          cmd: CommandKind.result,
          value: 0,
          index: 0
        },
        []
      );

      expect(port.postMessage).toHaveBeenNthCalledWith(
        2,
        {
          cmd: CommandKind.result,
          value: 8,
          index: 1
        },
        []
      );

      expect(port.postMessage).toHaveBeenNthCalledWith(
        3,
        {
          cmd: CommandKind.result,
          value: 16,
          index: 2
        },
        []
      );

      expect(port.postMessage).toHaveBeenNthCalledWith(
        4,
        {
          cmd: CommandKind.result,
          value: 24,
          index: undefined
        },
        []
      );
    });

    it('should send the intermediate results of an async generator when index is not set', async () => {
      const port = createFakePort();
      const data = 2;
      const context = { factor: 4 };
      async function* taskFn(data: number, ctx: typeof context) {
        let sum: number = 0;

        for (let i = 0; i < 3; ++i) {
          const res = data * ctx.factor * i;
          await new Promise(resolve => setImmediate(resolve));
          yield res;
          sum += res;
        }

        return sum;
      }

      await Bridge.runTaskFunction(taskFn, data, context, port);

      expect(port.postMessage).toHaveBeenCalledTimes(4);

      expect(port.postMessage).toHaveBeenNthCalledWith(
        1,
        {
          cmd: CommandKind.result,
          value: 0,
          index: 0
        },
        []
      );

      expect(port.postMessage).toHaveBeenNthCalledWith(
        2,
        {
          cmd: CommandKind.result,
          value: 8,
          index: 1
        },
        []
      );

      expect(port.postMessage).toHaveBeenNthCalledWith(
        3,
        {
          cmd: CommandKind.result,
          value: 16,
          index: 2
        },
        []
      );

      expect(port.postMessage).toHaveBeenNthCalledWith(
        4,
        {
          cmd: CommandKind.result,
          value: 24,
          index: undefined
        },
        []
      );
    });

    it('should not send intermediate results when an index is set', async () => {
      const port = createFakePort();
      const data = 2;
      const context = { factor: 4 };
      function* taskFn(data: number, ctx: typeof context) {
        let sum: number = 0;

        for (let i = 0; i < 3; ++i) {
          const res = data * context.factor * i;
          yield res;
          sum += res;
        }

        return sum;
      }

      Bridge.runTaskFunction(taskFn, data, context, port, 2);

      await spinLoop();

      expect(port.postMessage).toHaveBeenCalledTimes(1);

      expect(port.postMessage).toHaveBeenCalledWith(
        {
          cmd: CommandKind.result,
          value: 24,
          index: 2
        },
        []
      );
    });

    it('should send execution errors inside the task function as .error message', async () => {
      const port = createFakePort();
      function* taskFn(): IterableIterator<never> {
        throw new Error('GenericError');
      }

      Bridge.runTaskFunction(taskFn, 2, undefined, port, 2);

      await spinLoop();

      expect(port.postMessage).toHaveBeenCalledTimes(1);

      expect(port.postMessage).toHaveBeenCalledWith({
        cmd: CommandKind.error,
        kind: ErrorKind.execution,
        message: 'GenericError',
        stack: expect.any(String),
        index: 2
      });
    });

    it('should send errors from rejected promises as .error message', async () => {
      const port = createFakePort();
      async function* taskFn() {
        const err = new Error('GenericError');
        return new Promise((_, reject) => setTimeout(() => reject(err), 10));
      }

      await Promise.all([
        Bridge.runTaskFunction(taskFn, 2, undefined, port, 2),
        spinLoop()
      ]);

      expect(port.postMessage).toHaveBeenCalledTimes(1);

      expect(port.postMessage).toHaveBeenCalledWith({
        cmd: CommandKind.error,
        kind: ErrorKind.execution,
        message: 'GenericError',
        stack: expect.any(String),
        index: 2
      });
    });
  });
});
