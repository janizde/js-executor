import { Grid } from './../examples/astar/create';
import { findShortestPath, Point } from './../examples/astar/astar';

import * as http from 'http';

const sampleData = require('./../../sample-data.json');
const grid = sampleData.grid as Grid;
const samples = sampleData.endpointSets as Array<{
  start: Point;
  end: Point;
}>;

let i = 0;

// Workers can share any TCP connection
// In this case it is an HTTP server
http
  .createServer((req, res) => {
    const { start, end } = samples[i % samples.length];
    ++i;
    const path = findShortestPath(grid, start, end);

    const resContent = {
      path: path ? path.map(p => ({ x: p.x, y: p.y })) : null
    };

    res.writeHead(200, {
      'Content-Type': 'application/json'
    });

    res.end(JSON.stringify(resContent, null, 2));
  })
  .listen(8000);

console.log(`Worker ${process.pid} started`);
