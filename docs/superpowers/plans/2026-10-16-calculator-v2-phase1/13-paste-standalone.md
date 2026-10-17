# 13 paste-standalone: clipboard paste, LaTeX copy and paste, title-bar controls, help popover, standalone

> Package 13 of `00-index.md` (key `paste-standalone`, increment 1B, wave 7; depends on
> 05 editor-foundation, 07 engine-worker, 10 shell, 11 seam and 12 transfer-core, all merged before
> this package starts). For agentic workers: REQUIRED SUB-SKILL: use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement
> this plan task by task. Steps use checkbox (`- [ ]`) syntax.

This file holds the package header; its 15 tasks are in five part files, each under 700 lines
(see "Plan files" at the end).

**Goal:** Students paste math into v2 (rows, the title-bar Paste button and the "Math to paste"
fallback), copy and cut LaTeX between rows, open a "Keyboard shortcuts and help" popover from the
title bar, and the repository builds a standalone v2 page into `tmp/calculator-v2-standalone/`
that the calculator fixture serves at `/karman-calculator-v2/` and every calculator Playwright run
rebuilds first.

**Architecture:** `src/lib/calculator-transfer/clipboard.ts` (lazy-only, AR-1) turns a
`DataTransfer`, plain text plus HTML, or the async clipboard into `ClipboardContent`; rendered
question math goes through 12's `normalizeQuestionMath` (OI-6). Everything that needs v2 modules
lives in `src/components/calculator-v2/chrome/`: the T-12 converter `toPasteLatex` (it needs the
PR-12 allowlist, which AR-1 keeps out of `clipboard.ts`), the pure `planPaste`, a field registry
that wraps 09's `MathFieldFactoryContext`, the shadow-root clipboard listeners, and
`CalculatorChrome`, which `App` wraps around `CalculatorLayout` (extension edit). `CalculatorChrome`
portals `TitleBarControls` into the light-DOM chrome slot and renders `ShortcutsPopover` and
`MathToPaste` inside the shadow root, in a positioned wrapper around the layout. The standalone
page is `standalone/main.tsx`, bundled by esbuild through an extension of 10's
`scripts/build/calculator-v2.mjs`, with `worker/create.standalone.ts` swapped in for `create.ts`;
the fixture serves it through `tests/calculator/fixture/serve-standalone.mjs`.

**Before starting:** read `00-index.md` sections 1, 4 and 5 and `01-interfaces-integration.md`
sections 12, 13.2, 15 and 16; names below are quoted from there and never renamed. Run every
command from the worktree root under Node 22 (`n exec 22 <command>`); builds export the gate
environment of `00-index.md` section 1. Unit: `npx vitest run <file> -t "<ID>"`. Browser:
`npm run test:calculator -- --project=calculator-chrome <spec> -g "<ID>"`, adding projects where a
step names them. If a test fails inside a file another package owns, stop and report the
assertion and the owning package to the lead; never edit that file except through the extension
edits of `00-index.md` section 5.2. Every task ends in one commit. Test sources in this plan are
written as shown (Prettier reformats them); imports are listed only where they are not obvious,
and every snippet must keep `@typescript-eslint/no-unused-vars` clean.

| Task                                         | Part file                             | IDs its test titles start with    |
| -------------------------------------------- | ------------------------------------- | --------------------------------- |
| 1 Clipboard extractor                        | `13-paste-standalone-1-clipboard.md`  | AR-14                             |
| 2 Calculator notation to LaTeX               | `13-paste-standalone-1-clipboard.md`  | T-12                              |
| 3 Question math, paste corpus, runner (OI-6) | `13-paste-standalone-2-paste-plan.md` | T-12 (corpus rules)               |
| 4 Paste plan                                 | `13-paste-standalone-2-paste-plan.md` | AR-14                             |
| 5 Field registry and clipboard listeners     | `13-paste-standalone-2-paste-plan.md` | AR-14, T-5                        |
| 6 Help content, popover, title-bar controls  | `13-paste-standalone-3-chrome.md`     | KB-1, L-12; A11Y-7 contribution   |
| 7 Math to paste box                          | `13-paste-standalone-3-chrome.md`     | L-13                              |
| 8 CalculatorChrome and the App edit          | `13-paste-standalone-3-chrome.md`     | T-5, L-13, KB-1, CB-1             |
| 9 Paste in the browser (OI-37)               | `13-paste-standalone-4-browser.md`    | L-13, AR-14, T-12                 |
| 10 Refusal announcements (OI-26)             | `13-paste-standalone-4-browser.md`    | contributions A11Y-2, T-13, NM-42 |
| 11 Shortcuts and title-bar colours           | `13-paste-standalone-4-browser.md`    | KB-1, L-12                        |
| 12 Standalone build                          | `13-paste-standalone-5-standalone.md` | AR-62, API-15                     |
| 13 Fixture serving and the Playwright server | `13-paste-standalone-5-standalone.md` | AR-63                             |
| 14 Standalone page in the browser            | `13-paste-standalone-5-standalone.md` | AR-62, API-15; AR-57 contribution |
| 15 Package gate                              | `13-paste-standalone-5-standalone.md` | all ten IDs                       |

