// Calculator bundle check (01-interfaces-integration.md section 16; AR-32, AR-33, AR-66).
// Reads the OpenNext output of `npm run cf:build` and checks, in order: the pinned Turbopack
// format, the lazy chunk group's positive control, that the calculator never reaches the server
// handler or an eager chunk of a quiz route, the emitted worker, the gzip budgets and growth
// against docs/calculator-bundle-baseline.json.
//
//   node scripts/build/check-calculator-bundle.mjs                      check .open-next/
//   node scripts/build/check-calculator-bundle.mjs --record-base <dir>  write the baseline's base
//   node scripts/build/check-calculator-bundle.mjs --update-baseline    write the measured values
//
// The CLI runs only when this file is the process entry; importing it has no side effects.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import prettier from "prettier";
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
  "/diagnostic/page",
]);

/** Gzip budgets in bytes (AR-33). */
export const BUDGETS = Object.freeze({
  eagerAddedGzipBytes: 10240, // per route, current minus base (AR-33)
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
 *   base: { commit: string; eagerGzipBytes: Record<string, number> };
 *   eagerAddedGzipBytes: Record<string, number>;
 *   lazyGzipBytes: number;
 *   workerGzipBytes: number;
 *   perf: BundlePerf | null;
 * }} BundleBaseline
 * @typedef {{
 *   measured: Omit<BundleBaseline, "base" | "perf">;
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
const BASE_COMMIT = "08c8c76";
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

/**
 * The gzip size of each route's eager JS and CSS.
 * @param {string} root
 * @returns {Record<string, number>}
 */
function eagerGzipBytes(root) {
  const assets = assetReader(root);
  const eager = eagerFilesByRoute(root);
  return Object.fromEntries(
    EAGER_ROUTES.map((route) => [route, eager[route].reduce((n, f) => n + assets.gzipBytes(f), 0)])
  );
}

/**
 * @param {string} root
 * @param {BundleBaseline} baseline
 * @param {{ growth: boolean }} rules
 * @returns {BundleReport}
 */
function runChecks(root, baseline, rules) {
  /** @type {string[]} */
  const problems = [];
  /** @type {BundleReport["measured"]} */
  const measured = {
    next: installedNext(root),
    eagerAddedGzipBytes: Object.fromEntries(EAGER_ROUTES.map((route) => [route, 0])),
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
  for (const route of EAGER_ROUTES) {
    const total = eager[route].reduce((n, f) => n + assets.gzipBytes(f), 0);
    measured.eagerAddedGzipBytes[route] = total - (baseline.base.eagerGzipBytes[route] ?? 0);
  }
  measured.lazyGzipBytes = (lazy ?? [])
    .filter((f) => !workerFiles.has(f) && !FONT_FILE.test(f))
    .reduce((n, f) => n + assets.gzipBytes(f), 0);
  measured.workerGzipBytes = [...workerFiles].reduce((n, f) => n + assets.gzipBytes(f), 0);

  // AR-33 budgets.
  for (const route of EAGER_ROUTES) {
    const added = measured.eagerAddedGzipBytes[route];
    if (added > BUDGETS.eagerAddedGzipBytes) {
      problems.push(
        `AR-33 ${route}: ${added} gzip bytes added eagerly, budget ${BUDGETS.eagerAddedGzipBytes}`
      );
    }
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
      ...EAGER_ROUTES.map((route) => /** @type {[string, number, number]} */ ([
        `eagerAddedGzipBytes[${route}]`,
        measured.eagerAddedGzipBytes[route],
        baseline.eagerAddedGzipBytes[route] ?? 0,
      ])),
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
 * Runs every rule, in order, against `<root>/.open-next/`.
 * @param {{ root: string; baseline: BundleBaseline }} options
 * @returns {Promise<BundleReport>}
 */
export async function checkBundle({ root, baseline }) {
  return runChecks(root, baseline, { growth: true });
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
  const at = argv.indexOf("--record-base");
  if (at >= 0) {
    const dir = argv[at + 1];
    if (!dir) throw new Error("--record-base needs the base build's directory");
    /** @type {BundleBaseline} */
    const baseline = {
      next: TURBOPACK_FORMAT_NEXT,
      base: { commit: BASE_COMMIT, eagerGzipBytes: eagerGzipBytes(resolve(dir)) },
      eagerAddedGzipBytes: Object.fromEntries(EAGER_ROUTES.map((route) => [route, 0])),
      lazyGzipBytes: 0,
      workerGzipBytes: 0,
      perf: null,
    };
    writeFileSync(file, await formatBaseline(baseline));
    console.log(`Wrote ${BASELINE_FILE}; run --update-baseline next.`);
    return 0;
  }
  /** @type {BundleBaseline} */
  const baseline = JSON.parse(readFileSync(file, "utf8"));
  const update = argv.includes("--update-baseline");
  const report = runChecks(root, baseline, { growth: !update });
  if (report.problems.length > 0) {
    for (const problem of report.problems) console.error(problem);
    return 1;
  }
  if (update) {
    const { eagerAddedGzipBytes, lazyGzipBytes, workerGzipBytes } = report.measured;
    writeFileSync(
      file,
      await formatBaseline({
        next: baseline.next,
        base: baseline.base,
        eagerAddedGzipBytes,
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
