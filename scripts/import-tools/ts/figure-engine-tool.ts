#!/usr/bin/env -S npx tsx
// @ts-nocheck -- runs in the engine checkout (FIGURE_ENGINE_DIR), whose `@/lib/figures/*` this
// branch does not have; it is type-checked there by tsx at run time, not by this branch's tsc.
// `k figures convert-live` and `k figures publish-specs`: the figure engine's own code on live rows.
// Runs with cwd = an app checkout that has the figure engine (FIGURE_ENGINE_DIR), so every
// `@/` import below is that checkout's code; this file imports nothing from this branch.
//
//   npx tsx <this file> convert <input.json>
//     input {"rows": [<live row with answer_choices>]}. For each row, the specs the screen
//     already draws from the old data: figure_table_data through tableDataToSpecs (figure_kind
//     table; a list when the data joined separate tables), figure_chart_data through
//     chartDataToSpec (figure_kind chart), each choice_table_data through tableDataToSpecs,
//     exactly as TableFigure and ChartView convert them at runtime. Prints {"rows": [{id, ok, error?, kind, figure_spec, choice_specs,
//     transcribed_labels, choice_labels}]}. The transcription of a mechanical conversion is
//     the old data itself: every text the converted figure draws (`drawnTexts`), so the label
//     check finds nothing invented or dropped by construction; every other check runs in full.
//
//   npx tsx <this file> draws <input.json>
//     input {"rows": [{id, row, figure_spec, choice_specs}]}: would the student screen draw the
//     new specs? figure_spec (one FigureSpec or an ordered list) must parse with the engine's
//     own parser and drawnFigure must pick it ("spec") over the old fields; every choice spec
//     must parse. Prints {"rows": [{id, ok, error?}]}.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { drawnFigure } from "@/lib/figures/question-figure";
import * as specModule from "@/lib/figures/engine/spec";
import { checkSpec } from "@/lib/figures/engine/checks";
import { buildScene, defaultBox } from "@/lib/figures/engine/index";
import * as tableModule from "@/lib/figures/engine/from-table-data";
import { chartDataToSpec } from "@/lib/figures/engine/from-chart-data";
import type { FigureSpec } from "@/lib/figures/engine/spec";

type Obj = Record<string, unknown>;

/** The table specs old table data draws, as the screen converts it: tableDataToSpecs (one
 *  spec, or one per table when the data joined separate tables) where this checkout has it,
 *  else tableDataToSpec. */
function tableSpecs(data: unknown): FigureSpec[] {
  const m = tableModule as unknown as {
    tableDataToSpecs?: (d: unknown) => FigureSpec[];
    tableDataToSpec?: (d: unknown) => FigureSpec;
  };
  if (m.tableDataToSpecs) return m.tableDataToSpecs(data);
  if (m.tableDataToSpec) return [m.tableDataToSpec(data)];
  throw new Error("this engine checkout has no table converter");
}
type Parsed = { ok: true } | { ok: false; errors: string[] };

/** The engine's parser for a stored figure_spec: the list-aware one when this checkout has it. */
function parseStored(input: unknown): Parsed {
  const many = (specModule as unknown as { parseFigureSpecs?: (i: unknown) => Parsed })
    .parseFigureSpecs;
  if (many) return many(input);
  if (Array.isArray(input))
    return { ok: false, errors: ["this engine checkout cannot draw a list of figures yet"] };
  return specModule.parseFigureSpec(input);
}

const norm = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/[−‐-―]/g, "-")
    .replace(/\s+/g, "");

/** Every text the figure draws, as check-spec compares it (repeats kept). */
async function drawnTexts(spec: FigureSpec): Promise<string[]> {
  if (spec.type === "table") {
    const part = spec.parts.find((p) => p.kind === "table");
    if (!part || part.kind !== "table") return [];
    const out: string[] = [];
    const push = (t: string | undefined) => {
      if (t && t.trim()) out.push(t);
    };
    push(spec.title);
    for (const g of part.groups ?? []) push(g.label);
    for (const h of part.header ?? []) push(h);
    for (const row of part.rows) for (const c of row) push(c);
    push(part.note);
    return out;
  }
  const { sampleSpec } = (await import(
    join(process.cwd(), "scripts/figures/sample-functions.ts")
  )) as {
    sampleSpec: (s: FigureSpec) => FigureSpec;
  };
  const sampled = sampleSpec(spec);
  const scene = buildScene(sampled, defaultBox(sampled));
  let labels = scene.items.flatMap((i) => (i.t === "text" ? [i.text] : []));
  // A title or note wrapped onto several drawn lines is one text in the data: take the
  // checker's own reading of what is drawn and what the data says, until they agree.
  for (let round = 0; round < 4; round++) {
    const issues = checkSpec(sampled, labels).filter((i) => i.code === "missing_label");
    if (!issues.length) break;
    for (const i of issues) {
      const text = /^"(.*)" (is not in original|from the original is not drawn)$/.exec(i.detail);
      if (!text) continue;
      if (text[2] === "is not in original") labels.push(text[1]);
      else {
        const at = labels.findIndex((l) => norm(l) === norm(text[1]));
        if (at >= 0) labels.splice(at, 1);
      }
    }
    labels = [...labels];
  }
  return labels;
}

