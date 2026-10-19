import { beforeEach, expect, it, vi } from "vitest";
import { geometryTransferables, type Geometry } from "../plot/geometry";
import { HELLO, macrotask, STATE, untilDone, VIEW_MSG } from "./__fixtures__/messages";
import { Executor, type ExecutorPort, type ExecutorTiming } from "./executor";
import { isWorkerMessage, type WorkerToMain } from "./protocol";

let posts: { m: WorkerToMain; t: ArrayBuffer[] }[];
let port: ExecutorPort;
let ex: Executor;
const msgs = () => posts.map((p) => p.m);

beforeEach(() => {
  posts = [];
  port = { post: (m, t) => posts.push({ m, t }) };
  ex = new Executor(port);
});

/**
 * Timing that never advances (`now` 0, `sliceMs` 0, so every unit ends its slice) and parks each
 * yield; `step()` releases one parked yield and lets the loop run to its next one.
 */
function manual() {
  const parked: (() => void)[] = [];
  const timing: Partial<ExecutorTiming> = {
    now: () => 0,
    sliceMs: 0,
    yieldToEventLoop: () => new Promise<void>((resolve) => parked.push(resolve)),
  };
  const step = async () => {
    parked.shift()?.();
    await macrotask(); // a macrotask runs only after every pending microtask
  };
  return { timing, step };
}

/** Every typed-array field of `g` and of its region boundaries. */
function typedArraysOf(g: Geometry): ArrayBufferView[] {
  const own = Object.values(g).filter((x): x is ArrayBufferView => ArrayBuffer.isView(x));
  return g.kind === "region" ? [...own, ...g.boundaries.flatMap(typedArraysOf)] : own;
}

