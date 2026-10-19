// Test-only source scans for AR-4 and AR-44: an import-graph walker, the MathQuill importer check,
// the import.meta, DOM-global and code-generation scans. Each reads the TypeScript syntax tree, so
// comments and strings never count. Paths are repository-relative with "/" separators. Never
// imported by production code (a __fixtures__/ module, exempt from AR-1).

import { readdirSync, readFileSync, type Dirent } from "node:fs";
import { join, posix } from "node:path";
import ts from "typescript";

/** Reads repository-relative files; `null` when the file does not exist or is not a file. */
export interface SourceHost {
  read(file: string): string | null;
} // repo-relative paths

export function nodeSourceHost(root: string): SourceHost {
  return {
    read(file) {
      try {
        return readFileSync(join(root, file), "utf8");
      } catch {
        return null; // missing, or a folder
      }
    },
  };
}

export function memoryHost(files: Readonly<Record<string, string>>): SourceHost {
  return { read: (file) => (Object.hasOwn(files, file) ? files[file] : null) };
}

const SOURCE_FILE = /\.(?:ts|tsx|js|mjs)$/;
const TEST_FILE = /\.test\./;
const FIXTURES = "__fixtures__";

/**
 * The .ts, .tsx, .js and .mjs files under each repository-relative folder, sorted. Test files
 * (`*.test.*`) and `__fixtures__/` folders are skipped unless `includeTests`; a folder that does
 * not exist contributes no files.
 */
export function listSourceFiles(
  root: string,
  dirs: readonly string[],
  options: { includeTests?: boolean } = {}
): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    let entries: Dirent[];
    try {
      entries = readdirSync(join(root, dir), { withFileTypes: true });
    } catch {
      return; // a folder that does not exist (yet)
    }
    for (const entry of entries) {
      const path = posix.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        if (entry.name === FIXTURES && !options.includeTests) continue;
        walk(path);
      } else if (entry.isFile() && SOURCE_FILE.test(entry.name)) {
        if (TEST_FILE.test(entry.name) && !options.includeTests) continue;
        found.push(path);
      }
    }
  };
  for (const dir of dirs) walk(dir);
  return [...new Set(found)].sort();
}

function scriptKind(file: string): ts.ScriptKind {
  if (/\.m?js$/.test(file)) return ts.ScriptKind.JS;
  return file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function parse(file: string, source: string): ts.SourceFile {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind(file));
}

/** Calls `visit` on every node of the tree, depth first, in source order. */
function walkTree(sf: ts.SourceFile, visit: (node: ts.Node) => void): void {
  const go = (node: ts.Node): void => {
    visit(node);
    ts.forEachChild(node, go);
  };
  go(sf);
}

/** "<line>:<column>", both 1-based, of the node's first token. */
function at(sf: ts.SourceFile, node: ts.Node): string {
  const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  return `${line + 1}:${character + 1}`;
}

/** The text of a string-literal module name; undefined for anything else. */
function literalText(node: ts.Node | undefined): string | undefined {
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;
}

/** `import type …`, or an import whose bindings are all `type`; a side-effect import is not. */
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

/** `export type … from`, or a re-export whose specifiers are all `type`. */
function isTypeOnlyExport(node: ts.ExportDeclaration): boolean {
  if (node.isTypeOnly) return true;
  const clause = node.exportClause;
  return (
    clause !== undefined &&
    ts.isNamedExports(clause) &&
    clause.elements.length > 0 &&
    clause.elements.every((element) => element.isTypeOnly)
  );
}

const stripQuery = (specifier: string): string => specifier.replace(/\?.*$/, "");

/**
 * The module specifiers of `source` in source order: value imports (side-effect imports included),
 * value re-exports, `import x = require(…)` and `import("…")` with a literal argument. Type-only
 * imports and re-exports and `import("…")` types are skipped; a "?query" suffix is stripped.
 */
export function moduleSpecifiers(file: string, source: string): string[] {
  const sf = parse(file, source);
  const found: string[] = [];
  const add = (node: ts.Node | undefined): void => {
    const text = literalText(node);
    if (text !== undefined) found.push(stripQuery(text));
  };
  walkTree(sf, (node) => {
    if (ts.isImportDeclaration(node)) {
      if (!isTypeOnlyImport(node)) add(node.moduleSpecifier);
    } else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && !isTypeOnlyExport(node)) add(node.moduleSpecifier);
    } else if (ts.isImportEqualsDeclaration(node)) {
      const ref = node.moduleReference;
      if (!node.isTypeOnly && ts.isExternalModuleReference(ref)) add(ref.expression);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      add(node.arguments[0]);
    }
  });
  return found;
}

