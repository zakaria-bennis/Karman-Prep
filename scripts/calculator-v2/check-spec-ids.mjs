// Spec-ID checker for calculator v2 (01-interfaces-integration.md section 16).
//
// Every selected spec ID needs a test whose title leads with it, or a counted golden-corpus case
// (one with at least one expected field) naming it in `rules`. Run it through tsx, because it
// imports the TypeScript corpus:
//
//   npx tsx scripts/calculator-v2/check-spec-ids.mjs --packages 02,03 [--files <globs>]
//   npx tsx scripts/calculator-v2/check-spec-ids.mjs --ids PR-3,PR-4 [--files <globs>]
//
// Importing this module has no side effects; the CLI runs only when the file is the process entry.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** @typedef {import("../../src/lib/calculator-v2/core/corpus/types").CorpusCase} CorpusCase */

/** The work-package allocation that `--packages` reads, relative to the repository root. */
export const INDEX_PATH = "docs/superpowers/plans/2026-10-16-calculator-v2-phase1/00-index.md";

/** Test files whose titles count, as repository-relative globs. @type {readonly string[]} */
export const SCANNED_GLOBS = Object.freeze([
  "src/**/*.test.{ts,tsx}",
  "tests/**/*.spec.ts",
  "tests/unit/**/*.test.ts",
]);

