/**
 * Converts the old `figure_table_data` and `choice_table_data`
 * (src/types/question-table.ts) into a `type: table` FigureSpec, mechanically:
 *
 * - `rows` and `header_row` carry over cell for cell (an empty header row is none);
 * - an empty first heading ("" over the row labels) sets `blankCorner`;
 * - `rows: []` is kept (an empty table shows "No data");
 * - `header_groups` become `groups` (a missing label is a blank cell);
 * - `caption` becomes the spec's `title`, `footer_note` the table's `note`.
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

export function tableDataToSpec(data: unknown): FigureSpec {
  const parsed = tableDataSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue.path.length ? ` at ${issue.path.join(".")}` : "";
    throw new TableDataError(`table data: ${issue.message}${where}`);
  }
  const { caption, header_groups, header_row, rows, footer_note } = parsed.data;
  const header = header_row?.length ? header_row : undefined;
  const part: Part = {
    kind: "table",
    id: "t1",
    rows,
    ...(header ? { header } : {}),
    ...(header && header[0].trim() === "" ? { blankCorner: true } : {}),
    ...(header_groups?.length
      ? {
          groups: header_groups.map((g) => ({
            label: g.label ?? "",
            span: Math.max(1, Math.floor(g.span)),
          })),
        }
      : {}),
    ...(footer_note ? { note: footer_note } : {}),
  };
  return {
    version: FIGURE_SPEC_VERSION,
    type: "table",
    parts: [part],
    labels: [],
    marks: [],
    ...(caption ? { title: caption } : {}),
  };
}
