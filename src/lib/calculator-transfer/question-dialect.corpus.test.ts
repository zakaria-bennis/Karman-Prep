// Golden corpus runner for the transfer core: every expected field of
// every question-dialect case, compared on the TR-7 output (normalizeQuestionMath).

import { describe, expect, it } from "vitest";
import { analyzeRows, type RowAnalysis } from "../calculator/core/analysis/index";
import { CORPUS } from "../calculator/core/corpus/index";
import { runnerFor } from "../calculator/core/corpus/runners";
import type { CorpusCase, ExpectedField } from "../calculator/core/corpus/types";
import { evaluateLatex } from "../calculator/core/eval/compile";
import { formatValue } from "../calculator/core/eval/format";
import { functionDefinitionHead } from "../calculator/core/latex/function-head";
import { parseLatex, toSExpr } from "../calculator/core/latex/index";
import { normalizeQuestionMath } from "./normalize";

const FILE = "src/lib/calculator-transfer/question-dialect.corpus.test.ts";
const casesFor = (f: ExpectedField) => CORPUS.filter((c) => runnerFor(c, f)?.file === FILE);
function written(c: CorpusCase): string {
  const input = c.input as { question: string; context?: "math" | "cell" | "coordinate" };
  return normalizeQuestionMath(input.question, input.context ?? "math");
}
const userFunctions = (c: CorpusCase) =>
  new Set([...(c.rows ?? []), written(c)].flatMap((r) => functionDefinitionHead(r)?.name ?? []));
function analysed(c: CorpusCase): RowAnalysis {
  const latex = [...(c.rows ?? []), written(c)];
  const rows = latex.map((l, i) => ({
    id: i === latex.length - 1 ? "case" : `row-${i + 1}`,
    latex: l,
    hidden: false,
  }));
  const row = analyzeRows(rows, {
    angleMode: c.settings?.angleMode ?? "radians",
    complex: c.settings?.complex ?? false,
  }).byId.get("case");
  if (!row) throw new Error(c.id);
  return row;
}
const title = (c: CorpusCase, f: ExpectedField) => `${c.rules.join(", ")} ${c.id} ${f}`;
describe("question-dialect corpus runner", () => {
  for (const c of casesFor("latex")) it(title(c, "latex"), () => expect(written(c)).toBe(c.latex));
  for (const c of casesFor("tree"))
    it(title(c, "tree"), () => {
      const r = parseLatex(written(c), { userFunctions: userFunctions(c) });
      expect(r.ok ? toSExpr(r.tree) : `${r.error.code}: ${r.error.detail}`).toBe(c.tree);
    });
  for (const c of casesFor("kind"))
    it(title(c, "kind"), () => expect(analysed(c).kind).toBe(c.kind));
  for (const c of casesFor("chips"))
    it(title(c, "chips"), () => expect(analysed(c).chips).toEqual(c.chips));
  for (const c of casesFor("error"))
    it(title(c, "error"), () => expect(analysed(c).error?.code ?? null).toBe(c.error));
  for (const c of casesFor("display"))
    it(title(c, "display"), () =>
      expect(formatValue(evaluateLatex(written(c), { rows: c.rows, settings: c.settings }))).toBe(
        c.display
      )
    );
});
