# Calculator v2 Phase 1: integration interfaces (part 3 of 3)

Part 3 of 3 of the cross-package contracts: editor UI, shell and quiz host, seam foundations and quiz seam, transfer, paste, standalone and release tooling. Part 1 is `01-interfaces.md` (its section 0 conventions apply here); part 2 is `01-interfaces-runtime.md`.

## 11. Editor UI (owner: 09-editor-ui)

```ts
// src/components/calculator-v2/ui/focus/focus-controller.ts
export interface FocusController {
  registerField(rowId: string, field: MathField): () => void;
  field(rowId: string): MathField | null;
  fields(): readonly MathField[]; // every mounted field, list order (AR-41 reflow)
  focusRow(rowId: string, caret: "start" | "end"): void; // DOM focus into the MathField
  activateRow(rowId: string): void; // active row without DOM focus (API-12)
  activeRowId(): string | null;
  lastFocusedRowId(): string | null; // KB-4 reopen
  subscribe(listener: () => void): () => void;
}
export function createFocusController(engine: CalculatorEngine): FocusController;
export const FocusContext: React.Context<FocusController | null>;
// src/components/calculator-v2/ui/focus/escape-stack.ts
export interface EscapeLayer {
  id: string;
  close(): void;
}
export interface EscapeStack {
  push(layer: EscapeLayer): () => void;
  handleEscape(): boolean; // closes the top layer; true when one closed (KB-3)
}
export function createEscapeStack(): EscapeStack;
export const EscapeContext: React.Context<EscapeStack | null>;
// src/components/calculator-v2/ui/list/ExpressionPanel.tsx
export interface ExpressionPanelProps {
  layout: "desktop" | "stacked";
  pointer: "fine" | "coarse";
  keypadOpen: boolean;
  onToggleKeypad(): void; // L-2 toolbar Keypad toggle
  onTouchFocusRow(rowId: string): void; // K-2: the shell decides whether the keypad opens
}
export function ExpressionPanel(props: ExpressionPanelProps): JSX.Element;
// src/components/calculator-v2/ui/keypad/Keypad.tsx
export interface KeypadProps {
  containerWidth: number; // < 600 uses the K-6 phone keypad
  pointer: "fine" | "coarse";
  open: boolean;
  onOpenChange(open: boolean, by: "student" | "system"): void;
}
export function Keypad(props: KeypadProps): JSX.Element; // tray, ABC page, Functions panel (panelCategories(), K-4), Show/Hide
// src/components/calculator-v2/ui/settings/SettingsPopover.tsx
export interface SettingsPopoverProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose(): void;
}
export function SettingsPopover(props: SettingsPopoverProps): JSX.Element | null;
// src/components/calculator-v2/ui/settings/bounds.ts (S-7; AR-51 keeps evaluation in the worker)
export function evaluateBoundLatex(
  engine: Pick<CalculatorEngine, "HelperExpression">,
  latex: string,
  timeoutMs?: number // default 1000
): Promise<number | null>; // first helper result: the number if finite, else null; null on timeout; destroys the helper
// src/components/calculator-v2/ui/list/math-field-factory.ts (read by 13's trackFields)
export type MathFieldFactory = (host: HTMLElement, options: MathFieldOptions) => MathField;
export const MathFieldFactoryContext: React.Context<MathFieldFactory>; // default createMathField
// src/components/calculator-v2/ui/list/row-model.ts
export interface RowDomIds {
  label: string;
  speech: string;
  value: string;
  error: string;
  hint: string;
}
export function rowDomIds(rowId: string): RowDomIds; // "kc-row-<id>-label", "-speech", "-value", "-error", "-hint"
// src/components/calculator-v2/ui/list/row-actions.ts (09 Note 3: 10's keyboard Undo, Redo and Alt+Enter call these)
export function performUndo(engine: CalculatorEngine, announcer: Announcer | null): void; // no-op unless canUndo(); announces "Undone."
export function performRedo(engine: CalculatorEngine, announcer: Announcer | null): void; // no-op unless canRedo(); announces "Redone."
export function insertRowBelow(
  engine: CalculatorEngine,
  focus: FocusController,
  announcer: Announcer | null,
  afterId: string | null, // null: at the end
  mode: "focus" | "activate"
): string | null; // the new row id, or null after announcing EDITOR_MESSAGES.rowLimit
// src/components/calculator-v2/ui/list/messages.ts (exact copy; 10, 13 and browser specs import it)
export const EDITOR_MESSAGES = {
  value: (n: number, valueText: string) => `Expression ${n} equals ${valueText}`, // A11Y-2
  error: (n: number, message: string) => `Expression ${n}: ${message}`, // A11Y-2
  clearAll: "All expressions cleared. Undo is available.", // KB-5
  undone: "Undone.",
  redone: "Redone.",
  rowLimit: "The calculator holds at most 100 expressions.", // MAX_ROWS (NM-42); 10's ROW_LIMIT_MESSAGE text
  charLimit: "Each expression can be up to 2,048 characters.", // MAX_ROW_CHARACTERS (T-13)
  tilde: "tilde", // K-7
  angle: (mode: "radians" | "degrees") => `Angle set to ${mode}.`, // S-6, A11Y-2
  boundNotNumber: "Enter an expression with a finite value.", // S-7
  boundOrder: "The minimum must be less than the maximum.", // S-7
  stepInvalid: "Enter a positive number, or leave blank for automatic.", // S-7
} as const;
// src/components/calculator-v2/ui/list/__fixtures__/fake-math-field.ts (test-only; 09 Task 1)
export interface FakeCall {
  // the only recorded methods (09 Task 1 Step 3): latex is latex(value), never a read; select,
  // clearSelection, reflow, destroy, speechText and selectedLatex run unrecorded
  method:
    | "focus"
    | "blur"
    | "latex"
    | "write"
    | "cmd"
    | "keystroke"
    | "typedText"
    | "run"
    | "setInputMode";
  arg: unknown;
}
export interface FakeMathField extends MathField {
  readonly options: MathFieldOptions;
  calls: FakeCall[]; // reassignable; the fake pushes to the current array
  emitEdit(latex: string): void; // sets the latex, then options.onEdit(latex)
}
export interface FakeFieldFactory {
  factory: MathFieldFactory;
  forRow(rowId: string): FakeMathField; // newest field whose host was inside [data-row-id] at creation
  byLabel(ariaLabel: string): FakeMathField; // newest field created with that ariaLabel
}
// src/components/calculator-v2/ui/list/__fixtures__/render-editor.tsx (test-only; 12 Task 9 uses it)
export interface RecordingAnnouncer extends Announcer {
  readonly texts: string[];
}
export interface EditorKit {
  engine: CalculatorEngine;
  focus: FocusController;
  escape: EscapeStack;
  announcer: RecordingAnnouncer;
  fields: FakeFieldFactory; // fake-math-field.ts above
  clock: { now: number }; // the engine's deps.now
  pressEscape(): void;
}
export function renderEditor(
  ui: React.ReactNode,
  options?: { rows?: string[]; skin?: SkinId; durationMs?: number }
): EditorKit; // rows get ids "1"…"n", then clearHistory(); every 09 provider, fake MathFieldFactory
export function panelProps(overrides?: Partial<ExpressionPanelProps>): ExpressionPanelProps; // layout "desktop", pointer "fine", keypadOpen false, vi.fn() handlers
```

