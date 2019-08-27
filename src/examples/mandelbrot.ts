import WorkerPoolExecutor from './../web-workers/worker-pool-executor';
import { transferFn } from '../web-workers/fn';
import ExecutorPromise, { ABORTED } from '../common/executor-promise';

const context = {
  width: 500,
  height: 500,
  panX: 1,
  panY: 1,
  magnificationFactor: 1
};

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
  const maxIterations = 100;

  for (let y = fromRow; y < toRow; ++y) {
    for (let x = 0; x < width; ++x) {
      let realComp = x / magnificationFactor - panX;
      let imagComp = y / magnificationFactor - panY;

      const realCompCopy = realComp;
      const imagCompCopy = imagComp;

      let n = 0;

      while (n < maxIterations) {
        let tempRealComp = realComp * realComp - imagComp * imagComp;
        let tempImagComp = 2 * realComp * imagComp;
        realComp = tempRealComp + realCompCopy;
        imagComp = tempImagComp + imagCompCopy;

        if (realComp * realComp + imagComp * imagComp > 16) {
          break;
        }

        ++n;
      }

      const channelVal = (n * 255) / maxIterations;

      const startOffset = (y * width + x) * 4;
      arr[startOffset] = channelVal;
      arr[startOffset + 1] = channelVal;
      arr[startOffset + 2] = channelVal;
      arr[startOffset + 3] = 0xff;
    }
  }
}

export default async function testMandelbrot() {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const bytes = context.width * context.height * 4;
  const buff = new SharedArrayBuffer(bytes);
  const executor = new WorkerPoolExecutor(4);

  let aborted = false;

  window.addEventListener('keyup', () => {
    aborted = true;
  });

  async function recreate() {
    const numSlices = 4;
    const sliceSize = context.height / numSlices;
    const slices: Array<Data> = [];

    for (let i = 0; i < numSlices; ++i) {
      slices.push({
        fromRow: i * sliceSize,
        toRow: (i + 1) * sliceSize,
        buffer: buff
      });
    }

    return executor
      .provideContext(context)
      .map(transferFn(mandelbrot), slices)
      .then(() => {
        canvas.width = context.width;
        canvas.height = context.height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(context.width, context.height);
        const buffArr = new Uint8ClampedArray(buff);

        imageData.data.set(buffArr, 0);
        ctx.putImageData(imageData, 0, 0);
      })
      .catch(err => {
        if (err !== ABORTED) {
          console.error(err);
        }
      });
  }

  while (!aborted) {
    context.magnificationFactor++;
    await new Promise(res => setTimeout(res, 10));
    await recreate();
  }
}
