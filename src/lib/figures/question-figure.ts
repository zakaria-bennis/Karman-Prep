import type { QuizQuestion } from "@/types/quiz";
import type { SpecParser } from "./engine/choice-routing";
import { storedSpecTypes } from "./engine/spec-types";
import { buildGeometrySvg } from "./geometry-svg";
import { logInvalidSpec } from "./invalid-spec-log";

export type DrawnFigure = "spec" | "table" | "chart" | "geometric" | "image";

type FigureFields = Pick<
  QuizQuestion,
  | "figure_kind"
  | "figure_table_data"
  | "figure_chart_data"
  | "figure_geometry_data"
  | "image_url"
  | "figure_svg"
  | "figure_spec"
>;

/**
 * The figure a student screen actually draws for a question, or null when there is nothing
 * to draw. figure_kind alone is not enough: a row can say 'image' (or any kind) and carry no
 * image, SVG or structured data, and such a question must lay out exactly like a question
 * without a figure (no empty figure column or box). Every student surface picks its figure
 * here, in this order: figure_spec (one FigureSpec or an ordered list of them; FigureFrame
 * draws each with the figure engine, stacked), native
 * table, native chart, renderable geometry, then image or SVG. An invalid figure_spec is
 * logged once and skipped: the question falls back to its stored older figure when it has one
 * (FigureFrame draws the same fallback), else lays out like no figure at all (null, with no
 * empty figure column). A partial spec figure is never drawn.
 *
 * `parse` is parseFigureSpecs from the lazily loaded figure engine (useFigureEngine), or null
 * before it has loaded (and on the server). Without it a spec (or list) whose figures all
 * have a known `type` is taken
 * as drawn and FigureFrame validates it when it draws (an invalid one shows the stored src
 * or svg, else nothing, and logs the same error); once the engine loads, the screen picks
 * again with `parse`.
 */
export function drawnFigure(q: FigureFields, parse: SpecParser | null = null): DrawnFigure | null {
  if (q.figure_spec !== null && q.figure_spec !== undefined) {
    if (!parse) return storedSpecTypes(q.figure_spec) ? "spec" : legacyFigure(q);
    const parsed = parse(q.figure_spec);
    if (parsed.ok) return "spec";
    const legacy = legacyFigure(q);
    logInvalidSpec(parsed.errors.join("; "), legacy !== null);
    return legacy;
  }
  return legacyFigure(q);
}

/** The figure the older fields draw, in order: table, chart, renderable geometry, image or SVG. */
function legacyFigure(q: FigureFields): DrawnFigure | null {
  if (q.figure_kind === "table" && q.figure_table_data) return "table";
  if (q.figure_kind === "chart" && q.figure_chart_data) return "chart";
  if (
    q.figure_kind === "geometric" &&
    q.figure_geometry_data &&
    buildGeometrySvg(q.figure_geometry_data).renderable
  )
    return "geometric";
  if (q.image_url || q.figure_svg) return "image";
  return null;
}