async function convertOne(row: Obj) {
  const choices = (row.answer_choices ?? []) as Obj[];
  const kind = row.figure_kind;
  let figure: FigureSpec | FigureSpec[] | null = null;
  let what: "table" | "chart" | null = null;
  if (row.figure_table_data != null) {
    if (kind !== "table")
      throw new Error(
        `figure_table_data is set but figure_kind is ${String(kind)}: not what students see`
      );
    const specs = tableSpecs(row.figure_table_data);
    figure = specs.length === 1 ? specs[0] : specs;
    what = "table";
  }
  if (row.figure_chart_data != null) {
    if (kind !== "chart" || figure)
      throw new Error(
        `figure_chart_data is set but figure_kind is ${String(kind)}: not what students see`
      );
    figure = chartDataToSpec(row.figure_chart_data);
    what = "chart";
  }
  const choiceSpecs: Record<string, FigureSpec> = {};
  const choiceLabels: Record<string, string[]> = {};
  for (const c of choices) {
    if (c.choice_table_data == null) continue;
    const specs = tableSpecs(c.choice_table_data);
    if (specs.length !== 1)
      throw new Error(`choice ${String(c.letter)}: its table data draws ${specs.length} tables`);
    const spec = specs[0];
    choiceSpecs[String(c.letter)] = spec;
    choiceLabels[String(c.letter)] = await drawnTexts(spec);
    what ??= "table";
  }
  if (!what) throw new Error("no figure_table_data, figure_chart_data or choice_table_data");
  return {
    kind: what,
    figure_spec: figure,
    choice_specs: choiceSpecs,
    transcribed_labels: Array.isArray(figure)
      ? await Promise.all(figure.map(drawnTexts))
      : figure
        ? await drawnTexts(figure)
        : null,
    choice_labels: choiceLabels,
  };
}

function drawsOne(item: {
  row: Obj;
  figure_spec: unknown;
  choice_specs?: Record<string, unknown>;
}) {
  if (item.figure_spec != null) {
    const parsed = parseStored(item.figure_spec);
    if (!parsed.ok) throw new Error(`figure_spec does not parse: ${parsed.errors.join("; ")}`);
    const drawn = drawnFigure(
      { ...(item.row as never), figure_spec: item.figure_spec },
      parseStored as never
    );
    if (drawn !== "spec")
      throw new Error(`the screen would draw ${String(drawn)}, not the figure_spec`);
  }
  for (const [letter, spec] of Object.entries(item.choice_specs ?? {})) {
    const parsed = specModule.parseFigureSpec(spec);
    if (!parsed.ok)
      throw new Error(`choice ${letter} spec does not parse: ${parsed.errors.join("; ")}`);
  }
}

async function main() {
  const [mode, input] = process.argv.slice(2);
  if (!input || (mode !== "convert" && mode !== "draws"))
    throw new Error("usage: figure-engine-tool.ts convert|draws <input.json>");
  const doc = JSON.parse(readFileSync(input, "utf8")) as { rows: Obj[] };
  const rows = [];
  for (const item of doc.rows) {
    const id = item.id;
    try {
      if (mode === "convert") rows.push({ id, ok: true, ...(await convertOne(item)) });
      else {
        drawsOne(item as never);
        rows.push({ id, ok: true });
      }
    } catch (error) {
      rows.push({ id, ok: false, error: (error as Error).message });
    }
  }
  process.stdout.write(JSON.stringify({ rows }) + "\n");
}

main().catch((error) => {
  process.stderr.write(`figure-engine-tool: ${(error as Error).message}\n`);
  process.exitCode = 2;
});
