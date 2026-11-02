import { z } from "zod";
import { FIGURE_TYPES } from "./spec-types";

/**
 * FigureSpec: the one JSON format that describes every SAT question figure.
 * Specs never carry colors or pixel sizes; those come from the theme.
 * Every object is strict, so unknown fields (a stroke color, a width) are
 * rejected rather than silently ignored.
 */
export const FIGURE_SPEC_VERSION = "figure-spec/1";

const THEME_MESSAGE = "colors and sizes come from the theme";

const id = z.string().min(1);
const num = z.number().finite();

const point = z
  .object({
    kind: z.literal("point"),
    id,
    x: num,
    y: num,
    /**
     * The parts this point lies on: a segment, ray, line, circle, arc, polygon
     * or function. The checks (checks.ts) refuse the figure when it does not.
     */
    on: z.array(id).min(1).optional(),
  })
  .strict();

const twoPoint = (kind: "segment" | "ray" | "line") =>
  z.object({ kind: z.literal(kind), id, from: id, to: id }).strict();

const circle = z
  .object({
    kind: z.literal("circle"),
    id,
    center: id,
    radius: num.positive().optional(),
    through: id.optional(),
  })
  .strict()
  .refine((c) => (c.radius === undefined) !== (c.through === undefined), {
    message: "a circle needs exactly one of radius or through",
  });

const arc = z.object({ kind: z.literal("arc"), id, center: id, from: id, to: id }).strict();

const angle = z.object({ kind: z.literal("angle"), id, vertex: id, from: id, to: id }).strict();

const polygon = z.object({ kind: z.literal("polygon"), id, points: z.array(id).min(3) }).strict();

const fn = z
  .object({
    kind: z.literal("function"),
    id,
    latex: z.string().min(1),
    domain: z.tuple([num, num]).optional(),
    /**
     * The graph as world-unit polylines, already broken at gaps and
     * asymptotes. Filled when the figure is authored
     * (scripts/figures/sample-spec.ts); the engine draws only these.
     */
    samples: z.array(z.array(z.tuple([num, num]))).optional(),
  })
  .strict();

const region = z
  .object({
    kind: z.literal("region"),
    id,
    /** The inequality, or a system of up to 4 separated by commas, semicolons or a LaTeX line break. */
    latex: z.string().min(1),
    /**
     * The line or curve parts that draw the region's edge. They keep their own
     * styling: a strict inequality's edge is dashed only when that part is
     * marked hidden_dashed.
     */
    boundary: z.array(id).min(1).optional(),
    /**
     * The shaded area as closed world-unit rings, already clipped to the
     * frame; holes are separate rings (even-odd fill). Filled when the figure
     * is authored (scripts/figures/sample-spec.ts); the engine draws only these.
     */
    samples: z.array(z.array(z.tuple([num, num]))).optional(),
  })
  .strict();

/**
 * The dimensions each solid needs, named as the SAT words them. A label
 * attaches to one with `on: "<solid id>.<dimension>"` ("can.radius").
 */
export const SOLID_DIMS = {
  prism: ["length", "width", "height"],
  cylinder: ["radius", "height"],
  cone: ["radius", "height"],
  pyramid: ["baseLength", "baseWidth", "height"],
  sphere: ["radius"],
} as const;

export type SolidShape = keyof typeof SOLID_DIMS;

/**
 * Where a named point sits on a solid. `apex`: a cone's or pyramid's top;
 * `center`: the base's center (a sphere's center); `top`: a cylinder's top
 * center; `rim` and `topRim`: on the base or top circle at `angle`.
 */
export const SOLID_POINT_PLACES = {
  prism: [],
  cylinder: ["center", "top", "rim", "topRim"],
  cone: ["apex", "center", "rim"],
  pyramid: ["apex", "center"],
  sphere: ["center", "rim"],
} as const;

/** Degrees around a circle seen from above: 0 the viewer's right, 90 straight back, 180 left, 270 front. */
const around = num.min(-360).max(360);

const solidPoint = z
  .object({
    id,
    at: z.enum(["apex", "center", "top", "rim", "topRim"]),
    angle: around.optional(),
    /** false: no dot (Bluebook leaves it off a vertex or a line's end, 2026-06_US_V3_MATH_M2_Q06's V and P). */
    dot: z.boolean().optional(),
  })
  .strict();

