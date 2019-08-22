import * as fs from 'fs';
import * as path from 'path';
import WorkerPoolExecutor from './../worker-pool-executor';
import { transferFn } from '../fn';
import { PNG } from 'pngjs';

const context = {
  width: 800,
  height: 800,
  panX: 0,
  panY: 0,
  magnificationFactor: 600
};

const bytes = context.width * context.height * 4;
const buff = new SharedArrayBuffer(bytes);

interface Data {
  fromRow: number;
  toRow: number;
  buffer: SharedArrayBuffer;
}

function mandelbrot(
  { fromRow, toRow, buffer }: Data,
  { width, magnificationFactor, panX, panY }: typeof context
) {
  const arr = new Uint8Array(buffer);

  for (let y = fromRow; y < toRow; ++y) {
    for (let x = 0; x < width; ++x) {
      let realComp = x / magnificationFactor - panX;
      let imagComp = y / magnificationFactor - panY;

      for (let i = 0; i < 10; ++i) {
        let tempRealComp = realComp * realComp - imagComp * imagComp + x;
        imagComp = 2 * realComp * imagComp + y;
        realComp = tempRealComp;
      }

      const color: [number, number, number] =
        realComp * imagComp < 5 ? [0, 0, 0] : [0xff, 0xff, 0xff];

      const startOffset = (y * width + x) * 4;
      Atomics.store(arr, startOffset, color[0]);
      Atomics.store(arr, startOffset + 1, color[1]);
      Atomics.store(arr, startOffset + 2, color[2]);
      Atomics.store(arr, startOffset + 3, 0xff);
    }
  }
}

const slices: Array<Data> = [
  {
    fromRow: 0,
    toRow: 200,
    buffer: buff
  },
  {
    fromRow: 200,
    toRow: 400,
    buffer: buff
  },
  {
    fromRow: 400,
    toRow: 600,
    buffer: buff
  },
  {
    fromRow: 600,
    toRow: 800,
    buffer: buff
  }
];

const executor = new WorkerPoolExecutor(4);

executor
  .provideContext(context)
  .map(transferFn(mandelbrot), slices)
  .then(() => {
    return new Promise((resolve, reject) => {
      new OffscreenCanvas(context.width, context.height);
      resolve();
    });
  })
  .catch(err => console.error(err))
  .finally(() => process.exit(0));
