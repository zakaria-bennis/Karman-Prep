# 14 transfer-ui: Transfer control, wrappers and call sites, docking on transfer, touch flow and the bridge

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Package:** `transfer-ui`, increment 1B, wave 7. Depends on 03-foundations, 10-shell, 11-seam and
12-transfer-core, and through them on 02 to 09; runs beside 13-paste-standalone. This file holds
the package's shared header, contracts, decisions, notes for the lead and the package gate; its 14
tasks are in four part files, each under 700 lines (table below).

**Goal:** In v2 Math questions every stem segment and answer choice that 12's classifier accepts
gets Karman's icon-only Transfer to Calculator control. It is revealed by hover, keyboard focus or a
tap on the item, and it is always visible in answer-choice tool clusters on coarse pointers. A
press travels through `useCalculator().transfer()` to the lazy calculator. At 1024 px and wider
(over 500 px tall) the calculator docks; otherwise it opens full screen. It focuses or activates the
new row, and a quiz-side status region announces the result once. With the flag off every call
site renders exactly as before (AR-8).

**IDs (42):** TR-2, TR-4, TR-41 to TR-59, TR-64 to TR-70, TR-76; AR-10 to AR-12, AR-17, AR-21,
AR-37, AR-55; L-7, L-9; KB-4; AN-12; A11Y-11; TH-2.

**Open items:** OI-21 (Task 4), OI-16 and OI-18 (Task 5), OI-2 (Task 8), OI-36 (Task 9).

**Owns** (00-index section 2, plus `use-transfer-bridge.ts`, note 1): in `src/components/calculator/`:
`TransferControl.tsx`, `TransferControl.module.css`, `transfer-control.css`, `transfer-selection.ts`,
`transfer-report.ts`, `use-transfer-bridge.ts`, with their tests, and
`CalculatorScope.transfer.test.tsx`, `transfer-call-sites.test.tsx`; `src/components/learn/QuestionTable.tsx`,
`quiz/TableChoiceOption.tsx`, `quiz/ActiveQuizScreen.tsx`, `catalog-practice/CatalogQuestion.tsx`;
`src/components/diagnostic/parts/AnswerChoiceButton.tsx`; `tests/calculator/fixture/v2/transfer-questions.ts`;
in `tests/calculator/v2/`: `transfer-helpers.ts`, `transfer.spec.ts`, `transfer-touch.spec.ts`,
`transfer-docking.spec.ts`, `transfer-failures.spec.ts`, `transfer-visual.spec.ts` and
`transfer-visual.spec.ts-snapshots/` (note 5). **Extension edits** (00-index 5.2):
`src/components/calculator/CalculatorScope.tsx`, `CalculatorSourceAction.tsx`,
`src/components/learn/DailyChallenge.tsx`, `tests/calculator/fixture/main.tsx` (owner 11);
`src/components/learn/MathText.tsx` (owner 12). **Spec text:** OI-2, OI-16, OI-18, OI-21.

**Before starting:** read `00-index.md` sections 1, 4 and 5 and `01-interfaces-integration.md`
sections 13, 14 and 16; contracts are quoted from there and never renamed. Run every command from
the worktree root under Node 22 (`n exec 22 <command>`). Unit and component:
`npx vitest run <file> -t "<ID>"`. Browser:
`npm run test:calculator -- --project=calculator-chrome tests/calculator/v2/<spec> -g "<ID>"`; the
filter `tests/calculator/v2/transfer` runs all five transfer specs. Every task ends in one commit;
the pre-commit hook runs `eslint --fix` and Prettier on staged files, so each task adds only the
imports and helpers its own tests use (later tasks extend the import lines). `vitest.config.ts` has
no `globals: true` and `tsconfig` has no `vitest/globals` types, so every unit and component file
imports the Vitest names it uses (`it`, `expect`, `vi`, `beforeEach`, `afterEach`) from `"vitest"`,
as `src/components/admin/ImpersonationBanner.test.tsx` does; browser specs import `expect` and `test`
from `@playwright/test`. Code blocks without a language are test sources: write them as shown
(Prettier reformats them).

