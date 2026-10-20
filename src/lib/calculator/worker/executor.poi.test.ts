import { beforeEach, expect, it } from "vitest";
import { macrotask, rows, RAD, STATE, untilDone, VIEW_MSG } from "./__fixtures__/messages";
import { Executor, type ExecutorPort } from "./executor";
import { isMainMessage, isWorkerMessage, type WorkerToMain } from "./protocol";

let posts: WorkerToMain[];
let ex: Executor;
const pois = () => posts.filter((m) => m.type === "poi");
const settle = async () => {
  for (let k = 0; k < 20; k++) await macrotask();
};

beforeEach(() => {
  posts = [];
  const port: ExecutorPort = { post: (m) => posts.push(m) };
  ex = new Executor(port);
});

it("POI-1 only the selected row gets points of interest, and a hidden or error row gets none", async () => {
  ex.receive(STATE(1, "y=x^{2}-2", "y=3"));
  ex.receive(VIEW_MSG(2));
  await untilDone(() => posts, 2);
  expect(pois()).toEqual([]);
  ex.receive({ v: 1, type: "select", rowId: "r0" });
  await settle();
  const [poi] = pois();
  expect(poi).toMatchObject({ type: "poi", generation: 2, rowId: "r0" });
  if (poi.type !== "poi") throw new Error("not poi");
  expect(poi.points.map((p) => p.kinds)).toContainEqual(["intercept", "extremum"]);
  expect(poi.points.filter((p) => p.kinds.includes("intersection"))).toHaveLength(2);
  expect(isWorkerMessage(poi)).toBe(true);

  posts = [];
  const hidden = { ...STATE(3), rows: rows("y=x^{2}-2").map((r) => ({ ...r, hidden: true })) };
  ex.receive(hidden);
  ex.receive(VIEW_MSG(4));
  await untilDone(() => posts, 4);
  await settle();
  expect(pois().every((m) => m.type === "poi" && m.points.length === 0)).toBe(true);
  posts = [];
  ex.receive({
    v: 1,
    type: "state",
    generation: 5,
    rows: rows("y=x+"),
    settings: RAD,
    sliders: {},
  });
  await untilDone(() => posts, 5);
  await settle();
  expect(pois().every((m) => m.type === "poi" && m.points.length === 0)).toBe(true);
});

it("POI-1 a select message posts poi for that row without a new values pass", async () => {
  ex.receive(STATE(1, "y=2x+1", "y=-x+7"));
  ex.receive(VIEW_MSG(2));
  await untilDone(() => posts, 2);
  posts = [];
  ex.receive({ v: 1, type: "select", rowId: "r1" });
  await settle();
  expect(posts.map((m) => m.type).filter((t) => t !== "heartbeat")).toEqual(["poi"]);
  expect(isMainMessage({ v: 1, type: "select", rowId: null })).toBe(true);
  expect(isMainMessage({ v: 1, type: "select", rowId: 3 })).toBe(false);
});

it("POI-9 points are recomputed after a view change settles", async () => {
  ex.receive(STATE(1, "y=x-9"));
  ex.receive(VIEW_MSG(2));
  ex.receive({ v: 1, type: "select", rowId: "r0" });
  await untilDone(() => posts, 2);
  await settle();
  expect(pois().at(-1)).toMatchObject({ generation: 2 });
  const zoomed = { ...VIEW_MSG(3), viewport: { left: -5, right: 5, bottom: -3.75, top: 3.75 } };
  ex.receive(zoomed);
  await untilDone(() => posts, 3);
  await settle();
  const last = pois().at(-1);
  if (last?.type !== "poi") throw new Error("no poi");
  expect(last.generation).toBe(3);
  expect(last.points).toEqual([]); // (9, 0) and (0, -9) are outside the zoomed view
});
