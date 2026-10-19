// Question tables (c-transfer TR-22 to TR-24, table 5.1): whether a native question table or a
// table answer choice gets a Transfer control, and the payload's columns of normalised cell
// LaTeX with the first variable as the input. Names (TR-25) are chosen when the calculator applies
// the payload (TR-72). Lazy with the classifier (D4) and framework-free; it reads the table's text
// only and imports nothing from the calculator (AR-3, TR-74).

import { splitMathText } from "./math-split"; // not math-segments: AR-33, math-split.ts
import type { SegmentVerdict, TransferItem } from "./classify";
import { describeChoice, plainMath } from "./describe";
import { normalizeQuestionMath } from "./normalize";
import { isNumericConstantLatex } from "./segment";

export interface TableInput {
  sourceId: string; // "table" or "choice:<letter>"
  headers: readonly string[] | null; // figure_table_data.header_row
  rows: readonly (readonly string[])[];
  letter?: string; // a table answer choice: its description is "choice B" (table 8.1)
}

/** TR-23's limits. */
export const TABLE_LIMITS = { variables: 8, points: 200 } as const;

/** One cell as the classifier reads it: its normalised LaTeX when it is a numeric constant. */
interface Cell {
  text: string; // the plain-text form, for a label
  numeric: string | null;
}

/** PR-5 and TR-24: `30,000` and `1,250,000.5` lose their thousands separators. */
const THOUSANDS = /^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;

function readCell(raw: string): Cell {
  const segments = splitMathText(raw, false, true, true);
  const math = segments.flatMap((s) => (s.kind === "text" ? [] : [s.latex]));
  const prose = segments.flatMap((s) => (s.kind === "text" ? [s.value] : [])).join("");
  if (math.length > 1 || (math.length === 1 && prose.trim() !== ""))
    return { text: raw.trim(), numeric: null };
  const source = (math[0] ?? raw).trim().replace(/−/g, "-");
  const latex = normalizeQuestionMath(
    THOUSANDS.test(source) ? source.replace(/,/g, "") : source,
    "cell"
  );
  const numeric = latex !== "" && isNumericConstantLatex(latex) ? latex : null;
  return { text: math.length === 1 ? plainMath(latex) : raw.trim(), numeric };
}

/** Table 5.1's label: a non-empty cell that is not a numeric constant. */
const isLabel = (c: Cell) => c.numeric === null && c.text !== "";

type Rejection = { rule: string; detail: string };
type Shaped = { headers: (string | null)[]; columns: string[][] } | Rejection;

/** Vertical (columns are variables) or horizontal (rows are), by table 5.1's rules. */
function shape(headers: Cell[] | null, body: Cell[][]): Shaped {
  const all = headers === null ? body : [headers, ...body];
  const width = all[0]?.length ?? 0;
  if (width === 0 || all.some((r) => r.length !== width))
    return { rule: all.length === 0 ? "TR-23" : "TR-22", detail: "mixed shape" };

  let cellFailure = false;
  if (headers === null || headers.every(isLabel)) {
    if (body.every((r) => r.every((c) => c.numeric !== null)))
      return {
        headers: Array.from({ length: width }, (_, k) => (headers ? headers[k].text : null)),
        columns: Array.from({ length: width }, (_, k) => body.map((r) => r[k].numeric ?? "")),
      };
    cellFailure = true;
  }
  const firstOk = all.every(
    (r, i) => isLabel(r[0]) || (i === 0 && headers !== null && r[0].text === "")
  );
  const headerOk = headers === null || headers.slice(1).every((c) => c.numeric !== null);
  if (firstOk && headerOk && width > 1) {
    if (body.every((r) => r.slice(1).every((c) => c.numeric !== null)))
      return {
        headers: all.map((r) => (r[0].text === "" ? null : r[0].text)),
        columns: all.map((r) => r.slice(1).map((c) => c.numeric ?? "")),
      };
    cellFailure = true;
  }
  return cellFailure
    ? { rule: "TR-24", detail: "a cell is not a numeric constant" }
    : { rule: "TR-22", detail: "not a table 5.1 shape" };
}

const rowsText = (n: number) => `${n} ${n === 1 ? "row" : "rows"}`;

/** TR-22 to TR-24: the verdict for one question table or table answer choice. */
export function explainTable(input: TableInput): SegmentVerdict {
  const headers = input.headers && input.headers.length > 0 ? input.headers.map(readCell) : null;
  const shaped = shape(
    headers,
    input.rows.map((r) => r.map(readCell))
  );
  if ("rule" in shaped) return shaped;
  const { columns } = shaped;
  const points = columns[0].length;
  if (columns.length > TABLE_LIMITS.variables || points < 1 || points > TABLE_LIMITS.points)
    return { rule: "TR-23", detail: `${columns.length} variables, ${points} points` };
  const description =
    input.letter === undefined ? `table, ${rowsText(points)}` : describeChoice(input.letter);
  const { sourceId } = input;
  return {
    item: {
      sourceId,
      kind: "table",
      ruleId: "TR-22",
      description,
      payload: {
        version: 1,
        sourceId,
        description,
        format: "table",
        dependencies: [],
        table: { headers: shaped.headers, columns },
      },
    },
  };
}

const memo = new Map<string, TransferItem | null>();

/** TR-22: the table's item, or null when it gets no control (memoised by content). */
export function classifyTable(input: TableInput): TransferItem | null {
  const key = JSON.stringify([input.sourceId, input.letter ?? null, input.headers, input.rows]);
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  if (memo.size >= 200) memo.clear();
  const verdict = explainTable(input);
  const item = "item" in verdict ? verdict.item : null;
  memo.set(key, item);
  return item;
}
