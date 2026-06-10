/**
 * @fileoverview React hook that wraps {@link SimulationEngine} and exposes
 * reactive state + control functions for the CoreSched Simulator UI.
 *
 * The hook owns a single `SimulationEngine` instance (stored in a ref so it
 * survives re-renders), mirrors key engine state into `useState` variables so
 * that React re-renders on every tick, and manages an auto-play interval for
 * continuous simulation.
 *
 * @module useSimulation
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { SimulationEngine } from '@/lib/SimulationEngine';

/**
 * Synchronise React state with the current engine snapshot.
 *
 * This is extracted as a plain function so it can be called from multiple
 * places without violating the rules-of-hooks.
 *
 * @param {SimulationEngine} engine
 * @param {Function} setTasks
 * @param {Function} setReadyQueue
 * @param {Function} setPriorityQueue
 * @param {Function} setResourceLocks
 * @param {Function} setCoreLoads
 * @param {Function} setStateHistory
 * @param {Function} setCurrentTick
 * @param {Function} setDeadlockAnalysis
 */
function syncState(
  engine,
  setTasks,
  setReadyQueue,
  setPriorityQueue,
  setResourceLocks,
  setCoreLoads,
  setStateHistory,
  setCurrentTick,
  setDeadlockAnalysis,
) {
  setTasks([...engine.getTasks()]);
  setReadyQueue([...engine.getReadyQueue()]);
  setPriorityQueue(engine.getPrioritySortedTasks());
  setResourceLocks(engine.getResourceLockMap());
  setCoreLoads([...engine.getCoreLoads()]);
  setStateHistory([...engine.getStateHistory()]);
  setCurrentTick(engine.getCurrentTick());
  setDeadlockAnalysis(engine.getDeadlockAnalysis());
}

/**
 * React hook providing reactive simulation state and control actions.
 *
 * @param {number} [initialCores=4] - Number of CPU cores to simulate.
 * @returns {Object} Simulation state and action functions.
 *
 * @example
 *   function Dashboard() {
 *     const { tasks, step, start, pause, isRunning } = useSimulation(4);
 *     return (
 *       <>
 *         <button onClick={isRunning ? pause : start}>
 *           {isRunning ? 'Pause' : 'Play'}
 *         </button>
 *         <button onClick={step}>Step</button>
 *         <ul>{tasks.map(t => <li key={t.id}>{t.name}</li>)}</ul>
 *       </>
 *     );
 *   }
 */
export function useSimulation(initialCores = 4) {
  // ---------------------------------------------------------------------------
  // Engine ref (stable across renders)
  // ---------------------------------------------------------------------------

  /** @type {React.MutableRefObject<SimulationEngine>} */
  const engineRef = useRef(null);

  if (engineRef.current === null) {
    const engine = new SimulationEngine(initialCores);
    engine.generateSampleTasks();
    engineRef.current = engine;
  }

  // ---------------------------------------------------------------------------
  // Reactive state
  // ---------------------------------------------------------------------------

  const [tasks, setTasks] = useState(() => [...engineRef.current.getTasks()]);
  const [readyQueue, setReadyQueue] = useState(() => [...engineRef.current.getReadyQueue()]);
  const [priorityQueue, setPriorityQueue] = useState(() =>
    engineRef.current.getPrioritySortedTasks(),
  );
  const [resourceLocks, setResourceLocks] = useState(() =>
    engineRef.current.getResourceLockMap(),
  );
  const [coreLoads, setCoreLoads] = useState(() => [...engineRef.current.getCoreLoads()]);
  const [stateHistory, setStateHistory] = useState(() => [
    ...engineRef.current.getStateHistory(),
  ]);
  const [currentTick, setCurrentTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [cores, setCoresState] = useState(initialCores);
  const [speed, setSpeedState] = useState(500); // ms between ticks
  const [deadlockAnalysis, setDeadlockAnalysis] = useState(() =>
    engineRef.current.getDeadlockAnalysis(),
  );

  // Interval ref for auto-play.
  const intervalRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Pull all engine state into React state variables.
   */
  const sync = useCallback(() => {
    syncState(
      engineRef.current,
      setTasks,
      setReadyQueue,
      setPriorityQueue,
      setResourceLocks,
      setCoreLoads,
      setStateHistory,
      setCurrentTick,
      setDeadlockAnalysis,
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Advance the simulation by a single tick.
   */
  const step = useCallback(() => {
    engineRef.current.tick();
    sync();
  }, [sync]);

  /**
   * Start continuous auto-play.
   */
  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  /**
   * Pause auto-play.
   */
  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  /**
   * Undo the most recent tick.
   */
  const undo = useCallback(() => {
    engineRef.current.undo();
    sync();
  }, [sync]);

  /**
   * Reset the simulation: clears all state and regenerates sample tasks.
   */
  const reset = useCallback(() => {
    setIsRunning(false);
    engineRef.current.reset();
    sync();
  }, [sync]);

  /**
   * Add a custom task to the simulation.
   *
   * @param {Partial<import('@/lib/SimulationEngine').Task>} taskDef
   */
  const addTask = useCallback(
    (taskDef) => {
      engineRef.current.addTask(taskDef);
      sync();
    },
    [sync],
  );

  /**
   * Change the number of simulated CPU cores.
   *
   * @param {number} numCores
   */
  const setCores = useCallback(
    (numCores) => {
      engineRef.current.setCores(numCores);
      setCoresState(numCores);
      sync();
    },
    [sync],
  );

  /**
   * Change the auto-play speed (interval in milliseconds).
   *
   * @param {number} ms - Interval between ticks (100–2000).
   */
  const setSpeed = useCallback((ms) => {
    const clamped = Math.max(100, Math.min(2000, ms));
    setSpeedState(clamped);
  }, []);

  /**
   * O(1) security-ID lookup.
   *
   * @param {string} securityId
   * @returns {{ found: boolean, task: Object|undefined }}
   */
  const checkTaskId = useCallback((securityId) => {
    return engineRef.current.checkTaskId(securityId);
  }, []);

  /**
   * Restore the simulation to a specific historical snapshot.
   *
   * @param {number} snapshotIndex
   */
  const restoreState = useCallback(
    (snapshotIndex) => {
      engineRef.current.restoreState(snapshotIndex);
      sync();
    },
    [sync],
  );

  // ---------------------------------------------------------------------------
  // Auto-play interval management
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        engineRef.current.tick();
        // Sync inside the interval callback.
        syncState(
          engineRef.current,
          setTasks,
          setReadyQueue,
          setPriorityQueue,
          setResourceLocks,
          setCoreLoads,
          setStateHistory,
          setCurrentTick,
          setDeadlockAnalysis,
        );

        // Auto-pause if there are tasks and all of them are terminated
        const allTasks = engineRef.current.getTasks();
        const activeTasks = allTasks.filter(t => t.status !== 'terminated');
        if (allTasks.length > 0 && activeTasks.length === 0) {
          setIsRunning(false);
        }
      }, speed);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, speed]);

  // ---------------------------------------------------------------------------
  // Return public API
  // ---------------------------------------------------------------------------

  return {
    // State
    tasks,
    readyQueue,
    priorityQueue,
    resourceLocks,
    coreLoads,
    stateHistory,
    currentTick,
    isRunning,
    cores,
    speed,
    deadlockAnalysis,

    // Actions
    start,
    pause,
    step,
    reset,
    undo,
    addTask,
    setCores,
    setSpeed,
    checkTaskId,
    restoreState,
  };
}