const solid = z
  .object({
    kind: z.literal("solid"),
    id,
    shape: z.enum(["prism", "cylinder", "cone", "pyramid", "sphere"]),
    dims: z.record(z.string(), num),
    /**
     * The camera, in degrees, when it differs from the shape's Bluebook view
     * (BLUEBOOK_VIEW in solid-camera.ts): `turn` about the solid's vertical
     * axis, `tilt` down from level (a circle flattens to sin(tilt)), `lean`
     * of the whole drawing on the page.
     */
    view: z
      .object({
        turn: around.optional(),
        tilt: num.min(-89).max(89).optional(),
        lean: num.min(-90).max(90).optional(),
      })
      .strict()
      .optional(),
    /** Where the radius runs from its center, in degrees around the circle (as a point's angle). */
    radiusAngle: around.optional(),
    /** Inner lines drawn without a label (a labeled one is always drawn). */
    show: z.array(z.enum(["radius", "height"])).optional(),
    /** Named points, each drawn as a dot; a label names one as "<solid id>.<point id>". */
    points: z.array(solidPoint).optional(),
  })
  .strict()
  .refine(
    (s) => {
      const need: readonly string[] = SOLID_DIMS[s.shape];
      const keys = Object.keys(s.dims);
      return keys.length === need.length && need.every((k) => k in s.dims && s.dims[k] > 0);
    },
    {
      error: (issue) => {
        const s = issue.input as { shape: SolidShape };
        return `a ${s.shape} needs exactly the positive dims ${SOLID_DIMS[s.shape].join(", ")}`;
      },
    }
  );

const table = z
  .object({
    kind: z.literal("table"),
    id,
    header: z.array(z.string()).optional(),
    rows: z.array(z.array(z.string())),
    blankCorner: z.boolean().optional(),
    /**
     * Merged headings in a row above `header`, each spanning `span` columns
     * ("Grade level" over four grade columns). An empty label is a blank cell.
     */
    groups: z
      .array(z.object({ label: z.string(), span: z.number().int().positive() }).strict())
      .optional(),
    /** A note printed under the table ("Calculations may be inexact due to rounding."). */
    note: z.string().optional(),
  })
  .strict();

const series = z
  .object({
    kind: z.literal("series"),
    id,
    // The series' own chart kind (bar, line, scatter, and so on).
    seriesKind: z.string().min(1).optional(),
    values: z.array(z.union([num, z.tuple([num, num])])),
  })
  .strict();

export const PartSchema = z.discriminatedUnion("kind", [
  point,
  circle,
  twoPoint("segment"),
  twoPoint("ray"),
  twoPoint("line"),
  arc,
  angle,
  polygon,
  fn,
  region,
  solid,
  table,
  series,
]);

export const LabelSchema = z
  .object({
    text: z.string(),
    on: id,
    at: z.enum(["start", "end", "mid", "inside"]).optional(),
  })
  .strict();

export const MarkSchema = z
  .object({
    kind: z.enum(["right_angle", "equal_ticks", "equal_arcs", "parallel", "hidden_dashed"]),
    on: z.array(id).min(1),
    count: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  })
  .strict();

/** The most grid ticks a frame's explicit step may give one axis. */
export const MAX_TICKS = 200;

/** Ticks `step` gives over `range` (0 without a step: the automatic step is always readable). */
const tickCount = ([lo, hi]: [number, number], step?: number) =>
  step ? Math.floor((hi - lo) / step) + 1 : 0;

export const PlaneFrameSchema = z
  .object({
    x: z.tuple([num, num]),
    y: z.tuple([num, num]),
    /** Grid and tick step on both axes (on x only when yStep is set). */
    step: num.positive().optional(),
    /** Grid and tick step on the y-axis, when it differs from x. */
    yStep: num.positive().optional(),
    /** Label every labelStep on x (and y, unless yLabelStep), not every tick. */
    labelStep: num.positive().optional(),
    yLabelStep: num.positive().optional(),
    /** Category names along x, one band each (bar charts). */
    categories: z.array(z.string()).optional(),
    /**
     * The label where the axes meet: "0" (true, the default), the SAT's italic "O"
     * ("O"), or none (false: printed SAT figures often leave it off).
     */
    originLabel: z.union([z.boolean(), z.literal("O")]).optional(),
    /** false: no grid lines. */
    grid: z.boolean().optional(),
    /** The axis names: a short one (x, y, t) is the letter at the axis end, a longer one a title. */
    xLabel: z.string().optional(),
    yLabel: z.string().optional(),
    /**
     * Axis titles printed beside the letter ("Time (minutes)" under the x-axis, a y
     * title turned upright left of the y-axis). With a title, xLabel and yLabel are
     * only the letters, drawn when given.
     */
    xTitle: z.string().optional(),
    yTitle: z.string().optional(),
    /** Group thousands in tick numbers with commas ("1,200"): true on both axes, or one axis. */
    thousands: z.union([z.boolean(), z.enum(["x", "y"])]).optional(),
    /** Arrowheads on the axes: true at the positive ends, "both" at both ends. */
    arrows: z.union([z.boolean(), z.literal("both")]).optional(),
    /**
     * Category names turned 45°: true always, false never (they wrap). Unset, they
     * turn only when one does not fit its band.
     */
    rotateCategories: z.boolean().optional(),
  })
  .strict()
  .refine((f) => f.x[0] < f.x[1], { message: "a frame's x range must run from low to high" })
  .refine((f) => f.y[0] < f.y[1], { message: "a frame's y range must run from low to high" })
  .refine((f) => tickCount(f.x, f.step) <= MAX_TICKS, {
    message: `a frame's step gives more than ${MAX_TICKS} ticks on the x-axis; use a wider step`,
  })
  .refine((f) => tickCount(f.y, f.yStep ?? f.step) <= MAX_TICKS, {
    message: `a frame's step gives more than ${MAX_TICKS} ticks on the y-axis; use a wider step`,
  });

