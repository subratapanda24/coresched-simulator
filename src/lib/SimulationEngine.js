// Simulation engine
import { PriorityHeap } from './PriorityHeap';
import { TaskIdChecker } from './TaskIdChecker';
import { DeadlockDetector } from './DeadlockDetector';

// Task names
const SAMPLE_TASK_NAMES = [
  'FileSync',
  'UIRenderer',
  'NetHandler',
  'DBQuery',
  'AudioMixer',
  'GarbageCollector',
  'LogWriter',
  'SecurityScan',
  'CacheManager',
  'InputPoller',
  'PageSwapper',
  'EventDispatcher',
];

// Generate color
function generateColor(index, total) {
  const hue = Math.round((360 / total) * index);
  return `hsl(${hue}, 70%, 50%)`;
}

// Security ID
function generateSecurityId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'SEC-';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Random integer
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Deep clone
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Simulation engine
class SimulationEngine {
  // Resources
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

  // Create engine
  constructor(numCores = 2) {
    this.numCores = numCores;
    this.currentTick = 0;
    this.tasks = [];

    // Ready queue
    this.readyQueue = [];
    this.priorityHeap = new PriorityHeap();
    this.taskIdChecker = new TaskIdChecker();
    this.deadlockDetector = new DeadlockDetector();

    // Resource locks
    this.resourceLocks = new Map();
    this.cores = this._buildCores(numCores);
    this.stateHistory = [];

    // Task counter
    this._nextTaskIndex = 1;
  }

