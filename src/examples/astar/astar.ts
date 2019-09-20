interface Node {
  x: number;
  y: number;
  f: number;
  g: number;
  h: number;
  neighbors: Array<Node>;
  isWall: boolean;
  previous: Node | null;
}

type Grid = Array<Array<Node>>;

const rows = 50;
const cols = 50;

function addIfNoWall(target: Node, source: Node) {
  if (!source.isWall) {
    target.neighbors.push(source);
  }
}

function createGrid() {
  const grid: Grid = new Array(cols);

  for (let x = 0; x < cols; ++x) {
    grid[x] = new Array(rows);
  }

  for (let x = 0; x < cols; ++x) {
    for (let y = 0; y < rows; ++y) {
      grid[x][y] = {
        x,
        y,
        f: 0,
        g: 0,
        h: 0,
        isWall: Math.random() < 0.4,
        neighbors: [],
        previous: null
      };
    }
  }

  grid[0][0].isWall = false;
  grid[cols - 1][rows - 1].isWall = false;

  for (let x = 0; x < cols; ++x) {
    for (let y = 0; y < rows; ++y) {
      const node = grid[x][y];

      if (x < cols - 1) {
        addIfNoWall(node, grid[x + 1][y]);
      }

      if (x > 0) {
        addIfNoWall(node, grid[x - 1][y]);
      }

      if (y < rows - 1) {
        addIfNoWall(node, grid[x][y + 1]);
      }

      if (y > 0) {
        addIfNoWall(node, grid[x][y - 1]);
      }

      if (x > 0 && y > 0) {
        addIfNoWall(node, grid[x - 1][y - 1]);
      }

      if (x < cols - 1 && y > 0) {
        addIfNoWall(node, grid[x + 1][y - 1]);
      }

      if (x > 0 && y < rows - 1) {
        addIfNoWall(node, grid[x - 1][y + 1]);
      }

      if (x < cols - 1 && y < rows - 1) {
        addIfNoWall(node, grid[x + 1][y + 1]);
      }
    }
  }

  return grid;
}

export function testAStar() {
  const grid = createGrid();
  const openSet = new Set<Node>();
  const closedSet = new Set<Node>();
  openSet.add(grid[0][0]);
  const end = grid[cols - 1][rows - 1];

  function dist(a: Node, b: Node) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  while (openSet.size > 0) {
    let current: Node = null;
    openSet.forEach(open => {
      if (current === null || open.f < current.f) {
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

      console.log(path, grid);
      return;
    }

    openSet.delete(current);
    closedSet.add(current);

    const neighbors = current.neighbors;
    for (let i = 0; i < neighbors.length; ++i) {
      const n = neighbors[i];

      if (closedSet.has(n)) {
        continue;
      }

      const tempG = current.g + dist(current, n);
      const newPath = !openSet.has(n) || tempG < n.g;

      if (newPath) {
        n.g = tempG;
      }

      openSet.add(n);

      if (newPath) {
        n.h = dist(n, end);
        n.f = n.g + n.h;
        n.previous = current;
      }
    }
  }

  console.log('no solution');
}
