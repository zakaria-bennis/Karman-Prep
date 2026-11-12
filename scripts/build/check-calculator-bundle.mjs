// Calculator bundle check (AR-32, AR-33, AR-66).
// Reads the OpenNext output of `npm run cf:build` and checks, in order: the pinned Turbopack
// format, the lazy chunk group's positive control, that the calculator never reaches the server
// handler or an eager chunk of a quiz route, the emitted worker, the gzip budgets and growth
// against docs/calculator-bundle-baseline.json.
//
// The eager size is the calculator's own code only: the eager calculator modules (AR-2) that the
// rest of src/ imports, bundled with esbuild from source with every other module left out, plus
// their CSS. It used to be each quiz route's whole eager JS and CSS minus a snapshot of an older
// build, which moved with every lesson-page change and failed unrelated pull requests
// (2026-11-12, founder go-ahead).
//
//   node scripts/build/check-calculator-bundle.mjs                      check .open-next/
//   node scripts/build/check-calculator-bundle.mjs --update-baseline    write the measured values
//
// The CLI runs only when this file is the process entry; importing it has no side effects.

import { build } from "esbuild";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import prettier from "prettier";
import ts from "typescript";
import {
  TURBOPACK_FORMAT_NEXT,
  assertPinnedNext,
  eagerFiles,
  parseAsyncChunkGroups,
  parseWorkerCall,
} from "./turbopack-output.mjs";

/** The quiz routes whose eager chunks must not hold the calculator (AR-32, AR-33). */
export const EAGER_ROUTES = Object.freeze([
  "/learn/[subject]/[nodeId]/page",
  "/learn/practice/[skillId]/page",
  "/learn/daily/page",
  "/learn/earlier/[subject]/page",
  "/learn/diagnostic/page",
]);

/** Gzip budgets in bytes (AR-33). */
export const BUDGETS = Object.freeze({
  eagerGzipBytes: 10240, // the calculator's eager JS plus its CSS (AR-33)
  lazyGzipBytes: 409600, // lazy chunk group, excluding worker files and fonts
  workerGzipBytes: 256000, // bootstrap plus the chunks it loads (OI-29)
});

/**
 * @typedef {{
 *   method: "warm-module-graph";
 *   firstOpenMs: number;
 *   firstOpenThrottledMs: number;
 *   reopenMs: number;
 * }} BundlePerf
 * @typedef {{
 *   next: string;
 *   eagerGzipBytes: number;
 *   lazyGzipBytes: number;
 *   workerGzipBytes: number;
 *   perf: BundlePerf | null;
 * }} BundleBaseline
 * @typedef {{
 *   measured: Omit<BundleBaseline, "perf">;
 *   worker: { bootstrap: string; chunks: string[] } | null;
 *   problems: string[];
 * }} BundleReport
 */

// KARMAN_CALCULATOR_SENTINEL (src/components/calculator/KarmanCalculator.ts) and
// WORKER_MARKER (src/lib/calculator/worker/protocol.ts), copied because this plain Node
// script cannot import TypeScript; change them together.
const SENTINEL = "karman-calculator:lazy-chunk";
const MQ_ROOT = "mq-root-block";
const WORKER_MARKER = "karman-compute";
const BASELINE_FILE = "docs/calculator-bundle-baseline.json";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SERVER_DIR = ".open-next/server-functions";
const ASSETS_DIR = ".open-next/assets/_next";
const FONT_FILE = /\.(woff2?|ttf|otf|eot)$/;

/**
 * @param {string} route
 * @returns {string}
 */
function manifestPath(route) {
  return `${SERVER_DIR}/default/.next/server/app${route}_client-reference-manifest.js`;
}

/**
 * Reads files under `<root>/.open-next/assets/_next/` once each; null when a file is missing.
 * @param {string} root
 */
