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
import { EXPLICIT_BUDGET, IMPLICIT_BUDGET, plotRow, type PlotInput } from "./index";

vi.setConfig({ testTimeout: 60_000 }); // 3840×2160 runs 250,000-call fields and 8.3 M-pixel spans
describe("G-15 explicit and implicit evaluation budgets per view", () => {
  it.each(SIZES)("G-15 evaluations stay within 20,000 and 250,000 at $width×$height", (size) => {
    for (const fn of STRESS_1) {
      const c = counted(fn);
      const g = plotRow({ ...EXPLICIT_ROW, f: c.fn }, at(size), NO_DEADLINE);
      expect([g.evaluations, c.calls() <= EXPLICIT_BUDGET]).toEqual([c.calls(), true]);
    }
    for (const fns of [...STRESS_2.map((F) => [F]), ...STRESS_REGIONS]) {
      const cs = fns.map((fn) => counted(fn));
      const [F, ...rest] = cs.map((c) => c.fn);
      const input: PlotInput = rest.length
        ? { rowId: "r", kind: "region", terms: [F, ...rest], ops: rest.map(() => "<" as const) }
        : { rowId: "i", kind: "implicit", F };
      const g = plotRow(input, at(size), NO_DEADLINE);
      const calls = cs.reduce((n, c) => n + c.calls(), 0);
      expect([g.evaluations, calls <= IMPLICIT_BUDGET]).toEqual([calls, true]);
    }
  });
});