Keypad accessible names (09 Note 6; every other key's name is in 09 Task 7's key table, `09-editor-ui-3-keypad.md`): `ABC` (one name on both pages, `aria-pressed`), `Functions` (`aria-expanded`, `aria-controls` the panel), `Shift` (`aria-pressed`), `Hide keypad` (inside the Keypad region), `Show keypad` (outside it, rendered while the keypad is closed) and the list toolbar's `Keypad` toggle (stacked layout, `aria-pressed`); Functions panel buttons are named by `PanelEntry.spoken`.

All panels read `EngineContext`, `FocusContext`, `AnnouncerContext`, `EscapeContext` and `SkinContext`. Row DOM contract (L-3, A11Y-3; read by 10, 11, 14 and 15): each row is an `li` with `data-row-id`, `data-active="true"` on the API-12 active row and `data-focused="true"` on the DOM-focused row; its gutter shows the 1-based row number; the active or focused row draws the `--kc-focus-bar` bar and a 2 px `--kc-focus-ring` outline. A row's colour swatch uses `resolveRowColor(row.color, useSkin())` and shows `EXPLICIT_COLOUR_NOTE` when `adjusted` is true.

## 12. Shell and quiz host (owner: 10-shell)

```ts
// src/components/calculator-v2/KarmanCalculator.ts
export const KARMAN_CALCULATOR_SENTINEL = "karman-calculator-v2:lazy-chunk"; // AR-32 scan string
// the constructor runs element.dataset.karmanCalculator = KARMAN_CALCULATOR_SENTINEL, a runtime use that keeps the string in the lazy chunk after tree shaking (unit-tested)
export interface HostHooks {
  chromeSlot?: HTMLElement; // light-DOM title-bar slot (L-12); filled by 13-paste-standalone
  announceResetOnMount?: boolean; // OI-3
}
export class KarmanCalculator {
  static readonly version: string; // CALCULATOR_V2_BUILD
  static readonly apiVersion: 1;
  constructor(element: HTMLElement, options?: CalculatorOptions, hooks?: HostHooks);
  // forwards every public CalculatorEngine member of section 8; not the internal surface
  focusExpression(id: string): void; // engine state + DOM focus into the row's MathField
  focusFirstExpression(): void;
  activateExpression(id: string): void; // engine state; DOM focus stays out of the MathField
  resize(): void;
  /** @internal */ focusBoundary(edge: "first" | "last"): void; // AR-28 sentinels
  /** @internal */ reflow(): void; // AR-41: reflow() on every MathField, then a canvas redraw
  /** @internal */ readonly engine: CalculatorEngine;
  destroy(): void; // idempotent (AR-60); bumps the "calculators" dev counter down
}
/** @internal */ export function lastFocusedRow(calculator: KarmanCalculator): string | null; // FocusController.lastFocusedRowId() via a WeakMap; the quiz host's KB-4 reopen row (10 Note 1, AR-35)
// src/components/calculator-v2/ui/controller/when-field-ready.ts (used by 13's paste reveal)
export const FIELD_WAIT_FRAMES = 60;
export function whenFieldReady(
  focus: Pick<FocusController, "field">,
  rowId: string,
  run: (field: MathField) => void,
  schedule?: (callback: () => void) => void // default requestAnimationFrame
): () => void; // cancel; runs at once when the field exists, else retries once per frame and gives up after the FIELD_WAIT_FRAMES-th scheduled retry
// src/components/calculator-v2/ui/controller/media.ts (Pointer) and shell-store.ts (10 Task 2; set notifies on change only)
export type Pointer = "fine" | "coarse";
export interface ShellState {
  size: PixelSize;
  layout: "desktop" | "stacked";
  skin: SkinId;
  themeRevision: number;
  reducedMotionMedia: boolean;
  pointer: Pointer;
}
export interface ShellStore {
  get(): ShellState;
  set(patch: Partial<ShellState>): void;
  subscribe(l: () => void): () => void;
}
// src/components/calculator-v2/ui/App.tsx (13's App edit wraps CalculatorLayout in CalculatorChrome)
export interface AppProps {
  engine: CalculatorEngine;
  host: HTMLElement;
  store: ShellStore; // shell-store.ts above; 13's CalculatorChrome reads ShellState.pointer
  focus: FocusController;
  escape: EscapeStack;
  announcer: Announcer;
  chromeSlot: HTMLElement | null; // HostHooks.chromeSlot; CalculatorChrome portals TitleBarControls into it
}
export function App(props: AppProps): JSX.Element;
// src/components/calculator-v2/styles/generated.ts (written by scripts/build/calculator-v2.mjs --styles)
export const CALCULATOR_V2_CSS: string;
export const CALCULATOR_V2_BUILD: string; // first 16 hex chars of sha256(CSS + vendor/mathquill/mathquill.js); style and editor build only
// src/components/calculator-v2/host/quiz-host.ts
export type OpenTrigger = "mouse" | "keyboard" | "touch";
export interface QuizMountOptions {
  element: HTMLElement; // shadow host inside CalculatorWindow
  frame: HTMLElement; // CalculatorWindow frame; receives DOM focus on a touch open (OI-7)
  chromeSlot: HTMLElement;
  reducedMotion: boolean; // !useQuizAnimations() (AN-13)
  announceReset: boolean; // OI-3: true only when the window stayed open across the question change
}
export interface QuizCalculatorHandle {
  readonly calculator: KarmanCalculator;
  focusOnOpen(trigger: OpenTrigger): void;
  // OI-7: "mouse" | "keyboard" → the last focused row (else row 1) gets DOM focus;
  // "touch" → that row becomes active (activateExpression) and options.frame gets DOM focus
  focusBoundary(edge: "first" | "last"): void;
  setReducedMotion(value: boolean): void;
  reflow(): void; // AR-41, called by 11's loader when fonts load
  destroy(): void;
  // applyTransfer(payload: unknown, trigger: TransferTrigger): TransferResult — added by 12-transfer-core
}
export function mountQuizCalculator(options: QuizMountOptions): QuizCalculatorHandle;
// imports katex/dist/katex.min.css at document scope (AR-39); passes onError: (error) => reportCalculatorError(error, CALCULATOR_V2_BUILD) (section 13.1, AR-57);
// calls exposeEngineForTests(calculator.engine) (section 8.1); announces the reset 500 ms after mount only when announceReset is true (OI-3)
// scripts/build/calculator-v2.mjs (JSDoc-typed; declarations shown as TypeScript)
export function generateCalculatorStyles(options: {
  write: boolean;
}): Promise<{ text: string; changed: boolean }>; // Prettier-formatted generated.ts
// CLI: --styles writes styles/generated.ts; --styles --check exits 1 on drift (AR-36); no flag: styles only until 13 adds the standalone bundle after them (extension edit, section 16)
```

