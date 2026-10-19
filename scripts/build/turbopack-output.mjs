// Turbopack output parsers for the calculator build checks (01-interfaces-integration.md
// section 16; AR-32, AR-33, AR-66). Each parser is written against the shapes Next 16.3.8 emits,
// recorded in scripts/build/__fixtures__/turbopack-16.3.8/ (see its README.md). Any other Next
// version fails assertPinnedNext, so a format change is re-captured instead of misread.
//
// Importing this module has no side effects.

import vm from "node:vm";

/** The Next version whose Turbopack output these parsers read. */
export const TURBOPACK_FORMAT_NEXT = "16.3.8";

/**
 * Throws unless the installed Next is the version the recorded fixtures came from.
 * @param {string} installedVersion
 * @returns {void}
 */
export function assertPinnedNext(installedVersion) {
  if (installedVersion !== TURBOPACK_FORMAT_NEXT) {
    throw new Error(
      `Turbopack output format is pinned to Next ${TURBOPACK_FORMAT_NEXT}; installed ${installedVersion}: re-capture scripts/build/__fixtures__/turbopack-${installedVersion}/ and update turbopack-output.mjs`
    );
  }
}

// A JSON-style list of double-quoted strings, as Turbopack prints chunk paths.
const STRING_LIST = String.raw`((?:"[^"\\]*"\s*,?\s*)*)`;

// async-import.txt: an import() compiles to a loader module
//   <id>,t=>{t.v(s=>Promise.all(["static/chunks/a.css","static/chunks/b.js"].map(s=>t.l(s))).then(()=>s(<id>)))}
const ASYNC_LOADER = new RegExp(
  String.raw`\.v\(\s*([\w$]+)\s*=>\s*Promise\.all\(\s*\[` +
    STRING_LIST +
    String.raw`\]\s*\.map\(\s*([\w$]+)\s*=>\s*[\w$]+\.l\(\s*\3\s*\)\s*\)\s*\)\s*\.then\(`,
  "g"
);

// worker-call.txt: new Worker(new URL("./compute.worker.ts", import.meta.url), options) compiles to
//   e.v(e.r(<helper>).default("static/chunks/turbopack-worker-<hash>.js",["static/chunks/c.js", …]))
const WORKER_CALL = new RegExp(
  String.raw`\.default\(\s*"(static\/chunks\/turbopack-worker-[\w-]+\.js)"\s*,\s*\[` +
    STRING_LIST +
    String.raw`\]\s*\)`
);

/**
 * @param {string} list the inside of a recorded string list
 * @returns {string[]}
 */
function stringsOf(list) {
  return [...list.matchAll(/"([^"\\]*)"/g)].map((match) => match[1]);
}

/**
 * The chunk paths each import() in a chunk's source loads, in source order.
 * @param {string} chunkSource
 * @returns {string[][]}
 */
export function parseAsyncChunkGroups(chunkSource) {
  return [...chunkSource.matchAll(ASYNC_LOADER)].map((match) => stringsOf(match[2]));
}

/**
 * The runtime worker call: the bootstrap file and the chunks it loads, or null when absent.
 * @param {string} chunkSource
 * @returns {{ bootstrap: string; chunks: string[] } | null}
 */
export function parseWorkerCall(chunkSource) {
  const match = WORKER_CALL.exec(chunkSource);
  if (!match) return null;
  return { bootstrap: match[1], chunks: stringsOf(match[2]) };
}

// The runtime's chunk base path (TURBOPACK_CHUNK_BASE_PATH unset) and asset suffix (none).
const CHUNK_BASE_PATH = "/_next/";
const ASSET_SUFFIX = "";
// The runtime's path encoder q(): a path with any other character is encoded per segment.
const NEEDS_ENCODING = /[^A-Za-z0-9\-_.!~*'()/]/;

/**
 * @param {string} path a path relative to the chunk base path
 * @returns {string}
 */
function chunkUrlPath(path) {
  const encoded = NEEDS_ENCODING.test(path)
    ? path.split("/").map(encodeURIComponent).join("/")
    : path;
  return `${CHUNK_BASE_PATH}${encoded}${ASSET_SUFFIX}`;
}

/**
 * The URL the Turbopack runtime constructs the worker on (worker-runtime-helper.txt): the
 * bootstrap URL with `#params=` and the URI-encoded JSON of [chunk URLs in reverse order, asset
 * suffix, chunk base path, NEXT_DEPLOYMENT_ID, NEXT_CLIENT_ASSET_SUFFIX] (the last two unset).
 * @param {string} origin
 * @param {{ bootstrap: string; chunks: string[] }} call
 * @returns {string}
 */
export function workerUrl(origin, call) {
  const params = [
    call.chunks.map(chunkUrlPath).reverse(),
    ASSET_SUFFIX,
    CHUNK_BASE_PATH,
    null,
    null,
  ];
  const url = new URL(chunkUrlPath(call.bootstrap), origin);
  url.hash = `#params=${encodeURIComponent(JSON.stringify(params))}`;
  return url.href;
}

/**
 * @typedef {{ chunks: string[]; async?: boolean }} ClientModule
 * @typedef {{
 *   clientModules: Record<string, ClientModule>;
 *   entryCSSFiles: Record<string, { path: string }[]>;
 *   entryJSFiles: Record<string, string[]>;
 * }} RouteManifest
 */

/**
 * The entry JS and CSS of a route and its layouts, read from its client reference manifest
 * (page_client-reference-manifest.js): sorted, de-duplicated and relative to `_next/`.
 * @param {string} manifestSource
 * @param {string} route e.g. "/diagnostic/page"
 * @returns {string[]}
 */
export function eagerFiles(manifestSource, route) {
  /** @type {{ __RSC_MANIFEST?: Record<string, RouteManifest> }} */
  const sandbox = {};
  vm.runInNewContext(manifestSource, { globalThis: sandbox });
  const manifest = sandbox.__RSC_MANIFEST?.[route];
  if (!manifest) throw new Error(`no client reference manifest entry for ${route}`);
  /** @type {Set<string>} */
  const files = new Set();
  for (const list of Object.values(manifest.entryJSFiles ?? {})) for (const file of list) files.add(file);
  for (const list of Object.values(manifest.entryCSSFiles ?? {}))
    for (const file of list) files.add(file.path);
  for (const entry of Object.values(manifest.clientModules ?? {}))
    if (entry.async !== true) for (const file of entry.chunks) files.add(file);
  return [...new Set([...files].map((file) => file.replace(/^\/_next\//, "")))].sort();
}
