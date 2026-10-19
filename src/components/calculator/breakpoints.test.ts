// AR-19: calculator code takes its viewport breakpoints only from breakpoints.ts. The scan runs on
// synthetic sources first, then on the real files it finds at run time, so files that later
// packages add under the scanned folders are covered without editing this test.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import postcss from "postcss";
import ts from "typescript";
import { expect, it } from "vitest";
import { CALCULATOR_DOCK_MIN_WIDTH, FULL_SCREEN_QUERY, PHONE_QUERY } from "./breakpoints";

const ROOT = resolve(__dirname, "../../..");

/** The folders AR-19 scans. */
const SCAN_DIRS = ["src/components/calculator", "src/lib/calculator"] as const;

/** breakpoints.ts itself. */
const EXCEPT: readonly string[] = ["src/components/calculator/breakpoints.ts"];

/** A width or height media feature in TS string or template text. */
const TS_SIZE_QUERY = /\((?:min|max)-(?:width|height)\s*:/;

/** A width or height media feature in an `@media` prelude, prefixed or in range syntax. */
const CSS_SIZE_FEATURE = /(?<![\w-])(?:(?:min|max)-)?(?:device-)?(?:width|height)(?![\w-])/i;

const COMPARISONS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
]);

const VIEWPORT_SIZES: ReadonlySet<string> = new Set(["innerWidth", "innerHeight"]);

function normalise(query: string): string {
  return query.toLowerCase().replace(/\s+/g, " ").trim();
}

const ALLOWED_QUERIES: ReadonlySet<string> = new Set(
  [FULL_SCREEN_QUERY, PHONE_QUERY].map(normalise)
);

/** The text of a string literal or template literal part; undefined for any other node. */
function literalText(node: ts.Node): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
    return node.text;
  }
  return undefined;
}

/** `innerWidth` or `innerHeight`, bare or as a property (`window.innerWidth`). */
function isViewportSize(node: ts.Expression): boolean {
  if (ts.isIdentifier(node)) return VIEWPORT_SIZES.has(node.text);
  return ts.isPropertyAccessExpression(node) && VIEWPORT_SIZES.has(node.name.text);
}

/** A `<`, `<=`, `>` or `>=` comparison of the viewport width or height with a number literal. */
function isLiteralViewportComparison(node: ts.Node): boolean {
  if (!ts.isBinaryExpression(node) || !COMPARISONS.has(node.operatorToken.kind)) return false;
  const { left, right } = node;
  return (
    (isViewportSize(left) && ts.isNumericLiteral(right)) ||
    (ts.isNumericLiteral(left) && isViewportSize(right))
  );
}

function tsFindings(path: string, source: string, left: Map<string, number>): string[] {
  const kind = path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
  const texts: string[] = [];
  const visit = (node: ts.Node): void => {
    const literal = literalText(node);
    if (
      literal !== undefined &&
      TS_SIZE_QUERY.test(literal) &&
      !ALLOWED_QUERIES.has(normalise(literal))
    ) {
      texts.push(literal);
    }
    if (isLiteralViewportComparison(node)) {
      const text = node.getText(file);
      const key = `${path}|${text}`;
      const count = left.get(key) ?? 0;
      if (count > 0) left.set(key, count - 1);
      else texts.push(text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return texts;
}

function cssFindings(source: string): string[] {
  const texts: string[] = [];
  postcss.parse(source).walkAtRules((rule) => {
    if (rule.name.toLowerCase() !== "media") return;
    const prelude = rule.params.trim();
    if (CSS_SIZE_FEATURE.test(prelude) && !ALLOWED_QUERIES.has(normalise(prelude))) {
      texts.push(prelude);
    }
  });
  return texts;
}

/** Each viewport query or literal viewport comparison of `source` that AR-19 forbids. */
function breakpointFindings(
  path: string,
  source: string,
  allow?: ReadonlyMap<string, number>
): string[] {
  const texts = /\.tsx?$/.test(path)
    ? tsFindings(path, source, new Map(allow ?? []))
    : cssFindings(source);
  return texts.map((text) => `${path}: ${text}`);
}

/** The repo-relative calculator files AR-19 scans, sorted. */
function calculatorFiles(root: string): string[] {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const path = relative(root, join(entry.parentPath, entry.name)).split(sep).join("/");
      if (!/\.(?:css|tsx?)$/.test(path) || /\.test\.tsx?$/.test(path)) continue;
      if (path.split("/").includes("__fixtures__") || EXCEPT.includes(path)) continue;
      files.push(path);
    }
  }
  return files.sort();
}

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

it("AR-19 breakpoints.ts exports the dock width and the two media queries", () => {
  expect(CALCULATOR_DOCK_MIN_WIDTH).toBe(1024);
  expect(FULL_SCREEN_QUERY).toBe("(max-width: 1023px), (max-height: 500px)");
  expect(PHONE_QUERY).toBe("(max-width: 767px), (max-height: 500px)");
});

it("AR-19 the scan flags other viewport queries and literal innerWidth comparisons", () => {
  const p = "src/components/calculator/a.ts";
  expect(breakpointFindings(p, 'matchMedia("(max-width: 900px)")')).toEqual([
    p + ": (max-width: 900px)",
  ]);
  expect(
    breakpointFindings(
      p,
      'matchMedia(FULL_SCREEN_QUERY); matchMedia("(prefers-reduced-motion: reduce)")'
    )
  ).toEqual([]);
  expect(breakpointFindings(p, 'const q = "(max-width: 1023px),  (max-height: 500px)";')).toEqual(
    []
  );
  expect(breakpointFindings(p, "if (window.innerWidth >= 1100) {}")).toEqual([
    p + ": window.innerWidth >= 1100",
  ]);
  expect(breakpointFindings("a.css", "@media (max-width: 600px) {}")).toEqual([
    "a.css: (max-width: 600px)",
  ]);
  expect(
    breakpointFindings(
      "a.css",
      "@media (max-width: 767px), (max-height: 500px) {} @media (prefers-color-scheme: dark) {}"
    )
  ).toEqual([]);
});

it("AR-19 calculator code uses only the breakpoints.ts queries and dock width", () => {
  const files = calculatorFiles(ROOT);
  expect(files).toContain("src/components/calculator/CalculatorScope.tsx");
  expect(files).not.toContain("src/components/calculator/breakpoints.ts");
  expect(files.flatMap((path) => breakpointFindings(path, read(path)))).toEqual([]);
});