Fixed copy: error boundary (AR-52) "The calculator hit a problem.", buttons "Retry" and "Reset this question's calculator"; reset announcement (A11Y-2, OI-3) "Calculator cleared for this question."; surface region names "Graphing calculator" (A11Y-6).

## 13. Seam foundations (owner: 03-foundations) and quiz seam (owner: 11-seam)

### 13.1 Foundations (03)

```ts
// src/lib/calculator-version.ts (server module; never imported by client code)
import type { AppRole } from "@/lib/supabase/queries/admin";
export type CalculatorVersion = "v1" | "v2";
export type CalculatorRollout = "off" | "admins" | "everyone";
export function readCalculatorRollout(value: string | undefined): CalculatorRollout; // else "off"
export interface VersionDeps {
  rollout(): CalculatorRollout;
  userId(): Promise<string | null>;
  role(clerkId: string): Promise<AppRole | null>;
}
export const defaultVersionDeps: VersionDeps;
// rollout: NODE_ENV "production" → the Worker binding only: readCalculatorRollout((getCloudflareContext().env as { CALCULATOR_V2_ROLLOUT?: string }).CALCULATOR_V2_ROLLOUT)
// otherwise → readCalculatorRollout(process.env.CALCULATOR_V2_ROLLOUT); userId: (await safeAuth()).userId; role: fetchUserRole (src/lib/supabase/queries/admin.ts:34)
export function resolveCalculatorVersionWith(deps: VersionDeps): Promise<CalculatorVersion>;
// never rejects: any throw or rejection from a dep gives "v1"; role() runs only for "admins" (AR-6)
export const resolveCalculatorVersion: () => Promise<CalculatorVersion>;
// React cache(() => resolveCalculatorVersionWith(defaultVersionDeps)), so one resolution per request
// src/components/calculator/CalculatorVersion.tsx ("use client")
export function CalculatorVersionProvider(props: {
  version: CalculatorVersion;
  children: React.ReactNode;
}): JSX.Element;
export function useCalculatorVersion(): CalculatorVersion; // "v1" without a provider
// src/components/calculator/breakpoints.ts (AR-19)
export const CALCULATOR_DOCK_MIN_WIDTH = 1024;
export const FULL_SCREEN_QUERY = "(max-width: 1023px), (max-height: 500px)";
export const PHONE_QUERY = "(max-width: 767px), (max-height: 500px)";
// src/components/calculator/report-error.ts (eager; reused by the lazy quiz host)
export function reportCalculatorError(error: unknown, build: string | null): void;
// captureException (@sentry/nextjs) of a new Error whose message is `${name}` or `${name}: ${code}` (code of a KarmanCalculatorError),
// whose stack is "Error: <message>" followed only by the original V8/WebKit/Gecko frame lines, with tags { calculator: "v2", build: build ?? "unknown" }; never LaTeX, rows, question text or answers
// src/components/learn/learn-header.ts (no imports)
export const LEARN_HEADER_CLEARANCE = 72; // LearnLayout.tsx re-exports it (AR-24)
// scripts/build/check-release-env.mjs (added export; the CLI runs both checks)
export function checkRolloutNotInEnvFiles(dir: string): string[];
// one problem per file among .env, .env.local, .env.development, .env.development.local, .env.production and .env.production.local in dir that defines CALCULATOR_V2_ROLLOUT (OI-30)
```