**IDs (10):** CB-1; AR-14, AR-62, AR-63; API-15; L-12, L-13; T-5, T-12; KB-1. Contributions
(index 5.3): T-13 and A11Y-2 (`paste.spec.ts`), A11Y-7 (`chrome/TitleBarControls.test.tsx`), AR-57
(`standalone.spec.ts`). **Open items:** OI-6 (task 3), OI-26 (task 10), OI-37 (task 9).

**Consumes** (merged packages; exact names from `01-interfaces*.md`; each task's Interfaces block
repeats the signatures it uses):

- 02: `MAX_ROWS`, `MAX_ROW_CHARACTERS`, `parseLatex`, `toSExpr` (`core/latex`); `OPERATOR_NAMES`,
  `AUTO_COMMANDS`, `SHIPPED_PHASE` (`core/latex/operator-names.ts`); `CorpusCase`, `CORPUS`,
  `runnerFor` (`core/corpus`).
- 03: `SKIN_IDS` (`theme/skins.ts`); `src/components/calculator/calculator-chrome.generated.css`
  (the `--kcc-*` chrome tokens keyed by `html[data-theme]`).
- 04: `analyzeRows` (`core/analysis`).
- 05: `MathField`, `MathFieldOptions`, `createMathField` (`math-field/MathField.ts`);
  `Announcer`, `useAnnouncer` (`ui/a11y/announcer.ts`).
- 07: `CalculatorEngine`, `ExpressionState`, `KarmanCalculatorError`, `WORKER_MARKER`,
  `useEngine`, `installDomStubs`; `globalThis.__calculatorHarness`.
- 09: `FocusController`, `FocusContext`, `EscapeContext`, `createEscapeStack`, `MathFieldFactory`,
  `MathFieldFactoryContext` (`ui/list/math-field-factory.ts`), `EDITOR_MESSAGES`
  (`ui/list/messages.ts`: `rowLimit` "The calculator holds at most 100 expressions.", `charLimit`
  "Each expression can be up to 2,048 characters."), `rowDomIds` (`ui/list/row-model.ts`).
- 10: `KarmanCalculator`, `HostHooks.chromeSlot`, `AppProps.chromeSlot`, `whenFieldReady`
  (`ui/controller/when-field-ready.ts`), `CALCULATOR_V2_BUILD`, `generateCalculatorStyles`.
- 11: `CalculatorWindow`, `CalculatorWindowProps`, `WindowMode`, `calculatorWindowStore`, the
  window DOM contract, `server.mjs`.
- 12: `normalizeQuestionMath(latex: string, context: "math" | "cell" | "coordinate"): string`
  (`src/lib/calculator-transfer/normalize.ts`).
- Site code (unchanged, TH-2): `SITE_THEMES: readonly SiteTheme[]`,
  `findTheme(id: unknown): SiteTheme | undefined`, `applyTheme(theme: SiteTheme): void`,
  `themeStyleSheet(): string` (`src/lib/themes/palettes.ts`).

**Package-internal names** (used only inside this package, in addition to section 15):

