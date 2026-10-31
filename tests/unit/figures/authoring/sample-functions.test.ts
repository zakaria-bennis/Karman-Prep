import { describe, expect, it } from "vitest";
import { parseFigureSpec, FIGURE_SPEC_VERSION, type FigureSpec } from "@/lib/figures/engine/spec";
import { curveFor, sampleSpec } from "../../../../scripts/figures/sample-functions";

const FRAME = { x: [-5, 5] as [number, number], y: [-5, 5] as [number, number], step: 1 };
const BOX = { width: 320, height: 320 };
const SPAN = 10;

/** Nearest polyline vertex distance to (x, y), in world units. */
function nearest(runs: number[][], x: number, y: number): number {
  let best = Infinity;
  for (const run of runs) {
    for (let i = 0; i + 1 < run.length; i += 2) {
      best = Math.min(best, Math.hypot(run[i] - x, run[i + 1] - y));
    }
  }
  return best;
}

describe("curveFor", () => {
  it("y=2x^2-3 passes through (1,-1) and (2,5)", () => {
    const runs = curveFor("y=2x^2-3", FRAME, BOX);
    expect(runs.length).toBeGreaterThan(0);
    expect(nearest(runs, 1, -1)).toBeLessThan(0.01 * SPAN);
    expect(nearest(runs, 2, 5)).toBeLessThan(0.01 * SPAN);
  });

  it("1/(x-2) has no segment crossing x=2", () => {
    const runs = curveFor("y=\\frac{1}{x-2}", FRAME, BOX);
    expect(runs.length).toBeGreaterThanOrEqual(2);
    for (const run of runs) {
      for (let i = 0; i + 3 < run.length; i += 2) {
        const a = run[i] - 2;
        const b = run[i + 2] - 2;
        expect(a * b < 0).toBe(false);
      }
    }
  });

  it("\\sqrt{x} draws nothing left of 0", () => {
    const runs = curveFor("y=\\sqrt{x}", FRAME, BOX);
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      for (let i = 0; i < run.length; i += 2) expect(run[i]).toBeGreaterThanOrEqual(-1e-9);
    }
  });
});

describe("sampleSpec", () => {
  const spec: FigureSpec = {
    version: FIGURE_SPEC_VERSION,
    type: "plane",
    parts: [
      { kind: "point", id: "A", x: 1, y: 1 },
      { kind: "function", id: "f", latex: "y=\\frac{1}{x-2}" },
      { kind: "function", id: "g", latex: "y=x", domain: [0, 3] },
      { kind: "function", id: "h", latex: "y=x", domain: [8, 9] },
    ],
    labels: [],
    marks: [],
    frame: FRAME,
  };

  it("fills samples for every function part as finite pairs, and the result validates", () => {
    const out = sampleSpec(spec);
    const parsed = parseFigureSpec(out);
    expect(parsed.ok, parsed.ok ? "" : parsed.errors.join("; ")).toBe(true);
    expect(out.parts[0]).toEqual(spec.parts[0]);
    for (const part of out.parts) {
      if (part.kind !== "function") continue;
      expect(part.samples, part.id).toBeDefined();
      for (const run of part.samples!)
        for (const p of run) expect(p.every(Number.isFinite)).toBe(true);
    }
  });

  it("keeps the asymptote break, the domain, and an empty result for a domain off the frame", () => {
    const out = sampleSpec(spec);
    const [f, g, h] = out.parts.slice(1) as Extract<
      FigureSpec["parts"][number],
      { kind: "function" }
    >[];
    expect(f.samples!.length).toBeGreaterThanOrEqual(2);
    const gx = g.samples!.flat().map(([x]) => x);
    expect(Math.min(...gx)).toBeGreaterThanOrEqual(-1e-9);
    expect(Math.max(...gx)).toBeLessThanOrEqual(3 + 1e-9);
    expect(h.samples).toEqual([]);
  });

  it("does not change its input", () => {
    const before = JSON.stringify(spec);
    sampleSpec(spec);
    expect(JSON.stringify(spec)).toBe(before);
  });
});
