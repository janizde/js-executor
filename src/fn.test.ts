import { transferFn, loadFn, refFn } from './fn';
import { FnExecType, FnDescriptorLoad } from './common';

describe('fn', () => {
  describe('transferFn', () => {
    it('should create the transfer function descriptor', () => {
      const testFn = (data: number, context: { factor: number }) =>
        String(data * context.factor);

      const result = transferFn(testFn);
      const expected = {
        $$exec_type: FnExecType.transfer,
        fn: testFn
      };

      expect(result).toEqual(expected);
    });
  });

  describe('loadFn', () => {
    it('should create the load function descriptor with no name', () => {
      const result = loadFn('/path/to/file.js');
      const expected: FnDescriptorLoad = {
        $$exec_type: FnExecType.load,
        path: '/path/to/file.js',
        name: undefined
      };

      expect(result).toEqual(expected);
    });

    it('should create the load function descriptor with name', () => {
      const result = loadFn('/path/to/file.js', 'testFunction');
      const expected: FnDescriptorLoad = {
        $$exec_type: FnExecType.load,
        path: '/path/to/file.js',
        name: 'testFunction'
      };

      expect(result).toEqual(expected);
    });
  });

  describe('refFn', () => {
    it('should create the ref function descriptor', () => {
      const result = refFn('testFunction');
      const expected = {
        $$exec_type: FnExecType.ref,
        name: 'testFunction'
      };

      expect(result).toEqual(expected);
    });
  });
});
