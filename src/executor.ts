import { join } from "path";
import * as fs from "fs";
import WorkerPoolExecutor from "./worker-pool-executor";
import ExecutorPromise from './executor-promise';
import { loadFn } from "./fn";

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
    fs.mkdirSync(join(__dirname, "assets"));
  } catch (e) {
    // Silent
  }

  const randomValues: Array<ImageDescriptor> = [];
  for (let i = 0; i < 1000; ++i) {
    randomValues.push({
      id: i,
      width: Math.floor(Math.random() * 500),
      height: Math.random() < 0.5 ? Math.floor(Math.random() * 500) : undefined
    });
  }

  exec
    // .importFunction(join(__dirname, "testFunc.js"))
    .provideContext(ctx)
    .map(loadFn(join(__dirname, "testFunc.js"), "fetchImage"), randomValues)
    .then(results => console.log(results.map(r => r)))
    .finally(() => process.exit(0));
}

function testExecutorPromise() {
  const makePromise = (i: number) => new Promise<number>((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.3) {
        resolve(i * 2 + 1)
      } else {
        reject(new Error(`Element ${i} rejected`));
      }
    }, i * 200);
  });

  new ExecutorPromise<number, Array<number>>(({ resolveAll, resolveElement, rejectElement, rejectAll }) => {
    const promises: Array<Promise<number>> = [];
    for (let i = 0; i < 10; ++i) {
      promises.push(makePromise(i));
    }

    promises.forEach((p, i) => p.then(
      value => resolveElement(value, i),
    err => rejectElement(err as any, i),
      ));

    Promise.all(promises).then(values => resolveAll(values), err => rejectAll(err));
  }, () => console.log('abort'))
    .then(values => console.log('resolve all', values))
    .catch(err => console.log('rejected all', err))
    .element((value, index) => console.log('resolve element', value, index))
    .error((err, index) => console.log('reject element', err.message, index));
}

testExecutorPromise();
