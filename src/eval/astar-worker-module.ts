import { findShortestPath, Point } from './../examples/astar/astar';
import { Grid } from './../examples/astar/create';

export function aStarFindPath(
  { start, end }: { start: Point; end: Point },
  grid: Grid
) {
  const path = findShortestPath(grid, start, end);

  return {
    path: path ? path.map(p => ({ x: p.x, y: p.y })) : null
  };
}
