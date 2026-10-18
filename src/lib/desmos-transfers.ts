import { numericDesmosCell, unwrapMath, validatedDesmosMath } from "./desmos-math";
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

/** Only explicit givens. Never inspect answer choices, keys, explanations or inferred chart pixels. */
export function getDesmosTransferReport(question: GivenQuestion | null): {
  transfers: DesmosTransfer[];
  notices: string[];
} {
  if (!question || question.subject !== "math") return { transfers: [], notices: [] };
  const notices: string[] = [];
  const transfers: DesmosTransfer[] = [];
  const prefix = `karman_${question.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const seen = new Set<string>();
  const math = question.question_text.matchAll(
    /\$\$?([^$]+)\$\$?|\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g
  );
  for (const match of math) {
    const latex = validatedDesmosMath(match[0]);
    if (
      !latex ||
      !/[=+*/^\-]|\\(?:frac|sqrt|sin|cos|tan|log|ln)/.test(latex) ||
      /^[a-zA-Z](?:_\{?\d+\}?)?$/.test(latex) ||
      /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(latex) ||
      /^\(\s*[+-]?[\d.]+\s*,\s*[+-]?[\d.]+\s*\)$/.test(latex) ||
      seen.has(latex)
    )
      continue;
    seen.add(latex);
    const id = `${prefix}_equation_${transfers.length}`;
    transfers.push({
      id,
      label: `Send ${latex.includes("=") ? (/^[a-zA-Z]\(/.test(latex) ? "function" : "equation") : "expression"} ${seen.size}`,
      expression: { id, latex },
    });
  }

  const table = question.figure_kind === "table" ? question.figure_table_data : null;
  const headers = table?.header_row?.map((header) =>
    (unwrapMath(header) ?? "").replace(/\s/g, "").toLowerCase()
  );
  if (
    table &&
    headers?.length === 2 &&
    headers[0] === "x" &&
    ["y", "f(x)"].includes(headers[1]) &&
    table.rows.length > 0
  ) {
    const values = table.rows.map((row) =>
      row.length === 2 ? row.map(numericDesmosCell) : [null, null]
    );
    if (values.every((row) => row.every((value) => value !== null))) {
      const id = `${prefix}_table`;
      if (values.some((row) => row.some((value) => value?.repeating)))
        notices.push("Repeating decimals stay as exact fractions so no value is rounded.");
      transfers.push({
        id,
        label: "Send x–y table",
        expression: {
          id,
          type: "table",
          columns: [
            { latex: "x_1", values: values.map((row) => row[0]!.latex) },
            {
              latex: "y_1",
              values: values.map((row) => row[1]!.latex),
              points: true,
              lines: false,
            },
          ],
        },
      });
    } else
      notices.push(
        "This table has an ambiguous or unsupported value. Enter it manually after checking its meaning."
      );
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
  return { transfers, notices };
}

export function getDesmosTransfers(question: GivenQuestion | null): DesmosTransfer[] {
  return getDesmosTransferReport(question).transfers;
}
