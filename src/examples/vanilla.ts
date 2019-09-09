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

function prepare(): [HTMLCanvasElement, SharedArrayBuffer] {
  const canvas = document.createElement('canvas');
  canvas.width = context.width;
  canvas.height = context.height;
  document.body.appendChild(canvas);
  const bytes = context.width * context.height * 4;
  const buff = new SharedArrayBuffer(bytes);

  return [canvas, buff];
}

function printImageData(canvas: HTMLCanvasElement, buffer: SharedArrayBuffer) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(context.width, context.height);
  const buffArr = new Uint8ClampedArray(buffer);
  imageData.data.set(buffArr, 0);
  ctx.putImageData(imageData, 0, 0);
}

function createSlices(n: number, buffer: SharedArrayBuffer): Array<Data> {
  const sliceSize = context.height / n;
  const slices: Array<Data> = [];

  for (let i = 0; i < n; ++i) {
    slices.push({
      fromRow: i * sliceSize,
      toRow: (i + 1) * sliceSize,
      buffer
    });
  }

  return slices;
}

export async function mandelbrotVanillaPool() {
  const poolSize = 4;
  const workers: Array<Worker> = [];
  for (let i = 0; i < poolSize; ++i) {
    workers.push(new Worker('/vanillaWorker.js'));
  }

  const [canvas, buffer] = prepare();

  async function recreate() {
    return new Promise(resolve => {
      const slices = createSlices(poolSize, buffer);
      let numFinished = 0;

      const handleMessage = (evt: MessageEvent) => {
        if (evt.data.done) {
          numFinished++;

          if (numFinished >= poolSize) {
            workers.forEach(w =>
              w.removeEventListener('message', handleMessage)
            );
            resolve(buffer);
          }
        }
      };

      for (let i = 0; i < workers.length; ++i) {
        const worker = workers[i];
        worker.addEventListener('message', handleMessage);
        const msg = { context, slice: slices[i] };
        worker.postMessage(msg);
      }
    }).then(() => printImageData(canvas, buffer));
  }

  while (true) {
    context.magnificationFactor++;
    await recreate();
  }
}
