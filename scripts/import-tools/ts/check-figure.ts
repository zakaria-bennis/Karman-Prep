#!/usr/bin/env -S npx tsx
// Can the real renderers draw this figure.json? Used by `k figures submit` (and the sweep over
// ready_for_founder figures) so a figure that would render blank never reaches the founder.
//
// It runs the same functions the app and the importer run: figureImportErrors (table data via
// isValidChoiceTableData, chart schema, buildGeometrySvg for geometry, svgFigureProblems for SVG)
// plus the same table check for each answer choice's choice_table_data.
//
// Usage: npx tsx scripts/import-tools/ts/check-figure.ts <figure.json>
// Prints {"ok": true} or {"ok": false, "errors": ["..."]}; exit 0 either way (2 if unreadable).

import { readFileSync } from "node:fs";
import { isValidChoiceTableData } from "@/lib/question-bank/choice-table";
import { figureImportErrors, type ImportFigureFields } from "@/lib/question-bank/import-figure";

type Obj = Record<string, unknown>;

export function figureRenderErrors(doc: Obj): string[] {
  const errors = figureImportErrors({
    figure_kind: (doc.figure_kind ?? null) as ImportFigureFields["figure_kind"],
    figure_table_data: (doc.figure_table_data ?? null) as ImportFigureFields["figure_table_data"],
    figure_chart_data: (doc.figure_chart_data ?? null) as ImportFigureFields["figure_chart_data"],
    figure_geometry_data: (doc.figure_geometry_data ??
      null) as ImportFigureFields["figure_geometry_data"],
    figure_svg: (doc.figure_svg ?? null) as string | null,
    image_url: (doc.image_url ?? null) as string | null,
    image_alt: typeof doc.image_alt === "string" ? doc.image_alt : undefined,
  });
  const choices = Array.isArray(doc.answer_choices) ? (doc.answer_choices as Obj[]) : [];
  for (const c of choices) {
    if (c && c.choice_table_data != null && !isValidChoiceTableData(c.choice_table_data))
      errors.push(`choice ${String(c.letter)}: choice_table_data is not a table the quiz can draw`);
  }
  return errors;
}

const path = process.argv[2];
if (path && /check-figure\.ts$/.test(process.argv[1] ?? "")) {
  try {
    const errors = figureRenderErrors(JSON.parse(readFileSync(path, "utf8")) as Obj);
    console.log(JSON.stringify(errors.length ? { ok: false, errors } : { ok: true }));
  } catch (e) {
    console.error(`cannot read ${path}: ${(e as Error).message}`);
    process.exit(2);
  }
}
