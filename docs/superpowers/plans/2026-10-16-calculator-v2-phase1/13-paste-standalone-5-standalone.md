# 13 paste-standalone, part 5 of 5: standalone build, fixture serving, standalone page and the package gate (Tasks 12 to 15)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 5 of package `13-paste-standalone.md`, which holds the package header, the Consumes list,
the package-internal names, the DOM contract, the Decisions and the Notes for the lead; they apply
to every task here. Tasks run in number order across the five parts; each part starts where the
previous one ends.

---

### Task 12: Standalone build and page module (AR-62, API-15)

**Files:**

- Modify: `package.json` (esbuild devDependency; `calculator:build`), `package-lock.json`
- Modify (extension edits): `scripts/build/calculator-v2.mjs`, `eslint.config.mjs` and `.prettierignore` (ignore `tmp/calculator-v2-standalone/`), `public/calculator-notices.txt` (only for packages the test lists)
- Create: `src/components/calculator-v2/standalone/main.tsx`, `src/components/calculator-v2/standalone/standalone.css`, `src/lib/calculator-v2/worker/create.standalone.ts`, `src/components/calculator-v2/standalone/standalone-build.test.ts`, `src/components/calculator-v2/standalone/main.test.ts`

**Interfaces:**

- Consumes:
  - 10 (`src/components/calculator-v2/KarmanCalculator.ts`): `class KarmanCalculator { static readonly version: string; static readonly apiVersion: 1; constructor(element: HTMLElement, options?: CalculatorOptions, hooks?: HostHooks); reflow(): void; destroy(): void; readonly engine: CalculatorEngine }`, `HostHooks { chromeSlot?: HTMLElement; announceResetOnMount?: boolean }`; `CALCULATOR_V2_BUILD: string` (`src/components/calculator-v2/styles/generated.ts`); `generateCalculatorStyles(options: { write: boolean }): Promise<{ text: string; changed: boolean }>` (`scripts/build/calculator-v2.mjs`).
  - Site code (`src/lib/themes/palettes.ts`, unchanged): `SITE_THEMES: readonly SiteTheme[]` (`SiteTheme` has `id: string`, `name: string`, `dark: boolean` among its fields), `findTheme(id: unknown): SiteTheme | undefined`, `applyTheme(theme: SiteTheme): void` (sets `<html data-theme>` and the `dark` class), `themeStyleSheet(): string`.
  - 07: `WORKER_MARKER = "karman-compute-v1"` (`src/lib/calculator-v2/worker/protocol.ts`); `installDomStubs(): () => void` (`src/components/calculator-v2/__fixtures__/dom-stubs.ts`).
  - 03: `SKIN_IDS` (`src/lib/calculator-v2/theme/skins.ts`, the 12 ids, equal as a set to the `SITE_THEMES` ids).
- Produces: section 15 `window.KarmanCalculator` / `window.karmanCalculator` declarations in `standalone/main.tsx`; `createComputeWorker(): Worker` in `create.standalone.ts`; section 16's default CLI mode; `STANDALONE_OUT_DIR`, `StandaloneBuild`, `buildStandalone`, `bundledPackages`, `calculatorPackages`.

- [ ] **Step 1: Pin esbuild** — `npm install --save-dev --save-exact esbuild@0.25.4 --no-audit --no-fund`. Check `git diff package-lock.json`: only the root package's `devDependencies` gains `"esbuild": "0.25.4"` and `node_modules/esbuild` may lose nothing but flags. If any `node_modules/**/esbuild` version or path moves, revert and report to the lead (decision 11). In `package.json` set `"calculator:build": "node karman-calculator/build.mjs && node scripts/build/calculator-v2.mjs"` (`prebuild` and `predev:calculator` already run `npm run calculator:build`).
- [ ] **Step 2: Write the failing tests** (`standalone-build.test.ts`, node environment; then
      `main.test.ts`, jsdom)

