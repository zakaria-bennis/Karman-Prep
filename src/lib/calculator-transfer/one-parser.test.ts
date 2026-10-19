// PR-1 one parser (verification): typed and API input reach the engine's analysis through
// core/latex's parseLatex only, so an API row has exactly the tree parseLatex gives its LaTeX.
// Question dialect is covered by question-dialect.corpus.test.ts; paste by the clipboard tests.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import type { AnalysisResult, AnalysisSettings, RowSource } from "@/lib/calculator/core/analysis";
import { createTestEngine } from "@/lib/calculator/core/api/__fixtures__/test-engine";
import { functionDefinitionHead, parseLatex, toSExpr } from "@/lib/calculator/core/latex/index";

const spy = vi.hoisted(() => ({ results: [] as AnalysisResult[] }));
vi.mock("@/lib/calculator/core/analysis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/calculator/core/analysis")>();
  return {
    ...actual,
    analyzeRows: (rows: readonly RowSource[], settings: AnalysisSettings) => {
      const result = actual.analyzeRows(rows, settings);
      spy.results.push(result);
      return result;
    },
  };
});

/** Non-test `.ts`/`.tsx` files under `dir`, recursively, as repo-relative POSIX paths. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name).split("\\").join("/");
    if (statSync(path).isDirectory()) return name === "__fixtures__" ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const LATEX = [
  "y=2x+3",
  "f(x)=x^{2}",
  "y=f(x)+1",
  "a=2",
  "y=a(x+3)",
  "\\left|x-3\\right|",
  "\\frac{1}{2}x",
  "-2<x\\le5",
  "(1,250)",
  "2\\cdot5\\div x",
  "\\sqrt{x+1}",
  "\\sin^{-1}x",
];

it("PR-1 API input analysed by the engine has exactly the tree parseLatex gives the same LaTeX", () => {
  const t = createTestEngine();
  t.engine.setExpressions(LATEX.map((latex, i) => ({ id: String(i + 1), latex })));
  t.flushFrames();
  t.engine.getSnapshot();
  const ids = LATEX.map((_, i) => String(i + 1));
  const result = [...spy.results].reverse().find((r) => ids.every((id) => r.byId.has(id)));
  if (!result) throw new Error("the engine never analysed the rows");
  const userFunctions = new Set(LATEX.flatMap((l) => functionDefinitionHead(l)?.name ?? []));
  LATEX.forEach((latex, i) => {
    const parsed = parseLatex(latex, { userFunctions });
    if (!parsed.ok) throw new Error(`${latex}: ${parsed.error.code}`);
    const tree = result.byId.get(ids[i])?.tree;
    expect(tree ? toSExpr(tree) : null, latex).toBe(toSExpr(parsed.tree));
  });
});

it("PR-1 the engine's analysis and the MathField speech text parse only through core/latex's parseLatex", () => {
  const api = sourceFiles("src/lib/calculator/core/api");
  const analysers = api.filter((f) => /\banalyzeRows\b/.test(readFileSync(f, "utf8")));
  expect(analysers.length).toBeGreaterThan(0);
  for (const f of analysers) // the analysis index module, the one the spy above wraps
    expect(readFileSync(f, "utf8"), f).toMatch(
      /import\s*\{[^}]*\banalyzeRows\b[^}]*\}\s*from\s*"(?:\.\.\/analysis|@\/lib\/calculator\/core\/analysis)(?:\/index)?"/
    );
  const users = [
    ...sourceFiles("src/lib/calculator/core/analysis"),
    ...api,
    "src/components/calculator/math-field/speech.ts",
  ];
  for (const file of users) {
    const src = readFileSync(file, "utf8");
    const specifiers = [...src.matchAll(/\bfrom\s+"([^"]+)"|\bimport\(\s*"([^"]+)"\s*\)/g)].map(
      (m) => m[1] ?? m[2]
    );
    expect(
      specifiers.filter((s) =>
        /^mathjs|^katex|latex\/(normalize|tokens|parser|atoms|calls|letters)$/.test(s)
      ),
      file
    ).toEqual([]);
    expect(src, file).not.toMatch(/\btokenize\s*\(/);
  }
  const callers = users.filter((f) => /\bparseLatex\s*\(/.test(readFileSync(f, "utf8")));
  expect(callers).toContain("src/components/calculator/math-field/speech.ts");
  expect(callers.some((f) => f.startsWith("src/lib/calculator/core/analysis/"))).toBe(true);
});
