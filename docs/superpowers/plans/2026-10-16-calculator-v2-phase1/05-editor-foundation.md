# 05 editor-foundation: vendored MathQuill (ES module), MathField adapter, speech text and the announcer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Package:** `editor-foundation`, increment 1A, wave 1, depends on 02-parser (merged). Header,
Global Constraints and Review Focus: `00-index.md`. Contracts: `01-interfaces-runtime.md` section 9
(editor foundation) and the 02 contracts in `01-interfaces.md` sections 1, 1.1, 2 and 2.2; names
below match them exactly.

**IDs:** PR-2, PR-36; AR-5, AR-42; T-1 to T-4, T-6 to T-11. Contributions listed in index 5.3: T-5
speech text (`math-field/speech.test.ts`); API-15 no `window.MathQuill` (`math-field.spec.ts`). No
other test here is titled with another package's ID: the announcer and token tests are titled by
their 01 section 9 contract (Notes for the lead, item 1). Index 5.3 rows T-9 and T-11 cover the
parts 09 builds (Notes for the lead, item 7; index 5.4 item 5). **Open items:** none.

**Owning tasks** (index section 4: the first task whose failing-test step titles the ID; this line
is the package's by-task list): AR-5 Task 1; T-10 Task 5; AR-42 and T-11 Task 8; PR-36, T-1 to
T-4 and T-6 to T-9 Task 9 (its 56 keys cases carry them in their titles); PR-2 Task 10. Tasks 4, 6
and 7 title their unit and jsdom tests by the contract they pin (`mathQuillOptions …`,
`toMathFieldLatex …`, `createMathField …`, `createAnnouncer …`, `tokens.css …`), so no ID counts
as covered before its behaviour test lands. Task headings name IDs only as context.

**Package rules.**

- Every command runs under Node 22 (`n exec 22 <command>` on this machine, index section 1), from
  the worktree root. Each task ends in one commit.
- Test layers. The spec marks PR-2, PR-36, T-1 to T-4 and T-6 to T-10 "component". Index 2.2 puts
  the keystroke corpus runner and the PR-2 round trip in `tests/calculator/v2/math-field.spec.ts`,
  so typing outcomes are asserted on the real MathQuill with real keyboard events on all five
  calculator projects (Chromium, Firefox, WebKit, iOS and Android emulation; index section 4).
  Node unit tests pin the MathQuill configuration and the pure helpers, and a jsdom test proves
  the real MathField runs in jsdom, which 09's component tests depend on; those tests are titled
  by contract (Owning tasks, above).
- Upstream facts below were read from the pinned MathQuill commit itself (github.com/mathquill,
  not a Desmos site). Nothing here copies Desmos code, assets, icons, fonts or visual design.
- `MathField.ts` is the only module that imports `vendor/mathquill/`, values and types alike, as
  01 section 9 states. `config.ts` declares its own `MathQuillOptions` (a structural subset of
  `MathQuillConfig`), and `MathField.ts` adds the hooks. Files under `src/` import 02's modules
  with `@/lib/calculator-v2/...`; the harness page uses `@/` too (the fixture server and
  Playwright resolve it), and a relative path for `vendor/`.

| File                                                        | Responsibility                                                                |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `vendor/mathquill/mathquill.js`, `mathquill.css`, `LICENSE` | Upstream build output and licence, byte-exact (AR-5)                          |
| `vendor/mathquill/patches/000N-*.patch`, `PATCHES.md`       | Every local change, as `git diff` against the pinned commit                   |
| `vendor/mathquill/README.md`, `mathquill.d.ts`              | Provenance, build command, hashes; types of the members used                  |
| `src/components/calculator-v2/math-field/config.ts`         | MathQuill options and the native history chords                               |
| `src/components/calculator-v2/math-field/load-latex.ts`     | `toMathFieldLatex`: PR-3 spellings MathQuill cannot read                      |
| `src/components/calculator-v2/math-field/MathField.ts`      | The adapter (01 section 9)                                                    |
| `src/components/calculator-v2/math-field/speech.ts`         | `latexToSpeech` from the v2 parser tree (T-5, A11Y-4)                         |
| `src/components/calculator-v2/math-field/digit-groups.ts`   | `groupIntegerDigits` for results (T-10)                                       |
| `src/components/calculator-v2/ui/a11y/announcer.ts`         | Announcer, context, hook and live region (A11Y-2 consumers)                   |
| `src/components/calculator-v2/styles/tokens.css`            | Motion, font and size tokens on `:host` (01 section 9)                        |
| `src/components/calculator-v2/styles/math-field.css`        | Role colours over every vendored MathQuill colour declaration (TH-3, OI-34)   |
| `src/lib/calculator-v2/core/corpus/cases/keys.ts`           | PR-36 keystroke cases (replaces 02's scaffold)                                |
| `public/calculator-notices.txt`                             | MathQuill, KaTeX, KaTeX fonts, react, react-dom, scheduler, lucide-react, zod |
| `eslint.config.mjs`, `.prettierignore`                      | `vendor/**` ignored (AR-5)                                                    |
| `tests/calculator/fixture/v2/env.d.ts`                      | `*.css?inline` module declaration for every harness page                      |
| `tests/calculator/fixture/v2/math-field.html`, `.tsx`       | MathField harness inside an open shadow root                                  |
| `tests/calculator/v2/math-field.spec.ts`                    | Browser tests and the `keys` corpus runner                                    |

## Plan files

This file holds the package's shared header: the rules above, Decisions, Notes for the lead and
the consumed 02 interfaces. Its 11 tasks are in four part files, each under 700 lines. Tasks run
in number order; each part starts where the previous one ends.

| File                                | Tasks   | Concern                                                                                                  |
| ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `05-editor-foundation-1-vendor.md`  | 1 to 3  | `vendor/**` lint ignores; MathQuill vendored with patches 0001 to 0009; notices (AR-5)                   |
| `05-editor-foundation-2-config.md`  | 4 and 5 | MathQuill options and LaTeX loading (contract tests); speech text (T-5 contribution) and digit groups    |
| `05-editor-foundation-3-adapter.md` | 6 and 7 | MathField adapter; announcer, live region and design tokens (contract tests, 01 section 9)               |
| `05-editor-foundation-4-browser.md` | 8 to 11 | Harness and adapter browser tests; keys corpus; round trip; operator names, panel insertion and grouping |

## Decisions

**Upstream at the pin.** `1cbc1c4128` resolves to `1cbc1c4128ec87db3733bc99965522f7d62cde75`
(merge of mathquill PR #1031 "remove-jquery-dependency", 2025-06-02); `package.json` says 0.10.1,
MPL-2.0. `make js` concatenates `src/intro.js`, the TypeScript sources and `src/outro.js` and
transpiles them with `script/tsc-emit-only` (TypeScript `transpileModule`, target ES5, a classic
script); `make css` runs `lessc src/css/main.less`. `window.MathQuill = MathQuill` sits in
`src/publicapi.ts`, not in the outro. `OMIT_FONT_FACE=true` drops the Symbola `@font-face`. The
source contains no `eval`, `new Function`, string timers or CSS `url()` beyond that `@font-face`.
`latex(value)` empties the field when MathQuill's parser rejects the value. Empty blocks print as
`{ }` (`\sqrt{ }`), so tests always type content into blocks.

**Patches** (one `git diff` file each, applied in order; recorded in `PATCHES.md`):

| Patch                                            | Files                                                          | Change                                                                                                                                                                                                                                                       | For                  |
| ------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| `0001-es-module-export.patch`                    | `src/intro.js`, `src/outro.js`, `Makefile`                     | intro `(function() {` becomes `var MathQuillModule = (function() {`; `outro.js` becomes `return MathQuill;` then `}());` (the jQuery v1 shim goes); the `$(BUILD_JS)` recipe gains a last line `printf '\nexport default MathQuillModule;\n' >> $@`          | API-15, 01 section 9 |
| `0002-no-window-global.patch`                    | `src/publicapi.ts`                                             | delete `MathQuill.noConflict = …;`, `var origMathQuill = window.MathQuill;` and `window.MathQuill = MathQuill;`                                                                                                                                              | API-15               |
| `0003-shadow-root-focus.patch`                   | `src/controller.ts`, `src/services/saneKeyboardEvents.util.ts` | `containerHasFocus()` and the paste re-focus check read `activeElement` from `getRootNode()` instead of `document`                                                                                                                                           | AR-42                |
| `0004-aria-label-is-the-name.patch`              | `src/services/textarea.ts`                                     | `updateMathspeak()` no longer writes the editable textarea's `aria-label` (static math unchanged)                                                                                                                                                            | A11Y-3, A11Y-4       |
| `0005-selection-latex.patch`                     | `src/publicapi.ts`                                             | `EditableField` gains `selectionLatex(): string \| null`                                                                                                                                                                                                     | T-5 copy (13)        |
| `0006-strict-bracket-matching.patch`             | `src/commands/math/commands.ts`                                | `matchBrack` drops the interval clause `\|\| { '(': ']', '[': ')' }[this.sides[L].ch] === node.sides[R].ch`                                                                                                                                                  | T-8                  |
| `0007-ellipsis-in-square-brackets.patch`         | `src/commands/math/basicSymbols.ts`                            | `LatexCmds['.']` builds a `Dot`; typing a third `.` after two `.` directly inside `\left[…\right]` replaces them with `\ldots`                                                                                                                               | T-7                  |
| `0008-katex-fonts.patch`                         | `src/css/mixins/fonts.less`, `src/css/math.less`               | `.mq-math-mode` text in `KaTeX_Main`, variables in `KaTeX_Math`, no Symbola in any `font-family`                                                                                                                                                             | AR-39 (10 tests it)  |
| `0009-autocommand-yields-to-operator-name.patch` | `src/commands/math/basicSymbols.ts`                            | in `Letter.createLeftOf`, an auto-command match `str` does not fire when a longer suffix of the same letter run (up to `autoOperatorNames._maxLength` letters) is in `autoOperatorNames`, so typed `midpoint` stays one operator name instead of `midpo\int` | T-3, PR-13           |

**MathQuill options** (`config.ts` returns every row but the last; `MathField.ts` adds the hooks;
every other option keeps its default):

| Option                                                                     | Value                                                          | ID           |
| -------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------ |
| `autoOperatorNames`, `autoCommands`                                        | `mathQuillAutoOperatorNames()`, `mathQuillAutoCommands()` (02) | T-3          |
| `autoSubscriptNumerals`, `disableAutoSubstitutionInSubscripts`             | `true`, `true` (`v_max` stays `v_{max}`)                       | T-4          |
| `charsThatBreakOutOfSupSub`                                                | `"+-=<>~,"` (only from a non-empty block, so `x^{-1}` works)   | T-1, T-6     |
| `typingSlashWritesDivisionSymbol`, `typingSlashCreatesNewFraction`         | `false`, `false`                                               | T-2          |
| `typingAsteriskWritesTimesSymbol`, `typingPercentWritesPercentOf`          | `false`, `false` (`\cdot`, `\%`)                               | T-7          |
| `restrictMismatchedBrackets`                                               | `true` (with patch 0006)                                       | T-8          |
| `autoParenthesizedFunctions`                                               | not set (empty)                                                | T-9          |
| `enableDigitGrouping`                                                      | `true` (CSS margins; LaTeX unchanged)                          | T-10         |
| `disableCopyPaste`                                                         | `true` (13's bridge owns the clipboard; adapter listeners too) | AR-42, AR-14 |
| `substituteTextarea`, `overrideTypedText`, `overrideKeystroke`, `handlers` | adapter hooks, set in `MathField.ts`                           | AR-42, T-11  |

**Adapter contract for consumers (09, 10, 13).**

- `createMathField(host, options)` appends `span.kc-math-field` to `host` and gives it to MathQuill;
  `host` stays the caller's. `field.element` is that span. It holds exactly one `textarea`, the
  row's textbox: `autocapitalize="off"`, `autocomplete="off"`, `autocorrect="off"`,
  `spellcheck="false"`, `inputmode="text"` until `setInputMode`, and `aria-label` set once from
  `options.ariaLabel`. MathQuill never rewrites `aria-label` (patch 0004), so the row may update it
  when rows renumber and owns `aria-describedby` (A11Y-3, A11Y-4, ids inside the shadow root).
- Each field keeps MathQuill's `.mq-aria-alert` span (`aria-live="assertive"`, no `role`) for caret
  and typing echo; patch 0003 makes it speak inside the shadow root. It is not the A11Y-2 region.
- `latex(value)` is silent (no `onEdit`). `write`, `cmd`, `keystroke`, `typedText`, `run` and
  keyboard typing call `onEdit(latex)` once per call that changes the LaTeX. A change whose LaTeX
  would exceed `maxLength` is reverted (content restored, caret at the end) and calls
  `onRefused("char-limit")`; `latex(value)` refuses the same way. A value MathQuill cannot read
  after `toMathFieldLatex` leaves the field empty, as upstream does.
- Copy, cut and paste default actions are prevented on the textarea by the adapter's own
  `copy`, `cut` and `paste` listeners (`preventDefault()` only, no `stopPropagation`), whatever
  `disableCopyPaste` does upstream, and MathQuill never edits the field on them (the LaTeX and the
  selection are unchanged). 13's capture-phase bridge on the shadow root runs before them and uses
  `selectedLatex()` and `write`. Undo and redo chords (`Ctrl-Z`, `Meta-Z`, `Ctrl-Shift-Z`,
  `Meta-Shift-Z`, `Ctrl-Y`) and `beforeinput` `historyUndo`/`historyRedo` are prevented and never
  reach MathQuill; the keydown still bubbles to the calculator's KB-2 handler.
- `onDeleteOutOf` fires on Backspace at the left edge and Delete at the right edge whether or not
  the row is empty; R-9's "empty row" test is the row's. `destroy()` fires no callbacks.
- T-10 in results: the row's value element renders `groupIntegerDigits(formatValue(value))`; the
  grouped string is display only and never goes back into the engine, the API or speech.

**Announcer contract for consumers (09, 10, 13).** `announce(text, { delayMs, key })` writes
`text` exactly `delayMs` after the call when `delayMs` is 50 or more, and 50 ms after the call when
`delayMs` is below 50 or absent. The region is empty for the 50 ms before every write, so equal
text is read again. A `key` covers both timers of its entry: a same-key `announce` or `cancel(key)`
stops the pending clear and the pending write, including a write still due after its clear ran.
Entries without a key stop only on `destroy()`. So 10's reset call
(`{ delayMs: 500, key: "reset" }`) is written at exactly 500 ms (A11Y-2).

**Speech text** (`latexToSpeech`, from `parseLatex(latex, { userFunctions })` where
`userFunctions` holds `functionDefinitionHead(latex)?.name`; `""` for empty or unparseable input,
and `speechText()` then falls back to MathQuill's `mathspeak()`). Precedence for wrapping: `rel` 1,
`add`/`sub` 2, `mul` 3, `neg` 4, `call` 5, `pow`/`pct`/`deg`/`fact` 6, everything else 7. A child
below the stated minimum is spoken as `left parenthesis X right parenthesis`.

| Node    | Speech                                                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `num`   | source digits (`normalized.slice(span.start, span.end)`, whitespace removed); never grouped (T-10)                              |
| `id`    | `x`; uppercase Latin `upper A`; Greek without `\` and a leading `var`; `a_{1}` is `a sub 1`                                     |
| `const` | `e`, `pi`, `tau`                                                                                                                |
| `add`   | `A plus B` (both ≥ 2); `sub`: `A minus B` (left ≥ 2, right ≥ 3)                                                                 |
| `mul`   | `A B`, or `A times B` when B's speech starts with a digit or `.` (both ≥ 3)                                                     |
| `div`   | integer literal N over integer literal D in 2–10: `N` then D's word (below); otherwise `Start Fraction, A Over B, End Fraction` |
| `pow`   | base ≥ 7; exponent `num` 2 `A squared`, 3 `A cubed`, else `A Superscript, E, Baseline`                                          |
| `neg`   | `negative A` (≥ 4); `pct` `A percent`, `deg` `A degrees`, `fact` `A factorial` (≥ 7)                                            |
| `abs`   | `Start Absolute Value, A, End Absolute Value`                                                                                   |
| `root`  | `Start Root, A, End Root`; index `num` 3 `Start Cube Root, A, End Cube Root`; else `Start Root Index N, A, End Root`            |
| `call`  | `NAME of A comma B` (args ≥ 6); `log` with base: `log base B of A`; names from the spoken-name list (below), else as written    |
| `point` | `left parenthesis A comma B right parenthesis`                                                                                  |
| `rel`   | operands joined by `equals`, `less than`, `greater than`, `less than or equal to`, `greater than or equal to`                   |

Denominator words (`div`): the singular when the numerator literal is exactly `1`, the plural for
every other integer numerator (`1 third`, `2 thirds`, `5 halves`).

| D        | 2      | 3      | 4       | 5      | 6      | 7        | 8       | 9      | 10     |
| -------- | ------ | ------ | ------- | ------ | ------ | -------- | ------- | ------ | ------ |
| singular | half   | third  | fourth  | fifth  | sixth  | seventh  | eighth  | ninth  | tenth  |
| plural   | halves | thirds | fourths | fifths | sixths | sevenths | eighths | ninths | tenths |

Spoken-name list (a module-private constant of `speech.ts`, not exported; tests reach it through
`latexToSpeech`): sin sine, cos cosine, tan tangent, csc cosecant, sec secant, cot cotangent,
arcsin arc sine, arccos arc cosine, arctan arc tangent, arccsc arc cosecant, arcsec arc secant,
arccot arc cotangent, ln natural log, log log, exp exp.

## Notes for the lead

1. Contract titles. The announcer tests (`ui/a11y/announcer.test.tsx`) and token tests
   (`ui/a11y/tokens.test.ts`) are titled by their 01 section 9 contract (`createAnnouncer …`,
   `tokens.css …`), not by A11Y-2, AN-13 or AN-14. Those IDs belong to 09 and 10, whose component
   and browser tests verify them; a 05 test titled with them would be an unlisted contribution
   (index section 4) that `check-spec-ids` would count as coverage. For the same reason the unit
   and jsdom tests of Tasks 4 and 6 are titled by contract (`mathQuillOptions …`,
   `toMathFieldLatex …`, `createMathField …`): titled with AR-42, PR-2, T-2 to T-4 or T-6 to T-10
   they would become those IDs' owning tests (index section 4) ahead of the typing, round-trip and
   browser tests the IDs require. The only API-15 test here is the listed browser test in `math-field.spec.ts`. These
   titles need no index 5.3 change; item 7 covers the T-9 and T-11 rows.
2. 01 section 9 has no way to rename a field after creation; 09 updates the textbox's
   `aria-label` through `field.element.querySelector("textarea")` (adapter contract above). If the
   lead prefers a method, `setAriaLabel(label: string): void` is a one-line addition to
   `MathField.ts` and section 9; this plan does not add it.
3. Size: `vendor/mathquill/mathquill.js` (upstream build output, byte-exact for AR-5) and
   `public/calculator-notices.txt` (licence texts) exceed 700 lines. Neither is authored code and
   neither is under `src/`, which is all `scripts/check-file-sizes.mjs` scans. The plan itself is
   split so every plan file stays under 700 lines (Plan files, above), as 09 is. Index section 2
   still names only this file, which stays the package's entry point; listing the four part files
   there as well is optional.
4. REA rows T-6, T-9, T-10 (index section 8): a capture that changes T-6's characters changes
   `CHARS_THAT_BREAK_OUT_OF_SUPSUB`, the T-6 keys cases and Task 4's
   `CHARS_THAT_BREAK_OUT_OF_SUPSUB …` config test in one 05 commit.
5. Operator names that contain an auto-command. MathQuill's `Letter.createLeftOf` tests every
   suffix of the letter run (up to the longest auto-command) on each keystroke, so an allowlist
   name that contains an auto-command anywhere conflicts. In the 104 names the one instance is
   `midpoint`, which ends in `int`: unpatched, the final `t` fires `\int` and the field holds
   `midpo\int`. Patch 0009 makes an auto-command yield when a longer suffix of the run is an
   operator name, so names that end in an auto-command type as one name, as PR-13's longest match
   says; keys case 56 and the T-3 browser test pin it. A name with an auto-command before its last
   letter (`pi`, `sum`, `int`, … at the start or in the middle) fires before the name is complete,
   so no patch of this kind can fix it. There is none today, and Task 4's
   `mathQuillAutoOperatorNames has an auto-command only …` config test fails if 02 adds one; that
   is an allowlist question for 02 and the lead, never a test to relax.
6. A11Y-2 timing in 09 (resolved, no action). `09-editor-ui-2-list.md` (Timing) has
   `createRowAnnouncements` run a 700 ms idle timer and then call
   `announce(text, { delayMs: ANNOUNCE_WRITE_MS, key })` with `ANNOUNCE_WRITE_MS = 50`, which this
   announcer writes exactly 50 ms later, at 750 ms after the last edit, A11Y-2's figure.
7. T-9 and T-11 parts that 09 builds (resolved; 05 does not edit the index or 09). Two Phase 1
   parts of 05's own IDs are built by 09. T-11's "`none` while the on-screen keypad is open,
   `text` otherwise" lives in 09's row, which calls `setInputMode` from `keypadOpen`; 05 checks
   only that `setInputMode` sets the attribute. T-9's "the keypad and functions-panel buttons
   insert the name with an empty parenthesis pair and the caret inside" is checked by 05 only by
   running 02's `panelCategories()` actions through `MathField.run`, not through 09's buttons.
   Index 5.3 now has both rows (owner 05, contributor 09), and index 5.4 item 5 is the lead's edit
   that places them; that item, not this note, is authoritative for the files and titles:
   - T-9: `09-editor-ui-4-panels.md` Task 10 Step 1 adds the T-9 test to
     `src/components/calculator-v2/ui/keypad/FunctionsPanel.test.tsx`.
   - T-11: `09-editor-ui-1-rows.md` Task 2 Step 1 adds the T-11 test to
     `src/components/calculator-v2/ui/list/ExpressionRow.test.tsx` (the row's fake field records
     `setInputMode` `"none"` while `keypadOpen` is true and `"text"` after it is false). It does
     not go into `tests/calculator/v2/editor.spec.ts`; 05 adds nothing to that file.

## Interfaces consumed (02-parser, merged)

Copied from `01-interfaces.md` sections 1, 1.1, 2 and 2.2 (only the members 05 uses, and every
type those members name).

```ts
// src/lib/calculator-v2/core/latex/ast.ts
export interface SourceSpan {
  start: number;
  end: number;
} // UTF-16 offsets into normalizeLatex(input)
export type RelOp = "=" | "<" | ">" | "<=" | ">=";
export type ConstName = "e" | "pi" | "tau";
export type Node =
  | { kind: "num"; value: number; span: SourceSpan }
  | { kind: "id"; name: string; span: SourceSpan } // "x", "A", "a_{1}", "v_{max}", "\\alpha", "e_{3}"
  | { kind: "const"; name: ConstName; span: SourceSpan }
  | { kind: "add" | "sub" | "mul" | "div" | "pow"; left: Node; right: Node; span: SourceSpan }
  | { kind: "neg" | "pct" | "deg" | "fact" | "abs"; arg: Node; span: SourceSpan }
  | { kind: "root"; arg: Node; index: Node | null; span: SourceSpan } // \sqrt, \sqrt[n]
  | { kind: "call"; name: string; args: Node[]; span: SourceSpan } // \log_{b}x is call "log" args [x, b]
  | { kind: "point"; x: Node; y: Node; span: SourceSpan }
  | { kind: "rel"; ops: RelOp[]; operands: Node[]; span: SourceSpan }; // operands.length === ops.length + 1

// src/lib/calculator-v2/core/latex/errors.ts
export type ParseErrorCode =
  | "syntax"
  | "unsupported"
  | "point-arity"
  | "relation-chain"
  | "too-many-nodes"
  | "too-deep";
export interface ParseError {
  code: ParseErrorCode;
  span: SourceSpan;
  detail: string;
} // detail: English, logs and tests only

// src/lib/calculator-v2/core/latex/index.ts
export const MAX_ROW_CHARACTERS = 2048;
export interface ParseOptions {
  userFunctions?: ReadonlySet<string>;
} // names some row defines as functions (PR-23)
export type ParseResult =
  | { ok: true; tree: Node; normalized: string }
  | { ok: false; error: ParseError; normalized: string };
export function parseLatex(input: string, options?: ParseOptions): ParseResult; // never throws (PR-38)
export function functionDefinitionHead(input: string): { name: string; params: string[] } | null; // RC-4 pre-scan
export function toSExpr(tree: Node): string;
export function treesEqual(a: Node, b: Node): boolean; // ignores spans

// src/lib/calculator-v2/core/latex/operator-names.ts
export type MathFieldAction = { op: "write" | "cmd" | "keystroke" | "typedText"; arg: string };
export interface PanelEntry {
  name: string;
  label: string;
  spoken: string;
  actions: readonly MathFieldAction[];
}
export interface PanelCategory {
  id: number; // 1–15
  heading: string; // CATEGORY_HEADINGS[id - 1]
  entries: readonly PanelEntry[];
}
export const MEMBER_NAMES: readonly string[]; // null p pleft pright score dof stderr conf lower upper estimate
export function mathQuillAutoOperatorNames(): string; // space-separated, members excluded (T-3)
export function mathQuillAutoCommands(): string;
export function panelCategories(): readonly PanelCategory[]; // Phase 1: ids 1, 2 and 8 in that order; 8 holds exp, ln, log, log_a only (K-4)

// src/lib/calculator-v2/dev-counters.ts (AR-61, AR-41)
export type DevCounter = "calculators" | "workers" | "reflows";
declare global {
  var __karmanCalculatorCounters: Record<DevCounter, number> | undefined;
}
export function bumpDevCounter(name: DevCounter, delta: 1 | -1): void;

// src/lib/calculator-v2/core/corpus/types.ts
export type RowKind =
  | "empty"
  | "value"
  | "definition"
  | "dependent-definition"
  | "function-definition"
  | "curve-y"
  | "curve-x"
  | "implicit"
  | "vertical-lines"
  | "horizontal-lines"
  | "region"
  | "constant-relation"
  | "unsolved-relation"
  | "point"
  | "error";
export type RowErrorCode =
  | ParseErrorCode
  | "too-many-params"
  | "duplicate-definition"
  | "dependency"
  | "cycle"
  | "reserved-name"
  | "arity"
  | "point-coordinates"
  | "mixed-variables"
  | "polar-variable"
  | "timeout";
export interface CorpusSettings {
  angleMode?: "radians" | "degrees";
  complex?: boolean;
}
export type CorpusInput =
  | { latex: string } // typed, API and plain paste dialect
  | { keys: string[] } // MathField keystrokes, e.g. ["y","=","x","^","2","Right","+","3","/","4"]
  | { question: string; context?: "math" | "cell" | "coordinate" } // question dialect (TR-7)
  | { pastedQuestionMath: string }; // OI-6: rendered question math pasted (13-paste-standalone)
export interface CorpusCase {
  id: string; // "<case-file>-<n>", unique across the corpus
  rules: string[]; // spec IDs this case checks
  input: CorpusInput;
  rows?: string[]; // context rows, in order, before the case row
  settings?: CorpusSettings;
  tree?: string; // toSExpr
  latex?: string; // printLatex output, or MathField latex() for keys
  kind?: RowKind;
  chips?: string[]; // RC-10 names in order
  display?: string; // formatValue text
  error?: RowErrorCode;
}
export type InputKind = "latex" | "keys" | "question" | "pastedQuestionMath";
export type ExpectedField = "tree" | "latex" | "kind" | "chips" | "display" | "error";
export function inputKind(input: CorpusInput): InputKind;

// src/lib/calculator-v2/core/corpus/index.ts
export const CORPUS: readonly CorpusCase[]; // Object.values(CORPUS_FILES).flat(), file order of 2.1

// src/lib/calculator-v2/core/corpus/runners.ts
export interface CorpusRunner {
  file: string; // repo-relative path of the test file that compares the fields
  owner: "02" | "04" | "05" | "12" | "13";
  input: InputKind;
  fields: readonly ExpectedField[];
}
export function runnerFor(c: CorpusCase, field: ExpectedField): CorpusRunner | null;

// src/lib/calculator-v2/core/corpus/cases/keys.ts (02's scaffold; Task 9 fills it)
declare const cases: CorpusCase[];
export default cases;
```
