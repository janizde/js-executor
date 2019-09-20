import WorkerPoolExecutor from './../web-workers/worker-pool-executor';
import IdlePeriodExecutor from './../idle-period/idle-period-executor';
import { transferFn } from '../web-workers/fn';
import { ABORTED } from '../common/executor-promise';

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
}

export function mandelbrot(
  { fromRow, toRow }: Data,
  { width, magnificationFactor, panX, panY }: typeof context
) {
  function HSLToRGB(h: number, s: number, l: number): [number, number, number] {
    // Must be fractions of 1
    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = l - c / 2,
      r = 0,
      g = 0,
      b = 0;

    if (0 <= h && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (60 <= h && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (120 <= h && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (180 <= h && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (240 <= h && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (300 <= h && h < 360) {
      r = c;
      g = 0;
      b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return [r, g, b];
  }

  const numPixels = width * (toRow - fromRow);
  const buffer = new ArrayBuffer(numPixels * 4);
  const arr = new Uint8Array(buffer);
  const maxIterations = 20;
  const numSamples = 8;

  function getNOf(x: number, y: number) {
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

      if (realComp * realComp + imagComp * imagComp > 4) {
        break;
      }

      ++n;
    }

    return n;
  }

  for (let y = fromRow; y < toRow; ++y) {
    for (let x = 0; x < width; ++x) {
      let avgN = 0;
      for (let i = 0; i < numSamples; ++i) {
        const n = getNOf(
          x + i / (numSamples - numSamples / 2),
          y + i / (numSamples - numSamples / 2)
        );
        avgN += n / numSamples;
      }

      const hue = (avgN * 100) / Math.sqrt(maxIterations);
      const [r, g, b] =
        avgN < maxIterations ? HSLToRGB(hue, 100, 50) : [0, 0, 0];

      const startOffset = (y * width + x) * 4;
      arr[startOffset] = r;
      arr[startOffset + 1] = g;
      arr[startOffset + 2] = b;
      arr[startOffset + 3] = 0xff;
    }
  }

  return buffer;
}

export async function mandelbrotSync() {
  const canvas = createCanvas();

  function recreate() {
    const result = mandelbrot({ fromRow: 0, toRow: context.height }, context);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(context.width, context.height);
    imageData.data.set(new Uint8Array(result), 0);
    ctx.putImageData(imageData, 0, 0);
  }

  while (true) {
    context.magnificationFactor++;
    await new Promise(res => setTimeout(res, 16.5));
    recreate();
  }
}

export async function mandelbrotIdleCallback() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  const slices = createSlices(8);
  const executor = new IdlePeriodExecutor(0, 0);

  async function recreate() {
    const results = await executor
      .provideContext(context)
      .map(mandelbrot, slices);

    const imageData = ctx.createImageData(context.width, context.height);
    results.reduce((offset, buffer) => {
      const array = new Uint8Array(buffer);
      imageData.data.set(array, offset);
      return offset + array.length;
    }, 0);

    ctx.putImageData(imageData, 0, 0);
  }

  while (true) {
    context.magnificationFactor++;
    await recreate();
  }
}

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = context.width;
  canvas.height = context.height;
  document.body.appendChild(canvas);
  const bytes = context.width * context.height * 4;
  return canvas;
}

function printImageData(canvas: HTMLCanvasElement, buffer: SharedArrayBuffer) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(context.width, context.height);
  const buffArr = new Uint8ClampedArray(buffer);
  imageData.data.set(buffArr, 0);
  ctx.putImageData(imageData, 0, 0);
}

function createSlices(n: number): Array<Data> {
  const sliceSize = context.height / n;
  const slices: Array<Data> = [];

  for (let i = 0; i < n; ++i) {
    slices.push({
      fromRow: i * sliceSize,
      toRow: (i + 1) * sliceSize
    });
  }

  return slices;
}