`src/app/learn/layout.tsx` and `src/app/diagnostic/page.tsx` render `<CalculatorVersionProvider version={await resolveCalculatorVersion()}>` around their content (AR-7); a failure there can only produce `"v1"`.

### 13.2 Quiz seam (11)

```ts
// src/components/calculator/question-key.ts
export function makeQuestionKey(sessionId: string, questionId: string): string; // `${sessionId}:${questionId}`
export function questionIdFromKey(questionKey: string): string; // the text after the first ":"
// src/components/calculator/calculator-window-store.ts (page-session module state, AR-25)
export type WindowMode = "floating" | "docked" | "maximized" | "fullscreen";
export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface WindowStoreState {
  mode: WindowMode | null; // current or last mode
  restoreMode: "floating" | "docked";
  floatingRect: WindowRect | null;
  dockWidth: number | null;
  displaySize: "default" | "large" | null; // written from Phase 4
  reverseContrast: boolean | null; // written from Phase 4
}
export const calculatorWindowStore: {
  get(): WindowStoreState;
  set(patch: Partial<WindowStoreState>): void;
  subscribe(listener: () => void): () => void;
  resetForTests(): void;
};
// src/components/calculator/CalculatorScope.tsx
import type { PastePayload } from "@/lib/calculator/paste";
import type { OpenTrigger } from "@/components/calculator-v2/host/quiz-host"; // type-only (AR-1)
export interface CalculatorScopeProps {
  enabled: boolean;
  open: boolean;
  onOpenChange(open: boolean): void;
  questionKey: string; // required: the value the host keys the scope by (makeQuestionKey in quiz hosts)
  dockTop?: number; // AR-24, default 12
  children: React.ReactNode;
}
export type CalculatorLoadStatus = "idle" | "loading" | "ready" | "failed";
export type CalculatorLoadFailure = "load" | "mount"; // OI-28: import() rejected, or mount/API threw
export interface V1Bridge {
  version: "v1";
  open: boolean;
  toggle(): void;
  paste(payload: PastePayload): void;
}
export interface V2Bridge {
  version: "v2";
  open: boolean;
  status: CalculatorLoadStatus;
  failure: CalculatorLoadFailure | null; // non-null only while status is "failed"
  questionKey: string;
  toggle(trigger?: OpenTrigger): void;
  prefetch(): void; // getCalculatorModule() and warmCalculatorFonts()
  // transfer(payload: TransferPayload, trigger: TransferTrigger): Promise<TransferResult> — added by 14-transfer-ui
}
export type CalculatorBridge = V1Bridge | V2Bridge;
export function useCalculator(): CalculatorBridge | null;
export function CalculatorScope(props: CalculatorScopeProps): JSX.Element;
export function CalculatorTrigger(): JSX.Element | null; // v2: aria-expanded and aria-controls on the shadow host id (A11Y-7)
// src/components/calculator/CalculatorWindow.tsx
export interface CalculatorWindowProps {
  mode: WindowMode;
  dockTop: number;
  dockWidth: number;
  floatingRect: WindowRect;
  onModeChange(mode: WindowMode): void;
  onFloatingRectChange(rect: WindowRect): void;
  onDockWidthChange(width: number): void;
  onClose(): void;
  onMinimize(): void;
  onFocusBoundary(edge: "first" | "last"): void;
  frameRef: React.RefObject<HTMLDivElement | null>; // tabIndex -1; OI-7 touch focus target
  chromeSlotRef: React.RefObject<HTMLDivElement | null>; // class styles.titleSlot, data-calculator-title-slot
  children: React.ReactNode;
}
export function CalculatorWindow(props: CalculatorWindowProps): JSX.Element;
// CalculatorWindow.module.css styles `.titleSlot > button` (13's Paste and Keyboard shortcuts buttons) with --kcc-* colours and the TH-14 outline, inside AR-33's eager budget
// src/components/calculator/CalculatorLoader.tsx
export type QuizHostModule = typeof import("@/components/calculator-v2/host/quiz-host");
export function loadCalculatorModule(): Promise<QuizHostModule>;
// exact body, asserted by a source test (AR-32 keeps the lazy graph out of .next/server):
//   typeof window === "undefined" ? Promise.reject(new Error("client only")) : import("@/components/calculator-v2/host/quiz-host")
export function getCalculatorModule(): Promise<QuizHostModule>;
// calls loadCalculatorModule() once per page and keeps the promise, a rejection included (OI-28)
export function resetCalculatorModuleForTests(): void;
export interface CalculatorLoaderProps {
  active: boolean;
  frame: HTMLElement | null;
  chromeSlot: HTMLElement | null;
  reducedMotion: boolean;
  announceReset: boolean;
  onStatus(status: CalculatorLoadStatus, failure: CalculatorLoadFailure | null): void;
  onHandle(handle: QuizCalculatorHandle | null): void;
  reloadPage?: () => void; // default () => window.location.reload(); tests inject a spy
}
export function CalculatorLoader(props: CalculatorLoaderProps): JSX.Element;
// "load" failure: LOAD_FAILED_COPY with a "Reload page" button calling reloadPage(); "mount" failure: MOUNT_FAILED_COPY with "Retry",
// which runs mountQuizCalculator again on the already loaded module; on activation calls warmCalculatorFonts() and, on onCalculatorFontsLoaded, handle.reflow() (AR-41)
// onHandle receives guardHandle(handle): every function member, 12's applyTransfer included, is forwarded; a throw shows the mount-failure panel (AR-53)
// src/components/calculator/font-warmup.ts
export function warmCalculatorFonts(): Promise<void>;
// document.fonts.load("16px KaTeX_Main") and document.fonts.load("italic 16px KaTeX_Math"); never rejects; idempotent per page; never delays first render
export function onCalculatorFontsLoaded(listener: () => void): () => void; // calls listener when the warm-up resolves and on every document.fonts "loadingdone"
```