function assetReader(root) {
  /** @type {Map<string, Buffer | null>} */
  const cache = new Map();
  /** @param {string} file */
  const read = (file) => {
    if (!cache.has(file)) {
      const path = join(root, ASSETS_DIR, file);
      cache.set(file, existsSync(path) ? readFileSync(path) : null);
    }
    return cache.get(file) ?? null;
  };
  /** @param {string} file */
  const gzipBytes = (file) => {
    const bytes = read(file);
    return bytes ? gzipSync(bytes, { level: 9 }).length : 0;
  };
  return { read, gzipBytes };
}

/**
 * @param {string} dir
 * @returns {string[]} every file under dir, recursively
 */
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

/**
 * @param {string} root
 * @returns {string}
 */
function installedNext(root) {
  for (const dir of [root, REPO_ROOT]) {
    const path = join(dir, "node_modules/next/package.json");
    if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8")).version;
  }
  return "unknown";
}

/**
 * The eager files of every EAGER_ROUTES entry, read from the client reference manifests.
 * @param {string} root
 * @returns {Record<string, string[]>}
 */
function eagerFilesByRoute(root) {
  return Object.fromEntries(
    EAGER_ROUTES.map((route) => {
      const path = join(root, manifestPath(route));
      if (!existsSync(path)) throw new Error(`missing ${relative(root, path)}; run npm run cf:build`);
      return [route, eagerFiles(readFileSync(path, "utf8"), route)];
    })
  );
}

// The eager calculator modules (AR-2): the top-level modules of src/components/calculator/ other
// than KarmanCalculator.ts and the modules of src/lib/calculator-transfer/ other than clipboard.ts
// (AR-1: lazy UI only), with the CSS files beside them. Tests and fixtures never count.
const CALCULATOR_DIRS = ["src/components/calculator", "src/lib/calculator-transfer"];
const LAZY_FILES = new Set([
  "src/components/calculator/KarmanCalculator.ts",
  "src/lib/calculator-transfer/clipboard.ts",
]);
const CALCULATOR_TREES = [...CALCULATOR_DIRS, "src/lib/calculator", "src/app/calculator"];
const SOURCE = /\.(?:ts|tsx|mts|js|mjs|jsx)$/;
const TEST = /\.test\.[cm]?[jt]sx?$/;

/**
 * @param {string} path repo-relative POSIX path
 * @returns {boolean} whether it is an eager calculator module or a CSS file beside one
 */
export function isEagerCalculatorFile(path) {
  if (TEST.test(path) || LAZY_FILES.has(path)) return false;
  return CALCULATOR_DIRS.includes(posix.dirname(path)) && /\.(?:tsx?|css)$/.test(path);
}

/**
 * The repo-relative path an import specifier names, without an extension, or null for a package.
 * @param {string} importer repo-relative POSIX path
 * @param {string} specifier
 * @returns {string | null}
 */
function specifierPath(importer, specifier) {
  if (specifier.startsWith("@/")) return `src/${specifier.slice(2)}`;
  if (/^\.\.?(?:\/|$)/.test(specifier)) return posix.join(posix.dirname(importer), specifier);
  return null;
}

/**
 * The eager calculator module a specifier names, with its extension, or null.
 * @param {string} repoRoot
 * @param {string} importer
 * @param {string} specifier
 * @returns {string | null}
 */
function eagerCalculatorModule(repoRoot, importer, specifier) {
  const bare = specifierPath(importer, specifier);
  if (bare === null) return null;
  for (const path of [bare, `${bare}.ts`, `${bare}.tsx`, `${bare}/index.ts`, `${bare}/index.tsx`]) {
    if (/\.tsx?$/.test(path) && isEagerCalculatorFile(path) && existsSync(join(repoRoot, path))) {
      return path;
    }
  }
  return null;
}

/**
 * The names each eager calculator module is statically imported or re-exported by, from the
 * non-test source files under src/ outside the calculator's own folders and the /calculator page.
 * Type-only imports are skipped; "*" stands for a namespace import or `export *`.
 * @param {string} repoRoot
 * @param {{ path: string; source: string }[]} [files] defaults to the files under src/
 * @returns {Map<string, Set<string>>} module path to names, sorted by path
 */