```ts
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { WORKER_MARKER } from "@/lib/calculator-v2/worker/protocol";
import {
  STANDALONE_OUT_DIR,
  buildStandalone,
  bundledPackages,
  calculatorPackages,
} from "../../../../scripts/build/calculator-v2.mjs";

let out = "";
let build: Awaited<ReturnType<typeof buildStandalone>>;
beforeAll(async () => {
  out = mkdtempSync(join(tmpdir(), "kc-standalone-"));
  build = await buildStandalone({ outDir: out });
}, 120_000);
afterAll(() => rmSync(out, { recursive: true, force: true }));
const read = (f: string) => readFileSync(join(out, f), "utf8");
const hash16 = (f: string) =>
  createHash("sha256")
    .update(readFileSync(join(out, f)))
    .digest("hex")
    .slice(0, 16);
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : [relative(out, join(dir, d.name))]
  );
const RULE = /^={60}$/;
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function noticeBlock(text: string, header: RegExp): string | null {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => header.test(l));
  if (start < 0) return null;
  let end = start + 2;
  while (end < lines.length && !(lines[end + 1] !== undefined && RULE.test(lines[end + 1]))) end++;
  return lines.slice(start, end).join("\n");
}
function missingNotices(text: string, packages: string[]): string[] {
  return packages.filter((name) => {
    if (name === "mathquill")
      return !noticeBlock(text, /^mathquill \S+ \(MPL-2\.0\)$/)?.includes(
        "https://github.com/mathquill/mathquill"
      );
    const dir = `node_modules/${name}`;
    const version = JSON.parse(readFileSync(`${dir}/package.json`, "utf8")).version;
    const block = noticeBlock(text, new RegExp(`^${escapeRe(name)} ${escapeRe(version)} \\(`));
    const licence = ["LICENSE", "LICENSE.md", "LICENSE.txt", "license", "LICENCE"]
      .map((f) => `${dir}/${f}`)
      .find(existsSync);
    return (
      !block ||
      (licence !== undefined && !norm(block).includes(norm(readFileSync(licence, "utf8"))))
    );
  });
}

it("AR-62 the build writes index.html, calculator.js, calculator.css, worker.js, KaTeX woff2 fonts and metafile.json", () => {
  expect(STANDALONE_OUT_DIR).toBe("tmp/calculator-v2-standalone");
  const files = walk(out).sort();
  expect(files.filter((f) => !f.startsWith("fonts/"))).toEqual([
    "calculator.css",
    "calculator.js",
    "index.html",
    "metafile.json",
    "worker.js",
  ]);
  const fonts = files.filter((f) => f.startsWith("fonts/"));
  expect(fonts.length).toBeGreaterThan(0);
  expect(fonts.filter((f) => !/^fonts\/KaTeX_[\w-]+-[A-Z0-9]{8}\.woff2$/.test(f))).toEqual([]);
  expect(build.files).toEqual(files);
});
it("AR-62 index.html loads calculator.js as a classic script with content-hash query strings and links the notices", () => {
  const html = read("index.html");
  expect(html).toContain(
    `<script src="calculator.js?v=${hash16("calculator.js")}" defer></script>`
  );
  expect(html).toContain(
    `<link rel="stylesheet" href="calculator.css?v=${hash16("calculator.css")}">`
  );
  expect(html).not.toMatch(/type="module"|https?:\/\//);
  expect(html).toContain('<a href="/calculator-notices.txt">Open-source notices</a>');
  expect(html).toContain('<link rel="icon" href="data:,">'); // no automatic /favicon.ico request
  expect(build.hashes).toEqual({
    js: hash16("calculator.js"),
    css: hash16("calculator.css"),
    worker: hash16("worker.js"),
  });
});
it("AR-62 calculator.js is an iife that starts ./worker.js by its hash; worker.js holds the compute code; only woff2 fonts", () => {
  const js = read("calculator.js");
  expect(js).not.toMatch(/\bimport\.meta\b|^\s*(?:import|export)\s/m);
  expect(js).toContain(`./worker.js?v=${hash16("worker.js")}`);
  expect(js).not.toContain("compute.worker");
  expect(read("worker.js")).toContain(WORKER_MARKER);
  expect(read("calculator.css")).not.toMatch(/\.(?:woff|ttf)\)/);
});
it("AR-62 the metafile swaps create.standalone.ts in for create.ts and bundles no Sentry code", () => {
  const meta = JSON.parse(read("metafile.json"));
  const inputs = Object.keys(meta.inputs);
  expect(inputs).toContain("src/lib/calculator-v2/worker/create.standalone.ts");
  expect(inputs).not.toContain("src/lib/calculator-v2/worker/create.ts");
  expect(inputs.filter((i) => i.includes("@sentry/"))).toEqual([]);
});
it("AR-62 bundledPackages names scoped, nested and vendored packages once each", () => {
  const inputs = {
    "node_modules/react/index.js": {},
    "node_modules/react/cjs/react.production.js": {},
    "node_modules/@scope/pkg/a.js": {},
    "node_modules/x/node_modules/y/b.js": {},
    "vendor/mathquill/mathquill.js": {},
    "src/a.ts": {},
  };
  expect(bundledPackages({ inputs })).toEqual(["@scope/pkg", "mathquill", "react", "y"]);
});
it("AR-62 calculator-notices.txt has an entry for every third-party package in the standalone bundle and the lazy chunk", async () => {
  const packages = await calculatorPackages();
  expect(packages).toEqual(
    expect.arrayContaining([
      "katex",
      "lucide-react",
      "mathquill",
      "react",
      "react-dom",
      "scheduler",
    ])
  );
  expect(missingNotices(readFileSync("public/calculator-notices.txt", "utf8"), packages)).toEqual(
    []
  );
  expect(missingNotices("", ["react"])).toEqual(["react"]);
}, 120_000);
it("AR-62 calculator:build runs the v1 then the v2 build, and esbuild is pinned to the installed version", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  expect(pkg.scripts["calculator:build"]).toBe(
    "node karman-calculator/build.mjs && node scripts/build/calculator-v2.mjs"
  );
  expect([pkg.scripts.prebuild, pkg.scripts["predev:calculator"]]).toEqual([
    "npm run calculator:build",
    "npm run calculator:build",
  ]);
  expect(pkg.devDependencies.esbuild).toMatch(/^\d+\.\d+\.\d+$/);
  expect(JSON.parse(readFileSync("node_modules/esbuild/package.json", "utf8")).version).toBe(
    pkg.devDependencies.esbuild
  );
});
```

`main.test.ts` drives `standalone/main.tsx` before it exists (API-15 and AR-62's page clauses;
task 14 repeats them in real browsers). Its first line is the jsdom directive:

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SKIN_IDS } from "@/lib/calculator-v2/theme/skins";
import { themeStyleSheet } from "@/lib/themes/palettes";
import { installDomStubs } from "../__fixtures__/dom-stubs";
import { CALCULATOR_V2_BUILD } from "../styles/generated";