Fixed copy: window label "Karman calculator"; loader "Loading calculator…"; `MOUNT_FAILED_COPY` "The calculator could not load." with "Retry"; `LOAD_FAILED_COPY` "The calculator could not load. Reload the page to try again." with "Reload page" (OI-28); side button "Open Karman calculator"; trigger "Toggle Karman calculator". Hosts: `QuizEngine` (`makeQuestionKey(state.attemptId, currentQuestionId ?? state.phase)`, its existing key), `DiagnosticClient`, `CatalogPractice` and `DailyChallenge` pass the key they already key the scope by; `ExternalCalculatorLink` passes `questionKey ?? useId()` from a new optional prop.

## 14. Transfer (owners: 12-transfer-core, 14-transfer-ui)

```ts
// src/lib/calculator-transfer/payload.ts (eager; owner 12) — AR-16 shape, verbatim
export interface TransferPayload {
  version: 1;
  questionKey: string; // attempt id + question id
  sourceId: string; // "stem:3", "table", "choice:B", …
  description: string; // plain text, as in table 8.1
  format: "rows" | "point" | "tableRow" | "evaluate" | "table"; // Phase 1 sends "rows" only
  dependencies: string[]; // stem definitions to insert first when unused (TR-37)
  rows?: string[];
  table?: { headers: (string | null)[]; columns: string[][] };
  pairs?: [string, string][];
  pointTableKey?: string;
}
export type TransferTrigger = "mouse" | "keyboard" | "touch";
export type TransferResult =
  | { status: "added" | "renamed" | "already-present"; message: string; focusRowId: string }
  | { status: "rejected"; message: string; focusRowId: null } // TR-73 core check; reported
  | { status: "unavailable" | "queue-full"; message: string; focusRowId: null }; // AR-55, AR-17; bridge only
export const MAX_QUEUED_TRANSFERS = 20; // AR-17
export const TRANSFER_MESSAGES: {
  added(description: string): string; // "Added to calculator: {description}."
  alreadyPresent(row: number): string; // "Already in the calculator, row {n}."
  renamed(newName: string, name: string): string; // "Added as {new name} because {name} is already defined."
  rejected: "This can't be added to the calculator.";
  unavailableRetry: "Calculator unavailable. Use Retry in the calculator panel."; // after a mount failure
  unavailableReload: "Calculator unavailable. Reload the page to use it."; // after a load failure (OI-28)
  tooManyWaiting: "Too many transfers are waiting. Try again when the calculator has opened.";
};
// src/components/learn/math-segments.ts (moved from MathText.tsx:43-118, TR-6; owner 12)
export type MathSegment =
  | { kind: "text"; value: string }
  | { kind: "inline"; latex: string; sourceFunction?: true }
  | { kind: "block"; latex: string };
export function splitMathText(
  text: string,
  serializedFunctionLines: boolean,
  atLineStart: boolean,
  atLineEnd: boolean
): MathSegment[];
// src/lib/calculator-transfer/normalize.ts (eager; owner 12)
export function normalizeQuestionMath(
  latex: string,
  context: "math" | "cell" | "coordinate"
): string; // table 4.1 (TR-7), PR-5 thousands groups, PR-6/TR-28 mixed numbers
// src/lib/calculator-transfer/classify.ts (eager; owner 12)
export interface StemInput {
  text: string;
  serializedFunctionLines: boolean;
}
export interface ChoiceInput {
  letter: string;
  text: string;
}
export type TransferItemKind =
  | "expression"
  | "equation"
  | "inequality"
  | "function"
  | "system"
  | "choice";
export interface TransferItem {
  sourceId: string; // "stem:<splitMathText index>" or "choice:<letter>"
  kind: TransferItemKind;
  ruleId: string; // accepting rule, e.g. "TR-11"; the only content TR-73 reports
  description: string; // table 8.1
  payload: Omit<TransferPayload, "questionKey">;
}
export function classifyStem(stem: StemInput): ReadonlyMap<number, TransferItem>; // memoized by input
export function classifyChoice(choice: ChoiceInput, stem: StemInput | null): TransferItem | null; // memoized
export function accessibleNames(items: readonly TransferItem[]): Map<string, string>; // sourceId -> "Transfer to Calculator: {description}" plus ", occurrence n" for repeats (TR-50)
// src/components/calculator-v2/transfer/apply.ts (lazy; owner 12)
export type TransferTarget = Pick<
  CalculatorEngine,
  | "getExpressions"
  | "setExpressions"
  | "updateSettings"
  | "focusExpression"
  | "activateExpression"
  | "settings"
>;
export const transferPayloadSchema: z.ZodType<TransferPayload>;
export function applyTransfer(
  target: TransferTarget,
  payload: unknown,
  trigger: TransferTrigger
): Extract<TransferResult, { status: "added" | "renamed" | "already-present" | "rejected" }>;
// validates (AR-16), analyses the prospective list first (TR-73), one setExpressions call (TR-38), then focusExpression ("mouse" | "keyboard") or activateExpression ("touch") (API-12, TR-66)
// src/components/calculator/CalculatorSourceAction.tsx (owner 11; v2 branch by 14)
export function CalculatorSourceAction(props: {
  latex: string;
  segmentIndex?: number;
  stem?: StemInput;
}): JSX.Element | null;
export function CalculatorChoiceAction(props: {
  text: string;
  letter: string;
  stem?: StemInput;
  slot?: "cluster";
}): JSX.Element | null;
export function CalculatorTableAction(props: {
  rows: string[][];
  headers?: string[];
  layout?: "vertical" | "horizontal";
  itemId?: string;
  slot?: "cluster";
}): JSX.Element | null; // v2 renders nothing until Phase 3 (TR-77)
// src/components/calculator/TransferControl.tsx (eager; owner 14)
export const TRANSFER_TOOLTIP = "Transfer to Calculator";
export interface TransferControlProps {
  item: TransferItem;
  accessibleName: string;
  placement: "inline" | "block" | "cluster"; // TR-46, TR-42
}
export function TransferControl(props: TransferControlProps): JSX.Element | null;
// awaits bridge.transfer(); on a "rejected" result that isCoreRejection accepts, calls reportTransferRejection(questionIdFromKey(bridge.questionKey), item.ruleId)
// src/components/calculator/transfer-report.ts (eager; owner 14)
export function reportTransferRejection(questionId: string, ruleId: string): void;
// captureException(new Error("calculator-transfer-rejected"), { tags: { questionId, ruleId } }); nothing else (TR-73)
```