export const FigureSpecSchema = z
  .object({
    version: z.literal(FIGURE_SPEC_VERSION),
    type: z.enum(FIGURE_TYPES),
    parts: z.array(PartSchema),
    labels: z.array(LabelSchema),
    marks: z.array(MarkSchema),
    frame: PlaneFrameSchema.optional(),
    /**
     * The note under a shape or solid: true prints "Note: Figure not drawn to scale.";
     * "figures" prints the plural note once under the last of several figures.
     */
    notToScale: z.union([z.boolean(), z.literal("figures")]).optional(),
    title: z.string().optional(),
  })
  .strict();

export type Part = z.infer<typeof PartSchema>;
export type Label = z.infer<typeof LabelSchema>;
export type Mark = z.infer<typeof MarkSchema>;
export type PlaneFrame = z.infer<typeof PlaneFrameSchema>;
export type FigureSpec = z.infer<typeof FigureSpecSchema>;

export type ParseResult = { ok: true; spec: FigureSpec } | { ok: false; errors: string[] };

function formatIssues(issues: z.core.$ZodIssue[], prefix: string): string[] {
  const out: string[] = [];
  for (const issue of issues) {
    const path = issue.path.length ? ` at ${issue.path.join(".")}` : "";
    if (issue.code === "unrecognized_keys") {
      out.push(`${prefix}${THEME_MESSAGE} (unexpected: ${issue.keys.join(", ")})`);
    } else {
      out.push(`${prefix}${issue.message}${path}`);
    }
  }
  return out;
}

const POINT_REFS: Record<string, string[]> = {
  segment: ["from", "to"],
  ray: ["from", "to"],
  line: ["from", "to"],
  circle: ["center", "through"],
  arc: ["center", "from", "to"],
  angle: ["vertex", "from", "to"],
};

/** The parts a point can be declared `on`. */
const ON_KINDS = new Set(["segment", "ray", "line", "circle", "arc", "polygon", "function"]);

