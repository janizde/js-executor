import { mandelbrot } from './mandelbrot';

interface Message {
  context: {
    width: number;
    height: number;
    panX: number;
    panY: number;
    magnificationFactor: number;
  };
  slice: {
    fromRow: number;
    toRow: number;
    buffer: SharedArrayBuffer;
  };
}

onmessage = messageEvent => {
  const message: Message = messageEvent.data;
  const { context, slice } = message;
  mandelbrot(slice, context);
  (self.postMessage as any)({ done: true });
};