```ts
// src/lib/calculator-transfer/clipboard.ts
export const MAX_TABLE_COLUMNS = 10; // AR-14's 1 to 10 columns
export function delimitedRows(text: string, separator: "," | "\t"): string[][] | null; // v1 tokenizer; null on an unclosed quote
export interface KatexCopy {
  mathml: string; // textContent of one .katex element's .katex-mathml
  html: string; // textContent of the same element's .katex-html
}
export function dedupeKatexPlainText(plain: string, copies: readonly KatexCopy[]): string; // decision 2
// src/components/calculator-v2/chrome/paste-latex.ts
export const AUTO_COMMAND_LATEX: Readonly<Record<string, string>>; // keyed by every AUTO_COMMANDS entry
export function toPasteLatex(line: string): string; // T-12 rules
// src/components/calculator-v2/chrome/paste-plan.ts
export type PastePlan =
  | { type: "none" }
  | { type: "announce"; message: string }
  | { type: "write"; latex: string }
  | { type: "rows"; expressions: ExpressionState[]; focusRowId: string };
export function nextRowIds(rows: readonly { id: string }[], count: number): string[];
export function planPaste(
  content: ClipboardContent,
  target: { field: boolean },
  rows: readonly ExpressionState[]
): PastePlan;
export interface PasteEffects {
  engine: Pick<CalculatorEngine, "setExpressions" | "updateSettings" | "endEditGroup" | "settings">;
  field: Pick<MathField, "write"> | null;
  announce(text: string): void;
  reveal(rowId: string): void; // focus (fine pointer) or activate (coarse) the row once its field exists
}
export function applyPastePlan(plan: PastePlan, effects: PasteEffects): void;
// src/components/calculator-v2/chrome/field-registry.ts
export function trackFields(base: MathFieldFactory): MathFieldFactory;
export function fieldFor(target: EventTarget | null): MathField | null;
// src/components/calculator-v2/chrome/clipboard-bridge.ts
export interface ClipboardBridgeDeps {
  apply(content: ClipboardContent, field: MathField | null): void;
}
export function installClipboardBridge(root: ShadowRoot, deps: ClipboardBridgeDeps): () => void;
// src/components/calculator-v2/chrome/help-content.ts
export const TITLE_BAR_LABELS: {
  paste: "Paste into calculator";
  shortcuts: "Keyboard shortcuts and help";
};
export interface ShortcutRow {
  keys: string;
  where: string;
  action: string;
  phase: 1 | 2 | 4;
}
export const SHORTCUT_ROWS: readonly ShortcutRow[]; // appendix E section 6 table, table order
export function shippedShortcutRows(phase?: number): ShortcutRow[]; // phase <= (phase ?? SHIPPED_PHASE)
export const HELP_EXAMPLES: readonly { row: string; meaning: string }[];
export const HELP_PASTE: string;
export const HELP_LIMITS: readonly string[]; // a-math-semantics.md section 5.6
export const MATH_TO_PASTE: { label: "Math to paste"; insert: "Insert"; cancel: "Cancel" };
// src/components/calculator-v2/chrome/chrome-styles.ts
export const CHROME_STYLES: Readonly<
  Record<
    "frame" | "layers" | "layer" | "table" | "cell" | "heading" | "actions",
    React.CSSProperties
  >
>;
// src/components/calculator-v2/chrome/MathToPaste.tsx
export interface MathToPasteProps {
  open: boolean;
  onInsert(text: string): void;
  onCancel(): void;
}
export function MathToPaste(props: MathToPasteProps): JSX.Element | null;
// src/components/calculator-v2/chrome/CalculatorChrome.tsx
export interface CalculatorChromeProps {
  host: HTMLElement;
  chromeSlot: HTMLElement | null;
  pointer: "fine" | "coarse";
  children: React.ReactNode; // CalculatorLayout
}
export function CalculatorChrome(props: CalculatorChromeProps): JSX.Element;
// scripts/build/calculator-v2.mjs (extension edit; JSDoc-typed, declarations shown as TypeScript)
export const STANDALONE_OUT_DIR = "tmp/calculator-v2-standalone";
export interface StandaloneBuild {
  outDir: string;
  files: string[]; // every written file relative to outDir, sorted
  hashes: { js: string; css: string; worker: string }; // first 16 hex characters of each file's sha256
}
export function buildStandalone(options?: { outDir?: string }): Promise<StandaloneBuild>;
export function bundledPackages(metafile: { inputs: Record<string, unknown> }): string[]; // sorted, unique
export function calculatorPackages(): Promise<string[]>; // standalone bundle ∪ lazy quiz chunk
// tests/calculator/fixture/serve-standalone.mjs (JSDoc-typed, declarations shown as TypeScript)
export const STANDALONE_CONTENT_TYPES: Readonly<Record<string, string>>; // extension -> Content-Type
export function createStandaloneHandler(
  dir: string
): (
  req: import("node:http").IncomingMessage & { originalUrl?: string },
  res: import("node:http").ServerResponse
) => void;
```