function checkReferences(spec: FigureSpec): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const pointIds = new Set<string>();
  for (const part of spec.parts) {
    if (seen.has(part.id)) errors.push(`part "${part.id}": duplicate id`);
    seen.add(part.id);
    if (part.kind === "point") pointIds.add(part.id);
  }
  for (const part of spec.parts) {
    const refs: string[] = [];
    const record = part as Record<string, unknown>;
    for (const key of POINT_REFS[part.kind] ?? []) {
      const v = record[key];
      if (typeof v === "string") refs.push(v);
    }
    if (part.kind === "polygon") refs.push(...part.points);
    for (const ref of refs) {
      if (!pointIds.has(ref)) {
        errors.push(`part "${part.id}": references missing point "${ref}"`);
      }
    }
  }
  // A point may lie only on something drawn as a line or curve.
  const kinds = new Map(spec.parts.map((p) => [p.id, p.kind]));
  for (const part of spec.parts) {
    if (part.kind !== "point") continue;
    for (const ref of part.on ?? []) {
      const kind = kinds.get(ref);
      if (!kind) errors.push(`point "${part.id}": on references missing part "${ref}"`);
      else if (!ON_KINDS.has(kind)) {
        errors.push(`point "${part.id}": on "${ref}" is a ${kind}, not a line or curve`);
      }
    }
  }
  // A region's boundary is drawn by line or curve parts.
  for (const part of spec.parts) {
    if (part.kind !== "region") continue;
    for (const ref of part.boundary ?? []) {
      const kind = kinds.get(ref);
      if (!kind) errors.push(`region "${part.id}": boundary references missing part "${ref}"`);
      else if (!ON_KINDS.has(kind)) {
        errors.push(`region "${part.id}": boundary "${ref}" is a ${kind}, not a line or curve`);
      }
    }
  }
  // A label may also name one dimension or named point of a solid ("can.radius", "cone.A"),
  // and a mark one dimension ("cone.height").
  const labelTargets = new Set(seen);
  const markTargets = new Set(seen);
  for (const part of spec.parts) {
    if (part.kind !== "solid") continue;
    for (const k of Object.keys(part.dims)) {
      labelTargets.add(`${part.id}.${k}`);
      markTargets.add(`${part.id}.${k}`);
    }
    const places: readonly string[] = SOLID_POINT_PLACES[part.shape];
    for (const p of part.points ?? []) {
      const ref = `${part.id}.${p.id}`;
      if (labelTargets.has(ref)) errors.push(`solid "${part.id}": point "${p.id}" repeats a name`);
      labelTargets.add(ref);
      if (!places.includes(p.at)) {
        errors.push(`solid "${part.id}": a ${part.shape} has no point at "${p.at}"`);
      }
      const onCircle = p.at === "rim" || p.at === "topRim";
      if (onCircle !== (p.angle !== undefined)) {
        errors.push(
          `solid "${part.id}": point "${p.id}" needs an angle exactly when it is on a rim`
        );
      }
    }
  }
  for (const label of spec.labels) {
    if (!labelTargets.has(label.on)) {
      errors.push(`label "${label.text}": references missing part "${label.on}"`);
    }
  }
  for (const mark of spec.marks) {
    for (const ref of mark.on) {
      if (!markTargets.has(ref)) {
        errors.push(`mark ${mark.kind}: references missing part "${ref}"`);
      }
    }
  }
  return errors;
}

/**
 * Validate an unknown value as a FigureSpec. Parts are parsed one by one so
 * every error names the offending part id, then references are checked.
 */
export function parseFigureSpec(input: unknown): ParseResult {
  const shell = FigureSpecSchema.extend({ parts: z.array(z.unknown()) }).safeParse(input);
  if (!shell.success) {
    return { ok: false, errors: formatIssues(shell.error.issues, "") };
  }
  const errors: string[] = [];
  const parts: Part[] = [];
  shell.data.parts.forEach((raw, index) => {
    const parsed = PartSchema.safeParse(raw);
    if (parsed.success) {
      parts.push(parsed.data);
      return;
    }
    const rawId =
      raw && typeof raw === "object" && typeof (raw as { id?: unknown }).id === "string"
        ? (raw as { id: string }).id
        : `#${index}`;
    const kind = (raw as { kind?: unknown } | null)?.kind;
    const known = PartSchema.options.some((o) => o.shape.kind.value === kind);
    const prefix = `part "${rawId}": `;
    if (!known) {
      errors.push(`${prefix}unknown part kind ${JSON.stringify(kind)}`);
    } else {
      errors.push(...formatIssues(parsed.error.issues, prefix));
    }
  });
  if (errors.length) return { ok: false, errors };
  const spec: FigureSpec = { ...shell.data, parts };
  const refErrors = checkReferences(spec);
  if (refErrors.length) return { ok: false, errors: refErrors };
  return { ok: true, spec };
}

/** Most figures one stored figure_spec or choice_figure_spec may hold. */
export const MAX_FIGURES = 4;

export type SpecsResult = { ok: true; specs: FigureSpec[] } | { ok: false; errors: string[] };

/**
 * Validate a stored figure_spec or choice_figure_spec: one FigureSpec, or an
 * ordered list of 1 to MAX_FIGURES of them (a question may print more than one
 * figure, such as two separate tables). Each is checked with parseFigureSpec;
 * in a list every error names its figure ("figure 2: ..."). One invalid figure
 * makes the whole value invalid: a partial set of figures is never drawn.
 */
export function parseFigureSpecs(input: unknown): SpecsResult {
  if (!Array.isArray(input)) {
    const one = parseFigureSpec(input);
    return one.ok ? { ok: true, specs: [one.spec] } : one;
  }
  if (input.length === 0) return { ok: false, errors: ["a list of figures cannot be empty"] };
  if (input.length > MAX_FIGURES) {
    return { ok: false, errors: [`a list holds at most ${MAX_FIGURES} figures`] };
  }
  const specs: FigureSpec[] = [];
  const errors: string[] = [];
  input.forEach((raw, i) => {
    const one = parseFigureSpec(raw);
    if (one.ok) specs.push(one.spec);
    else errors.push(...one.errors.map((e) => `figure ${i + 1}: ${e}`));
  });
  return errors.length ? { ok: false, errors } : { ok: true, specs };
}
