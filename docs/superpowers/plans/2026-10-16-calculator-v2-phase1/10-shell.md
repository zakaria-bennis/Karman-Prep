# 10 shell: KarmanCalculator facade, shadow root, styles, layouts, keyboard and quiz host

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the facade that mounts calculator v2 for increment 1A. `KarmanCalculator` owns an open shadow root and one generated stylesheet. It picks layout L-1 or L-2 from its own width and handles shortcuts, Escape layers, keypad visibility, live theme and motion, failure containment and teardown. `host/quiz-host.ts` is the lazy entry that 11's loader imports.

**Architecture:** `KarmanCalculator` (plain TypeScript) creates the engine (07), the focus controller and escape stack (09), the announcer (05), and a shell store fed by browser watchers for size, theme, motion and pointer. It renders `ErrorBoundary > App` with its own `createRoot` inside the shadow root. `App` provides the five contexts and composes `CalculatorLayout` from 08's `GraphPanel` and 09's `ExpressionPanel`, `Keypad` and `SettingsPopover`. Pure modules in `ui/controller/` hold every decision a unit test can check. Browser specs on `/v2/calculator.html` mount through `mountQuizCalculator` and test the assembled calculator.

**Index:** Tech Stack, Spec, Global Constraints and Review Focus are in `00-index.md`. Contracts are in `01-interfaces-integration.md` section 12, and every name here matches `01-interfaces*.md`. This package owns Review Focus item 5 (Task 10). Code blocks are TypeScript (CSS in Task 6), left unlabelled so Prettier keeps them compact. Paths without a root are under `src/components/calculator-v2/`.

| Key   | Increment | Wave | Depends on (merged) | Open items                 |
| ----- | --------- | ---- | ------------------- | -------------------------- |
| shell | 1A        | 4    | 03, 05, 07, 08, 09  | OI-3, OI-7; proposes OI-31 |

**IDs (27):** NM-29; AR-29, AR-35, AR-36, AR-38, AR-39, AR-40, AR-52, AR-57, AR-60; API-12; L-1, L-2, L-8, L-14; K-2, K-12; S-6; KB-3, KB-7, KB-13; AN-13, AN-14; A11Y-7; TH-14, TH-15, TH-17. Contributions (index section 5.3): AR-32, TH-1, KB-4, A11Y-2; requested by 07 and 09 (their section 5.3 rows): NM-42, R-10 and A11Y-2's keyboard undo and redo case. **Gate checks** (PASS on first run; a failure becomes a fix task reported under R3, as in 15): NM-29, the browser tests of S-6, TH-14, AN-14, AR-38 and AR-60, and the TH-1 and R-10 contributions. S-6, TH-14, AN-14, AR-38 and AR-60 also each have a test that fails first (Tasks 4, 12, 1, 2 and 4). NM-29 has no red step, because its logic is not the shell's: the same-task generation, the discard of superseded messages and the one plot per row per generation are 07's AR-46 code, whose unit tests fail first in 07 Tasks 6, 9, 10 and 11. The shell adds only the assembled path from 09's Settings controls, which works as soon as Task 4 lands.

**Rules**

- R1. Every command runs under Node 22. On this machine, prefix it with `n exec 22`.
- R2. Unit: `npx vitest run <file> -t "<ID>"`. "Browser `-g`" means `npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/shell -g "<ID>"`; the path filter matches all four shell spec files. Add any projects the step names.
- R3. If a shell test fails inside a file another package owns, stop and report the assertion and the owner to the lead. Never edit that file (index section 4).
- R4. Every edit to `styles/base.css` reruns `node scripts/build/calculator-v2.mjs --styles`, and the same commit includes `styles/generated.ts`.
- R5. Browser tests run on all five projects unless they name others. The harness clamps its frame to the viewport (Task 6), so on calculator-android and calculator-ios a `?w=800&h=600` page holds a phone-sized stacked calculator with every control on screen. Spec files under `tests/calculator/v2/`: `shell.spec.ts` (L-, AR-40, AR-60, TH-17, KB-4 and every contribution), `shell-keyboard.spec.ts` (KB-, K-), `shell-motion-theme.spec.ts` (AN-, AR-38, TH-14, TH-15) and `shell-settings.spec.ts` (S-6, NM-29). Node-side helpers live in `shell-helpers.ts`; functions that run in the page (`page.evaluate`, `locator.evaluate`, `addInitScript`) live in `shell-probes.ts`. Each spec file calls `useConsoleGuard()`, which fails a test on any console error or page error. All six files stay under 700 lines.
- R6. "PASS on first run" marks a check of earlier tasks and packages. If it fails, fix the shell code in that task or report it under R3.

**Consumes:** 02 `bumpDevCounter`. 03 `SKIN_IDS`, `SKIN_COLORS`, `contrastRatio`, `resolveSkinId`, `hostThemeCss`, `reportCalculatorError`. 05 `MathField`, `createAnnouncer`, `AnnouncerContext`, `tokens.css`, `vendor/mathquill/mathquill.{css,js}`. 07 `createEngine`, `CalculatorEngine`, `CalculatorOptions`, `KarmanCalculatorError`, `EngineContext`, `useEngineSnapshot`, `SkinContext`, `exposeEngineForTests`, `installDomStubs`, `triggerResize`. 08 `GraphPanel`, `GRAPH_CONTROL_LABELS` (`"Graph settings"`, `"Zoom in"`, `"Zoom out"`, `"Home"`). 09 `ExpressionPanel`, `Keypad`, `SettingsPopover`, `createFocusController`, `FocusContext`, `createEscapeStack`, `EscapeContext`; `performUndo`, `performRedo`, `insertRowBelow` (`ui/list/row-actions.ts`) and `EDITOR_MESSAGES` (`ui/list/messages.ts`) from 09's consumer note 3; the keypad names of 09's consumer note 6 (`ABC`, one name on both pages with `aria-pressed`; `Functions`; `Hide keypad`; `Show keypad`). 02 and 04 `CORPUS`, `evaluateLatex`, `formatValue`.

**Decisions this package makes** (not in `01`):

