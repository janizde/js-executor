/**
 * This module is imported into the Workers of a `WorkerPoolExecutor`
 * as an external function. It is completely agnostic concerning where it is
 * used, the interface for the Worker communication is `export`.
 */
import { findShortestPath, Point, Grid } from './astar';

export function aStarFindPath(
  { start, end }: { start: Point; end: Point },
  grid: Grid
) {
  const path = findShortestPath(grid, start, end);

  return {
    path: path ? path.map(p => ({ x: p.x, y: p.y })) : null
  };
}