it("AR-45 hello is answered by ready carrying the karman-compute marker (OI-29)", async () => {
  ex.receive(HELLO(3));
  ex.receive(STATE(1, "2+3"));
  await untilDone(msgs, 1);
  expect(posts[0].m).toEqual({ v: 1, type: "ready", worker: "karman-compute" });
});
it("AR-45 every message is a versioned plain object that survives structuredClone", async () => {
  ex.receive(HELLO(3));
  ex.receive(
    STATE(1, "2+3", "y=x^{2}", "x^{2}+y^{2}=25", "1<y<3", "(2,3)", "x=3", "\\frac{", "a=2", "y=ax")
  );
  ex.receive(VIEW_MSG(2));
  ex.receive({ v: 1, type: "evaluate", jobId: 1, generation: 2, latex: "a+1" });
  await untilDone(msgs, 2);
  const types = new Set(posts.map((p) => p.m.type));
  types.delete("heartbeat");
  expect(types).toEqual(new Set(["ready", "begin", "analysis", "value", "plot", "done"]));
  for (const { m } of posts) {
    expect(m.v).toBe(1);
    expect(isWorkerMessage(m)).toBe(true);
    expect(structuredClone(m)).toEqual(m);
  }
});
it("AR-45 plot geometry travels in transferable Float64Array or Float32Array buffers", async () => {
  ex.receive(STATE(1, "y=x^{2}", "x=3", "(2,3)", "1<y<3"));
  ex.receive(VIEW_MSG(2));
  await untilDone(msgs, 2);
  const plots = posts.filter((p) => p.m.type === "plot");
  expect(plots).toHaveLength(4);
  for (const { m, t } of plots) {
    const g = (m as Extract<WorkerToMain, { type: "plot" }>).geometry;
    for (const a of typedArraysOf(g)) {
      expect(a instanceof Float64Array || a instanceof Float32Array).toBe(true);
      expect(a.buffer).toBeInstanceOf(ArrayBuffer); // a SharedArrayBuffer fails this
      expect(t).toContain(a.buffer);
    }
    expect(t).toEqual(geometryTransferables(g));
  }
});
it("AR-46 superseded work stops at the next yield and its generation never gets done", async () => {
  const t = manual();
  const ex = new Executor(port, t.timing);
  ex.receive(STATE(1, "x^{2}+y^{2}=25", "x^{2}+y^{2}=16", "x^{2}+y^{2}=9"));
  ex.receive(VIEW_MSG(2));
  while (!posts.some((p) => p.m.type === "plot")) await t.step();
  const mark = posts.length;
  ex.receive(STATE(3, "y=x"));
  while (!posts.some((p) => p.m.type === "done" && p.m.generation === 3)) await t.step();
  expect(posts.slice(mark).some((p) => "generation" in p.m && p.m.generation === 2)).toBe(false);
  expect(posts.some((p) => p.m.type === "done" && p.m.generation === 2)).toBe(false);
});
it("AR-46 a view-only generation reuses the values, posts only begin, plot and done, and runs each helper job once", async () => {
  ex.receive(STATE(1, "y=x", "a=2"));
  ex.receive({ v: 1, type: "evaluate", jobId: 1, generation: 1, latex: "a+1" });
  ex.receive(VIEW_MSG(2));
  await untilDone(msgs, 2);
  expect(msgs().filter((m) => m.type === "value" && m.jobId === 1)).toHaveLength(1);
  const mark = posts.length;
  ex.receive(VIEW_MSG(3));
  await untilDone(msgs, 3);
  const later = msgs()
    .slice(mark)
    .filter((m) => m.type !== "heartbeat");
  expect(new Set(later.map((m) => m.type))).toEqual(new Set(["begin", "plot", "done"]));
  expect(later.every((m) => "generation" in m && m.generation === 3)).toBe(true);
  expect(later.some((m) => m.type === "value")).toBe(false); // the helper job is not re-run
});
it("AR-47 the executor yields after a unit once the slice is spent", async () => {
  const countYields = async (sliceMs: number) => {
    let yields = 0;
    const local: WorkerToMain[] = [];
    const e = new Executor(
      { post: (m) => local.push(m) },
      {
        sliceMs,
        yieldToEventLoop: async () => {
          yields++;
          await macrotask();
        },
      }
    );
    e.receive(STATE(1, "y=x", "y=x^{2}", "x^{2}+y^{2}=25"));
    e.receive(VIEW_MSG(2));
    await untilDone(() => local, 2);
    return yields;
  };
  expect(await countYields(0)).toBe(5); // the loop's first yield, then one after each unit: 1 values pass + 3 plots; idle after done
  expect(await countYields(Infinity)).toBe(1);
});
it("AR-45 a dispose message during a run stops the executor: nothing more is posted and its yield channel is closed", async () => {
  const t = manual();
  const ex = new Executor(port, t.timing);
  ex.receive(STATE(1, "x^{2}+y^{2}=25", "x^{2}+y^{2}=16"));
  ex.receive(VIEW_MSG(2));
  while (!posts.some((p) => p.m.type === "plot")) await t.step(); // parked at the yield after the first plot
  const mark = posts.length;
  ex.receive({ v: 1, type: "dispose" });
  ex.receive(STATE(3, "y=x")); // ignored after dispose
  for (let i = 0; i < 10; i++) await t.step();
  expect(posts).toHaveLength(mark);
  // default timing: the executor owns its MessageChannel and dispose closes both ports
  const Real = globalThis.MessageChannel;
  const made: MessageChannel[] = [];
  vi.stubGlobal(
    "MessageChannel",
    class extends Real {
      constructor() {
        super();
        made.push(this);
      }
    }
  );
  const d = new Executor(port);
  d.receive(STATE(4, "2+3")); // the loop's first yieldToEventLoop() creates the channel synchronously
  vi.unstubAllGlobals();
  const closes = [vi.spyOn(made[0].port1, "close"), vi.spyOn(made[0].port2, "close")];
  d.receive({ v: 1, type: "dispose" });
  expect(closes.map((c) => c.mock.calls.length)).toEqual([1, 1]);
  await macrotask();
  expect(posts).toHaveLength(mark);
});
it("AR-47 posted messages are never more than 200 ms apart during a long job", async () => {
  let clock = 0;
  const at: number[] = [],
    local: WorkerToMain[] = [];
  const e = new Executor(
    {
      post: (m) => {
        local.push(m);
        at.push(clock); // records the time without reading now()
      },
    },
    { now: () => (clock += 1) } // every clock read advances 1 ms
  );
  e.receive(
    STATE(1, "x^{2}+y^{2}=25", "x^{2}+y^{2}=16", "x^{2}+y^{2}=9", "xy=6", "xy=-6", "x^{2}-y^{2}=4")
  );
  e.receive(VIEW_MSG(2));
  await untilDone(() => local, 2);
  expect(Math.max(...at.slice(1).map((t, i) => t - at[i]))).toBeLessThanOrEqual(200);
});
it("AR-47 heartbeats posted during a long plot carry the running generation", async () => {
  // Plot sampling checks its deadline every 1,024 evaluations; at 10 ms per clock read one
  // implicit plot spans several hundred ms, so its checks must post heartbeats.
  let clock = 0;
  const local: WorkerToMain[] = [];
  const e = new Executor({ post: (m) => local.push(m) }, { now: () => (clock += 10) });
  e.receive(STATE(1, "x^{2}+y^{2}=25"));
  e.receive(VIEW_MSG(2));
  await untilDone(() => local, 2);
  const beats = local.filter((m) => m.type === "heartbeat");
  expect(beats.length).toBeGreaterThan(0);
  expect(beats).toEqual(beats.map(() => ({ v: 1, type: "heartbeat", generation: 2 })));
  const plot = local.findIndex((m) => m.type === "plot");
  expect(local.findIndex((m) => m.type === "heartbeat")).toBeLessThan(plot);
});
it("AR-47 the default yield is a MessageChannel macrotask", async () => {
  const Real = globalThis.MessageChannel;
  let made = 0;
  vi.stubGlobal(
    "MessageChannel",
    class extends Real {
      constructor() {
        super();
        made++;
      }
    }
  );
  const e = new Executor(port); // default timing
  e.receive(STATE(1, "2+3")); // the loop's first yieldToEventLoop() runs synchronously and creates the channel
  vi.unstubAllGlobals();
  expect(made).toBe(1);
  await untilDone(msgs, 1);
  expect(msgs().at(-1)).toEqual({ v: 1, type: "done", generation: 1 });
});
