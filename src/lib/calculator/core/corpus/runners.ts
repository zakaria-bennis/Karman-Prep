// Corpus runner routing (PR-39): every expected field of every case
// is compared by exactly one runner. Relative imports only.

import { isParseErrorCode } from "../latex/errors";
import { inputKind, type CorpusCase, type ExpectedField, type InputKind } from "./types";

export interface CorpusRunner {
  file: string; // repo-relative path of the test file that compares the fields
  owner: "02" | "04" | "05" | "12" | "13";
  input: InputKind;
  fields: readonly ExpectedField[];
}

export const CORPUS_RUNNERS: readonly CorpusRunner[] = [
  {
    file: "src/lib/calculator/core/corpus/corpus.test.ts",
    owner: "02",
    input: "latex",
    fields: ["tree", "latex", "error"],
  },
  {
    file: "src/lib/calculator/core/corpus/semantics.corpus.test.ts",
    owner: "04",
    input: "latex",
    fields: ["kind", "chips", "display", "error"],
  },
  {
    file: "tests/calculator/math-field.spec.ts",
    owner: "05",
    input: "keys",
    fields: ["latex", "tree"],
  },
  {
    file: "src/lib/calculator-transfer/question-dialect.corpus.test.ts",
    owner: "12",
    input: "question",
    fields: ["tree", "latex", "kind", "chips", "display", "error"],
  },
  {
    file: "src/lib/calculator-transfer/clipboard.test.ts",
    owner: "13",
    input: "pastedQuestionMath",
    fields: ["tree", "latex", "kind", "error"],
  },
];

/** Latex input, no rows, no settings, no kind/chips/display, and error (if any) is a ParseErrorCode. */
export function isParseOnly(c: CorpusCase): boolean {
  return (
    inputKind(c.input) === "latex" &&
    c.rows === undefined &&
    c.settings === undefined &&
    c.kind === undefined &&
    c.chips === undefined &&
    c.display === undefined &&
    (c.error === undefined || isParseErrorCode(c.error))
  );
}

/**
 * The runner that compares `field` of `c`: null when the field is absent or no runner of the case's
 * input kind claims it. A latex `error` goes to 02 when the case is parse-only, else to 04.
 */
export function runnerFor(c: CorpusCase, field: ExpectedField): CorpusRunner | null {
  if (c[field] === undefined) return null;
  const input = inputKind(c.input);
  const claiming = CORPUS_RUNNERS.filter((r) => r.input === input && r.fields.includes(field));
  if (input === "latex" && field === "error") {
    const owner = isParseOnly(c) ? "02" : "04";
    return claiming.find((r) => r.owner === owner) ?? null;
  }
  return claiming[0] ?? null;
}
