interface Node {
  x: number;
  y: number;
  neighbors: Array<Node>;
  isWall: boolean;
  previous: Node | null;
}

type Grid = Array<Node>;

const rows = 50;
const cols = 50;

function addIfNoWall(target: Node, source: Node) {
  if (!source.isWall) {
    target.neighbors.push(source);
  }
}

function createGrid() {
  const grid: Grid = new Array(cols * rows);

  for (let x = 0; x < cols; ++x) {
    for (let y = 0; y < rows; ++y) {
      grid[y * cols + x] = {
        x,
        y,
        isWall: Math.random() < 0.4,
        neighbors: [],
        previous: null
      };
    }
  }

  grid[0].isWall = false;
  grid[grid.length - 1].isWall = false;
  console.log('init grid', grid);

  const idx = (x: number, y: number) => y * cols + x;

  for (let x = 0; x < cols; ++x) {
    for (let y = 0; y < rows; ++y) {
      const node = grid[y * cols + x];

      if (x < cols - 1) {
        addIfNoWall(node, grid[idx(x + 1, y)]);
      }

      if (x > 0) {
        addIfNoWall(node, grid[idx(x - 1, y)]);
      }

      if (y < rows - 1) {
        addIfNoWall(node, grid[idx(x, y + 1)]);
      }

      if (y > 0) {
        addIfNoWall(node, grid[idx(x, y - 1)]);
      }

      if (x > 0 && y > 0) {
        addIfNoWall(node, grid[idx(x - 1, y - 1)]);
      }

      if (x < cols - 1 && y > 0) {
        addIfNoWall(node, grid[idx(x + 1, y - 1)]);
      }

      if (x > 0 && y < rows - 1) {
        addIfNoWall(node, grid[idx(x - 1, y + 1)]);
      }

      if (x < cols - 1 && y < rows - 1) {
        addIfNoWall(node, grid[idx(x + 1, y + 1)]);
      }
    }
  }

  return grid;
}

export function testAStar() {
  const grid = createGrid();
  const openSet = new Set<Node>();
  const closedSet = new Set<Node>();
  const globalPath: Array<Node> = [];

  const f = new Map<Node, number>();
  const g = new Map<Node, number>();

  openSet.add(grid[0]);
  const end = grid[grid.length - 1];

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
      while (tmp !== null) {
        path.push(tmp);
        tmp = tmp.previous;
      }

      console.log(path, globalPath);
      return;
    }

    openSet.delete(current);
    closedSet.add(current);
    globalPath.push(current);

    const neighbors = current.neighbors;
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
        n.previous = current;
      }
    }
  }

  console.log('no solution');
}