export function eagerCalculatorImports(repoRoot, files) {
  const sources =
    files ??
    walk(join(repoRoot, "src"))
      .map((abs) => relative(repoRoot, abs).split(sep).join("/"))
      .filter((path) => SOURCE.test(path) && !TEST.test(path) && !path.includes("/__fixtures__/"))
      .map((path) => ({ path, source: readFileSync(join(repoRoot, path), "utf8") }));
  /** @type {Map<string, Set<string>>} */
  const imports = new Map();
  /** @param {string} module @param {string} name */
  const add = (module, name) => imports.set(module, (imports.get(module) ?? new Set()).add(name));
  for (const { path, source } of sources) {
    if (CALCULATOR_TREES.some((dir) => path.startsWith(`${dir}/`))) continue;
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, false);
    for (const node of file.statements) {
      const isImport = ts.isImportDeclaration(node);
      if (!isImport && !ts.isExportDeclaration(node)) continue;
      if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) continue;
      const module = eagerCalculatorModule(repoRoot, path, node.moduleSpecifier.text);
      if (module === null) continue;
      if (isImport) {
        const clause = node.importClause;
        if (!clause) {
          add(module, "*"); // a side-effect import runs the whole module
          continue;
        }
        if (clause.isTypeOnly) continue;
        if (clause.name) add(module, "default");
        const bindings = clause.namedBindings;
        if (bindings && ts.isNamespaceImport(bindings)) add(module, "*");
        if (bindings && ts.isNamedImports(bindings)) {
          for (const el of bindings.elements) {
            if (!el.isTypeOnly) add(module, (el.propertyName ?? el.name).text);
          }
        }
      } else {
        if (node.isTypeOnly) continue;
        const clause = node.exportClause;
        if (!clause || ts.isNamespaceExport(clause)) add(module, "*");
        else for (const el of clause.elements) if (!el.isTypeOnly) add(module, (el.propertyName ?? el.name).text);
      }
    }
  }
  return new Map([...imports].sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * The gzip size of the calculator's eager code (AR-33): the names the rest of src/ imports from
 * eager calculator modules, bundled and minified by esbuild with the eager calculator modules and
 * their CSS inside and everything else (packages, other app modules, every import()) left out.
 * @param {string} [repoRoot]
 * @returns {Promise<{ gzipBytes: number; inputs: string[] }>}
 */
export async function measureEagerCalculator(repoRoot = REPO_ROOT) {
  const imports = eagerCalculatorImports(repoRoot);
  let n = 0;
  const entry = [...imports]
    .map(([module, names]) =>
      [...names]
        .sort()
        .map((name) =>
          name === "*"
            ? `export * as e${n++} from "./${module}";`
            : `export { ${name} as e${n++} } from "./${module}";`
        )
        .join("\n")
    )
    .join("\n");
  const result = await build({
    absWorkingDir: repoRoot,
    stdin: { contents: entry, resolveDir: repoRoot, loader: "ts", sourcefile: "eager-calculator.ts" },
    bundle: true,
    write: false,
    metafile: true,
    minify: true,
    format: "esm",
    target: "es2022",
    jsx: "automatic",
    legalComments: "none",
    outdir: "eager-calculator",
    loader: { ".module.css": "local-css", ".css": "css" },
    logLevel: "silent",
    plugins: [
      {
        name: "eager-calculator-only",
        setup(b) {
          b.onResolve({ filter: /.*/ }, async (args) => {
            if (args.pluginData === "inner" || args.kind === "entry-point") return undefined;
            if (args.kind === "dynamic-import") return { path: args.path, external: true };
            const resolved = await b.resolve(args.path, {
              kind: args.kind,
              importer: args.importer,
              resolveDir: args.resolveDir,
              pluginData: "inner",
            });
            const path = resolved.path && relative(repoRoot, resolved.path).split(sep).join("/");
            if (resolved.errors.length === 0 && path && isEagerCalculatorFile(path)) {
              return { path: resolved.path };
            }
            return { path: args.path, external: true };
          });
        },
      },
    ],
  });
  let js = "";
  let css = "";
  for (const file of result.outputFiles) {
    if (file.path.endsWith(".css")) css += file.text;
    else js += file.text;
  }
  const gz = (/** @type {string} */ text) => (text ? gzipSync(text, { level: 9 }).length : 0);
  const inputs = Object.keys(result.metafile.inputs)
    .filter((input) => input !== "eager-calculator.ts")
    .sort();
  return { gzipBytes: gz(js) + gz(css), inputs };
}

/**
 * @param {string} root
 * @param {BundleBaseline} baseline
 * @param {{ growth: boolean }} rules
 * @param {number} eagerGzipBytes the calculator's eager size, from measureEagerCalculator
 * @returns {BundleReport}
 */
function runChecks(root, baseline, rules, eagerGzipBytes) {
  /** @type {string[]} */
  const problems = [];
  /** @type {BundleReport["measured"]} */
  const measured = {
    next: installedNext(root),
    eagerGzipBytes,
    lazyGzipBytes: 0,
    workerGzipBytes: 0,
  };
  try {
    assertPinnedNext(measured.next);
  } catch (error) {
    problems.push(error instanceof Error ? error.message : String(error));
    return { measured, worker: null, problems };
  }
  const assets = assetReader(root);
  /** @param {string} file @param {string} text */
  const has = (file, text) => assets.read(file)?.includes(text) ?? false;
  const eager = eagerFilesByRoute(root);

  // AR-32 positive control: the lazy group is the first import() group of an eager JS file
  // whose files contain the sentinel.
  /** @type {string[] | null} */
  let lazy = null;
  search: for (const route of EAGER_ROUTES) {
    for (const file of eager[route].filter((f) => f.endsWith(".js"))) {
      const source = assets.read(file);
      if (!source) continue;
      for (const group of parseAsyncChunkGroups(source.toString("utf8"))) {
        if (group.some((f) => has(f, SENTINEL))) {
          lazy = group;
          break search;
        }
      }
    }
  }
  if (!lazy || !lazy.some((f) => has(f, MQ_ROOT))) {
    problems.push(`AR-32 positive control: no lazy chunk group contains ${SENTINEL} and ${MQ_ROOT}`);
  }

  // AR-32: neither string in the server functions or in an eager file of a quiz route.
  for (const path of walk(join(root, SERVER_DIR))) {
    const bytes = readFileSync(path);
    for (const text of [SENTINEL, MQ_ROOT]) {
      if (bytes.includes(text)) {
        problems.push(`AR-32 ${text} found in ${relative(root, path).split(sep).join("/")}`);
      }
    }
  }
  for (const route of EAGER_ROUTES) {
    for (const file of eager[route]) {
      for (const text of [SENTINEL, MQ_ROOT]) {
        if (has(file, text)) problems.push(`AR-32 ${text} found in eager file ${file} of ${route}`);
      }
    }
  }

  // AR-66: the worker call in the lazy group, its files present, one chunk holding the marker.
  // Only the named chunks are read, so static/media copies of the worker source never count.
  /** @type {BundleReport["worker"]} */
  let worker = null;
  for (const file of lazy ?? []) {
    const source = assets.read(file);
    worker = source ? parseWorkerCall(source.toString("utf8")) : null;
    if (worker) break;
  }
  if (!worker) {
    problems.push("AR-66 worker call not found in the lazy chunk group");
  } else {
    for (const file of [worker.bootstrap, ...worker.chunks]) {
      if (!assets.read(file)) problems.push(`AR-66 worker file ${file} missing`);
    }
    if (!worker.chunks.some((f) => has(f, WORKER_MARKER))) {
      problems.push(`AR-66 no worker chunk contains ${WORKER_MARKER}`);
    }
  }

  // AR-33 measurements.
  const workerFiles = new Set(worker ? [worker.bootstrap, ...worker.chunks] : []);
  measured.lazyGzipBytes = (lazy ?? [])
    .filter((f) => !workerFiles.has(f) && !FONT_FILE.test(f))
    .reduce((n, f) => n + assets.gzipBytes(f), 0);
  measured.workerGzipBytes = [...workerFiles].reduce((n, f) => n + assets.gzipBytes(f), 0);

  // AR-33 budgets.
  if (measured.eagerGzipBytes > BUDGETS.eagerGzipBytes) {
    problems.push(
      `AR-33 eager calculator code: ${measured.eagerGzipBytes} gzip bytes, budget ${BUDGETS.eagerGzipBytes}`
    );
  }
  if (measured.lazyGzipBytes > BUDGETS.lazyGzipBytes) {
    problems.push(
      `AR-33 lazy chunk group: ${measured.lazyGzipBytes} gzip bytes, budget ${BUDGETS.lazyGzipBytes}`
    );
  }
  if (measured.workerGzipBytes > BUDGETS.workerGzipBytes) {
    problems.push(
      `AR-33 worker: ${measured.workerGzipBytes} gzip bytes, budget ${BUDGETS.workerGzipBytes}`
    );
  }

  // AR-33 growth over 10% of the committed value, with no small-value exemption.
  if (rules.growth) {
    /** @type {[string, number, number][]} */
    const fields = [
      ["eagerGzipBytes", measured.eagerGzipBytes, baseline.eagerGzipBytes],
      ["lazyGzipBytes", measured.lazyGzipBytes, baseline.lazyGzipBytes],
      ["workerGzipBytes", measured.workerGzipBytes, baseline.workerGzipBytes],
    ];
    for (const [field, value, committed] of fields) {
      if (value - committed > 0.1 * Math.abs(committed)) {
        problems.push(
          `AR-33 ${field} grew to ${value} from ${committed} (over 10%); update ${BASELINE_FILE} in this PR with --update-baseline`
        );
      }
    }
  }
  return { measured, worker, problems };
}

/**
 * Runs every rule, in order, against `<root>/.open-next/`. The eager size is measured from this
 * repository's source unless `eagerGzipBytes` is given.
 * @param {{ root: string; baseline: BundleBaseline; eagerGzipBytes?: number }} options
 * @returns {Promise<BundleReport>}
 */
export async function checkBundle({ root, baseline, eagerGzipBytes }) {
  const eager = eagerGzipBytes ?? (await measureEagerCalculator()).gzipBytes;
  return runChecks(root, baseline, { growth: true }, eager);
}

/**
 * The baseline file's text: Prettier with the repository config and the json parser.
 * @param {BundleBaseline} baseline
 * @returns {Promise<string>}
 */
export async function formatBaseline(baseline) {
  const config = (await prettier.resolveConfig(join(REPO_ROOT, BASELINE_FILE))) ?? {};
  return prettier.format(JSON.stringify(baseline, null, 2), { ...config, parser: "json" });
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>} the exit code
 */
async function main(argv) {
  const root = process.cwd();
  const file = join(root, BASELINE_FILE);
  /** @type {BundleBaseline} */
  const baseline = JSON.parse(readFileSync(file, "utf8"));
  const update = argv.includes("--update-baseline");
  const eager = await measureEagerCalculator();
  const report = runChecks(root, baseline, { growth: !update }, eager.gzipBytes);
  if (report.problems.length > 0) {
    for (const problem of report.problems) console.error(problem);
    return 1;
  }
  if (update) {
    const { eagerGzipBytes, lazyGzipBytes, workerGzipBytes } = report.measured;
    writeFileSync(
      file,
      await formatBaseline({
        next: baseline.next,
        eagerGzipBytes,
        lazyGzipBytes,
        workerGzipBytes,
        perf: baseline.perf,
      })
    );
    console.log(`Wrote ${BASELINE_FILE}.`);
  }
  console.log(`Calculator bundle check passed: ${JSON.stringify(report.measured)}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  );
}
