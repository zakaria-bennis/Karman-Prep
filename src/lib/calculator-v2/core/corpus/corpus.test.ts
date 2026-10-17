import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { functionDefinitionHead } from "../latex/function-head";
import { parseLatex, toSExpr } from "../latex/index";
import { printLatex } from "../latex/printer";
import { CORPUS_FILES } from "./cases/index";
import { CORPUS, casesFor } from "./index";
import { CORPUS_RUNNERS, isParseOnly, runnerFor } from "./runners";
import {
  EXPECTED_FIELDS,
  expectedFields,
  inputKind,
  type CorpusCase,
  type ExpectedField,
} from "./types";

const ORDER = (
  "parse-literals parse-operators parse-calls parse-relations parse-errors printer sat-forms classify-rows classify-definitions " +
  "classify-relations display-numbers display-complex domain-real domain-functions keys graph question-dialect paste"
).split(" ");
const FIELDS: string[] = ["id", "rules", "input", "rows", "settings", ...EXPECTED_FIELDS];
const base: CorpusCase = { id: "a-1", rules: ["PR-39"], input: { latex: "x" } };

describe("golden corpus registry", () => {
  it("PR-39 one static registry holds every case file in section 2.1 order, each under 700 lines", () => {
    const dir = new URL("./cases/", import.meta.url);
    expect(Object.keys(CORPUS_FILES)).toEqual(ORDER);
    expect(
      readdirSync(dir)
        .filter((f) => f !== "index.ts")
        .map((f) => f.replace(/\.ts$/, ""))
        .sort()
    ).toEqual([...ORDER].sort());
    for (const key of ORDER)
      expect(readFileSync(new URL(`${key}.ts`, dir), "utf8").split("\n").length).toBeLessThan(700);
    expect(CORPUS).toEqual(Object.values(CORPUS_FILES).flat());
  });

  it("PR-40 every case has a unique file-prefixed id, spec-ID rules, only known fields and a readable shape", () => {
    const seen = new Set<string>();
    for (const [key, cases] of Object.entries(CORPUS_FILES))
      for (const c of cases) {
        expect([c.id, seen.has(c.id), Object.keys(c).filter((k) => !FIELDS.includes(k))]).toEqual([
          expect.stringMatching(new RegExp(`^${key}-\\d+$`)),
          false,
          [],
        ]);
        seen.add(c.id);
        expect(
          c.rules.length > 0 &&
            c.rules.every((r) => /^[A-Z][A-Z0-9]*-\d+$/.test(r)) &&
            expectedFields(c).length > 0 === (key !== "graph")
        ).toBe(true);
      }
    expect(EXPECTED_FIELDS).toEqual(["tree", "latex", "kind", "chips", "display", "error"]);
    expect(
      [
        { latex: "x" },
        { keys: ["x"] },
        { question: "x", context: "cell" as const },
        { pastedQuestionMath: "x" },
      ].map(inputKind)
    ).toEqual(["latex", "keys", "question", "pastedQuestionMath"]);
    expect(expectedFields({ ...base, error: "syntax", tree: "(id x)" })).toEqual(["tree", "error"]);
  });

  it("PR-39 runnerFor routes each expected field to exactly one of the five runners", () => {
    expect(CORPUS_RUNNERS.map((r) => `${r.owner}:${r.input}`).join(" ")).toBe(
      "02:latex 04:latex 05:keys 12:question 13:pastedQuestionMath"
    );
    const keys = { keys: ["x"] },
      pasted = { pastedQuestionMath: "x" };
    const routes: [CorpusCase, ExpectedField, string | null][] = [
      [{ ...base, tree: "(id x)" }, "tree", "02"],
      [{ ...base, latex: "x" }, "latex", "02"],
      [{ ...base, error: "too-deep" }, "error", "02"],
      [{ ...base, rows: ["a=1"], error: "syntax" }, "error", "04"],
      [{ ...base, error: "cycle" }, "error", "04"],
      [{ ...base, kind: "value" }, "kind", "04"],
      [{ ...base, input: keys, latex: "x" }, "latex", "05"],
      [{ ...base, input: keys, kind: "value" }, "kind", null],
      [{ ...base, input: { question: "x" }, display: "1" }, "display", "12"],
      [{ ...base, input: pasted, tree: "(id x)" }, "tree", "13"],
      [{ ...base, input: pasted, chips: ["x"] }, "chips", null],
      [base, "tree", null],
    ];
    for (const [c, field, owner] of routes) expect(runnerFor(c, field)?.owner ?? null).toBe(owner);
    expect(isParseOnly({ ...base, settings: { complex: true }, error: "syntax" })).toBe(false);
  });
});

const RUNNER = "src/lib/calculator-v2/core/corpus/corpus.test.ts",
  latexOf = (c: CorpusCase) => (c.input as { latex: string }).latex;
const userFunctionsFor = (c: CorpusCase) =>
  new Set(
    [...(c.rows ?? []), latexOf(c)].flatMap((row) => functionDefinitionHead(row)?.name ?? [])
  );
describe("golden corpus parse runner", () => {
  it("PR-39 casesFor returns exactly the cases whose rules name the ID", () => {
    const cases = casesFor("PR-10");
    expect(
      cases.length >= 8 &&
        cases.every((c) => c.rules.includes("PR-10")) &&
        !casesFor("PR-1").includes(cases[0])
    ).toBe(true);
  });
  for (const field of ["tree", "latex", "error"] as const)
    for (const c of CORPUS.filter((k) => runnerFor(k, field)?.file === RUNNER))
      it(`${c.rules.join(", ")} ${c.id} ${field}`, () => {
        const r = parseLatex(latexOf(c), { userFunctions: userFunctionsFor(c) });
        if (field === "error") expect(r.ok ? "parsed" : r.error.code).toBe(c.error);
        else if (field === "latex")
          expect(r.ok ? printLatex(r.tree) : `${r.error.code}: ${r.error.detail}`).toBe(c.latex);
        else expect(r.ok ? toSExpr(r.tree) : `${r.error.code}: ${r.error.detail}`).toBe(c.tree);
      });
});

it("PR-42 sat-forms holds cases 1 to 38 and every typed SAT form parses", () => {
  const cases = CORPUS_FILES["sat-forms"],
    typed = cases.filter((c) => "latex" in c.input);
  expect([new Set(cases.map((c) => c.id)), typed.length]).toEqual([
    new Set(Array.from({ length: 38 }, (_, k) => `sat-forms-${k + 1}`)),
    35,
  ]);
  for (const c of typed)
    expect(parseLatex(latexOf(c), { userFunctions: userFunctionsFor(c) }).ok, c.id).toBe(true);
});
