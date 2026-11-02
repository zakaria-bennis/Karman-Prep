import { describe, expect, it, vi } from "vitest";
import { checkSpec } from "@/lib/figures/engine/checks";
import * as engine from "@/lib/figures/engine/index";
import type { Scene, SceneItem } from "@/lib/figures/engine/scene";
import {
  FIGURE_SPEC_VERSION,
  parseFigureSpec,
  type FigureSpec,
  type Label,
  type Part,
} from "@/lib/figures/engine/spec";
vi.mock("@/lib/figures/engine/index", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/figures/engine/index")>();
  return { ...real, buildScene: vi.fn(real.buildScene) };
});

// Tests may import authoring scripts: AR-1 exempts test files, and the runtime never does.
import { sampleSpec } from "../../../../scripts/figures/sample-functions";

const pt = (id: string, x: number, y: number, on?: string[]): Part =>
  on ? { kind: "point", id, x, y, on } : { kind: "point", id, x, y };
const seg = (id: string, from: string, to: string): Part => ({ kind: "segment", id, from, to });

function geo(parts: Part[], labels: Label[] = [], extra: Partial<FigureSpec> = {}): FigureSpec {
  return { version: FIGURE_SPEC_VERSION, type: "geometry2d", parts, labels, marks: [], ...extra };
}

const TRIANGLE = geo(
  [
    pt("A", 0, 100),
    pt("B", 120, 100),
    pt("C", 0, 0),
    { kind: "polygon", id: "T", points: ["A", "B", "C"] },
  ],
  [
    { text: "A", on: "A" },
    { text: "B", on: "B" },
    { text: "C", on: "C" },
  ]
);

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe("checkSpec labels", () => {
  it("a figure that matches its transcription has no issues", () => {
    expect(checkSpec(TRIANGLE, ["A", "B", "C"])).toEqual([]);
  });

  it("missing label from transcription → missing_label", () => {
    const issues = checkSpec(TRIANGLE, ["A", "B", "C", "12"]);
    expect(codes(issues)).toEqual(["missing_label"]);
    expect(issues[0].detail).toContain('"12"');
  });

  it('invented label → missing_label with detail "not in original"', () => {
    const issues = checkSpec(TRIANGLE, ["A", "B"]);
    expect(codes(issues)).toEqual(["missing_label"]);
    expect(issues[0].partId).toBe("C");
    expect(issues[0].detail).toContain("not in original");
  });

  it("compares labels by text, ignoring spacing and the minus sign used", () => {
    const spec = geo(
      [pt("P", 0, 0), pt("Q", 100, 0), seg("PQ", "P", "Q")],
      [{ text: "−3 cm", on: "PQ" }]
    );
    expect(checkSpec(spec, ["-3cm"])).toEqual([]);
  });

  it("counts repeated labels: two x° in the figure need two in the transcription", () => {
    const spec = geo(
      [pt("A", 0, 100), pt("B", 120, 100), pt("C", 0, 0), seg("AB", "A", "B"), seg("AC", "A", "C")],
      [
        { text: "x°", on: "AB" },
        { text: "x°", on: "AC" },
      ]
    );
    expect(checkSpec(spec, ["x°", "x°"])).toEqual([]);
    const one = checkSpec(spec, ["x°"]);
    expect(codes(one)).toEqual(["missing_label"]);
    expect(one[0].detail).toContain("not in original");
  });

  it("the note wraps onto two lines and still matches its one-line transcription", () => {
    const spec = { ...TRIANGLE, notToScale: true };
    const box = { width: 200, height: 200 };
    expect(checkSpec(spec, ["A", "B", "C", "Note: Figure not drawn to scale."], box)).toEqual([]);
  });

  it("a plane's tick numbers and axis names are text in the figure, so the transcription must hold them", () => {
    const spec: FigureSpec = {
      version: FIGURE_SPEC_VERSION,
      type: "plane",
      parts: [],
      labels: [],
      marks: [],
      frame: { x: [0, 4], y: [0, 4], step: 1, originLabel: false },
    };
    const ticks = ["x", "y", "1", "2", "3", "4", "1", "2", "3", "4"];
    expect(checkSpec(spec, ticks)).toEqual([]);
    const issues = checkSpec(spec, ticks.slice(0, -1));
    expect(codes(issues)).toEqual(["missing_label"]);
    expect(issues[0].detail).toContain("not in original");
  });

  it("a table's cells are its labels", () => {
    const spec: FigureSpec = {
      version: FIGURE_SPEC_VERSION,
      type: "table",
      parts: [{ kind: "table", id: "t", header: ["x", "y"], rows: [["1", "$4.99"]] }],
      labels: [],
      marks: [],
    };
    expect(checkSpec(spec, ["x", "y", "1", "$4.99"])).toEqual([]);
    const issues = checkSpec(spec, ["x", "y", "1", "$5.99"]);
    expect(codes(issues).sort()).toEqual(["missing_label", "missing_label"]);
  });
});

