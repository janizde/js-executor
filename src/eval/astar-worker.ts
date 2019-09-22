import { Grid } from './../examples/astar/create';
import { Point } from './../examples/astar/astar';

import * as http from 'http';
import { Worker } from 'worker_threads';
import * as path from 'path';
import WorkerPoolExecutor from './../worker-threads/worker-pool-executor';
import { refFn } from './../worker-threads/fn';

const sampleData = require('./../../sample-data.json');
const grid = sampleData.grid as Grid;
const samples = sampleData.endpointSets as Array<{
  start: Point;
  end: Point;
}>;

const executor = new WorkerPoolExecutor(4);

(executor as any).pool.workers.forEach((worker: Worker) => {
  process.stdin.pipe(worker.stdin);
  worker.stdout.pipe(process.stdout);
});

const withGrid = executor
  .importFunction(path.join(__dirname, 'astar-worker-module'), [
    'aStarFindPath'
  ])
  .provideContext(grid);

let i = 0;

// Workers can share any TCP connection
// In this case it is an HTTP server
http
  .createServer((req, res) => {
    const sample = samples[i % samples.length];
    ++i;

    withGrid
      .execute(refFn('aStarFindPath'), sample)
      .then((resData: { path: Array<Point> }) => {
        res.writeHead(200, {
          'Content-Type': 'application/json'
        });

        res.end(JSON.stringify(resData, null, 2));
      })
      .catch(e => console.error(e));
  })
  .listen(8000);
