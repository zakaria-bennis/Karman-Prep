import { z } from "zod";

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

const point = z.object({ kind: z.literal("point"), id, x: num, y: num }).strict();

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

const region = z.object({ kind: z.literal("region"), id, latex: z.string().min(1) }).strict();

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

const solid = z
  .object({
    kind: z.literal("solid"),
    id,
    shape: z.enum(["prism", "cylinder", "cone", "pyramid", "sphere"]),
    dims: z.record(z.string(), num),
    /** oblique (the SAT's default, 30° at half depth) or isometric. */
    view: z.enum(["oblique", "isometric"]).optional(),
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
    /** false: no "0" where the axes meet (printed SAT figures often leave it off). */
    originLabel: z.boolean().optional(),
    /** false: no grid lines. */
    grid: z.boolean().optional(),
    xLabel: z.string().optional(),
    yLabel: z.string().optional(),
  })
  .strict();

export const FIGURE_TYPES = [
  "table",
  "bar",
  "line",
  "scatter",
  "dot_plot",
  "histogram",
  "box_plot",
  "plane",
  "geometry2d",
  "solid3d",
] as const;

export const FigureSpecSchema = z
  .object({
    version: z.literal(FIGURE_SPEC_VERSION),
    type: z.enum(FIGURE_TYPES),
    parts: z.array(PartSchema),
    labels: z.array(LabelSchema),
    marks: z.array(MarkSchema),
    frame: PlaneFrameSchema.optional(),
    notToScale: z.boolean().optional(),
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
  // A label may also name one dimension of a solid ("can.radius").
  const labelTargets = new Set(seen);
  for (const part of spec.parts) {
    if (part.kind !== "solid") continue;
    for (const k of Object.keys(part.dims)) labelTargets.add(`${part.id}.${k}`);
  }
  for (const label of spec.labels) {
    if (!labelTargets.has(label.on)) {
      errors.push(`label "${label.text}": references missing part "${label.on}"`);
    }
  }
  for (const mark of spec.marks) {
    for (const ref of mark.on) {
      if (!seen.has(ref)) {
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
