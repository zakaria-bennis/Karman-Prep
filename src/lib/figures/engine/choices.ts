/**
 * Figure answer choices (figure engine spec §2). When a question's choices are
 * graphs, charts or shapes, each choice holds its own FigureSpec, and the four
 * are drawn in one frame (the same ranges and scale) at one size, so a student
 * compares the drawings and never the windows they were drawn in.
 *
 * A choice whose spec is a table is not drawn here: withSpecTables hands it to
 * the table-choice path (a radio beside an HTML table) as choice_table_data.
 */
import type { QuestionTableData } from "@/types/question-table";
import { chartSpecFrame } from "./charts";
import { specToTableData } from "./from-table-data";
import { buildScene, type Box } from "./index";
import { DEFAULT_PLANE_FRAME } from "./plane";
import type { Scene } from "./scene";
import { parseFigureSpec, type FigureSpec, type PlaneFrame } from "./spec";

/**
 * The box every figure choice is laid out in. Small on purpose: the house font
 * (15 units) must render at 12px or more, so a choice's figure may shrink to
 * 0.8 of this width and no further. The choice grid (FigureChoices) only puts
 * two choices side by side when each figure gets at least that width.
 */
export const CHOICE_BOX: Box = { width: 240, height: 180 };

/** The frame a plane or chart spec is drawn in, or null for shapes, solids and tables. */
function frameOf(spec: FigureSpec): PlaneFrame | null {
  if (spec.type === "plane") return spec.frame ?? DEFAULT_PLANE_FRAME;
  return chartSpecFrame(spec);
}

/**
 * One frame for all the choices: the union of their ranges. Steps, labels and
 * axis titles come from the first choice that sets them; bar categories from the
 * choice with the most. Throws when no spec is a plane or a chart.
 */
export function sharedFrame(specs: FigureSpec[]): PlaneFrame {
  const frames = specs.map(frameOf).filter((f): f is PlaneFrame => f !== null);
  if (frames.length === 0) throw new Error("sharedFrame: no plane or chart among the specs");
  const shared: PlaneFrame = { ...frames[0] };
  for (const key of [
    "step",
    "yStep",
    "labelStep",
    "yLabelStep",
    "xLabel",
    "yLabel",
    "grid",
    "originLabel",
  ] as const) {
    const set = frames.find((f) => f[key] !== undefined);
    if (set) (shared as Record<string, unknown>)[key] = set[key];
  }
  shared.x = [Math.min(...frames.map((f) => f.x[0])), Math.max(...frames.map((f) => f.x[1]))];
  shared.y = [Math.min(...frames.map((f) => f.y[0])), Math.max(...frames.map((f) => f.y[1]))];
  const categories = frames
    .map((f) => f.categories)
    .filter((c): c is string[] => !!c)
    .sort((a, b) => b.length - a.length)[0];
  if (categories) shared.categories = categories;
  return shared;
}

/** The valid drawn (non-table) spec of a stored choice_figure_spec, or null. */
function drawnSpec(input: unknown): FigureSpec | null {
  if (input === null || input === undefined) return null;
  const parsed = parseFigureSpec(input);
  return parsed.ok && parsed.spec.type !== "table" ? parsed.spec : null;
}

/**
 * The Scene of each choice, in order, all in CHOICE_BOX and one shared frame and
 * padded to one height (a chart's legend or title makes it taller). Null for a
 * choice with no spec, an invalid spec, or a table spec.
 */
export function choiceScenes(specs: unknown[]): (Scene | null)[] {
  const drawn = specs.map(drawnSpec);
  const valid = drawn.filter((s): s is FigureSpec => s !== null);
  const framed = valid.some((s) => frameOf(s) !== null);
  const frame = framed ? sharedFrame(valid) : null;
  const scenes = drawn.map((spec) => {
    if (!spec) return null;
    try {
      const own = frame && frameOf(spec) ? { ...spec, frame } : spec;
      return buildScene(own, CHOICE_BOX);
    } catch {
      return null;
    }
  });
  const height = Math.max(0, ...scenes.map((s) => s?.height ?? 0));
  const width = Math.max(0, ...scenes.map((s) => s?.width ?? 0));
  return scenes.map((s) =>
    s && (s.height !== height || s.width !== width) ? { ...s, width, height } : s
  );
}

type ChoiceFigureFields = {
  choice_figure_spec?: unknown;
  choice_table_data?: QuestionTableData | null;
};

/** True when any choice has a valid drawn spec: the question's choices are figures. */
export function hasFigureChoices(choices: readonly ChoiceFigureFields[]): boolean {
  return choices.some((c) => drawnSpec(c.choice_figure_spec) !== null);
}

/**
 * The choices with every table choice_figure_spec turned into the choice_table_data
 * it draws (an existing choice_table_data is kept), so table choices keep one path.
 */
export function withSpecTables<T extends ChoiceFigureFields>(choices: readonly T[]): T[] {
  return choices.map((c) => {
    if (c.choice_table_data || c.choice_figure_spec == null) return c;
    const parsed = parseFigureSpec(c.choice_figure_spec);
    const table = parsed.ok ? specToTableData(parsed.spec) : null;
    return table ? { ...c, choice_table_data: table } : c;
  });
}
