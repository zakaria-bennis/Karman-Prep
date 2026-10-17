// AR-1: modules under src/lib/calculator-v2/, src/components/calculator-v2/ and vendor/mathquill/
// are imported only by each other, by CalculatorLoader's import() and by the standalone entry (type-
// only imports excepted), and src/lib/calculator-transfer/clipboard.ts only from
// src/components/calculator-v2/. The scan runs on synthetic sources first, then on every source file
// it finds under src/ at run time, so modules that later packages add are covered without edits.
import { readdirSync, readFileSync } from "node:fs";
import { join, posix, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../..");

type ImportKind = "static" | "dynamic" | "require" | "export";

interface ImportRef {
  specifier: string;
  kind: ImportKind;
  typeOnly: boolean;
  line: number;
}

/**
 * The lazy v2 folders, imported only by their own modules (the standalone entry is one) and by the
 * loader's `import()`.
 */
const LAZY_DIRS = ["src/lib/calculator-v2", "src/components/calculator-v2", "vendor/mathquill"];
const loader = "src/components/calculator/CalculatorLoader.tsx";

/** The v2 clipboard module and the one folder allowed to import it. */
const CLIPBOARD = "src/lib/calculator-transfer/clipboard";
const CLIPBOARD_IMPORTERS = "src/components/calculator-v2";

const SOURCE_FILE = /\.(?:ts|tsx|js|mjs|jsx|mts)$/;
const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;

function isUnder(path: string, dir: string): boolean {
  return path === dir || path.startsWith(`${dir}/`);
}

/** Test files and `__fixtures__/` folders, which AR-1 exempts as importers. */
function isTestOrFixture(path: string): boolean {
  return TEST_FILE.test(path) || path.split("/").includes("__fixtures__");
}

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (path.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (/\.m?js$/.test(path)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/** `import type …`, or named imports that are all `type`; a side-effect import is not. */
function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  const bindings = clause.namedBindings;
  return (
    clause.name === undefined &&
    bindings !== undefined &&
    ts.isNamedImports(bindings) &&
    bindings.elements.length > 0 &&
    bindings.elements.every((element) => element.isTypeOnly)
  );
}

/** The text of a string literal module name; undefined for anything else. */
function moduleName(node: ts.Node | undefined): string | undefined {
  if (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
    return node.text;
  }
  return undefined;
}

/** Every import, re-export, `import()` and `require()` of `source` that names a module. */
function collectImports(path: string, source: string): ImportRef[] {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind(path));
  const refs: ImportRef[] = [];
  const add = (node: ts.Node, specifier: string, kind: ImportKind, typeOnly: boolean): void => {
    const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
    refs.push({ specifier, kind, typeOnly, line });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const specifier = moduleName(node.moduleSpecifier);
      if (specifier !== undefined) add(node, specifier, "static", isTypeOnlyImport(node));
    } else if (ts.isExportDeclaration(node)) {
      const specifier = moduleName(node.moduleSpecifier);
      if (specifier !== undefined) add(node, specifier, "export", node.isTypeOnly);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      const specifier = moduleName(node.moduleReference.expression);
      if (specifier !== undefined) add(node, specifier, "require", node.isTypeOnly);
    } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const specifier = moduleName(node.arguments[0]);
      if (specifier !== undefined) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          add(node, specifier, "dynamic", false);
        } else if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
          add(node, specifier, "require", false);
        }
      }
    }
    // An ImportTypeNode (`typeof import("…")`) is a type, not a call, so it is never collected.
    ts.forEachChild(node, visit);
  };
  visit(file);
  return refs;
}

/** The repo-relative module path `specifier` names from `importer`; null for a package. */
function resolveSpecifier(importer: string, specifier: string): string | null {
  let target: string;
  if (specifier.startsWith("@/")) {
    target = posix.normalize(`src/${specifier.slice(2)}`);
  } else if (/^\.\.?(?:\/|$)/.test(specifier)) {
    target = posix.join(posix.dirname(importer), specifier);
  } else {
    return null;
  }
  return target.replace(/\.(?:ts|tsx|js|mjs|jsx)$/, "").replace(/\/index$/, "");
}