const RESOLVE_SUFFIXES = ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"];

/**
 * Resolves `specifier` as written in `importer`. "./", "../" (and "." or "..") are relative to the
 * importer's folder and "@/" is `src/`; the first of "", .ts, .tsx, .js, .mjs, /index.ts and
 * /index.tsx that the host can read wins, and when none can the bare path is returned (importGraph
 * then reports it as missing). Anything else is a package: its first segment, or "@scope/name".
 */
export function resolveSpecifier(
  host: SourceHost,
  importer: string,
  specifier: string
): { file: string } | { package: string } {
  const spec = stripQuery(specifier);
  let base: string | null = null;
  if (spec === "." || spec === ".." || spec.startsWith("./") || spec.startsWith("../")) {
    base = posix.normalize(posix.join(posix.dirname(importer), spec));
  } else if (spec.startsWith("@/")) {
    base = posix.normalize(`src/${spec.slice(2)}`);
  }
  if (base === null) {
    const segments = spec.split("/");
    return {
      package: spec.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0],
    };
  }
  for (const suffix of RESOLVE_SUFFIXES) {
    if (host.read(base + suffix) !== null) return { file: base + suffix };
  }
  return { file: base };
}

/**
 * Every file reachable from `entry` through `moduleSpecifiers`, and every package those files
 * import, both sorted. A resolved file not ending in .ts, .tsx, .js or .mjs (CSS) is listed but not
 * parsed. Throws when a listed file cannot be read, so an unresolved import never hides an edge.
 */
export function importGraph(
  host: SourceHost,
  entry: string
): { files: string[]; packages: string[] } {
  const files = new Set<string>();
  const packages = new Set<string>();
  const pending: { file: string; importer: string | null }[] = [{ file: entry, importer: null }];
  while (pending.length > 0) {
    const { file, importer } = pending.pop()!;
    if (files.has(file)) continue;
    files.add(file);
    const source = host.read(file);
    if (source === null) {
      throw new Error(
        `importGraph: cannot read ${file}${importer ? ` (imported by ${importer})` : ""}`
      );
    }
    if (!SOURCE_FILE.test(file)) continue;
    for (const specifier of moduleSpecifiers(file, source)) {
      const target = resolveSpecifier(host, file, specifier);
      if ("package" in target) packages.add(target.package);
      else pending.push({ file: target.file, importer: file });
    }
  }
  return { files: [...files].sort(), packages: [...packages].sort() };
}

/** True when the tree holds a MetaProperty `import.meta`; comments and strings never count. */
export function usesImportMeta(file: string, source: string): boolean {
  let found = false;
  walkTree(parse(file, source), (node) => {
    if (ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword) found = true;
  });
  return found;
}

const MATHQUILL = "vendor/mathquill/";
const HARNESS_PAGES = "tests/calculator/fixture/";

/**
 * The files, in the given order, with a value import that resolves to a file under
 * vendor/mathquill/. The one exception is a CSS target imported by a harness page under
 * tests/calculator/fixture/ (vendor/mathquill/mathquill.css?inline), so a src/ file importing the
 * CSS is still listed.
 */
export function mathquillRuntimeImporters(host: SourceHost, files: readonly string[]): string[] {
  return files.filter((file) => {
    const source = host.read(file);
    if (source === null) throw new Error(`mathquillRuntimeImporters: cannot read ${file}`);
    return moduleSpecifiers(file, source).some((specifier) => {
      const target = resolveSpecifier(host, file, specifier);
      if (!("file" in target) || !target.file.startsWith(MATHQUILL)) return false;
      return !(target.file.endsWith(".css") && file.startsWith(HARNESS_PAGES));
    });
  });
}

/** Strips parentheses, `!`, `as`/`satisfies` and `(0, f)` so `(0, eval)(x)` names its callee. */
function unwrap(expression: ts.Expression): ts.Expression {
  for (;;) {
    if (
      ts.isParenthesizedExpression(expression) ||
      ts.isNonNullExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isSatisfiesExpression(expression)
    ) {
      expression = expression.expression;
    } else if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.CommaToken
    ) {
      expression = expression.right;
    } else {
      return expression;
    }
  }
}