**DOM contract** (read by this package's specs and by 15):

- `TitleBarControls` renders exactly two `<button type="button">` elements as direct children of the
  chrome slot, with no `class` and no `style` (11's `.titleSlot > button` and the standalone
  sheet style them): `data-kc-title-button="paste"`, `aria-label`/`title` "Paste into calculator",
  lucide `ClipboardPaste`; then `data-kc-title-button="shortcuts"`, `aria-label`/`title` "Keyboard
  shortcuts and help", `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls={hostId}` (the
  attribute is omitted when `hostId` is `""`, so an unnamed host never yields an empty
  reference), lucide `Keyboard`. Icons carry `aria-hidden="true"`.
- `ShortcutsPopover` is a `div` with `role="dialog"`, `aria-label="Keyboard shortcuts and help"`,
  `tabindex="-1"` and `data-kc-shortcuts`, holding `h2`, a `table` (`thead` with Keys, Where,
  Action; one `tbody` row of three `td` per shipped shortcut), the Examples, Pasting and Limits
  sections and a "Close" button.
- `MathToPaste` is `div[role="group"][data-kc-paste-box]` holding
  `<label>Math to paste<textarea/></label>` (implicit label, so the name works inside the shadow
  root), then the "Insert" and "Cancel" buttons.
- `CalculatorChrome` renders `div[data-kc-chrome]` (style `CHROME_STYLES.frame`, the containing
  block of the layers) holding the layout, then one `div[data-kc-chrome-layers]` (style
  `CHROME_STYLES.layers`) that holds both layers, all inside the shadow root.
- The standalone `index.html` head holds `<link rel="icon" href="data:,">` (no `/favicon.ico`
  request); its body: `header.kc-page-header` holding `span.kc-page-title` "Karman
  calculator", `div#kc-title-slot[data-calculator-title-slot]`, a `label` "Theme" wrapping
  `select#kc-theme`, and `<a href="/calculator-notices.txt">Open-source notices</a>`; then
  `main#kc-calculator.kc-page-calculator`.

**Decisions this package makes:**

1. A single math line pasted into a focused MathField is written at the caret with `write`,
   between two `endEditGroup()` calls so it is its own undo step. Everything else that inserts
   math (the Paste button, Math to paste, multi-line text, two or more coordinate pairs, a paste
   while focus is outside a MathField) appends rows with one `setExpressions` call (one undo step,
   API-2): the first row fills an empty last row (the OI-22 rule Transfer uses), a collapsed list
   expands first (TR-32), and the last inserted row gets DOM focus on a fine pointer or becomes
   the active row on a coarse one (TR-66's rule). New ids continue after the largest decimal id,
   which 07's id counter never reuses.
2. Rendered question math (OI-6) is recognised only from `text/html`: each
   `annotation[encoding="application/x-tex"]` gives one line, run through
   `normalizeQuestionMath(tex, "math")`. KaTeX HTML without an annotation falls back to the plain
   text with KaTeX's repeated MathML text removed (T-12): `dedupeKatexPlainText` strips
   whitespace and U+200B from the plain text, then, for each `.katex` element in document order,
   removes the first occurrence of that element's MathML text after a cursor and moves the cursor
   past the element's HTML text, keeping the HTML text (KaTeX's MathML and HTML texts differ for
   fractions, roots and accents, so halving would keep both). When there is no copy, or a MathML
   text is not found, it falls back to halving: a string made of two identical halves keeps one
   half, anything else is the trimmed plain text. Plain-only clipboards are paste input (PR-6
   product meaning), so `11` stays `11`.
3. The T-12 converter needs the PR-12 allowlist, and AR-1 forbids `clipboard.ts` from importing
   `src/lib/calculator-v2/`, so `clipboard.ts` returns raw plain lines and `toPasteLatex` (in
   `chrome/`) converts every line before it is written. On lines that already contain a backslash
   (LaTeX, including normalised question math) it maps only the Unicode characters, with `√`
   taking a following parenthesised group, number or letter as its braced radicand (table 4.1's
   `√(…)` rule), so `\frac{1}{2}+√(x)` gives `\frac{1}{2}+\sqrt{x}`.
4. Phase 1 "invalid paste payloads" (OI-26) are pasted texts the extractor refuses as non-math
   (saved-graph state, links, markup, code fences, `\includegraphics`-style commands), announced
   with `PASTE_MESSAGES.refused` and mapped to `{ kind: "refused", reason: "file" }`. AR-16's
   Zod-checked paste table payload starts with AR-15 in Phase 3.
