// ============================================================
// import-figure — the figure fields an imported question carries,
// validated with Zod before importQuestion() writes them.
//
// The student quiz shows a figure from exactly these columns
// (src/lib/student-quiz-payload.ts, ActiveQuizScreen):
//   figure_kind 'table'     → figure_table_data   (QuestionTable)
//   figure_kind 'chart'     → figure_chart_data   (ChartFigure)
//   figure_kind 'geometric' → figure_geometry_data (GeometryFigure,
//                              only when buildGeometrySvg renders it)
//   figure_kind 'image'     → figure_svg (a founder-approved,
//                              hand-drawn SVG, inlined through the
//                              quiz sanitizer) or a raster image_url
// plus image_alt and answer_choices.choice_table_data. A kind with
// data of another kind, or data without its kind, is refused, so
// the row stores only what the quiz will show.
// ============================================================

import { z } from "zod";
import type { QuestionTableData } from "@/types/question-table";
import type { ChartFigure } from "@/types/chart";
import { buildGeometrySvg, type GeometryFigureData } from "@/lib/figures/geometry-svg";
import { svgFigureProblems } from "@/lib/figures/svg-figure-check";
import { isValidChoiceTableData } from "./choice-table";
import { canonicalJson } from "../../../scripts/pdf-pipeline/reviewed-input-hash";

export const IMPORT_FIGURE_KINDS = ["table", "chart", "geometric", "image"] as const;
export type ImportFigureKind = (typeof IMPORT_FIGURE_KINDS)[number];

/** The figure columns of one imported question (all optional; null = none). */
export interface ImportFigureFields {
  figure_kind?: ImportFigureKind | null;
  figure_table_data?: QuestionTableData | null;
  figure_chart_data?: ChartFigure | null;
  figure_geometry_data?: GeometryFigureData | null;
  figure_svg?: string | null;
  image_url?: string | null;
  image_alt?: string;
}

const num = z.number().finite();
const point = z.tuple([num, num]);
const text = z.string().max(2000);
const label = text.nullable().optional();
const axis = z.looseObject({
  label: text,
  min: num.nullable().optional(),
  max: num.nullable().optional(),
  tick_step: num.positive().nullable().optional(),
  categories: z.array(text).max(60).nullable().optional(),
  label_step: num.positive().nullable().optional(),
});
const series = z.discriminatedUnion("kind", [
  z.looseObject({ kind: z.literal("scatter"), label, points: z.array(point).min(1).max(2000) }),
  z.looseObject({ kind: z.literal("line"), label, points: z.array(point).min(2).max(2000) }),
  z.looseObject({
    kind: z.literal("bar"),
    label,
    bars: z
      .array(z.object({ category: text, value: num }))
      .min(1)
      .max(60),
  }),
  z.looseObject({
    kind: z.literal("function"),
    label,
    expression: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("linear"), m: num, b: num }),
      z.object({ kind: z.literal("quadratic"), a: num, b: num, c: num }),
      z.object({ kind: z.literal("absolute_value"), a: num, h: num, k: num }),
      z.object({ kind: z.literal("exponential"), a: num, b: num }),
    ]),
    domain: point.nullable().optional(),
  }),
  z.looseObject({
    kind: z.literal("boxplot"),
    label,
    boxes: z
      .array(
        z.object({ category: text.nullable(), min: num, q1: num, median: num, q3: num, max: num })
      )
      .min(1)
      .max(12),
  }),
  z.looseObject({
    kind: z.literal("pie"),
    label,
    slices: z
      .array(z.object({ label: text, value: num.nonnegative() }))
      .min(1)
      .max(24),
  }),
]);

/** A chart ChartFigure.tsx can draw; extractor metadata (confidence, notes) passes through. */
export const importChartSchema = z.looseObject({
  kind: z.enum(["scatterplot", "line_graph", "bar_chart", "function_plot", "boxplot", "pie"]),
  title: label,
  x_axis: axis,
  y_axis: axis,
  show_grid: z.boolean().optional(),
  frame: z.enum(["wide", "square"]).nullable().optional(),
  hide_origin_label: z.boolean().nullable().optional(),
  series: z.array(series).min(1).max(6),
});

