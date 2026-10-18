# Calculator v2 Phase 1: runtime interfaces (part 2 of 3)

Part 2 of 3 of the cross-package contracts: theme, worker, engine and UI hooks, editor foundation
and renderer. Part 1 is `01-interfaces.md` (its section 0 conventions apply here); part 3 is
`01-interfaces-integration.md`. Section numbers run on across the three files.

## 6. Theme and contrast (owner: 03-foundations)

```ts
// src/lib/calculator-v2/theme/skins.ts
export const SKIN_IDS = [
  "observatory",
  "charcoal",
  "forest",
  "ivory",
  "paper",
  "sand",
  "sage",
  "lavender",
  "peach",
  "rose",
  "blush",
  "plum",
] as const;
export type SkinId = (typeof SKIN_IDS)[number];
export type BackgroundRole = "paper" | "list" | "chrome" | "key" | "keyOperator" | "accent";
export type ForegroundRole =
  | "text"
  | "textSecondary"
  | "error"
  | "axis"
  | "gridMajor"
  | "gridMinor"
  | "focusRing"
  | "focusBar"
  | "focusBarLabel"
  | "accentLabel"
  | "boundary";
export type ColorRole = BackgroundRole | ForegroundRole;
export type CurveSlot = "c1" | "c2" | "c3" | "c4" | "c5" | "c6";
export interface SkinPalette {
  dark: boolean;
  roles: Record<ColorRole, string>; // "#rrggbb"
  curves: Record<CurveSlot, string>; // TH-6, >= 5.95:1 on paper
  fillAlpha: Record<CurveSlot, number>; // TH-8: alpha giving 1.15:1 against paper
}

// src/lib/calculator-v2/theme/skin-colors.generated.ts (generated, Prettier-formatted, drift-tested)
export const SKIN_COLORS: Readonly<Record<SkinId, { normal: SkinPalette }>>; // reverse joins in Phase 4 (TH-13)

// src/lib/calculator-v2/theme/contrast.ts
export function contrastRatio(foreground: string, background: string): number; // WCAG 2.x, sRGB hex
export function toOklch(hex: string): { l: number; c: number; h: number };
export function fromOklch(l: number, c: number, h: number): string; // gamut-mapped by chroma reduction
export function adjustLightness(color: string, background: string, target: number): string; // TH-4: 0.005 L steps to target + 0.05
export function simulateCvd(hex: string, kind: "protan" | "deutan" | "tritan"): string; // Machado 2009, severity 1.0
export function deltaEOk(a: string, b: string): number;
export function compositeOver(color: string, alpha: number, background: string): string;
export function compositeShading(paper: string, fills: { color: string; alpha: number }[]): string;
// TH-8: the colour of a pixel covered by `fills`, capped at 1.3:1 against `paper`; with the skin's
// fill alphas the second fill is at least 1.04:1 apart from the one-fill colour, and 3 or more
// fills stay at the 1.3:1 cap; the renderer (08) paints shading through it

// src/lib/calculator-v2/theme/roles.ts
export const ROLE_VARS: Readonly<Record<ColorRole, string>>; // "--kc-paper", "--kc-list", "--kc-chrome", "--kc-key", "--kc-key-operator", "--kc-accent", "--kc-text", "--kc-text-secondary", "--kc-error", "--kc-axis", "--kc-grid-major", "--kc-grid-minor", "--kc-focus-ring", "--kc-focus-bar", "--kc-focus-bar-label", "--kc-accent-label", "--kc-boundary"
export const CURVE_VARS: Readonly<Record<CurveSlot, string>>; // "--kc-curve-1" … "--kc-curve-6"
export const FILL_ALPHA_VARS: Readonly<Record<CurveSlot, string>>; // "--kc-fill-alpha-1" … "--kc-fill-alpha-6"
export function resolveSkinId(themeId: string | null | undefined, prefersDark: boolean): SkinId; // unknown -> ivory or observatory (TH-5)
export function hostThemeCss(skin: SkinId): string; // ":host{--kc-paper:#…;…}" for every var above
export function nextSlot(index: number): CurveSlot; // TH-10: c1..c6 then repeat
export function resolveRowColor(
  color: string,
  skin: SkinId
): { hex: string; fillAlpha: number; adjusted: boolean }; // slot id or "#rrggbb" (TH-10, TH-11 with OI-1's 5.85:1)
export const EXPLICIT_COLOUR_NOTE = "Colour adjusted for contrast on this theme"; // TH-11
```

