// The calculator v2 executor (AR-45, AR-46, AR-47). One loop runs the latest state's values pass,
// the queued helper jobs and the latest view's plots as units of work. After each unit it yields to
// the event loop once the 8 ms slice is spent, and it abandons a superseded generation at its next
// yield. The same class runs in the worker and on the main thread (AR-50). Pure TypeScript: no DOM.

import type { ViewSpec } from "../plot/viewport";
import { runHelper, runPlot, runValuesPass, type PassContext, type ValuesOutcome } from "./pass";
import { WORKER_MARKER, type MainToWorker, type WorkerToMain } from "./protocol";
import { SliceClock, type ExecutorTiming } from "./slice";
import { messageChannelYield } from "./yield";

export type { ExecutorTiming } from "./slice";

export interface ExecutorPort {
  post(message: WorkerToMain, transfer: ArrayBuffer[]): void;
}

type StateMessage = Extract<MainToWorker, { type: "state" }>;
type HelperJob = Omit<Extract<MainToWorker, { type: "evaluate" }>, "v" | "type">;
/** What the loop does after a unit: go on, start a new iteration, or stop because disposed. */
type Next = "go" | "restart" | "stop";

const DEFAULT_SLICE_MS = 8; // AR-47
const DEFAULT_HEARTBEAT_MS = 200; // AR-47

/** AR-54: a fault names only the error type, never its message. */
const faultName = (thrown: unknown): string =>
  thrown instanceof Error ? thrown.name : typeof thrown;

export class Executor {
  private readonly port: ExecutorPort;
  private readonly timing: ExecutorTiming;
  private readonly clock: SliceClock;
  /** The MessageChannel yield this executor made itself; null when the timing supplied one. */
  private readonly ownedYield: { close(): void } | null;
  private disposed = false;
  private running = false;
  private readyPending = false;
  /** The highest generation received in a `state` or `view`. */
  private latestGeneration = 0;
  /** The generation of the iteration now running; heartbeats carry it. */
  private runningGeneration = 0;
  private state: StateMessage | null = null;
  private view: ViewSpec | null = null;
  private jobs: HelperJob[] = [];
  private outcome: ValuesOutcome | null = null;
  private valuesFor: StateMessage | null = null;
  private plottedFor: number | null = null;
  private doneFor: number | null = null;

  constructor(port: ExecutorPort, timing: Partial<ExecutorTiming> = {}) {
    this.port = port;
    let { yieldToEventLoop } = timing;
    if (yieldToEventLoop === undefined) {
      const owned = messageChannelYield();
      this.ownedYield = owned;
      yieldToEventLoop = owned.yieldToEventLoop;
    } else {
      this.ownedYield = null;
    }
    this.timing = {
      now: timing.now ?? (() => performance.now()),
      yieldToEventLoop,
      sliceMs: timing.sliceMs ?? DEFAULT_SLICE_MS,
      heartbeatMs: timing.heartbeatMs ?? DEFAULT_HEARTBEAT_MS,
    };
    this.clock = new SliceClock(this.timing, () =>
      this.post({ v: 1, type: "heartbeat", generation: this.runningGeneration })
    );
  }

  /**
   * Records a message and starts the loop when it is idle; never posts and never computes here.
   * An `evaluate` older than the latest `state` is dropped, and a `state` drops queued jobs of
   * older generations (the engine re-issues every helper after each `state`). After `dispose`
   * every message is ignored.
   */
  receive(message: MainToWorker): void {
    if (this.disposed) return;
    switch (message.type) {
      case "hello":
        this.readyPending = true;
        break;
      case "state":
        this.state = message;
        this.latestGeneration = Math.max(this.latestGeneration, message.generation);
        this.jobs = this.jobs.filter((job) => job.generation >= message.generation);
        break;
      case "view":
        this.view = { viewport: message.viewport, size: message.size, dpr: message.dpr };
        this.latestGeneration = Math.max(this.latestGeneration, message.generation);
        break;
      case "evaluate": {
        if (this.state !== null && message.generation < this.state.generation) return;
        const { jobId, generation, latex } = message;
        this.jobs.push({ jobId, generation, latex });
        break;
      }
      case "dispose":
        this.dispose();
        return;
    }
    this.start();
  }