/** The name a callee ends in: `f`, `a.f`, `a["f"]`; undefined for anything else. */
function calleeName(expression: ts.Expression): string | undefined {
  const callee = unwrap(expression);
  if (ts.isIdentifier(callee)) return callee.text;
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  if (ts.isElementAccessExpression(callee)) return literalText(callee.argumentExpression);
  return undefined;
}

/** A string literal, a template, or a `+` concatenation with a string or template operand. */
function isStringExpression(node: ts.Expression | undefined): boolean {
  if (node === undefined) return false;
  const e = unwrap(node);
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || ts.isTemplateExpression(e))
    return true;
  return (
    ts.isBinaryExpression(e) &&
    e.operatorToken.kind === ts.SyntaxKind.PlusToken &&
    (isStringExpression(e.left) || isStringExpression(e.right))
  );
}

/**
 * Code-generation calls (AR-44), each as "<kind> at <line>:<column>": "eval call" for a call to
 * `eval` or `.eval`; "Function constructor" for `new` or a call on `Function` or `.Function`, and
 * for `.constructor(` with a string or template first argument; "string timer" for `setTimeout` or
 * `setInterval` whose first argument is a string literal, template or string concatenation.
 */
export function codegenFindings(file: string, source: string): string[] {
  const sf = parse(file, source);
  const found: string[] = [];
  walkTree(sf, (node) => {
    if (ts.isNewExpression(node)) {
      if (calleeName(node.expression) === "Function") {
        found.push(`Function constructor at ${at(sf, node)}`);
      }
      return;
    }
    if (!ts.isCallExpression(node)) return;
    const name = calleeName(node.expression);
    const first = node.arguments[0];
    if (name === "eval") found.push(`eval call at ${at(sf, node)}`);
    else if (name === "Function") found.push(`Function constructor at ${at(sf, node)}`);
    else if (name === "constructor" && !ts.isIdentifier(unwrap(node.expression))) {
      if (isStringExpression(first)) found.push(`Function constructor at ${at(sf, node)}`);
    } else if ((name === "setTimeout" || name === "setInterval") && isStringExpression(first)) {
      found.push(`string timer at ${at(sf, node)}`);
    }
  });
  return found;
}

export const DOM_GLOBALS: readonly string[] = [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "requestAnimationFrame",
];

const GLOBAL_OBJECTS = new Set(["globalThis", "self"]);

/** True when `node` is the expression `globalThis` or `self`. */
function isGlobalObject(node: ts.Node): boolean {
  return ts.isIdentifier(node) && GLOBAL_OBJECTS.has(node.text);
}

/**
 * True when the identifier is a member name rather than a reference: an object-literal key, a
 * class or interface member name, an enum member, a destructured property key, or the name after
 * `a.` (or a type's `A.`) unless `a` is `globalThis` or `self`.
 */
function isMemberName(id: ts.Identifier): boolean {
  const parent = id.parent;
  if (
    ts.isPropertyAssignment(parent) ||
    ts.isPropertyDeclaration(parent) ||
    ts.isMethodDeclaration(parent) ||
    ts.isPropertySignature(parent) ||
    ts.isMethodSignature(parent) ||
    ts.isGetAccessorDeclaration(parent) ||
    ts.isSetAccessorDeclaration(parent) ||
    ts.isEnumMember(parent)
  ) {
    return parent.name === id;
  }
  if (ts.isBindingElement(parent)) return parent.propertyName === id;
  if (ts.isPropertyAccessExpression(parent)) {
    return parent.name === id && !isGlobalObject(parent.expression);
  }
  if (ts.isQualifiedName(parent)) return parent.right === id && !isGlobalObject(parent.left);
  return false;
}

/**
 * Each reference to a name in DOM_GLOBALS, as "<name> at <line>:<column>": in value or type
 * position, `typeof` guards included, and `globalThis.X`, `self.X` or `globalThis["X"]`.
 * Object-literal keys and other member names (`a.window`) never count, nor do comments or strings.
 */
export function domGlobalReferences(file: string, source: string): string[] {
  const sf = parse(file, source);
  const found: string[] = [];
  walkTree(sf, (node) => {
    if (ts.isIdentifier(node)) {
      if (DOM_GLOBALS.includes(node.text) && !isMemberName(node)) {
        found.push(`${node.text} at ${at(sf, node)}`);
      }
    } else if (ts.isElementAccessExpression(node) && isGlobalObject(node.expression)) {
      const key = literalText(node.argumentExpression);
      if (key !== undefined && DOM_GLOBALS.includes(key)) {
        found.push(`${key} at ${at(sf, node.argumentExpression)}`);
      }
    }
  });
  return found;
}
