// Deadlock detector
class DeadlockDetector {
  constructor() {
  }

  // Build graph
  buildWaitForGraph(tasks, resourceLocks) {
    const nodeSet = new Set();
    const edges = [];

    for (const task of tasks) {
      // Filter waiting
      if (!task.resourcesWaiting || task.resourcesWaiting.length === 0) continue;

      nodeSet.add(task.id);

      for (const resource of task.resourcesWaiting) {
        const holderId = resourceLocks.get(resource);

        // Different holder
        if (holderId && holderId !== task.id) {
          nodeSet.add(holderId);
          edges.push({ from: task.id, to: holderId });
        }
      }
    }

    return {
      nodes: Array.from(nodeSet),
      edges,
    };
  }

  // Detect cycle
  detectCycle(graph) {
    const { nodes, edges } = graph;

    if (nodes.length === 0) {
      return { hasCycle: false, cycle: [] };
    }

    // Adj list
    const adj = new Map();
    for (const node of nodes) adj.set(node, []);
    for (const { from, to } of edges) {
      if (adj.has(from)) adj.get(from).push(to);
    }

    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;

    const colour = new Map();
    const parent = new Map();

    for (const n of nodes) {
      colour.set(n, WHITE);
      parent.set(n, null);
    }

    // Reconstruct cycle
    const reconstructCycle = (cycleEnd, cycleStart) => {
      const path = [cycleStart];
      let cur = cycleEnd;
      while (cur !== cycleStart) {
        path.push(cur);
        cur = parent.get(cur);
        // Safety check
        if (path.length > nodes.length + 1) break;
      }
      // Close path
      path.push(cycleStart);
      path.reverse();
      return path;
    };

    // DFS traversal
    for (const startNode of nodes) {
      if (colour.get(startNode) !== WHITE) continue;

      const stack = [{ node: startNode, idx: 0 }];
      colour.set(startNode, GRAY);

      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        const neighbours = adj.get(top.node) || [];

        if (top.idx < neighbours.length) {
          const next = neighbours[top.idx];
          top.idx++;

          if (colour.get(next) === GRAY) {
            // Cycle found
            return {
              hasCycle: true,
              cycle: reconstructCycle(top.node, next),
            };
          }

          if (colour.get(next) === WHITE) {
            colour.set(next, GRAY);
            parent.set(next, top.node);
            stack.push({ node: next, idx: 0 });
          }
        } else {
          // Done node
          colour.set(top.node, BLACK);
          stack.pop();
        }
      }
    }

    return { hasCycle: false, cycle: [] };
  }

  // Find order
  findOptimalReleaseOrder(graph) {
    const { nodes, edges } = graph;

    if (nodes.length === 0) return [];

    // Setup graph
    const adj = new Map();
    const inDegree = new Map();

    for (const n of nodes) {
      adj.set(n, []);
      inDegree.set(n, 0);
    }
    for (const { from, to } of edges) {
      if (adj.has(from)) adj.get(from).push(to);
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
    }

    // Seed queue
    const queue = [];
    for (const [node, deg] of inDegree) {
      if (deg === 0) queue.push(node);
    }

    const order = [];

    while (queue.length > 0) {
      const node = queue.shift();
      order.push(node);

      for (const neighbour of adj.get(node) || []) {
        const newDeg = inDegree.get(neighbour) - 1;
        inDegree.set(neighbour, newDeg);
        if (newDeg === 0) queue.push(neighbour);
      }
    }

    // Reverse order
    return order.reverse();
  }

  // Analyze deadlock
  analyze(tasks, resourceLocks) {
    const graph = this.buildWaitForGraph(tasks, resourceLocks);
    const { hasCycle, cycle } = this.detectCycle(graph);
    const releaseOrder = this.findOptimalReleaseOrder(graph);

    return { graph, hasCycle, cycle, releaseOrder };
  }
}

export { DeadlockDetector };