  /** Stops the loop at its next await, forgets queued work and closes the owned channel. */
  private dispose(): void {
    this.disposed = true;
    this.jobs = [];
    this.readyPending = false;
    this.ownedYield?.close();
  }

  /** Every post goes through here, so the slice clock knows when the last message left. */
  private post(message: WorkerToMain, transfer: ArrayBuffer[] = []): void {
    if (this.disposed) return;
    this.port.post(message, transfer);
    this.clock.notePost();
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    // run() calls yieldToEventLoop() synchronously as its first statement. Units turn their own
    // throws into faults; anything else ends this run with a fault rather than an unhandled
    // rejection (AR-54), and the next receive starts a new run.
    this.run().catch((thrown: unknown) => {
      this.running = false;
      const message = faultName(thrown);
      this.post({ v: 1, type: "fault", generation: this.runningGeneration, message });
    });
  }

  /** Each iteration opens with a yield; a superseded iteration restarts from that yield. */
  private async run(): Promise<void> {
    for (;;) {
      await this.timing.yieldToEventLoop();
      if (this.disposed) return;
      this.clock.startSlice();
      if ((await this.iterate(this.latestGeneration)) !== "restart") return;
    }
  }

  /**
   * One iteration for generation `gen` (AR-46 message order): `ready` if a `hello` is pending,
   * the values pass when the state changed, every queued helper job, the plots of every graphable
   * row when the view's generation has not been plotted, then `done`. Goes idle when `gen` is
   * still the latest and no job waits.
   */
  private async iterate(gen: number): Promise<"idle" | "restart" | "stop"> {
    this.runningGeneration = gen;
    const ctx: PassContext = {
      generation: gen,
      clock: this.clock,
      now: () => this.timing.now(),
      post: (message, transfer) => this.post(message, transfer), // non-plot posts pass no transfer
    };
    if (this.readyPending) {
      this.readyPending = false;
      this.post({ v: 1, type: "ready", worker: WORKER_MARKER });
    }
    const state = this.state;
    if (state !== null && this.valuesFor !== state) {
      this.outcome = runValuesPass(state.rows, state.settings, ctx);
      this.valuesFor = state;
      const next = await this.afterUnit(gen);
      if (next !== "go") return next;
    }
    while (this.outcome !== null && this.jobs.length > 0) {
      runHelper(this.jobs.shift()!, this.outcome, ctx);
      const next = await this.afterUnit(gen);
      if (next !== "go") return next;
    }
    const outcome = this.outcome,
      view = this.view;
    if (outcome !== null && view !== null && this.plottedFor !== gen) {
      for (const row of outcome.analysis.rows) {
        if (!row.isGraphable) continue;
        runPlot(row, outcome, view, ctx);
        const next = await this.afterUnit(gen);
        if (next !== "go") return next;
      }
      this.plottedFor = gen;
    }
    if (this.state !== null && this.doneFor !== gen) {
      this.post({ v: 1, type: "done", generation: gen });
      this.doneFor = gen;
    }
    // A job with no values pass yet waits for the first state rather than spinning the loop.
    if (gen === this.latestGeneration && (this.jobs.length === 0 || this.outcome === null)) {
      this.running = false; // idle: the next receive starts the loop with its first yield
      return "idle";
    }
    return "restart";
  }

  /**
   * After every unit (AR-46, AR-47): restart when a newer generation arrived; otherwise, once the
   * slice is spent, pulse the heartbeat, yield, start a new slice and check the generation again.
   */
  private async afterUnit(gen: number): Promise<Next> {
    if (this.disposed) return "stop";
    if (gen !== this.latestGeneration) return "restart";
    if (!this.clock.shouldYield()) return "go";
    this.clock.pulse();
    await this.timing.yieldToEventLoop();
    if (this.disposed) return "stop";
    this.clock.startSlice();
    return gen === this.latestGeneration ? "go" : "restart";
  }
}
