export interface Node {
  id: number;
  x: number;
  y: number;
  neighbors?: Array<number>;
  isWall: boolean;
}

export interface Grid {
  cols: number;
  rows: number;
  nodes: Array<Node>;
}

export interface Point {
  x: number;
  y: number;
}

export function findNonWallPoint(grid: Grid): Point {
  const p: Point = {
    x: Math.floor(Math.random() * grid.cols),
    y: Math.floor(Math.random() * grid.rows)
  };

  const node = grid.nodes[p.y * grid.cols + p.x];
  return node.isWall ? findNonWallPoint(grid) : p;
}

/**
 * Finds the shortest path between `startPoint` and `endPoint` in `grid`
 * by applying the A* algorithm. When a path is found, an array of nodes,
 * representing this path are returned. When no path is found, `null` is returned.
 *
 * @param     grid          The grid to find the path in
 * @param     startPoint    Start point of the path
 * @param     endPoint      End point of the path
 */
export function findShortestPath(
  grid: Grid,
  startPoint: Point,
  endPoint: Point
): Array<Node> | null {
  const openSet = new Set<Node>();
  const closedSet = new Set<Node>();

  /**
   * In the original implementation, the node objects are mutated by
   * setting the properties `f`, `g` and `parent`. To keep the graph
   * structure immutable, these values are stored in a separate map
   * and the nodes can be reused over time.
   */
  const f = new Map<Node, number>();
  const g = new Map<Node, number>();
  const parent = new Map<Node, Node>();

  openSet.add(grid.nodes[startPoint.y * grid.cols + startPoint.x]);
  const end = grid.nodes[endPoint.y * grid.cols + endPoint.y];

  function dist(a: Node, b: Node) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  while (openSet.size > 0) {
    let current: Node = null;
    openSet.forEach(open => {
      if (current === null || f.get(open) < f.get(current)) {
        current = open;
      }
    });

    if (current === end) {
      const path: Array<Node> = [];
      let tmp = current;
      while (tmp) {
        path.push(tmp);
        tmp = parent.get(tmp);
      }

      return path;
    }

    openSet.delete(current);
    closedSet.add(current);

    const neighbors = current.neighbors.map(id => grid.nodes[id]);
    for (let i = 0; i < neighbors.length; ++i) {
      const n = neighbors[i];

      if (closedSet.has(n)) {
        continue;
      }

      const tempG = g.get(current) + dist(current, n);
      const newPath = !openSet.has(n) || tempG < g.get(n);

      openSet.add(n);

      if (newPath) {
        g.set(n, tempG);
        f.set(n, g.get(n) + dist(n, end));
        parent.set(n, current);
      }
    }
  }

  return null;
}