**Type checks.** Neither Vitest nor Playwright type-checks, and `tsconfig.json` includes every
`**/*.ts` and `**/*.tsx` file, so a test source that does not type-check passes its own run and
fails CI's TypeScript check. Every task's pass step therefore ends with `npx tsc --noEmit`
(Expected: exit 0), and a type error is fixed in the task that introduced it. Mocks are declared
with their real parameter lists (`vi.fn((_payload: TransferPayload, _trigger: TransferTrigger) => …)`),
so `mock.calls`, `mock.lastCall` and destructured call arguments have their real types; ESLint's
`argsIgnorePattern: "^_"` (`eslint.config.mjs`) allows the unused names.

**Preconditions** (check once, before task 1; stop and report to the lead if one fails, because the
fix belongs to another package's file):

1. `grep -n "applyTransfer" src/components/calculator-v2/host/quiz-host.ts` shows 12's
   `applyTransfer(payload: unknown, trigger: TransferTrigger): TransferResult` on
   `QuizCalculatorHandle`.
2. `npx vitest run src/components/calculator/CalculatorLoader.test.tsx -t "AR-53"` passes. 11's
   `guardHandle` wraps whatever function members the handle has, so the source need not name
   `applyTransfer`; this run is the check that the guarded handle 11's loader passes to `onHandle`
   forwards it. 11-seam.md task 4's AR-53 tests own the case: a fake handle given an extra
   `applyTransfer: vi.fn(() => "ok")` returns `"ok"` from `guarded.applyTransfer(1, "mouse")` and
   is called with `(1, "mouse")`, and a throwing `applyTransfer` shows the Retry panel. If the run
   fails, or no AR-53 case in it calls `applyTransfer`, stop: a guarded handle that does not forward
   it drops every transfer.
3. `src/components/learn/math-segments.ts` exports `splitMathText`, and
   `src/lib/calculator-transfer/classify.ts` exports `classifyStem`, `classifyChoice` and
   `accessibleNames` with the section 14 signatures.

## Plan files

Tasks run in number order; each part starts where the previous one ends.

| File                               | Tasks    | Concern                                                                                                                          |
| ---------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `14-transfer-ui-1-control.md`      | 1 to 4   | Rejection reporter; tap rules and selection store; the bridge hook and status region; the control                                |
| `14-transfer-ui-2-call-sites.md`   | 5 to 7   | Wrappers and stem mapping; answer-choice call sites; the synthetic fixture and availability                                      |
| `14-transfer-ui-3-reveal-touch.md` | 8 to 10  | Geometry, tooltip and Escape, and the TR-43 and TR-46 baselines; answer-choice clusters in the browser; the touch selection flow |
| `14-transfer-ui-4-scope.md`        | 11 to 14 | Docking on transfer; focus and announcements; held payloads and question keys; contrast and theme                                |

## Tasks and IDs

| Task                                       | IDs its test titles start with                                | Test files                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1 Rejection reporter                       | contribution TR-73                                            | `transfer-report.test.ts`                                                                   |
| 2 Selection store and tap rules            | TR-54, AR-10, TR-55, TR-56, TR-57, TR-58                      | `transfer-selection.test.ts`                                                                |
| 3 Bridge hook and status region            | AR-10, AR-17, TR-67, TR-70, TR-69                             | `CalculatorScope.transfer.test.tsx`                                                         |
| 4 TransferControl behaviour (OI-21)        | TR-4, AR-12, TR-59, AR-10, TR-54, TH-2; contribution TR-73    | `TransferControl.test.tsx`, `transfer-report.test.ts`                                       |
| 5 Wrappers and stem mapping (OI-16, OI-18) | TR-45, TR-50, TR-2, TR-76, AR-11                              | `transfer-call-sites.test.tsx`                                                              |
| 6 Answer-choice call sites                 | AR-11, TR-41                                                  | `transfer-call-sites.test.tsx`                                                              |
| 7 Fixture and availability                 | TR-4, TR-76                                                   | `transfer.spec.ts`                                                                          |
| 8 Geometry, tooltip, Escape (OI-2)         | TR-43, TR-44, TR-46, TR-47, TR-48, TR-49, TR-51, TR-52, AN-12 | `transfer.spec.ts`, `transfer-visual.spec.ts`                                               |
| 9 Answer-choice clusters in the browser    | TR-42, TR-41, AR-11; OI-36                                    | `transfer-touch.spec.ts`, `transfer-visual.spec.ts`                                         |
| 10 Touch selection flow                    | TR-55, TR-56, TR-57, TR-58                                    | `transfer-touch.spec.ts`                                                                    |
| 11 Docking on transfer                     | AR-21, TR-64, L-7, TR-65, L-9                                 | `CalculatorScope.transfer.test.tsx`, `transfer-docking.spec.ts`                             |
| 12 Focus and announcements                 | TR-66, AR-55, TR-68, KB-4, TR-67, A11Y-11; contribution NM-42 | `CalculatorScope.transfer.test.tsx`, `TransferControl.test.tsx`, `transfer-docking.spec.ts` |
| 13 Held payloads and question keys         | TR-69, AR-55, TR-70                                           | `transfer-failures.spec.ts`                                                                 |
| 14 Contrast and theme                      | TR-53, TH-2, AR-37; contributions TH-1, TH-14, TH-8           | `transfer.spec.ts`                                                                          |

**Test files.** Split from the start so each stays under 700 lines (`wc -l` at the package gate;
`scripts/check-file-sizes.mjs` scans `src/`):

| File                                                          | Tasks     | Holds                                                                                          |
| ------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `src/components/calculator/transfer-report.test.ts`           | 1, 4      | TR-73 contribution (the file section 5.3 names); no JSX, so React elements use `createElement` |
| `src/components/calculator/transfer-selection.test.ts`        | 2         | tap rules and the selection store (node environment)                                           |
| `src/components/calculator/CalculatorScope.transfer.test.tsx` | 3, 11, 12 | the bridge hook through `V2Scope`: queue, status region, store writes, focus fallback          |
| `src/components/calculator/TransferControl.test.tsx`          | 4, 12     | the control in isolation and the TH-2 sheet checks                                             |
| `src/components/calculator/transfer-call-sites.test.tsx`      | 5, 6      | wrappers, MathText mapping, call sites                                                         |
| `tests/calculator/v2/transfer-helpers.ts`                     | 7 to 14   | shared browser helpers (no test; Playwright's default `testMatch` skips it)                    |
| `tests/calculator/v2/transfer.spec.ts`                        | 7, 8, 14  | availability, geometry, contrast and theme (TH-1 and TH-14 stay here, as section 5.3 names)    |
| `tests/calculator/v2/transfer-touch.spec.ts`                  | 9, 10     | answer-choice clusters and the touch flow                                                      |
| `tests/calculator/v2/transfer-docking.spec.ts`                | 11, 12    | docking, focus and announcements                                                               |
| `tests/calculator/v2/transfer-failures.spec.ts`               | 13        | held payloads, failures and question keys                                                      |
| `tests/calculator/v2/transfer-visual.spec.ts`                 | 8, 9      | TR-43 and TR-46 baselines at fine and coarse reveal, ivory and observatory                     |

## Package-internal names

Used only inside this package, in addition to sections 13.2 and 14:

```ts
// src/components/calculator/transfer-selection.ts (eager; no React, no DOM globals)
import type { TransferTrigger } from "@/lib/calculator-transfer/payload";
export const TAP_MAX_MOVE_PX = 10; // TR-55
export const TAP_MAX_MS = 500; // TR-55, TR-58
export interface PointerSample {
  pointerType: string;
  x: number;
  y: number;
  t: number; // event.timeStamp
}
export function isHoverPointer(event: { pointerType: string; buttons: number }): boolean;
// "mouse", or "pen" with buttons === 0 (a hovering pen); never "touch" (TR-54)
export function isTap(
  down: PointerSample,
  up: PointerSample,
  maxMovePx: number,
  selectionCollapsed: boolean
): boolean;
// pointerType "touch" or "pen" on both; Math.max(maxMovePx, hypot(up - down)) <= 10, where
// maxMovePx is the largest distance from down seen on any pointermove of the contact;
// up.t - down.t < 500; selectionCollapsed (TR-55, TR-58)
export function triggerFor(
  lastPointerDown: { pointerType: string } | null,
  revealedByHoverPen: boolean
): TransferTrigger;
// null -> "keyboard"; "touch" -> "touch"; "pen" -> revealedByHoverPen ? "mouse" : "touch";
// any other pointer -> "mouse" (AR-10, TR-59)
export interface TransferSelection {
  questionKey: string;
  sourceId: string;
}
export const transferSelection: {
  get(): TransferSelection | null; // same object until the next change (useSyncExternalStore)
  toggle(selection: TransferSelection): void; // selects it, replacing any other; deselects when equal
  clear(): void; // notifies only when something was selected
  subscribe(listener: () => void): () => void;
  resetForTests(): void;
};

// src/components/calculator/transfer-report.ts (eager; no React)
import type { TransferResult } from "@/lib/calculator-transfer/payload";
export function markCoreRejection(result: TransferResult): TransferResult; // module WeakSet; returns result
export function isCoreRejection(result: TransferResult): boolean; // true only for a marked result

// src/components/calculator/use-transfer-bridge.ts (eager; "use client"; called only by V2Scope)
import type { RefObject } from "react";
import type { QuizCalculatorHandle } from "@/components/calculator-v2/host/quiz-host"; // type-only (AR-1)
import type {
  TransferPayload,
  TransferResult,
  TransferTrigger,
} from "@/lib/calculator-transfer/payload";
import type { CalculatorLoadFailure, CalculatorLoadStatus } from "./CalculatorScope"; // type-only
export interface TransferBridgeOptions {
  questionKey: string;
  open: boolean;
  status: CalculatorLoadStatus;
  failure: CalculatorLoadFailure | null;
  onOpenChange(open: boolean): void;
  frameRef: RefObject<HTMLDivElement | null>; // CalculatorWindow's frame (task 12 focus targets)
}
export interface TransferBridge {
  transfer(payload: TransferPayload, trigger: TransferTrigger): Promise<TransferResult>;
  // stable identity, reads refs, so an older V2Bridge object acts on the current state (task 3;
  // the docking write is task 11's)
  onHandle(handle: QuizCalculatorHandle | null): void;
  // V2Scope calls it from the loader's onHandle: fills the handle ref and, for a non-null handle,
  // bumps the drain's tick (task 3)
  announcement: string; // the [data-transfer-status] text (task 3)
  openedByTransfer(): boolean;
  // true while a transfer opened the current open; V2Scope's once-per-open focusOnOpen effect
  // returns early (task 12)
}
export function useTransferBridge(options: TransferBridgeOptions): TransferBridge;

// src/components/calculator/TransferControl.tsx
export const TRANSFER_TOOLTIP = "Transfer to Calculator"; // section 14
export const TOOLTIP_DELAY_MS = 300; // TR-51
export const FINE_TARGET_PX = 24; // TR-44
export const COARSE_TARGET_PX = 44; // TR-44, TR-55
export const INLINE_OVERLAP_PX = 4; // TR-46
export function placeControl(
  anchor: HTMLElement,
  item: HTMLElement,
  button: HTMLElement,
  placement: "inline" | "block",
  size: number
): void;
// inline: r = last rect of item.getClientRects(), a = anchor.getBoundingClientRect();
//   button.style.left = `${r.right - a.left - size}px`; top = `${r.top - a.top - size + 4}px`
// block: r = item.getBoundingClientRect(); left = `${r.right - a.left - size}px`; top = `${r.top - a.top}px`
// no rects (jsdom, detached) -> leaves the styles unchanged

// src/components/learn/QuestionTable.tsx (owned by 14; its one new caller is CatalogQuestion, task 6)
// gains the optional prop calculatorItemId?: string, default "table", passed to CalculatorTableAction's itemId
```

## DOM contract

Read by this package's specs and by 15:

```text
span[data-transfer-control][data-source-id][data-placement="inline|block|cluster"]
    [data-visible="true|false"]        inline and block only; written synchronously by native listeners
    [data-reveal="fine|coarse"]        inline and block; coarse while tap-selected
    [data-hover="true"] [data-escaped="true"]   cluster only (pointer over the choice container; TR-49)
  button[type=button][aria-label="Transfer to Calculator: …"]   one per item (TR-45)
    span[data-transfer-glyph][aria-hidden=true] > svg.lucide-calculator + svg.lucide-arrow-up-right
  span[data-transfer-tooltip][aria-hidden=true][hidden]   text "Transfer to Calculator"
item element: inline and block use the anchor's previousElementSibling, a cluster uses the parent of
  its [data-calculator="v2"] cluster; it gets [data-transfer-item], and inline and block items get
  [data-transfer-selected="true"] while tap-selected or while their control has focus
div[data-transfer-status][role=status][aria-live=polite][aria-atomic=true].sr-only
  rendered by CalculatorScope (v2) as a sibling of [data-calculator-workspace] and [data-calculator-v2]
[data-calculator="v2"] on each answer-choice tool cluster (v2 only, AR-11)
```

## Decisions

- The practice and catalog fixture flows take their questions from `tests/calculator/fixture/actions.ts`,
  which no package owns, so `?questions=transfer` swaps only the diagnostic and daily questions.
  Practice and catalog are checked with their existing synthetic content: the stem segment
  `\sin(30)` is a Phase 1 expression item, `(1,2)` is a Phase 3 pair (no control), and the whole
  choices `$1$` to `$4$` are eligible because TR-10 does not apply to whole choices.
- `AnswerChoiceButton` gets no `stem` prop. Its only caller, `DiagnosticClient` (11), is not edited
  and would never pass one, so the diagnostic's `CalculatorChoiceAction` always uses the stem that
  the question's own stem `MathText` registers for `bridge.questionKey`, kept in a module-level
  registry in `CalculatorSourceAction.tsx`. The wrappers' section 14 `stem` prop still wins where
  a caller passes one (`ActiveQuizScreen`, `CatalogQuestion`, `DailyChallenge`). A stem with no
  math segment registers nothing; it defines no names, so `classifyChoice(choice, null)` gives the
  same result.
- The quiz has no persistent Highlight mode (`QuizTools.tsx:103-112` highlights an existing
  selection), so TR-58's Highlight clause is the selection clause: a gesture that ends with a
  non-collapsed selection never selects, and selections survive.
- `CalculatorTableAction` gets `headers` and `itemId` at its call sites; `layout` stays unset in
  Phase 1, because v2 renders no table control until Phase 3 (TR-77) and table 5.1 derives the
  shape from the cells.
- Bridge hook (size): 11 keeps `CalculatorScope.tsx` under 450 lines and expects this package to
  extend it. The transfer pipeline (queue, drain, announcements, docking write, focus fallback,
  held payloads and their effects) would add 150 to 250 lines there, so it lives in the
  package-owned `use-transfer-bridge.ts`. `V2Scope` only calls `useTransferBridge(…)`, adds
  `transfer` to the bridge object, forwards the loader's handle to `onHandle`, guards its
  once-per-open `focusOnOpen` effect with `openedByTransfer()` and renders the status region:
  about 20 lines, so `CalculatorScope.tsx` stays under 500 (gate).
- Docking write (AR-21, TR-65): `transfer()` in `use-transfer-bridge.ts` writes
  `{ mode: "docked", restoreMode: "docked" }` to the window store only when `FULL_SCREEN_QUERY`
  does not match, at the position task 11 names: after the key check (step 1), the selection
  clear (step 2) and the queue-full refusal (step 3), before the load-failure step (step 4). A
  load-failure panel therefore opens docked on a wide viewport, a refused transfer (stale key or
  queue full) never writes the store, and in full screen the store is untouched ("a full-screen
  calculator stays as it is").
- Stale keys and reporting: a payload whose `questionKey` differs from the scope's is never
  applied; it resolves `rejected` and the status region reads "This can't be added to the
  calculator." (a transfer never fails silently, AR-55). Only the drain marks a rejection, with
  `markCoreRejection`, when `applyTransfer` returned it, and `TransferControl` calls
  `reportTransferRejection` only for a result `isCoreRejection` accepts. TR-73's reporter therefore
  sees core-check failures only; a stale key, a thrown `applyTransfer` (already sent to
  `reportCalculatorError`) and the bridge-only statuses are never reported.
- Held payloads: after a mount failure they stay pending until Retry succeeds. After a load failure
  they resolve `{ status: "unavailable", message: TRANSFER_MESSAGES.unavailableReload, focusRowId: null }`
  and the failure is announced once (TR-69 as OI-28 (11) rewrote it). When the scope unmounts (a
  question change or leaving the quiz) they resolve the neutral
  `{ status: "unavailable", message: "", focusRowId: null }`: nothing failed, so nothing is
  announced, shown or reported, and the payload is discarded as TR-69 and TR-70 require.
- TR-43 and TR-46 say "verified by visual test", and they are: task 8's pixel baselines in
  `tests/calculator/v2/transfer-visual.spec.ts` (`toHaveScreenshot`, recorded and reviewed in
  `transfer-visual.spec.ts-snapshots/`) check the revealed control at fine reveal on
  calculator-chrome (1280×800, inline `y>2x+1` and display `BLOCK_SYSTEM` hovered) and at coarse
  reveal on calculator-ios (inline `y>2x+1` tap-selected), in ivory and observatory; task 9 adds
  the choice A cluster at coarse reveal. Eight baselines in all; the spec skips the other three
  projects. Task 8's geometry tests in `transfer.spec.ts` (glyph composition and size, hit areas,
  the 4 px overlap, corner placement, unchanged text boxes) stay as the browser layer beside them.
- On v2 the choice text keeps clear of the wider cluster: practice and catalog choice padding `pr-14`
  becomes `pr-24`, and the diagnostic's `pr-28` becomes `pr-40`. v1 classes are unchanged.
- Light-DOM colours: button `--kcc-chrome` background, `--kcc-text` glyph, 1 px `--kcc-boundary`
  border, `--kcc-focus` focus ring and selected outline, tooltip `--kcc-text` on `--kcc-chrome`
  with a `--kcc-boundary` border. If task 14 finds a skin where the border is below 3:1 against the
  page, the border switches to `--kcc-text-secondary` for every skin in the same commit, with the
  TH-2 browser mapping, and that commit re-records and reviews the eight `transfer-visual.spec.ts`
  baselines with the review checks of task 8 step 8 and task 9 step 7. If the focus role fails,
  stop and report to the lead (03 owns the focus-ring values).
- Stylesheets: Next compiles CSS Modules in pure mode (`mode: 'pure'` in
  `next/dist/build/webpack/config/blocks/css/loaders/modules.js`; Turbopack reports "is not pure.
  Pure selectors must contain at least one local class or id."), so every selector in
  `TransferControl.module.css` contains a local class (`.anchor`, `.button`, `.glyph`,
  `.tooltip`). Rules keyed only on attributes of other components' elements (the item's
  `[data-transfer-selected="true"]` outline, the `[data-calculator="v2"]` cluster's
  `transition: none` and its coarse-pointer `opacity: 1`) live in the plain global sheet
  `src/components/calculator/transfer-control.css`, imported by `TransferControl.tsx` and counted
  in AR-33's eager budget with the module sheet. Task 4's TH-2 test checks both sheets and the
  local-class rule, and tasks 8 and 9 run `npm run cf:build`, because the Vite fixture accepts
  selectors Next rejects.
- Pen activation (AR-10): a pen `pointerdown` while a pen hover reveal is active is a
  hovering-pen click and passes `"mouse"`; any other pen contact is a tap and passes `"touch"`. A
  pen hover reveal is active when the last accepted hover `pointerenter` on the item, the anchor or
  (for a cluster) the choice container came from a pen with `buttons === 0` and that pointer has
  not left them.
- Pointer record (AR-10, TR-51, TR-59): `TransferControl` remembers the last `pointerdown` on its
  button in `lastPointerDown` until a click consumes it. A contact that never becomes a click must
  not leave it behind, or a later keyboard Enter reports `"touch"` or `"mouse"` (and a stale
  `"touch"` makes `apply.ts` activate the row instead of focusing it) and keyboard focus shows no
  tooltip. So the record also clears on the button's `keydown` (any key, as 11's
  `CalculatorTrigger` does), `pointercancel`, `blur`, and `pointerleave` while a button is pressed
  (`buttons !== 0`, a press dragged off). A `pointerleave` with `buttons === 0` never clears it:
  after a touch `pointerup` the browser fires `pointerleave` before `click`, so clearing there
  would report every tap as `"keyboard"`.
- Tap movement (TR-55, TR-58): a contact's movement is the largest distance from its `pointerdown`
  point seen on any `pointermove` or at `pointerup`, so a drag that returns to its start is not a
  tap; `pointercancel` (for example when the browser starts scrolling) ends the contact with no tap.
- Focus after a transfer-opened window (TR-66, AR-55): the transferred row's own focus wins; when
  every drained result of that open was rejected, the hook calls `focusOnOpen(trigger)`; when the
  window opened on a failure panel, the panel's "Reload page" or "Retry" button gets focus. Focus
  never stays on a Transfer control inside the inert full-screen workspace.
- AR-11's second browser profile: AR-11 names the diagnostic at 1024×768 with touch emulation and
  a profile where `(any-pointer: coarse)` and `(hover: hover)` both match. Task 9 runs the first in
  Chromium (`hasTouch`). This plan found no portable Playwright setting that makes `(hover: hover)`
  match together with a coarse pointer, so task 9 checks the loaded stylesheets instead: the coarse
  rule's media condition names no `hover` or `pointer` feature, so it applies whatever `hover`
  reports. This substitutes a stylesheet check for a required browser profile; note 3 asks the
  lead to record it as an owner-accepted open item, and until then it is not settled.
- TH-2 scope: the injected-sheet scan reads `CALCULATOR_V2_CSS` section by section (10 joins the
  sources as `/* <path> */` plus the CSS) and exempts exactly `vendor/mathquill/mathquill.css`, the
  upstream file AR-5 keeps unmodified except for its listed patches. Task 4 lists that section's
  literal colours, and if there are any it reports the list to the lead as a TH-2 finding for 05;
  this package never edits `vendor/`. A non-vendored section that holds a literal colour (CSS from
  05, 08, 09 or 10) is a TH-2 finding for the package that owns that file: task 4 stops and
  reports the path and the literals, and never loosens the assertion or exempts the path. The
  "`palettes.ts` and the site tokens are never modified" clause runs `git diff --quiet 08c8c76` on
  `src/lib/themes/palettes.ts` and `src/app/globals.css`; CI checks out one commit, so that test
  is skipped there (`it.skipIf`), and the package gate runs the same command.
- Theme switching in browser tests: the site's dark skins need the `dark` class as well as
  `data-theme` (`tailwind.config.ts` has `darkMode: "class"`, and `applyTheme` in
  `src/lib/themes/palettes.ts:295-299` toggles both). Every browser test that switches skins does
  what `applyTheme` does, through task 14's `applySkin(page, skin)`, which reads the flag from
  `SKIN_COLORS[skin].normal.dark`; setting `data-theme` alone leaves the page around the control
  (for example a diagnostic choice's `dark:bg-surface-raised`) in a state no student sees.
- Mutation checks: a browser test of behaviour that an earlier task built passes on its first run.
  Each such test has a stated mutation: after the task's commit, a temporary edit that breaks the
  behaviour, the exact command, the assertion that must fail, then `git checkout -- <file>` and a
  passing rerun. Mutations are never committed.

## Notes for the lead

This package edits only its own plan files; these changes belong to other files.

1. **`use-transfer-bridge.ts` (00-index section 2 and 5.2).** Add
   `src/components/calculator/use-transfer-bridge.ts` (no test file of its own; its tests are in
   `CalculatorScope.transfer.test.tsx`) to the 14 Owns line. In section 5.2 the
   `CalculatorScope.tsx` row's Edit text becomes: "Calls 14's `useTransferBridge` (`transfer()` on
   the v2 bridge with the AR-17 queue, AR-21 docking, TR-69 hold and TR-70 key check), forwards the
   loader's handle to it, skips the open-time `focusOnOpen` for a transfer-opened window (TR-66,
   TR-68) and renders the TR-67 status region".
2. **TR-43 and TR-46 verification layer. Resolved; nothing to apply here.** The earlier choice
   between 15's baselines and an open item is settled inside 14: tasks 8 and 9 record the
   baselines in `transfer-visual.spec.ts` (decision "TR-43 and TR-46"). 15, section 5.3 and
   section 6.2 are unchanged. The only lead edit this needs is note 5's ownership line.
3. **AR-11 browser profile.** Numbered OI-36 in 00-index section 6.2. AR-11 requires a profile where `(any-pointer: coarse)` and
   `(hover: hover)` both match; task 9 replaces it with a stylesheet check (decision "AR-11's
   second browser profile"). Record an owner-accepted open item with this text: "AR-11's
   both-match profile is verified by a stylesheet check: the loaded coarse-pointer rule's media
   condition names no hover or pointer feature, so it applies whatever hover reports." If the
   owner rejects it, the profile needs a harness this package does not have (a real touch laptop
   or a device with a hovering pointer and a touch screen).
4. **15's TR-74 eager list.** `use-transfer-bridge.ts` is eager quiz code (imported by
   `CalculatorScope.tsx`) and imports from `@/components/calculator-v2/` only with `import type`.
   15-release-gates' "TR-74 the eager transfer modules import no calculator-v2, …" test lists
   `TransferControl.tsx`, `transfer-selection.ts` and `transfer-report.ts`; add
   `use-transfer-bridge.ts` to that list so the rule covers it.
5. **`transfer-visual.spec.ts` (00-index section 2; add to section 5.4 so it is not missed).** In
   section 2's 14 **Owns** line, after `transfer-failures.spec.ts` add
   `` , `transfer-visual.spec.ts` and `transfer-visual.spec.ts-snapshots/` ``. Tasks 8 and 9
   create the spec and its eight baselines (`14-transfer-ui-3-reveal-touch.md`). With that line,
   the ownership check shows that no other package touches either path (15's `visual.spec.ts`
   and its snapshot folder are separate files).

## Package gate

- [ ] `npx vitest run src/components/calculator src/components/learn src/components/diagnostic` —
      PASS, including the existing `ActiveQuizScreen`, `CatalogQuestion`, `TableChoiceOption`,
      `DailyChallenge`, `DiagnosticClient` and `MathText` tests unmodified.
- [ ] `npm run test:calculator -- tests/calculator/v2/transfer` (all five transfer specs, all five
      projects; `transfer-visual.spec.ts` runs in calculator-chrome and calculator-ios and skips
      the rest) — PASS.
- [ ] `npm run test:calculator -- tests/calculator/v2/quiz-` (all of 11's specs: `quiz-window`,
      `quiz-reset`, `quiz-loading`, `quiz-dock` and `quiz-chrome-theme`, all five projects) —
      PASS, so 11's docking, loading and failure panels, chrome theme and reset hold with the
      extended scope.
- [ ] AR-8: `npm run test:calculator -- tests/calculator/catalog.spec.ts tests/calculator/integration.spec.ts tests/calculator/layout.spec.ts tests/calculator/lifecycle.spec.ts tests/calculator/standalone.spec.ts tests/calculator/workspace.spec.ts`
      — PASS, unmodified.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `node scripts/check-file-sizes.mjs`
      — PASS.
- [ ] TH-2: `git diff --quiet 08c8c76 -- src/lib/themes/palettes.ts src/app/globals.css` — exit 0.
- [ ] `wc -l` prints under 700 for each of: in `src/components/calculator/`: `TransferControl.tsx`,
      `TransferControl.module.css`, `transfer-control.css`, `transfer-selection.ts`,
      `transfer-report.ts`, `use-transfer-bridge.ts`, `transfer-selection.test.ts`,
      `transfer-report.test.ts`, `TransferControl.test.tsx`, `CalculatorScope.transfer.test.tsx`,
      `transfer-call-sites.test.tsx`; `tests/calculator/fixture/v2/transfer-questions.ts`; in
      `tests/calculator/v2/`: `transfer-helpers.ts`, `transfer.spec.ts`, `transfer-touch.spec.ts`,
      `transfer-docking.spec.ts`, `transfer-failures.spec.ts`, `transfer-visual.spec.ts`.
      `wc -l src/components/calculator/CalculatorScope.tsx` prints under 500; if it does not, move
      more of the transfer logic into `use-transfer-bridge.ts` (decision "Bridge hook"), never
      letting either file reach 700.
- [ ] TR-43, TR-46: `ls tests/calculator/v2/transfer-visual.spec.ts-snapshots/` lists exactly the
      eight baselines `tr-43-46-{inline,block}-fine-{ivory,observatory}-calculator-chrome-darwin.png`,
      `tr-43-46-inline-coarse-{ivory,observatory}-calculator-ios-darwin.png` and
      `tr-43-46-choice-a-coarse-{ivory,observatory}-calculator-ios-darwin.png`, and
      `git status --short tests/calculator/v2/transfer-visual.spec.ts-snapshots` prints nothing
      (all eight committed).
- [ ] With the gate environment of `00-index.md` section 1:
      `npm run cf:build && node scripts/build/check-calculator-v2-bundle.mjs --update-baseline && git checkout -- docs/calculator-v2-bundle-baseline.json`
      — exit 0. The build passes Next's CSS Modules pure check, and `--update-baseline` applies
      every rule of 11's `checkBundle` except the 10% growth rule (the 1A baseline predates the
      Transfer control, so a plain check would fail on growth), including the AR-33 10240-byte
      eager budget with the Transfer control, its two stylesheets, `use-transfer-bridge.ts` and
      12's classifier included; it exits 1 listing problems when any rule fails. The
      `git checkout` restores the committed baseline, because this package does not own
      `docs/calculator-v2-bundle-baseline.json`; 15 Task 6 commits the updated baseline. If the
      eager budget fails, shrink `TransferControl.tsx`, the hook or the CSS; never raise the
      budget.
- [ ] `npx tsx scripts/calculator-v2/check-spec-ids.mjs --packages 14` — prints
      `check-spec-ids: all 42 IDs covered`, exit 0.
