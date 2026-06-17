// Simulation hook
import { useState, useRef, useCallback, useEffect } from 'react';
import { SimulationEngine } from '@/lib/SimulationEngine';

// Sync state
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

// Use simulation
export function useSimulation(initialCores = 4) {
  const engineRef = useRef(null);

  if (engineRef.current === null) {
    const engine = new SimulationEngine(initialCores);
    engine.generateSampleTasks();
    engineRef.current = engine;
  }

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
  const [speed, setSpeedState] = useState(500);
  const [deadlockAnalysis, setDeadlockAnalysis] = useState(() =>
    engineRef.current.getDeadlockAnalysis(),
  );

  // Play interval
  const intervalRef = useRef(null);

  // Sync helper
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

  // Step tick
  const step = useCallback(() => {
    engineRef.current.tick();
    sync();
  }, [sync]);

  // Start play
  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  // Pause play
  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  // Undo tick
  const undo = useCallback(() => {
    engineRef.current.undo();
    sync();
  }, [sync]);

  // Reset sim
  const reset = useCallback(() => {
    setIsRunning(false);
    engineRef.current.reset();
    sync();
  }, [sync]);

  // Add task
  const addTask = useCallback(
    (taskDef) => {
      engineRef.current.addTask(taskDef);
      sync();
    },
    [sync],
  );

  // Set cores
  const setCores = useCallback(
    (numCores) => {
      engineRef.current.setCores(numCores);
      setCoresState(numCores);
      sync();
    },
    [sync],
  );

  // Set speed
  const setSpeed = useCallback((ms) => {
    const clamped = Math.max(50, Math.min(3000, ms));
    setSpeedState(clamped);
  }, []);

  // Check ID
  const checkTaskId = useCallback((securityId) => {
    return engineRef.current.checkTaskId(securityId);
  }, []);

  // Restore state
  const restoreState = useCallback(
    (snapshotIndex) => {
      engineRef.current.restoreState(snapshotIndex);
      sync();
    },
    [sync],
  );

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        engineRef.current.tick();
        // Sync timer
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

        // Auto pause
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