// Mirrors EXPECTED_FIELDS of core/corpus/types.ts; the unit test catches drift.
const EXPECTED_FIELDS = ["tree", "latex", "kind", "chips", "display", "error"];
const ID = /^[A-Z][A-Z0-9]*-\d+$/;
const RANGE = /^([A-Z][A-Z0-9]*)-(\d+)\s+to\s+([A-Z][A-Z0-9]*)-(\d+)$/;
const TITLE =
  /(?<![\w.$])(test\.describe|describe|test|it)\s*\(\s*(["'`])((?:\\.|(?!\2)[^\\])*)\2/g;
const LEADING_IDS =
  /^[A-Z][A-Z0-9]*-\d+(?![\w-])(?:(?:\s*,\s*|\s+and\s+)[A-Z][A-Z0-9]*-\d+(?![\w-]))*/;
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CORPUS_INDEX = "src/lib/calculator-v2/core/corpus/index.ts";
const USAGE = [
  "usage: npx tsx scripts/calculator-v2/check-spec-ids.mjs (--ids <list> | --packages <NN,NN>) [--files <globs>]",
  '  --ids       spec IDs, ranges and lists, e.g. "PR-3, PR-7 to PR-27; AR-1"',
  "  --packages  work packages of " + INDEX_PATH + ", e.g. 02,03",
  "  --files     comma-separated globs (commas inside {...} kept) limiting the scanned test files;",
  "              each must match at least one file of " + SCANNED_GLOBS.join(", "),
].join("\n");

/**
 * Expands an ID list: "PR-7 to PR-27, PR-29; AR-1." gives every ID in order.
 * @param {string} list
 * @returns {string[]}
 */
export function expandIds(list) {
  /** @type {string[]} */
  const ids = [];
  for (const raw of list.trim().replace(/\.$/, "").split(/[,;]/)) {
    const piece = raw.trim();
    if (ID.test(piece)) {
      ids.push(piece);
      continue;
    }
    const range = RANGE.exec(piece);
    const from = range ? Number(range[2]) : NaN;
    const to = range ? Number(range[4]) : NaN;
    if (!range || range[1] !== range[3] || from > to)
      throw new Error(`expandIds: "${piece}" is not a spec ID or an "ID to ID" range`);
    for (let n = from; n <= to; n++) ids.push(`${range[1]}-${n}`);
  }
  return ids;
}

/**
 * Reads the "- **IDs:**" line under each "### NN ..." package heading of 00-index.md.
 * @param {string} indexMarkdown
 * @returns {Map<string, string[]>} package key ("02") to its IDs, in file order
 */
export function packageIds(indexMarkdown) {
  /** @type {Map<string, string[]>} */
  const map = new Map();
  /** @type {string | null} */
  let current = null;
  for (const line of indexMarkdown.split(/\r?\n/)) {
    const heading = /^### (\d{2}) /.exec(line);
    if (heading) {
      current = heading[1];
      continue;
    }
    if (/^#{1,3} /.test(line)) {
      current = null;
      continue;
    }
    const ids = /^- \*\*IDs:\*\* (.+)$/.exec(line);
    if (current !== null && ids && !map.has(current)) map.set(current, expandIds(ids[1]));
  }
  return map;
}

/**
 * IDs leading the titles of it(), test(), describe() and test.describe() calls in a source file.
 * @param {string} source
 * @returns {Set<string>}
 */
export function titledIds(source) {
  /** @type {Set<string>} */
  const found = new Set();
  for (const match of source.matchAll(TITLE)) {
    const leading = LEADING_IDS.exec(match[3]);
    if (leading) for (const id of leading[0].match(/[A-Z][A-Z0-9]*-\d+/g) ?? []) found.add(id);
  }
  return found;
}

/**
 * Rules of the corpus cases that have at least one expected field.
 * @param {readonly CorpusCase[]} cases
 * @returns {Set<string>}
 */
export function corpusIds(cases) {
  /** @type {Set<string>} */
  const found = new Set();
  for (const c of cases) {
    const record = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (c));
    if (EXPECTED_FIELDS.some((f) => record[f] !== undefined))
      for (const rule of c.rules) found.add(rule);
  }
  return found;
}

/**
 * Required IDs not in `found`, in order, each once.
 * @param {readonly string[]} required
 * @param {ReadonlySet<string>} found
 * @returns {string[]}
 */
export function missingIds(required, found) {
  return [...new Set(required)].filter((id) => !found.has(id));
}

/**
 * Anchored regex for a glob: a double star followed by a slash is any number of directories, a
 * single star stays within one path segment and "{a,b}" is an alternation; every other character
 * matches itself.
 * @param {string} glob
 * @returns {RegExp}
 */
function globRegExp(glob) {
  const converted = glob
    .replace(/[.+?^$()|[\]\\]/g, "\\$&")
    .replace(/\*\*\/|\*/g, (star) => (star === "*" ? "[^/]*" : "(?:.*/)?"))
    .replace(/\{([^{}]*)\}/g, (_, body) => `(?:${body.split(",").join("|")})`);
  return new RegExp("^" + converted + "$");
}

/**
 * Regular files under src/ and tests/ (outside node_modules) matching SCANNED_GLOBS and, when
 * `only` is given, one of its globs too.
 * @param {string} root repository root
 * @param {readonly string[]} [only]
 * @returns {string[]} sorted repository-relative POSIX paths
 */
export function scanFiles(root, only) {
  const scanned = SCANNED_GLOBS.map(globRegExp);
  const limits = only?.map(globRegExp);
  /** @type {string[]} */
  const files = [];
  for (const top of ["src", "tests"]) {
    /** @type {import("node:fs").Dirent[]} */
    let entries;
    try {
      entries = readdirSync(join(root, top), { recursive: true, withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const path = relative(root, join(entry.parentPath, entry.name)).split(sep).join("/");
      if (path.split("/").includes("node_modules")) continue;
      if (!scanned.some((re) => re.test(path))) continue;
      if (limits && !limits.some((re) => re.test(path))) continue;
      files.push(path);
    }
  }
  return files.sort();
}

/**
 * Splits a --files value on commas outside {...}.
 * @param {string} value
 * @returns {string[]}
 */
function splitGlobs(value) {
  /** @type {string[]} */
  const globs = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "{") depth++;
    else if (value[i] === "}") depth = Math.max(0, depth - 1);
    else if (value[i] === "," && depth === 0) {
      globs.push(value.slice(start, i));
      start = i + 1;
    }
  }
  globs.push(value.slice(start));
  return globs.map((g) => g.trim());
}

/**
 * @param {string} problem
 * @returns {number}
 */
function usage(problem) {
  console.error(`check-spec-ids: ${problem}\n${USAGE}`);
  return 2;
}

/**
 * The CLI. Returns the exit code: 0 all covered, 1 IDs missing, 2 usage error.
 * @param {readonly string[]} args
 * @returns {Promise<number>}
 */
async function main(args) {
  /** @type {string[] | null} */
  let required = null;
  /** @type {string[] | undefined} */
  let only;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const value = args[i + 1];
    i++;
    if (flag === "--files") {
      if (only) return usage("--files given twice");
      if (!value) return usage("--files needs a value");
      only = splitGlobs(value);
    } else if (flag === "--ids" || flag === "--packages") {
      if (required) return usage("give one mode: --ids or --packages");
      if (!value) return usage(`${flag} needs a value`);
      if (flag === "--ids") {
        try {
          required = expandIds(value);
        } catch (error) {
          return usage(error instanceof Error ? error.message : String(error));
        }
      } else {
        const packages = packageIds(readFileSync(join(ROOT, INDEX_PATH), "utf8"));
        required = [];
        for (const key of value.split(",").map((k) => k.trim())) {
          const ids = packages.get(key);
          if (!ids) return usage(`unknown package "${key}"`);
          required.push(...ids);
        }
      }
    } else {
      return usage(`unknown argument "${flag}"`);
    }
  }
  if (!required) return usage("no mode given");
  if (only) {
    const all = scanFiles(ROOT);
    for (const glob of only) {
      const re = globRegExp(glob);
      if (!all.some((path) => re.test(path)))
        return usage(`--files glob "${glob}" matches no scanned test file`);
    }
  }

  /** @type {Set<string>} */
  const found = new Set();
  for (const file of scanFiles(ROOT, only))
    for (const id of titledIds(readFileSync(join(ROOT, file), "utf8"))) found.add(id);
  /** @type {{ CORPUS: readonly CorpusCase[] }} */
  const corpus = await import(pathToFileURL(join(ROOT, CORPUS_INDEX)).href);
  for (const id of corpusIds(corpus.CORPUS)) found.add(id);

  const ids = [...new Set(required)];
  const missing = missingIds(ids, found);
  if (missing.length === 0) {
    console.log(`check-spec-ids: all ${ids.length} IDs covered`);
    return 0;
  }
  console.error(
    `check-spec-ids: ${missing.length} of ${ids.length} IDs have no test title or counted corpus rules entry:\n` +
      missing.map((id) => `  ${id}`).join("\n")
  );
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error);
      process.exitCode = 1;
    }
  );
}
