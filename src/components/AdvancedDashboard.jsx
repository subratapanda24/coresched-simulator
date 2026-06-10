import { useSimulation } from "@/hooks/useSimulation";
import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import AnimatedShinyText from "@/components/ui/animated-shiny-text";
import { Dices, Play, Pause, SkipForward, Undo2, RotateCcw, Plus, Search, Lock, Unlock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Status + Priority helpers                                          */
/* ------------------------------------------------------------------ */

const STATUS_COLORS = {
  running:    { bg: "hsl(142, 71%, 45%)", label: "Running" },
  ready:      { bg: "hsl(48, 96%, 53%)",  label: "Ready" },
  waiting:    { bg: "hsl(217, 91%, 60%)", label: "Waiting" },
  blocked:    { bg: "hsl(0, 84%, 60%)",   label: "Blocked" },
  terminated: { bg: "hsl(0, 0%, 45%)",    label: "Terminated" },
};

function priorityColor(p) {
  if (p <= 3) return "hsl(0, 84%, 60%)";
  if (p <= 6) return "hsl(48, 96%, 53%)";
  return "hsl(142, 71%, 45%)";
}

function generateRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 60 + Math.floor(Math.random() * 40);
  const lightness = 50 + Math.floor(Math.random() * 20);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/* ================================================================== */
/*  MAIN DASHBOARD                                                     */
/* ================================================================== */

export default function CoreSchedDashboard() {
  const sim = useSimulation(2);
  const {
    tasks, readyQueue, priorityQueue, resourceLocks, coreLoads,
    stateHistory, currentTick, isRunning, cores, speed,
    deadlockAnalysis, start, pause, step, reset, undo,
    addTask, setCores, setSpeed, checkTaskId, restoreState,
  } = sim;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [newTask, setNewTask] = useState({ name: "", priority: 5, burstTotal: 5 });
  const [idQuery, setIdQuery] = useState("");

  const resultsRef = useRef(null);

  const handleAddTask = () => {
    if (!newTask.name.trim()) { toast.error("Enter a task name!"); return; }
    addTask({ name: newTask.name, priority: parseInt(newTask.priority), burstTotal: parseInt(newTask.burstTotal) });
    setNewTask({ name: "", priority: 5, burstTotal: 5 });
    setPopoverOpen(false);
    toast.success(`Task "${newTask.name}" added!`);
  };

  const idResult = useMemo(() => {
    if (!idQuery.trim()) return null;
    return checkTaskId(idQuery.trim().toUpperCase());
  }, [idQuery, checkTaskId, tasks]);

  const activeIds = useMemo(
    () => tasks.filter((t) => t.status !== "terminated").map((t) => t.securityId),
    [tasks]
  );

  const hasResults = true;

  return (
    <div className="grid grid-cols-2 w-full max-w-full space-y-5 md:space-y-0 overflow-hidden justify-items-center">

      {/* ============================================================ */}
      {/*  LEFT COLUMN — Controls                                       */}
      {/* ============================================================ */}
      <div className="row-span-2 col-span-2 md:col-span-1 max-w-full md:pl-14 flex flex-col items-center px-4">
        <div className="md:max-w-[320px] border p-4 rounded-xl space-y-4">

          {/* Simulation Controls */}
          <div>
            <Label className="text-sm font-medium">Simulation Controls</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Control the CPU thread scheduler simulation.
            </p>

            {/* Playback Buttons */}
            <div className="flex gap-2 mb-3">
              <Button
                id="btn-play-pause"
                onClick={isRunning ? pause : start}
                className="flex-1"
                variant={isRunning ? "destructive" : "default"}
              >
                {isRunning ? <><Pause className="h-4 w-4 mr-1" /> Pause</> : <><Play className="h-4 w-4 mr-1" /> Start</>}
              </Button>
              <Button id="btn-step" variant="outline" size="icon" onClick={step} title="Step Forward">
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button id="btn-undo" variant="outline" size="icon" onClick={undo} disabled={stateHistory.length === 0} title="Undo">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button id="btn-reset" variant="outline" size="icon" onClick={reset} title="Reset">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Speed */}
            <div className="space-y-1 mb-3">
              <Label className="text-xs text-muted-foreground">Speed: {speed}ms / tick</Label>
              <input
                type="range" min="50" max="2000" step="50" value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full h-1.5 accent-white cursor-pointer"
              />
            </div>

            {/* Cores */}
            <div className="space-y-1 mb-3">
              <Label className="text-xs">CPU Cores</Label>
              <Select value={String(cores)} onValueChange={(v) => setCores(Number(v))}>
                <SelectTrigger id="core-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Core</SelectItem>
                  <SelectItem value="2">2 Cores</SelectItem>
                  <SelectItem value="4">4 Cores</SelectItem>
                  <SelectItem value="8">8 Cores</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Current Tick */}
            <div className="text-center p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">Current Tick</p>
              <motion.p
                key={currentTick}
                initial={{ y: -5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-2xl font-bold"
              >
                {currentTick}
              </motion.p>
            </div>
          </div>

          {/* Task ID Checker */}
          <div className="pt-2 border-t">
            <Label className="text-sm font-medium">Task ID Checker</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Verify a security ID instantly (O(1) lookup).
            </p>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="input-security-id"
                placeholder="e.g. SEC-A1B2"
                value={idQuery}
                onChange={(e) => setIdQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {idResult && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-md text-sm mb-2 ${
                  idResult.found
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}
              >
                {idResult.found ? (
                  <div>
                    <p className="font-medium">✅ Active — {idResult.task?.id}</p>
                    <p className="text-xs text-muted-foreground">{idResult.task?.name} • {idResult.task?.status} • Core {idResult.task?.coreId ?? "—"}</p>
                  </div>
                ) : (
                  <p>❌ Not found in active list</p>
                )}
              </motion.div>
            )}

            <div className="flex flex-wrap gap-1">
              {activeIds.map((sid) => (
                <button
                  key={sid}
                  onClick={() => setIdQuery(sid)}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground hover:bg-accent transition-colors cursor-pointer font-mono"
                >
                  {sid}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  RIGHT COLUMN — Task List                                     */}
      {/* ============================================================ */}
      <Card className="md:w-[500px] w-full max-w-full col-span-2 md:col-span-1 mx-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Tasks (Threads)</CardTitle>
              <CardDescription>Active threads in the virtual processor</CardDescription>
            </div>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" title="Add new task">
                  <Plus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">New Task</h4>
                  <div className="space-y-2">
                    <Label className="text-xs">Name</Label>
                    <Input placeholder="e.g. DataProcessor" value={newTask.name}
                      onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs">Priority (1-10)</Label>
                      <Input type="number" min={1} max={10} value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} />
                    </div>
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs">Burst Time</Label>
                      <Input type="number" min={1} max={20} value={newTask.burstTotal}
                        onChange={(e) => setNewTask({ ...newTask, burstTotal: e.target.value })} />
                    </div>
                  </div>
                  <Button size="sm" className="w-full" onClick={handleAddTask}>Add to Simulation</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 w-full">
          <div className="flex justify-start flex-wrap md:max-w-[500px]">
            {tasks.map((task, index) => (
              <div key={task.id} className="flex items-center justify-between space-x-4 p-2">
                <div className="flex items-center space-x-4">
                  <div
                    className="preview flex justify-center items-center p-1 h-[50px] w-[50px] rounded !bg-cover !bg-center transition-all"
                    style={{
                      background: task.color,
                      textShadow: "0 1px 3px rgba(0, 0, 0, 0.7)",
                    }}
                  >
                    <span className="text-white text-[10px] font-bold">{task.id}</span>
                  </div>
                  <div className="pt-1">
                    <p className="text-sm font-medium leading-none">{task.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Priority: {task.priority} • Burst: {task.burstRemaining}/{task.burstTotal}
                    </p>
                    <p className="text-xs" style={{ color: STATUS_COLORS[task.status]?.bg }}>
                      {STATUS_COLORS[task.status]?.label}
                      {task.coreId !== null && task.coreId !== undefined ? ` (Core ${task.coreId})` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col space-y-4 items-center">
            <Button
              onClick={() => {
                step();
                setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
              }}
              className="w-fit"
            >
              Step Simulation
            </Button>
            <Button onClick={reset} variant="outline" className="w-fit">
              Reset All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/*  RESULTS SECTION — All 8 Features in Tabs                     */}
      {/* ============================================================ */}
      {hasResults && (
        <div ref={resultsRef} className="col-span-2 flex flex-col items-center w-full px-4 space-y-6 mt-10">

          {/* Workload Balancer — Visual Bar (like Gantt Chart) */}
          <Card className="w-full max-w-5xl">
            <CardHeader>
              <CardTitle>CPU Workload Balancer</CardTitle>
              <CardDescription>Real-time CPU core utilization and load distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkloadBars coreLoads={coreLoads} tasks={tasks} />
            </CardContent>
          </Card>

          {/* Tabbed Feature Panels */}
          <Card className="w-full max-w-5xl mb-10">
            <CardContent className="pt-6">
              <Tabs defaultValue="status" className="w-full">
                <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 mb-6">
                  <TabsTrigger value="status">Status</TabsTrigger>
                  <TabsTrigger value="queue">Queue</TabsTrigger>
                  <TabsTrigger value="priority">Priority</TabsTrigger>
                  <TabsTrigger value="locks">Locks</TabsTrigger>
                  <TabsTrigger value="deadlock">Deadlock</TabsTrigger>
                  <TabsTrigger value="undo">Undo</TabsTrigger>
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                </TabsList>

                {/* Tab: Task Status Table */}
                <TabsContent value="status">
                  <TaskStatusTable tasks={tasks} />
                </TabsContent>

                {/* Tab: Ready Queue */}
                <TabsContent value="queue">
                  <ReadyQueueView readyQueue={readyQueue} />
                </TabsContent>

                {/* Tab: Priority Sorter */}
                <TabsContent value="priority">
                  <PrioritySortView priorityQueue={priorityQueue} />
                </TabsContent>

                {/* Tab: Resource Lock Map */}
                <TabsContent value="locks">
                  <ResourceLocksView resourceLocks={resourceLocks} tasks={tasks} />
                </TabsContent>

                {/* Tab: Deadlock Finder */}
                <TabsContent value="deadlock">
                  <DeadlockView deadlockAnalysis={deadlockAnalysis} tasks={tasks} />
                </TabsContent>

                {/* Tab: CPU State Undo */}
                <TabsContent value="undo">
                  <UndoHistoryView stateHistory={stateHistory} onRestore={restoreState} />
                </TabsContent>

                {/* Tab: Summary Stats */}
                <TabsContent value="stats">
                  <SummaryStatsView tasks={tasks} coreLoads={coreLoads} currentTick={currentTick} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  SUB-COMPONENTS (styled to match original project)                  */
/* ================================================================== */

/* --- Workload Bars (replaces Gantt chart visual) ------------------- */
function WorkloadBars({ coreLoads, tasks }) {
  const totalCapacity = coreLoads.length * 100;
  const totalUtil = coreLoads.reduce((s, c) => s + (c.utilization || 0), 0);

  const taskMap = {};
  tasks.forEach((t) => { taskMap[t.id] = t; });

  return (
    <div className="space-y-3">
      <motion.div
        className="flex space-x-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {coreLoads.map((core) => {
          const util = core.utilization || 0;
          const task = core.currentTask ? taskMap[core.currentTask] : null;
          const bg = task ? task.color : "transparent";
          const widthPct = Math.max(100 / coreLoads.length, 5);

          return (
            <motion.div
              key={core.id}
              className="relative flex flex-col items-center justify-end text-white text-xs font-medium rounded overflow-hidden border border-white/[0.05]"
              style={{
                width: `${widthPct}%`,
                height: "80px",
                backgroundColor: "hsl(240, 3.7%, 10%)",
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <motion.div
                className="absolute bottom-0 left-0 right-0"
                style={{ backgroundColor: bg }}
                initial={{ height: 0 }}
                animate={{ height: task ? "100%" : "0%" }}
                transition={{ duration: 0.3 }}
              />
              <div className="relative z-10 text-center py-1" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
                <div className="font-bold">Core {core.id}</div>
                <div className="text-[10px] font-semibold">{task ? "BUSY" : "IDLE"}</div>
                <div className="text-[9px] opacity-75">Avg: {util}%</div>
                {task && <div className="text-[9px] font-bold truncate max-w-[90%] mx-auto">{task.name}</div>}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Total Load: {Math.round(totalUtil / coreLoads.length)}%</span>
        <span>{coreLoads.length} cores active</span>
      </div>
    </div>
  );
}

/* --- Task Status Table --------------------------------------------- */
function TaskStatusTable({ tasks }) {
  const activeTasks = tasks.filter((t) => t.status !== "terminated");
  const terminated = tasks.filter((t) => t.status === "terminated");

  return (
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px] text-center"><p className="text-xs md:text-sm">Task ID</p></TableHead>
            <TableHead className="text-center"><p className="text-xs md:text-sm">Name</p></TableHead>
            <TableHead className="text-center"><p className="text-xs md:text-sm">Status</p></TableHead>
            <TableHead className="text-center"><p className="text-xs md:text-sm">Priority</p></TableHead>
            <TableHead className="text-center"><p className="text-xs md:text-sm">Core</p></TableHead>
            <TableHead className="text-center"><p className="text-xs md:text-sm">Burst Left</p></TableHead>
            <TableHead className="text-center"><p className="text-xs md:text-sm">Resources</p></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const sc = STATUS_COLORS[task.status];
            return (
              <TableRow key={task.id}>
                <TableCell className="font-medium flex justify-center">
                  <div className="preview flex justify-center items-center p-1 h-[25px] w-[25px] rounded transition-all"
                    style={{ background: task.color, textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>
                    <span className="text-white text-[8px] font-bold">{task.id.replace("T-", "")}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center text-xs">{task.name}</TableCell>
                <TableCell className="text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                    style={{ backgroundColor: sc?.bg }}>
                    {sc?.label}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-block w-6 h-6 rounded text-xs font-bold leading-6 text-white text-center"
                    style={{ backgroundColor: priorityColor(task.priority) }}>
                    {task.priority}
                  </span>
                </TableCell>
                <TableCell className="text-center text-xs">
                  {task.coreId !== null && task.coreId !== undefined ? `C${task.coreId}` : "—"}
                </TableCell>
                <TableCell className="text-center text-xs">{task.burstRemaining}/{task.burstTotal}</TableCell>
                <TableCell className="text-center text-xs">
                  {task.resourcesHeld.length > 0 ? task.resourcesHeld.join(", ") : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="pl-3 text-xs">
              Total: {tasks.length} tasks ({activeTasks.length} active, {terminated.length} terminated)
            </TableCell>
            <TableCell colSpan={4} />
          </TableRow>
        </TableFooter>
      </Table>
    </motion.div>
  );
}

/* --- Ready Queue View ---------------------------------------------- */
function ReadyQueueView({ readyQueue }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-6">
      <h3 className="text-lg font-semibold mb-2">Task Waiting Line (FIFO Queue)</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Tasks lined up in the exact order they requested execution.
      </p>
      {readyQueue.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm border rounded-xl">
          Queue is empty — no tasks waiting
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto pb-4">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Next →</span>
          {readyQueue.map((task, idx) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="flex flex-col p-3 rounded-lg border min-w-[100px]"
              style={{ borderLeftColor: task.color, borderLeftWidth: "4px" }}
            >
              <span className="text-xs font-bold">{task.id}</span>
              <span className="text-xs text-muted-foreground">{task.name}</span>
              <span className="text-[10px] mt-1" style={{ color: priorityColor(task.priority) }}>
                Priority {task.priority} • {task.burstRemaining}t
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* --- Priority Sort View -------------------------------------------- */
function PrioritySortView({ priorityQueue }) {
  const active = priorityQueue.filter((t) => t.status !== "terminated");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px] text-center"><p className="text-xs md:text-sm">Rank</p></TableHead>
            <TableHead className="w-[80px] text-center"><p className="text-xs md:text-sm">Task</p></TableHead>
            <TableHead className="text-center"><p className="text-xs md:text-sm">Name</p></TableHead>
            <TableHead className="text-center"><p className="text-xs md:text-sm">Priority</p></TableHead>
            <TableHead className="text-center"><p className="text-xs md:text-sm">Status</p></TableHead>
            <TableHead className="text-center"><p className="text-xs md:text-sm">Level</p></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {active.map((task, idx) => (
            <TableRow key={task.id}>
              <TableCell className="text-center font-bold text-muted-foreground">#{idx + 1}</TableCell>
              <TableCell className="font-medium flex justify-center">
                <div className="preview flex justify-center items-center p-1 h-[25px] w-[25px] rounded"
                  style={{ background: task.color }}><span className="text-white text-[8px] font-bold">{task.id.replace("T-", "")}</span></div>
              </TableCell>
              <TableCell className="text-center text-xs">{task.name}</TableCell>
              <TableCell className="text-center">
                <span className="inline-block w-6 h-6 rounded text-xs font-bold leading-6 text-white text-center"
                  style={{ backgroundColor: priorityColor(task.priority) }}>{task.priority}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                  style={{ backgroundColor: STATUS_COLORS[task.status]?.bg }}>{STATUS_COLORS[task.status]?.label}</span>
              </TableCell>
              <TableCell className="text-center text-xs">
                {task.priority <= 3 ? "🔴 Critical" : task.priority <= 6 ? "🟡 Medium" : "🟢 Low"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={6} className="text-xs text-center text-muted-foreground">
              Sorted using Min-Heap data structure • {active.length} active tasks
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </motion.div>
  );
}

/* --- Resource Locks View ------------------------------------------- */
function ResourceLocksView({ resourceLocks, tasks }) {
  if (!resourceLocks?.resources) return <div className="text-center py-10 text-muted-foreground text-sm">No lock data</div>;

  const { resources, tasks: taskIds, matrix } = resourceLocks;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs sticky left-0 bg-background z-10">Resource</TableHead>
            {taskIds.map((tid) => (
              <TableHead key={tid} className="text-center text-[10px] font-mono">{tid}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.map((res, ri) => (
            <TableRow key={res}>
              <TableCell className="text-xs font-medium sticky left-0 bg-background z-10">{res}</TableCell>
              {matrix[ri]?.map((locked, ci) => (
                <TableCell key={ci} className={`text-center ${locked ? "bg-red-500/10" : ""}`}>
                  {locked ? <Lock className="h-3.5 w-3.5 text-red-400 mx-auto" /> : <span className="text-muted-foreground/20">·</span>}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={taskIds.length + 1} className="text-xs text-center text-muted-foreground">
              <Lock className="h-3 w-3 inline mr-1 text-red-400" /> = Locked by task • Resources locked prevent other tasks from using them
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </motion.div>
  );
}

/* --- Deadlock Finder View ------------------------------------------ */
function DeadlockView({ deadlockAnalysis, tasks }) {
  const graph = deadlockAnalysis?.graph || { nodes: [], edges: [] };
  const hasCycle = deadlockAnalysis?.hasCycle || false;
  const cycle = deadlockAnalysis?.cycle || [];
  const releaseOrder = deadlockAnalysis?.releaseOrder || [];

  const taskColorMap = {};
  tasks.forEach((t) => { taskColorMap[t.id] = t.color; });

  // Circular SVG layout
  const count = graph.nodes.length;
  const cx = 120, cy = 100, r = 70;
  const pos = {};
  graph.nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    pos[node] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Deadlock Analysis</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          hasCycle ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
        }`}>
          {hasCycle ? "⚠️ Deadlock Detected" : "✅ No Deadlock"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Graph */}
        <div className="border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Wait-For Graph</p>
          {graph.nodes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No dependencies</p>
          ) : (
            <svg viewBox="0 0 240 200" className="w-full max-h-[200px]">
              <defs>
                <marker id="arr" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="hsl(240, 5%, 55%)" />
                </marker>
                <marker id="arr-r" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="#ef4444" />
                </marker>
              </defs>
              {graph.edges.map((e, i) => {
                const f = pos[e.from], t = pos[e.to];
                if (!f || !t) return null;
                const dx = t.x - f.x, dy = t.y - f.y, d = Math.sqrt(dx*dx+dy*dy), off = 16;
                const isCyc = cycle.includes(e.from) && cycle.includes(e.to);
                return <line key={i} x1={f.x+dx/d*off} y1={f.y+dy/d*off} x2={t.x-dx/d*off} y2={t.y-dy/d*off}
                  stroke={isCyc ? "#ef4444" : "hsl(240,5%,35%)"} strokeWidth={isCyc?2:1} markerEnd={isCyc?"url(#arr-r)":"url(#arr)"}/>;
              })}
              {graph.nodes.map((n) => {
                const p = pos[n]; if (!p) return null;
                return <g key={n}>
                  <circle cx={p.x} cy={p.y} r={14} fill={taskColorMap[n]||"hsl(240,5%,25%)"} stroke={cycle.includes(n)?"#ef4444":"hsl(240,5%,40%)"} strokeWidth={cycle.includes(n)?2:1}/>
                  <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="8" fontFamily="monospace" fontWeight="bold">{n}</text>
                </g>;
              })}
            </svg>
          )}
        </div>

        {/* Release Order */}
        <div className="border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Optimal Release Order (Topological Sort)</p>
          {releaseOrder.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No release order needed</p>
          ) : (
            <div className="space-y-2">
              {releaseOrder.map((tid, idx) => (
                <motion.div key={tid} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="flex items-center gap-3 p-2 rounded border">
                  <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}.</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: taskColorMap[tid] || "#888" }} />
                  <span className="text-sm font-mono">{tid}</span>
                  <span className="text-xs text-muted-foreground">→ release locks</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* --- Undo History View --------------------------------------------- */
function UndoHistoryView({ stateHistory, onRestore }) {
  const reversed = [...stateHistory].reverse();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[70px] text-center"><p className="text-xs">Tick</p></TableHead>
            <TableHead className="text-center"><p className="text-xs">Context Switch</p></TableHead>
            <TableHead className="text-center"><p className="text-xs">PC</p></TableHead>
            <TableHead className="text-center"><p className="text-xs">SP</p></TableHead>
            <TableHead className="text-center"><p className="text-xs">FLAGS</p></TableHead>
            <TableHead className="w-[80px] text-center"><p className="text-xs">Action</p></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reversed.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                No context switches yet — step the simulation
              </TableCell>
            </TableRow>
          ) : (
            reversed.map((snap, i) => {
              const realIdx = stateHistory.length - 1 - i;
              return (
                <TableRow key={`${snap.tick}-${i}`}>
                  <TableCell className="text-center font-mono text-xs">{snap.tick}</TableCell>
                  <TableCell className="text-center text-xs">
                    {snap.swappedOut && <span className="text-red-400">{snap.swappedOut}</span>}
                    {snap.swappedOut && snap.swappedIn && " → "}
                    {snap.swappedIn && <span className="text-emerald-400">{snap.swappedIn}</span>}
                    {!snap.swappedOut && !snap.swappedIn && <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">{snap.registers?.PC || "—"}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{snap.registers?.SP || "—"}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{snap.registers?.FLAGS || "—"}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => onRestore(realIdx)}>
                      Restore
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </motion.div>
  );
}

/* --- Summary Stats View -------------------------------------------- */
function SummaryStatsView({ tasks, coreLoads, currentTick }) {
  const active = tasks.filter((t) => t.status !== "terminated").length;
  const terminated = tasks.filter((t) => t.status === "terminated").length;
  const avgUtil = coreLoads.length > 0
    ? Math.round(coreLoads.reduce((s, c) => s + (c.utilization || 0), 0) / coreLoads.length)
    : 0;
  const throughput = currentTick > 0
    ? Math.round((terminated / currentTick) * 100) / 100
    : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col justify-evenly items-center pt-6">
      <div className="flex justify-evenly w-full text-center">
        <div className="text-sm md:text-lg">
          <AnimatedShinyText>Total Tasks</AnimatedShinyText>
          {tasks.length}
        </div>
        <div className="text-sm md:text-lg">
          <AnimatedShinyText>Active</AnimatedShinyText>
          {active}
        </div>
        <div className="text-sm md:text-lg">
          <AnimatedShinyText>Terminated</AnimatedShinyText>
          {terminated}
        </div>
      </div>
      <div className="flex justify-evenly w-full text-center mt-4">
        <div className="text-sm md:text-lg">
          <AnimatedShinyText>Throughput</AnimatedShinyText>
          {throughput} tasks/tick
        </div>
        <div className="text-sm md:text-lg">
          <AnimatedShinyText>Avg CPU Utilization</AnimatedShinyText>
          {avgUtil}%
        </div>
        <div className="text-sm md:text-lg">
          <AnimatedShinyText>Simulation Tick</AnimatedShinyText>
          {currentTick}
        </div>
      </div>
    </motion.div>
  );
}
