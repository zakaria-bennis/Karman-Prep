// Figure choices are drawn in one shared frame (choices.ts), so their curves
// and regions must be sampled in it. Found in the final branch review: a
// choice framed [-5, 5] in a set whose shared frame is [-10, 10] had samples
// that stopped at ±5, so its region looked bounded when it was not.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { choiceFrameIssues, choiceScenes, sharedFrame } from "@/lib/figures/engine/choices";
import { FIGURE_SPEC_VERSION, type FigureSpec, type PlaneFrame } from "@/lib/figures/engine/spec";
import { sampleChoices, sampleSpec } from "../../../../scripts/figures/sample-functions";

type Sampled = Extract<FigureSpec["parts"][number], { kind: "function" | "region" }>;

const SMALL: PlaneFrame = { x: [-5, 5], y: [-5, 5], step: 1 };
const LARGE: PlaneFrame = { x: [-10, 10], y: [-10, 10], step: 1 };

/** A plane with the line y = x/2 and the region y > x, framed `frame`. */
const graph = (frame: PlaneFrame): FigureSpec => ({
  version: FIGURE_SPEC_VERSION,
  type: "plane",
  parts: [
    { kind: "function", id: "f", latex: "y=\\frac{x}{2}" },
    { kind: "region", id: "R", latex: "y>x" },
  ],
  labels: [{ text: "R", on: "R" }],
  marks: [],
  frame,
});

const xs = (spec: FigureSpec, id: string) =>
  ((spec.parts.find((p) => p.id === id) as Sampled).samples ?? []).flat().map(([x]) => x);

describe("sampleChoices", () => {
  const set = [graph(SMALL), graph(LARGE)];
  const out = sampleChoices(set);
  const shared = sharedFrame(set);

  it("stores every framed choice in the shared frame", () => {
    expect(shared.x).toEqual([-10, 10]);
    for (const spec of out) expect(spec.frame).toEqual(shared);
  });

  it("samples every choice's curve and region out to the shared frame's edges", () => {
    for (const spec of out) {
      for (const id of ["f", "R"]) {
        const x = xs(spec, id);
        expect(Math.min(...x), id).toBeCloseTo(-10, 6);
        expect(Math.max(...x), id).toBeCloseTo(10, 6);
      }
    }
  });

  it("gives a set that choiceScenes draws, with no frame issue", () => {
    expect(choiceFrameIssues(out)).toEqual([]);
    expect(choiceScenes(out).every((s) => s !== null)).toBe(true);
  });

  it("leaves shapes and solids out of the frame", () => {
    const triangle: FigureSpec = {
      version: FIGURE_SPEC_VERSION,
      type: "geometry2d",
      parts: [
        { kind: "point", id: "A", x: 0, y: 0 },
        { kind: "point", id: "B", x: 4, y: 0 },
        { kind: "point", id: "C", x: 0, y: 3 },
        { kind: "polygon", id: "ABC", points: ["A", "B", "C"] },
      ],
      labels: [],
      marks: [],
    };
    const [shape] = sampleChoices([triangle, graph(SMALL)]);
    expect(shape.frame).toBeUndefined();
  });
});

describe("choiceScenes refuses choices sampled outside the shared frame", () => {
  // Each sampled in its own frame, as check-spec used to store them.
  const own = [sampleSpec(graph(SMALL)), sampleSpec(graph(LARGE))];

  it("reports frame_mismatch for the smaller-framed choice and draws none of the set", () => {
    const issues = choiceFrameIssues(own);
    expect(issues.map((i) => i.code)).toEqual(["frame_mismatch"]);
    expect(issues[0].detail).toMatch(/choice 1 .*x \[-5, 5\].*shared frame x \[-10, 10\]/);
    expect(choiceScenes(own)).toEqual([null, null]);
  });

  it("does not refuse charts or point-and-line planes, which store nothing frame-bound", () => {
    const points = (frame: PlaneFrame): FigureSpec => ({
      version: FIGURE_SPEC_VERSION,
      type: "plane",
      parts: [{ kind: "point", id: "P", x: 1, y: 2 }],
      labels: [],
      marks: [],
      frame,
    });
    expect(choiceFrameIssues([points(SMALL), points(LARGE)])).toEqual([]);
  });
});

describe("check-spec", () => {
  it("stores, checks and draws each choice sampled in the shared frame", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "check-spec-"));
    const file = path.join(dir, "figure.json");
    writeFileSync(
      file,
      JSON.stringify({
        answer_choices: [
          { letter: "A", choice_figure_spec: graph(SMALL), transcribed_labels: ["R"] },
          { letter: "B", choice_figure_spec: graph(LARGE), transcribed_labels: ["R"] },
        ],
      })
    );
    const run = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/figures/check-spec.ts", file],
      { encoding: "utf8" }
    );
    const out = JSON.parse(run.stdout) as {
      choices: { spec: FigureSpec; svg: string | null; issues: { code: string }[] }[];
    };
    const frames = out.choices.map((c) => c.spec.frame);
    expect(frames[0]).toEqual(frames[1]);
    expect(frames[0]?.x).toEqual([-10, 10]);
    for (const c of out.choices) {
      expect(c.issues.map((i) => i.code)).not.toContain("frame_mismatch");
      expect(c.svg).not.toBeNull();
      expect(Math.min(...xs(c.spec, "f"))).toBeCloseTo(-10, 6);
      expect(Math.max(...xs(c.spec, "R"))).toBeCloseTo(10, 6);
    }
  }, 30_000);
});