1. DOM order is list region, graph region, keypad region in both layouts. L-2 places them with CSS grid areas, so switching layouts never remounts a MathField (AR-26). In L-2, Tab reaches the toolbar and rows before the graph controls.
2. The keypad region sits in the normal flow under the list, so the list's scroll box ends at the keypad's top edge. That replaces L-14's "bottom scroll padding equal to the keypad height" with the same visible result. A `ResizeObserver` on the list region scrolls the focused or active row back into view whenever that box changes (keypad open or close, layout or size change), whichever order focus and keypad arrive in (Task 6; index section 7 entry).
3. A student close disarms touch opening until a student open (K-2). K-2 names Hide keypad and the L-2 toggle; this package also counts Ctrl or Alt/Option+K and Escape (09's `keypad` layer reports `onOpenChange(false, "student")`), because each is a deliberate student action. Every `Keypad.onOpenChange(…, "student")` is a student change.
4. Escape is handled in the capture phase on `section.kc-app`. When `handleEscape()` closes a layer, the shell calls `preventDefault()` only (KB-3); it never stops an Escape. The event bubbles to the light-DOM frame (11's `CalculatorWindow`, which stops every key at the frame, KB-6, or the harness frame), which closes the calculator only when `defaultPrevented` is false. That is the last KB-3 layer. Shortcuts get `preventDefault()` and `stopPropagation()`, so MathQuill never sees them.
5. The pointer is coarse when `(any-pointer: coarse)` matches or a touch or pen `pointerdown` reaches the shadow root.
6. AR-35 limits the quiz host to the public API plus `focusBoundary()`. The host also uses three internal channels: `reflow()` (01 section 12, AR-41), `engine` (01 section 12, only for `exposeEngineForTests`, a no-op in production) and `lastFocusedRow(calculator)` (KB-4's reopen row). Task 5's AR-35 test allows exactly these (index section 7 entry).
7. Focus entering the list region closes the settings popover, so a popover never covers the focused row (L-14).

## Notes for the lead

1. Already applied; do not add again. `00-index.md` carries section 7's AR-35 and L-14 entries, section 6.2's OI-31 row, section 2's Owns line with the four shell specs, `shell-helpers.ts`, `shell-probes.ts` and `ui/controller/__fixtures__/`, section 3's `tests/calculator/v2/shell` wave 4 filter, and section 5.3's NM-42, R-10 and A11Y-2 keyboard rows. 01 section 12 declares `lastFocusedRow`. 13's Task 8 Step 4 can use the same filter to run all four shell specs.
2. When appending OI-31 to `open-items.md`, number it `OI-31` and end its row with the owner's decision as one last Decision cell after Proposed fix, in one of three forms: `accepted YYYY-MM-DD`, `amended YYYY-MM-DD: <wording>` or `rejected YYYY-MM-DD` (the form 11 Tasks 4 and 15 check for OI-28 and OI-29). Task 12 Step 1 runs `grep -cE '^\| OI-31 .*\| (accepted|amended) [0-9]{4}-[0-9]{2}-[0-9]{2}' docs/superpowers/specs/calculator-v2/open-items.md` and expects `1`. On a rejection, Task 12 does not start and the lead re-plans 09's row rule as OI-31's row says.

---

### Task 1: Stylesheet pipeline (AR-36, AR-39, AN-14)

**Files:** create `scripts/build/calculator-v2.mjs`, `styles/base.css` and `ui/controller/stylesheet.ts`; generate `styles/generated.ts`; test `ui/controller/stylesheet.test.ts`. **Consumes:** `vendor/mathquill/mathquill.css`, `vendor/mathquill/mathquill.js` and `tokens.css` (05); `graph.css` (08); `list.css`, `keypad.css` and `settings.css` (09). **Produces:** `generateCalculatorStyles`, `CALCULATOR_V2_CSS` and `CALCULATOR_V2_BUILD` (`01` section 12), plus:

```
export function styleSources(root: string): Promise<string[]>;            // calculator-v2.mjs (JSDoc); repo-relative, concatenation order
export function assertShadowSafeCss(file: string, css: string): void;     // throws `${file}: … (AR-36)`
export interface ShadowStyles { setSkinCss(css: string): void; dispose(): void }   // ui/controller/stylesheet.ts
export function installStyles(shadow: ShadowRoot, css: string): ShadowStyles;
```

- [ ] **Step 1: Write the failing tests** (jsdom). `S` is `"src/components/calculator-v2/styles"`. `family(sel)` returns the `font-family` values of the comment-free rules listing `sel`. `shadows(n)` returns `n` fresh open shadow roots.

```
it("AR-36 generated.ts matches a fresh generation and is on the GENERATED list", async () => { expect((await generateCalculatorStyles({ write: false })).changed).toBe(false);
  expect(readFileSync("scripts/check-file-sizes.mjs", "utf8")).toContain(`"${S}/generated.ts"`); });
it("AR-36 sources are MathQuill CSS, tokens, base, then the other styles/*.css sorted", async () => {
  const s = await styleSources(process.cwd()); expect(s.slice(0, 3)).toEqual(["vendor/mathquill/mathquill.css", `${S}/tokens.css`, `${S}/base.css`]);
  expect(s.slice(3)).toEqual([...s.slice(3)].sort()); expect(s).toContain(`${S}/graph.css`); });
it("AR-36 shadow CSS rejects @font-face, url(), Tailwind and CSS-module syntax", () => { for (const css of ["@font-face{}", "a{b:url(x)}", "@tailwind a;", "a{@apply p}", ":global(a){}", "a{composes:b}"])
    expect(() => assertShadowSafeCss("x.css", css)).toThrow(/^x\.css: .*\(AR-36\)$/);
  expect(CALCULATOR_V2_CSS).not.toMatch(/@font-face|url\(|@tailwind|@apply|:global|composes:/i); });
it("AR-36 CALCULATOR_V2_BUILD is the first 16 hex of sha256(CSS + mathquill.js)", () => { const mq = readFileSync("vendor/mathquill/mathquill.js", "utf8");
  expect(CALCULATOR_V2_BUILD).toBe(createHash("sha256").update(CALCULATOR_V2_CSS + mq).digest("hex").slice(0, 16)); });
it("AR-36 one constructed sheet is shared across shadow roots; <style> is the fallback", () => { const [a] = shadows(1); installStyles(a, "p{}").setSkinCss(":host{}");
  expect([a.querySelector("style[data-kc-base]")!.textContent, a.querySelector("style[data-kc-skin]")!.textContent]).toEqual(["p{}", ":host{}"]);
  vi.stubGlobal("CSSStyleSheet", FakeSheet); stubAdoptedStyleSheets(); // FakeSheet { text; replaceSync(t) }; configurable get/set on ShadowRoot.prototype
  const [c, d] = shadows(2); const styles = installStyles(c, "p{}"); installStyles(d, "p{}");
  expect(c.adoptedStyleSheets[0]).toBe(d.adoptedStyleSheets[0]); expect(c.adoptedStyleSheets[1]).not.toBe(d.adoptedStyleSheets[1]); styles.dispose(); expect(c.adoptedStyleSheets).toHaveLength(0); });
it("AR-39 shadow CSS maps .mq-math-mode to KaTeX_Main and its var to KaTeX_Math, with no Symbola", () => { expect(family(".mq-math-mode")).toContainEqual(expect.stringMatching(/^"?KaTeX_Main/));
  expect(family(".mq-math-mode var")).toContainEqual(expect.stringMatching(/^"?KaTeX_Math/)); expect(CALCULATOR_V2_CSS).not.toMatch(/Symbola/i); });
it("AN-14 every CSS duration comes from --kc-duration-* and no cubic-bezier overshoots", () => { const decls = CALCULATOR_V2_CSS.match(/(?:transition|animation)(?:-duration)?\s*:[^;}]+/g) ?? [];
  expect(decls.flatMap((d) => d.match(/(?<![\w.-])\d*\.?\d+m?s\b/g) ?? []).filter((t) => t !== "0ms" && t !== "0s")).toEqual([]);
  for (const [, args] of CALCULATOR_V2_CSS.matchAll(/cubic-bezier\(([^)]*)\)/g)) { const [, y1, , y2] = args.split(",").map(Number); expect([y1, y2].every((y) => y >= 0 && y <= 1)).toBe(true); } });
```

- [ ] **Step 2: Run the tests and confirm they fail.** Run `npx vitest run src/components/calculator-v2/ui/controller/stylesheet.test.ts`. Expected: FAIL with `Failed to resolve import "../../../../../scripts/build/calculator-v2.mjs"`.
- [ ] **Step 3: Implement the pipeline.** `styleSources` returns MathQuill CSS, `tokens.css`, `base.css`, then the other `styles/*.css` sorted. `assertShadowSafeCss` throws `${file}: <construct> is not allowed in shadow-root CSS (AR-36)`. `generateCalculatorStyles` checks each source and joins them as `/* <path> */\n<css>`. The build id is the first 16 hex characters of the sha256 of the CSS plus `mathquill.js`. It emits a `// Generated by scripts/build/calculator-v2.mjs --styles. Do not edit.` header, `export const CALCULATOR_V2_CSS = <JSON string>;` and `export const CALCULATOR_V2_BUILD = "<id>";`, formats with Prettier (repo config, parser `typescript`), and writes only when `write` is true and the text changed. CLI: `--styles` writes. The CLI runs only when the file is the process entry (`process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href`); importing the module has no side effects. `--styles --check` exits 1 on drift with `src/components/calculator-v2/styles/generated.ts is out of date; run node scripts/build/calculator-v2.mjs --styles`. With no flag, it does the same as `--styles` until 13 extends it. `base.css` uses only `var(--kc-*)` colours (TH-3). It holds `:host { display: block; position: relative; width: 100%; height: 100%; overflow: hidden; font-family: var(--kc-font-ui); font-size: var(--kc-size-ui); line-height: 1.4; color: var(--kc-text); background: var(--kc-list) }`, `*, *::before, *::after { box-sizing: border-box }`, `button, input, select, textarea { font: inherit; color: inherit }`, `.kc-root { width: 100%; height: 100% }`, and a 1 px clipped `.kc-sr-only` (`clip-path: inset(50%)`). `installStyles` uses constructable sheets when `typeof globalThis.CSSStyleSheet?.prototype?.replaceSync === "function"` and `"adoptedStyleSheets" in shadow`. One base sheet is cached per `Document` in a `WeakMap`; the per-instance skin sheet goes last. Otherwise it appends `<style data-kc-base>` and `<style data-kc-skin>`. `dispose()` removes both.
- [ ] **Step 4: Run the tests and confirm they pass.** Run `node scripts/build/calculator-v2.mjs --styles`, the Step 2 command, then `node scripts/build/calculator-v2.mjs --styles --check`. Expected: PASS; the check exits 0.
- [ ] **Step 5: Commit.** Run `git add scripts/build/calculator-v2.mjs src/components/calculator-v2 && git commit -m "Add calculator v2 shadow stylesheet pipeline (AR-36)"`

### Task 2: Shell controllers (AR-29, TH-15, AR-38, K-2, KB-7, KB-3, KB-13, API-12)

**Files:** create, in `ui/controller/`, `media.ts`, `theme-watcher.ts`, `shell-store.ts`, `shortcuts.ts`, `keypad-policy.ts`, `focusables.ts`, `when-field-ready.ts` and the test-only `__fixtures__/fake-media.ts`, plus `ui/layout/layout-size.ts`; test each module with a sibling `*.test.ts`. **Consumes:** `resolveSkinId`, `SkinId` (03); `PixelSize` (06); `FocusController` (09); `MathField` (05); `installDomStubs`, `triggerResize` (07). **Produces:**

```
// ui/controller/media.ts (window satisfies MediaQuerySource). Watch.initial is the value when watching began; later values reach only the callback.
export type Watch<T> = { initial: T; dispose(): void }; export type Pointer = "fine" | "coarse"; export interface MediaQuerySource { matchMedia(query: string): MediaQueryList }
export function watchMediaQuery(m: MediaQuerySource, q: string, on: (v: boolean) => void): Watch<boolean>; export const COARSE_POINTER_QUERY = "(any-pointer: coarse)";
export function watchPointer(m: MediaQuerySource, target: EventTarget, on: (p: Pointer) => void): Watch<Pointer>;
// ui/controller/theme-watcher.ts (revision +1 per prefers-contrast or forced-colors change) and ui/controller/__fixtures__/fake-media.ts
export interface ThemeState { skin: SkinId; revision: number } export function watchTheme(root: HTMLElement, m: MediaQuerySource, on: (s: ThemeState) => void): Watch<ThemeState>;
export function fakeMedia(initial?: Record<string, boolean>): MediaQuerySource & { set(q: string, matches: boolean): void; listeners(): number };
// ui/controller/shell-store.ts (set notifies on change only)
export interface ShellState { size: PixelSize; layout: "desktop" | "stacked"; skin: SkinId; themeRevision: number; reducedMotionMedia: boolean; pointer: Pointer }
export interface ShellStore { get(): ShellState; set(patch: Partial<ShellState>): void; subscribe(l: () => void): () => void } export function createShellStore(initial: ShellState): ShellStore;
// ui/layout/layout-size.ts
export const LAYOUT_DESKTOP_MIN_WIDTH = 560; export function layoutFor(width: number): "desktop" | "stacked";
export function observeHostSize(host: HTMLElement, on: (size: PixelSize) => void): { measure(): void; dispose(): void };
// ui/controller/shortcuts.ts (onEscape returns true when a layer closed)
export type ShortcutAction = "undo" | "redo" | "toggle-keypad" | "add-row-end"; export function matchShortcut(event: ShortcutKey): ShortcutAction | null;
export type ShortcutKey = Pick<KeyboardEvent, "code" | "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "isComposing">;
export interface ShellKeyboardHandlers { onShortcut(action: ShortcutAction): void; onEscape(): boolean } export function installShellKeyboard(root: HTMLElement, handlers: ShellKeyboardHandlers): () => void;
// ui/controller/keypad-policy.ts (INITIAL_KEYPAD_POLICY is { open: false, studentClosed: false })
export interface KeypadPolicyState { open: boolean; studentClosed: boolean } export type KeypadEvent = { type: "touch-focus-row" } | { type: "set"; open: boolean; by: "student" | "system" };
export const INITIAL_KEYPAD_POLICY: KeypadPolicyState; export function reduceKeypad(state: KeypadPolicyState, event: KeypadEvent): KeypadPolicyState;
// ui/controller/focusables.ts, then ui/controller/when-field-ready.ts (schedule defaults to requestAnimationFrame; whenFieldReady returns cancel)
export function tabbables(root: ShadowRoot | HTMLElement): HTMLElement[]; export function focusBoundary(root: ShadowRoot, edge: "first" | "last"): void;
export const FIELD_WAIT_FRAMES = 60;
export function whenFieldReady(focus: Pick<FocusController, "field">, rowId: string, run: (field: MathField) => void, schedule?: (callback: () => void) => void): () => void;
```

- [ ] **Step 1: Write the failing tests.** Files and environments: `ui/layout/layout-size.test.ts` (jsdom) holds both AR-29 size tests; `shell-store.test.ts` (node) the AR-29 store test; `theme-watcher.test.ts` (jsdom) TH-15; `media.test.ts` (jsdom) both AR-38 tests and K-2 `watchPointer`; `keypad-policy.test.ts` (node) K-2 `reduceKeypad`; `shortcuts.test.ts` (jsdom) KB-7 and KB-3; `focusables.test.ts` (jsdom) KB-13; `when-field-ready.test.ts` (node) API-12. Each jsdom file starts with `// @vitest-environment jsdom` and calls `installDomStubs()` in `beforeEach`. `host` is an attached `div`, `shadow` an open shadow root, `root` a `div` appended to `document.body` that contains the textarea `inner`, and `field` a stub `MathField`. `k(init)` builds a `ShortcutKey` with every flag false. `tick()` awaits `setTimeout(0)`. `press(el, init)` dispatches a cancelable, bubbling `keydown` and returns `defaultPrevented`. `DARK` is `"(prefers-color-scheme: dark)"`. `sourceFiles(dirs)` lists the `.ts` and `.tsx` files under `dirs` (`readdirSync(dir, { recursive: true })`), leaving out test files (names matching `/\.test\.tsx?$/`) and every path with a `__fixtures__` segment, so no scan reads the test that holds its pattern. `SHELL0` is `{ size: { width: 0, height: 0 }, layout: "stacked", skin: "ivory", themeRevision: 0, reducedMotionMedia: false, pointer: "fine" }`.

```
it("AR-29 layoutFor switches at 560 px of container width", () => {
  expect(LAYOUT_DESKTOP_MIN_WIDTH).toBe(560); expect([560, 559.9, 461, 0].map(layoutFor)).toEqual(["desktop", "stacked", "stacked", "stacked"]); });
it("AR-29 observeHostSize reports ResizeObserver sizes and re-reads the host on measure()", () => {
  const sizes: PixelSize[] = []; const o = observeHostSize(host, (s) => sizes.push(s)); triggerResize(host, { width: 461, height: 300 });
  host.getBoundingClientRect = () => ({ width: 700, height: 400 }) as DOMRect; o.measure(); expect(sizes).toEqual([{ width: 461, height: 300 }, { width: 700, height: 400 }]); });
it("AR-29 createShellStore notifies subscribers only when a value changes", () => { const store = createShellStore(SHELL0); const heard = vi.fn(); const off = store.subscribe(heard);
  store.set({ layout: "stacked", size: { width: 0, height: 0 } }); expect(heard).not.toHaveBeenCalled();
  store.set({ layout: "desktop" }); expect([heard.mock.calls.length, store.get().layout]).toEqual([1, "desktop"]); off(); store.set({ layout: "stacked" }); expect(heard).toHaveBeenCalledTimes(1); });
it("TH-15 watchTheme re-resolves on data-theme, class and colour scheme and bumps revision on contrast and forced colours", async () => {
  const html = document.documentElement; html.dataset.theme = "ivory"; const media = fakeMedia(); const seen: ThemeState[] = [];
  const w = watchTheme(html, media, (s) => seen.push(s)); expect(w.initial).toEqual({ skin: "ivory", revision: 0 });
  html.dataset.theme = "observatory"; await tick(); expect(seen.at(-1)).toEqual({ skin: "observatory", revision: 0 }); html.className = "x"; await tick(); expect(seen).toHaveLength(2);
  media.set("(prefers-contrast: more)", true); media.set("(forced-colors: active)", true); expect(seen.at(-1)).toEqual({ skin: "observatory", revision: 2 });
  delete html.dataset.theme; await tick(); media.set(DARK, true); expect(seen.at(-1)!.skin).toBe("observatory");
  media.set(DARK, false); expect(seen.at(-1)!.skin).toBe("ivory"); w.dispose(); expect(media.listeners()).toBe(0); });
it("AR-38 watchMediaQuery follows prefers-reduced-motion live and removes its listener", () => {
  const q = "(prefers-reduced-motion: reduce)"; const media = fakeMedia({ [q]: true }); const seen: boolean[] = [];
  const w = watchMediaQuery(media, q, (m) => seen.push(m)); media.set(q, false); w.dispose(); expect([w.initial, seen, media.listeners()]).toEqual([true, [false], 0]); });
it("AR-38 no calculator-v2 module imports framer-motion or motion", () => { const motion = /from\s+["'](framer-motion|motion)(\/[^"']*)?["']/;
  expect(sourceFiles(["src/components/calculator-v2", "src/lib/calculator-v2"]).filter((f) => motion.test(readFileSync(f, "utf8")))).toEqual([]); });
it("K-2 watchPointer is coarse for (any-pointer: coarse) and after a touch or pen pointerdown", () => { const t = document.createElement("div"); const seen: string[] = [];
  expect(watchPointer(fakeMedia({ [COARSE_POINTER_QUERY]: true }), t, () => {}).initial).toBe("coarse"); expect(watchPointer(fakeMedia(), t, (p) => seen.push(p)).initial).toBe("fine");
  for (const pointerType of ["mouse", "pen"]) t.dispatchEvent(Object.assign(new Event("pointerdown"), { pointerType }));
  expect(seen).toEqual(["coarse"]); });
it("K-2 a row touch opens the keypad unless the student closed it; a student open re-arms it", () => {
  const touch = { type: "touch-focus-row" } as const; let s = reduceKeypad(INITIAL_KEYPAD_POLICY, touch);
  expect(s).toEqual({ open: true, studentClosed: false }); s = reduceKeypad(s, { type: "set", open: false, by: "student" }); expect(reduceKeypad(s, touch)).toEqual({ open: false, studentClosed: true });
  s = reduceKeypad(reduceKeypad(s, { type: "set", open: true, by: "student" }), { type: "set", open: false, by: "system" });
  expect(reduceKeypad(s, touch)).toEqual({ open: true, studentClosed: false }); });
it("KB-7 shortcuts match event.code, accept Option-modified keys and ignore composition", () => { const cases: [Partial<ShortcutKey>, ShortcutAction | null][] = [
    [{ code: "KeyK", key: "˚", altKey: true }, "toggle-keypad"], [{ code: "KeyK", key: "k", ctrlKey: true }, "toggle-keypad"],
    [{ code: "KeyK", key: "k", metaKey: true }, null], [{ code: "KeyZ", key: "w", ctrlKey: true }, "undo"], [{ code: "KeyZ", key: "z", metaKey: true }, "undo"],
    [{ code: "KeyZ", key: "Z", metaKey: true, shiftKey: true }, "redo"], [{ code: "KeyY", key: "y", ctrlKey: true }, "redo"],
    [{ code: "KeyW", key: "z", ctrlKey: true }, null], [{ code: "Enter", key: "Enter", altKey: true }, "add-row-end"], [{ code: "KeyZ", key: "z", ctrlKey: true, isComposing: true }, null]];
  for (const [init, action] of cases) expect(matchShortcut(k(init))).toBe(action); });
it("KB-3 installShellKeyboard prevents a handled Escape without stopping it, and prevents and stops shortcuts", () => {
  const closes = [true, false]; const actions: string[] = []; const heard: string[] = []; const ac = new AbortController();
  document.addEventListener("keydown", (e) => heard.push(e.key), { signal: ac.signal }); const off = installShellKeyboard(root, { onShortcut: (a) => actions.push(a), onEscape: () => closes.shift()! });
  expect([press(inner, { key: "Escape" }), press(inner, { key: "Escape" }), press(inner, { code: "KeyZ", key: "z", ctrlKey: true })]).toEqual([true, false, true]);
  expect(heard).toEqual(["Escape", "Escape"]); off(); press(inner, { code: "KeyZ", key: "z", ctrlKey: true }); expect([actions, heard.length]).toEqual([["undo"], 3]); ac.abort(); });
it("KB-13 tabbables skip hidden, inert, aria-hidden, disabled, tabindex -1 and visibility:hidden; focusBoundary picks the ends", () => {
  shadow.innerHTML = `<button id="a"></button><div hidden><button></button></div><div inert><button></button></div><div aria-hidden="true"><button></button></div>
    <button disabled></button><span tabindex="-1"></span><div style="visibility:hidden"><button></button></div><textarea id="t"></textarea><button id="z"></button>`;
  expect(tabbables(shadow).map((e) => e.id)).toEqual(["a", "t", "z"]);
  focusBoundary(shadow, "first"); expect(shadow.activeElement?.id).toBe("a"); focusBoundary(shadow, "last"); expect(shadow.activeElement?.id).toBe("z"); });
it("API-12 whenFieldReady runs at once, waits frames for a new field, cancels, and gives up after exactly FIELD_WAIT_FRAMES frames", () => {
  const frames: (() => void)[] = []; const schedule = vi.fn((cb: () => void) => { frames.push(cb); }); const fields = new Map<string, MathField>();
  const focus = { field: (id: string) => fields.get(id) ?? null }; const run = vi.fn();
  fields.set("0", field); whenFieldReady(focus, "0", run, schedule); expect([run.mock.calls.length, schedule.mock.calls.length]).toEqual([1, 0]);
  whenFieldReady(focus, "1", run, schedule); fields.set("1", field); frames.shift()!(); expect(run).toHaveBeenLastCalledWith(field);
  whenFieldReady(focus, "2", run, schedule)(); fields.set("2", field); frames.splice(0).forEach((cb) => cb()); expect(run).toHaveBeenCalledTimes(2);
  schedule.mockClear(); whenFieldReady(focus, "3", run, schedule); while (frames.length) frames.shift()!(); expect([schedule.mock.calls.length, run.mock.calls.length]).toEqual([FIELD_WAIT_FRAMES, 2]); });
```

- [ ] **Step 2: Run the tests and confirm they fail.** Run `npx vitest run src/components/calculator-v2/ui/controller src/components/calculator-v2/ui/layout`. Expected: FAIL with `Failed to resolve import "./layout-size"`, and the same for every new module.
- [ ] **Step 3: Implement the modules.** **`watchMediaQuery`** stores `matchMedia(q).matches` as `initial` and calls `on` for each later `change`. **`watchTheme`** uses a `MutationObserver` on `root` with `attributeFilter: ["data-theme", "class"]`, plus `watchMediaQuery` for `DARK`, `(prefers-contrast: more)` and `(forced-colors: active)`. The skin is always `resolveSkinId(root.dataset.theme ?? null, darkMatches)`. **`createShellStore`**: `set` compares each patched key with the current value (`size` by width and height) and notifies subscribers only when one differs. **`observeHostSize`** reads `entry.contentRect`; `measure()` reads `getBoundingClientRect()`. **`watchPointer`** listens to `pointerdown` in the capture phase, calls `on("coarse")` the first time a `touch` or `pen` pointer arrives, and never returns to `"fine"`. **`matchShortcut`**: Undo: `ctrlKey || metaKey`, `!altKey && !shiftKey`, `KeyZ`. Redo: the same modifiers with `shiftKey` and `KeyZ`, or `ctrlKey` with `KeyY`. Keypad toggle: `ctrlKey || altKey`, `!metaKey`, `KeyK`. Add row at end: `altKey` with `Enter` or `NumpadEnter`. Return `null` while `isComposing`. KB-7 also lists `KeyC` and `KeyT`; those shortcuts arrive with KB-11 (Phase 2) and A11Y-13 (Phase 4), which extend `matchShortcut` and its KB-7 case table, so Phase 1 needs only `KeyK`, `KeyZ` and `KeyY` (KB-1). **`installShellKeyboard`** adds one capture-phase `keydown` listener. A shortcut match gets `preventDefault()` and `stopPropagation()`, then `onShortcut`. Escape is matched on the key, not the code (`event.key === "Escape" && !event.isComposing`), because the KB-3 unit test dispatches `{ key: "Escape" }` with no `code`. It gets `preventDefault()` only, and only when `onEscape()` returns true; it is never stopped (Decision 4). **`reduceKeypad`**: a student `set` writes `studentClosed = !open`; a system `set` keeps it. **`tabbables`** keeps DOM order of buttons, inputs, selects, textareas, `[href]` and `[tabindex]` elements with `tabIndex >= 0`. It skips elements that are `disabled`, inside `[hidden]`, `[inert]` or `[aria-hidden="true"]`, or have computed `visibility: hidden`. **`whenFieldReady`** runs synchronously when `focus.field(rowId)` exists. Otherwise it schedules one retry per frame and gives up after the `FIELD_WAIT_FRAMES`th scheduled retry; cancel makes a pending retry do nothing. **`fakeMedia`** keeps a `matches` value and a listener set per query; `set` fires `change` only when the value changes.
- [ ] **Step 4: Run the tests and confirm they pass.** Run the Step 2 command. Expected: PASS.
- [ ] **Step 5: Commit.** Run `git add src/components/calculator-v2/ui && git commit -m "Add calculator v2 shell controllers (AR-29, TH-15, K-2, KB-7)"`

### Task 3: KarmanCalculator facade, error boundary and App providers (AR-35, AR-32, AR-52, AR-57, API-12)

**Files:** create `KarmanCalculator.ts`, `ui/ErrorBoundary.tsx` and `ui/App.tsx`; test `KarmanCalculator.test.ts`. **Consumes:** Tasks 1 and 2, plus the 02, 03, 05, 07 and 09 names above. **Produces:** `KARMAN_CALCULATOR_SENTINEL`, `HostHooks` and `KarmanCalculator` (`01` section 12), plus:

```
export const RESET_ANNOUNCEMENT = "Calculator cleared for this question.";                          // KarmanCalculator.ts
/** @internal */ export function lastFocusedRow(calculator: KarmanCalculator): string | null;      // FocusController.lastFocusedRowId() via a WeakMap (Decision 6)
export const ERROR_COPY = { message: "The calculator hit a problem.", retry: "Retry", reset: "Reset this question's calculator" } as const;
export interface ErrorBoundaryProps { host: HTMLElement; onError(error: Error): void; onReset(): void; children: React.ReactNode }
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, { error: Error | null; generation: number }> {}
export interface AppProps { engine: CalculatorEngine; host: HTMLElement; store: ShellStore; focus: FocusController; escape: EscapeStack;
  announcer: Announcer; chromeSlot: HTMLElement | null }                                             // chromeSlot: read by 13's portal
export function App(props: AppProps): JSX.Element;
```

- [ ] **Step 1: Write the failing tests** (jsdom, `installDomStubs()`). `vi.hoisted` state is `s = { props: AppProps | null, throwInApp, renders, announced: [string, unknown][] }`. The `./ui/App` mock subscribes with `useSyncExternalStore(p.store.subscribe, p.store.get)`, records `s.props` and `s.renders`, and throws `new Error("app boom")` while `s.throwInApp` is set. The `./ui/a11y/announcer` mock spreads the real module and replaces `createAnnouncer` with a fake that records into `s.announced`. `mount()` appends a host `div`. `fakeField()` returns a `MathField` whose members are all `vi.fn()`. `caught(fn)` returns the thrown value. `click(el, text)` clicks the shadow button with that text. `failApp(rev)` sets the throw flag, calls `s.props!.store.set({ themeRevision: rev })`, waits for `ERROR_COPY.message`, then clears the flag. `FORWARDED` lists the 20 value-returning API methods of `01` section 8, from `setExpression` to `canRedo`. `INTERNAL` lists the 10 internal engine members, from `subscribe` to `setFocusedRow`.

```
it("AR-35 an open shadow root holds the styles and UI; nothing lands in the light DOM", async () => { const el = mount(); const calc = new KarmanCalculator(el);
  expect([el.shadowRoot?.mode, el.shadowRoot!.querySelector("style[data-kc-base]")!.textContent]).toEqual(["open", CALCULATOR_V2_CSS]); await vi.waitFor(() => expect(s.props?.engine).toBe(calc.engine));
  expect(el.shadowRoot!.querySelectorAll('[role="status"][aria-live="polite"]')).toHaveLength(1); expect([el.childNodes.length, /^karman-calculator-host-\d+$/.test(el.id)]).toEqual([0, true]); });
it("AR-35 invalid options throw before the element is touched", () => {
  const el = mount(); expect(caught(() => new KarmanCalculator(el, { angleMode: "gradians" } as never))).toBeInstanceOf(KarmanCalculatorError);
  expect([el.shadowRoot, el.dataset.karmanCalculator]).toEqual([null, undefined]); });
it("AR-35 KarmanCalculator forwards every public engine member and no internal one", () => {
  const calc = new KarmanCalculator(mount()); const engine = calc.engine as unknown as Record<string, () => unknown>;
  const facade = calc as unknown as Record<string, (arg: unknown) => unknown>; const ARG = { id: "1" };
  for (const name of FORWARDED) { const spy = vi.spyOn(engine, name).mockReturnValue(name); expect(facade[name](ARG)).toBe(name); expect(spy.mock.calls[0][0]).toBe(ARG); }
  for (const name of ["focusExpression", "activateExpression", "focusFirstExpression"]) { const spy = vi.spyOn(engine, name).mockReturnValue(undefined); facade[name]("1"); expect(spy).toHaveBeenCalled(); }
  for (const g of ["expressionAnalysis", "graphpaperBounds", "settings", "focusedExpression", "mode"]) expect(facade[g]).toEqual(engine[g]);
  expect(INTERNAL.filter((n) => n in calc)).toEqual([]); expect([KarmanCalculator.apiVersion, KarmanCalculator.version]).toEqual([1, CALCULATOR_V2_BUILD]); });
it("AR-32 the constructor writes KARMAN_CALCULATOR_SENTINEL to element.dataset.karmanCalculator", () => {
  const el = mount(); new KarmanCalculator(el); expect(el.dataset.karmanCalculator).toBe("karman-calculator-v2:lazy-chunk"); });
it("AR-52 a render error shows the fallback; Retry remounts from engine state; Reset runs setBlank and keeps reduced motion", async () => {
  const el = mount(); const answer = document.body.appendChild(document.createElement("p")); // the quiz's own content
  const calc = new KarmanCalculator(el, { reducedMotion: true }); calc.setExpressions([{ id: "1", latex: "y=x" }]); await failApp(1); const renders = s.renders; click(el, "Retry");
  await vi.waitFor(() => expect(s.renders).toBeGreaterThan(renders)); expect(calc.getExpressions()[0].latex).toBe("y=x");
  await failApp(2); const blank = vi.spyOn(calc.engine, "setBlank"); click(el, "Reset this question's calculator");
  expect([blank.mock.calls.length, calc.getExpressions()[0].latex, calc.settings.reducedMotion, answer.isConnected]).toEqual([1, "", true, true]); });
it("AR-57 a render error reaches options.onError once, and a throwing onError is contained", async () => {
  const onError = vi.fn(() => { throw new Error("reporter down"); }); new KarmanCalculator(mount(), { onError }); await failApp(7);
  expect(onError).toHaveBeenCalledTimes(1); expect(onError.mock.calls[0][0]).toMatchObject({ message: "app boom" }); });
it("API-12 focusExpression and focusFirstExpression wait for the field; activateExpression marks the row active without DOM focus; resize re-measures", async () => {
  const el = mount(); const calc = new KarmanCalculator(el); await vi.waitFor(() => expect(s.props).not.toBeNull());
  calc.setExpressions([{ id: "1", latex: "1" }, { id: "2", latex: "2" }]); const [f1, f2] = [fakeField(), fakeField()];
  s.props!.focus.registerField("1", f1); calc.focusExpression("2"); s.props!.focus.registerField("2", f2); await vi.waitFor(() => expect(f2.focus).toHaveBeenCalled());
  const seen = vi.fn(); calc.observe("focusedExpression", seen); calc.activateExpression("1");
  expect([calc.engine.getSnapshot().activeRowId, vi.mocked(f1.focus).mock.calls.length]).toEqual(["1", 0]); await vi.waitFor(() => expect(seen).toHaveBeenCalled());
  calc.focusFirstExpression(); await vi.waitFor(() => expect(f1.focus).toHaveBeenCalled()); // row "1" is getExpressions()[0]
  el.getBoundingClientRect = () => ({ width: 700, height: 600 }) as DOMRect; calc.resize();
  expect([s.props!.store.get().layout, s.props!.store.get().size]).toEqual(["desktop", { width: 700, height: 600 }]); }); // jsdom measures 0×0 (stacked) until then
```

- [ ] **Step 2: Run the tests and confirm they fail.** Run `npx vitest run src/components/calculator-v2/KarmanCalculator.test.ts`. Expected: FAIL with `Failed to resolve import "./KarmanCalculator"`.
- [ ] **Step 3: Implement the facade, the boundary and the provider-only App.** The constructor runs these steps in order:

```
1 report = (e) => { try { options?.onError?.(e) } catch {} }; engine = createEngine({ ...options, onError: report })   // validates first (API-1)
2 element.dataset.karmanCalculator = KARMAN_CALCULATOR_SENTINEL; element.id ||= `karman-calculator-host-${++hostCount}`
3 shadow = element.shadowRoot ?? element.attachShadow({ mode: "open" }); shadow.replaceChildren()
4 styles = installStyles(shadow, CALCULATOR_V2_CSS); styles.setSkinCss(hostThemeCss(resolveSkinId(<html data-theme>, darkMatches)))
5 shadow.append(div.kc-root, div.kc-sr-only[role=status][aria-live=polite]); announcer = createAnnouncer(<that region>)
6 focus = createFocusController(engine); escape = createEscapeStack(); store = createShellStore({ size 0×0, "stacked", skin, 0, false, "fine" })
7 disposers: observeHostSize(element, (size) => store.set({ size, layout: layoutFor(size.width) })), then measure();
  motion = watchMediaQuery(window, "(prefers-reduced-motion: reduce)", …); pointer = watchPointer(window, shadow, …); store.set({ reducedMotionMedia: motion.initial, pointer: pointer.initial })
8 root = createRoot(div.kc-root, { onCaughtError: () => {}, onUncaughtError: report }); render()
9 bumpDevCounter("calculators", 1); internals.set(this, { focus, … })
```

- `render()` renders `<ErrorBoundary host onError={report} onReset={resetFromBoundary}><App …/></ErrorBoundary>`. `resetFromBoundary` runs `engine.setBlank()`, then `engine.updateSettings({ reducedMotion: this.reducedMotion })`. That field tracks the option and every forwarded `updateSettings` call that contains `reducedMotion`.
- `focusExpression(id)` calls the engine, then `whenFieldReady(focus, id, () => focus.focusRow(id, "end"))`. A newer request cancels the pending one. `focusFirstExpression()` does the same for `getExpressions()[0].id`. `activateExpression(id)` calls the engine, then `whenFieldReady(…, () => focus.activateRow(id))`.
- `resize()` calls `measure()`. `focusBoundary(edge)` calls `focusBoundary(shadow, edge)`. `reflow()` calls `field.reflow()` for each of `focus.fields()`, then increments `themeRevision` so the canvas redraws.
- After `destroy()` (Task 4), public methods throw `new KarmanCalculatorError("destroyed", "The calculator was destroyed.")`; `focusBoundary` and `reflow` do nothing.
- `ErrorBoundary` wraps children in `<Fragment key={generation}>`. Its fallback is `div.kc-error` holding `<p>{ERROR_COPY.message}</p>` and the two buttons; it focuses Retry when `document.activeElement === host`. `componentDidCatch` calls `onError`. Retry bumps `generation`. Reset calls `onReset()`, then bumps `generation`.
- `App` wraps `<section className="kc-app" role="region" aria-label="Graphing calculator" data-kc-layout={layout} />` in the five contexts; the skin comes from the store.
- [ ] **Step 4: Run the tests and confirm they pass.** Run the Step 2 command. Expected: PASS.
- [ ] **Step 5: Commit.** Run `git add src/components/calculator-v2 && git commit -m "Add KarmanCalculator facade with shadow root and error boundary (AR-35, AR-52)"`

### Task 4: Layout composition and teardown (AR-29, A11Y-7, S-6, AR-60)

**Files:** create `ui/layout/CalculatorLayout.tsx` and `ui/layout/CalculatorLayout.test.tsx`; modify `ui/App.tsx` and `KarmanCalculator.ts` (adds `destroy()`); test `ui/controller/lifecycle.test.tsx`. **Consumes:** `ExpressionPanel`, `Keypad`, `SettingsPopover`, `EDITOR_MESSAGES` (09); `GraphPanel` (08). **Produces:**

```
export interface CalculatorLayoutProps { layout: "desktop" | "stacked"; containerWidth: number; pointer: "fine" | "coarse"; collapsed: boolean;
  keypadOpen: boolean; host: Element; themeRevision: number; reducedMotion: boolean; settingsAnchor: HTMLElement | null;
  revealRowId: string | null;        // focusedRowId ?? activeRowId; Task 6 keeps it in view (L-14)
  rootRef: React.Ref<HTMLElement>;   // on section.kc-app; Task 9 installs the keyboard handler on it
  onOpenSettings(anchor: HTMLElement): void; onCloseSettings(): void; onToggleKeypad(): void; onKeypadChange(open: boolean, by: "student" | "system"): void; onTouchFocusRow(rowId: string): void }
export function CalculatorLayout(props: CalculatorLayoutProps): JSX.Element; // section.kc-app[role=region][aria-label="Graphing calculator"][data-kc-layout][data-collapsed][data-keypad] >
//   div.kc-list-region > ExpressionPanel; div.kc-graph-region > GraphPanel; div.kc-keypad-region > Keypad; SettingsPopover
```

- [ ] **Step 1: Write the failing tests** (jsdom, real `App`). `mount()` and `caught()` are as in Task 3, and `sourceFiles` as in Task 2. `layoutOf(el)` reads `data-kc-layout`. `button(root, re)` finds a shadow button by label or text. `ariaIds(root)` lists every id referenced by the four ID-based ARIA attributes. `trackResources()` wraps `add/removeEventListener` on `window`, `document` and `document.fonts`, `MutationObserver`, `ResizeObserver` observe and disconnect, the matchMedia lists, and `setTimeout`, `setInterval` and `requestAnimationFrame` with their clear and cancel functions (on `globalThis`, and on `window` when it is another object). jsdom has no `document.fonts`, so `trackResources()` first defines one (configurable, removed in `afterEach`): an `EventTarget` with `ready: Promise.resolve()`, `check: () => true` and `load: async () => []`. It returns `{ open(): string[]; observers(): number; media(): number; pending(): number }`; `open()` lists each listener still attached as `"<window|document|document.fonts> <type>"`, and `pending()` counts timeouts, intervals and frames scheduled since tracking began that have neither run (timeouts and frames) nor been cleared. `within` and `fireEvent` come from `@testing-library/react`.

```
it("AR-29 the layout follows the host's ResizeObserver width (560 desktop; 559 and a 461 dock stacked), never a width media query", async () => {
  const media = vi.spyOn(window, "matchMedia"); const el = mount(); new KarmanCalculator(el); for (const [w, l] of [[560, "desktop"], [559, "stacked"], [461, "stacked"], [1024, "desktop"]] as const) {
    triggerResize(el, { width: w, height: 600 }); await vi.waitFor(() => expect(layoutOf(el)).toBe(l)); } expect(media.mock.calls.map(([q]) => q).filter((q) => /width|height/.test(q))).toEqual([]); });
it("A11Y-7 ID-based ARIA references resolve inside the shadow root, the host has an id, and no element reflection is used", async () => {
  const el = mount(); new KarmanCalculator(el).updateSettings({ keypad: true }); const root = el.shadowRoot!;
  await vi.waitFor(() => expect(button(root, /^functions$/i)).toBeDefined()); button(root, /^functions$/i)!.click(); button(root, /^graph settings$/i)!.click();
  const ids = ariaIds(root); expect(ids.length).toBeGreaterThan(0); expect(el.id).not.toBe("");
  for (const id of ids) expect([!!root.getElementById(id), !!document.getElementById(id)]).toEqual([true, false]);
  const reflection = new RegExp("aria" + "(Controls|DescribedBy|LabelledBy|Details|FlowTo|Owns)Elements|aria" + "ActiveDescendantElement"); // split, so no file holds the names (sourceFiles also skips tests)
  expect(sourceFiles(["src/components/calculator-v2"]).filter((f) => reflection.test(readFileSync(f, "utf8")))).toEqual([]); });
it("S-6 Graph settings opens with Radians checked; Degrees sets the angle and announces it; a new calculator starts in radians", async () => {
  const el = mount(); const calc = new KarmanCalculator(el); const root = el.shadowRoot!;
  await vi.waitFor(() => expect(button(root, /^graph settings$/i)).toBeDefined()); button(root, /^graph settings$/i)!.click();
  const app = within(root.querySelector<HTMLElement>(".kc-app")!); await vi.waitFor(() => expect(app.getByRole("radio", { name: "Radians" })).toBeChecked());
  fireEvent.click(app.getByRole("radio", { name: "Degrees" })); expect(calc.settings.angleMode).toBe("degrees");
  await vi.waitFor(() => expect(root.querySelector('[role="status"]')!.textContent).toBe(EDITOR_MESSAGES.angle("degrees")));
  calc.destroy(); expect(new KarmanCalculator(mount()).settings.angleMode).toBe("radians"); });
it("AR-60 destroy() releases listeners (document.fonts too), observers, media queries, timers, frames, the engine, the React root and shadow children, and is idempotent", async () => {
  new KarmanCalculator(mount()).destroy(); // React's one-time document listeners
  const track = trackResources(); const el = mount(); const calc = new KarmanCalculator(el, undefined, { announceResetOnMount: true });
  calc.updateSettings({ keypad: true }); await vi.waitFor(() => expect(el.shadowRoot!.querySelector("[data-row-id]")).not.toBeNull());
  calc.focusExpression("1"); const region = el.shadowRoot!.querySelector('[role="status"]')!; const live = globalThis.__karmanCalculatorCounters!.calculators; const engineDestroy = vi.spyOn(calc.engine, "destroy");
  calc.destroy(); calc.destroy(); expect([track.open(), track.observers(), track.media(), el.shadowRoot!.childNodes.length, engineDestroy.mock.calls.length]).toEqual([[], 0, 0, 0, 1]);
  expect(globalThis.__karmanCalculatorCounters!.calculators).toBe(live - 1); expect(caught(() => calc.getExpressions())).toMatchObject({ code: "destroyed" });
  await new Promise((r) => setTimeout(r, 600)); expect([track.open(), track.pending(), region.textContent]).toEqual([[], 0, ""]); }); // no late timer, frame or announcement; jsdom's engine is main-thread, so Task 6 checks the worker
```

- [ ] **Step 2: Run the tests and confirm they fail.** Run `npx vitest run src/components/calculator-v2/ui/layout src/components/calculator-v2/ui/controller/lifecycle.test.tsx`. Expected: AR-29 PASSES on first run (Task 3 wires `observeHostSize` into the store and its App renders `data-kc-layout`). A11Y-7 and S-6 FAIL: there is no Functions or Graph settings button. AR-60 FAILS with `destroy is not a function`.
- [ ] **Step 3: Implement the layout and `destroy()`.** **`CalculatorLayout`** puts `rootRef` on `section.kc-app` and passes these props down: `ExpressionPanel { layout, pointer, keypadOpen, onToggleKeypad, onTouchFocusRow }`; `GraphPanel { host, themeRevision, reducedMotion, settingsOpen: settingsAnchor !== null, onOpenSettings }`; `Keypad { containerWidth, pointer, open: keypadOpen, onOpenChange: onKeypadChange }`; `SettingsPopover { anchor, open, onClose }`. **`App`** reads `useEngineSnapshot(engine)` and `useSyncExternalStore(store.subscribe, store.get)`, holds `settingsAnchor` state, which Settings toggles, and holds `rootRef = useRef<HTMLElement>(null)`. It passes `collapsed = settings.expressionsCollapsed`, `keypadOpen = settings.keypad` and `revealRowId = snapshot.focusedRowId ?? snapshot.activeRowId`. The keypad callbacks call `engine.updateSettings({ keypad })`. `onTouchFocusRow` is a no-op until Task 10. `reducedMotion = settings.reducedMotion`; Task 11 adds the media query. **`destroy()`**, unless already destroyed: 1. Cancels the field wait and calls `root.unmount()`. 2. Runs the disposers in reverse order. 3. Calls `announcer.destroy()`, `styles.dispose()` and `engine.destroy()`. 4. Calls `shadow.replaceChildren()`, deletes `element.dataset.reducedMotion`, and calls `bumpDevCounter("calculators", -1)`.
- [ ] **Step 4: Run the tests and confirm they pass.** Run the Step 2 command, then `npx vitest run src/components/calculator-v2`. Expected: PASS.
- [ ] **Step 5: Commit.** Run `git add src/components/calculator-v2 && git commit -m "Compose calculator v2 layout and teardown (AR-29, A11Y-7, S-6, AR-60)"`

### Task 5: Quiz host (AR-57, AN-13, AR-35, AR-60, KB-4)

**Files:** create `host/quiz-host.ts`; test `host/quiz-host.test.ts`. **Consumes:** `KarmanCalculator` and `lastFocusedRow` (Task 3); `reportCalculatorError` (03); `exposeEngineForTests` (07); `CALCULATOR_V2_BUILD`. **Produces:** `OpenTrigger`, `QuizMountOptions`, `QuizCalculatorHandle` and `mountQuizCalculator`, exactly as in `01` section 12, except the KaTeX stylesheet import, which Task 7 adds with its AR-39 and AR-40 tests. 12 later adds `applyTransfer`.

- [ ] **Step 1: Write the failing tests** (jsdom). The `../KarmanCalculator` mock class records its constructor arguments in `h.ctor` and itself in `h.instance`. Its `engine`, `focusExpression`, `activateExpression`, `focusBoundary`, `updateSettings`, `reflow` and `destroy` are `vi.fn()`, and `getExpressions` returns ids `"1"` and `"2"`. `lastFocusedRow` returns `h.lastRow`. Mock `@/components/calculator/report-error`, and make the `../ui/hooks/dev-hooks` mock's `exposeEngineForTests` return `h.unexpose`. `beforeEach` runs `vi.clearAllMocks()` and sets `h.lastRow = null`. `opts(o)` builds `QuizMountOptions` with fresh `div`s and both flags false. `SOURCE()` reads `quiz-host.ts`.

```
it("AR-57 the quiz host reports calculator errors with CALCULATOR_V2_BUILD", () => {
  const o = opts(); mountQuizCalculator(o); const [element, options, hooks] = h.ctor.mock.calls[0]; const error = new Error("boom");
  options.onError(error); expect(reportCalculatorError).toHaveBeenCalledWith(error, CALCULATOR_V2_BUILD); expect([element, hooks.chromeSlot]).toEqual([o.element, o.chromeSlot]); });
it("AN-13 reducedMotion is passed at construction and setReducedMotion updates the setting live", () => {
  const handle = mountQuizCalculator(opts({ reducedMotion: true })); expect(h.ctor.mock.calls[0][1].reducedMotion).toBe(true);
  handle.setReducedMotion(false); expect(h.instance.updateSettings).toHaveBeenCalledWith({ reducedMotion: false }); });
it("AR-35 the quiz host uses only the public API, focusBoundary and the recorded internal channels (Decision 6)", () => {
  const allowed = ["engine", "focusExpression", "activateExpression", "getExpressions", "updateSettings", "focusBoundary", "reflow", "destroy"];
  expect([...SOURCE().matchAll(/calculator\.(\w+)/g)].map((m) => m[1]).filter((n) => !allowed.includes(n))).toEqual([]);
  expect(SOURCE()).toMatch(/^import \{ KarmanCalculator, lastFocusedRow \} from "\.\.\/KarmanCalculator";$/m); });
it("AR-60 the quiz handle's destroy is idempotent and clears the test global", () => { const handle = mountQuizCalculator(opts()); handle.destroy(); handle.destroy();
  expect([h.instance.destroy.mock.calls.length, h.unexpose.mock.calls.length]).toEqual([1, 1]); });
it("KB-4 focusOnOpen for mouse or keyboard focuses the last focused row, else row 1", () => {
  const handle = mountQuizCalculator(opts()); handle.focusOnOpen("mouse"); expect(h.instance.focusExpression).toHaveBeenLastCalledWith("1");
  h.lastRow = "2"; handle.focusOnOpen("keyboard"); expect(h.instance.focusExpression).toHaveBeenLastCalledWith("2"); });
```

- [ ] **Step 2: Run the tests and confirm they fail.** Run `npx vitest run src/components/calculator-v2/host/quiz-host.test.ts`. Expected: FAIL with `Failed to resolve import "./quiz-host"`.
- [ ] **Step 3: Implement `mountQuizCalculator(options: QuizMountOptions): QuizCalculatorHandle`.** Construct `new KarmanCalculator(options.element, { reducedMotion, onError: (e) => reportCalculatorError(e, CALCULATOR_V2_BUILD) }, { chromeSlot, announceResetOnMount: options.announceReset })`. Call `exposeEngineForTests(calculator.engine)` and keep the result as `unexpose`. `focusOnOpen(trigger)` runs `calculator.focusExpression(lastFocusedRow(calculator) ?? calculator.getExpressions()[0].id)` for every trigger. Task 7 changes the touch branch. `focusBoundary` and `reflow` forward to the calculator. `setReducedMotion(v)` calls `calculator.updateSettings({ reducedMotion: v })`. `destroy` is idempotent: it calls `unexpose()`, then `calculator.destroy()`.
- [ ] **Step 4: Run the tests and confirm they pass.** Run the Step 2 command. Expected: PASS.
- [ ] **Step 5: Commit.** Run `git add src/components/calculator-v2/host && git commit -m "Add calculator v2 quiz host entry (AR-35, AR-57)"`

### Task 6: Harness page, layout CSS, row reveal and layout browser tests (L-1, L-2, L-8, L-14; AR-60 worker gate)

**Files:** create `tests/calculator/fixture/v2/calculator.html`, `tests/calculator/fixture/v2/calculator.tsx`, `tests/calculator/v2/shell-helpers.ts`, `tests/calculator/v2/shell-probes.ts`, `tests/calculator/v2/shell.spec.ts` and `ui/layout/reveal-row.ts`; modify `ui/layout/CalculatorLayout.tsx` and `styles/base.css` (regenerate). **Consumes:** `mountQuizCalculator` (Task 5); `globalThis.__calculatorHarness` (07). **Produces:** `revealRow(region: HTMLElement, rowId: string | null): void`, and the harness for Tasks 7 to 13 at `/v2/calculator.html?skin=&w=&h=&rows=&reducedMotion=1&announceReset=1`:

```
declare global { var __shell: { handle: QuizCalculatorHandle; resizeFrame(width: number, height: number): void;
  remount(o?: { announceReset?: boolean; reducedMotion?: boolean }): void;   // destroys and mounts again with the same rows; keeps log; resets log.mountedAt
  log: { mountedAt: number; escapes: { defaultPrevented: boolean }[]; announcements: { text: string; t: number }[] } } | undefined; }
```

**The page:** `calculator.html` carries `<meta name="viewport" content="width=device-width,initial-scale=1" />`, as `tests/calculator/fixture/index.html` does. Body: `<button id="outside">`, then `<div id="frame" tabindex="-1">` holding `<div id="slot" data-calculator-title-slot>` and `<div id="calc">`. `#frame` is `position: fixed` at the top left with `width: min(<w>px, 100vw)` and `height: min(<h>px, 100dvh)` (default `100vw` by `100dvh`); `resizeFrame` clamps the same way (R5). `#calc` fills it. The harness sets `html[data-theme]` from `skin` (default `ivory`). `rows` (a JSON `string[]`) goes through `setExpressions` with ids `"1"`, `"2"` and so on, at every mount. A bubble-phase Escape listener on `#frame` logs each Escape's `defaultPrevented` and sets `data-closed` when it is false; it stands in for 11's frame and sees every Escape, because the shell never stops one (Decision 4). A `MutationObserver` logs each non-empty text that the shadow `[role="status"]` region takes, with `performance.now()`; `remount()` observes the new region.

- [ ] **Step 1: Write the harness and the failing tests.** The spec files import `{ expect, test, type Locator, type Page }`. `shell-helpers.ts` declares these once; the bodies are the implementer's:

```
useConsoleGuard(): void                            // beforeEach/afterEach hooks that fail the test on any console error or page error
openShell(page, query = ""): Promise<void>        // goto /v2/calculator.html + query; wait for __shell and [data-kc-layout]
enc(rows: string[]): string                        // encodeURIComponent(JSON.stringify(rows))
rowField(page, id): Locator                        // `#calc [data-row-id="${id}"] .mq-editable-field`
rows(page): Promise<{ id: string; latex: string; valueText: string | null }[]>   // __calculatorHarness.engine.getSnapshot().rows
keypadOpen(page): Promise<boolean>; focusedRow(page): Promise<string | null> // settings.keypad; row id holding shadowRoot.activeElement
box(page, cls): Promise<{ x: number; y: number; width: number; height: number }>  // bounding box of #calc .<cls>
names(page, cls): Promise<string[]>                                         // visible button names (aria-label or text), DOM order
expectOrder(names: string[], patterns: RegExp[]): void                      // every pattern found, at increasing indices
frames(page, n = 2): Promise<void>; api(page, script: string): Promise<void> // n animation frames; evaluate with c = __shell.handle.calculator
announced(page): Promise<string[]>                                          // __shell.log.announcements texts
```

`shell-probes.ts` starts with `measureL14` and `popoverCoversRow1`; later tasks add theirs. `shell.spec.ts`:

```
const TOOLBAR = [/^add item/i, /^undo/i, /^redo/i, /^edit list/i, /^collapse list/i], GRAPH = [/^graph settings$/i, /^zoom in$/i, /^zoom out$/i];
test("L-1 desktop: list on the left at max(260px, 40%); toolbar and graph controls in order; Home only off the default view", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await openShell(page, "?w=800&h=600"); const [list, graph] = [await box(page, "kc-list-region"), await box(page, "kc-graph-region")];
  expect(Math.abs(list.width - 320)).toBeLessThanOrEqual(1); expect(list.x + list.width).toBeLessThanOrEqual(graph.x + 1);
  expectOrder(await names(page, "kc-list-region"), TOOLBAR); expectOrder(await names(page, "kc-graph-region"), GRAPH);
  for (const p of GRAPH) { const b = (await page.locator("#calc .kc-graph-region").getByRole("button", { name: p }).boundingBox())!;
    expect([b.x >= graph.x + graph.width / 2, b.y <= graph.y + graph.height / 2]).toEqual([true, true]); }
  expect((await names(page, "kc-graph-region")).some((n) => /^home$/i.test(n))).toBe(false); // 08's Home control
  await page.getByRole("img", { name: /^Graph from/ }).press("ArrowRight"); await expect(page.getByRole("button", { name: /^home$/i })).toBeVisible();
  await page.evaluate(() => globalThis.__shell!.resizeFrame(600, 600)); await expect.poll(async () => Math.round((await box(page, "kc-list-region")).width)).toBe(260); });
test("L-2 stacked: graph, toolbar, list, then keypad; the graph keeps 40% of the height with the keypad closed", async ({ page }) => {
  await openShell(page, "?w=400&h=700"); const host = (await page.locator("#calc").boundingBox())!; // clamped on phones (R5)
  const [graph, list] = [await box(page, "kc-graph-region"), await box(page, "kc-list-region")];
  expect(graph.y + graph.height).toBeLessThanOrEqual(list.y + 1); expect(graph.height).toBeGreaterThanOrEqual(0.4 * host.height - 1);
  expectOrder(await names(page, "kc-list-region"), [TOOLBAR[0], /keypad/i, ...TOOLBAR.slice(1)]); expectOrder(await names(page, "kc-graph-region"), GRAPH);
  await api(page, "c.updateSettings({ keypad: true })"); const keypad = (await page.getByRole("region", { name: "Keypad" }).boundingBox())!;
  const listNow = await box(page, "kc-list-region"); expect(keypad.y).toBeGreaterThanOrEqual(listNow.y + listNow.height - 1); });
test("L-8 the layout follows the container width, not the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await openShell(page, `?w=800&h=600&rows=${enc(["y=x", "1+1"])}`); const layout = page.locator("#calc [data-kc-layout]");
  for (const [w, l] of [[461, "stacked"], [560, "desktop"]] as const) { await page.evaluate((x) => globalThis.__shell!.resizeFrame(x, 600), w); await expect(layout).toHaveAttribute("data-kc-layout", l);
    const [list, graph] = [await box(page, "kc-list-region"), await box(page, "kc-graph-region")]; expect(l === "stacked" ? graph.y + graph.height <= list.y + 1 : list.x + list.width <= graph.x + 1, `${w}`).toBe(true); } // stacked: graph above the list; desktop: list left of it
  expect((await rows(page)).map((r) => r.latex)).toEqual(["y=x", "1+1"]); });
test("AR-60 destroying the quiz handle terminates the calculator's worker", async ({ page }) => {
  await openShell(page); const workers = () => page.evaluate(() => globalThis.__karmanCalculatorCounters?.workers ?? 0); await expect.poll(workers).toBeGreaterThan(0);
  const before = await workers(); await api(page, "globalThis.__shell.handle.destroy()"); await expect.poll(workers).toBe(before - 1); }); // 07 bumps "workers" down on terminate
test("L-14 no horizontal scroll from 320×568 to 1920×1080; keypad and toolbar never cover the focused row in either order; a popover never does", async ({ page }) => {
  for (const [width, height] of [[320, 568], [375, 667], [390, 844], [844, 390], [768, 1024], [1024, 768], [1920, 1080]]) { await page.setViewportSize({ width, height });
    for (const steps of [['c.updateSettings({ keypad: true }); c.focusExpression("15")'], ['c.focusExpression("15")', "c.updateSettings({ keypad: true })"]]) {
      await openShell(page, `?rows=${enc(Array.from({ length: 15 }, (_, i) => `y=${i + 1}x`))}`); // keypad then focus in one tick; focus, then keypad
      for (const script of steps) { await api(page, script); await frames(page, 3); } const m = await page.evaluate(measureL14), at = `${width}x${height} ${steps.length}`;
      // measureL14 → { pageOverflow: scrollWidth − innerWidth (min 0); wide: shadow elements that scroll sideways or pass the host's right edge;
      //               row: rect of row 15; toolbarBottom: Add item button bottom; keypadTop: Keypad region top }
      expect([m.pageOverflow, m.wide], at).toEqual([0, []]); expect([m.row.top >= m.toolbarBottom - 0.5, m.row.bottom <= m.keypadTop + 0.5], at).toEqual([true, true]); } }
  await page.setViewportSize({ width: 320, height: 568 }); await openShell(page, `?rows=${enc(["y=x", "1"])}`); // stacked: the popover can reach the list
  await page.getByRole("button", { name: "Graph settings" }).click(); await expect(page.locator(".kc-settings[role=dialog]")).toBeVisible();
  await api(page, 'c.focusExpression("1")'); await expect.poll(() => page.evaluate(popoverCoversRow1)).toBe(false); }); // .kc-settings[role=dialog] rect vs row 1
```

- [ ] **Step 2: Run the tests and confirm they fail.** Run browser `-g "L-1|L-2|L-8|L-14|AR-60 destroying"`. Expected: L-1, L-2, L-8 and L-14 FAIL. With no layout CSS the regions stack in block flow, list first, so L-1 measures a list width of about 800, and L-2 and L-8 (at 461) find the graph below the list. L-14 also fails: row 15 ends below the keypad's top at 320×568, and the popover still covers row 1. AR-60 PASSES on first run (gate check of Task 4's `destroy()` and 07's `workers` counter).
- [ ] **Step 3: Add the layout rules to `base.css` and regenerate; add the row reveal.** `CalculatorLayout` also writes `data-keypad={String(keypadOpen)}`.

```
.kc-app { display: grid; width: 100%; height: 100%; overflow: hidden; }
.kc-app[data-kc-layout="desktop"] { grid-template: "list graph" minmax(0, 1fr) "keypad keypad" auto / max(260px, 40%) minmax(0, 1fr); }
.kc-app[data-kc-layout="desktop"][data-collapsed="true"] { grid-template-columns: auto minmax(0, 1fr); }
.kc-app[data-kc-layout="stacked"] { grid-template: "graph" minmax(40%, 1fr) "list" minmax(0, 1fr) "keypad" auto / minmax(0, 1fr); }
.kc-app[data-kc-layout="stacked"][data-keypad="true"] { grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) auto; }
.kc-list-region { grid-area: list; min-width: 0; min-height: 0; display: flex; flex-direction: column; } /* overflow stays visible for 09's Expand list overlay (AN-3, 09 consumer note 4) */
.kc-list-region > .kc-list-panel { flex: 1 1 0; min-height: 0; }
.kc-graph-region { grid-area: graph; position: relative; min-width: 0; min-height: 0; }
.kc-keypad-region { grid-area: keypad; min-width: 0; }
[data-row-id] { scroll-margin-block: 8px; }
```

`revealRow(region, rowId)` calls `scrollIntoView({ block: "nearest" })` on the `[data-row-id]` element of `region` whose id is `rowId`, and does nothing for `null` or a missing row. `CalculatorLayout` observes `div.kc-list-region` with a `ResizeObserver` (disconnected on unmount) whose callback calls `revealRow(region, latestRevealRowId.current)`. The list box changes size when the keypad opens or closes and when the layout or host size changes, so the row stays in view whichever comes first (Decision 2). An `onFocus` handler on the list region calls `onCloseSettings()` while `settingsAnchor !== null` (Decision 7).

- [ ] **Step 4: Run the tests and confirm they pass.** Run the Step 2 command on all five projects. Expected: PASS.
- [ ] **Step 5: Commit.** Run `git add tests/calculator src/components/calculator-v2 && git commit -m "Add calculator v2 shell harness, layouts and row reveal (L-1, L-2, L-8, L-14)"`

### Task 7: Fonts, typography and touch opening (AR-39, AR-40, TH-17, KB-4, OI-7)

**Files:** modify `styles/base.css` (regenerate), `host/quiz-host.ts`, `host/quiz-host.test.ts` and, for KB-4, `docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md`; test `shell.spec.ts`, with probes in `shell-probes.ts`. **Consumes:** 05's MathQuill font mapping; the size variables in `tokens.css`; `QuizMountOptions.frame`; `katex/dist/katex.min.css`.

- [ ] **Step 1: Apply the OI-7 spec text.** In KB-4, replace `On open, focus goes to the first row` with:

  > On an open by mouse or keyboard, focus goes to the first row's MathField; on an open by a touch or pen tap (toolbar button or side button), the first row becomes the active row as API-12 activateExpression defines and DOM focus goes to the calculator window frame, so neither the keypad nor the system keyboard opens until the student taps a row (K-2)

- [ ] **Step 2: Write the failing tests.** `cs(page, selector, text?)` returns `[fontFamily, fontSize]` of the first shadow match of `selector`, or, with `text`, of the first match whose trimmed text equals `text`. The `recordCanvasFonts` init script pushes `this.font` into `globalThis.__fonts` on each `fillText`. `katexMathLoaded()` is true when `document.fonts` holds a face whose unquoted `family` is `KaTeX_Math` with `status === "loaded"` (unlike `check()`, it is false when no such face exists). `shadowHasFontFace()` scans the shadow root's `adoptedStyleSheets` and `styleSheets`. `platformFonts(page, selector)` uses CDP: `DOM.getDocument({ depth: -1, pierce: true })`, then `Runtime.evaluate` of the shadow query for an `objectId`, then `DOM.requestNode`, then `CSS.getPlatformFontsForNode`. It returns the `familyName` values.

```
test("AR-40 KaTeX fonts reach the shadow root: KaTeX_Math loads, check() is true, no font request fails, no @font-face inside", async ({ page }) => {
  const failed: string[] = []; page.on("requestfailed", (r) => { if (/\.(woff2?|ttf)\b/.test(r.url())) failed.push(r.url()); });
  await openShell(page); await rowField(page, "1").click(); await page.keyboard.type("y=x");
  await page.waitForFunction(katexMathLoaded, undefined, { timeout: 5000 }); expect(await page.evaluate(() => document.fonts.check("16px KaTeX_Math"))).toBe(true);
  expect(await page.evaluate(shadowHasFontFace)).toBe(false); expect(failed).toEqual([]); });
