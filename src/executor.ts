import { join } from 'path';
import * as fs from 'fs';
import WorkerPoolExecutor from './worker-pool-executor';
import { loadFn, refFn } from './fn';

const exec = new WorkerPoolExecutor(5);
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
      console.log('goo');
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

  exec
    .importFunction(join(__dirname, 'testFunc.js'), ['fetchImage'])
    .provideContext(ctx)
    .map(refFn('fetchImage'), randomValues)
    .then(results => console.log(results.map(r => r)))
    .finally(() => process.exit(0));
}

testMap();
