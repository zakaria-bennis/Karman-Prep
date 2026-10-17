// AR-44: the pure modules reference no DOM global, no calculator-v2 or vendored MathQuill module
// calls eval, new Function or a string timer, and the core corpus, analysis, evaluation, plotting
// and the executor run in a context whose eval, Function constructors and string timers throw.
// Every module the runtime test uses is imported statically here, before the guards are installed,
// because Vitest's module runner itself uses AsyncFunction.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { codegenFindings, domGlobalReferences, listSourceFiles } from "./__fixtures__/source-scan";
import { CORPUS } from "../core/corpus";
import graphCases from "../core/corpus/cases/graph";
import { analyzeRows } from "../core/analysis";
import { evaluateRows } from "../core/eval/compile";
import { NO_DEADLINE } from "../core/deadline";
import { Executor } from "./executor";
import { installCodegenGuards } from "./__fixtures__/codegen-guards";
import { STATE, untilDone, VIEW_MSG } from "./__fixtures__/messages";
import type { WorkerToMain } from "./protocol";

const ROOT = process.cwd(); // Vitest runs from the repository root

it("AR-44 the scan flags eval, Function and string timers and passes ordinary code", () => {
  for (const s of [
    "eval(x)",
    "window.eval(s)",
    "new Function('a')",
    "Function('return 1')()",
    "setTimeout('f()', 1)",
    "self.setInterval(`g()`, 5)",
    "(function () {}).constructor('x')",
  ])
    expect(codegenFindings("x.ts", s)).toHaveLength(1);
  for (const s of [
    "evaluate(x)",
    "setTimeout(() => f(), 1)",
    "newFunction()",
    "// new Function('a')",
    "const s = 'eval(x)';",
  ])
    expect(codegenFindings("x.ts", s)).toEqual([]);
});
it("AR-44 the DOM scan flags window, document, navigator, HTMLElement and requestAnimationFrame, guarded or not", () => {
  for (const s of [
    "window.x = 1",
    "if (typeof window !== 'undefined') f()",
    "document.body",
    "navigator.userAgent",
    "let el: HTMLElement | null = null",
    "requestAnimationFrame(f)",
    "globalThis.document",
  ])
    expect(domGlobalReferences("x.ts", s)).toHaveLength(1);
  for (const s of [
    "const o = { window: 1 }",
    "o.document",
    "// window",
    "const s = 'navigator'",
    "windowSize(1)",
  ])
    expect(domGlobalReferences("x.ts", s)).toEqual([]);
});
it("AR-44 core/latex, core/analysis, core/eval, core/lib, core/regression and plot/ reference no DOM global", () => {
  // non-test files only; a folder that does not exist yet (core/lib, core/regression) contributes no files
  const files = listSourceFiles(
    ROOT,
    ["core/latex", "core/analysis", "core/eval", "core/lib", "core/regression", "plot"].map(
      (d) => `src/lib/calculator-v2/${d}`
    )
  );
  expect(files.length).toBeGreaterThan(0);
  expect(
    files.flatMap((f) =>
      domGlobalReferences(f, readFileSync(join(ROOT, f), "utf8")).map((m) => `${f}: ${m}`)
    )
  ).toEqual([]);
});
it("AR-44 no calculator-v2 or vendored MathQuill module calls eval, new Function or a string timer", () => {
  // tests and __fixtures__/ included: AR-44 says "no module"; the guard fixtures wrap the globals and never call them
  const files = listSourceFiles(
    ROOT,
    ["src/lib/calculator-v2", "src/components/calculator-v2", "vendor/mathquill"],
    { includeTests: true }
  );
  expect(
    files.flatMap((f) =>
      codegenFindings(f, readFileSync(join(ROOT, f), "utf8")).map((m) => `${f}: ${m}`)
    )
  ).toEqual([]);
});
it("AR-44 the corpus, analysis, evaluation, plotting and the executor run with code generation disabled", async () => {
  const guards = installCodegenGuards();
  try {
    for (const c of CORPUS)
      if ("latex" in c.input) {
        const a = analyzeRows(
          [...(c.rows ?? []), c.input.latex].map((latex, i) => ({
            id: String(i),
            latex,
            hidden: false,
          })),
          { angleMode: c.settings?.angleMode ?? "radians", complex: c.settings?.complex ?? false }
        );
        evaluateRows(
          a,
          { angleMode: c.settings?.angleMode ?? "radians", complex: c.settings?.complex ?? false },
          () => NO_DEADLINE
        );
      }
    const posts: WorkerToMain[] = [];
    const ex = new Executor({ post: (m) => posts.push(m) });
    ex.receive(STATE(1, ...graphCases.flatMap((c) => ("latex" in c.input ? [c.input.latex] : []))));
    ex.receive(VIEW_MSG(2));
    await untilDone(() => posts, 2);
    expect(posts.filter((m) => m.type === "plot").length).toBeGreaterThan(0);
  } finally {
    guards.restore();
  }
  expect(guards.calls).toEqual([]);
}, 120_000);
