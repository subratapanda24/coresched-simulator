/**
 * @fileoverview Central simulation state machine for the CoreSched Simulator.
 *
 * Orchestrates priority-based CPU scheduling across multiple cores, manages resource
 * locking / contention, records state snapshots for undo, and exposes query methods
 * consumed by the React UI layer.
 *
 * @module SimulationEngine
 */

import { PriorityHeap } from './PriorityHeap';
import { TaskIdChecker } from './TaskIdChecker';
import { DeadlockDetector } from './DeadlockDetector';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Creative thread names used when auto-generating sample tasks. */
const SAMPLE_TASK_NAMES = [
  'FileSync',
  'UIRenderer',
  'NetHandler',
  'DBQuery',
  'AudioMixer',
  'GarbageCollector',
  'LogWriter',
  'SecurityScan',
];

/**
 * Generate a unique HSL colour string for a given index so that each task is
 * visually distinct on the dashboard.
 *
 * @param {number} index
 * @param {number} total
 * @returns {string} e.g. `"hsl(220, 70%, 50%)"`
 */
function generateColor(index, total) {
  const hue = Math.round((360 / total) * index);
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Generate a random alphanumeric security ID in the form `SEC-XXXX`.
 *
 * @returns {string}
 */
function generateSecurityId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'SEC-';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Return a random integer between `min` and `max` (inclusive).
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Deep-clone a plain JSON-serializable value.
 *
 * @param {*} obj
 * @returns {*}
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// SimulationEngine
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Task
 * @property {string}   id               - e.g. `"T-001"`
 * @property {string}   name             - Human-readable thread name.
 * @property {'ready'|'running'|'waiting'|'blocked'|'terminated'} status
 * @property {number}   priority         - 1 (highest) – 10 (lowest).
 * @property {number|null} coreId        - The core this task is executing on, or `null`.
 * @property {number}   burstTotal       - Original CPU burst length.
 * @property {number}   burstRemaining   - Remaining ticks of CPU work.
 * @property {number}   arrivalTime      - Tick at which the task enters the system.
 * @property {string[]} resourcesHeld    - Resource names currently held.
 * @property {string[]} resourcesWaiting - Resource names this task is waiting for.
 * @property {string}   securityId       - Unique security identifier.
 * @property {string}   color            - HSL colour string for UI display.
 */

/**
 * @typedef {Object} Core
 * @property {number}   id             - Zero-based core index.
 * @property {string|null} currentTask - Task ID currently running, or `null`.
 * @property {number}   utilization    - 0–100 percentage.
 * @property {number}   totalBusyTicks - Total ticks this core has been busy.
 * @property {string[]} taskHistory    - IDs of tasks that have run on this core.
 */

/**
 * @typedef {Object} StateSnapshot
 * @property {number}   tick
 * @property {Task[]}   tasks
 * @property {Core[]}   cores
 * @property {Task[]}   readyQueue
 * @property {Array}    resourceLocks  - Serialised `[key, value]` entries.
 * @property {string|null} swappedOut  - Task ID swapped out of a core.
 * @property {string|null} swappedIn   - Task ID swapped into a core.
 * @property {{PC: string, SP: string, FLAGS: string}} registers
 */

/**
 * The central simulation state machine.
 *
 * @example
 *   const engine = new SimulationEngine(4);
 *   engine.generateSampleTasks();
 *   engine.tick();
 *   console.log(engine.getTasks());
 */
class SimulationEngine {
  /**
   * Shared resource names available for locking simulation.
   * @type {string[]}
   */
  static RESOURCES = [
    'File_A',
    'File_B',
    'Mem_Block_1',
    'Mem_Block_2',
    'I/O_Port',
    'GPU_Buffer',
    'Network_Socket',
    'DB_Connection',
  ];

  /**
   * Create a new simulation engine.
   *
   * @param {number} [numCores=2] - Number of CPU cores to simulate.
   */
  constructor(numCores = 2) {
    /** @type {number} */
    this.numCores = numCores;

    /** @type {number} */
    this.currentTick = 0;

    /** @type {Task[]} */
    this.tasks = [];

    /** @type {Task[]} FIFO ready queue. */
    this.readyQueue = [];

    /** @type {PriorityHeap} */
    this.priorityHeap = new PriorityHeap();

    /** @type {TaskIdChecker} */
    this.taskIdChecker = new TaskIdChecker();

    /** @type {DeadlockDetector} */
    this.deadlockDetector = new DeadlockDetector();

    /**
     * Resource → Task-ID mapping showing who currently holds each resource.
     * @type {Map<string, string>}
     */
    this.resourceLocks = new Map();

    /** @type {Core[]} */
    this.cores = this._buildCores(numCores);

    /** @type {StateSnapshot[]} */
    this.stateHistory = [];

    /** Auto-increment counter for task IDs. */
    this._nextTaskIndex = 1;
  }

  // ---------------------------------------------------------------------------
  // Initialisation helpers
  // ---------------------------------------------------------------------------

  /**
   * Create the initial array of `Core` objects.
   *
   * @param {number} n
   * @returns {Core[]}
   * @private
   */
  _buildCores(n) {
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      currentTask: null,
      utilization: 0,
      totalBusyTicks: 0,
      taskHistory: [],
    }));
  }

  /**
   * Generate 6–8 sample tasks with creative names, random priorities, burst times,
   * colours, and security IDs.  A subset of tasks are pre-assigned resources to
   * create interesting contention scenarios.
   *
   * @returns {Task[]} The generated tasks (also stored internally).
   */
  generateSampleTasks() {
    const count = randInt(6, 8);
    const names = [...SAMPLE_TASK_NAMES].sort(() => Math.random() - 0.5).slice(0, count);

    /** @type {Task[]} */
    const generated = names.map((name, i) => {
      const burst = randInt(3, 15);
      const arrivalTime = randInt(0, 4); // stagger arrivals over first few ticks
      return {
        id: `T-${String(this._nextTaskIndex++).padStart(3, '0')}`,
        name,
        status: arrivalTime > 0 ? 'waiting' : 'ready',
        priority: randInt(1, 10),
        coreId: null,
        burstTotal: burst,
        burstRemaining: burst,
        arrivalTime,
        resourcesHeld: [],
        resourcesWaiting: [],
        securityId: generateSecurityId(),
        color: generateColor(i, count),
      };
    });

    // --- Pre-seed resource contention ---
    // Give ~40 % of tasks an initial resource, and make ~25 % wait for a
    // resource held by someone else so the UI has something to show immediately.
    const resources = [...SimulationEngine.RESOURCES];
    const assignable = generated.filter(() => Math.random() < 0.4);

    assignable.forEach((task) => {
      if (resources.length === 0) return;
      const rIdx = randInt(0, resources.length - 1);
      const res = resources.splice(rIdx, 1)[0];
      task.resourcesHeld.push(res);
      this.resourceLocks.set(res, task.id);
    });

    // Create some waiting relationships for potential deadlocks.
    const holders = generated.filter((t) => t.resourcesHeld.length > 0);
    if (holders.length >= 2) {
      // Make the first holder wait for a resource the second holder has, and vice versa.
      const a = holders[0];
      const b = holders[1];
      if (b.resourcesHeld.length > 0) {
        a.resourcesWaiting.push(b.resourcesHeld[0]);
        a.status = 'blocked';
      }
      if (a.resourcesHeld.length > 0) {
        b.resourcesWaiting.push(a.resourcesHeld[0]);
        b.status = 'blocked';
      }
    }

    // Store tasks, register with subsystems.
    for (const task of generated) {
      this.tasks.push(task);
      if (task.status === 'ready') {
        this.readyQueue.push(task);
        this.priorityHeap.insert(task);
      }
      this.taskIdChecker.add(task);
    }

    return generated;
  }

  // ---------------------------------------------------------------------------
  // Task management
  // ---------------------------------------------------------------------------

  /**
   * Add a new task to the simulation.
   *
   * The task is placed in the ready queue, registered with the priority heap and
   * ID checker, and assigned to the least-loaded core.
   *
   * @param {Partial<Task>} taskDef - Partial task definition.  Missing fields are
   *   filled with sensible defaults.
   * @returns {Task} The fully-initialised task object.
   */
  addTask(taskDef = {}) {
    const id = `T-${String(this._nextTaskIndex++).padStart(3, '0')}`;
    const burst = taskDef.burstTotal ?? randInt(3, 15);

    /** @type {Task} */
    const task = {
      id,
      name: taskDef.name ?? `Task_${id}`,
      status: 'ready',
      priority: taskDef.priority ?? randInt(1, 10),
      coreId: null,
      burstTotal: burst,
      burstRemaining: burst,
      arrivalTime: taskDef.arrivalTime ?? this.currentTick,
      resourcesHeld: [],
      resourcesWaiting: [],
      securityId: taskDef.securityId ?? generateSecurityId(),
      color: taskDef.color ?? generateColor(this.tasks.length, this.tasks.length + 1),
    };

    this.tasks.push(task);
    this.readyQueue.push(task);
    this.priorityHeap.insert(task);
    this.taskIdChecker.add(task);

    return task;
  }

  // ---------------------------------------------------------------------------
  // Tick (core simulation loop)
  // ---------------------------------------------------------------------------

  /**
   * Advance the simulation by one tick.
   *
   * Execution order:
   *  1. Snapshot current state for undo.
   *  2. Admit newly arriving tasks.
   *  3. Schedule ready tasks to available cores (priority-first).
   *  4. Execute running tasks (decrement burst).
   *  5. Handle task completion (terminate, release resources, unblock waiters).
   *  6. Randomly generate resource requests / contention.
   *  7. Rebalance workload across cores.
   *  8. Update core utilization statistics.
   *  9. Increment tick counter.
   *
   * @returns {StateSnapshot} The snapshot captured **before** this tick's mutations.
   */
  tick() {
    // ---- 1. Snapshot --------------------------------------------------------
    let swappedOut = null;
    let swappedIn = null;

    // ---- 2. Arriving tasks --------------------------------------------------
    for (const task of this.tasks) {
      if (task.status === 'waiting' && task.arrivalTime <= this.currentTick) {
        task.status = 'ready';
        if (!this.readyQueue.includes(task)) {
          this.readyQueue.push(task);
          this.priorityHeap.insert(task);
        }
      }
    }

    // ---- 3. Schedule ready → cores (priority-based) -------------------------
    for (const core of this.cores) {
      if (core.currentTask !== null) continue; // core busy

      // Pick highest-priority task from the heap that is ready.
      let scheduled = null;
      const skipped = [];

      while (!this.priorityHeap.isEmpty()) {
        const candidate = this.priorityHeap.extractMin();
        const liveTask = this.tasks.find((t) => t.id === candidate.id);

        if (liveTask && liveTask.status === 'ready') {
          scheduled = liveTask;
          break;
        }
        // Not schedulable right now – remember it to re-insert later.
        if (liveTask) skipped.push(candidate);
      }

      // Re-insert tasks we skipped.
      for (const s of skipped) this.priorityHeap.insert(s);

      if (scheduled) {
        scheduled.status = 'running';
        scheduled.coreId = core.id;
        core.currentTask = scheduled.id;
        if (!core.taskHistory.includes(scheduled.id)) {
          core.taskHistory.push(scheduled.id);
        }
        // Remove from ready queue (FIFO).
        const rIdx = this.readyQueue.findIndex((t) => t.id === scheduled.id);
        if (rIdx !== -1) this.readyQueue.splice(rIdx, 1);

        swappedIn = scheduled.id;
      }
    }

    // ---- 4. Execute running tasks -------------------------------------------
    for (const task of this.tasks) {
      if (task.status !== 'running') continue;
      task.burstRemaining = Math.max(0, task.burstRemaining - 1);
    }

    // ---- 5. Handle completion -----------------------------------------------
    for (const task of this.tasks) {
      if (task.status === 'running' && task.burstRemaining <= 0) {
        task.status = 'terminated';

        // Free the core.
        const core = this.cores.find((c) => c.id === task.coreId);
        if (core) {
          swappedOut = task.id;
          core.currentTask = null;
        }
        task.coreId = null;

        // Release all held resources and unblock waiting tasks.
        for (const res of task.resourcesHeld) {
          this.resourceLocks.delete(res);
          this._unblockWaiters(res);
        }
        task.resourcesHeld = [];
        task.resourcesWaiting = [];

        // Remove from priority heap & ID checker.
        this.priorityHeap.remove(task.id);
      }
    }

    // ---- 6. Random resource requests ----------------------------------------
    this._generateResourceRequests();

    // ---- 7. Rebalance workload (simple: move ready tasks to emptiest core) --
    this._rebalanceWorkload();

    // ---- 8. Update core utilization -----------------------------------------
    for (const core of this.cores) {
      if (core.currentTask !== null) {
        core.totalBusyTicks++;
      }
      core.utilization =
        this.currentTick > 0
          ? Math.round((core.totalBusyTicks / (this.currentTick + 1)) * 100)
          : 0;
    }

    // ---- Save snapshot AFTER mutations (so undo restores pre-tick state) -----
    const snapshot = this._createSnapshot(swappedOut, swappedIn);
    this.stateHistory.push(snapshot);

    // ---- 9. Increment tick --------------------------------------------------
    this.currentTick++;

    return snapshot;
  }

  // ---------------------------------------------------------------------------
  // Undo / Reset
  // ---------------------------------------------------------------------------

  /**
   * Undo the most recent tick by restoring the previous state snapshot.
   *
   * @returns {boolean} `true` if the undo was successful, `false` if there is
   *   nothing to undo.
   */
  undo() {
    if (this.stateHistory.length === 0) return false;

    // Remove the last snapshot (it is the state *after* the last tick).
    this.stateHistory.pop();

    if (this.stateHistory.length === 0) {
      // Nothing left – reset to initial.
      this.reset();
      return true;
    }

    // Restore to the most recent remaining snapshot.
    const snapshot = this.stateHistory[this.stateHistory.length - 1];
    this._restoreFromSnapshot(snapshot);
    return true;
  }

  /**
   * Reset the entire simulation to its initial state and regenerate sample tasks.
   */
  reset() {
    this.currentTick = 0;
    this.tasks = [];
    this.readyQueue = [];
    this.priorityHeap = new PriorityHeap();
    this.taskIdChecker = new TaskIdChecker();
    this.resourceLocks = new Map();
    this.cores = this._buildCores(this.numCores);
    this.stateHistory = [];
    this._nextTaskIndex = 1;

    this.generateSampleTasks();
  }

  // ---------------------------------------------------------------------------
  // Query methods (consumed by React layer)
  // ---------------------------------------------------------------------------

  /**
   * Return all tasks.
   * @returns {Task[]}
   */
  getTasks() {
    return this.tasks;
  }

  /**
   * Return the FIFO ready queue.
   * @returns {Task[]}
   */
  getReadyQueue() {
    return this.readyQueue;
  }

  /**
   * Return all non-terminated tasks sorted by priority (ascending number).
   * @returns {Task[]}
   */
  getPrioritySortedTasks() {
    return this.priorityHeap.toSortedArray();
  }

  /**
   * O(1) lookup of a security ID.
   *
   * @param {string} securityId
   * @returns {{ found: boolean, task: Task|undefined }}
   */
  checkTaskId(securityId) {
    return {
      found: this.taskIdChecker.has(securityId),
      task: this.taskIdChecker.getTask(securityId),
    };
  }

  /**
   * Return a resource-lock matrix suitable for rendering in the UI.
   *
   * @returns {{ resources: string[], tasks: string[], matrix: boolean[][] }}
   */
  getResourceLockMap() {
    const resources = SimulationEngine.RESOURCES;
    const activeTasks = this.tasks.filter((t) => t.status !== 'terminated');
    const taskIds = activeTasks.map((t) => t.id);

    /** @type {boolean[][]} rows=resources, cols=tasks */
    const matrix = resources.map((res) =>
      taskIds.map((tid) => this.resourceLocks.get(res) === tid),
    );

    return { resources, tasks: taskIds, matrix };
  }

  /**
   * Run deadlock analysis on the current state.
   *
   * @returns {import('./DeadlockDetector').DeadlockReport}
   */
  getDeadlockAnalysis() {
    return this.deadlockDetector.analyze(this.tasks, this.resourceLocks);
  }

  /**
   * Return core load objects for the workload-balancer display.
   * @returns {Core[]}
   */
  getCoreLoads() {
    return this.cores;
  }

  /**
   * Return the full state-snapshot history.
   * @returns {StateSnapshot[]}
   */
  getStateHistory() {
    return this.stateHistory;
  }

  /**
   * Restore the simulation to a specific historical snapshot.
   *
   * @param {number} snapshotIndex - Zero-based index into `stateHistory`.
   * @returns {boolean} `true` on success, `false` if the index is out of range.
   */
  restoreState(snapshotIndex) {
    if (snapshotIndex < 0 || snapshotIndex >= this.stateHistory.length) return false;

    const snapshot = this.stateHistory[snapshotIndex];
    this._restoreFromSnapshot(snapshot);

    // Trim history to the restored point.
    this.stateHistory = this.stateHistory.slice(0, snapshotIndex + 1);
    return true;
  }

  /**
   * Return the current tick number.
   * @returns {number}
   */
  getCurrentTick() {
    return this.currentTick;
  }

  /**
   * Change the number of simulated cores.  Existing task assignments are
   * preserved where possible; tasks on removed cores are moved back to ready.
   *
   * @param {number} numCores
   */
  setCores(numCores) {
    if (numCores < 1) numCores = 1;
    if (numCores > 16) numCores = 16;

    const oldCores = this.cores;
    this.numCores = numCores;
    this.cores = this._buildCores(numCores);

    // Preserve state for cores that still exist.
    for (let i = 0; i < Math.min(oldCores.length, numCores); i++) {
      this.cores[i] = { ...oldCores[i] };
    }

    // Evict tasks from removed cores.
    if (numCores < oldCores.length) {
      for (let i = numCores; i < oldCores.length; i++) {
        const evictedId = oldCores[i].currentTask;
        if (evictedId) {
          const task = this.tasks.find((t) => t.id === evictedId);
          if (task && task.status === 'running') {
            task.status = 'ready';
            task.coreId = null;
            this.readyQueue.push(task);
            this.priorityHeap.insert(task);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Internal: scheduling & resource helpers
  // ---------------------------------------------------------------------------

  /**
   * Find the core with the fewest total busy ticks (least loaded).
   *
   * @returns {Core|null}
   * @private
   */
  _findLeastLoadedCore() {
    let best = null;
    for (const core of this.cores) {
      if (core.currentTask !== null) continue;
      if (best === null || core.totalBusyTicks < best.totalBusyTicks) {
        best = core;
      }
    }
    return best;
  }

  /**
   * Rebalance workload: if more than one core is idle and there are ready tasks,
   * schedule them in priority order to the least-loaded cores.
   *
   * @private
   */
  _rebalanceWorkload() {
    for (const core of this.cores) {
      if (core.currentTask !== null) continue;

      // Try to find a ready task not yet assigned.
      const readyTask = this.readyQueue.find(
        (t) => t.status === 'ready' && t.coreId === null,
      );
      if (!readyTask) break;

      readyTask.status = 'running';
      readyTask.coreId = core.id;
      core.currentTask = readyTask.id;
      if (!core.taskHistory.includes(readyTask.id)) {
        core.taskHistory.push(readyTask.id);
      }

      // Remove from ready queue.
      const idx = this.readyQueue.findIndex((t) => t.id === readyTask.id);
      if (idx !== -1) this.readyQueue.splice(idx, 1);

      // Remove from heap.
      this.priorityHeap.remove(readyTask.id);
    }
  }

  /**
   * Randomly make some running tasks request a resource they don't already hold.
   * If the resource is held by another task, the requester becomes blocked.
   *
   * @private
   */
  _generateResourceRequests() {
    const runningTasks = this.tasks.filter((t) => t.status === 'running');

    for (const task of runningTasks) {
      // ~20 % chance per tick that a running task requests a resource.
      if (Math.random() > 0.20) continue;
      // Don't pile up too many resources on one task.
      if (task.resourcesHeld.length >= 2) continue;

      // Pick a random resource this task doesn't already hold.
      const available = SimulationEngine.RESOURCES.filter(
        (r) => !task.resourcesHeld.includes(r) && !task.resourcesWaiting.includes(r),
      );
      if (available.length === 0) continue;

      const wanted = available[randInt(0, available.length - 1)];
      const holder = this.resourceLocks.get(wanted);

      if (!holder) {
        // Resource is free – grant immediately.
        task.resourcesHeld.push(wanted);
        this.resourceLocks.set(wanted, task.id);
      } else if (holder !== task.id) {
        // Resource held by another task → block.
        task.resourcesWaiting.push(wanted);
        task.status = 'blocked';

        // Free the core.
        const core = this.cores.find((c) => c.id === task.coreId);
        if (core) core.currentTask = null;
        task.coreId = null;
      }
    }
  }

  /**
   * When a resource is released, unblock any task that was waiting solely for it.
   *
   * @param {string} resourceName
   * @private
   */
  _unblockWaiters(resourceName) {
    for (const task of this.tasks) {
      if (task.status !== 'blocked') continue;

      const wIdx = task.resourcesWaiting.indexOf(resourceName);
      if (wIdx === -1) continue;

      // Grant the resource to this waiter.
      task.resourcesWaiting.splice(wIdx, 1);
      task.resourcesHeld.push(resourceName);
      this.resourceLocks.set(resourceName, task.id);

      // If the task has no more outstanding waits, move it back to ready.
      if (task.resourcesWaiting.length === 0) {
        task.status = 'ready';
        this.readyQueue.push(task);
        this.priorityHeap.insert(task);
      }

      // Only grant to one waiter per resource release.
      break;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal: snapshot / restore
  // ---------------------------------------------------------------------------

  /**
   * Generate simulated CPU register values for display purposes.
   *
   * @returns {{ PC: string, SP: string, FLAGS: string }}
   * @private
   */
  _generateRegisters() {
    const hex = (/** @type {number} */ n) => '0x' + n.toString(16).toUpperCase().padStart(4, '0');
    return {
      PC: hex(randInt(0x1000, 0xffff)),
      SP: hex(randInt(0x7000, 0x7fff)),
      FLAGS: hex(randInt(0x0000, 0x00ff)),
    };
  }

  /**
   * Create a deep-cloned snapshot of the current simulation state.
   *
   * @param {string|null} swappedOut - Task ID that was swapped out this tick.
   * @param {string|null} swappedIn  - Task ID that was swapped in this tick.
   * @returns {StateSnapshot}
   * @private
   */
  _createSnapshot(swappedOut, swappedIn) {
    return {
      tick: this.currentTick,
      tasks: deepClone(this.tasks),
      cores: deepClone(this.cores),
      readyQueue: deepClone(this.readyQueue),
      resourceLocks: Array.from(this.resourceLocks.entries()),
      swappedOut,
      swappedIn,
      registers: this._generateRegisters(),
    };
  }

  /**
   * Restore the engine's mutable state from a snapshot.
   *
   * @param {StateSnapshot} snapshot
   * @private
   */
  _restoreFromSnapshot(snapshot) {
    this.currentTick = snapshot.tick;
    this.tasks = deepClone(snapshot.tasks);
    this.cores = deepClone(snapshot.cores);
    this.readyQueue = deepClone(snapshot.readyQueue);
    this.resourceLocks = new Map(snapshot.resourceLocks);

    // Rebuild the priority heap from non-terminated tasks.
    this.priorityHeap = new PriorityHeap();
    for (const task of this.tasks) {
      if (task.status === 'ready') {
        this.priorityHeap.insert(task);
      }
    }

    // Rebuild the ID checker.
    this.taskIdChecker = new TaskIdChecker();
    for (const task of this.tasks) {
      if (task.status !== 'terminated') {
        this.taskIdChecker.add(task);
      }
    }
  }
}

export { SimulationEngine };