`src/components/calculator/calculator-chrome.generated.css` (generated with the table) declares, per
`html[data-theme="<skin>"]` plus the TH-5 fallback, only `--kcc-chrome`, `--kcc-text`,
`--kcc-text-secondary`, `--kcc-boundary`, `--kcc-focus`, `--kcc-accent`, `--kcc-accent-label`.
Light-DOM surfaces (window chrome and title-bar buttons, splitter, grip, loader panel, Transfer
control, tooltip) use only these variables (TH-2). The React context that carries the current
`SkinId` to the UI is `SkinContext` (section 8.1).

## 7. Worker protocol, executor and backends (owner: 07-engine-worker)

```ts
// src/lib/calculator-v2/worker/protocol.ts
export const PROTOCOL_VERSION = 1;
export const WORKER_MARKER = "karman-compute-v1"; // OI-29: finds the worker code in build output
export interface WireRow {
  id: string;
  type: "expression"; // "table" from Phase 3
  latex: string;
  columns: null; // Phase 3
  hidden: boolean;
  sliderBounds: { min: string; max: string; step: string } | null;
}
export interface WireSettings {
  angleMode: "radians" | "degrees";
  complex: boolean;
}
export interface WireAnalysis {
  kind: RowKind;
  error: RowError | null;
  isGraphable: boolean;
}
export type MainToWorker =
  | { v: 1; type: "hello"; seed: number }
  | {
      v: 1;
      type: "state";
      generation: number;
      rows: WireRow[];
      settings: WireSettings;
      sliders: Record<string, number>;
    }
  | { v: 1; type: "view"; generation: number; viewport: Viewport; size: PixelSize; dpr: number }
  | { v: 1; type: "evaluate"; jobId: number; generation: number; latex: string } // HelperExpression
  | { v: 1; type: "dispose" };
export type WorkerToMain =
  | { v: 1; type: "ready"; worker: typeof WORKER_MARKER }
  | { v: 1; type: "begin"; generation: number; rowId: string }
  | { v: 1; type: "analysis"; generation: number; rowId: string; analysis: WireAnalysis }
  | {
      v: 1;
      type: "value";
      generation: number;
      rowId: string | null;
      jobId: number | null;
      value: Value;
    }
  | { v: 1; type: "plot"; generation: number; rowId: string; geometry: Geometry }
  | { v: 1; type: "regression"; generation: number; rowId: string } // reserved; never sent before Phase 3
  | { v: 1; type: "poi"; generation: number; rowId: string } // reserved; never sent before Phase 2
  | { v: 1; type: "overrun"; generation: number; rowId: string } // AR-48 deadline or AR-49 watchdog
  | { v: 1; type: "heartbeat"; generation: number }
  | { v: 1; type: "done"; generation: number }
  | { v: 1; type: "fault"; generation: number | null; message: string };
export function isWorkerMessage(data: unknown): data is WorkerToMain;
```

Generation rule (AR-46): the engine increments one counter on every `state` and `view` send; the
executor abandons superseded work at its next yield. The engine accepts `plot` and `done` only at
the latest generation it sent; it accepts `analysis`, `value` and `overrun` when their generation
is at least that of the latest `state` it sent, because a view change does not change values; it
accepts a helper `value` (non-null `jobId`) only while that job is live, and re-issues every
helper after each `state`. Per generation the executor posts `begin` when a row's work starts (a
value row on the first `deadlineFor` call for it in an evaluation round, each plotted row just
before its plot), then `analysis` and `value` (or `overrun`) for every row in list order, then one
value per queued helper job, then `plot` for every graphable visible row in list order (built with
`plotInputFor` and `plotRow`, section 5), then `done`. A view-only generation reuses the cached
values and posts only `begin`, `plot` and `done`.

