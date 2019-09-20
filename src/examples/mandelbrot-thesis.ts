export function mandelbrot(
  width: number,
  height: number,
  zoom: number
): ArrayBuffer {
  const buffer = new ArrayBuffer(width * height * 4);
  const arr = new Uint8Array(buffer);
  const maxIterations = 50;

  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      let realComp = x / zoom;
      let imagComp = y / zoom;

      const realCompTmp = realComp;
      const imagCompTmp = imagComp;

      let n = 0;

      while (n < maxIterations) {
        let tempRealComp = realComp * realComp - imagComp * imagComp;
        let tempImagComp = 2 * realComp * imagComp;
        realComp = tempRealComp + realCompTmp;
        imagComp = tempImagComp + imagCompTmp;

        if (realComp * realComp + imagComp * imagComp > 16) {
          break;
        }

        ++n;
      }

      const color = Math.min((n * 100) / Math.sqrt(maxIterations), 0xff);
      const [r, g, b] = n < maxIterations ? [color, color, color] : [0, 0, 0];

      const startOffset = (y * width + x) * 4;
      arr[startOffset] = r;
      arr[startOffset + 1] = g;
      arr[startOffset + 2] = b;
      arr[startOffset + 3] = 0xff;
    }
  }

  return buffer;
}

export async function drawMandelbrot() {
  const canvas = document.createElement('canvas');
  let zoom = 500;
  canvas.width = 500;
  canvas.height = 500;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function recreate() {
    const content = mandelbrot(500, 500, zoom);
    const imageData = ctx.createImageData(500, 500);
    imageData.data.set(new Uint8Array(content), 0);
    ctx.putImageData(imageData, 0, 0);
  }

  while (true) {
    await new Promise(res => setTimeout(res, 16.5));
    recreate();
    ++zoom;
  }
}
