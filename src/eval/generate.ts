import { createGrid, enhanceWithNeighbors } from './../examples/astar/create';
import {
  findNonWallPoint,
  findShortestPath,
  Point
} from './../examples/astar/astar';

import * as fs from 'fs';
import * as path from 'path';

const grid = enhanceWithNeighbors(createGrid(50, 50));

const set: Array<{ start: Point; end: Point }> = [];
while (set.length < 250) {
  const start = findNonWallPoint(grid);
  const end = findNonWallPoint(grid);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const mag = Math.sqrt(dx * dx + dy * dy);

  if (mag < 20) {
    continue;
  }

  const path = findShortestPath(grid, start, end);

  if (path) {
    set.push({ start, end });
  }
}

const data = {
  grid: {
    ...grid,
    nodes: grid.nodes.map(n => ({ x: n.x, y: n.y, isWall: n.isWall }))
  },
  endpointSets: set
};

const content = JSON.stringify(data, null, 2);

fs.writeFileSync(path.join(__dirname, 'sample-data.json'), content, {
  encoding: 'utf8'
});
