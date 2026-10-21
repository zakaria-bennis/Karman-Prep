import { expect, it } from "vitest";
import { createTestEngine, TEST_VIEW } from "./__fixtures__/test-engine";

async function fitted(
  rows: { id: string; latex?: string; type?: "table"; columns?: never }[] = []
) {
  const m = createTestEngine(undefined, { backend: "main-thread" });
  m.engine.setExpressions([
    {
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["1", "2", "3"] },
        { latex: "y_{1}", values: ["3", "5", "7"] },
      ],
    },
    { id: "r", latex: "y_{1}\\sim mx_{1}+b" },
    ...rows,
  ]);
  m.engine.setView(TEST_VIEW);
  await m.settled();
  return m;
}

it("D-36 the curve draws over the full visible x range in the regression row's colour", async () => {
  const m = await fitted();
  const view = m.engine.getSnapshot().rows.find((r) => r.id === "r")!;
  expect(view.kind).toBe("regression");
  expect(view.regression?.result?.params).toEqual([
    { name: "m", value: expect.closeTo(2, 12) },
    { name: "b", value: expect.closeTo(1, 12) },
  ]);
  const g = m.engine.getSnapshot().geometry.get("r");
  expect(g?.kind).toBe("curve");
  const xs = g?.kind === "curve" ? [...g.polylines].filter((_, i) => i % 2 === 0) : [];
  // y = 2x + 1 is visible for y in [bottom, top]: far beyond the data's x range of 1 to 3.
  const { bottom, top } = TEST_VIEW.viewport;
  expect(Math.min(...xs)).toBeLessThanOrEqual((bottom - 1) / 2 + 0.05);
  expect(Math.max(...xs)).toBeGreaterThanOrEqual((top - 1) / 2 - 0.05);
});

it("POI-3 a regression curve gets the y=f(x) points of interest", async () => {
  const m = await fitted();
  m.engine.setSelectedRow("r");
  await m.settled();
  for (let k = 0; k < 20 && m.engine.getSnapshot().poi === null; k++) {
    await new Promise((r) => setTimeout(r, 5));
    m.flushFrames();
  }
  const points = m.engine.getSnapshot().poi?.points ?? [];
  expect(points.map((p) => p.kinds)).toEqual([["zero"], ["intercept"]]);
  expect(points[0].x).toBeCloseTo(-0.5, 9);
  expect(points[1].y).toBeCloseTo(1, 9);
});

it("D-24 a failed fit is the row's error in place of results", async () => {
  const m = createTestEngine(undefined, { backend: "main-thread" });
  m.engine.setExpressions([
    {
      id: "t",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["1", "", "3"] },
        { latex: "y_{1}", values: ["3", "5", "7"] },
      ],
    },
    { id: "r", latex: "y_{1}\\sim mx_{1}+b" },
  ]);
  await m.settled();
  expect(m.engine.getSnapshot().rows.find((r) => r.id === "r")!.error?.message).toBe(
    "This model isn't defined for this data."
  );
});