  // Build cores
  _buildCores(n) {
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      currentTask: null,
      utilization: 0,
      totalBusyTicks: 0,
      taskHistory: [],
    }));
  }

  // Sample tasks
  generateSampleTasks() {
    const count = randInt(8, 12);
    const names = [...SAMPLE_TASK_NAMES].sort(() => Math.random() - 0.5).slice(0, count);

    const generated = names.map((name, i) => {
      const burst = randInt(8, 25);
      const arrivalTime = randInt(0, 8); 
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

    // Seed locks
    const resources = [...SimulationEngine.RESOURCES];
    const assignable = generated.filter(() => Math.random() < 0.4);

    assignable.forEach((task) => {
      if (resources.length === 0) return;
      const rIdx = randInt(0, resources.length - 1);
      const res = resources.splice(rIdx, 1)[0];
      task.resourcesHeld.push(res);
      this.resourceLocks.set(res, task.id);
    });

    // Seed deadlocks
    const holders = generated.filter((t) => t.resourcesHeld.length > 0);
    if (holders.length >= 2) {
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

    // Register tasks
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

  // Add task
  addTask(taskDef = {}) {
    const id = `T-${String(this._nextTaskIndex++).padStart(3, '0')}`;
    const burst = taskDef.burstTotal ?? randInt(3, 15);

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

  // Advance tick
  tick() {
    // Init change
    let swappedOut = null;
    let swappedIn = null;

    // Admit tasks
    for (const task of this.tasks) {
      if (task.status === 'waiting' && task.arrivalTime <= this.currentTick) {
        task.status = 'ready';
        if (!this.readyQueue.includes(task)) {
          this.readyQueue.push(task);
          this.priorityHeap.insert(task);
        }
      }
    }

    // Schedule cores
    for (const core of this.cores) {
      if (core.currentTask !== null) continue;

      // Pick task
      let scheduled = null;
      const skipped = [];

      while (!this.priorityHeap.isEmpty()) {
        const candidate = this.priorityHeap.extractMin();
        const liveTask = this.tasks.find((t) => t.id === candidate.id);

        if (liveTask && liveTask.status === 'ready') {
          scheduled = liveTask;
          break;
        }
        // Save skipped
        if (liveTask) skipped.push(candidate);
      }

      // Restore skipped
      for (const s of skipped) this.priorityHeap.insert(s);

      if (scheduled) {
        scheduled.status = 'running';
        scheduled.coreId = core.id;
        core.currentTask = scheduled.id;
        if (!core.taskHistory.includes(scheduled.id)) {
          core.taskHistory.push(scheduled.id);
        }
        // Remove queue
        const rIdx = this.readyQueue.findIndex((t) => t.id === scheduled.id);
        if (rIdx !== -1) this.readyQueue.splice(rIdx, 1);

        swappedIn = scheduled.id;
      }
    }

    // Update burst
    for (const task of this.tasks) {
      if (task.status !== 'running') continue;
      task.burstRemaining = Math.max(0, task.burstRemaining - 1);
    }

    // Handle completion
    for (const task of this.tasks) {
      if (task.status === 'running' && task.burstRemaining <= 0) {
        task.status = 'terminated';

        // Free core
        const core = this.cores.find((c) => c.id === task.coreId);
        if (core) {
          swappedOut = task.id;
          core.currentTask = null;
        }
        task.coreId = null;

        // Release resources
        for (const res of task.resourcesHeld) {
          this.resourceLocks.delete(res);
          this._unblockWaiters(res);
        }
        task.resourcesHeld = [];
        task.resourcesWaiting = [];

        // Cleanup subsystems
        this.priorityHeap.remove(task.id);
      }
    }

    // Request resources
    this._generateResourceRequests();

    // Rebalance workload
    this._rebalanceWorkload();

    // Core util
    for (const core of this.cores) {
      if (core.currentTask !== null) {
        core.totalBusyTicks++;
      }
      core.utilization =
        this.currentTick > 0
          ? Math.round((core.totalBusyTicks / (this.currentTick + 1)) * 100)
          : 0;
    }

    // Save snapshot
    const snapshot = this._createSnapshot(swappedOut, swappedIn);
    this.stateHistory.push(snapshot);

    // Increment tick
    this.currentTick++;

    return snapshot;
  }

  // Undo tick
  undo() {
    if (this.stateHistory.length === 0) return false;

    // Remove last
    this.stateHistory.pop();

    if (this.stateHistory.length === 0) {
      // Reset initial
      this.reset();
      return true;
    }

    // Restore state
    const snapshot = this.stateHistory[this.stateHistory.length - 1];
    this._restoreFromSnapshot(snapshot);
    return true;
  }

  // Reset engine
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

  // Get tasks
  getTasks() {
    return this.tasks;
  }

  // Get queue
  getReadyQueue() {
    return this.readyQueue;
  }

  // Get sorted
  getPrioritySortedTasks() {
    return this.priorityHeap.toSortedArray();
  }

  // Check ID
  checkTaskId(securityId) {
    return {
      found: this.taskIdChecker.has(securityId),
      task: this.taskIdChecker.getTask(securityId),
    };
  }

  // Lock matrix
  getResourceLockMap() {
    const resources = SimulationEngine.RESOURCES;
    const activeTasks = this.tasks.filter((t) => t.status !== 'terminated');
    const taskIds = activeTasks.map((t) => t.id);

    const matrix = resources.map((res) =>
      taskIds.map((tid) => this.resourceLocks.get(res) === tid),
    );

    return { resources, tasks: taskIds, matrix };
  }

  // Analyze deadlock
  getDeadlockAnalysis() {
    return this.deadlockDetector.analyze(this.tasks, this.resourceLocks);
  }

  // Core loads
  getCoreLoads() {
    return this.cores;
  }

  // Get history
  getStateHistory() {
    return this.stateHistory;
  }

  // Restore state
  restoreState(snapshotIndex) {
    if (snapshotIndex < 0 || snapshotIndex >= this.stateHistory.length) return false;

    const snapshot = this.stateHistory[snapshotIndex];
    this._restoreFromSnapshot(snapshot);

    // Trim history
    this.stateHistory = this.stateHistory.slice(0, snapshotIndex + 1);
    return true;
  }

  // Get tick
  getCurrentTick() {
    return this.currentTick;
  }

  // Set cores
  setCores(numCores) {
    if (numCores < 1) numCores = 1;
    if (numCores > 16) numCores = 16;

    const oldCores = this.cores;
    this.numCores = numCores;
    this.cores = this._buildCores(numCores);

    // Preserve state
    for (let i = 0; i < Math.min(oldCores.length, numCores); i++) {
      this.cores[i] = { ...oldCores[i] };
    }

    // Evict tasks
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

  // Least loaded
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

  // Rebalance cores
  _rebalanceWorkload() {
    for (const core of this.cores) {
      if (core.currentTask !== null) continue;

      // Find ready
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

      // Remove queue
      const idx = this.readyQueue.findIndex((t) => t.id === readyTask.id);
      if (idx !== -1) this.readyQueue.splice(idx, 1);

      // Remove heap
      this.priorityHeap.remove(readyTask.id);
    }
  }

  // Request resources
  _generateResourceRequests() {
    const runningTasks = this.tasks.filter((t) => t.status === 'running');

    for (const task of runningTasks) {
      // Random request
      if (Math.random() > 0.12) continue;
      // Limit resources
      if (task.resourcesHeld.length >= 2) continue;

      // Available resources
      const available = SimulationEngine.RESOURCES.filter(
        (r) => !task.resourcesHeld.includes(r) && !task.resourcesWaiting.includes(r),
      );
      if (available.length === 0) continue;

      const wanted = available[randInt(0, available.length - 1)];
      const holder = this.resourceLocks.get(wanted);

      if (!holder) {
        // Grant resource
        task.resourcesHeld.push(wanted);
        this.resourceLocks.set(wanted, task.id);
      } else if (holder !== task.id) {
        // Block task
        task.resourcesWaiting.push(wanted);
        task.status = 'blocked';

        // Free core
        const core = this.cores.find((c) => c.id === task.coreId);
        if (core) core.currentTask = null;
        task.coreId = null;
      }
    }
  }

  // Unblock waiters
  _unblockWaiters(resourceName) {
    for (const task of this.tasks) {
      if (task.status !== 'blocked') continue;

      const wIdx = task.resourcesWaiting.indexOf(resourceName);
      if (wIdx === -1) continue;

      // Grant waiter
      task.resourcesWaiting.splice(wIdx, 1);
      task.resourcesHeld.push(resourceName);
      this.resourceLocks.set(resourceName, task.id);

      // Ready task
      if (task.resourcesWaiting.length === 0) {
        task.status = 'ready';
        this.readyQueue.push(task);
        this.priorityHeap.insert(task);
      }

      // Limit grant
      break;
    }
  }

  // Generate registers
  _generateRegisters() {
    const hex = (n) => '0x' + n.toString(16).toUpperCase().padStart(4, '0');
    return {
      PC: hex(randInt(0x1000, 0xffff)),
      SP: hex(randInt(0x7000, 0x7fff)),
      FLAGS: hex(randInt(0x0000, 0x00ff)),
    };
  }

  // Create snapshot
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

  // Restore snapshot
  _restoreFromSnapshot(snapshot) {
    this.currentTick = snapshot.tick;
    this.tasks = deepClone(snapshot.tasks);
    this.cores = deepClone(snapshot.cores);
    this.readyQueue = deepClone(snapshot.readyQueue);
    this.resourceLocks = new Map(snapshot.resourceLocks);

    // Rebuild heap
    this.priorityHeap = new PriorityHeap();
    for (const task of this.tasks) {
      if (task.status === 'ready') {
        this.priorityHeap.insert(task);
      }
    }

    // Rebuild checker
    this.taskIdChecker = new TaskIdChecker();
    for (const task of this.tasks) {
      if (task.status !== 'terminated') {
        this.taskIdChecker.add(task);
      }
    }
  }
}

export { SimulationEngine };