const vertex = z.looseObject({ id: z.string().optional(), label, x: num, y: num });
/** Balanced-v1 geometry (the approved label placement) that GeometryFigure renders. */
export const importGeometrySchema = z
  .looseObject({
    layout_version: z.literal("balanced-v1"),
    kind: z.string().optional(),
    shapes: z
      .array(
        z.looseObject({
          kind: z.string().optional(),
          label,
          vertices_or_points: z.array(vertex).min(1),
        })
      )
      .min(1)
      .max(40),
    angle_markings: z.array(z.looseObject({})).optional(),
    length_markings: z.array(z.looseObject({})).optional(),
    notes: text.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const render = buildGeometrySvg(data as GeometryFigureData);
    if (!render.renderable)
      ctx.addIssue({ code: "custom", message: `does not render (${render.reason ?? "unknown"})` });
  });

const tableSchema = z.custom<QuestionTableData>(isValidChoiceTableData, "invalid table");
const svgSchema = z.string().superRefine((svg, ctx) => {
  for (const message of svgFigureProblems(svg)) ctx.addIssue({ code: "custom", message });
});

const figureSchema = z
  .object({
    figure_kind: z.enum(IMPORT_FIGURE_KINDS).nullable().optional(),
    figure_table_data: tableSchema.nullable().optional(),
    figure_chart_data: importChartSchema.nullable().optional(),
    figure_geometry_data: importGeometrySchema.nullable().optional(),
    figure_svg: svgSchema.nullable().optional(),
    image_url: z.string().nullable().optional(),
    image_alt: z.string().nullable().optional(),
  })
  .superRefine((row, ctx) => {
    const need = (ok: unknown, message: string) => {
      if (!ok) ctx.addIssue({ code: "custom", message });
    };
    const kind = row.figure_kind ?? null;
    const owners = {
      figure_table_data: "table",
      figure_chart_data: "chart",
      figure_geometry_data: "geometric",
      figure_svg: "image",
    } as const;
    for (const [field, owner] of Object.entries(owners)) {
      const value = row[field as keyof typeof owners];
      need(value == null || kind === owner, `${field} requires figure_kind=${owner}`);
      need(
        kind !== owner || owner === "image" || value != null,
        `${owner} figure requires ${field}`
      );
    }
    if (kind === "image") {
      need(
        row.figure_svg != null || row.image_url,
        "image figure requires figure_svg or image_url"
      );
      need(row.figure_svg == null || !row.image_url, "figure_svg and image_url cannot both be set");
      need(row.figure_svg == null || row.image_alt?.trim(), "an SVG figure requires image_alt");
    }
  });

/** Zod-validate the figure fields of one import row; [] when they may be written. */
export function figureImportErrors(row: ImportFigureFields): string[] {
  const parsed = figureSchema.safeParse({
    figure_kind: row.figure_kind,
    figure_table_data: row.figure_table_data,
    figure_chart_data: row.figure_chart_data,
    figure_geometry_data: row.figure_geometry_data,
    figure_svg: row.figure_svg,
    image_url: row.image_url,
    image_alt: row.image_alt,
  });
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) =>
    issue.path.length ? `invalid ${issue.path.join(".")}: ${issue.message}` : issue.message
  );
}

/** content_hash_v2 suffix for chart / geometry / SVG figures ("" without one), so two questions
 *  with the same words and different figures are not taken for the same question. */
export function figureHashSuffix(row: ImportFigureFields): string {
  const figures = [
    row.figure_chart_data ?? null,
    row.figure_geometry_data ?? null,
    row.figure_svg ?? null,
  ];
  return figures.some((figure) => figure !== null)
    ? "|native-figures:" + canonicalJson(JSON.parse(JSON.stringify(figures)))
    : "";
}

/** The figure columns importQuestion() inserts. */
export function figureInsertColumns(row: ImportFigureFields) {
  return {
    figure_kind: row.figure_kind ?? null,
    figure_table_data: row.figure_table_data ?? null,
    figure_chart_data: row.figure_chart_data ?? null,
    figure_geometry_data: row.figure_geometry_data ?? null,
    figure_svg: row.figure_svg ?? null,
  };
}
