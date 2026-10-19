// Golden corpus runner for 04-semantics (01-interfaces.md section 2.2): compares `kind`, `chips`
// and the non-parse-only `error` of every latex case through analyzeRows, and `display` through
// evaluateLatex and formatValue. Relative imports only.

import { expect, it } from "vitest";
import { analyzeRows, type RowAnalysis } from "../analysis/index";
import { evaluateLatex } from "../eval/compile";
import { formatValue } from "../eval/format";
import { CORPUS } from "./index";
import { runnerFor } from "./runners";
import type { CorpusCase, ExpectedField } from "./types";

const FILE = "src/lib/calculator/core/corpus/semantics.corpus.test.ts",
  casesFor = (f: ExpectedField) => CORPUS.filter((c) => runnerFor(c, f)?.file === FILE);
const latexOf = (c: CorpusCase) => ("latex" in c.input ? c.input.latex : ""),
  title = (c: CorpusCase, f: ExpectedField) => `${c.rules.join(", ")} ${c.id} ${f}`;

/** The analysis of the case row, analysed after its context rows. */
function analyseCase(c: CorpusCase): RowAnalysis {
  const latex = [...(c.rows ?? []), latexOf(c)],
    rows = latex.map((l, i) => ({
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

for (const c of casesFor("kind"))
  it(title(c, "kind"), () => expect(analyseCase(c).kind).toBe(c.kind));
for (const c of casesFor("chips"))
  it(title(c, "chips"), () => expect(analyseCase(c).chips).toEqual(c.chips));
for (const c of casesFor("error"))
  it(title(c, "error"), () => expect(analyseCase(c).error?.code ?? null).toBe(c.error));
for (const c of casesFor("display"))
  it(title(c, "display"), () =>
    expect(formatValue(evaluateLatex(latexOf(c), { rows: c.rows, settings: c.settings }))).toBe(
      c.display
    )
  );
