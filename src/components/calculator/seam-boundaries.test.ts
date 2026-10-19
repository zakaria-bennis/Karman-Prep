// AR-1: the lazy calculator modules (src/lib/calculator/, KarmanCalculator.ts and the subfolders
// of src/components/calculator/, and vendor/mathquill/) are imported only by each other and by
// CalculatorLoader's import() (type-only imports excepted), and
// src/lib/calculator-transfer/clipboard.ts only from the lazy component modules. The scan runs on
// synthetic sources first, then on every source file it finds under src/ at run time, so modules
// that later packages add are covered without edits.
//
// AR-2: the eager modules (the non-test modules of src/lib/calculator-transfer/ and the top-level
// modules of src/components/calculator/ other than KarmanCalculator.ts) touch no window, document,
// navigator or Worker at module scope, and each loads under Vitest's node environment. AR-24:
// learn-header.ts is a leaf that LearnLayout re-exports. These scans also enumerate files at run
// time.
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

const COMPONENTS = "src/components/calculator";
/** The lazy subfolders of src/components/calculator/; every subfolder must be listed here. */
const LAZY_COMPONENT_DIRS = [
  "host",
  "icons",
  "math-field",
  "styles",
  "transfer",
  "ui",
  "__fixtures__",
];
/** The lazy component paths, extensionless: KarmanCalculator.ts and the lazy subfolders. */
const LAZY_COMPONENT_PATHS = [
  `${COMPONENTS}/KarmanCalculator`,
  ...LAZY_COMPONENT_DIRS.map((dir) => `${COMPONENTS}/${dir}`),
];
/**
 * The lazy calculator paths, extensionless, imported only by their own modules and by the loader's
 * `import()`.
 */
const LAZY_PATHS = ["src/lib/calculator", ...LAZY_COMPONENT_PATHS, "vendor/mathquill"];
const loader = "src/components/calculator/CalculatorLoader.tsx";

/** The clipboard module, which only the lazy component modules may import. */
const CLIPBOARD = "src/lib/calculator-transfer/clipboard";

const SOURCE_FILE = /\.(?:ts|tsx|js|mjs|jsx|mts)$/;
const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;

function isUnder(path: string, dir: string): boolean {
  return path === dir || path.startsWith(`${dir}/`);
}

/** Whether `path` (with or without its extension) is a lazy calculator module. */
function isLazy(path: string, paths: readonly string[] = LAZY_PATHS): boolean {
  const bare = path.replace(/\.(?:ts|tsx|js|mjs|jsx|css)$/, "");
  return paths.some((dir) => isUnder(bare, dir));
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

/** The files under `root/dir` except tests and fixtures, as repo-relative POSIX paths, sorted. */
function repoPaths(root: string, dir: string): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(join(root, dir), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = relative(root, join(entry.parentPath, entry.name)).split(sep).join("/");
    if (!isTestOrFixture(path)) paths.push(path);
  }
  return paths.sort();
}

/** The non-test source files under `root/dir`, with repo-relative POSIX paths, sorted. */
function sourceFiles(root: string, dir = "src"): { path: string; source: string }[] {
  return repoPaths(root, dir)
    .filter((path) => SOURCE_FILE.test(path))
    .map((path) => ({ path, source: readFileSync(join(root, path), "utf8") }));
}

/** One `<importer> imports <specifier>` message per import that AR-1 forbids. */
function importViolations(files: readonly { path: string; source: string }[]): string[] {
  const violations: string[] = [];
  for (const { path, source } of files) {
    if (isTestOrFixture(path)) continue;
    const inLazyDir = isLazy(path);
    for (const ref of collectImports(path, source)) {
      if (ref.typeOnly) continue;
      const target = resolveSpecifier(path, ref.specifier);
      if (target === null) continue;
      const allowed = isLazy(target)
        ? inLazyDir || (ref.kind === "dynamic" && path === loader)
        : target !== CLIPBOARD || isLazy(path, LAZY_COMPONENT_PATHS);
      if (!allowed) violations.push(`${path} imports ${ref.specifier}`);
    }
  }
  return violations;
}

const scope = "src/components/calculator/CalculatorScope.tsx";
const quizHost = "@/components/calculator/host/quiz-host";

function v(path: string, source: string): string[] {
  return importViolations([{ path, source }]);
}

/** Lazy imports of every kind, which only test files and fixtures may hold outside the lazy paths. */
const LAZY_IMPORTS = [
  `import { mountQuizCalculator } from "${quizHost}";`,
  'export * from "@/lib/calculator/theme/roles";',
  'const latex = import("@/lib/calculator/core/latex");',
  'const app = require("@/components/calculator/ui/App");',
  'import { readClipboard } from "@/lib/calculator-transfer/clipboard";',
].join("\n");

