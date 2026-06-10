/**
 * @fileoverview Deadlock detection engine for the CoreSched simulator.
 *
 * Builds a **wait-for graph** from current resource allocations, detects cycles
 * using iterative DFS with colouring, and computes a topological release order
 * (reverse topological sort) when the graph is acyclic.
 *
 * @module DeadlockDetector
 */

/**
 * @typedef {Object} WaitForGraph
 * @property {string[]}          nodes - Unique task IDs that participate in the graph.
 * @property {Array<{from: string, to: string}>} edges - Directed edges: "from" waits for "to".
 */

/**
 * @typedef {Object} CycleResult
 * @property {boolean}  hasCycle - Whether at least one cycle was found.
 * @property {string[]} cycle    - Task IDs forming the cycle (empty if acyclic).
 */

/**
 * @typedef {Object} DeadlockReport
 * @property {WaitForGraph} graph        - The constructed wait-for graph.
 * @property {boolean}      hasCycle     - Whether a deadlock (cycle) exists.
 * @property {string[]}     cycle        - Task IDs forming the deadlock cycle.
 * @property {string[]}     releaseOrder - Recommended safe release order (topological).
 */

/**
 * Analyses resource allocation state and detects deadlocks.
 *
 * @example
 *   const detector = new DeadlockDetector();
 *   const report   = detector.analyze(tasks, resourceLocks);
 *   if (report.hasCycle) {
 *     console.warn('Deadlock among:', report.cycle);
 *   }
 */
class DeadlockDetector {
  constructor() {
    // Stateless – all state flows through method arguments.
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Build a wait-for graph from the current resource allocation state.
   *
   * An edge `A → B` means task A is **waiting** for a resource that task B currently
   * **holds**.
   *
   * @param {Object[]} tasks - Array of task objects. Each must have:
   *   - `id` {string}
   *   - `resourcesHeld` {string[]}    – resources currently held
   *   - `resourcesWaiting` {string[]} – resources this task is waiting for
   * @param {Map<string, string>} resourceLocks - Map from resource name → task ID of holder.
   * @returns {WaitForGraph}
   */
  buildWaitForGraph(tasks, resourceLocks) {
    /** @type {Set<string>} */
    const nodeSet = new Set();
    /** @type {Array<{from: string, to: string}>} */
    const edges = [];

    for (const task of tasks) {
      // Only consider tasks that are actually waiting for something.
      if (!task.resourcesWaiting || task.resourcesWaiting.length === 0) continue;

      nodeSet.add(task.id);

      for (const resource of task.resourcesWaiting) {
        const holderId = resourceLocks.get(resource);

        // An edge exists only when the resource is held by a *different* task.
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

  /**
   * Detect a cycle in the wait-for graph using iterative DFS with 3-colour marking.
   *
   * Colours:
   *   - WHITE (0) – unvisited
   *   - GRAY  (1) – on the current DFS stack (ancestor)
   *   - BLACK (2) – fully processed
   *
   * When a GRAY node is revisited we have found a back-edge → cycle.
   *
   * @param {WaitForGraph} graph
   * @returns {CycleResult}
   */
  detectCycle(graph) {
    const { nodes, edges } = graph;

    if (nodes.length === 0) {
      return { hasCycle: false, cycle: [] };
    }

    // Build adjacency list.
    /** @type {Map<string, string[]>} */
    const adj = new Map();
    for (const node of nodes) adj.set(node, []);
    for (const { from, to } of edges) {
      if (adj.has(from)) adj.get(from).push(to);
    }

    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;

    /** @type {Map<string, number>} */
    const colour = new Map();
    /** @type {Map<string, string|null>} */
    const parent = new Map();

    for (const n of nodes) {
      colour.set(n, WHITE);
      parent.set(n, null);
    }

    /**
     * Reconstruct the cycle path from `cycleEnd` back through parent pointers
     * until we reach `cycleEnd` again.
     *
     * @param {string} cycleEnd
     * @param {string} cycleStart
     * @returns {string[]}
     */
    const reconstructCycle = (cycleEnd, cycleStart) => {
      const path = [cycleStart];
      let cur = cycleEnd;
      while (cur !== cycleStart) {
        path.push(cur);
        cur = parent.get(cur);
        // Safety valve to prevent infinite loop on malformed data.
        if (path.length > nodes.length + 1) break;
      }
      path.push(cycleStart); // close the cycle
      path.reverse();
      return path;
    };

    // DFS from every unvisited node.
    for (const startNode of nodes) {
      if (colour.get(startNode) !== WHITE) continue;

      /** @type {Array<{node: string, idx: number}>} */
      const stack = [{ node: startNode, idx: 0 }];
      colour.set(startNode, GRAY);

      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        const neighbours = adj.get(top.node) || [];

        if (top.idx < neighbours.length) {
          const next = neighbours[top.idx];
          top.idx++;

          if (colour.get(next) === GRAY) {
            // Back-edge found → cycle.
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
          // Fully explored – mark black.
          colour.set(top.node, BLACK);
          stack.pop();
        }
      }
    }

    return { hasCycle: false, cycle: [] };
  }

  /**
   * Find the optimal (safe) release order via **topological sort** (Kahn's algorithm).
   *
   * If the graph contains a cycle, the sort cannot complete; the returned order will
   * contain only the acyclic portion and the caller should consult `detectCycle` for
   * the deadlocked subset.
   *
   * @param {WaitForGraph} graph
   * @returns {string[]} Task IDs in recommended release order (dependants first).
   */
  findOptimalReleaseOrder(graph) {
    const { nodes, edges } = graph;

    if (nodes.length === 0) return [];

    // Build adjacency list and in-degree map.
    /** @type {Map<string, string[]>} */
    const adj = new Map();
    /** @type {Map<string, number>} */
    const inDegree = new Map();

    for (const n of nodes) {
      adj.set(n, []);
      inDegree.set(n, 0);
    }
    for (const { from, to } of edges) {
      if (adj.has(from)) adj.get(from).push(to);
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
    }

    // Seed the queue with zero-in-degree nodes.
    /** @type {string[]} */
    const queue = [];
    for (const [node, deg] of inDegree) {
      if (deg === 0) queue.push(node);
    }

    /** @type {string[]} */
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

    // Reverse so that dependants (tasks that should release first) come first.
    return order.reverse();
  }

  /**
   * Convenience method: build graph → detect cycles → compute release order.
   *
   * @param {Object[]} tasks
   * @param {Map<string, string>} resourceLocks
   * @returns {DeadlockReport}
   */
  analyze(tasks, resourceLocks) {
    const graph = this.buildWaitForGraph(tasks, resourceLocks);
    const { hasCycle, cycle } = this.detectCycle(graph);
    const releaseOrder = this.findOptimalReleaseOrder(graph);

    return { graph, hasCycle, cycle, releaseOrder };
  }
}

export { DeadlockDetector };