/** The non-test source files under `root/dir`, with repo-relative POSIX paths, sorted. */
function sourceFiles(root: string, dir = "src"): { path: string; source: string }[] {
  const paths: string[] = [];
  for (const entry of readdirSync(join(root, dir), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = relative(root, join(entry.parentPath, entry.name)).split(sep).join("/");
    if (SOURCE_FILE.test(path) && !isTestOrFixture(path)) paths.push(path);
  }
  return paths.sort().map((path) => ({ path, source: readFileSync(join(root, path), "utf8") }));
}

/** One `<importer> imports <specifier>` message per import that AR-1 forbids. */
function importViolations(files: readonly { path: string; source: string }[]): string[] {
  const violations: string[] = [];
  for (const { path, source } of files) {
    if (isTestOrFixture(path)) continue;
    const inLazyDir = LAZY_DIRS.some((dir) => isUnder(path, dir));
    for (const ref of collectImports(path, source)) {
      if (ref.typeOnly) continue;
      const target = resolveSpecifier(path, ref.specifier);
      if (target === null) continue;
      const allowed = LAZY_DIRS.some((dir) => isUnder(target, dir))
        ? inLazyDir || (ref.kind === "dynamic" && path === loader)
        : target !== CLIPBOARD || isUnder(path, CLIPBOARD_IMPORTERS);
      if (!allowed) violations.push(`${path} imports ${ref.specifier}`);
    }
  }
  return violations;
}

const scope = "src/components/calculator/CalculatorScope.tsx";
const quizHost = "@/components/calculator-v2/host/quiz-host";

function v(path: string, source: string): string[] {
  return importViolations([{ path, source }]);
}

/** v2 imports of every kind, which only test files and fixtures may hold outside v2. */
const V2_IMPORTS = [
  `import { mountQuizCalculator } from "${quizHost}";`,
  'export * from "@/lib/calculator-v2/theme/roles";',
  'const latex = import("@/lib/calculator-v2/core/latex");',
  'const app = require("@/components/calculator-v2/ui/App");',
  'import { readClipboard } from "@/lib/calculator-transfer/clipboard";',
].join("\n");

it("AR-1 the import scan flags every importer outside the allowed set in synthetic sources", () => {
  expect(
    v(
      "src/components/learn/Fake.tsx",
      'import { parseLatex } from "@/lib/calculator-v2/core/latex";'
    )
  ).toEqual(["src/components/learn/Fake.tsx imports @/lib/calculator-v2/core/latex"]);

  const flagged: readonly (readonly [path: string, source: string, specifier: string])[] = [
    [loader, `import { mountQuizCalculator } from "${quizHost}";`, quizHost],
    [scope, `const host = import("${quizHost}");`, quizHost],
    [
      "src/components/learn/A.ts",
      'export { x } from "../calculator-v2/foo";',
      "../calculator-v2/foo",
    ],
    [
      "src/components/calculator/A.ts",
      'import "../../../vendor/mathquill/mathquill.js";',
      "../../../vendor/mathquill/mathquill.js",
    ],
    [
      "src/components/calculator/TransferControl.tsx",
      'import { readClipboard } from "@/lib/calculator-transfer/clipboard";',
      "@/lib/calculator-transfer/clipboard",
    ],
    [
      "src/lib/calculator-transfer/classify.ts",
      'import { extractClipboardText } from "./clipboard";',
      "./clipboard",
    ],
  ];
  for (const [path, source, specifier] of flagged) {
    expect(v(path, source), `${path}: ${source}`).toEqual([`${path} imports ${specifier}`]);
  }

  // The exempt importers below hold real violations: the same source fails from a quiz module.
  expect(v("src/components/learn/B.ts", V2_IMPORTS)).toHaveLength(5);
  const allowed: readonly (readonly [path: string, source: string])[] = [
    [loader, `const load = () => import("${quizHost}");`],
    [loader, `type M = typeof import("${quizHost}");`],
    [scope, `import type { OpenTrigger } from "${quizHost}";`],
    [scope, 'import { type SkinId } from "@/lib/calculator-v2/theme/skins";'],
    [
      "src/components/calculator-v2/ui/App.tsx",
      'import { readClipboard } from "@/lib/calculator-transfer/clipboard";',
    ],
    ["src/lib/calculator-v2/plot/a.ts", 'import { b } from "../../../components/calculator-v2/b";'],
    ["src/lib/calculator-transfer/a.test.ts", V2_IMPORTS],
    ["src/components/calculator/__fixtures__/f.ts", V2_IMPORTS],
  ];
  for (const [path, source] of allowed) {
    expect(v(path, source), `${path}: ${source}`).toEqual([]);
  }
});

it("AR-1 only v2 modules, the CalculatorLoader import() and the standalone entry import v2 code, and only v2 UI imports clipboard.ts", () => {
  const files = sourceFiles(ROOT);
  const paths = files.map((file) => file.path);
  expect(paths).toContain("src/lib/calculator-v2/theme/roles.ts");
  expect(paths.filter((path) => path.includes(".test."))).toEqual([]);
  expect(importViolations(files)).toEqual([]);
});
