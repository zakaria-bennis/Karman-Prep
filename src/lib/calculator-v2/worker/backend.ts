// Compute backends (AR-43, AR-45, AR-49, AR-50). The worker backend owns one compute worker,
// replaces it when it falls silent during a job (AR-49) and falls back to the main thread when it
// cannot start (AR-50). The main-thread backend runs the same Executor in the AR-47 slices with
// the AR-48 deadlines and delivers each of its posts synchronously, in post order.

import { bumpDevCounter } from "../dev-counters";
import { createComputeWorker } from "./create";
import { Executor, type ExecutorTiming } from "./executor";
import { isWorkerMessage, type MainToWorker, type WorkerToMain } from "./protocol";

export interface ComputeBackend {
  readonly kind: "worker" | "main-thread";
  post(message: MainToWorker): void;
  onMessage(listener: (message: WorkerToMain) => void): () => void;
  dispose(): void; // idempotent; terminates the worker
}

export interface WorkerBackendOptions {
  createWorker: () => Worker; // default from create.ts
  watchdogMs: number; // 1500 (AR-49)
  readyTimeoutMs: number; // 3000 (AR-50)
}

const DEFAULT_WATCHDOG_MS = 1500; // AR-49
const DEFAULT_READY_TIMEOUT_MS = 3000; // AR-50
const DISPOSE: MainToWorker = { v: 1, type: "dispose" };

type Listener = (message: WorkerToMain) => void;
type Timer = ReturnType<typeof setTimeout>;
type Recordable = Exclude<MainToWorker, { type: "dispose" }>;
type StateMessage = Extract<MainToWorker, { type: "state" }>;
type ViewMessage = Extract<MainToWorker, { type: "view" }>;
type HelloMessage = Extract<MainToWorker, { type: "hello" }>;
type EvaluateMessage = Extract<MainToWorker, { type: "evaluate" }>;

/** A backend's listeners; `emit` calls each one synchronously, in subscription order. */
function listenerSet() {
  const listeners = new Set<Listener>();
  return {
    add(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(message: WorkerToMain): void {
      for (const listener of [...listeners]) listener(message);
    },
    clear(): void {
      listeners.clear();
    },
  };
}

/**
 * The main-thread backend with `timing` passed to its Executor (package-internal; tests pass a
 * fake clock or yield). Its `dispose()` passes `dispose` to the executor, which stops its loop
 * and closes its channel, then drops the listeners.
 */
export function createMainThreadBackendWith(timing: Partial<ExecutorTiming>): ComputeBackend {
  const listeners = listenerSet();
  const executor = new Executor({ post: (message) => listeners.emit(message) }, timing);
  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    executor.receive(DISPOSE);
    listeners.clear();
  };
  return {
    kind: "main-thread",
    post: (message) => (message.type === "dispose" ? dispose() : executor.receive(message)),
    onMessage: (listener) => listeners.add(listener),
    dispose,
  };
}

/** The same Executor on the main thread with its default timing: the AR-47 slices and heartbeats. */
export function createMainThreadBackend(): ComputeBackend {
  return createMainThreadBackendWith({});
}

/**
 * Each worker is in one of two phases. Before its `ready` only the ready timer runs (AR-50):
 * posts are forwarded and recorded but never arm the watchdog. After it only the watchdog runs
 * (AR-49): armed on `ready` or on a post that makes the backend active, re-armed by every worker
 * message while active, cleared when idle. Posts never re-arm it.
 */
