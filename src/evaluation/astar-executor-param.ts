/**
 * This server script is an alternative implementation to `astar-executor`,
 * which does not load the sample endpoints from `sample-data.json` but parses
 * the (x, y) coordinate of the endpoints from the query string, e.g.,
 *
 * `http://localhost:8000?startX=10&startY=10&endX=190&endY=190`
 */
import { Grid, Point } from './astar';

import * as http from 'http';
import * as path from 'path';
import * as url from 'url';

import WorkerPoolExecutor from './../worker-threads/worker-pool-executor';
import { refFn } from './../worker-threads/fn';

const sampleData = require('./../../sample-data.json');
const grid = sampleData.grid as Grid;

const executor = new WorkerPoolExecutor(4);
const withGrid = executor
  .importFunction(path.join(__dirname, 'astar-executor-module'), [
    'aStarFindPath'
  ])
  .provideContext(grid);

http
  .createServer((req, res) => {
    const query = url.parse(req.url, true).query;
    const endpoints = {
      start: {
        x: parseInt(query.startX as string, 10),
        y: parseInt(query.startY as string, 10)
      },
      end: {
        x: parseInt(query.endX as string, 10),
        y: parseInt(query.endY as string, 10)
      }
    };

    withGrid
      .execute(refFn('aStarFindPath'), endpoints)
      .then((resData: { path: Array<Point> }) => {
        res.writeHead(200, {
          'Content-Type': 'application/json'
        });

        res.end(JSON.stringify(resData, null, 2));
      })
      .catch(e => console.error(e));
  })
  .listen(8000);
