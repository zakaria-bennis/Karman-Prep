# 11 seam: window modes, loader, hosts, reset, fonts, bundle and worker checks, release tooling

> Package 11 of `00-index.md` (key `seam`, increment 1A, wave 5; depends on 03-foundations and 10-shell, and through them on 02 to 09). For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans; steps use checkbox (`- [ ]`) syntax.

**Goal:** v2 opens from the quiz hosts behind `CALCULATOR_V2_ROLLOUT` in a light-DOM window (floating, docked, maximized, full screen) with a once-per-page loader, per-question reset and font warm-up, and the release ships exactly the output that passed the AR-32, AR-33 and AR-66 checks.

**Before starting:** read `00-index.md` sections 1, 4 and 5 and `01-interfaces-integration.md` sections 12, 13 and 16; this file quotes those contracts and never renames them. Run every command from the worktree root under Node 22 (`n exec 22 <command>`); builds export the gate environment of `00-index.md` section 1. Unit: `npx vitest run <file> -t "<ID>"`. Browser: `npm run test:calculator -- --project=calculator-chrome <spec> -g "<ID>"`. Every task ends in one commit. Untagged code blocks (except the names block below) are test sources written densely to keep this file under 700 lines: put each statement on its own line when writing them, add the imports the names imply, and let Prettier do the rest. The browser specs import their helpers from `tests/calculator/v2/quiz-helpers.ts` (task 7) and are split so each formatted file stays under 700 lines: `quiz-window.spec.ts` (tasks 7 to 9), `quiz-reset.spec.ts` (7, 12), `quiz-loading.spec.ts` (7, 11), `quiz-dock.spec.ts` (10) and `quiz-chrome-theme.spec.ts` (13).