5. A `table` result carries every header and column of one table; two or more HTML tables, or a
   table wider than `MAX_TABLE_COLUMNS`, give `{ kind: "table", headers: [], columns: [] }`. In
   Phase 1 every `table` result inserts nothing and announces `PASTE_MESSAGES.table`.
6. One coordinate pair is a math line (written at the caret like any line); two or more pairs are
   `pairs`, written as `\left(x,y\right)` rows. CSV is recognised only when every parsed row has the
   same width of at least 2 and no cell has unbalanced brackets, so `f(x,y)=x` on two lines stays
   math; v1's single-line `2,3` table rule is not copied (AR-14 lists only the tokenizer, the
   header rule, HTML reading and the refusals).
7. Limits use 09's copy: more than `MAX_ROWS` rows announces `EDITOR_MESSAGES.rowLimit`; a line
   longer than `MAX_ROW_CHARACTERS` announces `EDITOR_MESSAGES.charLimit` (a single line written at
   the caret is refused by the MathField itself, which 09 announces with the same text). Browser
   tests import `EDITOR_MESSAGES` rather than repeating its text.
8. Copy and cut act only when the field has a selection; cut deletes it with
   `keystroke("Backspace")` (05 prevents MathQuill's own copy, cut and paste, so a copy with no
   selection writes nothing to the clipboard).
9. The popover lists the shortcuts that work in Phase 1 (`shippedShortcutRows()`, the ten rows of
   phase 1); Alt/Option+Shift+C joins in Phase 2 and Alt/Option+T in Phase 4. The "how to add a
   table and a regression" usage text joins in Phase 3 with tables (overview section 7.3,
   shipped-part rule). Every row copies appendix E section 6 word for word except three: the
   Enter row reads "new row below" (its Scientific clause joins with SC-); the Escape row spells
   out KB-3's order in place of the table's "(KB-3)" reference ("close the top layer: an open
   menu or popover, the Functions panel, the ABC page, the keypad, then the calculator"); and the
   Alt/Option+T row drops "(Phase 4)", which its `phase` field carries. Task 6's test pins all
   twelve rows, the examples, the Pasting text and the limits as literals.
10. Shadow-root layers are styled with `CHROME_STYLES` inline style objects that use only
    `var(--kc-*)` tokens, because 10's style pipeline reads only `styles/*.css`, which this package
    does not own; focus rings come from 10's global `:focus-visible` rule in `base.css`.
    `CHROME_STYLES.frame` (`position: relative`, full inline and block size, so `.kc-app`'s 100 %
    sizes resolve as before) is the layers' containing block; `CHROME_STYLES.layers` covers it
    with `pointer-events: none` and each layer turns `pointer-events` back on. In the quiz window
    the popover and the Math to paste box therefore stay inside the shadow host, below the
    light-DOM title bar, and never cover Minimize or Close.
11. esbuild is pinned to `0.25.4`, the version already hoisted to `node_modules/esbuild` (from
    `@opennextjs/aws`), so pinning moves nothing in the lockfile tree.
12. T-12's "the same LaTeX that typing it would produce" is read as typing the notation's
    meaning: pasted plain text is paste input (PR-6) and keeps its raw PR-18 meaning where typing
    the same characters would build something else. Each such form is named here; tasks 2 and 3
    check its tree and task 9 compares its LaTeX with real typing:
    - After `sqrt` or `cbrt` (and inside `nthroot( … , … )`), a parenthesised group is the
      radicand's delimiter and its parentheses are dropped: `sqrt(x)` gives `\sqrt{x}` (the root,
      the radicand, then leaving the root, the key sequence task 9 types), not the
      `\sqrt{\left(x\right)}` that typing the seven characters gives.
    - Plain `/`: an integer literal, `/`, integer literal gives `\frac{a}{b}` (TR-7's plain-text
      rule) and the next factor stays outside, so `3/4x` gives `\frac{3}{4}x`, (3/4)·x as PR-18
      reads raw `3/4x`, where typing builds `\frac{3}{4x}`. Any other `/` stays a slash: `x/2`
      gives `x/2`, which PR-18 reads as x/2, the tree of the `\frac{x}{2}` that typing builds.
    - An exponent ends after its number, letter or constant: `x^2y` gives `x^{2}y` (x²·y), where
      typing keeps the caret in the exponent and builds `x^{2y}`.
    - Operator names stay letters: `sinx` gives `sinx`, which MathQuill's `autoOperatorNames`
      turns into the `\sin x` that typing gives once it is written.

    Whitespace in plain text is a separator (task 2 Step 3 and its test): no subscript or
    integer-fraction rule and no letter run reaches across it, and where the two sides would join
    if written together it is written as `\cdot` (`2 3` gives `2\cdot3`, not 23; `x 2` gives
    `x\cdot2`, not x₂). For the `pastedQuestionMath` corpus cases (task 3), `latex` is this
    `toPasteLatex` output, the string written to MathQuill, not the field's `latex()` after the
    write (paste-10 holds `sinx`; the row then holds `\sin x`).

