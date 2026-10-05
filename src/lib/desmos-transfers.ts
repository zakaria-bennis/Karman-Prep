import type { StudentQuizQuestion } from "@/types/quiz";

export type DesmosExpression =
  | { id: string; latex: string }
  | {
      id: string;
      type: "table";
      columns: { latex: string; values: string[]; points?: boolean; lines?: boolean }[];
    };

export interface DesmosTransfer {
  id: string;
  label: string;
  expression: DesmosExpression;
}

type GivenQuestion = Pick<
  StudentQuizQuestion,
  "id" | "subject" | "question_text" | "figure_kind" | "figure_table_data"
>;

function numericCell(raw: string): string | null {
  const value = raw
    .trim()
    .replace(/^\$|\$$/g, "")
    .replace(/−/g, "-");
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return value;
  const fraction = value.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
  if (fraction && Number(fraction[2]) !== 0) return `\\frac{${fraction[1]}}{${fraction[2]}}`;
  if (/^[+-]?\\frac\{[+-]?\d+\}\{[+-]?\d+\}$/.test(value) && !/\{[+-]?0+\}$/.test(value))
    return value;
  return null;
}

/** Only explicit givens. Never inspect answer choices, keys, explanations or inferred chart pixels. */
export function getDesmosTransfers(question: GivenQuestion | null): DesmosTransfer[] {
  if (!question || question.subject !== "math") return [];
  const transfers: DesmosTransfer[] = [];
  const prefix = `karman_${question.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const seen = new Set<string>();
  const math = question.question_text.matchAll(
    /\$\$?([^$]+)\$\$?|\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g
  );
  for (const match of math) {
    const latex = (match[1] ?? match[2] ?? match[3]).trim().replace(/−/g, "-");
    const commands = latex.match(/\\[a-zA-Z]+/g) ?? [];
    const allowed = new Set([
      "\\frac",
      "\\sqrt",
      "\\left",
      "\\right",
      "\\cdot",
      "\\times",
      "\\pi",
      "\\sin",
      "\\cos",
      "\\tan",
      "\\log",
      "\\ln",
      "\\abs",
    ]);
    if (
      !latex.includes("=") ||
      !/[xy]/.test(latex) ||
      /[;<>]|\\\\/.test(latex) ||
      commands.some((command) => !allowed.has(command))
    )
      continue;
    const plain = latex.replace(/\\[a-zA-Z]+/g, "");
    if (
      /[^a-zA-Z0-9\s=+\-*/^().{},|\[\]]/.test(plain) ||
      /[a-zA-Z]{3,}/.test(plain) ||
      seen.has(latex)
    )
      continue;
    seen.add(latex);
    const id = `${prefix}_equation_${transfers.length}`;
    transfers.push({ id, label: `Send equation ${seen.size}`, expression: { id, latex } });
  }

  const table = question.figure_kind === "table" ? question.figure_table_data : null;
  const headers = table?.header_row?.map((header) =>
    header.replace(/\$/g, "").replace(/\s/g, "").toLowerCase()
  );
  if (
    table &&
    headers?.length === 2 &&
    headers[0] === "x" &&
    ["y", "f(x)"].includes(headers[1]) &&
    table.rows.length > 0
  ) {
    const values = table.rows.map((row) =>
      row.length === 2 ? row.map(numericCell) : [null, null]
    );
    if (values.every((row) => row.every((value) => value !== null))) {
      const id = `${prefix}_table`;
      transfers.push({
        id,
        label: "Send x–y table",
        expression: {
          id,
          type: "table",
          columns: [
            { latex: "x", values: values.map((row) => row[0]!) },
            { latex: "y", values: values.map((row) => row[1]!), points: true, lines: false },
          ],
        },
      });
    }
  }

  const number = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
  const pointPattern = new RegExp(`\\(\\s*(${number})\\s*,\\s*(${number})\\s*\\)`, "g");
  const points = new Set<string>();
  for (const match of question.question_text.replace(/−/g, "-").matchAll(pointPattern)) {
    const context = question.question_text
      .slice(Math.max(0, match.index! - 100), match.index)
      .toLowerCase();
    if (
      !/\b(?:points?|coordinates?|vertices|vertex|passes through|intersects? at)\b/.test(context) ||
      /\b(?:interval|range|domain)\b/.test(context)
    )
      continue;
    const latex = `(${match[1]},${match[2]})`;
    if (points.has(latex)) continue;
    points.add(latex);
    const id = `${prefix}_point_${points.size}`;
    transfers.push({ id, label: `Send point ${latex}`, expression: { id, latex } });
  }
  return transfers;
}