const DARK = "(prefers-color-scheme: dark)";
let restore = () => {};
// the index.html body of the DOM contract, a stubbed colour scheme and document.fonts
function page(dark: boolean) {
  document.body.innerHTML =
    '<header class="kc-page-header"><span class="kc-page-title">Karman calculator</span><div id="kc-title-slot" data-calculator-title-slot></div><label>Theme <select id="kc-theme"></select></label><a href="/calculator-notices.txt">Open-source notices</a></header><main id="kc-calculator" class="kc-page-calculator"></main>';
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: dark && query === DARK,
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList
  );
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { load: vi.fn(async () => []) },
  });
}
const select = () => document.getElementById("kc-theme") as HTMLSelectElement;
beforeEach(() => {
  restore = installDomStubs();
  vi.resetModules(); // every test evaluates main.tsx afresh
});
afterEach(() => {
  window.karmanCalculator?.destroy();
  delete window.karmanCalculator;
  delete window.KarmanCalculator;
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "fonts");
  restore();
  document.head.replaceChildren();
  document.body.replaceChildren();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.classList.remove("dark");
});

it("API-15 the standalone entry sets window.KarmanCalculator and window.karmanCalculator and mounts with the title slot", async () => {
  page(true);
  await import("./main");
  const Ctor = window.KarmanCalculator!;
  expect([
    typeof Ctor,
    Ctor.apiVersion,
    Ctor.version,
    window.karmanCalculator instanceof Ctor,
  ]).toEqual(["function", 1, CALCULATOR_V2_BUILD, true]);
  expect(document.getElementById("kc-calculator")!.shadowRoot).not.toBeNull();
  await vi.waitFor(() =>
    expect(
      [...document.querySelectorAll("#kc-title-slot > button")].map((b) =>
        b.getAttribute("data-kc-title-button")
      )
    ).toEqual(["paste", "shortcuts"])
  );
});
it.each([
  [true, "observatory"],
  [false, "ivory"],
] as const)("AR-62 with a dark colour scheme %s the page starts on %s", async (dark, id) => {
  page(dark);
  await import("./main");
  expect([select().value, document.documentElement.dataset.theme]).toEqual([id, id]);
});
it("AR-62 the page installs the 12-skin token sheet once, offers every skin and applies the chosen one", async () => {
  page(false);
  await import("./main");
  const sheets = document.head.querySelectorAll("style[data-karman-themes]");
  expect([sheets.length, sheets[0].textContent]).toEqual([1, themeStyleSheet()]);
  expect([...select().options].map((o) => o.value).sort()).toEqual([...SKIN_IDS].sort());
  select().value = "paper";
  select().dispatchEvent(new Event("change"));
  expect(document.documentElement.dataset.theme).toBe("paper");
});
```

- [ ] **Step 3: Run them and see them fail** — `npx vitest run src/components/calculator-v2/standalone/standalone-build.test.ts src/components/calculator-v2/standalone/main.test.ts`; Expected: FAIL. `standalone-build.test.ts`: 10's `scripts/build/calculator-v2.mjs` exists and Vitest transforms it, so the missing named exports import as `undefined` (no SyntaxError); `beforeAll` throws `TypeError: buildStandalone is not a function`, the file fails on that hook error and none of its 7 tests passes. `main.test.ts`: all four tests fail because `import("./main")` rejects with `Failed to load url ./main` (`standalone/main.tsx` does not exist yet).
- [ ] **Step 4: Implement**
  - `src/lib/calculator-v2/worker/create.standalone.ts` (section 15's comment): `declare const __KARMAN_WORKER_HASH__: string;` and `export function createComputeWorker(): Worker { return new Worker("./worker.js?v=" + __KARMAN_WORKER_HASH__, { name: "karman-calculator" }); }` (a classic worker; from `file://` the constructor throws or the worker fails before `ready`, and 07's backend falls back to the main thread, AR-50). Task 14's "AR-43 the standalone page constructs its own worker.js named karman-calculator" and "AR-62, AR-50 the standalone page opened from file:// graphs, …" check this file in the browser.
  - `src/components/calculator-v2/standalone/main.tsx` (no JSX; side effects only, it is the iife entry; `main.test.ts` asserts steps 2 to 4):
    1. Import `katex/dist/katex.min.css`, `@/components/calculator/calculator-chrome.generated.css` and `./standalone.css`; declare the two `Window` members of section 15.
    2. Append `<style data-karman-themes>` holding `themeStyleSheet()` to `document.head`.
    3. Fill `#kc-theme` with one `new Option(theme.name, theme.id)` per `SITE_THEMES`. The initial id is `"observatory"` when `matchMedia("(prefers-color-scheme: dark)").matches`, else `"ivory"`; select it and `applyTheme(findTheme(id)!)`. On `change`, `applyTheme(findTheme(select.value)!)`.
    4. `const calculator = new KarmanCalculator(document.getElementById("kc-calculator")!, undefined, { chromeSlot: document.getElementById("kc-title-slot")! })`, then `window.KarmanCalculator = KarmanCalculator` and `window.karmanCalculator = calculator`.
    5. `void Promise.all([document.fonts.load("16px KaTeX_Main"), document.fonts.load("italic 16px KaTeX_Math")]).then(() => calculator.reflow(), () => {})` (AR-41's reflow).
    6. No `onError`, so the page reports nothing (AR-57).
  - `src/components/calculator-v2/standalone/standalone.css` (document level):
    - `html, body { margin: 0; height: 100% }`
    - `body { display: flex; flex-direction: column; min-height: 100dvh; background: var(--background); color: var(--foreground); font-family: Arial, sans-serif }`
    - `.kc-page-header { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px; background: var(--kcc-chrome); color: var(--kcc-text); border-bottom: 1px solid var(--kcc-boundary) }`
    - `.kc-page-title { font-weight: 700; margin-inline-end: auto }`
    - `[data-calculator-title-slot] { display: flex; gap: 4px }`
    - `[data-calculator-title-slot] > button { inline-size: 32px; block-size: 32px; display: grid; place-items: center; padding: 0; border: 1px solid var(--kcc-boundary); border-radius: 6px; background: transparent; color: var(--kcc-text) }`
    - `.kc-page-header a, .kc-page-header label { color: var(--kcc-text) }`
    - `:is([data-calculator-title-slot] > button, .kc-page-header select, .kc-page-header a):focus-visible { outline: 2px solid var(--kcc-focus); outline-offset: 2px }`
    - `.kc-page-calculator { flex: 1; min-height: 0; position: relative }`
  - `scripts/build/calculator-v2.mjs` (JSDoc-typed; 10's main-module guard stays the only CLI entry):
    - `buildStandalone({ outDir = STANDALONE_OUT_DIR } = {})`:
      1. Empty and recreate `outDir`.
      2. Worker: `esbuild.build({ ...common, entryPoints: ["src/lib/calculator-v2/worker/compute.worker.ts"], outfile: <outDir>/worker.js })`; `workerHash` is the first 16 hex characters of the written file's sha256.
      3. Main (`common` spread first, so its own `define` never replaces the one holding the hash): `esbuild.build({ ...common, entryPoints: { calculator: "src/components/calculator-v2/standalone/main.tsx" }, outdir, entryNames: "[name]", assetNames: "fonts/[name]-[hash]", loader: { ".woff2": "file" }, define: { ...common.define, __KARMAN_WORKER_HASH__: JSON.stringify(workerHash) }, plugins: [katexWoff2Only, standaloneWorker] })`.
      4. Write `index.html` (DOM contract; `<!doctype html>`, `lang="en"`, charset and viewport metas, `<title>Karman calculator</title>`, `<link rel="icon" href="data:,">`, the stylesheet link and the deferred classic script with `?v=` hashes).
      5. Write `metafile.json` (`{ inputs, outputs }` merged from both builds, `JSON.stringify(…, null, 2)`).
      6. Return the sorted file list and the three hashes.
    - `common` is `{ bundle: true, format: "iife", platform: "browser", target: "es2020", minify: true, jsx: "automatic", tsconfig: "tsconfig.json", metafile: true, logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' } }`.
    - `katexWoff2Only` is an `onLoad({ filter: /katex\.min\.css$/ })` plugin returning the file with `/,url\(fonts\/[^)]+\.(?:woff|ttf)\) format\("(?:woff|truetype)"\)/g` removed (`loader: "css"`, `resolveDir` the file's folder).
    - `standaloneWorker` is an `onResolve` plugin: a path `./create` resolved from `src/lib/calculator-v2/worker/`, or `@/lib/calculator-v2/worker/create`, resolves to `src/lib/calculator-v2/worker/create.standalone.ts`.
    - `bundledPackages(metafile)`: for each input containing `node_modules/`, the text after the last `node_modules/`, cut to one segment (two when it starts with `@`); any input under `vendor/mathquill/` gives `mathquill`; sorted, unique.
    - `calculatorPackages()`: the union of `bundledPackages` over three `write: false` builds whose `outdir` or `outfile` is under `join(tmpdir(), "kc-packages")` (nothing is written): the worker and main builds of `buildStandalone` with the same options (the main build's `define` takes `__KARMAN_WORKER_HASH__: '"0"'`), and the lazy quiz chunk `{ entryPoints: ["src/components/calculator-v2/host/quiz-host.ts", "src/lib/calculator-v2/worker/compute.worker.ts"], bundle: true, format: "esm", platform: "browser", write: false, outdir: join(tmpdir(), "kc-packages", "quiz"), metafile: true, external: ["@sentry/*"], loader: { ".woff2": "file", ".woff": "file", ".ttf": "file" }, jsx: "automatic", tsconfig: "tsconfig.json", logLevel: "silent" }` (`@sentry/*` is external because report-error is eager site code).
    - CLI without flags: `generateCalculatorStyles({ write: true })`, then `buildStandalone()`, printing `standalone written to tmp/calculator-v2-standalone (<n> files)`. `--styles` and `--styles --check` are unchanged.
  - `eslint.config.mjs`: add `"tmp/calculator-v2-standalone/**"` to the global `ignores`. `.prettierignore`: add `tmp/calculator-v2-standalone/` under "Build artifacts".
- [ ] **Step 5: Add missing notices.** Run Step 3's command. For each name the notices test lists, append an entry in 05's format (`<name> <version> (<licence>)`, a line of 60 `=`, the package's LICENSE text, a blank line) after 05's v2 block, using that package's `package.json` `version` and `license` and its LICENSE file. Never edit existing entries.
- [ ] **Step 6: Run them and see them pass** — Step 3's command; then `node scripts/build/calculator-v2.mjs` and `node scripts/build/calculator-v2.mjs --styles --check` (exit 0), and `npx vitest run src/components/calculator-v2/math-field/vendor.test.ts` (05's AR-5 notices stay green); Expected: PASS (7 build tests and 4 page tests).
- [ ] **Step 7: Commit** — `git add package.json package-lock.json scripts/build/calculator-v2.mjs eslint.config.mjs .prettierignore public/calculator-notices.txt src/components/calculator-v2/standalone src/lib/calculator-v2/worker/create.standalone.ts && git commit -m "Build the standalone v2 page with esbuild into tmp (AR-62, API-15)"`

### Task 13: Fixture serving and the Playwright server (AR-63)

**Files:**

- Modify: `playwright.calculator.config.ts`; `tests/calculator/fixture/server.mjs` (extension edit, index 5.2)
- Create: `tests/calculator/fixture/serve-standalone.mjs` (decision 15), `tests/unit/calculator-v2/standalone-config.test.ts`, `tests/calculator/v2/standalone.spec.ts`

**Interfaces:**

- Consumes: `STANDALONE_OUT_DIR = "tmp/calculator-v2-standalone"` and its output (task 12); 11's `tests/calculator/fixture/server.mjs` (a Vite server from `createViteServer` with `root: tests/calculator/fixture` and the default SPA `appType`, so unknown paths fall back to `index.html` with 200).
- Produces: `/karman-calculator-v2/` on the Vite fixture (section 16), `webServer.command: "npm run dev:calculator"`; `STANDALONE_CONTENT_TYPES` and `createStandaloneHandler(dir: string): (req: IncomingMessage & { originalUrl?: string }, res: ServerResponse) => void` (package-internal names).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/calculator-v2/standalone-config.test.ts
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import config from "../../../playwright.calculator.config";
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]
  );
it("AR-63 calculator Playwright runs start their server with npm run dev:calculator", () => {
  const server = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;
  expect([server?.command, server?.url]).toEqual([
    "npm run dev:calculator",
    "http://127.0.0.1:4318",
  ]);
  expect(JSON.parse(readFileSync("package.json", "utf8")).scripts["dev:calculator"]).toBe(
    "node tests/calculator/fixture/server.mjs"
  );
});
it("AR-63 the standalone output is ignored by git, ESLint and Prettier, and nothing under public/ holds v2 code", () => {
  expect(() =>
    execFileSync("git", ["check-ignore", "-q", "tmp/calculator-v2-standalone/index.html"])
  ).not.toThrow();
  expect(readFileSync("eslint.config.mjs", "utf8")).toContain('"tmp/calculator-v2-standalone/**"');
  expect(readFileSync(".prettierignore", "utf8").split("\n")).toContain(
    "tmp/calculator-v2-standalone/"
  );
  const markers = [
    "karman-calculator-v2:lazy-chunk",
    "karman-compute-v1",
    "mq-root-block",
    "kc-math-field",
  ];
  const texts = walk("public").filter((f) => /\.(?:js|mjs|css|html|json|txt)$/.test(f));
  expect(texts.filter((f) => markers.some((m) => readFileSync(f, "utf8").includes(m)))).toEqual([]);
});
it("AR-63 the fixture server mounts tmp/calculator-v2-standalone at /karman-calculator-v2", () => {
  const source = readFileSync("tests/calculator/fixture/server.mjs", "utf8");
  expect(source).toContain('"/karman-calculator-v2"');
  expect(source).toContain('"tmp/calculator-v2-standalone"');
});
it("AR-63 the standalone handler serves only mapped files inside its folder, redirects the bare path and refuses traversal", async () => {
  // dynamic import, so the three tests above fail on their own assertions while the module is missing
  const { createStandaloneHandler } = await import("../../calculator/fixture/serve-standalone.mjs");
  const base = mkdtempSync(join(tmpdir(), "kc-serve-"));
  const dir = join(base, "out");
  mkdirSync(dir);
  writeFileSync(join(base, "package.json"), "{}"); // what a traversal would reach
  writeFileSync(join(dir, "index.html"), "<!doctype html>");
  writeFileSync(join(dir, "notes.txt"), "not served"); // no mapped extension
  const serve = createStandaloneHandler(dir);
  // connect strips the mount path from req.url and keeps it in req.originalUrl
  function call(url: string, originalUrl = `/karman-calculator-v2${url}`) {
    const res = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: "",
      setHeader(name: string, value: string) {
        this.headers[name.toLowerCase()] = value;
      },
      end(body?: string | Buffer) {
        this.body = body === undefined ? "" : String(body);
      },
    };
    serve({ url, originalUrl } as never, res as never);
    return res;
  }
  try {
    const index = call("/");
    expect([
      index.statusCode,
      index.headers["content-type"],
      index.headers["cache-control"],
      index.body,
    ]).toEqual([200, "text/html; charset=utf-8", "no-store", "<!doctype html>"]);
    expect(call("/index.html?v=0123456789abcdef").statusCode).toBe(200);
    const bare = call("/", "/karman-calculator-v2");
    expect([bare.statusCode, bare.headers.location]).toEqual([301, "/karman-calculator-v2/"]);
    for (const url of [
      "/..%2fpackage.json", // %2f is not a separator to the URL parser; decoded it climbs out
      "/..%2f..%2fpackage.json",
      "/%2e%2e/package.json", // the URL parser folds this to /package.json, absent in dir
      "/notes.txt",
      "/missing.js",
      "/%E0%A4%A", // malformed escape: decodeURIComponent throws
    ])
      expect(call(url).statusCode, url).toBe(404);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
```

```ts
// tests/calculator/v2/standalone.spec.ts (top of file; task 14 appends)
import { expect, test } from "@playwright/test";
test("AR-63 the fixture serves the standalone build at /karman-calculator-v2/ and nothing else under that path", async ({
  request,
}) => {
  const page = await request.get("/karman-calculator-v2/");
  expect([page.status(), page.headers()["content-type"]]).toEqual([
    200,
    "text/html; charset=utf-8",
  ]);
  expect(await page.text()).toMatch(/calculator\.js\?v=[0-9a-f]{16}/);
  for (const file of ["calculator.js", "calculator.css", "worker.js"])
    expect((await request.get(`/karman-calculator-v2/${file}`)).status(), file).toBe(200);
  const bare = await request.get("/karman-calculator-v2", { maxRedirects: 0 });
  expect([bare.status(), bare.headers().location]).toEqual([301, "/karman-calculator-v2/"]);
  // Playwright builds request URLs with WHATWG `new URL`, which folds a %2e%2e segment into
  // "..", so that form would send GET /package.json and never reach the handler. "..%2f" is one
  // segment to the URL parser and reaches the handler, which decodes it to "../" (decision 15).
  for (const path of [
    "/karman-calculator-v2/missing.js",
    "/karman-calculator-v2/..%2fpackage.json",
    "/karman-calculator-v2/metafile.json.bak",
  ])
    expect((await request.get(path)).status(), path).toBe(404);
});
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run tests/unit/calculator-v2/standalone-config.test.ts` and `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/standalone.spec.ts -g "AR-63"`; Expected: FAIL. Unit: the config test reports `node tests/calculator/fixture/server.mjs` where `npm run dev:calculator` is expected, the mount test finds no `"/karman-calculator-v2"`, and the handler test fails to load `serve-standalone.mjs` (`Failed to load url`); the ignore test already passes (task 12). Browser: `/karman-calculator-v2/` gets Vite's SPA fallback page without `calculator.js?v=`, and no 301.
- [ ] **Step 3: Implement**
  - `playwright.calculator.config.ts`: `webServer: { command: "npm run dev:calculator", url: "http://127.0.0.1:4318", reuseExistingServer: !process.env.CI, timeout: 120_000 }`; nothing else changes.
  - `tests/calculator/fixture/serve-standalone.mjs` (JSDoc-typed, Node built-ins only): `STANDALONE_CONTENT_TYPES` maps `.html` to `text/html; charset=utf-8`, `.js` to `text/javascript; charset=utf-8`, `.css` to `text/css; charset=utf-8`, `.json` to `application/json; charset=utf-8` and `.woff2` to `font/woff2`. `createStandaloneHandler(dir)` returns `(req, res)` (two parameters, so no unused `next`) that:
    1. Answers 301 with `Location: /karman-calculator-v2/` when `req.originalUrl` without its query does not end in `/` and the pathname of `req.url` is `/`.
    2. Takes `new URL(req.url, "http://fixture").pathname` and decodes it with `decodeURIComponent`; a `URIError` answers 404. A trailing `/` maps to `index.html`.
    3. Resolves `path.join(dir, decoded)`. It answers 404 unless the result starts with `dir + path.sep`, is an existing file (`existsSync(file) && statSync(file).isFile()`) and has an extension in `STANDALONE_CONTENT_TYPES`.
    4. Otherwise sets `Content-Type` from the map and `Cache-Control: no-store`, and ends the response with `readFileSync(file)`.
    5. Every 404 or 301 sets `res.statusCode` (and `Location` for the 301) and ends the response with an empty body.
  - `server.mjs` (extension edit): `import { createStandaloneHandler } from "./serve-standalone.mjs";` and add `plugins: [{ name: "karman-calculator-v2-standalone", configureServer(server) { server.middlewares.use("/karman-calculator-v2", createStandaloneHandler(path.join(root, "tmp/calculator-v2-standalone"))); } }]` to the `createServer` options (registered before Vite's own middleware, so no SPA fallback).
- [ ] **Step 4: Run them and see them pass** — Step 2's commands (the browser run now starts the server through `npm run dev:calculator`, which builds v1 and v2 first); Expected: PASS (4 unit tests; 1 browser test).
- [ ] **Step 5: Commit** — `git add playwright.calculator.config.ts tests/calculator/fixture/server.mjs tests/calculator/fixture/serve-standalone.mjs tests/unit/calculator-v2/standalone-config.test.ts tests/calculator/v2/standalone.spec.ts && git commit -m "Serve the standalone v2 build on the calculator fixture and rebuild before every run (AR-63)"`

### Task 14: Standalone page in the browser (AR-62, API-15; AR-43, AR-50 and AR-57 contributions)

**Files:**

- Modify: `tests/calculator/v2/standalone.spec.ts`

**Interfaces:**

- Consumes: the standalone page (task 12) at `/karman-calculator-v2/` (task 13) and its section 15 globals `window.KarmanCalculator?: typeof KarmanCalculator` and `window.karmanCalculator?: KarmanCalculator`; `KarmanCalculator.version: string`, `KarmanCalculator.apiVersion: 1`, `setExpressions(list: ExpressionState[]): void` and the internal `engine.getSnapshot(): EngineSnapshot` with `geometry: ReadonlyMap<string, Geometry>` and `backendKind: "worker" | "main-thread"` (10, 07); `createComputeWorker(): Worker` from `create.standalone.ts` (task 12: `new Worker("./worker.js?v=" + __KARMAN_WORKER_HASH__, { name: "karman-calculator" })`) and 07's main-thread fallback (AR-50); Playwright's `page.waitForEvent("worker"): Promise<Worker>`, `Worker.url(): string` and `Worker.evaluate`; `SKIN_IDS` (03, `src/lib/calculator-v2/theme/skins.ts`); `CALCULATOR_V2_BUILD: string` (10, `src/components/calculator-v2/styles/generated.ts`); `themeStyleSheet()`'s `--background` custom property (the skin's canvas hex, `src/lib/themes/palettes.ts`); the quiz fixture `/?flow=practice&calc=v2` and `globalThis.__calculatorHarness` (11, 07).

- [ ] **Step 1: Write the tests** (append; imports go to the top and `type Page` joins the
      existing `@playwright/test` import)

```ts
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { SKIN_IDS } from "../../../src/lib/calculator-v2/theme/skins";
import { CALCULATOR_V2_BUILD } from "../../../src/components/calculator-v2/styles/generated";
const row = (page: Page) => page.getByRole("textbox", { name: "Expression 1", exact: true });
const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);
async function graphY(page: Page) {
  await row(page).click();
  await page.keyboard.type("y=x^2");
  await expect
    .poll(
      () => page.evaluate(() => window.karmanCalculator!.engine.getSnapshot().geometry.has("1")),
      { timeout: 10_000 }
    )
    .toBe(true);
}
async function graphYOnQuiz(page: Page) {
  await row(page).click();
  await page.keyboard.type("y=x^2");
  await expect
    .poll(
      () =>
        page.evaluate(() => globalThis.__calculatorHarness!.engine.getSnapshot().geometry.has("1")),
      { timeout: 10_000 }
    )
    .toBe(true);
}
test("AR-62 the standalone page runs a classic script, follows the colour scheme, offers the 12 skins from the token sheet, links the notices and stays on its own files", async ({
  page,
  baseURL,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  const background = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--background").trim()
    );
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/karman-calculator-v2/");
  await expect(row(page)).toBeVisible();
  expect(await theme(page)).toBe("observatory");
  // the 12-skin token sheet from themeStyleSheet() is installed and resolves per skin
  await expect(page.locator("style[data-karman-themes]")).toHaveCount(1);
  const observatoryBackground = await background();
  expect(
    await page.evaluate(() =>
      [...document.scripts].map((s) => [s.type, s.src.replace(/\?v=\w+$/, "")])
    )
  ).toEqual([["", `${baseURL}/karman-calculator-v2/calculator.js`]]);
  const select = page.getByRole("combobox", { name: "Theme" });
  expect(
    (
      await select
        .locator("option")
        .evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value))
    ).sort()
  ).toEqual([...SKIN_IDS].sort());
  await select.selectOption("paper");
  expect(await theme(page)).toBe("paper");
  const paperBackground = await background();
  expect([observatoryBackground, paperBackground].map((v) => /^#[0-9a-f]{6}$/i.test(v))).toEqual([
    true,
    true,
  ]);
  expect(paperBackground).not.toBe(observatoryBackground);
  await expect(page.getByRole("link", { name: "Open-source notices" })).toHaveAttribute(
    "href",
    "/calculator-notices.txt"
  );
  expect((await page.request.get("/calculator-notices.txt")).status()).toBe(200);
  await graphY(page);
  expect(await page.evaluate(() => window.karmanCalculator!.engine.getSnapshot().backendKind)).toBe(
    "worker"
  );
  await expect.poll(() => page.evaluate(() => document.fonts.check("16px KaTeX_Main"))).toBe(true);
  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await expect(row(page)).toBeVisible();
  expect(await theme(page)).toBe("ivory");
  const http = requests.filter((u) => /^https?:/.test(u));
  expect(
    http.filter(
      (u) =>
        !new URL(u).pathname.startsWith("/karman-calculator-v2/") || new URL(u).origin !== baseURL
    )
  ).toEqual([]);
});
test("AR-43 the standalone page constructs its own worker.js named karman-calculator", async ({
  page,
}) => {
  // createEngine builds its backend on construction, so the worker starts while the page loads
  const [worker] = await Promise.all([
    page.waitForEvent("worker"),
    page.goto("/karman-calculator-v2/"),
  ]);
  expect(new URL(worker.url()).pathname).toBe("/karman-calculator-v2/worker.js");
  expect(await worker.evaluate(() => self.name)).toBe("karman-calculator");
  await graphY(page);
  expect(await page.evaluate(() => window.karmanCalculator!.engine.getSnapshot().backendKind)).toBe(
    "worker"
  );
});
test("AR-62, AR-50 the standalone page opened from file:// graphs, falling back to the main thread where the worker cannot start", async ({
  page,
  browserName,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(pathToFileURL(resolve("tmp/calculator-v2-standalone/index.html")).href);
  await expect(row(page)).toBeVisible();
  await graphY(page);
  const backend = await page.evaluate(
    () => window.karmanCalculator!.engine.getSnapshot().backendKind
  );
  if (browserName === "chromium") expect(backend).toBe("main-thread");
  else expect(["worker", "main-thread"]).toContain(backend);
  expect(errors).toEqual([]);
});
test("API-15 the standalone page exposes KarmanCalculator and its instance; the quiz build adds no window globals", async ({
  page,
}) => {
  await page.goto("/karman-calculator-v2/");
  await expect(row(page)).toBeVisible();
  expect(
    await page.evaluate(() => [
      typeof window.KarmanCalculator,
      window.KarmanCalculator!.apiVersion,
      window.KarmanCalculator!.version,
      window.karmanCalculator instanceof window.KarmanCalculator!,
      "MathQuill" in window,
    ])
  ).toEqual(["function", 1, CALCULATOR_V2_BUILD, true, false]);
  await page.goto("/?flow=practice&calc=v2");
  const before = await page.evaluate(() => Object.keys(window));
  const { width, height } = page.viewportSize()!;
  await page
    .getByRole("button", {
      name: width <= 767 || height <= 500 ? "Open Karman calculator" : "Toggle Karman calculator",
      exact: true,
    })
    .click();
  await graphYOnQuiz(page);
  // only the documented development hooks may appear: 07's harness and instance counters and
  // 11's fixture window store; any other new global fails
  const hooks = ["__calculatorHarness", "__karmanCalculatorCounters", "__calculatorWindowStore"];
  const added = await page.evaluate(
    ([keys, allowed]) =>
      Object.keys(window).filter((k) => !keys.includes(k) && !allowed.includes(k)),
    [before, hooks] as const
  );
  expect(added).toEqual([]);
  expect(
    await page.evaluate(() =>
      ["KarmanCalculator", "karmanCalculator", "MathQuill"].filter((k) => k in window)
    )
  ).toEqual([]);
});
test("AR-57 the standalone page reports nothing: no Sentry client and no request outside its own files", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    // network requests only: the page's data: icon (DOM contract) is not one
    if (url.protocol === "http:" || url.protocol === "https:") requests.push(url.pathname);
  });
  await page.goto("/karman-calculator-v2/");
  await graphY(page);
  await page.evaluate(() =>
    window.karmanCalculator!.setExpressions([{ id: "2", latex: "\\frac{" }])
  );
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => ["Sentry", "__SENTRY__"].filter((k) => k in window))).toEqual(
    []
  );
  expect(requests.filter((p) => !p.startsWith("/karman-calculator-v2/"))).toEqual([]);
});
```

- [ ] **Step 2: Run them** — `npm run test:calculator -- --project=calculator-chrome --project=calculator-firefox --project=calculator-safari --project=calculator-android --project=calculator-ios tests/calculator/v2/standalone.spec.ts`; Expected: PASS on first run (task 12's `main.test.ts` took `main.tsx` from red to green for API-15 and AR-62's page clauses; these tests repeat them in real engines, with the build of task 12 and the serving of task 13). A file:// failure outside Chromium that is a font or worker CORS console message is not an error here (only `pageerror` counts); any other failure is a fix in `standalone/` or `create.standalone.ts`.
- [ ] **Step 3: Commit** — `git add tests/calculator/v2/standalone.spec.ts && git commit -m "Check the standalone v2 page, its worker, its globals and its silence in five browsers (AR-62, API-15, AR-43, AR-50)"`

### Task 15: Package gate

**Files:** none (fixes found here go to the task that owns the failing file, one commit each).

- [ ] **Step 1: Common checks** (gate environment of `00-index.md` section 1, Node 22):

```sh
n exec 22 npx tsc --noEmit
n exec 22 npm run lint
n exec 22 npm run format:check
n exec 22 npm test
n exec 22 node scripts/check-file-sizes.mjs
n exec 22 node scripts/build/calculator-v2.mjs --styles --check
n exec 22 npm run cf:build
```

Expected: every command exits 0; `cf:build` runs `prebuild`, which now builds v1 and the v2 standalone page.

- [ ] **Step 2: Spec IDs** — `n exec 22 npx tsx scripts/calculator-v2/check-spec-ids.mjs --ids CB-1,AR-14,AR-62,AR-63,API-15,L-12,L-13,T-5,T-12,KB-1` and `--packages 02,03,04,05,06,07,08,09,10,11,12,13`; Expected: exit 0, nothing listed.
- [ ] **Step 3: Browser suites** — `n exec 22 npm run test:calculator` (all five projects, started through `npm run dev:calculator`; v1 specs unmodified for AR-8, every v2 spec including `paste.spec.ts` and `standalone.spec.ts`); Expected: PASS. Then `n exec 22 npx playwright test --config=playwright.calculator-v2-e2e.config.ts` (stop any other `next dev` first); Expected: PASS.
- [ ] **Step 4: Ownership check** — `git diff --stat $(git merge-base HEAD zakaria/calculator-v2)..HEAD`. The package worktree is cut from the `zakaria/calculator-v2` head at the start of wave 7 and never merges it back in before this gate, so the merge base is the wave-7 starting commit even if 14 has merged meanwhile. The diff lists only this package's files (13's Owns line in `00-index.md` section 2, which includes `tests/calculator/fixture/serve-standalone.mjs`), the extension edits of index 5.2 (`src/components/calculator-v2/ui/App.tsx`, `scripts/build/calculator-v2.mjs`, `eslint.config.mjs`, `.prettierignore`, `public/calculator-notices.txt`, `tests/calculator/fixture/server.mjs`) and the OI-26 spec line in `docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md`; Expected: nothing else.
