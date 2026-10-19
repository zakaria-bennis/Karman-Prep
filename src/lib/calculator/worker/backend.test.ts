import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HELLO, macrotask, STATE, untilDone, VIEW_MSG } from "./__fixtures__/messages";
import { createMainThreadBackendWith, createWorkerBackend } from "./backend";
import { WORKER_MARKER, type MainToWorker, type WorkerToMain } from "./protocol";

/** A stand-in for `Worker`: records what it is sent and lets a test deliver its messages. */
class FakeWorker {
  static made: FakeWorker[] = [];
  posted: MainToWorker[] = [];
  terminated = false;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;

  constructor() {
    FakeWorker.made.push(this);
  }

  postMessage(message: MainToWorker): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Delivers `data` as a message from the worker. */
  send(data: unknown): void {
    this.onmessage?.({ data });
  }
}

/** The row ids of the last `state` that `w` received. */
function stateIds(w: FakeWorker): string[] {
  const states = w.posted.filter(
    (m): m is Extract<MainToWorker, { type: "state" }> => m.type === "state"
  );
  return states.at(-1)?.rows.map((row) => row.id) ?? [];
}

beforeEach(() => {
  FakeWorker.made = [];
  globalThis.__karmanCalculatorCounters = undefined;
  // Only the backend's timers are fake: the main-thread executor's MessageChannel and macrotask() stay real.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("AR-43 each backend owns one worker: construction counts +1, dispose sends dispose, terminates and counts −1 once", () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  expect(FakeWorker.made).toHaveLength(1);
  expect(globalThis.__karmanCalculatorCounters?.workers).toBe(1);
  b.dispose();
  b.dispose();
  expect(FakeWorker.made[0].posted.filter((m) => m.type === "dispose")).toEqual([
    { v: 1, type: "dispose" },
  ]);
  expect(FakeWorker.made[0].terminated).toBe(true);
  expect(globalThis.__karmanCalculatorCounters?.workers).toBe(0);
});
it("AR-45 the main-thread backend's dispose sends dispose to its executor, which then posts nothing", async () => {
  const parked: (() => void)[] = [];
  const got: WorkerToMain[] = [];
  const b = createMainThreadBackendWith({
    now: () => 0,
    sliceMs: 0,
    yieldToEventLoop: () => new Promise<void>((resolve) => parked.push(resolve)),
  });
  b.onMessage((m) => got.push(m));
  b.post(STATE(1, "y=x", "y=x^{2}"));
  b.post(VIEW_MSG(2));
  parked.shift()!();
  await macrotask(); // runs the values pass, then parks at the next yield
  expect(got.some((m) => m.type === "value")).toBe(true);
  const n = got.length;
  b.dispose();
  while (parked.length) {
    parked.shift()!();
    await macrotask();
  }
  expect(got).toHaveLength(n);
});
it("AR-49 after 1,500 ms without a message during a job the worker is replaced and the last begin row is quarantined", () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  const [w1] = FakeWorker.made;
  w1.send({ v: 1, type: "ready", worker: WORKER_MARKER });
  b.post(HELLO(5));
  b.post(STATE(1, "x^{2}+y^{2}=25", "y=x"));
  b.post(VIEW_MSG(2));
  w1.send({ v: 1, type: "begin", generation: 2, rowId: "r0" });
  vi.advanceTimersByTime(1499);
  expect(FakeWorker.made).toHaveLength(1);
  vi.advanceTimersByTime(1);
  expect(w1.terminated).toBe(true);
  expect(got.at(-1)).toEqual({ v: 1, type: "overrun", generation: 2, rowId: "r0" });
  const w2 = FakeWorker.made[1];
  expect(w2.posted.map((m) => m.type)).toEqual(["hello", "state", "view"]);
  expect(stateIds(w2)).toEqual(["r1"]);
  expect(globalThis.__karmanCalculatorCounters?.workers).toBe(1);
  b.post(STATE(3, "x^{2}+y^{2}=25", "y=2x"));
  expect(stateIds(w2)).toEqual(["r1"]);
  b.post(STATE(4, "x^{2}+y^{2}=16", "y=2x"));
  expect(stateIds(w2)).toEqual(["r0", "r1"]);
});
it("AR-49 posts do not hold off the watchdog: a worker silent for 1,500 ms is replaced while the main thread keeps posting", () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  const [w1] = FakeWorker.made;
  w1.send({ v: 1, type: "ready", worker: WORKER_MARKER });
  b.post(HELLO(5));
  b.post(STATE(1, "x^{2}+y^{2}=25", "y=x"));
  b.post(VIEW_MSG(2));
  w1.send({ v: 1, type: "begin", generation: 2, rowId: "r0" }); // the last worker message
  vi.advanceTimersByTime(1000);
  b.post(STATE(3, "x^{2}+y^{2}=25", "y=2x")); // typing
  vi.advanceTimersByTime(400);
  b.post(VIEW_MSG(4)); // dragging
  vi.advanceTimersByTime(99);
  expect(FakeWorker.made).toHaveLength(1);
  vi.advanceTimersByTime(1); // 1,500 ms after the begin
  expect(w1.terminated).toBe(true);
  expect(got.at(-1)).toEqual({ v: 1, type: "overrun", generation: 4, rowId: "r0" });
  expect(stateIds(FakeWorker.made[1])).toEqual(["r1"]);
});
it("AR-49 heartbeats keep a long job alive, an idle worker is never replaced, and a job with no begin is replaced without quarantine", () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  const [w1] = FakeWorker.made;
  w1.send({ v: 1, type: "ready", worker: WORKER_MARKER });
  b.post(HELLO(5));
  b.post(STATE(1, "x^{2}+y^{2}=25", "y=x"));
  b.post(VIEW_MSG(2));
  w1.send({ v: 1, type: "begin", generation: 2, rowId: "r0" });
  for (let i = 0; i < 5; i++) {
    vi.advanceTimersByTime(1000);
    w1.send({ v: 1, type: "heartbeat", generation: 2 });
  }
  expect(FakeWorker.made).toHaveLength(1);
  w1.send({ v: 1, type: "done", generation: 2 }); // idle: clears lastBegin and the watchdog
  vi.advanceTimersByTime(10_000);
  expect(FakeWorker.made).toHaveLength(1);
  b.post(STATE(3, "x^{2}+y^{2}=25", "y=2x")); // active again; the worker never answers
  vi.advanceTimersByTime(1500);
  expect(w1.terminated).toBe(true);
  expect(got.some((m) => m.type === "overrun")).toBe(false);
  const w2 = FakeWorker.made[1];
  expect(w2.posted.map((m) => m.type)).toEqual(["hello", "state", "view"]);
  expect(stateIds(w2)).toEqual(["r0", "r1"]);
});
it("AR-50 a Worker constructor that throws falls back to the main thread and still plots", async () => {
  const b = createWorkerBackend({
    createWorker: () => {
      throw new DOMException("blocked", "SecurityError");
    },
  });
  expect(b.kind).toBe("main-thread");
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  b.post(HELLO(1));
  b.post(STATE(1, "y=x^{2}"));
  b.post(VIEW_MSG(2));
  await untilDone(() => got, 2);
  expect(got).toContainEqual(expect.objectContaining({ type: "plot", generation: 2, rowId: "r0" }));
  expect(globalThis.__karmanCalculatorCounters?.workers ?? 0).toBe(0);
});
it("AR-50 an error before ready falls back, suppresses the default report and replays posted messages", async () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  b.post(HELLO(1));
  b.post(STATE(1, "y=x^{2}"));
  b.post(VIEW_MSG(2));
  const [w1] = FakeWorker.made;
  const preventDefault = vi.fn();
  w1.onerror!({ preventDefault } as unknown as ErrorEvent);
  expect(preventDefault).toHaveBeenCalledTimes(1);
  expect(w1.terminated).toBe(true);
  expect(b.kind).toBe("main-thread");
  await untilDone(() => got, 2);
  expect(got).toContainEqual(expect.objectContaining({ type: "plot", generation: 2, rowId: "r0" }));
  expect(globalThis.__karmanCalculatorCounters?.workers).toBe(0);
});
it("AR-50 posts before a late ready do not trigger the AR-49 watchdog", async () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  b.post(HELLO(1));
  b.post(STATE(1, "y=x^{2}"));
  b.post(VIEW_MSG(2));
  const [w1] = FakeWorker.made;
  vi.advanceTimersByTime(2999); // well past 1,500 ms: no watchdog before ready
  expect(FakeWorker.made).toHaveLength(1);
  expect(b.kind).toBe("worker");
  vi.advanceTimersByTime(1);
  expect(b.kind).toBe("main-thread");
  expect(w1.terminated).toBe(true);
  expect(globalThis.__karmanCalculatorCounters?.workers).toBe(0);
  await untilDone(() => got, 2);
  expect(got).toContainEqual(expect.objectContaining({ type: "plot", generation: 2, rowId: "r0" }));
});
it("AR-49, AR-50 a replacement worker gets a fresh 3,000 ms ready timer and no watchdog before its ready", async () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  const [w1] = FakeWorker.made;
  w1.send({ v: 1, type: "ready", worker: WORKER_MARKER });
  b.post(HELLO(5));
  b.post(STATE(1, "y=x^{2}"));
  b.post(VIEW_MSG(2));
  vi.advanceTimersByTime(1500); // w1 silent while active: replaced
  expect(w1.terminated).toBe(true);
  const w2 = FakeWorker.made[1];
  vi.advanceTimersByTime(2999); // w2 never answers: no second respawn
  expect(FakeWorker.made).toHaveLength(2);
  expect(b.kind).toBe("worker");
  vi.advanceTimersByTime(1);
  expect(b.kind).toBe("main-thread");
  expect(w2.terminated).toBe(true);
  expect(globalThis.__karmanCalculatorCounters?.workers).toBe(0);
  await untilDone(() => got, 2);
  expect(got).toContainEqual(expect.objectContaining({ type: "plot", generation: 2, rowId: "r0" }));
});
it("AR-50 a ready later than 3,000 ms falls back and the late ready is ignored", () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  const [w1] = FakeWorker.made;
  vi.advanceTimersByTime(2999);
  expect(b.kind).toBe("worker");
  vi.advanceTimersByTime(1);
  expect(b.kind).toBe("main-thread");
  expect(w1.terminated).toBe(true);
  w1.send({ v: 1, type: "ready", worker: WORKER_MARKER });
  expect(b.kind).toBe("main-thread");
  expect(got).toEqual([]);
});
it("AR-50 the main-thread backend runs in the AR-47 slices: a yield after each unit that ends 8 ms or more after its slice began", async () => {
  // AR-47 and AR-50 as reworded by OI-35 fix (b), Step 0. Time advances only when a message is delivered, so each plot unit (begin + plot) spends 2 × msPerMessage
  const yieldsFor = async (msPerMessage: number) => {
    let t = 0,
      yields = 0;
    const got: WorkerToMain[] = [];
    const b = createMainThreadBackendWith({
      now: () => t,
      yieldToEventLoop: async () => {
        yields++;
        await macrotask();
      },
    });
    b.onMessage((m) => {
      got.push(m);
      t += msPerMessage;
    });
    b.post(STATE(1, "y=x", "y=x^{2}", "x^{2}+y^{2}=25"));
    b.post(VIEW_MSG(2));
    await untilDone(() => got, 2);
    b.dispose();
    return yields;
  };
  expect(await yieldsFor(4)).toBe(5); // 8 ms per plot unit: start, after the values pass, after each of 3 plots
  expect(await yieldsFor(3.9)).toBe(3); // 7.8 ms per plot unit: start, after the values pass, after the second plot
});
it("AR-50 the main-thread backend applies the 250 ms row deadline and posts overrun", async () => {
  const overrunsFor = async (beginMs: number) => {
    let t = 0;
    const got: WorkerToMain[] = [];
    const b = createMainThreadBackendWith({ now: () => t });
    b.onMessage((m) => {
      got.push(m);
      if (m.type === "begin" && m.rowId === "r0") t += beginMs; // the deadline started just before this begin
    });
    b.post(STATE(1, "2+3", "4"));
    await untilDone(() => got, 1);
    b.dispose();
    return got.flatMap((m) => (m.type === "overrun" ? [m.rowId] : []));
  };
  expect(await overrunsFor(250)).toEqual(["r0"]);
  expect(await overrunsFor(249.9)).toEqual([]);
});
it("AR-49 a quarantined row is restated as overrun in every state that leaves it out, after delete and restore or hide and show", async () => {
  const b = createWorkerBackend({ createWorker: () => new FakeWorker() as unknown as Worker });
  const got: WorkerToMain[] = [];
  b.onMessage((m) => got.push(m));
  const [w1] = FakeWorker.made;
  w1.send({ v: 1, type: "ready", worker: WORKER_MARKER });
  b.post(STATE(1, "x^{2}+y^{2}=25", "y=x"));
  w1.send({ v: 1, type: "begin", generation: 1, rowId: "r0" });
  vi.advanceTimersByTime(1500);
  const w2 = FakeWorker.made[1];
  const overruns = () => got.filter((m) => m.type === "overrun");
  await macrotask();
  got.length = 0;
  const deleted = STATE(2, "x^{2}+y^{2}=25", "y=x");
  b.post({ ...deleted, rows: deleted.rows.slice(1) }); // r0 deleted: nothing to restate
  await macrotask();
  expect(overruns()).toEqual([]);
  b.post(STATE(3, "x^{2}+y^{2}=25", "y=x")); // undo restores r0 with the same latex
  expect(stateIds(w2)).toEqual(["r1"]);
  expect(overruns()).toEqual([]); // deferred: the engine notes the state after posting it
  await macrotask();
  expect(overruns()).toEqual([{ v: 1, type: "overrun", generation: 3, rowId: "r0" }]);
  got.length = 0;
  const hidden = STATE(4, "x^{2}+y^{2}=25", "y=x");
  b.post({ ...hidden, rows: hidden.rows.map((r) => (r.id === "r0" ? { ...r, hidden: true } : r)) });
  b.post(STATE(5, "x^{2}+y^{2}=25", "y=x")); // shown again
  await macrotask();
  expect(overruns()).toEqual([
    { v: 1, type: "overrun", generation: 4, rowId: "r0" },
    { v: 1, type: "overrun", generation: 5, rowId: "r0" },
  ]);
  b.dispose();
  got.length = 0;
  await macrotask();
  expect(got).toEqual([]);
});