## 15. Paste and standalone (owner: 13-paste-standalone)

```ts
// src/lib/calculator-transfer/clipboard.ts (imported only from src/components/calculator-v2/, AR-1)
export type ClipboardContent =
  | { kind: "math"; lines: string[] } // rendered question math already through normalizeQuestionMath (OI-6)
  | { kind: "pairs"; pairs: [string, string][] }
  | { kind: "table"; headers: (string | null)[]; columns: string[][] } // 1–10 columns, or headers [] and columns [] when unusable (two tables or more than 10 columns); nothing inserted until AR-15
  | { kind: "refused"; reason: "file" | "image" | "drop" }
  | { kind: "empty" };
export function extractClipboard(data: DataTransfer): ClipboardContent;
export function extractClipboardText(plain: string, html: string | null): ClipboardContent;
export function readSystemClipboard(): Promise<ClipboardContent | { kind: "unavailable" }>;
export const PASTE_MESSAGES: {
  refused: "Figures, images and saved graphs can't be pasted into the calculator.";
  table: "This table can't be pasted into the calculator.";
};
// src/components/calculator-v2/chrome/TitleBarControls.tsx (portalled into the light-DOM chrome slot)
export interface TitleBarControlsProps {
  hostId: string; // aria-controls target for the shortcuts popover (A11Y-7); omitted from aria-controls when empty
  shortcutsOpen: boolean;
  onPaste(): void; // reads the clipboard, else opens "Math to paste" (L-13)
  onToggleShortcuts(): void; // "Keyboard shortcuts and help" popover (KB-1)
}
export function TitleBarControls(props: TitleBarControlsProps): JSX.Element;
// src/components/calculator-v2/chrome/ShortcutsPopover.tsx (rendered inside the shadow root by CalculatorChrome)
export function ShortcutsPopover(props: { open: boolean; onClose(): void }): JSX.Element | null;
// src/components/calculator-v2/standalone/main.tsx
declare global {
  interface Window {
    KarmanCalculator?: typeof KarmanCalculator; // API-15: standalone page only
    karmanCalculator?: KarmanCalculator;
  }
}
// src/lib/calculator-v2/worker/create.standalone.ts
export function createComputeWorker(): Worker; // new Worker("./worker.js?v=<hash>", { name: "karman-calculator" }); file:// failure -> AR-50 fallback
```

App wraps `CalculatorLayout` in 13's `CalculatorChrome`, which installs the shadow-root `paste` (capture phase), `copy`, `cut`, `dragover` and `drop` listeners, portals `TitleBarControls` into the chrome slot and renders the shortcuts popover and "Math to paste" in the shadow root.

## 16. Build, release and test tooling