it("AR-1 the import scan flags every importer outside the allowed set in synthetic sources", () => {
  expect(
    v("src/components/learn/Fake.tsx", 'import { parseLatex } from "@/lib/calculator/core/latex";')
  ).toEqual(["src/components/learn/Fake.tsx imports @/lib/calculator/core/latex"]);

  const flagged: readonly (readonly [path: string, source: string, specifier: string])[] = [
    [loader, `import { mountQuizCalculator } from "${quizHost}";`, quizHost],
    [scope, `const host = import("${quizHost}");`, quizHost],
    [
      "src/components/learn/A.ts",
      'export { x } from "../calculator/ui/foo";',
      "../calculator/ui/foo",
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
  expect(v("src/components/learn/B.ts", LAZY_IMPORTS)).toHaveLength(5);
  const allowed: readonly (readonly [path: string, source: string])[] = [
    [loader, `const load = () => import("${quizHost}");`],
    [loader, `type M = typeof import("${quizHost}");`],
    [scope, `import type { OpenTrigger } from "${quizHost}";`],
    [scope, 'import { type SkinId } from "@/lib/calculator/theme/skins";'],
    [
      "src/components/calculator/ui/App.tsx",
      'import { readClipboard } from "@/lib/calculator-transfer/clipboard";',
    ],
    ["src/lib/calculator/plot/a.ts", 'import { b } from "../../../components/calculator/ui/b";'],
    ["src/components/learn/C.tsx", 'import { c } from "../calculator/transfer-selection";'],
    ["src/lib/calculator-transfer/a.test.ts", LAZY_IMPORTS],
    ["src/components/calculator/__fixtures__/f.ts", LAZY_IMPORTS],
  ];
  for (const [path, source] of allowed) {
    expect(v(path, source), `${path}: ${source}`).toEqual([]);
  }
});

it("AR-1 only lazy modules and the CalculatorLoader import() import lazy calculator code, and only lazy UI imports clipboard.ts", () => {
  const files = sourceFiles(ROOT);
  const paths = files.map((file) => file.path);
  expect(paths).toContain("src/lib/calculator/theme/roles.ts");
  expect(paths.filter((path) => path.includes(".test."))).toEqual([]);
  expect(importViolations(files)).toEqual([]);
});

it("AR-1 every subfolder of src/components/calculator/ is classified as lazy", () => {
  const dirs = readdirSync(join(ROOT, COMPONENTS), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  expect(dirs).toEqual([...LAZY_COMPONENT_DIRS].sort());
});

/** Browser globals that AR-2 keeps out of module scope. */
const BROWSER_GLOBALS = new Set(["window", "document", "navigator", "Worker"]);
/** `globalThis.window`, `self.document` and the like reach the same globals. */
const GLOBAL_OBJECTS = new Set(["globalThis", "self"]);

/** The folders whose non-test modules are eager (AR-2). */
const EAGER_DIR = "src/lib/calculator-transfer";

/** A class `extends` clause's expression: the one TypeNode whose expression runs. */
function isClassExtends(node: ts.Node): boolean {
  return (
    ts.isExpressionWithTypeArguments(node) &&
    ts.isHeritageClause(node.parent) &&
    node.parent.token === ts.SyntaxKind.ExtendsKeyword &&
    ts.isClassLike(node.parent.parent)
  );
}

/** The operand of `typeof`, parentheses aside: `typeof window` never throws without a DOM. */
function isTypeofOperand(node: ts.Node): boolean {
  let child = node;
  while (ts.isParenthesizedExpression(child.parent)) child = child.parent;
  return ts.isTypeOfExpression(child.parent) && child.parent.expression === child;
}

/**
 * A name that does not read a variable: a declaration, property, label or import name, an
 * object-literal property name and the name side of a property access or qualified name. A
 * shorthand property (`{ window }`) reads the variable it names.
 */
function isNamePosition(node: ts.Identifier): boolean {
  const parent: ts.Node & { name?: ts.Node; propertyName?: ts.Node; label?: ts.Node } = node.parent;
  if (ts.isShorthandPropertyAssignment(parent)) return false;
  if (ts.isQualifiedName(parent)) return parent.right === node;
  return parent.name === node || parent.propertyName === node || parent.label === node;
}

function isStatic(node: ts.PropertyDeclaration): boolean {
  return node.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) ?? false;
}

/** `<path>:<line> <name>` for each browser global that `source` touches at module scope (AR-2). */
function moduleScopeGlobals(path: string, source: string): string[] {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind(path));
  const found: { start: number; name: string }[] = [];
  const report = (node: ts.Node, name: string): void => {
    if (!isTypeofOperand(node)) found.push({ start: node.getStart(file), name });
  };
  const visit = (node: ts.Node): void => {
    // Types never run, except the value a class extends.
    if (ts.isTypeNode(node) && !isClassExtends(node)) return;
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) return;
    // Bodies that run later. Decorators and computed names still run when the class or object is
    // created, and static initialisers and static blocks run with the class.
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isConstructorDeclaration(node)
    ) {
      return;
    }
    if (
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessor(node) ||
      ts.isSetAccessor(node) ||
      (ts.isPropertyDeclaration(node) && !isStatic(node))
    ) {
      ts.getDecorators(node)?.forEach(visit);
      if (ts.isComputedPropertyName(node.name)) visit(node.name);
      return;
    }
    if (ts.isIdentifier(node)) {
      if (BROWSER_GLOBALS.has(node.text) && !isNamePosition(node)) report(node, node.text);
      return;
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      GLOBAL_OBJECTS.has(node.expression.text) &&
      BROWSER_GLOBALS.has(node.name.text)
    ) {
      report(node, node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found
    .sort((a, b) => a.start - b.start)
    .map(({ start, name }) => {
      const line = file.getLineAndCharacterOfPosition(start).line + 1;
      return `${path}:${line} ${name}`;
    });
}

/**
 * AR-2's eager modules: the non-test `.ts` and `.tsx` files of EAGER_DIR, plus the top-level
 * non-test `.ts` and `.tsx` files of src/components/calculator/ that are not lazy.
 */
function eagerFiles(root: string): string[] {
  const files = existsSync(join(root, EAGER_DIR)) ? repoPaths(root, EAGER_DIR) : [];
  for (const entry of readdirSync(join(root, COMPONENTS), { withFileTypes: true })) {
    const path = `${COMPONENTS}/${entry.name}`;
    if (entry.isFile() && !isTestOrFixture(path) && !isLazy(path)) files.push(path);
  }
  return files.filter((path) => /\.tsx?$/.test(path)).sort();
}

function g(src: string): string[] {
  return moduleScopeGlobals("a.ts", src);
}

it("AR-2 the module-scope scan flags window, document, navigator and Worker outside functions", () => {
  expect(g("const w = window.innerWidth;")).toEqual(["a.ts:1 window"]);
  expect(g("export const nav = globalThis.navigator;")).toEqual(["a.ts:1 navigator"]);
  expect(g("class A extends Worker {}")).toEqual(["a.ts:1 Worker"]);
  expect(g("class A { static el = document.body; }")).toEqual(["a.ts:1 document"]);
  expect(g("const { innerWidth } = window;\nif (navigator.onLine) {}")).toEqual([
    "a.ts:1 window",
    "a.ts:2 navigator",
  ]);
  for (const src of [
    "export function f() { return document.title; }\nconst h = () => window.scrollTo(0, 0);",
    "const isBrowser = typeof window !== 'undefined';\nlet w: Worker | null = null;",
    "class A { el = document.body; }\nconst o = { window: 1 }; o.window;",
  ]) {
    expect(g(src), src).toEqual([]);
  }

  // Static blocks, `self.` access and computed names run at module scope too, and only a bare
  // `typeof window` is safe without a DOM: `typeof window.document` reads window first.
  expect(g("class B {\n  static { self.document; }\n  [navigator.language]() {}\n}")).toEqual([
    "a.ts:2 document",
    "a.ts:3 navigator",
  ]);
  expect(g("const d = typeof window.document;")).toEqual(["a.ts:1 window"]);
});

it("AR-2 eager calculator modules touch no browser global at module scope", () => {
  const files = eagerFiles(ROOT);
  expect(files).toEqual(
    expect.arrayContaining([
      "src/components/calculator/CalculatorScope.tsx",
      "src/components/calculator/report-error.ts",
    ])
  );
  expect(files.filter((path) => path.includes(".test."))).toEqual([]);
  const findings = files.flatMap((path) =>
    moduleScopeGlobals(path, readFileSync(join(ROOT, path), "utf8"))
  );
  expect(findings).toEqual([]);
});

it("AR-2 each eager calculator module loads under Vitest's node environment without a DOM", async () => {
  expect("window" in globalThis).toBe(false);
  expect("document" in globalThis).toBe(false);
  for (const path of eagerFiles(ROOT)) {
    await expect(import(/* @vite-ignore */ join(ROOT, path)), path).resolves.toBeDefined();
  }
}, 60_000);

it("AR-24 learn-header.ts imports nothing and LearnLayout re-exports LEARN_HEADER_CLEARANCE = 72", async () => {
  const src = readFileSync(join(ROOT, "src/components/learn/learn-header.ts"), "utf8");
  expect(collectImports("src/components/learn/learn-header.ts", src)).toEqual([]);
  // A dynamic import, so this file still loads while the leaf is missing.
  expect((await import("@/components/learn/learn-header")).LEARN_HEADER_CLEARANCE).toBe(72);
  expect(readFileSync(join(ROOT, "src/components/learn/LearnLayout.tsx"), "utf8")).toContain(
    'export { LEARN_HEADER_CLEARANCE } from "./learn-header";'
  );
});