describe("checkSpec off_line", () => {
  const circle = (through?: string): Part =>
    through
      ? { kind: "circle", id: "k", center: "O", through }
      : { kind: "circle", id: "k", center: "O", radius: 50 };

  it("point declared on circle but off it → off_line", () => {
    // 10% off the radius: far past the 2% snap, so it stays off the circle.
    const spec = geo([pt("O", 0, 0), pt("P", 55, 0, ["k"]), circle()]);
    const issues = checkSpec(spec, []);
    expect(codes(issues)).toEqual(["off_line"]);
    expect(issues[0].partId).toBe("P");
  });

  it("a point declared on a circle within the snap tolerance is snapped onto it", () => {
    const spec = geo([pt("O", 0, 0), pt("P", 50.5, 0, ["k"]), circle()]);
    expect(checkSpec(spec, [])).toEqual([]);
  });

  it("a point declared on a segment but past its end → off_line", () => {
    const spec = geo([
      pt("A", 0, 0),
      pt("B", 100, 0),
      pt("M", 130, 0, ["AB"]),
      seg("AB", "A", "B"),
    ]);
    expect(codes(checkSpec(spec, []))).toEqual(["off_line"]);
  });

  it("an arc whose end point is off its circle → off_line", () => {
    const spec = geo([
      pt("O", 0, 0),
      pt("A", 50, 0),
      pt("B", 0, 70),
      { kind: "arc", id: "a", center: "O", from: "A", to: "B" },
    ]);
    const issues = checkSpec(spec, []);
    expect(codes(issues)).toEqual(["off_line"]);
    expect(issues[0].partId).toBe("a");
  });

  it("a function passes through a point declared on it (checked on the stored samples)", () => {
    const frame = { x: [-5, 5] as [number, number], y: [-5, 5] as [number, number], step: 1 };
    const spec = (y: number): FigureSpec =>
      sampleSpec({
        version: FIGURE_SPEC_VERSION,
        type: "plane",
        parts: [{ kind: "function", id: "f", latex: "y=x^2" }, pt("P", 2, y, ["f"])],
        labels: [],
        marks: [],
        frame: { ...frame, grid: false },
      });
    const off = (s: FigureSpec) => checkSpec(s, []).filter((i) => i.code === "off_line");
    expect(off(spec(4))).toEqual([]);
    const issues = off(spec(3));
    expect(issues).toHaveLength(1);
    expect(issues[0].partId).toBe("P");
  });
});

