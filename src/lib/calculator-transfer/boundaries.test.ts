import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { expect, it } from "vitest";

const SPECIFIER =
  /(?:\bimport\s+(?:type\s+)?[^'"]*?from\s*|\bexport\s+(?:type\s+)?[^'";]*?from\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;

/** A specifier resolved to a repository path; bare specifiers stay as written. */
function resolveSpecifier(from: string, specifier: string): string {
  let base: string;
  if (specifier.startsWith("@/")) base = join("src", specifier.slice(2));
  else if (specifier.startsWith(".")) base = join(dirname(from), specifier);
  else return specifier;
  base = normalize(base);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")])
    if (existsSync(candidate) && /\.tsx?$/.test(candidate)) return candidate;
  return base;
}

/** Every module reachable from `entries` through import, export-from and import() specifiers. */
function importClosure(entries: readonly string[]): string[] {
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.shift();
    if (file === undefined || seen.has(file)) continue;
    seen.add(file);
    if (!file.startsWith("src/")) continue;
    const source = readFileSync(file, "utf8");
    for (const m of source.matchAll(SPECIFIER)) queue.push(resolveSpecifier(file, m[1]));
  }
  return [...seen];
}

const TRANSFER_MODULES = ["payload", "normalize", "lex", "segment", "describe", "classify"]
  .map((m) => `src/lib/calculator-transfer/${m}.ts`)
  .concat("src/components/learn/math-segments.ts");

it("AR-3 classification and payload building reach no v2 parser, MathField, render, worker, React or KaTeX module", () => {
  const closure = importClosure(TRANSFER_MODULES);
  expect(closure).toEqual(expect.arrayContaining(TRANSFER_MODULES));
  expect(closure.filter((f) => !f.startsWith("src/"))).toEqual([]);
  expect(
    closure.filter((f) => /calculator-v2|vendor\/mathquill|\/render\/|\/worker\//.test(f))
  ).toEqual([]);
});
it("TR-3 no transfer module reads figure data", () => {
  for (const file of TRANSFER_MODULES)
    expect(readFileSync(file, "utf8"), file).not.toMatch(
      /image_url|figure_kind|figure_chart_data|figure_geometry_data|ChartKind|function_plot|scatterplot|boxplot/
    );
});