| Command                                                                                       | Owner                                    | Contract                                                                                                                                                                |
| --------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsx scripts/calculator-v2/check-spec-ids.mjs --packages 02,03` (or `--ids PR-3,PR-4`)    | 02-parser                                | exits 1 listing every selected ID with no test title or counted corpus `rules` entry                                                                                    |
| `npx tsx scripts/calculator-v2/check-spec-ids.mjs --phase 1`                                  | 15-release-gates (extension)             | the same for every ID due by the phase, including "staged from Phase N" IDs (K-4)                                                                                       |
| `npx tsx scripts/calculator-v2/generate-skin-colors.ts [--check]`                             | 03-foundations                           | writes `skin-colors.generated.ts` and `calculator-chrome.generated.css`; `--check` exits 1 on drift (TH-5)                                                              |
| `node scripts/calculator-v2/reference-elementary.mjs`                                         | 04-semantics                             | writes `core/corpus/reference/elementary.json`, mathjs BigNumber at precision 40 (NM-43), Prettier-formatted                                                            |
| `node scripts/build/calculator-v2.mjs --styles [--check]`                                     | 10-shell                                 | section 12                                                                                                                                                              |
| `node scripts/build/calculator-v2.mjs`                                                        | 13-paste-standalone (extension)          | styles, then the standalone page into `tmp/calculator-v2-standalone/` (`index.html`, iife `calculator.js`, `calculator.css`, `worker.js`, KaTeX woff2, `metafile.json`) |
| `node scripts/build/check-calculator-v2-bundle.mjs [--update-baseline] [--record-base <dir>]` | 11-seam; 15 adds the standalone rule     | reads `.open-next/` after a build; exits 1 listing failed rules                                                                                                         |
| `scripts/calculator-v2/release.sh`                                                            | 11-seam                                  | the release step of `00-index.md` section 1                                                                                                                             |
| `npx playwright test --config=playwright.calculator-v2-e2e.config.ts`                         | 11-seam; 15 adds `calculator-v2.spec.ts` | Turbopack checks on `next dev`                                                                                                                                          |
| `npx playwright test --config=playwright.cf-preview.config.ts`                                | 11-seam                                  | AR-66 on `npm run cf:preview`                                                                                                                                           |

```ts
// scripts/calculator-v2/check-spec-ids.mjs (JSDoc-typed; declarations shown as TypeScript)
export function expandIds(list: string): string[]; // "PR-7 to PR-27, PR-29; AR-1" → ids
export function packageIds(indexMarkdown: string): Map<string, string[]>; // "02" → the "- **IDs:**" line under "### 02 …"
export function titledIds(source: string): Set<string>; // IDs leading it/test/describe/test.describe titles
export function corpusIds(cases: readonly CorpusCase[]): Set<string>; // rules of cases with ≥1 expected field
export function missingIds(required: readonly string[], found: ReadonlySet<string>): string[];
export const SCANNED_GLOBS: readonly string[]; // src/**/*.test.{ts,tsx}, tests/**/*.spec.ts, tests/unit/**/*.test.ts
// added by 15-release-gates:
export function phaseIds(overviewMarkdown: string, phase: number): string[]; // section 7.2 tables for phases <= phase, plus IDs marked "staged from Phase N" with N <= phase
// scripts/build/turbopack-output.mjs (owner 11; pinned to recorded fixtures)
export const TURBOPACK_FORMAT_NEXT = "16.3.8";
export function assertPinnedNext(installedVersion: string): void;
// throws "Turbopack output format is pinned to Next 16.3.8; installed <v>: re-capture scripts/build/__fixtures__/turbopack-<v>/ and update turbopack-output.mjs"
export function parseAsyncChunkGroups(chunkSource: string): string[][]; // chunk paths each import() in the source loads
export function parseWorkerCall(
  chunkSource: string
): { bootstrap: string; chunks: string[] } | null;
// the runtime worker call (the form recorded in scripts/build/__fixtures__/turbopack-16.3.8/worker-call.txt)
export function workerUrl(origin: string, call: { bootstrap: string; chunks: string[] }): string; // bootstrap URL + "#params=" + the chunk list in the encoding the runtime helper uses (reversed order), as recorded
export function eagerFiles(manifestSource: string, route: string): string[]; // entry JS and CSS of a route and its layouts
// fixtures: async-import.txt, worker-call.txt, worker-runtime-helper.txt, page_client-reference-manifest.js
// scripts/build/check-calculator-v2-bundle.mjs (owner 11). The CLI runs only when the file is the process entry (`process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href`); importing the module has no side effects.
export const EAGER_ROUTES: readonly string[];
// "/learn/[subject]/[nodeId]/page", "/learn/practice/[skillId]/page", "/learn/daily/page", "/learn/earlier/[subject]/page", "/diagnostic/page"
export const BUDGETS: {
  eagerAddedGzipBytes: 10240; // per route, current minus base (AR-33)
  lazyGzipBytes: 409600; // lazy chunk group, excluding worker files and fonts
  workerGzipBytes: 256000; // bootstrap plus the chunks it loads (OI-29)
  standaloneGzipBytes: 614400; // rule added by 15
};
export interface BundleBaseline {
  next: string;
  base: { commit: string; eagerGzipBytes: Record<string, number> }; // recorded from a 08c8c76 build
  eagerAddedGzipBytes: Record<string, number>;
  lazyGzipBytes: number;
  workerGzipBytes: number;
  standaloneGzipBytes: number | null; // written once 15's rule exists
  perf: {
    method: "warm-module-graph";
    firstOpenMs: number;
    firstOpenThrottledMs: number;
    reopenMs: number;
  } | null; // written by 15's perf spec
}
export interface BundleReport {
  measured: Omit<BundleBaseline, "base" | "perf">;
  worker: { bootstrap: string; chunks: string[] } | null;
  problems: string[];
}
export function checkBundle(options: {
  root: string;
  baseline: BundleBaseline;
}): Promise<BundleReport>;
// rules, in order: assertPinnedNext; positive control (KARMAN_CALCULATOR_SENTINEL and "mq-root-block" each in at least one file of the lazy chunk group,
// the group whose files contain the sentinel); neither string in any file under .open-next/server-functions/** or in any eager file of EAGER_ROUTES (AR-32);
// the worker call found in the lazy group, its bootstrap and chunks present under .open-next/assets/_next/static/, one chunk containing WORKER_MARKER,
// static/media/*.ts ignored (AR-66); the BUDGETS (AR-33); no measured value above 1.1 × the committed baseline (AR-33)
export function formatBaseline(baseline: BundleBaseline): Promise<string>; // Prettier API, repo config, parser json
// added by 15-release-gates:
export const STANDALONE_DIR = "tmp/calculator-v2-standalone";
export const CORE_MARKER = "Check for a missing bracket or operator."; // part of rowErrorMessage("syntax", []) (01 section 3), reachable only through core/analysis
export function checkStandalone(
  root: string,
  baseline: BundleBaseline
): { standaloneGzipBytes: number | null; problems: string[] }; // --update-baseline also writes standaloneGzipBytes
export function checkEagerCore(input: {
  root: string;
  eager: Readonly<Record<string, readonly string[]>>;
  lazy: readonly string[];
}): string[]; // paths under <root>/.open-next/assets/_next/
// scripts/build/calculator-v2.mjs (added by 13-paste-standalone; 15 Task 5 calls buildStandalone). The CLI runs only when the file is the process entry (`process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href`); importing the module has no side effects.
export const STANDALONE_OUT_DIR = "tmp/calculator-v2-standalone";
export interface StandaloneBuild {
  outDir: string;
  files: string[]; // every written file relative to outDir, sorted
  hashes: { js: string; css: string; worker: string }; // first 16 hex characters of each file's sha256
}
export function buildStandalone(options?: { outDir?: string }): Promise<StandaloneBuild>; // empties outDir, writes the standalone page with metafile.json there; never writes styles/generated.ts
```

`scripts/calculator-v2/release.sh` (owner 11), the only place `cf:deploy` runs:

```sh
#!/usr/bin/env bash
set -euo pipefail
node -e 'process.exit(process.versions.node.split(".")[0] === "22" ? 0 : 1)' || { echo "Node 22 required"; exit 1; }
npm run cf:build:release
node scripts/build/check-calculator-v2-bundle.mjs
npx playwright test --config=playwright.cf-preview.config.ts
npm run cf:deploy
secrets=$(npx wrangler secret list)
grep -q '"CALCULATOR_V2_ROLLOUT"' <<<"$secrets" || { echo "CALCULATOR_V2_ROLLOUT secret missing"; exit 1; }
```

Playwright configs (owner 11):

- `playwright.calculator-v2-e2e.config.ts`: `testDir: "./tests/e2e"`, `testMatch: /calculator-v2(-smoke)?\.spec\.ts$/`, `globalSetup: "./tests/e2e/global-setup.ts"`, `workers: 1`, one project `calculator-v2-e2e` (Desktop Chrome), `use: { baseURL: "http://localhost:3100" }` (Playwright derives `baseURL` only from `webServer.port`, and this config sets `webServer.url`), `webServer` `{ command: "npm run dev:next -- --port 3100", url: "http://localhost:3100", reuseExistingServer: false, timeout: 180_000, env: { DEV_IMPERSONATE_CLERK_ID: "dev_seed_admin", CALCULATOR_V2_ROLLOUT: "admins" } }`. The smoke opens v2 on the practice route `tests/e2e/local-quiz-audit.spec.ts` uses.
- `playwright.cf-preview.config.ts`: `testDir: "./tests/cf-preview"`, one project `cf-preview` (Desktop Chrome), `use: { baseURL: "http://localhost:8787" }` (so `page.goto("/")` resolves), `webServer` `{ command: "npm run cf:preview", url: "http://localhost:8787", reuseExistingServer: false, timeout: 180_000 }`. `worker.spec.ts` opens `/`, builds `new Worker(workerUrl(origin, call), { name: "karman-calculator" })` as a classic worker, expects `{ type: "ready", worker: "karman-compute-v1" }`, sends `state` and `view` for `y=x^2`, and expects a `plot` with a non-empty `polylines` and no console errors.
- `playwright.config.ts`: adds `testIgnore: /calculator-v2/` to the `e2e`, `e2e-firefox` and `e2e-webkit` projects; nothing else changes.

Vite fixture URLs (`npm run test:calculator`): quiz flows `/?flow=practice&calc=v2`, `/?flow=diagnostic&calc=v2`, `/?flow=catalog&calc=v2` and `/?flow=daily&calc=v2` (11; catalog and daily render inside the real `LearnLayout`, so AR-24 measures the real header; without `calc=v2` each flow is v1); `?questions=transfer` (14); harness pages `/v2/math-field.html` (05), `/v2/worker.html` (07), `/v2/graph.html?skin=&rows=&w=&h=` (08; `w` and `h` default to 800×600), `/v2/editor.html` (09), `/v2/calculator.html` (10); standalone `/karman-calculator-v2/` (13).

```ts
// tests/calculator/fixture/v2/harness-kit.tsx (owner 07; used by the 08, 09 and 10 harness pages)
export interface HarnessOptions {
  root: HTMLElement; // a shadow root is attached to it
  css: string[]; // CSS text imported with Vite's ?inline (declared in env.d.ts, owner 05)
  skin?: SkinId; // default "ivory"; installs hostThemeCss(skin) and provides SkinContext
  options?: CalculatorOptions;
  render(engine: CalculatorEngine): React.ReactNode;
}
export function mountHarness(options: HarnessOptions): {
  engine: CalculatorEngine;
  destroy(): void;
};
// imports katex/dist/katex.min.css at document scope and calls exposeEngineForTests(engine)
// tests/calculator/fixture/v2/env.d.ts (owner 05)
declare module "*.css?inline" {
  const css: string;
  export default css;
}
```

On the quiz fixture, browser specs read the engine through `globalThis.__calculatorHarness` (set by the quiz host in development, section 12) and the instance counters through `globalThis.__karmanCalculatorCounters` (section 1.1).