class WorkerBackend implements ComputeBackend {
  private readonly options: WorkerBackendOptions;
  private readonly listeners = listenerSet();
  private worker: Worker | null = null;
  private ready = false;
  private readyTimer: Timer | null = null;
  private watchdog: Timer | null = null;
  private mainThread: ComputeBackend | null = null;
  private disposed = false;
  // What a new worker or the main-thread fallback is replayed: the last hello, state and view and
  // the pending helper jobs (each dropped when its value arrives).
  private hello: HelloMessage | null = null;
  private state: StateMessage | null = null;
  private view: ViewMessage | null = null;
  private readonly jobs = new Map<number, EvaluateMessage>();
  /** The generation of the latest state or view posted, and whether its `done` has arrived. */
  private latestGeneration = 0;
  private latestDone = true;
  /** The row of the last `begin`, until a value, plot or overrun for it or any `done`. */
  private lastBegin: string | null = null;
  /** AR-49 quarantine: row id → its latex; the row is left out of every state until that changes. */
  private readonly quarantine = new Map<string, string>();

  constructor(options: WorkerBackendOptions) {
    this.options = options;
    this.spawn();
  }

  get kind(): "worker" | "main-thread" {
    return this.mainThread === null ? "worker" : "main-thread";
  }

  post(message: MainToWorker): void {
    if (this.disposed) return;
    if (message.type === "dispose") return this.dispose();
    const wasActive = this.isActive();
    this.forward(this.record(message));
    if (this.ready && !wasActive && this.isActive()) this.armWatchdog();
  }

  onMessage(listener: Listener): () => void {
    return this.listeners.add(listener);
  }

  /** Posts `dispose` to the current worker, terminates it, clears both timers and drops the listeners. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.worker?.postMessage(DISPOSE);
    this.retire();
    this.mainThread?.dispose();
    this.clearTimers();
    this.listeners.clear();
  }

  /**
   * A job is active while the latest state or view generation has no `done`, or a helper job is
   * pending. Nothing is active before the first state, as the executor does nothing until then.
   */
  private isActive(): boolean {
    return this.state !== null && (!this.latestDone || this.jobs.size > 0);
  }

  /** Records a message for replay and returns what to forward (a state without quarantined rows). */
  private record(message: Recordable): MainToWorker {
    switch (message.type) {
      case "hello":
        this.hello = message;
        return message;
      case "state":
        this.state = message;
        this.noteGeneration(message.generation);
        // The executor drops older jobs on a state; the engine re-issues every helper after it.
        for (const [jobId, job] of this.jobs) {
          if (job.generation < message.generation) this.jobs.delete(jobId);
        }
        for (const row of message.rows) {
          const latex = this.quarantine.get(row.id);
          if (latex !== undefined && latex !== row.latex) this.quarantine.delete(row.id);
        }
        return this.withoutQuarantined(message);
      case "view":
        this.view = message;
        this.noteGeneration(message.generation);
        return message;
      case "evaluate":
        // The executor drops an evaluate older than the latest state on receipt.
        if (this.state === null || message.generation >= this.state.generation) {
          this.jobs.set(message.jobId, message);
        }
        return message;
    }
  }

  private noteGeneration(generation: number): void {
    this.latestGeneration = generation;
    this.latestDone = false;
  }

  private withoutQuarantined(state: StateMessage): StateMessage {
    if (this.quarantine.size === 0) return state;
    const rows = state.rows.filter((row) => this.quarantine.get(row.id) !== row.latex);
    return { ...state, rows };
  }

  private forward(message: MainToWorker): void {
    if (this.mainThread !== null) this.mainThread.post(message);
    else this.worker?.postMessage(message);
  }

  /** Sends the hello, the quarantined state, the view and the pending jobs to the current target. */
  private replay(): void {
    if (this.hello !== null) this.forward(this.hello);
    if (this.state !== null) this.forward(this.withoutQuarantined(this.state));
    if (this.view !== null) this.forward(this.view);
    for (const job of this.jobs.values()) this.forward(job);
  }

  /** Constructs the next worker in its before-ready phase and replays to it; falls back if it throws. */
  private spawn(): void {
    let worker: Worker;
    try {
      worker = this.options.createWorker();
    } catch {
      return this.fallBack();
    }
    bumpDevCounter("workers", 1);
    this.worker = worker;
    this.ready = false;
    worker.onmessage = (e: MessageEvent<unknown>) => this.receive(worker, e.data);
    worker.onerror = (e: ErrorEvent) => this.onError(worker, e);
    this.readyTimer = setTimeout(() => {
      this.readyTimer = null;
      this.fallBack();
    }, this.options.readyTimeoutMs);
    this.replay();
  }

