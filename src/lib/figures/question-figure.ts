import type { QuizQuestion } from "@/types/quiz";
import { buildGeometrySvg } from "./geometry-svg";

export type DrawnFigure = "table" | "chart" | "geometric" | "image";

type FigureFields = Pick<
  QuizQuestion,
  | "figure_kind"
  | "figure_table_data"
  | "figure_chart_data"
  | "figure_geometry_data"
  | "image_url"
  | "figure_svg"
>;

/**
 * The figure a student screen actually draws for a question, or null when there is nothing
 * to draw. figure_kind alone is not enough: a row can say 'image' (or any kind) and carry no
 * image, SVG or structured data, and such a question must lay out exactly like a question
 * without a figure (no empty figure column or box). Every student surface picks its figure
 * here, in this order: native table, native chart, renderable geometry, then image or SVG.
 */
export function drawnFigure(q: FigureFields): DrawnFigure | null {
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