describe("checkSpec arrows, samples, clipping and overlap", () => {
  /** The next buildScene call, with `edit` applied to the scene it returns. */
  async function withScene(edit: (scene: Scene) => Scene) {
    const real = await vi.importActual<typeof engine>("@/lib/figures/engine/index");
    vi.mocked(engine.buildScene).mockImplementationOnce((spec, box, opts) =>
      edit(real.buildScene(spec, box, opts))
    );
  }

  it("segment drawn with arrows → arrow_rule", async () => {
    await withScene((scene) => ({
      ...scene,
      items: scene.items.map((i) =>
        i.t === "path" && i.partId === "AB" ? { ...i, arrows: "both" as const } : i
      ),
    }));
    const spec = geo([pt("A", 0, 0), pt("B", 100, 0), seg("AB", "A", "B")]);
    const issues = checkSpec(spec, []);
    expect(codes(issues)).toEqual(["arrow_rule"]);
    expect(issues[0].partId).toBe("AB");
  });

  it("a ray drawn without an arrowhead → arrow_rule", async () => {
    await withScene((scene) => ({
      ...scene,
      items: scene.items.map((i) => (i.t === "path" ? { ...i, arrows: undefined } : i)),
    }));
    const spec = geo([
      pt("A", 0, 0),
      pt("B", 100, 0),
      { kind: "ray", id: "r", from: "A", to: "B" },
    ]);
    expect(codes(checkSpec(spec, []))).toEqual(["arrow_rule"]);
  });

  it("rays and lines as the engine draws them pass", () => {
    const spec = geo([
      pt("A", 0, 0),
      pt("B", 100, 0),
      pt("C", 0, 80),
      { kind: "ray", id: "r", from: "A", to: "B" },
      { kind: "line", id: "l", from: "A", to: "C" },
    ]);
    expect(checkSpec(spec, [])).toEqual([]);
  });

  it("function part without samples → unsampled_function", () => {
    const spec: FigureSpec = {
      version: FIGURE_SPEC_VERSION,
      type: "plane",
      parts: [{ kind: "function", id: "f", latex: "y=x" }],
      labels: [],
      marks: [],
      frame: { x: [0, 1], y: [0, 1], step: 1, originLabel: false },
    };
    const issues = checkSpec(spec, ["x", "y", "1", "1"]);
    expect(codes(issues)).toEqual(["unsampled_function"]);
    expect(issues[0].partId).toBe("f");
  });

  it("text drawn past the figure's edge → clipped", async () => {
    const stray: SceneItem = {
      t: "text",
      x: 395,
      y: 150,
      text: "WIDE",
      role: "ink",
      anchor: "start",
    };
    await withScene((scene) => ({ ...scene, items: [...scene.items, stray] }));
    const issues = checkSpec(TRIANGLE, ["A", "B", "C", "WIDE"]);
    expect(codes(issues)).toEqual(["clipped"]);
  });

  it("a curve drawn past the figure's edge → clipped", async () => {
    const stray: SceneItem = { t: "path", d: "M10 10 L420 10", role: "ink", weight: "line" };
    await withScene((scene) => ({ ...scene, items: [...scene.items, stray] }));
    expect(codes(checkSpec(TRIANGLE, ["A", "B", "C"]))).toEqual(["clipped"]);
  });

  it("two texts on top of each other → label_collision", async () => {
    await withScene((scene) => {
      const a = scene.items.find((i) => i.t === "text" && i.text === "A")!;
      return { ...scene, items: [...scene.items, { ...a, text: "Z", partId: undefined }] };
    });
    const issues = checkSpec(TRIANGLE, ["A", "B", "C", "Z"]);
    expect(codes(issues)).toEqual(["label_collision"]);
  });

  it("keeps the builder's own issues", () => {
    const spec = geo([pt("A", 0, 0), pt("B", 0, 0), seg("AB", "A", "B")]);
    expect(codes(checkSpec(spec, []))).toContain("off_line");
  });
});

describe("point `on` in the spec", () => {
  it("must name a line, circle, arc, polygon or function", () => {
    const base = {
      version: FIGURE_SPEC_VERSION,
      type: "geometry2d",
      labels: [],
      marks: [],
    };
    const missing = parseFigureSpec({ ...base, parts: [pt("P", 0, 0, ["k"])] });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.join()).toContain('"k"');
    const notALine = parseFigureSpec({ ...base, parts: [pt("Q", 1, 1), pt("P", 0, 0, ["Q"])] });
    expect(notALine.ok).toBe(false);
  });
});
