import { createGrid, enhanceWithNeighbors } from './create';
import { findNonWallPoint, findShortestPath, Point } from './astar';

import * as fs from 'fs';
import * as path from 'path';

// Size of the grid
const size = 400;

const grid = enhanceWithNeighbors(createGrid(size, size));

const set: Array<{ start: Point; end: Point }> = [];

// Try to find endpoint pairs for which there is a path and the
// magnitude of the difference between the two is at least half
// of the grid's size
while (set.length < 250) {
  const start = findNonWallPoint(grid);
  const end = findNonWallPoint(grid);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const mag = Math.sqrt(dx * dx + dy * dy);

  if (mag < size / 2) {
    continue;
  }

  const path = findShortestPath(grid, start, end);

  if (path) {
    set.push({ start, end });
    process.stdout.write('#');
  }
}

const data = {
  grid: grid,
  endpointSets: set
};

const content = JSON.stringify(data, null, 2);

// Write to `sample-data.json`
fs.writeFileSync(
  path.join(__dirname, '..', '..', 'sample-data.json'),
  content,
  {
    encoding: 'utf8'
  }
);

process.stdout.write('\n');
