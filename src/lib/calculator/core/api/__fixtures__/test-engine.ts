// Test-only engine harness: a fake compute backend that
// records posts and delivers emitted messages synchronously, and an engine wired to it (or to the
// real main-thread backend) with a manual frame queue, a manual clock and fixed random seeds.
// Imported by the engine tests, the list tests and the transfer tests; never by production code.

import { defaultViewport, type ViewSpec } from "../../../plot/viewport";
import { createMainThreadBackend, type ComputeBackend } from "../../../worker/backend";
import { macrotask } from "../../../worker/__fixtures__/messages";
import type { MainToWorker, WorkerToMain } from "../../../worker/protocol";
import { CalculatorEngine } from "../engine";
import type { CalculatorOptions } from "../types";

export interface FakeBackend extends ComputeBackend {
  readonly posted: MainToWorker[];
  readonly disposed: boolean;
  emit(message: WorkerToMain): void;
}

/**
 * A backend of kind "worker" that computes nothing. `post` records every message, `emit` delivers
 * a message to the current listeners synchronously, and `dispose` only sets `disposed`, so a test
 * can still deliver late results to an engine that has let its backend go.
 */
export function createFakeBackend(): FakeBackend {
  const posted: MainToWorker[] = [];
  const listeners = new Set<(message: WorkerToMain) => void>();
  let disposed = false;
  return {
    kind: "worker",
    posted,
    get disposed() {
      return disposed;
    },
    post(message) {
      posted.push(message);
    },
    onMessage(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      disposed = true;
    },
    emit(message) {
      for (const listener of [...listeners]) listener(message);
    },
  };
}

export interface TestEngine {
  engine: CalculatorEngine;
  backend: FakeBackend | null; // null with the main-thread backend
  posted: MainToWorker[];
  received: WorkerToMain[];
  emit(message: WorkerToMain): void; // fake backend only
  flushFrames(): void; // runs queued scheduleFrame callbacks, including ones they queue
  advance(ms: number): void; // advances deps.now
  settled(): Promise<void>; // main-thread: polls with macrotask() until done for the latest state/view generation and a value for every live job, then flushFrames(); rejects after 10,000 ms of performance.now() time
  latestGeneration(): number;
}

const SIZE = { width: 800, height: 600 };
/** The default 800×600 view at dpr 1: x from −10 to 10, y from −7.5 to 7.5. */
export const TEST_VIEW: ViewSpec = { viewport: defaultViewport(SIZE), size: SIZE, dpr: 1 };

const SETTLED_LIMIT_MS = 10_000;
/** flushFrames gives up after this many rounds of frames queueing frames. */
const FRAME_ROUNDS_LIMIT = 100;

/** The main-thread backend, with every post recorded before it reaches the executor. */
function recordedMainThread(posted: MainToWorker[]): ComputeBackend {
  const inner = createMainThreadBackend();
  return {
    get kind() {
      return inner.kind;
    },
    post(message) {
      posted.push(message);
      inner.post(message);
    },
    onMessage: (listener) => inner.onMessage(listener),
    dispose: () => inner.dispose(),
  };
}

/** The generation of the last `state` or `view` in `posted`; 0 before any. */
function lastGeneration(posted: readonly MainToWorker[]): number {
  for (let i = posted.length - 1; i >= 0; i--) {
    const m = posted[i];
    if (m.type === "state" || m.type === "view") return m.generation;
  }
  return 0;
}

/**
 * True when `received` holds `done` for the latest state or view generation and a value for every
 * `evaluate` posted after the last `state` (the engine re-issues every live helper after a state).
 */
function isSettled(posted: readonly MainToWorker[], received: readonly WorkerToMain[]): boolean {
  const generation = lastGeneration(posted);
  if (!received.some((m) => m.type === "done" && m.generation === generation)) return false;
  let lastState = -1;
  posted.forEach((m, i) => {
    if (m.type === "state") lastState = i;
  });
  const answered = new Set(
    received.flatMap((m) => (m.type === "value" && m.jobId !== null ? [m.jobId] : []))
  );
  return posted.slice(lastState + 1).every((m) => m.type !== "evaluate" || answered.has(m.jobId));
}

export function createTestEngine(
  options?: CalculatorOptions,
  config: { backend?: "fake" | "main-thread"; randomSeeds?: number[] } = {}
): TestEngine {
  const fake = (config.backend ?? "fake") === "fake" ? createFakeBackend() : null;
  const posted: MainToWorker[] = fake ? fake.posted : [];
  const received: WorkerToMain[] = [];
  const backend = fake ?? recordedMainThread(posted);
  backend.onMessage((message) => received.push(message));

  let time = 0,
    seedCalls = 0;
  const frames: (() => void)[] = [];
  const flushFrames = (): void => {
    for (let round = 0; frames.length > 0; round++) {
      if (round >= FRAME_ROUNDS_LIMIT) throw new Error("flushFrames: frames keep queueing frames");
      for (const callback of frames.splice(0)) callback();
    }
  };

  const engine = new CalculatorEngine(options, {
    backend,
    scheduleFrame: (callback) => {
      frames.push(callback);
    },
    now: () => time,
    randomSeed: () => {
      const call = seedCalls++;
      return config.randomSeeds?.[call] ?? call + 1; // default 1, 2, 3, …
    },
  });

  return {
    engine,
    backend: fake,
    posted,
    received,
    emit(message) {
      if (fake === null) throw new Error("emit needs the fake backend");
      fake.emit(message);
    },
    flushFrames,
    advance(ms) {
      time += ms;
    },
    async settled() {
      if (fake === null) {
        const start = performance.now();
        while (!isSettled(posted, received)) {
          if (performance.now() - start >= SETTLED_LIMIT_MS) {
            throw new Error(`settled: no done for generation ${lastGeneration(posted)}`);
          }
          await macrotask();
        }
      }
      flushFrames();
    },
    latestGeneration: () => lastGeneration(posted),
  };
}