  /** Detaches and terminates the current worker without posting `dispose`. */
  private retire(): void {
    const worker = this.worker;
    if (worker === null) return;
    this.worker = null;
    this.ready = false;
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
    bumpDevCounter("workers", -1);
  }

  /** AR-50: runs the same executor on the main thread and replays the recorded messages into it. */
  private fallBack(): void {
    this.clearTimers();
    this.retire();
    const mainThread = createMainThreadBackend();
    mainThread.onMessage((message) => this.listeners.emit(message));
    this.mainThread = mainThread;
    this.replay();
  }

  /** Before `ready` a worker error falls back and suppresses the default report. */
  private onError(worker: Worker, event: ErrorEvent): void {
    if (worker !== this.worker || this.ready) return;
    event.preventDefault();
    this.fallBack();
  }

  private receive(worker: Worker, data: unknown): void {
    if (worker !== this.worker || !isWorkerMessage(data)) return;
    if (data.type === "ready" && !this.ready) {
      this.ready = true;
      this.clearReadyTimer();
    }
    this.track(data);
    if (this.ready) {
      if (this.isActive()) this.armWatchdog();
      else this.clearWatchdog();
    }
    this.listeners.emit(data);
  }

  private track(message: WorkerToMain): void {
    switch (message.type) {
      case "begin":
        this.lastBegin = message.rowId;
        break;
      case "value":
        if (message.jobId !== null) this.jobs.delete(message.jobId);
        if (message.rowId !== null && message.rowId === this.lastBegin) this.lastBegin = null;
        break;
      case "plot":
      case "overrun":
        if (message.rowId === this.lastBegin) this.lastBegin = null;
        break;
      case "done":
        this.lastBegin = null;
        if (message.generation === this.latestGeneration) this.latestDone = true;
        break;
    }
  }

  /**
   * AR-49: terminates the silent worker, quarantines the last `begin` row with the latex it has
   * in the latest state and posts its synthetic `overrun` at the latest generation (so the engine
   * accepts it), then starts the next worker and replays to it.
   */
  private onWatchdog(): void {
    this.watchdog = null;
    this.retire();
    const rowId = this.lastBegin;
    this.lastBegin = null;
    if (rowId !== null) {
      const row = this.state?.rows.find((r) => r.id === rowId);
      if (row !== undefined) this.quarantine.set(rowId, row.latex);
      this.listeners.emit({ v: 1, type: "overrun", generation: this.latestGeneration, rowId });
    }
    this.spawn();
  }

  private armWatchdog(): void {
    this.clearWatchdog();
    this.watchdog = setTimeout(() => this.onWatchdog(), this.options.watchdogMs);
  }

  private clearWatchdog(): void {
    if (this.watchdog !== null) clearTimeout(this.watchdog);
    this.watchdog = null;
  }

  private clearReadyTimer(): void {
    if (this.readyTimer !== null) clearTimeout(this.readyTimer);
    this.readyTimer = null;
  }

  private clearTimers(): void {
    this.clearReadyTimer();
    this.clearWatchdog();
  }
}

/**
 * One compute worker per backend (AR-43), replaced after 1,500 ms of silence during a job with
 * its last `begin` row quarantined (AR-49), and the main thread when the worker cannot start
 * (AR-50). Bumps the `workers` dev counter where a worker is constructed or terminated.
 */
export function createWorkerBackend(options: Partial<WorkerBackendOptions> = {}): ComputeBackend {
  return new WorkerBackend({
    createWorker: options.createWorker ?? createComputeWorker,
    watchdogMs: options.watchdogMs ?? DEFAULT_WATCHDOG_MS,
    readyTimeoutMs: options.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS,
  });
}
