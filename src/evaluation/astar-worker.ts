/**
 * In this server implementation a pool of four Workers is created
 * based on the standard `worker_threads` API.
 */
import { Grid, Point } from './astar';
import { Worker } from 'worker_threads';

import * as http from 'http';
import * as path from 'path';

const sampleData = require('./../../sample-data.json');
const grid = sampleData.grid as Grid;
const samples = sampleData.endpointSets as Array<{
  start: Point;
  end: Point;
}>;

const workers: Array<Worker> = [];
for (let i = 0; i < 4; ++i) {
  const worker = new Worker(path.join(__dirname, 'astar-worker-worker.js'));
  worker.postMessage({ cmd: 'grid', grid });
  workers.push(worker);
}

let i = 0;

// Workers can share any TCP connection
// In this case it is an HTTP server
http
  .createServer((req, res) => {
    const id = i;
    const sample = samples[id % samples.length];
    const worker = workers[id % 4];
    ++i;

    const handler = (message: any) => {
      if (message.cmd === 'path' && message.id === id) {
        worker.off('message', handler);
        const resData = { path: message.path };
        res.writeHead(200, {
          'Content-Type': 'application/json'
        });

        res.end(JSON.stringify(resData, null, 2));
      }
    };

    worker.on('message', handler);
    worker.postMessage({
      cmd: 'path',
      id,
      start: sample.start,
      end: sample.end
    });
  })
  .listen(8000);
