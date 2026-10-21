// POI-LIVE-6: a table's regression curve gets points of interest and traces like a y=f(x) row
// (reference, 2026-10-20: after Add Regression on x₁=[12,25,325], y₁=[3,5,10] the selected table's
// fitted line shows its y-intercept (0, 3.616) in the default view, and its zero (−183.027, 0)
// once the view reaches it), through the main-thread backend and the real values pass.
import { expect, it } from "vitest";
import { createTestEngine, TEST_VIEW } from "./__fixtures__/test-engine";
import { addTableRegression, setTableRegressionType } from "./table-regression-commands";

async function settledPoi(m: ReturnType<typeof createTestEngine>, count: number) {
  await m.settled();
  for (let k = 0; k < 40 && (m.engine.getSnapshot().poi?.points.length ?? -1) !== count; k++) {
    await new Promise((r) => setTimeout(r, 5));
    m.flushFrames();
  }
  return m.engine.getSnapshot().poi?.points.map((p) => [+p.x.toFixed(3), +p.y.toFixed(3)]);
}

it("POI-LIVE-6 a selected table's regression curve gets its intercepts, and traces", async () => {
  const m = createTestEngine(undefined, { backend: "main-thread" });
  const e = m.engine;
  e.setExpression({
    id: "t",
    type: "table",
    columns: [
      { latex: "x_{1}", values: ["12", "25", "325"] },
      { latex: "y_{1}", values: ["3", "5", "10"] },
    ],
  });
  e.setView(TEST_VIEW);
  await m.settled();
  expect(e.poiCurves("t")).toEqual([]); // no regression yet: nothing to trace
  expect(addTableRegression(e, "t")).toBe(true);
  e.setSelectedRow("t");
  expect(await settledPoi(m, 1)).toEqual([[0, 3.616]]);
  const [line] = e.poiCurves("t");
  expect(line.independent).toBe("x");
  expect(line.linear).toBe(true);
  expect(line.f(0)).toBeCloseTo(3.61602, 5);

  setTableRegressionType(e, "t", "quadratic");
  expect(await settledPoi(m, 2)).toEqual([
    [-5.921, 0],
    [0, 1.022],
  ]);
  expect(e.poiCurves("t")[0].linear).toBe(false);
});