**IDs by task** (each test title starts with its IDs): task 1 (Turbopack 16.3.8 fixtures): AR-32, AR-66; task 2 (Question key and window store): AR-58, AR-25, AR-26, AR-22, AR-23; task 3 (Font warm-up): AR-41; task 4 (Loader, resolves OI-28): AR-32, AR-31, AR-53, AR-41, AR-58, AR-61; task 5 (Window frame): A11Y-6, KB-6, AR-18, KB-10, AR-23, AR-28; L-12 contribution; task 6 (Scope seam): AR-9, AR-30, AR-41, AR-53, AR-13; contributions AR-7 (03's coordination note 1), A11Y-7, KB-4 (OI-7); task 7 (Hosts and quiz fixture): L-4, AR-8, AR-9, RC-21, NM-24, AR-59, AR-56; task 8 (Floating and full-screen opening): AR-20, L-5, AR-22, L-6, KB-10, AN-10; task 9 (Modal full screen and focus): AR-28, L-11, KB-12, L-6, AR-22, AR-27, L-10, KB-6, AR-18, AR-13; KB-4 contribution; task 10 (Docking and page-session geometry): AR-23, AR-24, AR-25, AR-27, AR-26, AN-10, L-10, L-6, A11Y-6; task 11 (Lazy loading and failure panels): AR-30, AR-31; task 12 (Per-question reset): AR-58, S-9, AR-61 (Review Focus 2); task 13 (Chrome contrast and theme): contributions TH-1, TH-14, TH-2, AR-37; task 14 (Bundle check and baseline): AR-32, AR-33, AR-66; task 15 (Preview worker, release, CI): AR-66 (resolves OI-29); task 16 (Turbopack smoke): AR-31; contributions AR-65, API-15.

**Package-internal names** (used only inside this package, beside section 13.2):

```
// src/components/calculator/calculator-window-store.ts
export interface ViewportSize { width: number; height: number }
export const FLOATING_ORIGIN = { x: 16, y: 64 } as const;
export const FLOATING_MIN_SIZE = { width: 360, height: 280 } as const;
export const WINDOW_KEY_STEP = 16; // AR-22, AR-23, KB-10
export const DOCK_MARGIN = 12; /* AR-23 */ export const DOCK_MIN_WIDTH = 400;
export function defaultFloatingRect(viewport: ViewportSize): WindowRect; // {16, 64, min(880, w - 32), min(600, h - 80)}
export function clampFloatingRect(rect: WindowRect, viewport: ViewportSize): WindowRect; // 360x280 <= size <= viewport, then 0 <= x <= w - width, 0 <= y <= h - height
export function defaultDockWidth(viewportWidth: number): number; // Math.round(min(720, max(400, 0.45 * w)))
export function clampDockWidth(width: number, viewportWidth: number): number; // within [400, max(400, min(900, w - 480))]
export function windowModeFor(state: WindowStoreState, fullScreen: boolean): WindowMode; // fullScreen ? "fullscreen" : mode if floating/docked/maximized, else restoreMode
// src/components/calculator/CalculatorLoader.tsx
export const LOADING_COPY = "Loading calculator…"; export const MOUNT_FAILED_COPY = "The calculator could not load.";
export const LOAD_FAILED_COPY = "The calculator could not load. Reload the page to try again.";
export const CalculatorHostIdContext: React.Context<string>; // provided by CalculatorScope (v2): the shadow host's id
export function guardHandle(handle: QuizCalculatorHandle, onThrow: (error: unknown) => void): QuizCalculatorHandle; // AR-53: wraps every function member present when called (12's applyTransfer included) and, through a Proxy, every function member of handle.calculator; a throw calls onThrow(error) and the call returns undefined
// src/components/calculator/font-warmup.ts
export function resetFontWarmupForTests(): void;
```

**DOM contract** (read by this package's specs, 13 and 15). The frame is one `div` in every mode, so a mode change never remounts the shadow host: `data-calculator-window`, `data-mode="<WindowMode>"`, `tabIndex={-1}`, `aria-label="Karman calculator"`, `data-entering` only while the open animation runs (task 8), and `role="dialog"` (floating, maximized), `role="dialog" aria-modal="true"` (full screen) or `role="complementary"` (docked). Title bar `[data-calculator-titlebar]`: the move handle (a `span` with the text "Karman calculator"; when floating it also has `role="button"`, `aria-roledescription="move handle"` and `tabIndex` 0, and in every other mode it is plain text with none of them), the chrome slot, then `[data-window-controls]` holding the AR- mode table's buttons "Undock calculator", "Maximize calculator", "Restore calculator size", "Minimize calculator" as the mode has them, then "Close calculator". Grip (floating only): `role="button"`, "Resize calculator", `aria-roledescription="resize handle"`, 24 × 24 px. Splitter (docked only): `role="separator"`, `aria-orientation="vertical"`, "Resize calculator dock", 24 px wide. Full screen adds `[data-focus-sentinel="start"]` and `[data-focus-sentinel="end"]` (`tabIndex` 0) at both ends of the frame. The loader's host is `<div id={hostId} data-calculator-host>`. The scope's workspace div gains `data-calculator-workspace`; the v2 trigger gains `data-calculator-trigger`. A host element marked `data-calculator-dock-shift` (the daily host's content column) takes the AR-23 docked shift in place of the workspaces inside it (task 10).

---

### Task 1: Turbopack 16.3.8 output fixtures and parsers

**Files:** Create `scripts/build/turbopack-output.mjs`; `scripts/build/__fixtures__/turbopack-16.3.8/` (`async-import.txt`, `worker-call.txt`, `worker-runtime-helper.txt`, `page_client-reference-manifest.js`, `expected.json`, `README.md`). Test: `tests/unit/calculator-v2/bundle-check.test.ts`.

**Interfaces:** Consumes: `KARMAN_CALCULATOR_SENTINEL` (10, section 12); `WORKER_MARKER` (07, section 7); `mountQuizCalculator` (10). Produces: section 16 exactly: `TURBOPACK_FORMAT_NEXT`, `assertPinnedNext(installedVersion: string): void`, `parseAsyncChunkGroups(chunkSource: string): string[][]`, `parseWorkerCall(chunkSource: string): { bootstrap: string; chunks: string[] } | null`, `workerUrl(origin: string, call: { bootstrap: string; chunks: string[] }): string`, `eagerFiles(manifestSource: string, route: string): string[]`.

- [ ] **Step 1: Capture the fixtures (temporary probe, never committed)**

```sh
mkdir -p src/app/turbopack-probe   # page.tsx renders <Probe />; Probe.tsx ("use client") has a button whose onClick runs
# typeof window === "undefined" ? null : import("@/components/calculator-v2/host/quiz-host")
n exec 22 npx next build
LAZY=$(grep -l "karman-calculator-v2:lazy-chunk" .next/static/chunks/*.js)
for f in $LAZY; do grep -l "$(basename "$f")" .next/static/chunks/*.js; done | sort -u   # probe chunk listing the lazy group
grep -l "turbopack-worker-" $LAZY; grep -l "#params=" .next/static/chunks/*.js            # worker call; runtime helper
```

Save the whole probe chunk as `async-import.txt`, 600 characters either side of the worker call as `worker-call.txt`, the function that builds the worker URL as `worker-runtime-helper.txt`, and `.next/server/app/turbopack-probe/page_client-reference-manifest.js` as `page_client-reference-manifest.js` (then `npx prettier --write` it). Write `expected.json` by reading those files: `{ "asyncChunkGroups": string[][], "workerCall": { "bootstrap", "chunks" }, "workerUrl": <URL for origin http://localhost:8787>, "eagerFiles": string[], "probeChunk": "static/chunks/<file>.js" }`, paths relative to `_next/` (`static/chunks/…`), where `probeChunk` is the original path of the chunk saved as `async-import.txt` (one of `eagerFiles`; task 14 writes the fixture back at that path). `README.md` records the Next version, these commands and the date. Then `rm -rf src/app/turbopack-probe .next`; `git status` shows only the fixture folder.

- [ ] **Step 2: Write the failing test**

```
import { readFileSync } from "node:fs"; import { TURBOPACK_FORMAT_NEXT, assertPinnedNext, eagerFiles, parseAsyncChunkGroups, parseWorkerCall, workerUrl } from "../../../scripts/build/turbopack-output.mjs"; const read = (name: string) => readFileSync(`scripts/build/__fixtures__/turbopack-16.3.8/${name}`, "utf8"); const expected = JSON.parse(read("expected.json"));
it("AR-66 the output format is pinned to Next 16.3.8 and another version fails loudly", () => { expect(TURBOPACK_FORMAT_NEXT).toBe("16.3.8"); expect(JSON.parse(readFileSync("node_modules/next/package.json", "utf8")).version).toBe("16.3.8"); expect(() => assertPinnedNext("16.3.8")).not.toThrow(); expect(() => assertPinnedNext("16.4.0")).toThrow("Turbopack output format is pinned to Next 16.3.8; installed 16.4.0: re-capture scripts/build/__fixtures__/turbopack-16.4.0/ and update turbopack-output.mjs"); });
it("AR-32 parseAsyncChunkGroups returns the recorded chunk list of the quiz-host import", () => { expect(parseAsyncChunkGroups(read("async-import.txt"))).toEqual(expected.asyncChunkGroups); expect(parseAsyncChunkGroups("console.log(1)")).toEqual([]); });
it("AR-66 parseWorkerCall returns the recorded bootstrap and chunks", () => { expect(parseWorkerCall(read("worker-call.txt"))).toEqual(expected.workerCall); expect(expected.workerCall.bootstrap).toMatch(/^static\/chunks\/turbopack-worker-[\w-]+\.js$/); expect(parseWorkerCall("new Worker(url)")).toBeNull(); });
it("AR-66 workerUrl appends the chunk list after #params= as the runtime helper encodes it", () => { expect(workerUrl("http://localhost:8787", expected.workerCall)).toBe(expected.workerUrl); expect(expected.workerUrl).toMatch(/^http:\/\/localhost:8787\/_next\/static\/chunks\/turbopack-worker-.+#params=/); });
it("AR-32 eagerFiles lists the route's entry JS and CSS and none of the lazy group", () => { const eager = eagerFiles(read("page_client-reference-manifest.js"), "/turbopack-probe/page"); expect(eager).toEqual(expected.eagerFiles); expect(eager).toContain(expected.probeChunk); for (const file of expected.asyncChunkGroups.flat()) expect(eager).not.toContain(file); });
```

- [ ] **Step 3: Run it and see it fail** — `npx vitest run tests/unit/calculator-v2/bundle-check.test.ts`; Expected: FAIL, `Failed to load url ../../../scripts/build/turbopack-output.mjs`.
- [ ] **Step 4: Implement `scripts/build/turbopack-output.mjs`** (JSDoc-typed). `eagerFiles` evaluates the manifest with `vm.runInNewContext(source, { globalThis: sandbox })`, reads `sandbox.__RSC_MANIFEST[route]` and returns the sorted, de-duplicated union of every `entryJSFiles` array, every `entryCSSFiles[*].path` and the `chunks` of every `clientModules` entry whose `async` is not `true`, each without a leading `/_next/`. `parseAsyncChunkGroups` and `parseWorkerCall` are regular expressions written against the recorded forms, each with a comment naming its fixture. `workerUrl` is `${origin}/_next/${bootstrap}#params=` plus the chunk list encoded as `worker-runtime-helper.txt` does.
- [ ] **Step 5: Run it and see it pass** — same command; Expected: PASS (5 tests).
- [ ] **Step 6: Commit** — `git add scripts/build tests/unit/calculator-v2 && git commit -m "Record Turbopack 16.3.8 output shapes for the calculator v2 build checks"`

### Task 2: Question key and page-session window store

**Files:** Create `src/components/calculator/question-key.ts`, `question-key.test.ts`, `calculator-window-store.ts`, `calculator-window-store.test.ts`.

**Interfaces:** Consumes: nothing beyond the section 13.2 types. Produces: section 13.2 `makeQuestionKey`, `questionIdFromKey` (a key without ":" is returned whole), `WindowMode`, `WindowRect`, `WindowStoreState`, `calculatorWindowStore`; the package-internal store names. `set` merges the patch into a new snapshot object and notifies; a patch whose `mode` is `"floating"` or `"docked"` and that has no `restoreMode` also sets `restoreMode` to it. No `window` or `document` at module scope (AR-2).

- [ ] **Step 1: Write the failing tests**

```
// question-key.test.ts
it("AR-58 a question key joins session and question ids and gives the question id back", () => { expect(makeQuestionKey("attempt-1", "q3")).toBe("attempt-1:q3"); expect(questionIdFromKey("attempt-1:q3")).toBe("q3"); expect(questionIdFromKey("2026-10-16:abc:def")).toBe("abc:def"); expect(questionIdFromKey("q7")).toBe("q7"); });
// calculator-window-store.test.ts
const get = () => calculatorWindowStore.get(); beforeEach(() => calculatorWindowStore.resetForTests());
it("AR-25 the page-session store starts empty, merges patches and notifies subscribers", () => { expect(get()).toEqual({ mode: null, restoreMode: "floating", floatingRect: null, dockWidth: null, displaySize: null, reverseContrast: null });
  const listener = vi.fn(); const off = calculatorWindowStore.subscribe(listener); calculatorWindowStore.set({ floatingRect: { x: 200, y: 150, width: 500, height: 400 } });
  expect(listener).toHaveBeenCalledTimes(1); expect(get().floatingRect).toEqual({ x: 200, y: 150, width: 500, height: 400 }); off(); calculatorWindowStore.set({ dockWidth: 500 }); expect(listener).toHaveBeenCalledTimes(1); });
it("AR-26 floating and docked set the restore mode; maximized and full screen keep it", () => { calculatorWindowStore.set({ mode: "docked" }); expect(get().restoreMode).toBe("docked"); calculatorWindowStore.set({ mode: "fullscreen" }); expect(get().restoreMode).toBe("docked"); expect(windowModeFor(get(), false)).toBe("docked"); expect(windowModeFor(get(), true)).toBe("fullscreen");
  calculatorWindowStore.set({ mode: "maximized" }); expect(windowModeFor(get(), false)).toBe("maximized"); calculatorWindowStore.set({ mode: "floating" }); expect(get().restoreMode).toBe("floating"); });
it("AR-22 floating geometry starts at 16, 64 with v1's size and is clamped to the viewport", () => { const view = { width: 1280, height: 800 }; expect(defaultFloatingRect(view)).toEqual({ x: 16, y: 64, width: 880, height: 600 }); expect(defaultFloatingRect({ width: 1024, height: 560 })).toEqual({ x: 16, y: 64, width: 880, height: 480 }); expect(clampFloatingRect({ x: 1000, y: -5, width: 880, height: 600 }, view)).toEqual({ x: 400, y: 0, width: 880, height: 600 });
  expect(clampFloatingRect({ x: 10, y: 10, width: 100, height: 100 }, view)).toEqual({ x: 10, y: 10, width: 360, height: 280 }); expect(clampFloatingRect({ x: 5, y: 5, width: 2000, height: 1500 }, view)).toEqual({ x: 0, y: 0, width: 1280, height: 800 }); });
it("AR-23 the dock defaults to clamp(400px, 45vw, 720px) and stays between 400 and min(900, 100vw - 480)", () => { expect([800, 1024, 1280, 1920].map(defaultDockWidth)).toEqual([400, 461, 576, 720]); expect([clampDockWidth(350, 1280), clampDockWidth(1000, 1280), clampDockWidth(1000, 1920), clampDockWidth(600, 1024)]).toEqual([400, 800, 900, 544]); });
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run src/components/calculator/question-key.test.ts src/components/calculator/calculator-window-store.test.ts`; Expected: FAIL, modules not found.
- [ ] **Step 3: Implement** both modules with the section 13.2 and package-internal signatures.
- [ ] **Step 4: Run them and see them pass** — same command; Expected: PASS (5 tests).
- [ ] **Step 5: Commit** — `git add src/components/calculator/question-key*.ts src/components/calculator/calculator-window-store*.ts && git commit -m "Add the question key and the page-session calculator window store"`

### Task 3: Font warm-up

**Files:** Create `src/components/calculator/font-warmup.ts`, `font-warmup.test.ts`.

**Interfaces:** Produces `warmCalculatorFonts(): Promise<void>`, `onCalculatorFontsLoaded(listener: () => void): () => void` (section 13.2) and `resetFontWarmupForTests(): void`.

- [ ] **Step 1: Write the failing test**

```
// @vitest-environment jsdom
const load = vi.fn(); let handlers: Record<string, () => void> = {};
beforeEach(() => { resetFontWarmupForTests(); load.mockReset().mockResolvedValue([]); handlers = {};
  Object.defineProperty(document, "fonts", { configurable: true, value: { load, addEventListener: (type: string, h: () => void) => (handlers[type] = h), removeEventListener: () => {} } }); });
it("AR-41 warmCalculatorFonts loads KaTeX_Main and italic KaTeX_Math once per page", async () => { await Promise.all([warmCalculatorFonts(), warmCalculatorFonts()]); expect(load.mock.calls).toEqual([["16px KaTeX_Main"], ["italic 16px KaTeX_Math"]]); });
it("AR-41 the warm-up never rejects, with a failing load or without document.fonts", async () => { load.mockRejectedValue(new Error("blocked")); await expect(warmCalculatorFonts()).resolves.toBeUndefined(); resetFontWarmupForTests(); Object.defineProperty(document, "fonts", { configurable: true, value: undefined }); await expect(warmCalculatorFonts()).resolves.toBeUndefined(); });
it("AR-41 listeners run when the warm-up resolves and on every loadingdone until removed", async () => { const listener = vi.fn(); const off = onCalculatorFontsLoaded(listener); await warmCalculatorFonts(); expect(listener).toHaveBeenCalledTimes(1); handlers.loadingdone(); expect(listener).toHaveBeenCalledTimes(2); off(); handlers.loadingdone?.(); expect(listener).toHaveBeenCalledTimes(2); });
```

- [ ] **Step 2: Run it and see it fail** — `npx vitest run src/components/calculator/font-warmup.test.ts`; Expected: FAIL, module not found.
- [ ] **Step 3: Implement**: `Promise.allSettled` over the two `document.fonts.load` calls, one cached promise per page (cleared by `resetFontWarmupForTests`); listeners run after it settles, before the returned promise resolves, and from one `loadingdone` listener kept while any subscriber exists; nothing touches `document` at module scope.
- [ ] **Step 4: Run it and see it pass** — same command; Expected: PASS (3 tests).
- [ ] **Step 5: Commit** — `git add src/components/calculator/font-warmup*.ts && git commit -m "Warm the KaTeX fonts for the v2 calculator without delaying render"`

### Task 4: CalculatorLoader with a once-per-page import (resolves OI-28)

**Files:** Create `src/components/calculator/CalculatorLoader.tsx`, `CalculatorLoader.test.tsx`, `CalculatorWindow.module.css` (`.host` and `.panel` only). Modify `src/components/calculator/CalculatorScope.tsx` (add only the exported section 13.2 types `CalculatorLoadStatus` and `CalculatorLoadFailure`, which the loader imports as types); `docs/superpowers/specs/calculator-v2/d-architecture-integration.md` (AR-31, AR-55); `docs/superpowers/specs/calculator-v2/c-transfer.md` (TR-69, table 11.1). Read: `docs/superpowers/specs/calculator-v2/open-items.md`.

**Interfaces:** Consumes: `mountQuizCalculator(options: QuizMountOptions): QuizCalculatorHandle` (10); task 3; `reportCalculatorError(error: unknown, build: string | null): void` (03). Produces: section 13.2 `QuizHostModule`, `loadCalculatorModule()`, `getCalculatorModule()`, `resetCalculatorModuleForTests()`, `CalculatorLoaderProps`, `CalculatorLoader` (an empty fragment while inactive, matching section 13.2's `JSX.Element`); `LOADING_COPY`, `MOUNT_FAILED_COPY`, `LOAD_FAILED_COPY`, `CalculatorHostIdContext`, `guardHandle`. `onHandle` receives `guardHandle(handle, fail)`, so a throw from any handle member (12's `applyTransfer` included) or any `handle.calculator` method is reported with `reportCalculatorError(error, null)`, destroys the instance and shows the mount-failure panel (AR-53 "API calls"). The step 2 AR-53 `applyTransfer` test is the case `14-transfer-ui.md` precondition 2 runs before 14 starts, so it stays in this file under an AR-53 title.

- [ ] **Step 0: Confirm the owner accepted OI-28.** The lead appends the OI-28 row to `open-items.md` with the owner's decision as a last cell after Proposed fix: `accepted YYYY-MM-DD`, `amended YYYY-MM-DD: <wording>` or `rejected YYYY-MM-DD`. Run `grep -nE '^\| OI-28 .*\| (accepted|amended) [0-9]{4}-[0-9]{2}-[0-9]{2}' docs/superpowers/specs/calculator-v2/open-items.md`; Expected: exactly one line. No line (no row, a rejection, or no decision cell): stop, do not start this task, and tell the lead (`00-index.md` section 6.2: a rejected OI-28 is re-planned).
- [ ] **Step 1: Apply OI-28 to the spec** with the fix text recorded in that row, which is `00-index.md` section 6.2's proposed fix quoted below (if the recorded decision amends the wording, apply the recorded wording instead). In `d-architecture-integration.md` AR-31 replace ``and on failure "The calculator could not load." with a Retry button that calls `import()` again; the test aborts the chunk request, then allows it on Retry`` with ``the module is imported once per page; when that import fails, the panel shows "The calculator could not load. Reload the page to try again." with a "Reload page" button that reloads the document; when the module loaded but mounting or a first API call throws, it shows "The calculator could not load." with a Retry button that mounts again from the loaded module; one test makes the mount throw once and passes on Retry, and one aborts the chunk request and checks the reload panel, on the Vite fixture and under `next dev` ``. In AR-55, after `"Calculator unavailable. Use Retry in the calculator panel."` insert a space and `(after a load failure the message is "Calculator unavailable. Reload the page to use it.")`. In `c-transfer.md` the table 11.1 "Calculator failed to load" message cell becomes `"Calculator unavailable. Use Retry in the calculator panel."; after a load failure the message is "Calculator unavailable. Reload the page to use it."`, and in TR-69 replace `and the held payload is applied exactly once after a successful Retry` with `after a mount failure the held payload is applied exactly once after a successful Retry, and after a load failure held payloads are discarded` (section 6.2 verbatim). Run `npx prettier --write` on both files.
- [ ] **Step 2: Write the failing tests** (`CalculatorLoader.test.tsx`)

```
// @vitest-environment jsdom
const fonts = vi.hoisted(() => ({ listener: null as null | (() => void), warm: vi.fn(async () => {}) })); vi.mock("./font-warmup", () => ({ warmCalculatorFonts: fonts.warm, onCalculatorFontsLoaded: (l: () => void) => ((fonts.listener = l), () => {}) }));
vi.mock("./report-error", () => ({ reportCalculatorError: vi.fn() })); beforeEach(() => { fonts.warm.mockReset().mockImplementation(async () => {}); fonts.listener = null; });
const fakeHandle = () => ({ calculator: { setBlank: vi.fn() }, focusOnOpen: vi.fn(), focusBoundary: vi.fn(), setReducedMotion: vi.fn(), reflow: vi.fn(), destroy: vi.fn() });
async function loaderWith(quizHost: () => unknown) { vi.resetModules(); vi.doMock("@/components/calculator-v2/host/quiz-host", quizHost); return import("./CalculatorLoader"); }
function mount(L: typeof import("./CalculatorLoader"), extra: Partial<CalculatorLoaderProps> = {}) { const base = { active: true, frame: document.createElement("div"), chromeSlot: document.createElement("div"), reducedMotion: false, announceReset: false, onStatus: vi.fn(), onHandle: vi.fn(), reloadPage: vi.fn(), ...extra };
  const tree = (p: Partial<CalculatorLoaderProps>) => <L.CalculatorHostIdContext.Provider value="kc-host"><L.CalculatorLoader {...base} {...p} /></L.CalculatorHostIdContext.Provider>;
  const view = render(tree({})); return { ...base, ...view, update: (p: Partial<CalculatorLoaderProps>) => view.rerender(tree(p)) }; }
it("AR-32 loadCalculatorModule keeps the exact client-only import body", () => { expect(readFileSync("src/components/calculator/CalculatorLoader.tsx", "utf8").replace(/\s+/g, " ")).toContain('typeof window === "undefined" ? Promise.reject(new Error("client only")) : import("@/components/calculator-v2/host/quiz-host")'); });
it("AR-31 the module is imported once per page and a failed import stays failed (OI-28)", async () => { const imported = vi.fn(); let L = await loaderWith(() => { imported(); return { mountQuizCalculator: vi.fn() }; }); expect(L.getCalculatorModule()).toBe(L.getCalculatorModule()); await L.getCalculatorModule(); expect(imported).toHaveBeenCalledTimes(1);
  L = await loaderWith(() => { throw new Error("chunk failed"); }); await expect(L.getCalculatorModule()).rejects.toThrow(); await expect(L.getCalculatorModule()).rejects.toThrow(); });
it("AR-31 a load failure shows the reload panel and Reload page reloads the document", async () => { const L = await loaderWith(() => { throw new Error("chunk failed"); }); const v = mount(L); expect(screen.getByText("Loading calculator…")).toBeInTheDocument();
  expect(await screen.findByText("The calculator could not load. Reload the page to try again.")).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reload page" })); expect(v.reloadPage).toHaveBeenCalledTimes(1); expect(v.onStatus).toHaveBeenLastCalledWith("failed", "load"); });
it("AR-31 a mount failure shows Retry, which mounts again from the loaded module", async () => { const imported = vi.fn(); const mountQuizCalculator = vi.fn().mockImplementationOnce(() => { throw new Error("mount"); }).mockReturnValue(fakeHandle());
  const L = await loaderWith(() => { imported(); return { mountQuizCalculator }; }); const v = mount(L);
  expect(await screen.findByText("The calculator could not load.", { exact: true })).toBeInTheDocument(); expect(v.onStatus).toHaveBeenLastCalledWith("failed", "mount");
  fireEvent.click(screen.getByRole("button", { name: "Retry" })); await vi.waitFor(() => expect(v.onStatus).toHaveBeenLastCalledWith("ready", null));
  expect(mountQuizCalculator).toHaveBeenCalledTimes(2); expect(imported).toHaveBeenCalledTimes(1); });
it.each(["focusOnOpen", "calculator.setBlank"])("AR-53 a throwing %s call becomes the Retry panel instead of reaching React", async (member) => { const boom = vi.fn(() => { throw new Error("api"); }); const base = fakeHandle();
  const handle = member === "focusOnOpen" ? { ...base, focusOnOpen: boom } : { ...base, calculator: { setBlank: boom } }; const v = mount(await loaderWith(() => ({ mountQuizCalculator: () => handle })));
  await vi.waitFor(() => expect(v.onHandle).toHaveBeenCalled()); const guarded = v.onHandle.mock.calls[0][0]; act(() => expect(() => (member === "focusOnOpen" ? guarded.focusOnOpen("mouse") : guarded.calculator.setBlank())).not.toThrow());
  expect(await screen.findByText("The calculator could not load.", { exact: true })).toBeInTheDocument(); expect(handle.destroy).toHaveBeenCalledTimes(1); expect((await import("./report-error")).reportCalculatorError).toHaveBeenCalled(); });
it("AR-53 guardHandle forwards a member such as applyTransfer and a throwing applyTransfer shows the Retry panel", async () => { const ok = { ...fakeHandle(), applyTransfer: vi.fn(() => "ok") }; let v = mount(await loaderWith(() => ({ mountQuizCalculator: () => ok }))); await vi.waitFor(() => expect(v.onHandle).toHaveBeenCalled());
  expect(v.onHandle.mock.calls[0][0].applyTransfer(1, "mouse")).toBe("ok"); expect(ok.applyTransfer).toHaveBeenCalledWith(1, "mouse"); v.unmount(); const bad = { ...fakeHandle(), applyTransfer: vi.fn(() => { throw new Error("transfer"); }) }; v = mount(await loaderWith(() => ({ mountQuizCalculator: () => bad })));
  await vi.waitFor(() => expect(v.onHandle).toHaveBeenCalled()); act(() => { expect(v.onHandle.mock.calls[0][0].applyTransfer(1, "mouse")).toBeUndefined(); }); expect(await screen.findByText("The calculator could not load.", { exact: true })).toBeInTheDocument();
  expect(bad.destroy).toHaveBeenCalledTimes(1); expect((await import("./report-error")).reportCalculatorError).toHaveBeenCalledWith(expect.objectContaining({ message: "transfer" }), null); });
it("AR-41 activation warms the fonts before mounting and a font load reflows the calculator", async () => { const handle = fakeHandle(); const mountQuizCalculator = vi.fn(() => handle); mount(await loaderWith(() => ({ mountQuizCalculator })));
  await vi.waitFor(() => expect(mountQuizCalculator).toHaveBeenCalled()); expect(fonts.warm.mock.invocationCallOrder[0]).toBeLessThan(mountQuizCalculator.mock.invocationCallOrder[0]);
  act(() => fonts.listener!()); expect(handle.reflow).toHaveBeenCalledTimes(1); });
it("AR-41 a font warm-up that never settles does not delay mounting", async () => { fonts.warm.mockReturnValue(new Promise<void>(() => {})); const mountQuizCalculator = vi.fn(() => fakeHandle()); mount(await loaderWith(() => ({ mountQuizCalculator }))); await vi.waitFor(() => expect(mountQuizCalculator).toHaveBeenCalledTimes(1)); });
it("AR-58 the loader mounts into its host with the scope's options, follows reduced motion and destroys on unmount", async () => { const handle = fakeHandle(); const mountQuizCalculator = vi.fn(() => handle); const v = mount(await loaderWith(() => ({ mountQuizCalculator })), { reducedMotion: true, announceReset: true });
  await vi.waitFor(() => expect(mountQuizCalculator).toHaveBeenCalled()); const options = mountQuizCalculator.mock.calls[0][0];
  expect(options.element.id).toBe("kc-host"); expect(options.element.hasAttribute("data-calculator-host")).toBe(true); expect(options).toMatchObject({ frame: v.frame, chromeSlot: v.chromeSlot, reducedMotion: true, announceReset: true });
  v.update({ reducedMotion: false }); expect(handle.setReducedMotion).toHaveBeenLastCalledWith(false); v.unmount(); expect(handle.destroy).toHaveBeenCalledTimes(1); expect(v.onHandle).toHaveBeenLastCalledWith(null); });
it("AR-58 the mount waits until frame and chromeSlot are both set and runs once they arrive", async () => { const mountQuizCalculator = vi.fn(() => fakeHandle()); const L = await loaderWith(() => ({ mountQuizCalculator })); const v = mount(L, { frame: null }); await L.getCalculatorModule(); await act(async () => {});
  expect(mountQuizCalculator).not.toHaveBeenCalled(); const frame = document.createElement("div"); v.update({ frame }); await vi.waitFor(() => expect(mountQuizCalculator).toHaveBeenCalledTimes(1)); expect(mountQuizCalculator.mock.calls[0][0].frame).toBe(frame); });
it("AR-61 an inactive loader renders nothing and imports nothing, and an import settling after unmount mounts nothing", async () => { const imported = vi.fn(); const mountQuizCalculator = vi.fn(); const L = await loaderWith(() => { imported(); return { mountQuizCalculator }; }); const v = mount(L, { active: false });
  await act(async () => {}); expect(v.container).toBeEmptyDOMElement(); expect(imported).not.toHaveBeenCalled(); v.update({ active: true }); v.unmount(); await L.getCalculatorModule(); await act(async () => {}); expect(mountQuizCalculator).not.toHaveBeenCalled(); });
```

- [ ] **Step 3: Run them and see them fail** — `npx vitest run src/components/calculator/CalculatorLoader.test.tsx`; Expected: FAIL, `./CalculatorLoader` not found.
- [ ] **Step 4: Implement `CalculatorLoader.tsx`** (`"use client"`). `loadCalculatorModule` has exactly the section 13.2 body; `getCalculatorModule` keeps the first promise, rejection included. Inactive returns `<></>`. Active renders `<div id={useContext(CalculatorHostIdContext)} data-calculator-host className={styles.host} />` (hidden until ready) and one `.panel` with `role="status"`: `LOADING_COPY`; `LOAD_FAILED_COPY` with "Reload page" calling `(reloadPage ?? (() => window.location.reload()))()`; or `MOUNT_FAILED_COPY` with "Retry", which mounts again on the resolved module. Activation order: `warmCalculatorFonts()` (never awaited), `onStatus("loading", null)`, `await getCalculatorModule()` (rejection: report, `onStatus("failed", "load")`); the mount runs the first time the module is resolved and `frame` and `chromeSlot` are both non-null (an effect that depends on all three, so props that arrive later start it), inside `try` (throw: report, `onStatus("failed", "mount")`), then `onStatus("ready", null)` and `onHandle(guardHandle(handle, fail))`, where `fail(error)` reports, calls `destroy()` once, `onHandle(null)` and `onStatus("failed", "mount")` and shows `MOUNT_FAILED_COPY`. A disposed flag set on unmount blocks any later mount. Effects: `setReducedMotion` on prop change; `onCalculatorFontsLoaded(() => handle.reflow())`; unmount calls `destroy()` once on a live handle and `onHandle(null)`. `.host` and `.panel` colours use only `--kcc-*`.
- [ ] **Step 5: Run them and see them pass** — same command; Expected: PASS (12 tests).
- [ ] **Step 6: Commit** — `git add src/components/calculator docs/superpowers/specs && git commit -m "Load the v2 calculator once per page with reload and retry panels (OI-28)"`

### Task 5: CalculatorWindow frame

**Files:** Create `src/components/calculator/CalculatorWindow.tsx`, `CalculatorWindow.test.tsx`. Modify `CalculatorWindow.module.css` (frame, title bar, `.titleSlot > button`, controls, grip, splitter, sentinels).

**Interfaces:** Consumes: `CalculatorWindowProps`, `WindowMode`, `WindowRect` (section 13.2); `calculatorWindowStore`, `clampFloatingRect`, `clampDockWidth`, `WINDOW_KEY_STEP` (task 2). Produces: `CalculatorWindow(props: CalculatorWindowProps): JSX.Element` per the DOM contract; the move handle has `role="button"`, its role description and `tabIndex` 0 only when floating, and is plain text in the modes where it cannot move the window. Restore calls `onModeChange(calculatorWindowStore.get().restoreMode)`, Undock `onModeChange("floating")`, Maximize `onModeChange("maximized")`. All key handling is native (`addEventListener` in an effect on the frame), because React's root-level delegation never sees events stopped at the frame: handle and grip arrows (16 px, clamped to `innerWidth` × `innerHeight`), splitter arrows, Home and End, then Escape (`onClose()` unless `defaultPrevented`), then `stopPropagation()` for every `keydown`, `keyup` and `keypress`. Start sentinel focus calls `onFocusBoundary("last")`; end sentinel focus moves to the title bar's first focusable, else calls `onFocusBoundary("first")`.

- [ ] **Step 1: Write the failing tests**

```
// @vitest-environment jsdom
function setup(mode: WindowMode, extra: Partial<CalculatorWindowProps> = {}) { const props: CalculatorWindowProps = { mode, dockTop: 12, dockWidth: 576, floatingRect: { x: 16, y: 64, width: 880, height: 600 }, onModeChange: vi.fn(), onFloatingRectChange: vi.fn(), onDockWidthChange: vi.fn(), onClose: vi.fn(), onMinimize: vi.fn(), onFocusBoundary: vi.fn(), frameRef: createRef(), chromeSlotRef: createRef(), children: <input aria-label="inside" />, ...extra };
  const view = render(<CalculatorWindow {...props} />); return { props, rerender: (m: WindowMode) => view.rerender(<CalculatorWindow {...props} mode={m} />) }; }
beforeEach(() => { Object.assign(window, { innerWidth: 1280, innerHeight: 800 }); calculatorWindowStore.resetForTests(); });
it("A11Y-6 one frame is a non-modal dialog, a modal dialog or a complementary landmark named Karman calculator", () => { const { props, rerender } = setup("floating"); const frame = props.frameRef.current!; const dialog = () => screen.getByRole("dialog", { name: "Karman calculator" });
  expect(dialog()).not.toHaveAttribute("aria-modal"); rerender("maximized"); expect(dialog()).not.toHaveAttribute("aria-modal"); rerender("fullscreen"); expect(dialog()).toHaveAttribute("aria-modal", "true");
  rerender("docked"); expect(screen.getByRole("complementary", { name: "Karman calculator" })).toBe(frame); expect(frame).toHaveAttribute("tabindex", "-1"); expect(screen.queryByRole("button", { name: "Karman calculator" })).toBeNull(); });
it.each([["floating", ["Maximize calculator", "Minimize calculator", "Close calculator"]], ["docked", ["Undock calculator", "Maximize calculator", "Minimize calculator", "Close calculator"]], ["maximized", ["Restore calculator size", "Minimize calculator", "Close calculator"]], ["fullscreen", ["Close calculator"]]] as const)("L-12 the %s title bar holds the label, the chrome slot, then its window controls and Close", (mode, names) => {
  const { props } = setup(mode); const bar = props.frameRef.current!.querySelector("[data-calculator-titlebar]")!; const slot = props.chromeSlotRef.current!;
  expect([...bar.querySelectorAll("[data-window-controls] button")].map((b) => b.getAttribute("aria-label"))).toEqual(names); expect(slot).toHaveAttribute("data-calculator-title-slot");
  const follows = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  expect(follows(screen.getByText("Karman calculator"), slot)).toBe(true); expect(follows(slot, screen.getByRole("button", { name: names[0] }))).toBe(true); });
it("L-12 the window controls report Undock, Maximize, Restore, Minimize and Close", () => { const { props, rerender } = setup("docked"); const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
  click("Undock calculator"); expect(props.onModeChange).toHaveBeenLastCalledWith("floating"); click("Maximize calculator"); expect(props.onModeChange).toHaveBeenLastCalledWith("maximized");
  click("Minimize calculator"); expect(props.onMinimize).toHaveBeenCalledTimes(1); calculatorWindowStore.set({ mode: "docked" }); rerender("maximized");
  click("Restore calculator size"); expect(props.onModeChange).toHaveBeenLastCalledWith("docked"); click("Close calculator"); expect(props.onClose).toHaveBeenCalledTimes(1); });
it("KB-6, AR-18 key events stop at the frame and Escape closes only when nothing prevented it", () => { const { props } = setup("floating"); const heard = vi.fn(); for (const t of ["keydown", "keyup", "keypress"]) { window.addEventListener(t, heard); document.addEventListener(t, heard); }
  const inside = screen.getByLabelText("inside"); fireEvent.keyDown(inside, { key: "Enter" }); fireEvent.keyUp(inside, { key: "Enter" }); fireEvent.keyPress(inside, { key: "h", charCode: 104, altKey: true });
  inside.addEventListener("keydown", (e) => e.preventDefault(), { once: true }); fireEvent.keyDown(inside, { key: "Escape" }); expect(props.onClose).not.toHaveBeenCalled();
  fireEvent.keyDown(inside, { key: "Escape" }); expect(props.onClose).toHaveBeenCalledTimes(1); expect(heard).not.toHaveBeenCalled(); });
it("KB-10 arrow keys move the focused handle and resize the focused grip by 16 px, clamped", () => { const { props } = setup("floating", { floatingRect: { x: 16, y: 64, width: 368, height: 280 } }); // the props never change, so each key steps from this rect const last = () => (props.onFloatingRectChange as Mock).mock.lastCall![0]; const handle = screen.getByRole("button", { name: "Karman calculator" }); const grip = screen.getByRole("button", { name: "Resize calculator" });
  expect(handle).toHaveAttribute("aria-roledescription", "move handle"); expect(grip).toHaveAttribute("aria-roledescription", "resize handle");
  fireEvent.keyDown(handle, { key: "ArrowRight" }); expect(last()).toEqual({ x: 32, y: 64, width: 368, height: 280 }); fireEvent.keyDown(handle, { key: "ArrowUp" }); expect(last()).toEqual({ x: 16, y: 48, width: 368, height: 280 });
  fireEvent.keyDown(grip, { key: "ArrowDown" }); expect(last()).toEqual({ x: 16, y: 64, width: 368, height: 296 }); fireEvent.keyDown(grip, { key: "ArrowLeft" }); expect(last()).toEqual({ x: 16, y: 64, width: 360, height: 280 }); }); // 352 clamps to the 360 minimum
it("AR-23 the dock splitter is a separator stepping 16 px, with Home and End at 400 and min(900, 100vw - 480)", () => { const { props } = setup("docked"); const sep = screen.getByRole("separator", { name: "Resize calculator dock" });
  expect(["aria-valuenow", "aria-valuemin", "aria-valuemax"].map((a) => sep.getAttribute(a))).toEqual(["576", "400", "800"]);
  for (const [key, width] of [["ArrowRight", 592], ["ArrowLeft", 560], ["Home", 400], ["End", 800]] as const) { fireEvent.keyDown(sep, { key }); expect(props.onDockWidthChange).toHaveBeenLastCalledWith(width); } });
it("AR-28 full screen adds focus sentinels: start asks for the last boundary, end wraps to the title bar", () => { const { props, rerender } = setup("floating"); expect(document.querySelectorAll("[data-focus-sentinel]")).toHaveLength(0); rerender("fullscreen");
  document.querySelector<HTMLElement>('[data-focus-sentinel="start"]')!.focus(); expect(props.onFocusBoundary).toHaveBeenCalledWith("last");
  document.querySelector<HTMLElement>('[data-focus-sentinel="end"]')!.focus(); expect(screen.getByRole("button", { name: "Close calculator" })).toHaveFocus(); });
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run src/components/calculator/CalculatorWindow.test.tsx`; Expected: FAIL, `./CalculatorWindow` not found.
- [ ] **Step 3: Implement `CalculatorWindow`** (`"use client"`, lucide-react icons with `aria-hidden`). Inline geometry: floating `left`/`top`/`width`/`height` from `floatingRect`; docked `left: 12px; top: dockTop; bottom: 12px; width: dockWidth`; maximized and full screen `inset: 0` (CSS). CSS: `z-index: 72` on the frame in every mode; full screen `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)`; 24 px grip and splitter hit areas; `:focus-visible { outline: 2px solid var(--kcc-focus); outline-offset: 2px }` on the handle, grip, splitter, sentinels and every title-bar button including `.titleSlot > button` (13's Paste and Keyboard shortcuts); colours only from `--kcc-*` (TH-2).
- [ ] **Step 4: Run them and see them pass** — same command; Expected: PASS (10 tests).
- [ ] **Step 5: Commit** — `git add src/components/calculator/CalculatorWindow.tsx src/components/calculator/CalculatorWindow.test.tsx src/components/calculator/CalculatorWindow.module.css && git commit -m "Add the v2 calculator window frame with native key isolation"`

### Task 6: CalculatorScope seam, bridge, trigger and containment (AR-7 contribution)

**Files:** Modify `src/components/calculator/CalculatorScope.tsx`, `src/components/calculator/CalculatorSourceAction.tsx:9-13`. Test: `src/components/calculator/CalculatorScope.test.tsx`, `src/components/calculator/CalculatorScope.prefetch.test.tsx` (the AR-30 prefetch test alone: Vitest isolates each file, so its quiz-host mock and the loader's module promise start fresh; in the shared file an earlier test has already imported the module).

**Interfaces:** Consumes: `useCalculatorVersion()`, `PHONE_QUERY`, `FULL_SCREEN_QUERY` (03); tasks 2 to 5; `useQuizAnimations()` (`src/components/learn/quiz/QuizTools.tsx:37`); `OpenTrigger` (type-only import, 10); `installDomStubs()` (07, tests). Produces: section 13.2 `CalculatorScopeProps` (required `questionKey`, optional `dockTop`), `V1Bridge`, `V2Bridge`, `CalculatorBridge`, `useCalculator()`, `CalculatorScope`, `CalculatorTrigger`. The v1 path is today's component unchanged except its bridge gains `version: "v1"` (AR-8).

- [ ] **Step 1: Write the failing tests**

```
// @vitest-environment jsdom
const h = vi.hoisted(() => ({ throwWindow: false, bridge: null as unknown, handles: [] as { focusOnOpen: ReturnType<typeof vi.fn> }[] })); vi.mock("./CalculatorShell", () => ({ CalculatorShell: () => <div data-testid="v1-shell" /> }));
vi.mock("@/components/calculator-v2/host/quiz-host", () => ({ mountQuizCalculator: () => { const handle = { calculator: {}, focusOnOpen: vi.fn(), focusBoundary: vi.fn(), setReducedMotion: vi.fn(), reflow: vi.fn(), destroy: vi.fn() }; h.handles.push(handle); return handle; } }));
vi.mock("./CalculatorWindow", async (original) => { const m = await original<typeof import("./CalculatorWindow")>();
  return { ...m, CalculatorWindow: (p: CalculatorWindowProps) => { if (h.throwWindow) throw new Error("render"); return m.CalculatorWindow(p); } }; });
function Probe() { h.bridge = useCalculator(); return null; }
function Host({ version, enabled = true }: { version?: "v1" | "v2"; enabled?: boolean }) { const [open, setOpen] = useState(false); const scope = <CalculatorScope enabled={enabled} open={open} onOpenChange={setOpen} questionKey="attempt:q1"><p>Question body</p><CalculatorTrigger /><CalculatorSourceAction latex="\sin(30)" /><Probe /></CalculatorScope>; return version ? <CalculatorVersionProvider version={version}>{scope}</CalculatorVersionProvider> : scope; } // no version: no provider (AR-7)
const trigger = (hidden = false) => screen.getByRole("button", { name: "Toggle Karman calculator", hidden }); let restore = () => {}; // hidden: true once open: from tasks 8 and 9 a phone open is full screen, which makes the workspace aria-hidden
const phone = () => { window.matchMedia = ((q: string) => ({ matches: q === PHONE_QUERY || q === FULL_SCREEN_QUERY, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia; }; // installDomStubs' restore undoes it
beforeEach(() => { restore = installDomStubs(); calculatorWindowStore.resetForTests(); h.throwWindow = false; h.handles = []; }); afterEach(() => restore());
it("AR-9 v1 renders CalculatorShell and v2 renders CalculatorWindow with CalculatorLoader", () => { const v1 = render(<Host version="v1" />); fireEvent.click(trigger()); expect(screen.getByTestId("v1-shell")).toBeInTheDocument(); expect(document.querySelector("[data-calculator-window]")).toBeNull(); v1.unmount();
  render(<Host version="v2" />); fireEvent.click(trigger()); expect(screen.queryByTestId("v1-shell")).toBeNull(); expect(document.querySelector("[data-calculator-window] [data-calculator-host]")).not.toBeNull();
  const source = readFileSync("src/components/calculator/CalculatorScope.tsx", "utf8"); expect(source.split("innerWidth >= 1100")).toHaveLength(2); expect(source.split('"(max-width: 767px), (max-height: 500px)"')).toHaveLength(2); });
it("AR-9 useCalculator is null when ineligible and a version-tagged bridge otherwise", () => { render(<Host version="v2" enabled={false} />).unmount(); expect(h.bridge).toBeNull(); render(<Host version="v1" />).unmount(); expect(h.bridge).toMatchObject({ version: "v1", open: false });
  render(<Host version="v2" />); expect(h.bridge).toMatchObject({ version: "v2", open: false, status: "idle", failure: null, questionKey: "attempt:q1" }); });
it("AR-7 CalculatorScope renders v1 without a provider and v2 inside a v2 provider", () => { const bare = render(<Host />); fireEvent.click(trigger()); expect(screen.getByTestId("v1-shell")).toBeInTheDocument(); expect(document.querySelector("[data-calculator-window]")).toBeNull(); expect(h.bridge).toMatchObject({ version: "v1" }); bare.unmount();
  render(<Host version="v2" />); fireEvent.click(trigger()); expect(document.querySelector("[data-calculator-window]")).not.toBeNull(); expect(screen.queryByTestId("v1-shell")).toBeNull(); expect(h.bridge).toMatchObject({ version: "v2" }); });
it("A11Y-7 the v2 trigger and side button use aria-expanded and aria-controls naming the shadow host", () => { phone();
  render(<Host version="v2" />); const side = screen.getByRole("button", { name: "Open Karman calculator" }); const id = side.getAttribute("aria-controls")!;
  expect(id).toMatch(/^\S+$/); expect(trigger()).toHaveAttribute("aria-controls", id); expect(trigger()).toHaveAttribute("aria-expanded", "false"); fireEvent.click(side);
  expect(document.getElementById(id)).toHaveAttribute("data-calculator-host"); expect(trigger(true)).toHaveAttribute("aria-expanded", "true"); expect(screen.queryByRole("button", { name: "Open Karman calculator", hidden: true })).toBeNull(); });
it('KB-4 a touch tap on the side button opens with the "touch" trigger and Enter on the toolbar trigger with "keyboard" (OI-7)', async () => { phone(); render(<Host version="v2" />); const side = screen.getByRole("button", { name: "Open Karman calculator" }); fireEvent.pointerDown(side, { pointerType: "touch" }); fireEvent.click(side);
  await waitFor(() => expect(h.handles.at(-1)?.focusOnOpen).toHaveBeenLastCalledWith("touch")); fireEvent.click(trigger(true)); fireEvent.keyDown(trigger(true), { key: "Enter" }); fireEvent.click(trigger(true)); await waitFor(() => expect(h.handles.at(-1)?.focusOnOpen).toHaveBeenLastCalledWith("keyboard")); expect(h.handles).toHaveLength(1); });
it("AR-53 a render error in the window leaves the question mounted and offers Retry", () => { h.throwWindow = true; vi.spyOn(console, "error").mockImplementation(() => {}); render(<Host version="v2" />); fireEvent.click(trigger());
  expect(screen.getByText(MOUNT_FAILED_COPY, { exact: true })).toBeInTheDocument(); expect(screen.getByText("Question body")).toBeInTheDocument();
  h.throwWindow = false; fireEvent.click(screen.getByRole("button", { name: "Retry" })); expect(document.querySelector("[data-calculator-window]")).not.toBeNull(); });
it("AR-13 on v2 the v1 export controls render nothing", () => { const v1 = render(<Host version="v1" />); expect(screen.getByRole("button", { name: "Paste \\sin(30) into calculator" })).toBeInTheDocument(); v1.unmount();
  render(<Host version="v2" />); expect(screen.queryByRole("button", { name: /Export|Paste|Copy for Desmos/ })).toBeNull(); });
// ---- CalculatorScope.prefetch.test.tsx (this test only; it starts with its own // @vitest-environment jsdom line)
const imported = vi.hoisted(() => vi.fn()); const warm = vi.hoisted(() => vi.fn(async () => {})); vi.mock("./font-warmup", () => ({ warmCalculatorFonts: warm, onCalculatorFontsLoaded: () => () => {} }));
vi.mock("@/components/calculator-v2/host/quiz-host", () => { imported(); return { mountQuizCalculator: () => ({ calculator: {}, focusOnOpen: vi.fn(), focusBoundary: vi.fn(), setReducedMotion: vi.fn(), reflow: vi.fn(), destroy: vi.fn() }) }; });
vi.mock("./CalculatorShell", () => ({ CalculatorShell: () => <div data-testid="v1-shell" /> }));
function Host({ version }: { version: "v1" | "v2" }) { const [open, setOpen] = useState(false); return <CalculatorVersionProvider version={version}><CalculatorScope enabled open={open} onOpenChange={setOpen} questionKey="attempt:q1"><CalculatorTrigger /></CalculatorScope></CalculatorVersionProvider>; }
it("AR-30, AR-41 nothing is imported or warmed before open or prefetch, trigger focus prefetches the module and warms the fonts, and v1 does neither", async () => { const restore = installDomStubs(); const trigger = () => screen.getByRole("button", { name: "Toggle Karman calculator" });
  const v1 = render(<Host version="v1" />); fireEvent.pointerEnter(trigger()); fireEvent.click(trigger()); v1.unmount(); render(<Host version="v2" />); await act(async () => {}); expect(imported).not.toHaveBeenCalled(); expect(warm).not.toHaveBeenCalled();
  act(() => trigger().focus()); await waitFor(() => expect(imported).toHaveBeenCalledTimes(1)); expect(warm).toHaveBeenCalledTimes(1); expect(document.querySelector("[data-calculator-window]")).toBeNull(); restore(); });
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run src/components/calculator/CalculatorScope.test.tsx src/components/calculator/CalculatorScope.prefetch.test.tsx`; Expected: FAIL (`[data-calculator-window]` missing, the bridge has no `version` or `questionKey`, so AR-7 fails at `{ version: "v1" }` with no provider, focusing the trigger imports and warms nothing, and KB-4's side button opens v1, so no handle mounts and `focusOnOpen` is never called).
- [ ] **Step 3: Implement.** `CalculatorScope` reads `useCalculatorVersion()` (`"v1"` when no provider is mounted, AR-7) and renders `V1Scope` (today's body; bridge plus `version: "v1"`) or `V2Scope`, both in this file (keep it under 450 lines; 14 extends it), which imports `./calculator-chrome.generated.css` (AR-37). `V2Scope`: `hostId` = `karman-calculator-` + `useId()` with characters outside `[A-Za-z0-9_-]` removed, provided through `CalculatorHostIdContext`; `activated` becomes true on the first open; once activated it renders `<div data-calculator-v2 hidden={!open} data-reduced-motion={String(!useQuizAnimations())}>` holding a `WindowBoundary` (class error boundary in this file; fallback: a `.panel` with `MOUNT_FAILED_COPY` and "Retry", which remounts its children by bumping a key) around `CalculatorWindow` and `CalculatorLoader` (`active`; `frame` and `chromeSlot` from the window refs, stored in state from a layout effect; `reducedMotion = !useQuizAnimations()`; `announceReset={false}` until task 12). Mode: `windowModeFor(useSyncExternalStore(store.subscribe, store.get, store.get), false)`; `floatingRect ?? defaultFloatingRect({ width: innerWidth, height: innerHeight })` (task 8 clamps at render); window callbacks write to the store; Close and Minimize call `onOpenChange(false)`. `toggle(trigger)` opening from closed remembers `trigger ?? "keyboard"`, runs `store.set({ mode: "floating" })` and `onOpenChange(true)`; `prefetch()` runs `void getCalculatorModule().catch(() => {})` and `void warmCalculatorFonts()`; status and failure come from `onStatus`; when `open`, a handle and a remembered trigger all exist, `handle.focusOnOpen(remembered)` runs and the trigger is forgotten, so it runs once per open. A scope mounted with `open` already true (Next, Previous or Skip with the window open, AR-25) remembers no trigger and calls no `focusOnOpen`: focus stays where the host left it, never moving into the carried window (task 10's AR-25 test). The side button (`styles.sideToggle`) shows while closed and `PHONE_QUERY` matches, with `aria-controls={hostId}`. The workspace div keeps `styles.workspace` and adds `data-calculator-workspace`. `CalculatorTrigger` on v2 adds `aria-controls={hostId}`, `data-calculator-trigger`, and `onPointerEnter` and `onFocus` calling `prefetch()`; its v1 output is unchanged. Both v2 buttons, the side button and the trigger, record `pointerType` on `pointerdown` ("touch" and "pen" give `"touch"`, "mouse" gives `"mouse"`), click with `toggle(recorded ?? "keyboard")` and clear the record after every toggle and on every `keydown`, so a touch tap on either opens with `"touch"` (OI-7: the frame takes focus, no keyboard rises) and a later Enter reports `"keyboard"`. `PasteAction` returns `null` unless `calculator?.version === "v1"`.
- [ ] **Step 4: Run them and see them pass** — same command, then `npx vitest run src/components/calculator`; Expected: PASS.
- [ ] **Step 5: Commit** — `git add src/components/calculator/CalculatorScope.tsx src/components/calculator/CalculatorScope.test.tsx src/components/calculator/CalculatorScope.prefetch.test.tsx src/components/calculator/CalculatorSourceAction.tsx && git commit -m "Switch CalculatorScope by version with the v2 bridge, window and loader"`

### Task 7: Hosts and the quiz fixture

**Files:** Modify `src/components/learn/QuizEngine.tsx:148-157`, `src/components/diagnostic/DiagnosticClient.tsx:75-80`, `src/components/learn/catalog-practice/CatalogPractice.tsx:152-157`, `src/components/learn/DailyChallenge.tsx:118-122`, `src/components/learn/ExternalCalculatorLink.tsx`, `ExternalCalculatorLink.test.tsx`, `src/components/diagnostic/parts/DiagnosticHeader.test.tsx:25`, `tests/calculator/fixture/main.tsx`, `platform.tsx`, `server.mjs`, `playwright.config.ts`. Create `tests/calculator/fixture/daily-actions.ts` and, in `tests/calculator/v2/`, `quiz-helpers.ts`, `quiz-window.spec.ts`, `quiz-reset.spec.ts`, `quiz-loading.spec.ts`.

**Interfaces:** Consumes: `makeQuestionKey` (task 2); `LEARN_HEADER_CLEARANCE` from `@/components/learn/learn-header` and `CalculatorVersionProvider` (03); `calculatorWindowStore` (task 2); `parseLatex`, `countNodes` (`src/lib/calculator-v2/core/latex/index.ts`, 02). Produces: the section 16 fixture URLs (`?flow=practice|diagnostic|catalog|daily`, plus `&calc=v2`); with `calc=v2` only, a fixture control `<button aria-label="Fixture dock">` running `calculatorWindowStore.set({ mode: "docked" })` and `globalThis.__calculatorWindowStore = calculatorWindowStore`, typed in `main.tsx` by `declare global { var __calculatorWindowStore: typeof calculatorWindowStore | undefined }` (the `CalculatorSurface.tsx` pattern; strict `tsc` rejects an undeclared global); the fixture panel gets `data-fixture-controls`. `quiz-helpers.ts` serves tasks 7 to 13.

- [ ] **Step 1: Write the failing tests.** RC-21, NM-24, AR-59 and AR-56 are written here, before the fixture honours `calc=v2`, so each is first seen failing; tasks 11 and 12 extend those files. `ExternalCalculatorLink.test.tsx` adds the last block, mocking quiz-host as in task 6 and calling `installDomStubs()`.

```
// ---- tests/calculator/v2/quiz-helpers.ts (every helper exported)
import { expect, test, type Page } from "@playwright/test";
export const trigger = (page: Page) => page.getByRole("button", { name: "Toggle Karman calculator", exact: true }); export const side = (page: Page) => page.getByRole("button", { name: "Open Karman calculator", exact: true });
export const row = (page: Page, n = 1) => page.getByRole("textbox", { name: `Expression ${n}`, exact: true }); export const frame = (page: Page) => page.locator("[data-calculator-window]"); export const workspace = (page: Page) => page.locator("[data-calculator-workspace]");
export const phoneSized = (page: Page) => { const { width, height } = page.viewportSize()!; return width <= 767 || height <= 500; }; export const latex = (page: Page) => page.evaluate(() => globalThis.__calculatorHarness!.engine.getExpressions().map((e) => e.latex ?? ""));
export const press = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).evaluate((el: HTMLElement) => el.click()); // DOM click: the window may cover the button
export const dock = (page: Page) => press(page, "Fixture dock"); export const chromeOnly = (name: string) => test.skip(name !== "calculator-chrome", "fixed viewport sizes and pointer geometry"); export const RUNAWAY = `-${Array(499).fill("xy").join("+")}=2x`; // the 2,000-node Phase 1 runaway row (AR-56, AR-61)
export function v2Requests(page: Page) { const urls: string[] = []; page.on("request", (r) => { if (/\/calculator-v2\/|\/vendor\/mathquill\//.test(r.url())) urls.push(r.url()); }); return urls; }
export async function openV2(page: Page, flow = "diagnostic", size?: { width: number; height: number }) { if (size) await page.setViewportSize(size); await page.goto(`/?flow=${flow}&calc=v2`); await (phoneSized(page) ? side(page) : trigger(page)).click(); await expect(row(page)).toBeVisible(); }
// ---- tests/calculator/v2/quiz-window.spec.ts (expect and test from @playwright/test, the rest from ./quiz-helpers)
test("L-4 the toolbar and the phone side button open v2 in Math questions only", async ({ page }) => { for (const flow of ["practice", "diagnostic", "catalog", "daily"]) { await openV2(page, flow); await expect(page.getByRole("region", { name: "Graphing calculator", exact: true })).toBeVisible(); }
  await page.goto("/?flow=practice&calc=v2&subject=reading"); await expect(page.getByText(/^Question 1:/).first()).toBeVisible(); await expect(trigger(page)).toHaveCount(0); await expect(side(page)).toHaveCount(0); });
test("AR-8 without calc=v2 every flow opens v1 and requests no v2 module", async ({ page }) => { const urls = v2Requests(page); for (const flow of ["practice", "diagnostic", "catalog", "daily"]) { await page.goto(`/?flow=${flow}`); await (phoneSized(page) ? side(page) : trigger(page)).click();
    await expect(page.getByRole("button", { name: "Paste math", exact: true })).toBeVisible(); await expect(frame(page)).toHaveCount(0); } expect(urls).toEqual([]); });
// ---- tests/calculator/v2/quiz-reset.spec.ts
import { expect, test, type Page } from "@playwright/test"; import { press, row, trigger } from "./quiz-helpers";
const setRows = (page: Page, rows: { id: string; latex: string }[]) => page.evaluate((list) => globalThis.__calculatorHarness!.engine.setExpressions(list), rows);
const snapshot = (page: Page) => page.evaluate(() => { const e = globalThis.__calculatorHarness!.engine; const s = e.getSnapshot(); return { state: e.getState(), canUndo: e.canUndo(), geometry: s.geometry.size, rows: s.rows.map((r) => ({ latex: r.latex, chips: r.chips, value: r.value })) }; });
async function open(page: Page) { await page.setViewportSize({ width: 1280, height: 800 }); await page.goto("/?flow=diagnostic&calc=v2"); await trigger(page).click(); await expect(row(page)).toBeVisible(); }
test.beforeEach(({}, info) => test.skip(info.project.name !== "calculator-chrome", "engine-level reset checks"));
test("RC-21 after setBlank nothing from the previous question resolves", async ({ page }) => { await open(page); await setRows(page, [{ id: "1", latex: "a=5" }, { id: "2", latex: "f(x)=x^{2}" }]); await page.evaluate(() => globalThis.__calculatorHarness!.engine.updateSettings({ angleMode: "degrees" }));
  await press(page, "Skip this question"); await expect(row(page)).toBeVisible(); await setRows(page, [{ id: "1", latex: "a" }, { id: "2", latex: "f(2)" }, { id: "3", latex: "\\sin(90)" }]);
  await expect.poll(async () => (await snapshot(page)).rows.map((r) => r.chips)).toEqual([["a"], ["f"], []]);
  await expect.poll(async () => { const v = (await snapshot(page)).rows[2].value; return v?.type === "number" && Math.abs(v.value - Math.sin(90)) < 1e-12; }).toBe(true); });
test("NM-24 degrees chosen on one question are back to radians on the next", async ({ page }) => { await open(page); const value = async () => { await expect.poll(async () => (await snapshot(page)).rows[0].value?.type).toBe("number"); return ((await snapshot(page)).rows[0].value as { value: number }).value; };
  await page.evaluate(() => { const e = globalThis.__calculatorHarness!.engine; e.updateSettings({ angleMode: "degrees" }); e.setExpression({ id: "1", latex: "\\sin(90)" }); }); expect(await value()).toBeCloseTo(1, 12);
  await press(page, "Skip this question"); await expect(row(page)).toBeVisible(); await setRows(page, [{ id: "1", latex: "\\sin(90)" }]);
  expect(await value()).toBeCloseTo(Math.sin(90), 12); expect((await snapshot(page)).state.settings.angleMode).toBe("radians"); });
test("AR-59 closing and reopening within a question keeps rows, history, settings, mode and viewport", async ({ page }) => { await open(page); await row(page).click(); await page.keyboard.type("y=x");
  await page.evaluate(() => { const e = globalThis.__calculatorHarness!.engine; e.updateSettings({ angleMode: "degrees", showGrid: false }); e.setMathBounds({ left: -3, right: 3, bottom: -2, top: 2 }); });
  const before = await snapshot(page); expect(before.canUndo).toBe(true); await page.getByRole("button", { name: "Close calculator", exact: true }).click(); await trigger(page).click(); await expect(row(page)).toBeVisible();
  const after = await snapshot(page); expect(after.state).toEqual(before.state); expect(after.canUndo).toBe(true); });
// ---- tests/calculator/v2/quiz-loading.spec.ts
import { expect, test } from "@playwright/test"; import { countNodes, parseLatex } from "../../../src/lib/calculator-v2/core/latex"; import { RUNAWAY, chromeOnly, openV2 } from "./quiz-helpers";
test("AR-56 a runaway row leaves the diagnostic timer and Skip responsive and shows a cap or timeout message within 2 s", async ({ page }, info) => { chromeOnly(info.project.name); const parsed = parseLatex(RUNAWAY); expect(parsed.ok && countNodes(parsed.tree)).toBe(2000); await openV2(page, "diagnostic", { width: 1280, height: 800 });
  await page.evaluate((latex) => globalThis.__calculatorHarness!.engine.setExpression({ id: "1", latex }), RUNAWAY);
  await expect(page.locator("[data-calculator-host]").getByText(/^(This row is too long to evaluate\. Split it into smaller definitions\.|This is taking too long\. Try a smaller range or fewer terms\.)$/)).toBeVisible({ timeout: 2000 });
  const timer = page.getByText(/^\d{1,2}:\d{2}$/).first(); const ticks = new Set<string>(); for (let i = 0; i < 3; i++) { ticks.add((await timer.textContent())!); await page.waitForTimeout(1100); } expect(ticks.size).toBe(3);
  const elapsed = await page.evaluate(() => new Promise<number>((resolve) => { const old = document.querySelector("[data-calculator-host]")!; const start = performance.now();
    const watch = new MutationObserver(() => { if (!old.isConnected) { watch.disconnect(); resolve(performance.now() - start); } }); watch.observe(document.body, { childList: true, subtree: true });
    [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Skip this question"))!.click(); }));
  expect(elapsed).toBeLessThan(300); });
// ---- src/components/learn/ExternalCalculatorLink.test.tsx (added)
const probe = vi.hoisted(() => ({ keys: [] as (string | undefined)[] }));
vi.mock("@/components/calculator/CalculatorScope", async (original) => { const m = await original<typeof import("@/components/calculator/CalculatorScope")>();
  return { ...m, CalculatorTrigger: () => { const bridge = m.useCalculator(); if (bridge?.version === "v2") probe.keys.push(bridge.questionKey); return m.CalculatorTrigger(); } }; });
it("AR-9 ExternalCalculatorLink forwards questionKey to the v2 scope, else one stable fallback id, and opens the v2 window", () => { const tree = (key?: string) => <CalculatorVersionProvider version="v2"><ExternalCalculatorLink subject="math" questionKey={key} /></CalculatorVersionProvider>;
  const { rerender } = render(tree("a:q1")); expect(probe.keys.at(-1)).toBe("a:q1"); const button = screen.getByRole("button", { name: "Toggle Karman calculator" }); const id = button.getAttribute("aria-controls")!;
  fireEvent.click(button); expect(document.getElementById(id)).toHaveAttribute("data-calculator-host"); rerender(tree()); const fallback = probe.keys.at(-1)!; expect(fallback).toMatch(/\S/); expect(fallback).not.toBe("a:q1");
  rerender(tree()); expect(probe.keys.at(-1)).toBe(fallback); expect(screen.getByRole("button", { name: "Toggle Karman calculator" })).toHaveAttribute("aria-controls", id); });
```

- [ ] **Step 2: Run them and see them fail** — `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios tests/calculator/v2 -g "L-4|RC-21|NM-24|AR-59|AR-56"` and `npx vitest run src/components/learn/ExternalCalculatorLink.test.tsx`; Expected: FAIL (`calc=v2` is ignored and `flow=daily` renders the diagnostic, so v1 opens instead; v1's rows are also textboxes named "Expression 1" (`public/karman-calculator/calculator.js:1810`), so `openV2` and `row(page)` resolve, L-4 then fails on the missing "Graphing calculator" region, and RC-21, NM-24, AR-59 and AR-56 fail in `page.evaluate` with `TypeError: Cannot read properties of undefined (reading 'engine')`, because v1 exposes no `__calculatorHarness`; `probe.keys.at(-1)` is `undefined` instead of "a:q1" because the key is not forwarded). AR-8 is a regression guard, not a fail-first test: `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios tests/calculator/v2/quiz-window.spec.ts -g "AR-8"` passes before and after this task (flows without `calc=v2` are already v1).
- [ ] **Step 3: Implement.** Hosts pass the key they key the scope by: `QuizEngine` `const questionKey = makeQuestionKey(String(state.attemptId), currentQuestionId ?? state.phase)` as `key` and `questionKey`; `DiagnosticClient` `makeQuestionKey("diagnostic", question.id)` as both; `CatalogPractice` `makeQuestionKey(session?.id ?? "preview", String(shownQuestion?.id ?? previewQuestion?.id))` as both plus `dockTop={LEARN_HEADER_CLEARANCE}`; `DailyChallenge` `questionKey={makeQuestionKey(day, q.id)}` (its `DailyQuestion` key) and `dockTop={LEARN_HEADER_CLEARANCE}`; `ExternalCalculatorLink` gains `questionKey?: string`, calls `const fallbackKey = useId()` unconditionally and passes `questionKey ?? fallbackKey`; `DiagnosticHeader.test.tsx` passes `questionKey="diagnostic:q1"`. Fixture: `daily-actions.ts` exports `actionReviewDailyAnswer(): Promise<never>`, which throws "The calculator fixture never submits answers."; `server.mjs` aliases `@/app/learn/daily-challenge-actions` to it before `@`; `platform.tsx` adds `export const SignIn = () => null; export const SignUp = () => null; export const UserButton = () => null;`; `main.tsx` renders `flow=daily` as `<DailyChallenge math={{ state: "ready", value: { day: "2026-10-16", subject: "math", question: catalogQuestions[0] } } as DailySlot} reading={{ state: "empty" }} />`, and with `calc=v2` wraps the flow in `<CalculatorVersionProvider version="v2">` (catalog and daily also in `<LearnLayout>`) and adds the produced fixture control and global; without `calc=v2` every flow renders as today. `playwright.config.ts` adds `testIgnore: /calculator-v2/` to the `e2e`, `e2e-firefox` and `e2e-webkit` projects and nothing else.
- [ ] **Step 4: Run them and see them pass** — the step 2 commands (a failure in RC-21, NM-24, AR-59 or AR-56 is fixed in this task), then AR-8's unmodified v1 suite on all five projects: `npm run test:calculator -- tests/calculator/catalog.spec.ts tests/calculator/integration.spec.ts tests/calculator/layout.spec.ts tests/calculator/lifecycle.spec.ts tests/calculator/standalone.spec.ts tests/calculator/workspace.spec.ts`; Expected: PASS.
- [ ] **Step 5: Commit** — `git add src/components/learn src/components/diagnostic tests/calculator/fixture tests/calculator/v2 playwright.config.ts && git commit -m "Pass question keys from the quiz hosts and open v2 from the calculator fixture"`

### Task 8: Floating and full-screen opening

**Files:** Modify `CalculatorWindow.tsx`, `CalculatorWindow.module.css`, `CalculatorScope.tsx`. Test: `tests/calculator/v2/quiz-window.spec.ts`.

**Interfaces:** Consumes: `quiz-helpers.ts` (task 7); `FULL_SCREEN_QUERY` (03); `clampFloatingRect`, `defaultFloatingRect`, `clampDockWidth`, `defaultDockWidth`, `windowModeFor` (task 2). Produces: pointer drag of the title bar (anywhere outside its `button` elements, the move handle included) and of the grip with `setPointerCapture`, results through `clampFloatingRect`; the open animation, keyed on `data-entering`: with motion allowed, `V2Scope` sets it when `open` changes from false to true (a scope mounted with `open` already true, as after Next with the window open, does not animate) and clears it on `animationend`, `animationcancel` or any mode change, so Undock, Restore and the AR-26 crossings never replay it (AN-10 covers opening only); the scope's live `matchMedia(FULL_SCREEN_QUERY).matches` passed to `windowModeFor`; render-time clamping: the scope keeps `viewport = { width: innerWidth, height: innerHeight }` in state, refreshed on window and `visualViewport` resize, and passes `clampFloatingRect(floatingRect ?? defaultFloatingRect(viewport), viewport)` and `clampDockWidth(dockWidth ?? defaultDockWidth(viewport.width), viewport.width)` to the window, while the store keeps the values the student set and is written only by drags, key moves, the grip and the splitter, so a shrink and regrow restores the earlier place and dock width (AR-25).

- [ ] **Step 1: Write the failing tests**

```
test("AR-20, L-5 toolbar and side button open floating at 1024 px and wider over 500 px tall, full screen otherwise", async ({ page }, info) => { chromeOnly(info.project.name); for (const [width, height, mode, phone] of [[1023, 768, "fullscreen", false], [1024, 768, "floating", false], [1280, 800, "floating", false], [390, 844, "fullscreen", true], [1280, 480, "fullscreen", true]] as const) {
    await page.setViewportSize({ width, height }); await page.goto("/?flow=diagnostic&calc=v2"); await expect(side(page)).toHaveCount(phone ? 1 : 0);
    await (phone ? side(page) : trigger(page)).click(); await expect(frame(page)).toHaveAttribute("data-mode", mode); await expect(side(page)).toHaveCount(0); } });
test("AR-22, L-6 the floating window keeps v1 geometry, drags and resizes with clamping, maximizes, minimizes, re-clamps on window and visualViewport resize and stays at z-index 72", async ({ page }, info) => { chromeOnly(info.project.name); await openV2(page, "diagnostic", { width: 1280, height: 800 }); const box = async () => (await frame(page).boundingBox())!; const z = () => frame(page).evaluate((el) => getComputedStyle(el).zIndex);
  const drag = async (x: number, y: number, dx: number, dy: number) => { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 4 }); await page.mouse.up(); };
  const bar = async () => (await page.locator("[data-calculator-titlebar]").boundingBox())!; expect(await box()).toEqual({ x: 16, y: 64, width: 880, height: 600 }); expect(await z()).toBe("72");
  let b = await bar(); await drag(b.x + 300, b.y + b.height / 2, 300, 100); expect(await box()).toMatchObject({ x: 316, y: 164 });
  const g = (await page.getByRole("button", { name: "Resize calculator" }).boundingBox())!; expect([g.width, g.height]).toEqual([24, 24]);
  await drag(g.x + 12, g.y + 12, -2000, -2000); expect(await box()).toMatchObject({ width: 360, height: 280 });
  b = await bar(); await drag(b.x + 100, b.y + b.height / 2, 3000, 3000); expect(await box()).toEqual({ x: 920, y: 520, width: 360, height: 280 });
  await row(page).click(); await page.keyboard.type("1+1"); await page.getByRole("button", { name: "Maximize calculator" }).click(); expect(await box()).toEqual({ x: 0, y: 0, width: 1280, height: 800 }); expect(await z()).toBe("72");
  await page.getByRole("button", { name: "Restore calculator size" }).click(); expect(await box()).toEqual({ x: 920, y: 520, width: 360, height: 280 });
  await page.getByRole("button", { name: "Minimize calculator" }).click(); await expect(frame(page)).toBeHidden(); await trigger(page).click(); expect(await latex(page)).toEqual(["1+1"]);
  await page.setViewportSize({ width: 1100, height: 700 }); await expect.poll(box).toEqual({ x: 740, y: 420, width: 360, height: 280 }); await page.setViewportSize({ width: 1280, height: 800 }); await expect.poll(box).toEqual({ x: 920, y: 520, width: 360, height: 280 });
  await page.evaluate(() => { Object.defineProperty(window, "innerHeight", { configurable: true, value: 600 }); visualViewport!.dispatchEvent(new Event("resize")); }); await expect.poll(box).toEqual({ x: 920, y: 320, width: 360, height: 280 }); });
test("KB-10 arrow keys move the focused title-bar handle and resize the focused grip in 16 px steps, clamped", async ({ page }, info) => { chromeOnly(info.project.name); await openV2(page, "diagnostic", { width: 1280, height: 800 }); const box = async () => (await frame(page).boundingBox())!; await page.getByRole("button", { name: "Karman calculator", exact: true }).focus();
  for (const key of ["ArrowRight", "ArrowRight", "ArrowDown"]) await page.keyboard.press(key); expect(await box()).toMatchObject({ x: 48, y: 80 });
  for (let i = 0; i < 30; i++) await page.keyboard.press("ArrowRight"); expect((await box()).x).toBe(400);
  await page.getByRole("button", { name: "Resize calculator" }).focus(); await page.keyboard.press("ArrowLeft"); expect((await box()).width).toBe(864);
  for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowLeft"); expect((await box()).width).toBe(360); });
test("AN-10 floating and full-screen windows open with opacity 0 to 1 and translateY(6px) to 0 over 200 ms", async ({ page }, info) => { chromeOnly(info.project.name); const openAndRead = () => page.evaluate(() => new Promise((resolve) => {
    (document.querySelector<HTMLElement>('[aria-label="Open Karman calculator"]') ?? document.querySelector<HTMLElement>('[aria-label="Toggle Karman calculator"]')!).click();
    requestAnimationFrame(() => resolve(document.querySelector("[data-calculator-window]")!.getAnimations().map((a) => { const e = a.effect as KeyframeEffect; return { duration: e.getTiming().duration, frames: e.getKeyframes().map((k) => [k.opacity, k.transform]) }; }))); }));
  for (const size of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) { await page.setViewportSize(size); await page.goto("/?flow=diagnostic&calc=v2");
    expect(await openAndRead()).toEqual([{ duration: 200, frames: [["0", "translateY(6px)"], ["1", "translateY(0px)"]] }]); }
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/?flow=diagnostic&calc=v2"); expect(await openAndRead()).toEqual([]); });
```

- [ ] **Step 2: Run them and see them fail** — `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/quiz-window.spec.ts -g "AR-20, L-5|AR-22, L-6|KB-10 arrow|AN-10 floating"`; Expected: FAIL on AR-20/L-5, AR-22/L-6 and AN-10 (every open is floating, drags do not move the frame, no animation). KB-10's browser test may already pass: tasks 5 and 6 built the clamped key moves and their store writes (KB-10 was first seen failing in task 5's jsdom test).
- [ ] **Step 3: Implement** the produced behaviour. CSS: `@keyframes kcc-window-enter { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0px) } }` as `animation: kcc-window-enter 200ms cubic-bezier(0.22, 1, 0.36, 1)` on `.frame[data-entering][data-mode="floating"]` and `.frame[data-entering][data-mode="fullscreen"]` only, with no `fill-mode` (no transform remains to become a containing block); `animation: none` under `@media (prefers-reduced-motion: reduce)` and `[data-reduced-motion="true"] .frame`. Docked and maximized never animate; nothing in the window or workspace has a transition.
- [ ] **Step 4: Run them and see them pass** — same command, then `npx vitest run src/components/calculator` (the mode logic changed under tasks 5 and 6's jsdom tests); Expected: PASS.
- [ ] **Step 5: Commit** — `git add src/components/calculator/CalculatorWindow.tsx src/components/calculator/CalculatorWindow.module.css src/components/calculator/CalculatorScope.tsx tests/calculator/v2/quiz-window.spec.ts && git commit -m "Open v2 floating or full screen by viewport with drag, grip and entry motion"`

### Task 9: Modal full screen, focus return and key isolation

**Files:** Modify `CalculatorScope.tsx`. Test: `tests/calculator/v2/quiz-window.spec.ts`.

**Interfaces:** Consumes: `QuizCalculatorHandle.focusBoundary(edge)` and `focusOnOpen(trigger)` (10); task 5's sentinels and `onFocusBoundary`. Produces: in full screen while open, the workspace gets `inert` and `aria-hidden="true"` and `document.body.style.overflow` becomes `"hidden"` (the previous value comes back on hide); on open the scope remembers `document.activeElement` unless it is inside the frame; on hide it focuses that opener when still connected and visible, else the workspace's `[data-calculator-trigger]`, else the side button; `onFocusBoundary(edge)` calls the handle's `focusBoundary(edge)`.

- [ ] **Step 1: Write the failing tests**

```
test("AR-28, L-11, KB-12, L-6, AR-22 full screen is modal and fills the viewport at z-index 72: the workspace is inert, hidden and scroll-locked and Tab cycles inside the window", async ({ page }, info) => { chromeOnly(info.project.name); await openV2(page, "diagnostic", { width: 390, height: 844 }); const background = () => workspace(page).evaluate((el) => [(el as HTMLElement).inert, el.getAttribute("aria-hidden"), document.body.style.overflow]);
  await expect(page.getByRole("dialog", { name: "Karman calculator", exact: true })).toHaveAttribute("aria-modal", "true"); expect(await background()).toEqual([true, "true", "hidden"]);
  expect(await frame(page).boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 844 }); expect(await frame(page).evaluate((el) => getComputedStyle(el).zIndex)).toBe("72");
  const where = () => page.evaluate(() => { const a = document.activeElement!; return !document.querySelector("[data-calculator-window]")!.contains(a) ? "outside" : a.hasAttribute("data-calculator-host") ? "shadow" : (a.getAttribute("aria-label") ?? "light"); });
  const close = page.getByRole("button", { name: "Close calculator", exact: true }); await close.focus(); const seen = new Set<string>();
  for (let i = 0; i < 80; i++) { await page.keyboard.press("Tab"); seen.add(await where()); } expect(seen.has("outside")).toBe(false); expect(seen.has("shadow")).toBe(true); expect(seen.has("Close calculator")).toBe(true);
  await close.focus(); await page.keyboard.press("Shift+Tab"); expect(await where()).toBe("shadow"); await close.click(); expect(await background()).toEqual([false, null, ""]); await expect(trigger(page)).toBeFocused(); });
test("AR-27, L-10, KB-4 Close and Minimize keep the content and return focus to the opener, or the toolbar button when it is gone; reopening restores the last row", async ({ page }, info) => { chromeOnly(info.project.name); await page.setViewportSize({ width: 1280, height: 800 }); await page.goto("/?flow=diagnostic&calc=v2"); await trigger(page).focus(); await page.keyboard.press("Enter"); await expect(row(page)).toBeFocused();
  await page.keyboard.type("1+1"); await page.keyboard.press("Enter"); await expect(row(page, 2)).toBeFocused();
  for (const name of ["Close calculator", "Minimize calculator"]) { await page.getByRole("button", { name, exact: true }).click(); await expect(frame(page)).toBeHidden(); await expect(trigger(page)).toBeFocused();
    await trigger(page).click(); await expect(row(page, 2)).toBeFocused(); expect(await latex(page)).toEqual(["1+1", ""]); }
  await page.getByRole("button", { name: "Close calculator", exact: true }).click(); await page.setViewportSize({ width: 1280, height: 480 }); await side(page).click();
  await page.getByRole("button", { name: "Close calculator", exact: true }).click(); await expect(trigger(page)).toBeFocused(); });
test("KB-6, AR-18 calculator keys never reach window or document listeners; Escape closes the window only when no layer handled it", async ({ page }, info) => { test.skip(/ios|android/.test(info.project.name), "hardware keyboard projects only"); await openV2(page, "diagnostic", { width: 1280, height: 800 });
  await page.evaluate(() => { const log: string[] = ((globalThis as { quizKeys?: string[] }).quizKeys = []);
    for (const type of ["keydown", "keyup", "keypress"]) { window.addEventListener(type, (e) => log.push(`window ${type} ${(e as KeyboardEvent).key}`)); document.addEventListener(type, (e) => log.push(`document ${type} ${(e as KeyboardEvent).key}`)); } });
  const heard = () => page.evaluate(() => (globalThis as { quizKeys?: string[] }).quizKeys!.splice(0)); const keypad = page.getByRole("region", { name: "Keypad" });
  await row(page).click(); await page.keyboard.type("2+3"); await page.keyboard.press("Enter"); await page.keyboard.press("Alt+KeyH");
  await page.getByRole("button", { name: "Karman calculator", exact: true }).focus(); await page.keyboard.press("ArrowRight");
  await row(page).click(); await page.keyboard.press("Control+KeyK"); await expect(keypad).toBeVisible(); await page.keyboard.press("Escape"); await expect(keypad).toBeHidden(); await expect(frame(page)).toBeVisible();
  expect(await heard()).toEqual([]); await expect(page.getByText(/^Question 1:/)).toBeVisible(); await page.keyboard.press("Escape"); await expect(frame(page)).toBeHidden();
  await page.locator("body").press("x"); expect(await heard()).toContain("window keydown x"); });
test("AR-13 no v1 shell control is rendered or registered around a v2 calculator", async ({ page }) => { await openV2(page, "practice"); for (const name of ["Calculator mode", "Paste math", "Paste points as", "Show calculator keypad", "Hide calculator keypad"]) await expect(page.getByLabel(name, { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Export to Karman|Export options|Copy for Desmos/ })).toHaveCount(0);
  const keypads = page.getByRole("region", { name: "Keypad" }); const before = await keypads.count(); await page.locator("body").press("Control+KeyK"); await page.locator("body").press("Alt+KeyK"); await expect(keypads).toHaveCount(before); });
```

- [ ] **Step 2: Run them and see them fail** — `npm run test:calculator -- --project=calculator-chrome --project=calculator-firefox --project=calculator-safari --project=calculator-ios tests/calculator/v2/quiz-window.spec.ts -g "AR-28|AR-27|KB-6|AR-13"`; Expected: FAIL on AR-28 (workspace not inert; Shift+Tab leaves the frame) and AR-27 (focus is not returned); KB-6 and AR-13 already pass through tasks 5 and 6.
- [ ] **Step 3: Implement** the produced behaviour in `V2Scope`.
- [ ] **Step 4: Run them and see them pass** — same command, then `npx vitest run src/components/calculator` (full screen now hides the workspace under task 6's phone tests); Expected: PASS.
- [ ] **Step 5: Commit** — `git add src/components/calculator/CalculatorScope.tsx tests/calculator/v2/quiz-window.spec.ts && git commit -m "Make v2 full screen modal and return focus on close"`

### Task 10: Docking and page-session geometry

**Files:** Modify `CalculatorWindow.tsx`, `CalculatorWindow.module.css`, `CalculatorScope.tsx`, `src/components/learn/DailyChallenge.tsx:35,48`. Create `tests/calculator/v2/quiz-dock.spec.ts`.

**Interfaces:** Consumes: `dockTop` (default 12); `defaultDockWidth`, `clampDockWidth`, `DOCK_MARGIN` (task 2); `quiz-helpers.ts` and its `dock` (task 7). Produces: splitter pointer drag (`setPointerCapture`, `clampDockWidth`); docked frame `top: dockTop; bottom: 12px; width` = the task 8 rendered dock width; while docked and open, the AR-23 shift (the dock width plus a 12 px margin on each side) goes to one shift target. By default that is the workspace, which gets `data-calculator-docked="true"` (v1's single-column rule, `calculator.module.css:283-290`) and the style `{ display: "block", position: "relative", marginLeft: dockWidth + 24, minHeight: "100%", height: "100%" }`. When the workspace has an ancestor marked `data-calculator-dock-shift`, the workspace keeps `display: contents` and a layout effect sets that ancestor's `data-calculator-docked="true"` and `style.marginLeft` (`${dockWidth + 24}px`), removing both on undock, close, any other mode change and unmount. The daily host needs this: its scope wraps one card of a `lg:grid-cols-2` grid (about 410 px wide at 1024 px, against a 485 px shift), and the reading card beside it would sit under the dock. So `DailyChallenge.tsx:35` marks its `mx-auto max-w-6xl` column `data-calculator-dock-shift`, and `:48` adds `[[data-calculator-docked=true]_&]:grid-cols-1` to the grid (specificity 0,2,0, so it beats `lg:grid-cols-2`); while docked, the heading and both cards stack right of the dock in a column 475 px wide at 1024 px and 704 px at 1440 px. Other hosts mark nothing. No `vw` width, so no host scrolls sideways; no transition.

- [ ] **Step 1: Write the failing tests**

```
test("AR-23 the dock is a 12 px left column with a separator between 400 px and min(900px, 100vw - 480px); the workspace shifts by its width plus 24 px", async ({ page }, info) => { chromeOnly(info.project.name); await openV2(page, "diagnostic", { width: 1280, height: 800 }); await dock(page); expect(await frame(page).boundingBox()).toEqual({ x: 12, y: 12, width: 576, height: 776 });
  const margin = () => workspace(page).evaluate((el) => getComputedStyle(el).marginLeft); expect(await margin()).toBe("600px");
  expect(await page.locator("[data-question-layout]").first().evaluate((el) => getComputedStyle(el).display)).toBe("block");
  const sep = page.getByRole("separator", { name: "Resize calculator dock" }); expect((await sep.boundingBox())!.width).toBe(24); await sep.focus();
  for (const [key, width] of [["ArrowRight", 592], ["End", 800], ["Home", 400]] as const) { await page.keyboard.press(key); await expect(sep).toHaveAttribute("aria-valuenow", String(width)); expect(await margin()).toBe(`${width + 24}px`); }
  const s = (await sep.boundingBox())!; await page.mouse.move(s.x + 12, s.y + 100); await page.mouse.down(); await page.mouse.move(1250, s.y + 100, { steps: 4 }); await page.mouse.up(); await expect(sep).toHaveAttribute("aria-valuenow", "800"); });
test("AR-24 catalog and daily docks start below the learn header; the page content shifts right of the dock by its width plus 24 px, keeps a question column at least 320 px wide and leaves no focusable or content element under the dock", async ({ page }, info) => { chromeOnly(info.project.name); for (const flow of ["catalog", "daily"]) for (const size of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
    await openV2(page, flow, size); await dock(page); const box = (await frame(page).boundingBox())!; const header = (await page.locator("header.fixed").boundingBox())!; expect(box.y).toBe(72); expect(box.y).toBeGreaterThanOrEqual(header.y + header.height);
    const [margin, left] = await page.locator("[data-calculator-dock-shift]").or(workspace(page)).first().evaluate((el) => [getComputedStyle(el).marginLeft, el.getBoundingClientRect().left] as const); // daily shifts its content column (task 10), which precedes the workspaces inside it
    expect(margin).toBe(`${box.width + 24}px`); expect(left).toBeGreaterThanOrEqual(box.x + box.width + 12); expect(await workspace(page).first().evaluate((el) => el.firstElementChild!.getBoundingClientRect().width)).toBeGreaterThanOrEqual(320);
    const covered = await page.evaluate(({ x, y, width, height }) => [...document.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1']), article, h1, h2, h3, p")]
      .filter((el) => !el.closest("[data-calculator-window], [data-fixture-controls]") && el.getClientRects().length > 0)
      .filter((el) => { const r = el.getBoundingClientRect(); return r.left < x + width && r.right > x && r.top < y + height && r.bottom > y; }).map((el) => el.outerHTML.slice(0, 80)), box);
    expect(covered).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); } });
test("AR-25, AR-27 the open window keeps its mode and place across Next and Previous with fresh content and without taking focus; Undock returns to the last floating place; a toolbar open follows AR-20; a reload forgets", async ({ page }, info) => { chromeOnly(info.project.name); await openV2(page, "diagnostic", { width: 1280, height: 800 }); await page.getByRole("button", { name: "Karman calculator", exact: true }).focus();
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight"); for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowDown");
  await row(page).click(); await page.keyboard.type("a=5"); await press(page, "Skip this question"); await expect(row(page)).toBeVisible();
  expect(await frame(page).boundingBox()).toMatchObject({ x: 208, y: 160 }); expect(await latex(page)).toEqual([""]); expect(await page.evaluate(() => !!document.activeElement?.closest("[data-calculator-window]"))).toBe(false); // task 6: no focusOnOpen for a carried window
  await dock(page); const width = (await frame(page).boundingBox())!.width; await press(page, "Previous"); await expect(row(page)).toBeVisible();
  await expect(frame(page)).toHaveAttribute("data-mode", "docked"); expect((await frame(page).boundingBox())!.width).toBe(width);
  await page.getByRole("button", { name: "Undock calculator" }).click(); await expect(frame(page)).toHaveAttribute("data-mode", "floating"); expect(await frame(page).boundingBox()).toMatchObject({ x: 208, y: 160 }); await dock(page);
  await page.getByRole("button", { name: "Close calculator", exact: true }).click(); await press(page, "Skip this question"); await trigger(page).click();
  await expect(frame(page)).toHaveAttribute("data-mode", "floating"); expect(await frame(page).boundingBox()).toMatchObject({ x: 208, y: 160 });
  await page.reload(); await trigger(page).click(); expect(await frame(page).boundingBox()).toMatchObject({ x: 16, y: 64 }); });
test("AR-26 crossing 1024 px wide or 500 px tall switches between docked or floating and full screen, keeping rows, history, the focused row and the dock width", async ({ page }, info) => { chromeOnly(info.project.name); await openV2(page, "diagnostic", { width: 1280, height: 800 }); await dock(page); await row(page).click(); await page.keyboard.type("y=x"); await page.keyboard.press("Enter"); await page.keyboard.type("y=2x");
  const snap = () => page.evaluate(() => { const s = globalThis.__calculatorHarness!.engine.getSnapshot(); return { rows: s.rows.map((r) => r.latex), canUndo: s.canUndo, focused: s.focusedRowId }; });
  const before = await snap(); expect(before).toEqual({ rows: ["y=x", "y=2x"], canUndo: true, focused: "2" });
  for (const [size, mode] of [[{ width: 1000, height: 800 }, "fullscreen"], [{ width: 1280, height: 800 }, "docked"], [{ width: 1280, height: 480 }, "fullscreen"], [{ width: 1280, height: 800 }, "docked"]] as const) {
    await page.setViewportSize(size); await expect(frame(page)).toHaveAttribute("data-mode", mode); expect(await snap()).toEqual(before); await expect(row(page, 2)).toBeFocused(); if (mode === "docked") expect((await frame(page).boundingBox())!.width).toBe(576); }
  await page.getByRole("button", { name: "Undock calculator" }).click(); const rect = await frame(page).boundingBox(); await page.setViewportSize({ width: 1000, height: 800 });
  await expect(frame(page)).toHaveAttribute("data-mode", "fullscreen"); await page.setViewportSize({ width: 1280, height: 800 }); await expect(frame(page)).toHaveAttribute("data-mode", "floating"); expect(await frame(page).boundingBox()).toEqual(rect); });
test("AN-10, L-10, L-6 docking, undocking, restoring and closing change the workspace width within one frame, without transitions or a replayed entry animation, at z-index 72", async ({ page }, info) => { chromeOnly(info.project.name); await openV2(page, "diagnostic", { width: 1280, height: 800 }); await expect.poll(() => frame(page).evaluate((el) => el.getAnimations().length)).toBe(0);
  const after = (label: string) => page.evaluate((label) => new Promise<string[]>((resolve) => { document.querySelector<HTMLElement>(`[aria-label="${label}"]`)!.click(); requestAnimationFrame(() => { const w = document.querySelector("[data-calculator-window]")!;
    const s = getComputedStyle(document.querySelector("[data-calculator-workspace]")!); resolve([s.marginLeft, s.transitionDuration, String(w.getAnimations().length), getComputedStyle(w).zIndex]); }); }), label);
  expect(await after("Fixture dock")).toEqual(["600px", "0s", "0", "72"]); expect(await after("Undock calculator")).toEqual(["0px", "0s", "0", "72"]);
  expect(await after("Maximize calculator")).toEqual(["0px", "0s", "0", "72"]); expect(await after("Restore calculator size")).toEqual(["0px", "0s", "0", "72"]);
  await dock(page); expect(await after("Close calculator")).toEqual(["0px", "0s", "0", "72"]); await expect(trigger(page)).toBeFocused(); });
test("A11Y-6 floating and maximized are non-modal dialogs, full screen is modal, docked is complementary, all named Karman calculator around a Graphing calculator region", async ({ page }, info) => { chromeOnly(info.project.name); await openV2(page, "diagnostic", { width: 1280, height: 800 }); const dialog = page.getByRole("dialog", { name: "Karman calculator", exact: true }); const region = page.getByRole("region", { name: "Graphing calculator", exact: true });
  await expect(dialog).not.toHaveAttribute("aria-modal", "true"); await expect(region).toBeVisible(); await page.getByRole("button", { name: "Maximize calculator" }).click(); await expect(dialog).not.toHaveAttribute("aria-modal", "true");
  await page.getByRole("button", { name: "Restore calculator size" }).click(); await dock(page); await expect(page.getByRole("complementary", { name: "Karman calculator", exact: true })).toBeVisible(); await expect(region).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 }); await expect(dialog).toHaveAttribute("aria-modal", "true"); await expect(region).toBeVisible(); });
```

- [ ] **Step 2: Run them and see them fail** — `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/quiz-dock.spec.ts`; Expected: FAIL (the workspace and the daily content column do not shift, the dock ignores `dockTop`, the splitter does not drag).
- [ ] **Step 3: Implement** the produced behaviour.
- [ ] **Step 4: Run them and see them pass** — same command, then `npx vitest run src/components/calculator`; Expected: PASS (6 browser tests, then every jsdom test).
- [ ] **Step 5: Commit** — `git add src/components/calculator/CalculatorWindow.tsx src/components/calculator/CalculatorWindow.module.css src/components/calculator/CalculatorScope.tsx src/components/learn/DailyChallenge.tsx tests/calculator/v2/quiz-dock.spec.ts && git commit -m "Dock the v2 calculator with a splitter and keep window geometry for the page session"`

### Task 11: Lazy loading and failure panels in the browser

**Files:** Test `tests/calculator/v2/quiz-loading.spec.ts` (extend; task 7 created it with AR-56; a failure is fixed in `CalculatorLoader.tsx` or `CalculatorScope.tsx` within this task).

**Interfaces:** Consumes `quiz-helpers.ts` (task 7); `data-calculator-host`.

- [ ] **Step 1: Write the tests**

```
test("AR-30 no v2 module loads on a fresh v2 page, a Reading page or a v1 page; pointer-enter and focus on the trigger prefetch", async ({ page }, info) => { test.skip(/ios|android/.test(info.project.name), "hover and focus prefetch need a fine pointer"); const urls = v2Requests(page); const requested = () => urls.some((u) => u.includes("/calculator-v2/host/quiz-host"));
  await page.goto("/?flow=practice&calc=v2"); await page.waitForLoadState("networkidle"); expect(urls).toEqual([]);
  await page.goto("/?flow=practice&calc=v2&subject=reading"); await page.waitForLoadState("networkidle"); expect(urls).toEqual([]);
  await page.goto("/?flow=practice"); await trigger(page).click(); await expect(page.getByRole("button", { name: "Paste math" })).toBeVisible(); expect(urls).toEqual([]);
  await page.goto("/?flow=practice&calc=v2"); await trigger(page).hover(); await expect.poll(requested).toBe(true);
  urls.length = 0; await page.goto("/?flow=diagnostic&calc=v2"); await trigger(page).focus(); await expect.poll(requested).toBe(true); });
test("AR-31 a failed chunk shows the reload panel, stays failed for the page and recovers after Reload page (OI-28)", async ({ page }) => { const hostModule = /\/calculator-v2\/host\/quiz-host\.ts/; await page.route(hostModule, (route) => route.abort()); await page.goto("/?flow=diagnostic&calc=v2");
  const open = () => (phoneSized(page) ? side(page) : trigger(page)).click(); const panel = page.getByText("The calculator could not load. Reload the page to try again.");
  await open(); await expect(panel).toBeVisible(); await page.getByRole("button", { name: "Close calculator", exact: true }).click(); await open(); await expect(panel).toBeVisible();
  await page.unroute(hostModule); await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Reload page" }).click()]); await open(); await expect(row(page)).toBeVisible(); });
test("AR-31 a mount failure shows Retry, which mounts from the module already loaded (OI-28)", async ({ page }) => { await page.addInitScript(() => { let failed = false; const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init) { if (!failed && this.hasAttribute("data-calculator-host")) { failed = true; throw new Error("fixture mount failure"); } return attach.call(this, init); }; });
  let requests = 0; page.on("request", (r) => { if (r.url().includes("/calculator-v2/host/quiz-host")) requests++; });
  await page.goto("/?flow=diagnostic&calc=v2"); await (phoneSized(page) ? side(page) : trigger(page)).click(); await expect(page.getByText("The calculator could not load.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click(); await expect(row(page)).toBeVisible(); expect(requests).toBe(1); });
```

- [ ] **Step 2: Run them** — `npm run test:calculator -- --project=calculator-chrome --project=calculator-safari --project=calculator-ios tests/calculator/v2/quiz-loading.spec.ts -g "AR-30|AR-31"`; Expected: PASS on first run (AR-30 and AR-31 were first seen failing in tasks 6 and 4, and tasks 4 and 6 built the behaviour); a failure is fixed here, never by loosening an assertion.
- [ ] **Step 3: Commit** — `git add tests/calculator/v2/quiz-loading.spec.ts src/components/calculator && git commit -m "Verify v2 lazy loading and failure panels in the browser"`

### Task 12: Per-question reset

**Files:** Modify `src/components/calculator/CalculatorScope.tsx` (`announceReset`); `tests/calculator/v2/quiz-reset.spec.ts` (extend; task 7 created it with RC-21, NM-24 and AR-59).

**Interfaces:** Consumes: `globalThis.__calculatorHarness`, `globalThis.__karmanCalculatorCounters`, `DEFAULT_SETTINGS` (07); `globalThis.__calculatorWindowStore` (task 7); `RUNAWAY` (task 7's helpers). Produces: `announceReset` = the `open` value the scope had at mount (`useState(() => open)[0]`): true exactly when the lifted open state carried an open window into this question (OI-3).

- [ ] **Step 1: Write the failing tests** (the second AR-61 test is Review Focus 2; the imports gain `DEFAULT_SETTINGS` from `../../../src/lib/calculator-v2/core/api/types` and `RUNAWAY` from `./quiz-helpers`)

```
const status = (page: Page) => page.locator("[data-calculator-host]").getByRole("status"); const counters = (page: Page) => page.evaluate(() => globalThis.__karmanCalculatorCounters);
test("AR-58, S-9 a new question's calculator starts blank with every per-question setting at its default, the keypad included, and announces the reset once, only while open", async ({ page }) => {
  await page.addInitScript(() => { const g = globalThis as { resetAnnouncements?: number }; g.resetAnnouncements = 0; const attach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init) { const root = attach.call(this, init); let on = false; new MutationObserver(() => { const now = [...root.querySelectorAll("[role=status]")].some((el) => el.textContent === "Calculator cleared for this question."); if (now && !on) g.resetAnnouncements!++; on = now; }).observe(root, { subtree: true, childList: true, characterData: true }); return root; }; });
  await open(page); await setRows(page, [{ id: "1", latex: "a=5" }, { id: "2", latex: "f(x)=x^{2}" }]);
  await page.evaluate(() => { const e = globalThis.__calculatorHarness!.engine; e.updateSettings({ angleMode: "degrees", complex: true, showGrid: false, polarGrid: true, minorGridlines: false, arrows: true, axisNumbers: false, keypad: true }); e.setMathBounds({ left: -1, right: 1, bottom: -1, top: 1 }); });
  await press(page, "Skip this question"); await expect(status(page)).toHaveText("Calculator cleared for this question."); const s = await snapshot(page);
  expect(s.state.expressions.map((e) => e.latex ?? "")).toEqual([""]); expect(s.canUndo).toBe(false); expect(s.geometry).toBe(0); expect(s.state.settings).toEqual(DEFAULT_SETTINGS); // keypad false: K-2's fine-pointer default
  expect(s.state.mode).toBe("graphing"); expect([s.state.viewport.left, s.state.viewport.right]).toEqual([-10, 10]);
  expect(await page.evaluate(() => (globalThis as unknown as { __calculatorWindowStore: { get(): object } }).__calculatorWindowStore.get())).toMatchObject({ displaySize: null, reverseContrast: null });
  await page.getByRole("button", { name: "Close calculator", exact: true }).click(); await press(page, "Previous"); await trigger(page).click(); await expect(row(page)).toBeVisible(); await page.waitForTimeout(800); await expect(status(page)).toHaveText("");
  expect(await page.evaluate(() => (globalThis as { resetAnnouncements?: number }).resetAnnouncements)).toBe(1); });
test("AR-61 twenty question changes with the calculator opened each time leave one live calculator and one live worker", async ({ page }) => { await open(page); for (let i = 0; i < 20; i++) { await press(page, i % 2 ? "Previous" : "Skip this question"); if (!(await page.locator("[data-calculator-window]").isVisible())) await trigger(page).click(); await expect(row(page)).toBeVisible(); } const c = await counters(page); expect(c?.calculators).toBe(1); expect(c?.workers).toBeLessThanOrEqual(1); });
test("AR-61 five question changes in one second leave one calculator and no stale output", async ({ page }) => { const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  const burst = async (first: "Skip this question" | "Previous") => { const other = first === "Previous" ? "Skip this question" : "Previous"; for (let i = 0; i < 5; i++) await press(page, i % 2 ? other : first); };
  await page.setViewportSize({ width: 1280, height: 800 }); await page.route(/\/calculator-v2\/host\/quiz-host\.ts/, async (route) => { await new Promise((r) => setTimeout(r, 800)); await route.continue(); });
  await page.goto("/?flow=diagnostic&calc=v2"); await trigger(page).click(); await burst("Skip this question"); await expect(row(page)).toBeVisible();
  await setRows(page, [{ id: "1", latex: RUNAWAY }]); await burst("Previous"); await page.waitForTimeout(2500); const c = await counters(page); const s = await snapshot(page);
  expect(c?.calculators).toBe(1); expect(c?.workers).toBeLessThanOrEqual(1); expect(s.rows.map((r) => r.latex)).toEqual([""]); expect(s.geometry).toBe(0);
  await expect(status(page)).toHaveText(/^(Calculator cleared for this question\.)?$/); expect(errors).toEqual([]); });
```

- [ ] **Step 2: Run them and see them fail** — `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/quiz-reset.spec.ts -g "AR-58|AR-61"`; Expected: FAIL on AR-58 only (no "Calculator cleared for this question." while `announceReset` is false); the AR-61 tests pass on 10's `setBlank()` and task 4's disposal (AR-61 was first seen failing in task 4's jsdom test), and any that fails is fixed in this task.
- [ ] **Step 3: Implement** `announceReset` as produced.
- [ ] **Step 4: Run them and see them pass** — `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/quiz-reset.spec.ts`; Expected: PASS (6 tests).
- [ ] **Step 5: Commit** — `git add src/components/calculator/CalculatorScope.tsx tests/calculator/v2/quiz-reset.spec.ts && git commit -m "Announce the per-question reset when the v2 window stays open"`

### Task 13: Window chrome contrast and theme (contributions)

**Files:** Create `tests/calculator/v2/quiz-chrome-theme.spec.ts` (a failure is fixed in `CalculatorWindow.module.css`).

**Interfaces:** Consumes `quiz-helpers.ts` (task 7); `SKIN_IDS` (`src/lib/calculator-v2/theme/skins.ts`) and `contrastRatio(foreground: string, background: string): number` (`src/lib/calculator-v2/theme/contrast.ts`, 03); `readFileSync` from `node:fs`.

- [ ] **Step 1: Write the tests**

```
const hex = (css: string) => `#${css.match(/[\d.]+/g)!.slice(0, 3).map((n) => Math.round(Number(n)).toString(16).padStart(2, "0")).join("")}`;
const styleOf = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => { const s = getComputedStyle(el); return { color: s.color, background: s.backgroundColor }; });
const setSkin = (page: Page, skin: string) => page.evaluate((s) => document.documentElement.setAttribute("data-theme", s), skin); const barColour = async (page: Page) => hex((await styleOf(page, "[data-calculator-titlebar]")).background);
async function ring(page: Page, skin: string, name: string, role: "button" | "separator" = "button") { await page.keyboard.press("Shift"); await page.getByRole(role, { name, exact: true }).focus(); // TH-14 on the focused element itself
  const f = await page.evaluate(() => { const s = getComputedStyle(document.activeElement!); return { outline: [s.outlineStyle, s.outlineWidth, s.outlineOffset], colour: s.outlineColor }; });
  expect(f.outline, `${skin} ${name}`).toEqual(["solid", "2px", "2px"]); expect(contrastRatio(hex(f.colour), await barColour(page)), `${skin} ${name}`).toBeGreaterThanOrEqual(3); }
test("TH-1, TH-14 window chrome, every title-bar control, the move handle, grip, splitter and loader keep 7:1 text, 3:1 boundaries and a 2 px 3:1 focus outline in all 12 skins", async ({ page, context }, info) => { chromeOnly(info.project.name); await openV2(page, "diagnostic", { width: 1280, height: 800 }); const loading = await context.newPage(); await loading.route(/\/calculator-v2\/host\/quiz-host\.ts/, () => {});
  await loading.goto("/?flow=diagnostic&calc=v2"); await trigger(loading).click(); await expect(loading.getByText("Loading calculator…")).toBeVisible();
  for (const skin of SKIN_IDS) { await setSkin(page, skin); await setSkin(loading, skin); const bar = await barColour(page);
    for (const sel of ["[aria-roledescription='move handle']", "[aria-label='Close calculator']", "[aria-label='Maximize calculator']", "[aria-label='Minimize calculator']"]) expect(contrastRatio(hex((await styleOf(page, sel)).color), bar), `${skin} ${sel}`).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(hex((await styleOf(page, "[aria-roledescription='resize handle']")).color), bar), skin).toBeGreaterThanOrEqual(3);
    const panel = await styleOf(loading, "[role=status]:has-text('Loading calculator…')"); expect(contrastRatio(hex(panel.color), hex(panel.background)), skin).toBeGreaterThanOrEqual(7);
    for (const name of ["Karman calculator", "Maximize calculator", "Minimize calculator", "Close calculator", "Resize calculator"]) await ring(page, skin, name); }
  await dock(page); for (const skin of SKIN_IDS) { await setSkin(page, skin); expect(contrastRatio(hex((await styleOf(page, "[role=separator]")).color), await barColour(page)), skin).toBeGreaterThanOrEqual(3); await ring(page, skin, "Undock calculator"); await ring(page, skin, "Resize calculator dock", "separator"); }
  await page.getByRole("button", { name: "Maximize calculator" }).click(); for (const skin of SKIN_IDS) { await setSkin(page, skin); await ring(page, skin, "Restore calculator size"); } });
test("TH-2, AR-37 window chrome, splitter, grip and loader take only --kcc-* colours and repaint on a data-theme change", async ({ page }, info) => { chromeOnly(info.project.name); const css = readFileSync("src/components/calculator/CalculatorWindow.module.css", "utf8"); expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|color-mix\(/);
  expect([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]).filter((v) => !v.startsWith("--kcc-"))).toEqual([]); await openV2(page, "diagnostic", { width: 1280, height: 800 }); const seen: string[] = [];
  for (const skin of ["ivory", "observatory"]) { await setSkin(page, skin);
    const [bar, token] = await page.evaluate(() => [getComputedStyle(document.querySelector("[data-calculator-titlebar]")!).backgroundColor, getComputedStyle(document.documentElement).getPropertyValue("--kcc-chrome").trim()]);
    expect(hex(bar)).toBe(token.toLowerCase()); seen.push(bar); }
  expect(seen[0]).not.toBe(seen[1]); });
```

- [ ] **Step 2: Run them** — `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/quiz-chrome-theme.spec.ts`; Expected: PASS on first run (03's generated sheet supplies every colour); a failure is fixed in `CalculatorWindow.module.css`.
- [ ] **Step 3: Commit** — `git add tests/calculator/v2/quiz-chrome-theme.spec.ts src/components/calculator/CalculatorWindow.module.css && git commit -m "Check v2 window chrome contrast, focus outlines and theme repaint in all 12 skins"`

### Task 14: Bundle check and baseline (AR-32, AR-33, AR-66 discovery)

**Files:** Create `scripts/build/check-calculator-v2-bundle.mjs`, `docs/calculator-v2-bundle-baseline.json`. Test: `tests/unit/calculator-v2/bundle-check.test.ts` (extend).

**Interfaces:** Consumes: task 1's parsers; `KARMAN_CALCULATOR_SENTINEL` (10); `WORKER_MARKER` (07). Produces: section 16 `EAGER_ROUTES`, `BUDGETS`, `BundleBaseline`, `BundleReport`, `checkBundle(options: { root: string; baseline: BundleBaseline }): Promise<BundleReport>` with its rules in order, plus `formatBaseline(baseline: BundleBaseline): Promise<string>` (Prettier API, repo config, parser `json`). Gzip size is `zlib.gzipSync(buffer, { level: 9 }).length`. The lazy group is the first group from `parseAsyncChunkGroups` over the eager JS files of `EAGER_ROUTES` whose files contain the sentinel; `lazyGzipBytes` sums its files minus worker files and fonts; `workerGzipBytes` sums the bootstrap and its chunks; `static/media/**` is never read; `eagerAddedGzipBytes[route]` is the route's eager gzip sum minus `base.eagerGzipBytes[route]`. Growth rule (AR-33 as written, with no small-value exemption): a measured field (each route of `eagerAddedGzipBytes`, `lazyGzipBytes`, `workerGzipBytes`) fails when `measured - committed > 0.1 * Math.abs(committed)`, so growth from a committed 0 fails, and a negative eager delta is compared by its size; the field is named `eagerAddedGzipBytes[<route>]`, `lazyGzipBytes` or `workerGzipBytes`. Level-9 gzip of identical bytes is identical, so an unchanged build never trips it. Problem texts (exact): `AR-32 positive control: no lazy chunk group contains karman-calculator-v2:lazy-chunk and mq-root-block`; `AR-32 <string> found in <path relative to root>`; `AR-32 <string> found in eager file <file> of <route>`; `AR-66 worker call not found in the lazy chunk group`; `AR-66 worker file <file> missing`; `AR-66 no worker chunk contains karman-compute-v1`; `AR-33 <route>: <n> gzip bytes added eagerly, budget 10240`; `AR-33 lazy chunk group: <n> gzip bytes, budget 409600`; `AR-33 worker: <n> gzip bytes, budget 256000`; `AR-33 <field> grew to <n> from <b> (over 10%); update docs/calculator-v2-bundle-baseline.json in this PR with --update-baseline`. CLI (reads `<cwd>/.open-next`, exit 1 printing problems): `--record-base <dir>` writes a complete `BundleBaseline` whether or not the file exists (`next: "16.3.8"`, `base: { commit: "08c8c76", eagerGzipBytes }` measured from `<dir>/.open-next`, every `eagerAddedGzipBytes` route `0`, `lazyGzipBytes: 0`, `workerGzipBytes: 0`, `standaloneGzipBytes: null`, `perf: null`; placeholders, never checked), and `--update-baseline` must run next, before any plain check; `--update-baseline` applies every rule except growth (the update is the "same PR updates that file" case), exits 1 without writing when one fails, and otherwise keeps `next`, `base`, `standaloneGzipBytes` and `perf` and writes the measured values; both write through `formatBaseline`.

- [ ] **Step 1: Write the failing tests.** The test file's `syntheticBuild(edit?: (files: Map<string, string>) => void): string` writes a temp dir holding, per `EAGER_ROUTES` entry, `.open-next/server-functions/default/.next/server/app<route>_client-reference-manifest.js` (the recorded manifest with `/turbopack-probe/page` replaced by the route), and under `.open-next/assets/_next/`: every `expected.eagerFiles` path (`async-import.txt` at `expected.probeChunk`, `/* eager */` otherwise), the `expected.asyncChunkGroups[0]` files (the first holds `worker-call.txt` plus the sentinel, the last also `mq-root-block`), the worker bootstrap (`/* bootstrap */`), its chunks (the last holds `karman-compute-v1`) and `static/media/compute.worker.0.ts` holding `karman-compute-v1`; `edit` changes the map before writing. `lax(root)` sets `base.eagerGzipBytes` to that build's own eager sums, so `eagerAddedGzipBytes` starts at 0 whatever the size of the recorded probe chunk; a test that grows an eager file measures against `lax` of a clean build.

```
const routes = (n: number) => Object.fromEntries(EAGER_ROUTES.map((r) => [r, n])); const noise = (bytes: number) => randomBytes(bytes).toString("base64"); const asset = (file: string) => `.open-next/assets/_next/${file}`;
const gz = (root: string, file: string) => gzipSync(readFileSync(join(root, asset(file))), { level: 9 }).length; const manifestOf = (root: string, route: string) => readFileSync(join(root, `.open-next/server-functions/default/.next/server/app${route}_client-reference-manifest.js`), "utf8");
const lax = (root: string): BundleBaseline => ({ next: "16.3.8", base: { commit: "08c8c76", eagerGzipBytes: Object.fromEntries(EAGER_ROUTES.map((r) => [r, eagerFiles(manifestOf(root, r), r).reduce((n, f) => n + gz(root, f), 0)])) }, eagerAddedGzipBytes: routes(1e9), lazyGzipBytes: 1e9, workerGzipBytes: 1e9, standaloneGzipBytes: null, perf: null });
const problems = async (root: string, baseline = lax(root)) => (await checkBundle({ root, baseline })).problems; const eagerJs = () => expected.eagerFiles.find((f: string) => f.endsWith(".js"));
it("AR-32 a clean build passes, adds nothing eagerly and the lazy group is found by its sentinel", async () => { const root = syntheticBuild(); const report = await checkBundle({ root, baseline: lax(root) }); expect(report.problems).toEqual([]); expect(report.worker).toEqual(expected.workerCall); expect(report.measured.eagerAddedGzipBytes).toEqual(routes(0)); });
it("AR-32 the positive control fails when no lazy group holds the sentinel and mq-root-block", async () => { const root = syntheticBuild((f) => { for (const [k, v] of f) f.set(k, v.replaceAll("karman-calculator-v2:lazy-chunk", "")); });
  expect(await problems(root)).toContain("AR-32 positive control: no lazy chunk group contains karman-calculator-v2:lazy-chunk and mq-root-block"); });
it("AR-32 the sentinel or mq-root-block in the server handler or an eager file fails", async () => { const root = syntheticBuild((f) => { f.set(".open-next/server-functions/default/handler.mjs", "karman-calculator-v2:lazy-chunk"); f.set(asset(eagerJs()), `${f.get(asset(eagerJs()))}mq-root-block`); });
  const found = await problems(root); expect(found).toContain("AR-32 karman-calculator-v2:lazy-chunk found in .open-next/server-functions/default/handler.mjs");
  expect(found).toContain(`AR-32 mq-root-block found in eager file ${eagerJs()} of /diagnostic/page`); });
it("AR-33 each gzip budget fails above its limit", async () => { const [lazy, chunk] = [expected.asyncChunkGroups[0][0], expected.workerCall.chunks[0]]; const root = syntheticBuild((f) => { f.set(asset(eagerJs()), f.get(asset(eagerJs())) + noise(12_000)); f.set(asset(lazy), f.get(asset(lazy)) + noise(420_000)); f.set(asset(chunk), noise(270_000)); });
  const text = (await problems(root, lax(syntheticBuild()))).join("\n"); expect(text).toMatch(/^AR-33 \/diagnostic\/page: \d+ gzip bytes added eagerly, budget 10240$/m);
  expect(text).toMatch(/^AR-33 lazy chunk group: \d+ gzip bytes, budget 409600$/m); expect(text).toMatch(/^AR-33 worker: \d+ gzip bytes, budget 256000$/m); });
it("AR-33 growth over 10% fails until the baseline is updated, from a committed 0 and from a negative eager delta too", async () => { const lazy = expected.asyncChunkGroups[0][0]; const root = syntheticBuild((f) => f.set(asset(lazy), f.get(asset(lazy)) + noise(4_000)));
  const measured = (await checkBundle({ root, baseline: lax(root) })).measured; const text = async (patch: Partial<BundleBaseline>) => (await problems(root, { ...lax(root), ...measured, ...patch })).join("\n");
  expect(await text({ lazyGzipBytes: Math.floor(measured.lazyGzipBytes / 1.2) })).toMatch(/^AR-33 lazyGzipBytes grew to \d+ from \d+ \(over 10%\); update docs\/calculator-v2-bundle-baseline\.json in this PR with --update-baseline$/m); expect(await text({})).toBe("");
  expect(await text({ workerGzipBytes: 0 })).toMatch(/^AR-33 workerGzipBytes grew to \d+ from 0 \(over 10%\)/m); expect(await text({ eagerAddedGzipBytes: { ...measured.eagerAddedGzipBytes, "/diagnostic/page": -100 } })).toContain("AR-33 eagerAddedGzipBytes[/diagnostic/page] grew to 0 from -100 (over 10%)"); });
it("AR-66 a missing bootstrap or a missing worker marker fails and static/media .ts copies are ignored", async () => { expect(await problems(syntheticBuild((f) => f.delete(asset(expected.workerCall.bootstrap))))).toContain(`AR-66 worker file ${expected.workerCall.bootstrap} missing`);
  expect(await problems(syntheticBuild((f) => f.set(asset(expected.workerCall.chunks.at(-1)), "/* chunk */")))).toContain("AR-66 no worker chunk contains karman-compute-v1"); });
it("AR-33 the committed baseline is script-formatted, pinned to Next 16.3.8 and covers every eager route", async () => { const text = readFileSync("docs/calculator-v2-bundle-baseline.json", "utf8"); const baseline = JSON.parse(text); const sorted = [...EAGER_ROUTES].sort();
  expect([baseline.next, baseline.base.commit]).toEqual(["16.3.8", "08c8c76"]); expect(Object.keys(baseline.base.eagerGzipBytes).sort()).toEqual(sorted);
  expect(Object.keys(baseline.eagerAddedGzipBytes).sort()).toEqual(sorted); expect(await formatBaseline(baseline)).toBe(text); });
```

- [ ] **Step 2: Run them and see them fail** — `npx vitest run tests/unit/calculator-v2/bundle-check.test.ts`; Expected: FAIL, `check-calculator-v2-bundle.mjs` not found.
- [ ] **Step 3: Implement `scripts/build/check-calculator-v2-bundle.mjs`** with the produced contract (JSDoc-typed). The CLI runs only when the file is the process entry (`process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href`); importing the module has no side effects.
- [ ] **Step 4: Record the baseline from real builds** (a value over its budget is a defect in the eager or lazy graph to fix, never a baseline update):

```sh
git worktree add ../calculator-v2-base 08c8c76 && (cd ../calculator-v2-base && n exec 22 npm install --no-audit --no-fund && n exec 22 npm run cf:build)
n exec 22 node scripts/build/check-calculator-v2-bundle.mjs --record-base ../calculator-v2-base   # writes the full file with zeroed measured fields
n exec 22 npm run cf:build && n exec 22 node scripts/build/check-calculator-v2-bundle.mjs --update-baseline && n exec 22 node scripts/build/check-calculator-v2-bundle.mjs   # exit 0
git worktree remove --force ../calculator-v2-base
```

- [ ] **Step 5: Run the tests and see them pass** — the step 2 command; Expected: PASS.
- [ ] **Step 6: Commit** — `git add scripts/build docs/calculator-v2-bundle-baseline.json tests/unit/calculator-v2 && git commit -m "Check the v2 bundle boundary, budgets and worker output after cf:build"`

### Task 15: Preview worker check, release script and CI (AR-66, resolves OI-29)

**Files:** Create `playwright.cf-preview.config.ts`, `tests/cf-preview/worker.spec.ts`, `scripts/calculator-v2/release.sh` (mode 755). Modify `.github/workflows/ci.yml`, `.github/pull_request_template.md:26` (its rollback line names `cf:deploy`), `docs/superpowers/specs/calculator-v2/d-architecture-integration.md` (AR-33, AR-43, AR-66). Read: `docs/superpowers/specs/calculator-v2/open-items.md`. Test: `tests/unit/calculator-v2/bundle-check.test.ts` (extend).

**Interfaces:** Consumes: `checkBundle` (task 14), `workerUrl` (task 1); the section 7 protocol messages. Produces: `scripts/calculator-v2/release.sh` exactly as `01-interfaces-integration.md` section 16 shows it (its last two lines read the secret list into `secrets` and `grep -q` it with a here-string, never a pipe); `playwright.cf-preview.config.ts` with section 16's fields, including `use.baseURL` (`http://localhost:8787`, so `page.goto("/")` resolves); `ci.yml` with `on.pull_request.branches: [main, zakaria/calculator-regression-release]` and a `build`-job step `node scripts/build/check-calculator-v2-bundle.mjs` right after `npm run cf:build`.

- [ ] **Step 0: Confirm the owner accepted OI-29** (decision cell as in task 4 step 0) — `grep -nE '^\| OI-29 .*\| (accepted|amended) [0-9]{4}-[0-9]{2}-[0-9]{2}' docs/superpowers/specs/calculator-v2/open-items.md`; Expected: exactly one line. No line (no row, a rejection, or no decision cell): stop, do not start this task, and tell the lead (`00-index.md` section 6.2: a rejected OI-29 is re-planned).
- [ ] **Step 1: Apply OI-29 to the spec** (`d-architecture-integration.md`) with the fix text recorded in that row, which is `00-index.md` section 6.2's proposed fix quoted below (if the recorded decision amends the wording, apply the recorded wording instead). In AR-43, right after the `new Worker(…)` code span that ends with `{ type: "module", name: "karman-calculator" })`, insert a space and ``(a module worker under Vite and esbuild; Turbopack emits a classic bootstrap worker that loads the worker chunks); the worker's `ready` message carries `worker: "karman-compute-v1"`, which identifies its code in build output``. In AR-66 replace ``the emitted worker file is found under `.open-next/assets/_next/static/`, and a Playwright test against `npm run cf:preview` constructs that worker by URL on the preview origin with the same options as `create.ts` `` with ``the emitted worker (the Turbopack bootstrap named by the lazy chunk's worker call and the chunks it loads, one of which contains `karman-compute-v1`) is found under `.open-next/assets/_next/static/`, and a Playwright test against `npm run cf:preview` constructs it on the preview origin the way the Turbopack runtime does (a classic worker on the bootstrap URL carrying its chunk list, named `karman-calculator`)``. In AR-33, after `worker at most 250 KB` insert a space and `(the bootstrap plus the chunks it loads)`. Run `npx prettier --write` on the file.
- [ ] **Step 2: Write the failing tests** (unit tests in `bundle-check.test.ts`; the spec in `tests/cf-preview/worker.spec.ts` collects errors only from the worker's creation, so it does not depend on server secrets the local preview lacks)

```
it("AR-66 release.sh is the only deploy path, runs the checks between cf:build:release and cf:deploy and reads the secret list without a pipe", () => { const script = readFileSync("scripts/calculator-v2/release.sh", "utf8"); const at = ["set -euo pipefail", "npm run cf:build:release", "node scripts/build/check-calculator-v2-bundle.mjs", "npx playwright test --config=playwright.cf-preview.config.ts", "npm run cf:deploy", "npx wrangler secret list"].map((s) => script.indexOf(s));
  expect(at.every((p, i) => p >= 0 && (i === 0 || p > at[i - 1]))).toBe(true); expect(statSync("scripts/calculator-v2/release.sh").mode & 0o111).not.toBe(0); expect(script).toContain(`grep -q '"CALCULATOR_V2_ROLLOUT"' <<<"$secrets"`); expect(script).not.toMatch(/secret list\s*\|/);
  expect(execSync("git grep -l -e cf:deploy -- scripts .github", { encoding: "utf8" }).trim().split("\n")).toEqual(["scripts/calculator-v2/release.sh"]); });
it("AR-66 CI runs for pull requests to the release branch and checks the bundle after cf:build", () => { const ci = readFileSync(".github/workflows/ci.yml", "utf8"); expect(ci).toContain("branches: [main, zakaria/calculator-regression-release]"); expect(ci.indexOf("node scripts/build/check-calculator-v2-bundle.mjs")).toBeGreaterThan(ci.indexOf("npm run cf:build")); });
// ---- tests/cf-preview/worker.spec.ts
test("AR-66 the built Turbopack worker starts on the cf:preview origin and plots y=x^2", async ({ page }) => { const report = await checkBundle({ root: process.cwd(), baseline: JSON.parse(readFileSync("docs/calculator-v2-bundle-baseline.json", "utf8")) }); expect(report.problems).toEqual([]); expect(report.worker).not.toBeNull();
  await page.goto("/"); await page.waitForLoadState("load"); const errors: string[] = []; page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); }); page.on("pageerror", (e) => errors.push(e.message));
  const result = await page.evaluate((url) => new Promise<{ ready: unknown; kind: string; floats: number }>((resolve, reject) => {
    const worker = new Worker(url, { name: "karman-calculator" }); const seen: unknown[] = []; const timer = setTimeout(() => reject(new Error("no plot")), 15_000); worker.onerror = (e) => reject(new Error(e.message));
    worker.onmessage = ({ data }) => { seen.push(data);
      if (data.type === "ready") { worker.postMessage({ v: 1, type: "state", generation: 1, rows: [{ id: "1", type: "expression", latex: "y=x^{2}", columns: null, hidden: false, sliderBounds: null }], settings: { angleMode: "radians", complex: false }, sliders: {} });
        worker.postMessage({ v: 1, type: "view", generation: 2, viewport: { left: -10, right: 10, bottom: -7.5, top: 7.5 }, size: { width: 800, height: 600 }, dpr: 1 }); }
      if (data.type === "plot" && data.generation === 2) { clearTimeout(timer); worker.terminate(); resolve({ ready: seen[0], kind: data.geometry.kind, floats: data.geometry.polylines.length }); } }; // an earlier plot at the state's generation 1 is ignored
    worker.postMessage({ v: 1, type: "hello", seed: 1 }); }), workerUrl(new URL(page.url()).origin, report.worker!));
  expect(result).toMatchObject({ ready: { v: 1, type: "ready", worker: "karman-compute-v1" }, kind: "curve" }); expect(result.floats).toBeGreaterThan(0); expect(errors).toEqual([]); });
```

- [ ] **Step 3: Run them and see them fail** — `npx vitest run tests/unit/calculator-v2/bundle-check.test.ts -t "AR-66 release|AR-66 CI"`; Expected: FAIL (`release.sh` missing; `ci.yml` lists only `main`).
- [ ] **Step 4: Implement** the produced files and edits; `chmod 755 scripts/calculator-v2/release.sh`; in `.github/pull_request_template.md` replace `- "git revert this commit + npm run cf:deploy" is the default.` with ``- "git revert this commit + scripts/calculator-v2/release.sh" is the default; `printf off | npx wrangler secret put CALCULATOR_V2_ROLLOUT` switches calculator v2 off without a deploy.``, so `cf:deploy` appears nowhere outside `release.sh`. Then `git add scripts/calculator-v2/release.sh .github` (`git grep` searches only tracked files, so the new script must be staged before step 5).
- [ ] **Step 5: Run them and see them pass** — the step 3 command, then `n exec 22 npm run cf:build && n exec 22 npx playwright test --config=playwright.cf-preview.config.ts`; Expected: PASS (nothing deploys).
- [ ] **Step 6: Commit** — `git add -A playwright.cf-preview.config.ts tests scripts .github docs/superpowers/specs && git commit -m "Construct the built worker on cf:preview and release only checked output (OI-29)"`

### Task 16: Turbopack smoke under next dev

**Files:** Create `playwright.calculator-v2-e2e.config.ts` (section 16 contract), `tests/e2e/calculator-v2-smoke.spec.ts`.

**Interfaces:** Consumes the seeded `dev_seed_admin`, `CALCULATOR_V2_ROLLOUT=admins` from the config's `webServer.env`, the practice route of `tests/e2e/local-quiz-audit.spec.ts`, and `.env.local` copied from the main checkout without `CALCULATOR_V2_ROLLOUT`.

- [ ] **Step 1: Write the failing tests**

```
const trigger = (page: Page) => page.getByRole("button", { name: "Toggle Karman calculator", exact: true }); const row = (page: Page) => page.getByRole("textbox", { name: "Expression 1", exact: true });
async function openPractice(page: Page) { await page.goto("/learn/math"); const consent = page.getByRole("dialog", { name: /Help us debug/i }); if (await consent.isVisible()) await consent.getByRole("button", { name: "Decline" }).click(); if (!(await page.getByRole("button", { name: "Start Quiz" }).isVisible())) await page.getByRole("button", { name: "Linear equations (one variable)" }).first().click();
  await page.getByRole("button", { name: "Start Quiz" }).first().click(); await expect(trigger(page)).toBeVisible(); }
const failOneMount = () => { let failed = false; const attach = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) { if (!failed && this.hasAttribute("data-calculator-host")) { failed = true; throw new Error("smoke mount failure"); } return attach.call(this, init); }; };
test("AR-65 practice opens v2 under Turbopack, types and graphs y=x^2 with the worker loaded from /_next/ and a KaTeX_Math face loaded", async ({ page }) => { const errors: string[] = []; const failedFonts: string[] = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("requestfailed", (r) => { if (/\.woff2/.test(r.url())) failedFonts.push(r.url()); });
  await openPractice(page); const worker = page.waitForEvent("worker"); await trigger(page).click(); await row(page).click(); await page.keyboard.type("y=x^2");
  expect(new URL((await worker).url()).pathname.startsWith("/_next/")).toBe(true);
  await expect.poll(() => page.evaluate(() => globalThis.__calculatorHarness?.engine.getSnapshot().geometry.get("1")?.kind)).toBe("curve");
  expect(await page.evaluate(() => globalThis.__calculatorHarness!.engine.getExpressions()[0].latex)).toBe("y=x^{2}");
  expect(await page.evaluate(() => [...document.fonts].some((f) => f.family.replace(/"/g, "") === "KaTeX_Math" && f.status === "loaded"))).toBe(true); expect(failedFonts).toEqual([]); expect(errors).toEqual([]); });
test("API-15 next dev exposes no calculator globals", async ({ page }) => { await openPractice(page); await trigger(page).click(); await expect(row(page)).toBeVisible(); expect(await page.evaluate(() => ["KarmanCalculator", "karmanCalculator", "MathQuill"].filter((k) => k in window))).toEqual([]); });
test("AR-31 under next dev a blocked chunk shows the reload panel and a mount failure recovers with Retry (OI-28)", async ({ page, context }) => { await openPractice(page); await page.route("**/_next/static/chunks/**", (route) => route.abort()); await trigger(page).click();
  await expect(page.getByText("The calculator could not load. Reload the page to try again.")).toBeVisible();
  const second = await context.newPage(); await second.addInitScript(failOneMount); await openPractice(second); await trigger(second).click();
  await expect(second.getByText("The calculator could not load.", { exact: true })).toBeVisible(); await second.getByRole("button", { name: "Retry" }).click(); await expect(row(second)).toBeVisible(); });
```

- [ ] **Step 2: Run them and see them fail** — stop any `next dev` in the worktree, then `npx playwright test --config=playwright.calculator-v2-e2e.config.ts`; Expected: FAIL, config file not found.
- [ ] **Step 3: Implement** `playwright.calculator-v2-e2e.config.ts` with section 16's fields, including `use.baseURL` (port 3100, `workers: 1`, `globalSetup: "./tests/e2e/global-setup.ts"`, `testMatch: /calculator-v2(-smoke)?\.spec\.ts$/`, `use: { baseURL: "http://localhost:3100" }`, without which `page.goto("/learn/math")` throws an invalid-URL error, because the config sets `webServer.url`).
- [ ] **Step 4: Run them and see them pass** — same command; Expected: PASS (3 tests); `npm run test:e2e` still runs v1 only.
- [ ] **Step 5: Commit** — `git add playwright.calculator-v2-e2e.config.ts tests/e2e/calculator-v2-smoke.spec.ts && git commit -m "Smoke-test v2 under Turbopack next dev, including chunk and mount failures"`

### Package gate

Before handing back: the common checks of `00-index.md` section 3, `npx tsx scripts/calculator-v2/check-spec-ids.mjs --packages 02,03,04,05,06,07,08,09,10,11` (every ID in the "IDs by task" list has a titled test), and `npm run test:calculator` on all five projects. The lead runs the 1A release of `00-index.md` section 1.
