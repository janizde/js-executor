import { Grid, Node } from './create';

interface NodeState {
  f: number;
  g: number;
  parent: Node;
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

const times: Array<bigint> = [];

process.stdin.on('data', data => {
  if (data.toString() == 's\n') {
    times.sort();
    const avg = times.reduce((a, b) => a + b, 0n) / BigInt(times.length || 1);
    const median = times[Math.floor(times.length / 2)];
    process.stdout.write(
      `Avg comp time: ${avg / 1_000_000n}ms; Median time: ${median /
        1_000_000n}ms\n`
    );
  }
});

export function findShortestPath(
  grid: Grid,
  startPoint: Point,
  endPoint: Point
): Array<Node> | null {
  const before = process.hrtime.bigint();
  const openSet = new Set<Node>();
  const closedSet = new Set<Node>();
  const globalPath: Array<Node> = [];

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

      times.push(process.hrtime.bigint() - before);
      return path;
    }

    openSet.delete(current);
    closedSet.add(current);
    globalPath.push(current);

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
