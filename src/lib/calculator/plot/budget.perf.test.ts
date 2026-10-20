// G-15 perf test: deterministic evaluation counts, one test per size.
import { describe, expect, it, vi } from "vitest";
import { NO_DEADLINE } from "../core/deadline";
import {
  at,
  counted,
  EXPLICIT_ROW,
  SIZES,
  STRESS_1,
  STRESS_2,
  STRESS_REGIONS,
} from "./__fixtures__/measure";
import { MIN_BRANCH_BUDGET } from "./budget";
import { EXPLICIT_BUDGET, IMPLICIT_BUDGET, plotRow, type PlotInput } from "./index";

vi.setConfig({ testTimeout: 60_000 }); // 3840×2160 runs 250,000-call fields and 8.3 M-pixel spans
describe("G-15 explicit and implicit evaluation budgets per view", () => {
  it.each(SIZES)("G-15 evaluations stay within 20,000 and 250,000 at $width×$height", (size) => {
    for (const fn of STRESS_1) {
      const c = counted(fn);
      const g = plotRow({ ...EXPLICIT_ROW, fs: [c.fn] }, at(size), NO_DEADLINE);
      expect([g.evaluations, c.calls() <= EXPLICIT_BUDGET]).toEqual([c.calls(), true]);
    }
    for (const fns of [...STRESS_2.map((F) => [F]), ...STRESS_REGIONS]) {
      const cs = fns.map((fn) => counted(fn));
      const [F, ...rest] = cs.map((c) => c.fn);
      const input: PlotInput = rest.length
        ? {
            rowId: "r",
            kind: "region",
            branches: [[F, ...rest]],
            ops: rest.map(() => "<" as const),
          }
        : { rowId: "i", kind: "implicit", Fs: [F] };
      const g = plotRow(input, at(size), NO_DEADLINE);
      const calls = cs.reduce((n, c) => n + c.calls(), 0);
      expect([g.evaluations, calls <= IMPLICIT_BUDGET]).toEqual([calls, true]);
    }
  });
});

describe("G-15, G-22 a list of curves splits its budget across its branches", () => {
  const total = (cs: { calls: () => number }[]) => cs.reduce((n, c) => n + c.calls(), 0);
  it.each([2, 3, 100, 10_000])("%d explicit branches stay within 10× 20,000 in all", (n) => {
    const cs = Array.from({ length: n }, (_, k) => counted((x: number) => Math.sin(x) * (k + 1)));
    const g = plotRow({ ...EXPLICIT_ROW, fs: cs.map((c) => c.fn) }, at(SIZES[1]), NO_DEADLINE);
    expect(g.evaluations).toBe(total(cs));
    expect(total(cs)).toBeLessThanOrEqual(Math.max(10 * EXPLICIT_BUDGET, n * MIN_BRANCH_BUDGET));
    for (const c of cs) expect(c.calls()).toBeLessThanOrEqual(EXPLICIT_BUDGET);
    if (g.kind === "curve") expect(g.polylines.length).toBeGreaterThan(0);
  });
  it.each([2, 5, 20])("%d implicit or region branches stay within 2× 250,000 in all", (n) => {
    const cs = Array.from({ length: n }, (_, k) =>
      counted((x: number, y: number) => x * x + y * y - (k + 1))
    );
    const Fs = cs.map((c) => c.fn);
    const implicit = plotRow({ rowId: "i", kind: "implicit", Fs }, at(SIZES[1]), NO_DEADLINE);
    expect([implicit.evaluations, total(cs) <= 2 * IMPLICIT_BUDGET]).toEqual([total(cs), true]);
    const ds = Array.from({ length: n }, (_, k) => counted((x: number) => (k + 1) * x));
    const y = counted((_x: number, y: number) => y);
    const branches = ds.map((d) => [y.fn, d.fn]);
    const region = plotRow(
      { rowId: "r", kind: "region", branches, ops: [">"] },
      at(SIZES[1]),
      NO_DEADLINE
    );
    const calls = total(ds) + y.calls(); // both terms at every sample
    expect([region.evaluations, total(ds) <= 2 * IMPLICIT_BUDGET]).toEqual([calls, true]);
  });
});
