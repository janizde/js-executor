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

function addIfNoWall(target: Node, source: Node) {
  if (!source.isWall) {
    target.neighbors.push(source.id);
  }
}

export function createGrid(cols: number, rows: number): Grid {
  const nodes: Array<Node> = new Array(cols * rows);

  for (let x = 0; x < cols; ++x) {
    for (let y = 0; y < rows; ++y) {
      const idx = y * cols + x;
      nodes[idx] = {
        id: idx,
        x,
        y,
        isWall: Math.random() < 0.4,
        neighbors: []
      };
    }
  }

  return {
    nodes,
    rows,
    cols
  };
}

export function enhanceWithNeighbors(grid: Grid): Grid {
  const { nodes, cols, rows } = grid;
  const idx = (x: number, y: number) => y * cols + x;

  for (let x = 0; x < cols; ++x) {
    for (let y = 0; y < rows; ++y) {
      const node = nodes[y * cols + x];
      
      if (node.isWall) {
        continue;
      }

      if (x < cols - 1) {
        addIfNoWall(node, nodes[idx(x + 1, y)]);
      }

      if (x > 0) {
        addIfNoWall(node, nodes[idx(x - 1, y)]);
      }

      if (y < rows - 1) {
        addIfNoWall(node, nodes[idx(x, y + 1)]);
      }

      if (y > 0) {
        addIfNoWall(node, nodes[idx(x, y - 1)]);
      }

      if (x > 0 && y > 0) {
        addIfNoWall(node, nodes[idx(x - 1, y - 1)]);
      }

      if (x < cols - 1 && y > 0) {
        addIfNoWall(node, nodes[idx(x + 1, y - 1)]);
      }

      if (x > 0 && y < rows - 1) {
        addIfNoWall(node, nodes[idx(x - 1, y + 1)]);
      }

      if (x < cols - 1 && y < rows - 1) {
        addIfNoWall(node, nodes[idx(x + 1, y + 1)]);
      }
    }
  }

  return grid;
}
