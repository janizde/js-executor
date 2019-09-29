/**
 * This module will be loaded into the Worker based on the regular
 * Worker Threads API
 */
import { findShortestPath, Point, Grid } from './astar';
import { parentPort } from 'worker_threads';

let grid: Grid = null;

parentPort.on('message', message => {
  switch (message.cmd) {
    case 'grid':
      grid = message.grid;
      break;

    case 'path':
      const path = aStarFindPath(message, grid);
      parentPort.postMessage({
        cmd: 'path',
        id: message.id,
        path
      });
      break;
  }
});

function aStarFindPath(
  { start, end }: { start: Point; end: Point },
  grid: Grid
) {
  const path = findShortestPath(grid, start, end);

  return {
    path: path ? path.map(p => ({ x: p.x, y: p.y })) : null
  };
}
