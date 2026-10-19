// Transfer fixture corpus runner (TR-79, PR-44): every fixture goes through the classifier, its
// payload through apply into a seeded engine, and every inserted row through the calculator analysis; each
// allowed row is also checked against its question-dialect corpus case.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyTransfer } from "../../components/calculator/transfer/apply";
import { analyzeRows } from "../calculator/core/analysis/index";
import { createTestEngine } from "../calculator/core/api/__fixtures__/test-engine";
import type { CalculatorEngine } from "../calculator/core/api/engine";
import { CORPUS } from "../calculator/core/corpus/index";
import { functionDefinitionHead, parseLatex, toSExpr } from "../calculator/core/latex/index";
import { FIXTURE_FILES, TRANSFER_FIXTURES } from "./__fixtures__";
import type { FixtureExpect, TransferFixture } from "./__fixtures__/types";
import { explainChoice, explainStem, type SegmentVerdict } from "./classify";
import { normalizeQuestionMath } from "./normalize";

const REAL = { angleMode: "radians", complex: false } as const;
function seeded(rows: string[] = []): CalculatorEngine {
  const { engine } = createTestEngine();
  if (rows.length > 0)
    engine.setExpressions(rows.map((latex, i) => ({ id: String(i + 1), latex })));
  engine.clearHistory();
  return engine;
}
const latexOf = (e: CalculatorEngine) => e.getExpressions().map((r) => r.latex ?? "");
const analysed = (e: CalculatorEngine) =>
  analyzeRows(
    e.getExpressions().map((r) => ({ id: r.id, latex: r.latex ?? "", hidden: r.hidden ?? false })),
    REAL
  );

function verdictOf(f: TransferFixture): SegmentVerdict {
  const s = f.source;
  if (s.kind === "choice")
    return explainChoice(
      { letter: s.letter, text: s.text },
      s.stem === undefined ? null : { text: s.stem, serializedFunctionLines: false }
    );
  return (
    explainStem({ text: s.text, serializedFunctionLines: s.serializedFunctionLines ?? false }).get(
      s.segment
    ) ?? { rule: "none", detail: "no math segment" }
  );
}

describe("transfer corpus", () => {
  for (const f of TRANSFER_FIXTURES)
    it(`TR-79, ${f.rules.join(", ")} ${f.id}`, () => {
      const v = verdictOf(f);
      if (!f.expect.control) return void expect("rule" in v ? v.rule : "item").toBe(f.expect.rule);
      if (!("item" in v)) throw new Error(`${f.id}: ${v.rule} ${v.detail}`);
      expect([v.item.kind, v.item.payload.rows, v.item.payload.dependencies]).toEqual([
        f.expect.kind,
        f.expect.rows,
        f.expect.dependencies ?? [],
      ]);
      const e = seeded(f.calculator ?? []);
      expect(
        applyTransfer(e, { ...v.item.payload, questionKey: "fixture:q" }, "mouse").status
      ).toBe(f.expect.status);
      expect(latexOf(e)).toEqual(f.expect.inserted);
      expect(analysed(e).rows.map((r) => r.error?.code ?? null)).toEqual(
        f.expect.inserted.map(() => null)
      );
    });
  for (const f of TRANSFER_FIXTURES)
    if (f.expect.control && f.expect.status !== "rejected")
      it(`PR-44 ${f.id} rows parse to their corpus case trees and kinds`, () => {
        const want = f.expect as Extract<FixtureExpect, { control: true }>;
        want.rows.forEach((row, i) => {
          const c = CORPUS.find((k) => k.id === want.corpus[i]);
          if (!c || !("question" in c.input)) throw new Error(`${f.id}: corpus ${want.corpus[i]}`);
          expect(normalizeQuestionMath(c.input.question, c.input.context ?? "math")).toBe(row);
          const heads = new Set(
            [...(c.rows ?? []), row].flatMap((r) => functionDefinitionHead(r)?.name ?? [])
          );
          const r = parseLatex(row, { userFunctions: heads });
          expect(r.ok && toSExpr(r.tree)).toBe(c.tree);
          const a = analyzeRows(
            [...(c.rows ?? []), row].map((l, k) => ({ id: `r${k}`, latex: l, hidden: false })),
            REAL
          );
          expect(a.rows[a.rows.length - 1].kind).toBe(c.kind);
        });
      });
  it("TR-79 the seven files of the category map, in the fixture list's order, each under 700 lines with allowed and blocked outcomes", () => {
    expect(Object.keys(FIXTURE_FILES)).toEqual([
      "exclusions",
      "lone-symbols",
      "sat-forms",
      "inequalities",
      "phase-blocks",
      "functions",
      "collisions",
    ]);
    const ids = new Set<string>();
    for (const [name, list] of Object.entries(FIXTURE_FILES)) {
      expect(
        readFileSync(`src/lib/calculator-transfer/__fixtures__/${name}.ts`, "utf8").split("\n")
          .length
      ).toBeLessThan(700);
      expect(list.some((f) => f.expect.control) && list.some((f) => !f.expect.control), name).toBe(
        true
      );
      for (const f of list) {
        expect(f.id.startsWith(`${name}-`)).toBe(true);
        expect(ids.has(f.id)).toBe(false);
        ids.add(f.id);
      }
    }
    expect(ids.size).toBeGreaterThan(200);
  });
});