test("AR-40 CDP reports KaTeX_Math as the platform font of a MathQuill variable", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP is Chromium-only"); await openShell(page); await rowField(page, "1").click(); await page.keyboard.type("y=x");
  await expect.poll(() => platformFonts(page, ".mq-root-block var")).toContain("KaTeX_Math"); });
test("TH-17 UI text Arial 14px, math KaTeX 18px, keys in KaTeX, axis numbers 13px Arial", async ({ page }) => {
  await page.addInitScript(recordCanvasFonts); await openShell(page, `?w=800&h=600&rows=${enc(["y=x"])}`); await api(page, "c.updateSettings({ keypad: true })");
  expect(await cs(page, ".kc-list-region button")).toEqual([expect.stringMatching(/^Arial\b/), "14px"]); expect(await cs(page, ".mq-root-block")).toEqual([expect.stringMatching(/^"?KaTeX_Main/), "18px"]);
  expect((await cs(page, ".mq-root-block var"))[0]).toMatch(/^"?KaTeX_Math/); expect((await cs(page, '[aria-label="Keypad"] button', "7"))[0]).toMatch(/^"?KaTeX_Main/);
  const fonts = () => page.evaluate(() => (globalThis as unknown as { __fonts: string[] }).__fonts);
  await expect.poll(fonts).toContainEqual(expect.stringMatching(/^13px Arial/)); expect((await fonts()).filter((f) => !f.startsWith("13px"))).toEqual([]); });
test("KB-4 opens by mouse, keyboard and touch (OI-7) and reopen restores the last row", async ({ page }) => {
  await openShell(page, `?rows=${enc(["1", "2"])}`); const open = (t: string) => api(page, `globalThis.__shell.handle.focusOnOpen("${t}")`);
  await open("mouse"); await expect.poll(() => focusedRow(page)).toBe("1");
  await api(page, 'c.focusExpression("2")'); await page.locator("#outside").focus(); await open("keyboard"); await expect.poll(() => focusedRow(page)).toBe("2");
  await page.locator("#outside").focus(); await open("touch"); await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("frame");
  await expect(page.locator('#calc [data-row-id="2"]')).toHaveAttribute("data-active", "true"); expect([await keypadOpen(page), await focusedRow(page)]).toEqual([false, null]); });
test("R-10 after setBlank() a keyboard reopen focuses Expression 1", async ({ page }) => {
  await openShell(page, `?rows=${enc(["1", "2"])}`); await api(page, 'c.focusExpression("2")'); await api(page, "c.setBlank()"); await page.locator("#outside").focus();
  await api(page, 'globalThis.__shell.handle.focusOnOpen("keyboard")'); await expect.poll(() => focusedRow(page)).toBe("1"); });
```

Add to `quiz-host.test.ts` the test `it("AR-39 quiz-host imports katex/dist/katex.min.css at document scope", () => { expect(SOURCE()).toMatch(/^import "katex\/dist\/katex\.min\.css";$/m); })`, and `it("KB-4 focusOnOpen('touch') activates the last focused row and focuses the frame (OI-7)")`: with `h.lastRow = "2"`, it expects `activateExpression` called with `"2"`, `focusExpression` not called, and `frame.focus` called with `{ preventScroll: true }`.

- [ ] **Step 3: Run the tests and confirm what fails.** Run browser `-g "AR-40|TH-17|KB-4|R-10"` with `--project=calculator-ios`, and `npx vitest run src/components/calculator-v2/host -t "AR-39|KB-4"`. Expected: AR-39 FAILS: no import line. AR-40 FAILS: `waitForFunction` times out because no KaTeX `@font-face` exists in the document, and the CDP test receives a fallback family. TH-17 FAILS with `"18px"` expected: MathQuill's `.mq-math-mode { font-size: 115% }` gives about 20.7px. KB-4 touch FAILS, because `focusExpression` is still called. R-10 PASSES on first run (Task 5's row-1 fallback after 09's `setBlank` clears the last row).
- [ ] **Step 4: Implement.** Make `import "katex/dist/katex.min.css";` the first line of `quiz-host.ts`. In `base.css`, add `.mq-math-mode, .mq-editable-field { font-size: var(--kc-size-math); }`. It comes after MathQuill's rule, so it wins. Regenerate. In `quiz-host.ts`, `focusOnOpen("touch")` calls `calculator.activateExpression(id)`, then `options.frame.focus({ preventScroll: true })`.
- [ ] **Step 5: Run the tests and confirm they pass.** Run the Step 3 commands on all five projects. Expected: PASS.
- [ ] **Step 6: Commit.** Run `git add docs/superpowers/specs/calculator-v2 src/components/calculator-v2 tests/calculator/v2 && git commit -m "Load KaTeX fonts, resolve OI-7 and pin calculator v2 math typography (AR-39, AR-40, KB-4, TH-17)"`

### Task 8: Reset announcement (OI-3, A11Y-2 contribution)

**Files:** modify the A11Y-2 text in `docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md`, the AR-58 text in `docs/superpowers/specs/calculator-v2/d-architecture-integration.md`, and `KarmanCalculator.ts`; test `KarmanCalculator.test.ts` and `shell.spec.ts`. **Consumes:** `HostHooks.announceResetOnMount`; `RESET_ANNOUNCEMENT`; `Announcer.announce(text, { delayMs, key })` (05).

- [ ] **Step 1: Apply the OI-3 spec text.** In A11Y-2, replace `when a new question's calculator mounts while the window is open, its live region announces "Calculator cleared for this question." once, 500 ms after mount, and nothing is announced while the window is closed` with:

  > when the window was open at the question change (the lifted open state carried into the new question, AR-25), the new question's calculator announces "Calculator cleared for this question." once, 500 ms after mount; a calculator first mounted within a question by the toolbar, the side button or a transfer announces nothing (A11Y-11), and nothing is announced while the window is closed

  OI-3's issue says AR-58 has "the same wording", so in AR-58 replace `when the window is open, the new calculator announces the reset once (A11Y-2)` with:

  > when the window was open at the question change (AR-25), the new calculator announces the reset once, and a calculator first mounted within a question announces nothing (A11Y-2)

- [ ] **Step 2: Write the failing tests:**

```
it("A11Y-2 announceResetOnMount announces the reset once with a 500 ms delay; without it nothing is announced (OI-3)", () => {
  s.announced.length = 0; new KarmanCalculator(mount()); expect(s.announced).toEqual([]); new KarmanCalculator(mount(), undefined, { announceResetOnMount: true });
  expect(s.announced).toEqual([[RESET_ANNOUNCEMENT, { delayMs: 500, key: "reset" }]]); });
test("A11Y-2 the reset announcement plays once, 500 ms after mount, only when the window stayed open (OI-3)", async ({ page }) => {
  const log = () => page.evaluate(() => globalThis.__shell!.log); const count = async () => (await log()).announcements.length;
  await openShell(page, "?announceReset=1"); await expect.poll(count, { timeout: 3000 }).toBe(1);
  const { announcements: [first], mountedAt } = await log(); expect(first.text).toBe("Calculator cleared for this question.");
  expect([first.t - mountedAt >= 450, first.t - mountedAt < 1500]).toEqual([true, true]);
  await page.evaluate(() => globalThis.__shell!.remount({ announceReset: false })); await page.waitForTimeout(1500); expect(await count()).toBe(1);
  await page.evaluate(() => globalThis.__shell!.remount({ announceReset: true })); await expect.poll(count, { timeout: 3000 }).toBe(2); });
```

- [ ] **Step 3: Run the tests and confirm they fail.** Run `npx vitest run src/components/calculator-v2/KarmanCalculator.test.ts -t "A11Y-2"` and browser `-g "A11Y-2 the reset"`. Expected: FAIL with `expected [] to deeply equal [[…]]`, and the poll ends at 0.
- [ ] **Step 4: Implement the announcement.** At the end of the constructor, when `hooks?.announceResetOnMount` is true, call `announcer.announce(RESET_ANNOUNCEMENT, { delayMs: 500, key: "reset" })`. `destroy()` already calls `announcer.destroy()`, which cancels it.
- [ ] **Step 5: Run the tests and confirm they pass.** Run the Step 3 commands. Expected: PASS.
- [ ] **Step 6: Commit.** Run `git add docs/superpowers/specs/calculator-v2 src/components/calculator-v2 tests/calculator/v2 && git commit -m "Resolve OI-3: announce the reset only when the window stayed open (A11Y-2)"`

### Task 9: Keyboard: Escape layers, shortcuts and tab order (KB-3, KB-7, KB-13; A11Y-2 and NM-42 contributions)

**Files:** modify `ui/App.tsx`; test `shell-keyboard.spec.ts` and, for the contributions, `shell.spec.ts`. **Consumes:** `installShellKeyboard` (Task 2); `CalculatorLayoutProps.rootRef` (Task 4); `EscapeStack.handleEscape`, `performUndo`, `performRedo`, `insertRowBelow` and `EDITOR_MESSAGES` (09).

- [ ] **Step 1: Write the failing tests.** `layers(page)` returns `{ settings, functions, abc, keypad, closed }`. `settings` and `functions` read the `aria-expanded` of the Graph settings button and the `Functions` key, `abc` reads the `aria-pressed` of the `ABC` key (09 consumer note 6), `keypad` reads the engine setting, and `closed` reads `#frame[data-closed]`; a control that is not rendered reads `false`. `escapeOneLayerAtATime(page, steps)` presses Escape once per step and, after each press, polls `layers(page)` until it equals the state before the press merged with that step. `prevented(page)` returns each logged Escape's `defaultPrevented` (`__shell.log.escapes`). `send(page, init)` dispatches a composed, cancelable `keydown` on `shadowRoot.activeElement`. `tabCycle(page)` Tabs from `#outside` until focus returns there. It records `{ name, keypad, row, hidden, top, left }` for each shadow focus; `hidden` covers `[hidden]`, `[inert]`, `[aria-hidden="true"]` and `visibility: hidden`. `shell-keyboard.spec.ts`:

```
test("KB-3 Escape closes the popover, Functions panel, ABC page, keypad, then the calculator, by rank and not by opening order", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await openShell(page, "?w=800&h=600"); await rowField(page, "1").click(); await api(page, "c.updateSettings({ keypad: true })");
  for (const name of ["Functions", "ABC", "Graph settings"]) await page.getByRole("button", { name, exact: true }).click(); // 800 px: the tray, whose letters page keeps Functions (09 K-3)
  await expect.poll(() => layers(page)).toEqual({ settings: true, functions: true, abc: true, keypad: true, closed: false }); // a LIFO stack would now close ABC before Functions
  await escapeOneLayerAtATime(page, [{ settings: false }, { functions: false }, { abc: false }, { keypad: false }, { closed: true }]); expect(await prevented(page)).toEqual([true, true, true, true, false]); });
test("KB-3 on the phone keypad Escape closes the popover, Functions panel, keypad, then the calculator", async ({ page }) => {
  await openShell(page, "?w=400&h=700"); await rowField(page, "1").click(); await api(page, "c.updateSettings({ keypad: true })"); // under 600 px: the K-6 phone keypad on every project
  for (const name of ["Functions", "Graph settings"]) await page.getByRole("button", { name, exact: true }).click(); await expect.poll(() => layers(page)).toEqual({ settings: true, functions: true, abc: false, keypad: true, closed: false });
  await escapeOneLayerAtATime(page, [{ settings: false }, { functions: false }, { keypad: false }, { closed: true }]); expect(await prevented(page)).toEqual([true, true, true, false]); });
test("KB-7 shortcuts match event.code with Option-modified keys and skip composition", async ({ page }) => { await openShell(page); await rowField(page, "1").click(); await page.keyboard.type("x");
  await send(page, { code: "KeyK", key: "˚", altKey: true }); await expect.poll(() => keypadOpen(page)).toBe(true);
  await send(page, { code: "KeyK", key: "k", ctrlKey: true, isComposing: true }); await frames(page); expect(await keypadOpen(page)).toBe(true);
  await send(page, { code: "KeyZ", key: "w", ctrlKey: true }); await expect.poll(async () => (await rows(page))[0].latex).toBe("");
  await send(page, { code: "KeyY", key: "z", ctrlKey: true }); await expect.poll(async () => (await rows(page))[0].latex).toBe("x");
  await page.keyboard.press("Alt+KeyK"); await expect.poll(() => keypadOpen(page)).toBe(false); });
test("KB-13 Undo, Redo, Clear all, Add item and every keypad key are tabbable in visual order; a hidden keypad and collapsed list are skipped", async ({ page }) => {
  await openShell(page, `?w=800&h=600&rows=${enc(["1"])}`); await rowField(page, "1").click();
  for (const key of ["End", "2", "Control+KeyZ", "Control+KeyK"]) await page.keyboard.press(key); // Undo and Redo both enabled; keypad open
  await page.getByRole("button", { name: /^edit list/i }).click(); const open = await tabCycle(page);
  expect(open.filter((d) => d.hidden)).toEqual([]); expectOrder(open.map((d) => d.name), [/^add item/i, /^undo/i, /^redo/i, /^clear all/i]);
  const keys = open.filter((d) => d.keypad); expect(keys.length).toBeGreaterThan(0); expect(keys).toHaveLength(await page.locator('#calc [aria-label="Keypad"] button:visible').count());
  expect(keys.filter((d, i) => i > 0 && d.top < keys[i - 1].top - 2 && d.left <= keys[i - 1].left)).toEqual([]); // up only into a group further right
  await api(page, "c.updateSettings({ keypad: false })"); // tabCycle left focus on #outside, outside the shadow root
  await page.getByRole("button", { name: /^collapse list/i }).click(); await frames(page, 15);
  expect((await tabCycle(page)).filter((d) => d.row || (d.keypad && !/^show keypad$/i.test(d.name)))).toEqual([]); });
```

`shell.spec.ts` (contributions):

```
test("A11Y-2 Ctrl or Cmd+Z and the redo shortcut announce Undone. and Redone. like the toolbar", async ({ page }) => {
  await openShell(page); await rowField(page, "1").click(); await page.keyboard.type("1");
  await page.keyboard.press("ControlOrMeta+KeyZ"); await expect.poll(() => announced(page)).toContain(EDITOR_MESSAGES.undone);
  await page.keyboard.press("ControlOrMeta+Shift+KeyZ"); await expect.poll(() => announced(page)).toContain(EDITOR_MESSAGES.redone); });
test("NM-42 an Alt+Enter row-limit refusal announces the row-limit message and adds no row", async ({ page }) => {
  await openShell(page, `?rows=${enc(Array.from({ length: 100 }, (_, i) => String(i)))}`); await rowField(page, "1").click();
  await page.keyboard.press("Alt+Enter"); await expect.poll(() => announced(page)).toContain(EDITOR_MESSAGES.rowLimit); expect(await rows(page)).toHaveLength(100); });
```

- [ ] **Step 2: Run the tests and confirm they fail.** Run browser `-g "KB-3|KB-7|KB-13|A11Y-2 Ctrl|NM-42"`. Expected: FAIL. In both KB-3 tests the first Escape is not prevented, so the frame closes at once. KB-7 and KB-13 time out or find no keypad key, because Ctrl+K does nothing yet (`keypad: false`). A11Y-2 and NM-42 log no announcement.
- [ ] **Step 3: Install the keyboard handler in `App`.** Add `useEffect(() => installShellKeyboard(rootRef.current!, { onShortcut: (a) => latest.current(a), onEscape: () => escape.handleEscape() }), [escape])`, where `rootRef` is the ref App passes to `CalculatorLayout` and `latest` is a ref to the current handler. The actions: `undo` calls `performUndo(engine, announcer)` and `redo` calls `performRedo(engine, announcer)`, so the keyboard announces `EDITOR_MESSAGES.undone` and `EDITOR_MESSAGES.redone` like the toolbar (A11Y-2). `toggle-keypad` calls `engine.updateSettings({ keypad: !engine.settings.keypad })`; Task 10 routes it through the policy. `add-row-end` calls `insertRowBelow(engine, focus, announcer, null, "focus")`, which inserts, focuses the new row and announces `EDITOR_MESSAGES.rowLimit` on a refusal (NM-42), as Add item does.
- [ ] **Step 4: Run the tests and confirm they pass.** Run the Step 2 command on all five projects. Expected: PASS.
- [ ] **Step 5: Commit.** Run `git add src/components/calculator-v2/ui tests/calculator/v2 && git commit -m "Wire calculator v2 shortcuts and Escape layering (KB-3, KB-7, KB-13)"`

### Task 10: Keypad visibility policy (K-2, K-12; Review Focus 5)

**Files:** modify `ui/App.tsx` and `ui/layout/CalculatorLayout.tsx`; test `shell-keyboard.spec.ts`. **Consumes:** `reduceKeypad` and `KeypadEvent` (Task 2); `ExpressionPanelProps.onTouchFocusRow`; `KeypadProps.onOpenChange(open, by)` (09).

- [ ] **Step 1: Write the failing tests.** `tap(isMobile, locator)` taps on touch projects and clicks otherwise. `inputMode(page)` reads the `inputmode` of `shadowRoot.activeElement`.

```
test("K-2 fine pointer: the keypad starts hidden, Show keypad sits at the bottom left, and clicking a row keeps it closed", async ({ page, isMobile }) => {
  test.skip(isMobile, "fine-pointer case"); await openShell(page, "?w=800&h=600");
  const show = (await page.getByRole("button", { name: "Show keypad" }).boundingBox())!, host = (await page.locator("#calc").boundingBox())!;
  expect([show.x < host.x + host.width / 2, show.y > host.y + host.height / 2]).toEqual([true, true]); await rowField(page, "1").click(); await frames(page); expect(await keypadOpen(page)).toBe(false); });
test("K-2 coarse pointer: a row touch opens the keypad; after Hide keypad, row touches use the phone keyboard until Show keypad; defaults return per question", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch projects"); await openShell(page); await rowField(page, "1").tap(); await expect.poll(() => keypadOpen(page)).toBe(true);
  await page.getByRole("button", { name: "Hide keypad" }).tap(); await rowField(page, "1").tap(); await frames(page); expect([await keypadOpen(page), await inputMode(page)]).toEqual([false, "text"]);
  await page.getByRole("button", { name: "Show keypad" }).tap(); await rowField(page, "1").tap(); await expect.poll(() => keypadOpen(page)).toBe(true);
  await page.getByRole("button", { name: "Hide keypad" }).tap(); await page.evaluate(() => globalThis.__shell!.remount()); expect(await keypadOpen(page)).toBe(false);
  await rowField(page, "1").tap(); await expect.poll(() => keypadOpen(page)).toBe(true); }); // the student's close does not carry into the next question
test("K-2 hardware typing edits the row while the touch keypad is open", async ({ page }, info) => {
  test.skip(info.project.name !== "calculator-ios", "touch device with a hardware keyboard"); await openShell(page);
  await rowField(page, "1").tap(); await expect.poll(() => keypadOpen(page)).toBe(true); expect(await inputMode(page)).toBe("none");
  await page.keyboard.type("x+1"); await expect.poll(async () => (await rows(page))[0].latex).toBe("x+1");
  await page.keyboard.press("Escape"); await expect.poll(() => keypadOpen(page)).toBe(false); expect(await focusedRow(page)).toBe("1");
  await page.getByRole("button", { name: "Show keypad" }).tap(); await page.getByRole("button", { name: "Hide keypad" }).tap();
  await rowField(page, "1").tap(); await frames(page); expect(await keypadOpen(page)).toBe(false); });
test("K-12 opening the keypad, ABC page or Functions panel keeps the focused row and the caret", async ({ page, isMobile }) => {
  await openShell(page, `?rows=${enc(["1", "x+12"])}`); await tap(isMobile, rowField(page, "2")); for (const key of ["End", "ArrowLeft", "ArrowLeft"]) await page.keyboard.press(key);
  if (!isMobile) await tap(isMobile, page.getByRole("button", { name: "Show keypad" }));
  await expect.poll(() => keypadOpen(page)).toBe(true);
  for (const name of ["ABC", "ABC", "Functions"]) { await tap(isMobile, page.getByRole("button", { name, exact: true })); expect(await focusedRow(page)).toBe("2"); }
  await page.keyboard.type("7"); await expect.poll(async () => (await rows(page))[1].latex).toBe("x+712"); });
```

- [ ] **Step 2: Run the tests and confirm they fail.** Run browser `-g "K-2|K-12"` with `--project=calculator-ios --project=calculator-android`. Expected: FAIL. On calculator-ios and calculator-android the keypad stays closed after a row tap, so the coarse K-2 test and K-12 time out on `keypadOpen`. On calculator-chrome, K-12 fails at its first `focusedRow` check with `null`: the Show keypad click moves focus from row 2 to that button, which unmounts once the keypad opens. Show keypad is the control that fails first on desktop; ABC and Functions alone keep the row, because 09's keys already prevent `mousedown` (K-10).
- [ ] **Step 3: Implement the policy.** `App` keeps `studentClosed` in a ref and sends each event through `reduceKeypad({ open: engine.settings.keypad, studentClosed }, event)`: `onTouchFocusRow` sends `{ type: "touch-focus-row" }`. `onKeypadChange(open, by)` sends `{ type: "set", open, by }`. `onToggleKeypad` and the `toggle-keypad` shortcut send `{ type: "set", open: !engine.settings.keypad, by: "student" }` (Decision 3). It stores the new `studentClosed`. When `open` changed, it calls `engine.updateSettings({ keypad: next.open })`. `CalculatorLayout` adds `onMouseDownCapture={(e) => { if (rowFocused()) e.preventDefault(); }}` to `.kc-keypad-region`, where `rowFocused()` is `host.shadowRoot!.activeElement?.closest("[data-row-id]") != null`. This is 09's K-10 mechanism (every key prevents `mousedown`) extended to the region's other controls, such as Show keypad. A cancelled `mousedown` keeps focus and caret in the row in Chromium, Gecko and WebKit, while a cancelled `pointerdown` does not reliably do so in Gecko. A touch tap's compatibility `mousedown` takes the same path, so no `pointerdown` handler is added. Focus and caret stay in the row (K-12), and the click still fires.
- [ ] **Step 4: Run the tests and confirm they pass.** Run the Step 2 command on all five projects. Expected: PASS.
- [ ] **Step 5: Commit.** Run `git add src/components/calculator-v2/ui tests/calculator/v2 && git commit -m "Add the calculator v2 keypad visibility policy (K-2, K-12)"`

### Task 11: Reduced motion and motion limits (AN-13, AN-14, AR-38)

**Files:** modify `ui/App.tsx` and `styles/base.css` (regenerate); test `shell-motion-theme.spec.ts`. **Consumes:** `ShellState.reducedMotionMedia` (Task 2); the `:host([data-reduced-motion="true"])` and media rules of `tokens.css` (05).

- [ ] **Step 1: Write the failing tests.** The helpers: `seconds(d)` parses `s` and `ms` values. `hostVar(page, name)` reads a computed custom property of `#calc`. `motionNow(page)` returns `{ durations, easing }` for every shadow element. `motionAcrossLayers(page)` clicks `rowField(page, "1")`, opens the keypad with `c.updateSettings({ keypad: true })`, then clicks the `Functions` key and the Graph settings button, collecting `motionNow` after each. It closes the popover and the panel with Escape and leaves the keypad open, with focus on the Graph settings button, where 09's popover returns it. `allZero(list)` is true when every duration is 0. `overshoots(easing)` is true for `linear(…)` or a `cubic-bezier` with y outside [0, 1]. `instantMotion(page)` checks the motions that exist only while they run: AN-8's Home fade, AN-5's row insert and AN-3's list collapse. It presses ArrowRight on `getByRole("img", { name: /^Graph from/ })` and waits for the Home button. It starts the `leavingFrames` probe (not awaited), which counts, over the next 10 animation frames, the frames in which `#calc` holds `[data-graph-home][data-phase="leaving"]`. Then it presses Home on the graph, waits `frames(page, 1)` and records `homeGone` (no `[data-graph-home]` remains) and `leavingFrames` (the probe's count). Next it clicks Add item, waits `frames(page, 1)` and records `rowSettled`: the new row's height equals its height 300 ms later within 0.5 px. Then it reads the graph region's width, clicks Collapse list and waits `frames(page, 1)`. It records `graphMoved` (the width differs from before by more than 1 px) and `graphSettled` (it equals the width 300 ms later within 0.5 px). Last, it clicks Expand list and waits until `expressionsCollapsed` is false. `INSTANT` is `{ homeGone: true, leavingFrames: 0, rowSettled: true, graphMoved: true, graphSettled: true }`. With normal motion, Home lingers for its fade, the row grows over 200 ms, and 09 flips `expressionsCollapsed` only when the 200 ms collapse ends (09 consumer note 4).

```
test("AN-14 no transition or animation exceeds 400 ms or overshoots, and durations come from :host custom properties", async ({ page }) => {
  await openShell(page, "?w=800&h=600"); const all = await motionAcrossLayers(page);
  expect(all.flatMap((m) => m.durations).filter((d) => seconds(d) > 0.4)).toEqual([]); expect(all.flatMap((m) => m.easing).filter(overshoots)).toEqual([]);
  expect(await hostVar(page, "--kc-duration-normal")).toBe("400ms"); await page.emulateMedia({ reducedMotion: "reduce" });
  expect([await hostVar(page, "--kc-duration-normal"), allZero(await motionNow(page))]).toEqual(["0ms", true]); });
test("AN-13 the quiz Question animations setting or the OS preference makes calculator motion instant, Home fade, row insert and list collapse included", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await openShell(page, "?w=800&h=600&reducedMotion=1"); // desktop on every project, so Collapse list widens the graph
  await expect(page.locator("#calc")).toHaveAttribute("data-reduced-motion", "true"); expect(allZero(await motionAcrossLayers(page))).toBe(true); expect(await instantMotion(page)).toEqual(INSTANT);
  await api(page, "globalThis.__shell.handle.setReducedMotion(false)"); await expect(page.locator("#calc")).toHaveAttribute("data-reduced-motion", "false"); expect(await hostVar(page, "--kc-duration-fast")).toBe("200ms");
  await page.emulateMedia({ reducedMotion: "reduce" }); expect(await hostVar(page, "--kc-duration-fast")).toBe("0ms"); expect(await instantMotion(page)).toEqual(INSTANT); }); // the OS path: reducedMotionMedia into GraphPanel
test("AR-38 CSS transitions and keyframes stop under prefers-reduced-motion and the keypad opens within a frame", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await openShell(page, "?w=800&h=600"); expect(allZero(await motionAcrossLayers(page))).toBe(true);
  await page.keyboard.press("Escape"); await expect.poll(() => keypadOpen(page)).toBe(false); // focus is on Graph settings; closes the keypad left open
  await page.keyboard.press("Control+KeyK"); await frames(page, 1); const keypad = page.getByRole("region", { name: "Keypad" });
  const first = await keypad.boundingBox(); await page.waitForTimeout(300); expect(await keypad.boundingBox()).toEqual(first); });
```

- [ ] **Step 2: Run the tests and confirm what fails.** Run browser `-g "AN-13|AN-14|AR-38"`. Expected: AN-13 FAILS because `#calc` has no `data-reduced-motion`. AN-14 and AR-38 PASS on first run (gate checks of 05's tokens and the component CSS).
- [ ] **Step 3: Implement reduced motion.** In `App`, add `useLayoutEffect(() => { host.dataset.reducedMotion = String(settings.reducedMotion); }, [settings.reducedMotion])`, and pass `reducedMotion={settings.reducedMotion || shell.reducedMotionMedia}` to the layout. In `base.css`, set `transition-duration: 0ms !important; animation-duration: 0ms !important; animation-iteration-count: 1 !important` on `*, *::before, *::after`, under both `@media (prefers-reduced-motion: reduce)` and `:host([data-reduced-motion="true"])`. Regenerate.
- [ ] **Step 4: Run the tests and confirm they pass.** Run the Step 2 command on all five projects, and `npx vitest run src/components/calculator-v2/ui/controller/stylesheet.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit.** Run `git add src/components/calculator-v2 tests/calculator/v2 && git commit -m "Honour calculator v2 reduced motion (AN-13, AN-14, AR-38)"`

### Task 12: Live theme, focus rings and rendered contrast (TH-15, TH-14, OI-31, TH-1 contribution)

**Files:** modify `KarmanCalculator.ts`, `styles/base.css` (regenerate), `ui/controller/stylesheet.test.ts` and, for OI-31, the TH-14 text in `docs/superpowers/specs/calculator-v2/e-ux-keypad-accessibility-theme.md`; test `shell-motion-theme.spec.ts` and, for TH-1, `shell.spec.ts`. **Consumes:** `watchTheme` (Task 2); `SKIN_IDS`, `SKIN_COLORS` and `contrastRatio` (03, relative imports); `GraphPanelProps.themeRevision` (08); 09's L-3 row outline (`outline-offset: -2px`).

- [ ] **Step 1: Check the OI-31 decision and apply its spec text.** Run `grep -cE '^\| OI-31 .*\| (accepted|amended) [0-9]{4}-[0-9]{2}-[0-9]{2}' docs/superpowers/specs/calculator-v2/open-items.md`. Expected: `1`: the OI-31 row exists and its last cell records an accepted or amended decision in the form Notes item 2 fixes. At `0` (no row, no Decision cell yet, or `rejected YYYY-MM-DD`), stop and ask the lead; a rejected OI-31 means Task 12 does not start. Then, in TH-14, replace `with a 2 px offset,` with the text below. When the cell reads `amended YYYY-MM-DD: <wording>`, apply that recorded wording instead, and stop and ask the lead if it changes the -2px inset row outline Steps 2 to 5 test:

  > with a 2 px offset (an expression row's L-3 outline is drawn 2 px inside the row's edge, outline-offset -2px, so the list's scroll box never clips it; its contrast is measured against the row's background),

- [ ] **Step 2: Write the failing tests.** The helpers: `toHex(css): { hex; alpha }` and `onBackground(fg, alpha, bg): string`, which returns the hex of `fg` at `alpha` over `bg`. `ringOf(page)` returns `{ name, style, width, offset, color, background, inset }` for the focused shadow element, or `null`. For MathQuill's textarea it measures the `li[data-row-id]` and sets `inset: true`. The background is the first element with a `background-color` alpha of 1, starting at the measured element when `inset` is true and at its parent otherwise, crossing the host. `tabRings(page)` Tabs from `#outside` until focus returns there (at most 150 presses) and returns each non-null `ringOf`. `textPairs(page)` returns `{ kind: "text" | "boundary", name, fg, alpha, bg }`. It covers visible elements with their own text (excluding `.kc-sr-only` and MathQuill's textarea) and bordered inputs or `.mq-editable-field` elements. `alpha` includes the ancestors' opacity. The `recordStrokes` init script pushes `strokeStyle` into `globalThis.__strokes` on each `stroke()`; `strokes(page)` reads that list. `setThemeAndWait(theme)` sets `html.dataset.theme`, awaits one `requestAnimationFrame` and a `setTimeout(0)`, and returns `{ strokes, paper }`, where `paper` is `--kc-paper` on `#calc`. `markLayoutNode` sets the property `kcMark = 1` on `[data-kc-layout]`, and `layoutNodeMarked` returns whether that property is still 1. `PROJECTS = ["calculator-chrome", "calculator-android"]`, because the computed colours do not depend on the engine. In `stylesheet.test.ts`:

```
it("TH-14 base.css gives :focus-visible a 2px solid focus-ring outline at a 2px offset", () => {
  expect(CALCULATOR_V2_CSS).toMatch(/^:focus-visible \{\s*outline: 2px solid var\(--kc-focus-ring\);\s*outline-offset: 2px;\s*\}/m); }); // a top-level rule, not 08's or 09's
```

`shell-motion-theme.spec.ts`:

```
test("TH-15 data-theme, contrast, forced-colour and colour-scheme changes repaint within one frame with no remount and no lost rows; prefers-contrast never toggles Reverse contrast", async ({ page }) => {
  await page.addInitScript(recordStrokes); await openShell(page, `?skin=ivory&w=800&h=600&rows=${enc(["y=x", "1+1"])}`);
  await rowField(page, "2").click(); await page.evaluate(markLayoutNode); // sets a property on [data-kc-layout] that a remount would lose
  const after = await page.evaluate(setThemeAndWait, "observatory"); const roles = SKIN_COLORS.observatory.normal.roles;
  expect([after.strokes.includes(roles.axis.toLowerCase()), after.paper]).toEqual([true, roles.paper.toLowerCase()]);
  expect([await page.evaluate(layoutNodeMarked), (await rows(page)).length, await focusedRow(page)]).toEqual([true, 2, "2"]);
  const s0 = (await strokes(page)).length; await page.emulateMedia({ contrast: "more" }); await frames(page); expect([(await strokes(page)).length > s0, await page.evaluate(() => globalThis.__calculatorHarness!.engine.settings.reverseContrast)]).toEqual([true, false]);
  const s1 = (await strokes(page)).length; await page.emulateMedia({ forcedColors: "active" }); await frames(page); expect((await strokes(page)).length).toBeGreaterThan(s1);
  const paper = async () => (await hostVar(page, "--kc-paper")).trim().toLowerCase(); await page.emulateMedia({ contrast: "no-preference", forcedColors: "none", colorScheme: "light" });
  await page.evaluate(() => { delete document.documentElement.dataset.theme; }); await frames(page); expect(await paper()).toBe(SKIN_COLORS.ivory.normal.roles.paper.toLowerCase()); // the colour scheme now picks the skin
  await page.emulateMedia({ colorScheme: "dark" }); await frames(page, 1); expect(await paper()).toBe(SKIN_COLORS.observatory.normal.roles.paper.toLowerCase()); });
for (const skin of SKIN_IDS)
  test(`TH-14 every shell focusable shows a 2px solid focus-ring outline (offset 2px; rows -2px, OI-31) at 3:1 or more in ${skin}`, async ({ page }, info) => {
    test.skip(!PROJECTS.includes(info.project.name), "computed colours are engine-independent");
    await openShell(page, `?skin=${skin}&w=800&h=600&rows=${enc(["y=x"])}`); await api(page, "c.updateSettings({ keypad: true })");
    const rings = await tabRings(page); expect([rings.length > 0, rings.some((r) => r.inset)]).toEqual([true, true]); // never vacuous; the row was reached
    for (const r of rings) { expect([r.style, r.width, r.offset, toHex(r.color).hex], r.name).toEqual(["solid", "2px", r.inset ? "-2px" : "2px", SKIN_COLORS[skin].normal.roles.focusRing.toLowerCase()]);
      expect(contrastRatio(toHex(r.color).hex, toHex(r.background).hex), r.name).toBeGreaterThanOrEqual(3); } });
```

`shell.spec.ts` (contribution):

```
for (const skin of SKIN_IDS)
  test(`TH-1 rendered shadow text meets 7:1 and field boundaries 3:1 on their backgrounds in ${skin}`, async ({ page }, info) => {
    test.skip(!PROJECTS.includes(info.project.name), "computed colours are engine-independent");
    await openShell(page, `?skin=${skin}&w=800&h=600&rows=${enc(["y=x", "\\frac{", "2+3"])}`); await rowField(page, "3").click();
    await api(page, "c.updateSettings({ keypad: true })"); await page.getByRole("button", { name: "Graph settings" }).click(); const pairs = await textPairs(page);
    expect([pairs.some((p) => p.kind === "text"), pairs.some((p) => p.kind === "boundary")]).toEqual([true, true]);
    for (const p of pairs) expect(contrastRatio(onBackground(p.fg, p.alpha, p.bg), toHex(p.bg).hex), `${p.kind} ${p.name}`).toBeGreaterThanOrEqual(p.kind === "text" ? 7 : 3); });
```

- [ ] **Step 3: Run the tests and confirm what fails.** Run `npx vitest run src/components/calculator-v2/ui/controller/stylesheet.test.ts -t "TH-14"` and browser `-g "TH-15|TH-14|TH-1 "` with `--project=calculator-android`. Expected: the TH-14 unit test FAILS (no top-level `:focus-visible` rule). TH-15 FAILS: `--kc-paper` stays ivory, because there is no watcher yet. The TH-14 and TH-1 browser tests PASS on first run (gate checks of 03's colours, 08's and 09's focus rules and 09's inset row ring under OI-31).
- [ ] **Step 4: Implement the theme watcher and the focus rule.** In the constructor, replace the one-time skin read with a watcher created before step 4: `const theme = watchTheme(document.documentElement, window, onTheme)`, where `const onTheme = (t: ThemeState) => { styles.setSkinCss(hostThemeCss(t.skin)); store.set({ skin: t.skin, themeRevision: t.revision + reflows }); }`. `Watch.initial` never reaches the callback (Task 2), and later changes arrive in a microtask or a media `change` task, so `onTheme` first runs after the constructor has assigned `styles` and `store`. Step 4 becomes `styles.setSkinCss(hostThemeCss(theme.initial.skin))`. Step 6 seeds the store with `skin: theme.initial.skin, themeRevision: theme.initial.revision`. Step 7 puts `theme.dispose` first in the disposers, so `destroy()` runs it last. `reflows` counts `reflow()` calls, which keeps the revision increasing. Add `:focus-visible { outline: 2px solid var(--kc-focus-ring); outline-offset: 2px; }` to `base.css` for shell-owned controls such as the AR-52 fallback buttons (08 and 09 style their own), then regenerate.
- [ ] **Step 5: Run the tests and confirm they pass.** Run the Step 3 commands, then TH-15 on all five projects. Expected: PASS.
- [ ] **Step 6: Commit.** Run `git add docs/superpowers/specs/calculator-v2 src/components/calculator-v2 tests/calculator/v2 && git commit -m "Repaint calculator v2 on live theme changes and add focus rings (TH-15, TH-14, OI-31)"`

### Task 13: Settings integration and package gate (S-6, NM-29)

**Files:** test `shell-settings.spec.ts`. **Consumes:** 09's Settings controls (radios "Radians" and "Degrees", checkbox "Complex mode"); `CORPUS` (02); `evaluateLatex` and `formatValue` (04, relative imports); `CalculatorEngine.subscribe` and `getSnapshot` (07).

- [ ] **Step 1: Write the gate tests.** Both are gate checks (IDs line): Task 4's jsdom test already took S-6 from red to green, and NM-29 tests 07's same-task generation (AR-46) and 09's controls through the assembled shell. The helpers: `openSettings(page)` clicks the Graph settings button. The `postedLog` init script wraps `Worker.prototype.postMessage` to push `{ type }` into `globalThis.__posted`. `switchAndTime(el, expected)` runs in the page. It first waits, once per frame for up to 2 s, until rows 18 to 20 all have geometry, then notes those objects (`engine.getSnapshot().geometry.get(id)`). It subscribes to the engine and, for every snapshot after the click, records the `valueText` of rows 1 to 17 and the geometry object of rows 18 to 20. It clicks `el`, then polls once per frame for up to 1 s. It returns: `sameTask`: a `state` message was posted before `click()` returned. `ms`: the time until rows 1 to 17 equal `expected` and rows 18 to 20 each hold a geometry object other than their pre-click one. `stale`: the indexes of value rows that showed their new value and later changed. `changes`: for each of rows 18 to 20, how many times its geometry object changed. 07 posts one plot per row per generation and drops superseded ones (AR-46), so a superseded plot that landed would add a change. `curves`: for each of rows 18 to 20, the first geometry after the click as `{ bands: bands.length / 4, maxAbsY, maxY }` over its finite polyline vertices. In degrees on the default x range [-10, 10] (G-5), sin 10° ≈ 0.1736 and tan 10° ≈ 0.1763, and sin(100x) is an ordinary curve that peaks at x = 0.9. A radians plot fails every curve check: |sin x| and |tan x| reach 1, and sin(100x) is drawn as G-12 bands.

```
test("S-6 angle defaults to radians on every question; Degrees updates dependent rows and is announced", async ({ page }) => {
  await openShell(page, `?w=800&h=600&rows=${enc(["\\sin(30)", "y=\\sin x"])}`); await openSettings(page);
  await expect(page.getByRole("radio", { name: "Radians" })).toBeChecked(); await page.getByRole("radio", { name: "Degrees" }).click();
  await expect.poll(async () => (await rows(page))[0].valueText).toBe("0.5"); await expect.poll(() => announced(page)).toContainEqual(expect.stringMatching(/degrees/i));
  await page.evaluate(() => globalThis.__shell!.remount()); await openSettings(page); await expect(page.getByRole("radio", { name: "Radians" })).toBeChecked(); });
test("NM-29 angle and complex switches post a new generation in the same task; 20 rows and curves update within 250 ms; nothing stale lands", async ({ page }, info) => {
  test.skip(info.project.name !== "calculator-chrome", "the 250 ms budget is set for the desktop CI profile");
  const values = ["\\sin(30)", "\\cos(60)", "\\tan(45)", "\\sin(180)", "\\cos(90)", "\\sin(3630)", "\\tan(90)", "\\csc(30)", "\\sec(90)", "\\sin(30^{\\circ})",
    "30^{\\circ}", "\\arcsin(0.5)", "\\arctan(1)", "\\arccos(-1)", "\\operatorname{arccot}(-1)", "\\sqrt{-4}", "(-8)^{\\frac{1}{2}}"]; // ids 1 to 17: 04's NM-25 to NM-28, NM-18 and NM-19 cases; no imaginary unit, so no chips (07 Decision 5)
  const curves = ["y=\\sin x", "y=\\tan x", "y=\\sin(100x)"]; // ids 18 to 20: 07's graph.ts cases graph-9, graph-1 and graph-10, the corpus curves that depend on the angle unit
  for (const l of [...values, ...curves]) expect(CORPUS.some((c) => "latex" in c.input && c.input.latex === l), l).toBe(true);
  const expected = (complex: boolean) => values.map((l) => formatValue(evaluateLatex(l, { settings: { angleMode: "degrees", complex } })));
  await page.addInitScript(postedLog); await openShell(page, `?w=800&h=600&rows=${enc([...values, ...curves])}`); await openSettings(page);
  for (const [control, want] of [[page.getByRole("radio", { name: "Degrees" }), expected(false)], [page.getByRole("checkbox", { name: "Complex mode" }), expected(true)]] as const) {
    const t = await control.evaluate(switchAndTime, want); expect([t.sameTask, t.stale, t.changes, t.ms <= 250]).toEqual([true, [], [1, 1, 1], true]);
    const [sin, tan, sin100] = t.curves; expect([sin.maxAbsY < 0.18, tan.maxAbsY < 0.18, sin100.bands, sin100.maxY > 0.95]).toEqual([true, true, 0, true]); } }); // degree ranges on [-10, 10]; see Step 1
```

- [ ] **Step 2: Run the tests.** Run browser `-g "S-6|NM-29"` on all five projects (NM-29 skips itself elsewhere). Expected: PASS on first run. A failure becomes a fix task reported under R3; before reporting, check that `SettingsPopover` calls `updateSettings` synchronously and that the engine posts `state` synchronously.
- [ ] **Step 3: Run the package gate.** Run each command; all must pass: `node scripts/build/calculator-v2.mjs --styles --check`; `npx vitest run src/components/calculator-v2`; `npm run test:calculator -- tests/calculator/v2/shell`; `npx tsx scripts/calculator-v2/check-spec-ids.mjs --packages 02,03,04,05,06,07,08,09,10`; `npx tsc --noEmit`, `npm run lint`, `npm run format:check`; `node scripts/check-file-sizes.mjs`; `wc -l tests/calculator/v2/shell*.ts tests/calculator/fixture/v2/calculator.*` (that checker scans only `src/`). Expected: every command exits 0, and every file is under 700 lines. The spec-ID checker prints `check-spec-ids: all 214 IDs covered` on stdout (214 is the sum of the ID counts of packages 02 to 10 in index section 2: 29, 14, 57, 14, 12, 23, 4, 34 and 27). In the shell run every test passes, except those that skip themselves through their own `test.skip` guard. The AR-40 CDP test skips on calculator-firefox, calculator-safari and calculator-ios. The K-2 fine-pointer test skips on calculator-android and calculator-ios, and the K-2 coarse-pointer test on calculator-chrome, calculator-firefox and calculator-safari. The K-2 hardware-keyboard test skips everywhere except calculator-ios. The 12 TH-14 and 12 TH-1 tests skip on calculator-firefox, calculator-safari and calculator-ios. NM-29 skips on calculator-firefox, calculator-safari, calculator-android and calculator-ios. Nothing else is skipped, and nothing fails.
- [ ] **Step 4: Commit.** Run `git add tests/calculator/v2 && git commit -m "Verify calculator v2 settings integration (S-6, NM-29)"`
