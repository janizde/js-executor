import { join } from 'path';
import * as fs from 'fs';
import WorkerPoolExecutor from './worker-threads/worker-pool-executor';
import { refFn } from './worker-threads/fn';

const exec = new WorkerPoolExecutor(10);
async function myFunc(data: Record<string, number>) {
  return new Promise<Record<string, number>>(resolve => {
    setTimeout(() => {
      const multiplied = Object.keys(data).reduce(
        (accum, key) => ({
          ...accum,
          [key]: data[key] * 10
        }),
        {} as Record<string, number>
      );
      resolve(multiplied);
    }, 1000);
  });
}

function testMap() {
  const ctx = {
    factor: 10000
  };

  interface ImageDescriptor {
    id: number;
    width: number;
    height?: number;
  }

  try {
    fs.mkdirSync(join(__dirname, 'assets'));
  } catch (e) {
    // Silent
  }

  const randomValues: Array<ImageDescriptor> = [];
  for (let i = 0; i < 10; ++i) {
    randomValues.push({
      id: i,
      width: Math.floor(Math.random() * 500),
      height: Math.random() < 0.5 ? Math.floor(Math.random() * 500) : undefined
    });
  }

  const before = process.hrtime();
  exec
    .importFunction(join(__dirname, 'testFunc.js'), ['fetchImage'])
    .provideContext(ctx)
    .map(refFn('fetchImage'), randomValues)
    .element((result, index) => console.log('single results', index, result))
    .then(results => console.log('all results', results.map(r => r)))
    .finally(() => {
      console.log(`total time: ${process.hrtime(before).toString()}s`);
      process.exit(0);
    });
}

testMap();