This refines AR-46's wording ("discards any message whose generation is not current"); the spec
change is OI-32 (00-index section 6.2, proposed as 07's OI-32), applied by 07 Task 11.

Source of truth for rows (AR-51): the engine runs `analyzeRows` on the main thread for each row's
kind, error, chips and complex hint. Worker messages contribute values, plots, `overrun` (which
sets `RowView.overrun` and the `timeout` error) and nothing else; in development the engine
compares each `analysis` message's `kind` with its own and logs `console.error` on a mismatch,
which every v2 browser spec fails on.

```ts
// src/lib/calculator-v2/worker/executor.ts
export interface ExecutorPort {
  post(message: WorkerToMain, transfer: ArrayBuffer[]): void;
}
export interface ExecutorTiming {
  now(): number;
  yieldToEventLoop(): Promise<void>; // MessageChannel macrotask
  sliceMs: number; // 8 (AR-47)
  heartbeatMs: number; // 200 (AR-47)
}
export class Executor {
  constructor(port: ExecutorPort, timing?: Partial<ExecutorTiming>);
  receive(message: MainToWorker): void; // "hello" answers { type: "ready", worker: WORKER_MARKER }
}

// src/lib/calculator-v2/worker/compute.worker.ts — wires self.onmessage to an Executor; no exports

// src/lib/calculator-v2/worker/backend.ts
export interface ComputeBackend {
  readonly kind: "worker" | "main-thread";
  post(message: MainToWorker): void;
  onMessage(listener: (message: WorkerToMain) => void): () => void;
  dispose(): void; // idempotent; terminates the worker
}
export interface WorkerBackendOptions {
  createWorker: () => Worker; // default from create.ts
  watchdogMs: number; // 1500 (AR-49)
  readyTimeoutMs: number; // 3000 (AR-50)
}
export function createWorkerBackend(options?: Partial<WorkerBackendOptions>): ComputeBackend;
// falls back to the main thread (AR-50); on watchdog posts a synthetic overrun and quarantines that
// row's latex until edited (AR-49); bumps the "workers" dev counter on construct and terminate
export function createMainThreadBackend(): ComputeBackend; // same Executor, 8 ms slices

// src/lib/calculator-v2/worker/create.ts (create.standalone.ts swaps the URL; owner 13-paste-standalone)
export function createComputeWorker(): Worker;
// new Worker(new URL("./compute.worker.ts", import.meta.url), { type: "module", name: "karman-calculator" })
// Vite and esbuild emit a module worker; Turbopack rewrites this call into a classic worker on a
// static/chunks/turbopack-worker-<hash>.js bootstrap that loads the worker chunks (OI-29, section 16)
```

## 8. Engine and public API types (owner: 07-engine-worker)

```ts
// src/lib/calculator-v2/core/api/types.ts
export type AngleMode = "radians" | "degrees";
export type LineStyle = "solid" | "dashed" | "dotted"; // R-4 (Phase 2 picker)
export type PointStyle = "filled" | "open" | "cross";
export interface AxisSettings {
  show: boolean;
  label: string;
  step: number | null;
} // null = automatic
export interface CalculatorSettings {
  angleMode: AngleMode;
  complex: boolean;
  showGrid: boolean;
  polarGrid: boolean;
  minorGridlines: boolean;
  arrows: boolean;
  axisNumbers: boolean;
  xAxis: AxisSettings;
  yAxis: AxisSettings;
  lockViewport: boolean;
  piAxisLabels: boolean;
  displaySize: "default" | "large";
  reverseContrast: boolean;
  keypad: boolean;
  expressionsCollapsed: boolean;
  mode: "graphing" | "scientific";
  reducedMotion: boolean;
}
export const DEFAULT_SETTINGS: CalculatorSettings; // S-9: radians, complex off, grid on, Cartesian, minor on, arrows off, axis numbers on, axes shown with "" labels and null steps, lock and pi labels off, "default", false, keypad false, expanded, "graphing", reducedMotion false
export interface CalculatorOptions {
  mode?: "graphing" | "scientific";
  angleMode?: AngleMode;
  keypad?: boolean;
  expressionsCollapsed?: boolean;
  onError?: (error: Error) => void;
  seed?: number;
  reducedMotion?: boolean;
  displaySize?: "default" | "large";
  reverseContrast?: boolean;
}
export interface ExpressionState {
  id: string;
  type?: "expression" | "table";
  latex?: string;
  color?: string; // "c1".."c6" or "#rrggbb"
  hidden?: boolean;
  lineStyle?: LineStyle;
  pointStyle?: PointStyle;
  sliderBounds?: { min: string; max: string; step: string };
  columns?: { latex: string; values: string[]; color?: string; hidden?: boolean }[];
}
export interface CalculatorStateV1 {
  version: 1;
  mode: "graphing";
  settings: CalculatorSettings;
  viewport: Viewport;
  expressions: ExpressionState[];
  scientific: Record<string, never>;
}
export type SettingsUpdate = Partial<CalculatorSettings>;
export type ApiEvaluation =
  | { type: "number"; value: number }
  | { type: "complex"; value: { re: number; im: number } }
  | { type: "list"; value: number[] }
  | { type: "point"; value: [number, number] }
  | { type: "undefined" }
  | { type: "other"; display: string }; // "other": OI-24
export interface ExpressionAnalysis {
  isGraphable: boolean;
  isError: boolean;
  errorMessage?: string;
  evaluationDisplayed: boolean;
  evaluation?: ApiEvaluation;
}
export type ObservableName =
  | "expressionAnalysis"
  | "graphpaperBounds"
  | "settings"
  | "focusedExpression"
  | "mode";
export interface GraphpaperBounds {
  mathCoordinates: Viewport;
  pixelCoordinates: PixelSize;
}
export interface ChangeEvent {
  revision: number;
  isUserInitiated: boolean;
}

// src/lib/calculator-v2/core/api/errors.ts
export type KarmanCalculatorErrorCode = "invalid-argument" | "unsupported" | "destroyed";
export class KarmanCalculatorError extends Error {
  readonly code: KarmanCalculatorErrorCode;
  constructor(code: KarmanCalculatorErrorCode, message: string);
}

// src/lib/calculator-v2/core/api/helper-expression.ts
export interface HelperExpression {
  readonly numericValue: number; // NaN until computed, undefined or non-real
  readonly listValue: number[] | undefined;
  observe(name: "numericValue" | "listValue", callback: () => void): () => void; // fires after every worker result for this helper, NaN included
  unobserve(name: "numericValue" | "listValue", callback?: () => void): void;
  destroy(): void;
}
```

```ts
// src/lib/calculator-v2/core/api/engine.ts
export interface EngineDeps {
  backend: ComputeBackend;
  scheduleFrame: (callback: () => void) => void; // requestAnimationFrame in browsers, setTimeout(…, 16) in node
  now: () => number;
  randomSeed: () => number; // crypto.getRandomValues; replaced by options.seed (API-1)
}
export interface RowView {
  id: string;
  latex: string;
  hidden: boolean;
  color: string; // stored slot id or hex; the UI resolves it with resolveRowColor(color, skin)
  kind: RowKind;
  error: RowError | null;
  chips: string[];
  complexHint: boolean;
  value: Value | null; // null until the worker reports
  valueText: string | null; // formatValue, only when the row shows a value (R-5)
  overrun: boolean; // AR-48/AR-49 message showing
}
export interface EngineSnapshot {
  revision: number;
  rows: readonly RowView[];
  settings: CalculatorSettings;
  viewport: Viewport;
  view: ViewSpec | null; // null until the graph reports its size
  geometry: ReadonlyMap<string, Geometry>; // each row's latest accepted plot; dropped at once when the row is deleted, edited, hidden or no longer graphable; region geometry dropped on every view send; at done only rows plotted in that generation are kept
  focusedRowId: string | null; // DOM-focused row (KB-4)
  activeRowId: string | null; // API-12 active row (L-3 styling, keypad target)
  canUndo: boolean;
  canRedo: boolean;
  backendKind: "worker" | "main-thread";
}
export type EditSource = "typing" | "keypad" | "paste" | "api";
export type EditRefusal = "row-limit" | "char-limit";
export class CalculatorEngine {
  constructor(options: CalculatorOptions | undefined, deps: EngineDeps); // validates (API-1), then setBlank()
  // public API (API-2 to API-13); KarmanCalculator forwards each one
  setExpression(state: ExpressionState): void; // a new row takes nextSlot(rowIndex) (API-2, TH-10)
  setExpressions(list: ExpressionState[]): void;
  removeExpression(ref: { id: string }): void;
  removeExpressions(list: { id: string }[]): void;
  getExpressions(): ExpressionState[];
  getState(): CalculatorStateV1;
  setState(state: CalculatorStateV1, options?: { allowUndo?: boolean }): void;
  setBlank(options?: { allowUndo?: boolean }): void;
  setMathBounds(bounds: Viewport): void;
  updateSettings(partial: SettingsUpdate): void;
  observe(name: ObservableName, callback: () => void): () => void;
  unobserve(name: ObservableName, callback?: () => void): void;
  observeEvent(name: "change", callback: (event: ChangeEvent) => void): () => void;
  unobserveEvent(name: "change", callback?: (event: ChangeEvent) => void): void;
  HelperExpression(spec: { latex: string }): HelperExpression;
  undo(): void;
  redo(): void;
  clearHistory(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  focusExpression(id: string): void; // OI-10: active-row state + focusedExpression observer
  focusFirstExpression(): void;
  activateExpression(id: string): void;
  readonly expressionAnalysis: Readonly<Record<string, ExpressionAnalysis>>;
  readonly graphpaperBounds: GraphpaperBounds;
  readonly settings: CalculatorSettings;
  readonly focusedExpression: string | null;
  readonly mode: "graphing";
  destroy(): void; // idempotent; afterwards every method throws "destroyed"
  // internal UI surface (not forwarded by KarmanCalculator)
  subscribe(listener: () => void): () => void;
  getSnapshot(): EngineSnapshot;
  editRow(id: string, latex: string, source: EditSource): EditRefusal | null; // KB-2 coalesces "typing" until 1,000 ms idle or endEditGroup()
  endEditGroup(): void;
  insertRowAfter(afterId: string | null): { id: string } | EditRefusal; // null = at the end
  deleteRow(id: string): void; // R-9 never deletes the last row; empties it
  clearAll(): void; // KB-5 one undo step, keeps settings and viewport
  setRowHidden(id: string, hidden: boolean): void;
  setView(view: ViewSpec): void; // graph size changes; viewport edits are not undo steps; 0×0 sizes are ignored
  setFocusedRow(id: string | null): void;
}
export function createEngine(
  options?: CalculatorOptions,
  deps?: Partial<EngineDeps>
): CalculatorEngine; // defaults: main-thread backend in node, worker backend in browsers

// src/lib/calculator-v2/core/api/document.ts (otherwise internal to 07; 08's nextViewportForSize
// reads this constant)
export const INITIAL_GRAPH_SIZE: PixelSize; // { width: 800, height: 600 }
// the size the engine assumes before the graph's first setView report (07 Decision 9)
```

API-7 accepts only the listed setting keys; `lockViewport`, `piAxisLabels` accept only `false`,
`displaySize` only `"default"`, `reverseContrast` only `false`, `mode` only `"graphing"` in Phase 1,
anything else throws `unsupported`. API-2 throws `unsupported` for types `note`, `folder`, `image`,
`text` (OI-23) and for `table` until Phase 3 (API-3). New row ids from the UI are decimal strings
counting up from `"1"`; `setBlank()` leaves exactly one empty row with id `"1"` (R-10).

### 8.1 UI hooks and test helpers (owner: 07-engine-worker)

```ts
// src/components/calculator-v2/ui/hooks/use-engine.ts
export function useEngineSnapshot(engine: CalculatorEngine): EngineSnapshot; // useSyncExternalStore
export const EngineContext: React.Context<CalculatorEngine | null>;
export function useEngine(): CalculatorEngine; // throws outside EngineContext

// src/components/calculator-v2/ui/hooks/skin.ts
export const SkinContext: React.Context<SkinId>; // default "ivory"
export function useSkin(): SkinId;
// provided by 10's App from resolveSkinId(<html data-theme>, prefers-color-scheme: dark) and
// re-provided on every TH-15 change; provided by harness-kit on harness pages; read by 08's
// GraphPanel and 09's row swatches through resolveRowColor(row.color, skin)

// src/components/calculator-v2/ui/hooks/dev-hooks.ts
declare global {
  var __calculatorHarness: { engine: CalculatorEngine } | undefined;
}
export function exposeEngineForTests(engine: CalculatorEngine): () => void;
// sets globalThis.__calculatorHarness when process.env.NODE_ENV !== "production"; the returned
// function clears it if it still points at this engine; called by harness-kit and by 10's quiz host

// src/components/calculator-v2/__fixtures__/dom-stubs.ts (jsdom tests only)
export function installDomStubs(): () => void;
// ResizeObserver (records targets, never fires unless the test calls the exported trigger),
// matchMedia (matches false, add/removeEventListener), HTMLCanvasElement.getContext → null;
// returns a restore function
export function triggerResize(target: Element, size: { width: number; height: number }): void;

// src/lib/calculator-v2/core/api/__fixtures__/test-engine.ts (tests only; written by 07 Task 9,
// imported by 07's engine tests, 09's list tests and 12's transfer tests)
export interface FakeBackend extends ComputeBackend {
  readonly posted: MainToWorker[];
  readonly disposed: boolean;
  emit(message: WorkerToMain): void;
}
export function createFakeBackend(): FakeBackend; // kind "worker"; emit delivers synchronously
export interface TestEngine {
  engine: CalculatorEngine;
  backend: FakeBackend | null; // null with the main-thread backend
  posted: MainToWorker[];
  received: WorkerToMain[];
  emit(message: WorkerToMain): void; // fake backend only
  flushFrames(): void; // runs queued scheduleFrame callbacks, including ones they queue
  advance(ms: number): void; // advances deps.now
  settled(): Promise<void>; // main-thread: polls with macrotask() until done for the latest state/view generation and a value for every live job, then flushFrames(); rejects after 10,000 ms of performance.now() time
  latestGeneration(): number;
}
export function createTestEngine(
  options?: CalculatorOptions,
  config?: { backend?: "fake" | "main-thread"; randomSeeds?: number[] }
): TestEngine;
// defaults: backend "fake"; deps.randomSeed returns randomSeeds in order (default 1, 2, 3, …); deps.now starts at 0
export const TEST_VIEW: ViewSpec; // defaultViewport 800×600, dpr 1
```

## 9. Editor foundation (owner: 05-editor-foundation)

`vendor/mathquill/mathquill.d.ts` types the module's default export with only the members
`MathField.ts` calls (AR-5); it is internal to 05 and no other package imports it.

```ts
// src/components/calculator-v2/math-field/MathField.ts (the only importer of vendor/mathquill)
export interface MathFieldOptions {
  ariaLabel: string; // "Expression n" (A11Y-3)
  maxLength: number; // MAX_ROW_CHARACTERS; longer writes are refused unchanged (T-13)
  onEdit(latex: string): void;
  onEnter(): void;
  onArrowOut(direction: "up" | "down"): void; // caret cannot move further (R-3)
  onDeleteOutOf(direction: "left" | "right"): void; // Backspace or Delete at an edge (R-9)
  onFocus(): void;
  onBlur(): void;
  onRefused(reason: "char-limit"): void;
}
export interface MathField {
  readonly element: HTMLElement;
  focus(): void;
  blur(): void;
  latex(): string;
  latex(value: string): void;
  write(latex: string): void;
  cmd(name: string): void;
  keystroke(keys: string): void;
  typedText(text: string): void;
  run(actions: readonly MathFieldAction[]): void;
  select(): void;
  clearSelection(): void;
  selectedLatex(): string | null; // T-5 copy (13 uses it in the App copy listener)
  reflow(): void; // bumps the "reflows" dev counter
  setInputMode(mode: "none" | "text"): void; // T-11
  speechText(): string; // T-5
  destroy(): void;
}
export function createMathField(host: HTMLElement, options: MathFieldOptions): MathField;

// src/components/calculator-v2/math-field/speech.ts
export function latexToSpeech(latex: string): string; // "y equals x squared plus 3 fourths"

// src/components/calculator-v2/math-field/digit-groups.ts
export function groupIntegerDigits(text: string): string; // T-10: U+2009 every 3 integer digits

// src/components/calculator-v2/ui/a11y/announcer.ts
export interface AnnounceOptions {
  delayMs?: number;
  key?: string;
} // same key replaces a pending one
export interface Announcer {
  announce(text: string, options?: AnnounceOptions): void;
  cancel(key: string): void;
  destroy(): void;
}
export function createAnnouncer(region: HTMLElement): Announcer; // role="status", aria-live="polite"
export const AnnouncerContext: React.Context<Announcer | null>;
export function useAnnouncer(): Announcer;
export function LiveRegion(props: { onReady(region: HTMLElement): void }): JSX.Element;
```

`vendor/mathquill/mathquill.js` is an ES module after the PATCHES.md outro patch: its default
export is the `MathQuill` object and it assigns nothing to `window`, so it evaluates the same way
under Vite (strict-mode ES module), Turbopack and esbuild. `MathField.ts` imports it with a
relative path.

`src/components/calculator-v2/styles/tokens.css` declares on `:host`: `--kc-duration-instant: 100ms`,
`--kc-duration-fast: 200ms`, `--kc-duration-normal: 400ms`,
`--kc-ease-standard: cubic-bezier(0.22, 1, 0.36, 1)`, `--kc-font-ui: Arial, sans-serif`,
`--kc-font-math: KaTeX_Main, "Times New Roman", serif`, `--kc-size-ui: 14px`, `--kc-size-math: 18px`,
`--kc-size-axis: 13px`; all three durations become `0ms` under
`@media (prefers-reduced-motion: reduce)` and under `:host([data-reduced-motion="true"])` (AN-13,
AN-14). Every transition in calculator CSS uses only these variables.

## 10. Renderer and graph panel (owner: 08-graph)

```ts
// src/lib/calculator-v2/render/types.ts
export interface RenderTheme {
  paper: string;
  text: string;
  axis: string;
  gridMajor: string;
  gridMinor: string;
  focusRing: string;
  curves: Record<CurveSlot, string>;
  fillAlpha: Record<CurveSlot, number>;
}
export interface RenderRow {
  rowId: string;
  color: string; // resolveRowColor(row.color, skin).hex
  fillAlpha: number; // resolveRowColor(row.color, skin).fillAlpha
  geometry: Geometry;
}
export type GridSettings = Pick<
  CalculatorSettings,
  "showGrid" | "polarGrid" | "minorGridlines" | "arrows" | "axisNumbers" | "xAxis" | "yAxis"
>;
export interface RenderFrame {
  view: ViewSpec;
  grid: GridSettings;
  rows: readonly RenderRow[];
  theme: RenderTheme;
}

// src/lib/calculator-v2/render/renderer.ts
export const LAYER_ORDER: readonly ["shading", "grid", "curves", "points"]; // bottom to top; one canvas each
export class GraphRenderer {
  constructor(container: HTMLElement); // layered HiDPI canvases: shading, grid+axes, curves, points (LAYER_ORDER)
  render(frame: RenderFrame): void;
  // no-op when size.width or size.height is 0 or a 2D context is unavailable (jsdom);
  // shading: each region span pixel is painted compositeShading(theme.paper, covering fills)
  // (section 6), never alpha-stacked; tick labels are formatAxisLabel(value, ticks.step)
  destroy(): void;
}
export function readRenderTheme(host: Element): RenderTheme; // getComputedStyle(host), section 6 vars

// src/components/calculator-v2/ui/graph/labels.ts (08 Task 7; read by 10 and 15)
export const GRAPH_CONTROL_LABELS = {
  group: "Graph controls",
  settings: "Graph settings",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  home: "Home",
} as const;

// src/components/calculator-v2/ui/graph/GraphPanel.tsx
export interface GraphPanelProps {
  host: Element; // shadow host
  themeRevision: number; // bumped by the shell on prefers-contrast and forced-colors changes (TH-15)
  reducedMotion: boolean;
  settingsOpen: boolean;
  onOpenSettings(anchor: HTMLElement): void; // Settings control (L-1)
}
export function GraphPanel(props: GraphPanelProps): JSX.Element; // useEngine(), useSkin(); role="img"
export function graphAccessibleName(viewport: Viewport, plots: number): string;
// "Graph from x=-10 to 10, y=-7.5 to 7.5, 2 plots"; "1 plot"; bounds to 4 significant digits
```

`GraphPanel` renders this DOM (08's DOM contract), which 10 (L-1, TH-14, KB-13) and 15 (parity
and visual tests) select by. The paper is the CSS background of `.kc-graph`, so a canvas pixel
without shading stays transparent; the button names are `GRAPH_CONTROL_LABELS`.

```text
div.kc-graph[data-graph-panel]                       pointer + wheel listeners; background var(--kc-paper)
  div.kc-graph-layers[data-graph-layers][aria-hidden=true][data-rendered-revision]  ResizeObserver target
    canvas.kc-graph-canvas[data-layer=shading|grid|curves|points][aria-hidden=true]  (no tabindex)
  div.kc-graph-surface[role=img][aria-label][tabindex=0]   the graph's one tab stop; keydown handler
  div.kc-graph-controls[role=group][aria-label="Graph controls"]
    button "Graph settings" (aria-haspopup=dialog, aria-expanded) | "Zoom in" | "Zoom out"
    button "Home"[data-graph-home][data-phase]   only off the default view, plus its fade-out
```

`tests/calculator/fixture/v2/graph.html` mounts `GraphPanel` through `harness-kit` with rows, a
skin and a size from the query string
(`?skin=<SkinId>&rows=<url-encoded JSON string[]>&w=<px>&h=<px>`, size default 800×600), so
`graph.spec.ts` samples canvas pixels with `getImageData` for the G-1, G-7, G-17 and TH-8
contributions in all 12 skins.
