// AR-4: only math-field/MathField.ts imports vendor/mathquill at run time, and the compute worker's
// import graph holds no React, MathQuill, src/components/, engine, backend or import.meta. The scans
// read the TypeScript syntax tree, so comments and strings never count; the real-code scans list
// their files at run time, so modules later packages add are covered without edits.
import { expect, it } from "vitest";
import {
  importGraph,
  listSourceFiles,
  mathquillRuntimeImporters,
  memoryHost,
  nodeSourceHost,
  usesImportMeta,
} from "./__fixtures__/source-scan";

const ROOT = process.cwd(); // Vitest runs from the repository root

it("AR-4 the walker follows relative, @/ and dynamic imports, skips type-only ones and reports packages", () => {
  const host = memoryHost({
    "src/a.ts":
      'import "./b"; import type { X } from "react-dom"; export * from "@/c"; void import("./d");',
    "src/b.ts": 'import React from "react";',
    "src/c.ts": "",
    "src/d/index.ts": 'import "katex/dist/katex.min.css";',
  });
  expect(importGraph(host, "src/a.ts")).toEqual({
    files: ["src/a.ts", "src/b.ts", "src/c.ts", "src/d/index.ts"],
    packages: ["katex", "react"],
  });
});
it("AR-4 the compute worker's import graph has no React, MathQuill, src/components, engine, backend or import.meta", () => {
  const g = importGraph(nodeSourceHost(ROOT), "src/lib/calculator/worker/compute.worker.ts");
  expect(
    g.packages.filter((p) =>
      ["react", "react-dom", "scheduler", "lucide-react", "katex"].includes(p)
    )
  ).toEqual([]);
  expect(
    g.files.filter((f) =>
      /^(vendor\/mathquill\/|src\/components\/|src\/lib\/calculator\/(core\/api|render)\/|src\/lib\/calculator\/worker\/(create|backend)\.ts$)/.test(
        f
      )
    )
  ).toEqual([]);
  const host = nodeSourceHost(ROOT);
  expect(g.files.filter((f) => usesImportMeta(f, host.read(f)!))).toEqual([]);
});
it("AR-4 import.meta is found through the syntax tree, never in comments or strings", () => {
  expect(usesImportMeta("x.ts", "const u = new URL('./a.ts', import.meta.url);")).toBe(true);
  expect(usesImportMeta("x.ts", "// no import.meta (OI-29)\nconst s = 'import.meta';")).toBe(false);
});
it("AR-4 only math-field/MathField.ts imports vendor/mathquill at run time", () => {
  const files = listSourceFiles(ROOT, ["src", "tests"], { includeTests: true });
  expect(mathquillRuntimeImporters(nodeSourceHost(ROOT), files)).toEqual([
    "src/components/calculator/math-field/MathField.ts",
  ]);
}, 60_000);
it("AR-4 the MathQuill check allows .css?inline only from a harness page and flags any other import", () => {
  const host = memoryHost({
    "src/components/calculator/math-field/MathField.ts":
      'import MathQuill from "../../../../vendor/mathquill/mathquill.js";',
    "tests/calculator/fixture/harness/math-field.tsx":
      'import css from "../../../../vendor/mathquill/mathquill.css?inline";',
    "src/other.ts": 'import "../vendor/mathquill/mathquill.js";',
    "src/styles.ts": 'import css from "../vendor/mathquill/mathquill.css?inline";',
    "vendor/mathquill/mathquill.js": "",
    "vendor/mathquill/mathquill.css": "",
  });
  expect(
    mathquillRuntimeImporters(host, [
      "src/components/calculator/math-field/MathField.ts",
      "src/other.ts",
      "src/styles.ts",
      "tests/calculator/fixture/harness/math-field.tsx",
    ])
  ).toEqual(["src/components/calculator/math-field/MathField.ts", "src/other.ts", "src/styles.ts"]);
});
