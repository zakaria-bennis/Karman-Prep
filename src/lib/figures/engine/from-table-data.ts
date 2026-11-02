/**
 * Converts the old `figure_table_data` and `choice_table_data`
 * (src/types/question-table.ts) into `type: table` FigureSpecs, mechanically:
 *
 * - `rows` and `header_row` carry over cell for cell (an empty header row is none);
 * - an empty first heading ("" over the row labels) sets `blankCorner`;
 * - `rows: []` is kept (an empty table shows "No data");
 * - `header_groups` become `groups` (a missing label is a blank cell);
 * - `caption` becomes the spec's `title`, `footer_note` the table's `note`.
 *
 * One exception: the importer stored some questions that print two separate
 * tables as one table, side by side, each table's name a merged heading over
 * its columns (question 48122737: "Data Set A" and "Data Set B", each over
 * "Value | Frequency"). The legacy shape tells them apart: every column sits
 * under a named heading, and each heading spans the very same column headings
 * as the others. Such data is split back into one table per heading, in order,
 * each titled by its heading (separateTables); the note goes under the last.
 * A real merged heading never repeats its columns (a corner cell over the row
 * labels, then "Grade level" over the grades), so it stays one table.
 *
 * Malformed data is refused with a TableDataError that says why.
 */
import { z } from "zod";
import { FIGURE_SPEC_VERSION, type FigureSpec, type Part } from "./spec";

export class TableDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TableDataError";
  }
}

const cell = z
  .union([z.string(), z.number().finite()])
  .nullish()
  .transform((v) => (v == null ? "" : String(v)));

const tableDataSchema = z.object({
  caption: z.string().nullish(),
  header_groups: z
    .array(z.object({ label: z.string().nullish(), span: z.number().finite() }))
    .nullish(),
  header_row: z.array(cell).nullish(),
  // An empty table is still a table: TableView shows "No data" in its body.
  rows: z.array(z.array(cell)),
  footer_note: z.string().nullish(),
});

type TableData = z.infer<typeof tableDataSchema>;
type Group = { label: string; span: number };

const spec = (part: Part, title: string | null | undefined): FigureSpec => ({
  version: FIGURE_SPEC_VERSION,
  type: "table",
  parts: [part],
  labels: [],
  marks: [],
  ...(title ? { title } : {}),
});

/** One table's part from its header, rows, merged headings and note. */
function tablePart(
  header: string[] | undefined,
  rows: string[][],
  groups: Group[] | undefined,
  note: string | null | undefined
): Part {
  return {
    kind: "table",
    id: "t1",
    rows,
    ...(header ? { header } : {}),
    ...(header && header[0].trim() === "" ? { blankCorner: true } : {}),
    ...(groups?.length ? { groups } : {}),
    ...(note ? { note } : {}),
  };
}

/**
 * The column ranges of the separate tables that legacy data joined side by side, or null
 * when it is one table: two or more named headings with no caption over them, covering
 * every column, each over the same column headings.
 */
function separateTables(data: TableData, groups: Group[]): [number, number][] | null {
  const header = data.header_row ?? [];
  if (groups.length < 2 || data.caption || header.length === 0) return null;
  if (groups.some((g) => g.label.trim() === "")) return null;
  const ranges: [number, number][] = [];
  let at = 0;
  for (const g of groups) {
    ranges.push([at, at + g.span]);
    at += g.span;
  }
  if (at !== header.length) return null;
  const first = header.slice(...ranges[0]).join("\u0000");
  return ranges.every(([a, b]) => header.slice(a, b).join("\u0000") === first) ? ranges : null;
}

/**
 * The table FigureSpecs a legacy table's data draws, in order: one, or one per table
 * when the data joined separate tables side by side (separateTables).
 */
export function tableDataToSpecs(data: unknown): FigureSpec[] {
  const parsed = tableDataSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue.path.length ? ` at ${issue.path.join(".")}` : "";
    throw new TableDataError(`table data: ${issue.message}${where}`);
  }
  const { caption, header_groups, header_row, rows, footer_note } = parsed.data;
  const header = header_row?.length ? header_row : undefined;
  const groups = header_groups?.map((g) => ({
    label: g.label ?? "",
    span: Math.max(1, Math.floor(g.span)),
  }));
  const split = groups ? separateTables(parsed.data, groups) : null;
  if (split && header && groups) {
    return split.map(([a, b], i) => {
      // A shorter table's rows end where its cells do (its side was left blank).
      const own = rows.map((r) => r.slice(a, b));
      while (own.length && own[own.length - 1].every((c) => c.trim() === "")) own.pop();
      const note = i === split.length - 1 ? footer_note : null;
      return spec(tablePart(header.slice(a, b), own, undefined, note), groups[i].label);
    });
  }
  return [spec(tablePart(header, rows, groups, footer_note), caption)];
}