13. An empty clipboard (no text flavour, or only blank text) opens Math to paste exactly like a
    failed or denied read: the student pressed Paste, and the box is the one place to type math to
    paste. Nothing is announced and nothing is inserted until Insert.
14. `readSystemClipboard` reads a text flavour only when the clipboard item lists it in `types`
    (`ClipboardItem.getType` rejects with `NotFoundError` for an absent type); only a missing API
    or a rejection of `read()` or `readText()` itself gives `unavailable`. Test stubs reject
    `getType` for unlisted types, as browsers do.
15. The standalone request handler lives in `tests/calculator/fixture/serve-standalone.mjs` so a
    unit test can call it directly; `server.mjs` only mounts it (extension edit).

**Notes for the lead:**

- Section 15's last sentence ("App (extension edit by 13) adds a capture-phase `paste` listener on
  the shadow root (AR-14, T-12) and a `copy` listener …"), the `ui/App.tsx` row of index 5.2 and
  the Decisions line of 13 in index section 2 ("the App `copy` and `paste` listeners added here")
  describe listeners App installs itself. Task 8 instead makes App wrap `CalculatorLayout` in a
  new `CalculatorChrome` component. Please amend all three to: "App wraps `CalculatorLayout` in
  13's `CalculatorChrome`, which installs the shadow-root `paste` (capture phase), `copy`, `cut`,
  `dragover` and `drop` listeners, portals `TitleBarControls` into the chrome slot and renders
  the shortcuts popover and "Math to paste" in the shadow root."
- `01-interfaces.md` section 2, `CorpusCase.latex?` comment ("printLatex output, or MathField
  latex() for keys"): please extend it to "…, or the `toPasteLatex` output written to MathQuill
  for `pastedQuestionMath`" (decision 12).
- Index section 7: please add "13's decision 12 (T-12): pasted plain text keeps its raw PR-18
  meaning where typing the same characters builds something else: `sqrt(x)` pastes as
  `\sqrt{x}` (typing the characters gives `\sqrt{\left(x\right)}`), `3/4x` as `\frac{3}{4}x`
  (typing gives `\frac{3}{4x}`), `x/2` as `x/2` (typing gives `\frac{x}{2}`, the same tree) and
  `x^2y` as `x^{2}y` (typing gives `x^{2y}`)."
- Index section 4, "Phase 1 scope of shipped-part IDs": please append "KB-1's help popover lists
  the Phase 1 shortcuts and omits the table and regression usage until tables ship in Phase 3"
  (decision 9).
- Rows appended by paste go through the public `setExpressions`, so API-8's `change` event reports
  `isUserInitiated: false` for them (07 decision 10). No Phase 1 consumer reads it.
- OI-6's spec text (PR-1 and PR-6) belongs to 12 (index 6.1); task 3 only checks that it is present.

## Plan files

Tasks run in number order; each part starts where the previous one ends.

| File                                  | Tasks    | Concern                                                                                        |
| ------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `13-paste-standalone-1-clipboard.md`  | 1 to 2   | Clipboard extractor and calculator notation to LaTeX                                           |
| `13-paste-standalone-2-paste-plan.md` | 3 to 5   | Question math and the paste corpus (OI-6); paste plan; field registry and clipboard listeners  |
| `13-paste-standalone-3-chrome.md`     | 6 to 8   | Help content, shortcuts popover, title-bar controls, Math to paste, CalculatorChrome, App edit |
| `13-paste-standalone-4-browser.md`    | 9 to 11  | Paste, refusal announcements (OI-26), shortcuts and title-bar colours in the browser           |
| `13-paste-standalone-5-standalone.md` | 12 to 15 | Standalone build and page module, fixture serving, the standalone page in browsers, the gate   |
