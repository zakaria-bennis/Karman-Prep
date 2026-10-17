# 09 editor-ui: expression list, rows, keypads, functions panel and settings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Package `editor-ui` of `00-index.md` (increment 1A, wave 3). The plan header, Global Constraints
and Review Focus are in `00-index.md`; contracts are `01-interfaces.md` sections 0 to 5 (section 5
for `Viewport`, Task 12), `01-interfaces-runtime.md` sections 6 to 9 with 8.1 (section 7 for
`createMainThreadBackend` and the `WorkerToMain` `value` message, Tasks 1, 5 and 12), and
`01-interfaces-integration.md` sections 11 and 16, whose names are used verbatim here. This file
holds the package's shared header; its 15 tasks are in five part files, each under 700 lines
(table below).

**Goal:** Everything a student types into and presses inside the calculator: numbered expression
rows with values, errors and the complex-mode hint; the list toolbar with Add item, Undo, Redo,
Edit list and Collapse list; the desktop tray and phone keypads with their letters pages and the
Functions panel; the settings popover with axis bounds; and their announcements and motion.

**IDs:** FN-16; R-1 to R-3, R-5, R-9, R-10; T-13; K-1, K-3 to K-7, K-9 to K-11; S-1, S-5, S-7;
KB-2, KB-5; L-3; AN-1 to AN-5, AN-11; A11Y-2 to A11Y-5, A11Y-15. **Contributions received
(00-index 5.3):** T-13 from 13 (`paste.spec.ts`), A11Y-2 from 10 (`shell.spec.ts`) and 13
(`paste.spec.ts`), L-3 from 15 (`visual.spec.ts`). **Open item:** OI-4 (Task 3).
**Depends on:** 02, 03, 04, 05, 07, all merged (04 for `COMPLEX_HINT` in Task 3 and
`formatValueLatex` in Task 11).

**Owns:** `src/components/calculator-v2/ui/list/`, `ui/keypad/`, `ui/settings/`, `ui/focus/`;
`src/components/calculator-v2/icons/`; `styles/list.css`, `styles/keypad.css`,
`styles/settings.css`; `tests/calculator/fixture/v2/editor.html`, `editor.tsx`;
`tests/calculator/v2/editor.spec.ts`. The only other edit is the overview row OI-4 replaces
(00-index section 4, "Spec documents"). Paths below that start with `ui/`, `styles/` or `icons/`
are under `src/components/calculator-v2/`.

## Plan files

Tasks run in number order; each part starts where the previous one ends.

| File                        | Tasks    | Concern                                                                                                       |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `09-editor-ui-1-rows.md`    | 1 to 3   | Focus controller, escape stack and test kit; rows, naming, speech and gutter tab; values, errors, hint (OI-4) |
| `09-editor-ui-2-list.md`    | 4 to 6   | List toolbar, history, Edit list and row actions; live-region announcements; row presence and Collapse list   |
| `09-editor-ui-3-keypad.md`  | 7 to 9   | Key tables, key repeat and double tap; keypad rendering and letters pages; key input                          |
| `09-editor-ui-4-panels.md`  | 10 to 12 | Functions panel; settings popover; axis bound and step fields                                                 |
| `09-editor-ui-5-browser.md` | 13 to 15 | Editor harness page and browser checks; keypad motion and sizes; list and settings motion                     |

## Working rules

- Run every command from the worktree root under Node 22 (`n exec 22 <command>` on the lead's
  machine, 00-index section 1).
- Unit and component tests: `npx vitest run <path> -t "<pattern>"`. Browser:
  `npm run test:calculator -- --project=calculator-chrome --project=calculator-ios tests/calculator/v2/editor.spec.ts -g "<pattern>"`;
  Task 14 adds `--project=calculator-android` for the touch IDs (K-6, K-7). The wave 3 gate runs
  the whole spec on calculator-chrome and calculator-ios.
- Component tests start with `// @vitest-environment jsdom` and render through `renderEditor`
  (Task 1), which installs the DOM stubs, fake MathFields and a recording announcer and provides
  every context. They use real timers and `userEvent.setup()` unless a test says
  `vi.useFakeTimers()`; those use `fireEvent` and end with `vi.useRealTimers()` in `afterEach`.
- Node tests that depend on `change` events or worker values build on 07's
  `createTestEngine` (`src/lib/calculator-v2/core/api/__fixtures__/test-engine.ts`). API-8 fires
  `change` at most once per frame through `deps.scheduleFrame`, so such a test calls
  `t.flushFrames()` after each engine call, or `await t.settled()` when it needs a worker value,
  before it advances any timer that the event starts.
- Modules used by node-environment tests (`messages.ts`, `row-actions.ts`, `announcements.ts`,
  `keys.ts`, `key-repeat.ts`, `double-tap.ts`, `bounds.ts`) import MathField, engine and
  operator-name types with `import type`, so node tests never load the vendored MathQuill.
- CSS: colours only through `var(--kc-*)` role variables and `--kc-row-color` (TH-3: no hex, no
  `color-mix()`); every `--kc-…` custom property that a component sets inline (`--kc-row-color`,
  `--kc-columns`) also gets a default declaration in its stylesheet, because 03 Task 6's TH-3
  `varFindings` accepts a `var(--kc…)` only when it names a `ROLE_VARS`, `CURVE_VARS`,
  `FILL_ALPHA_VARS` or `CHROME_VARS` value or a `--kc-…:` declared in a scanned stylesheet (the
  inline value still overrides the default). Every task that edits `list.css`, `keypad.css` or
  `settings.css` reruns `npx vitest run src/lib/calculator-v2/theme/no-raw-colours.test.ts`
  (Expected: PASS, 7 tests) in its pass step;
  transitions only with `--kc-duration-instant|fast|normal` and `--kc-ease-standard` (AN-14);
  UI text `var(--kc-font-ui)` at `var(--kc-size-ui)`; keypad glyphs and math
  `var(--kc-font-math)`; every focusable gets a 2 px solid `var(--kc-focus-ring)` outline with a
  2 px offset on `:focus-visible` (TH-14); no `transform` or `box-shadow` on press (AN-11).
- Icons come only from `lucide-react` or `icons/` (TH-18); keypad glyphs are text.
- Copy comes from the spec or from `EDITOR_MESSAGES` (Task 1), which fixes the copy the spec
  leaves open. ARIA id references stay inside the calculator's own tree (A11Y-7); row ids come
  from `rowDomIds` (Task 2).

## Decisions

- **Fake MathFields in jsdom.** Rows and bound fields create their MathField through
  `MathFieldFactoryContext` (default `createMathField`). Component tests inject recording fakes,
  so K-10's "one adapter call" is asserted call by call. Real MathQuill behaviour (caret edges,
  templates, `~`) is asserted in `editor.spec.ts` on the harness page.
- **Textbox naming survives renumbering.** The textbox's `aria-labelledby` points at a hidden
  `Expression n` span the row keeps current, so names follow insertions and deletions without
  recreating the field or touching MathQuill's own `aria-label`.
- **One undo step per K-7 conversion.** Keypad input goes through `editThroughKeypad`, which
  silences the row's `onEdit` while the adapter call runs and then makes one
  `editRow(…, "keypad")`. The double-tap replacement ends the edit group before and after, so one
  Undo returns to `=` whatever 07 does when it groups keypad edits.
- **Announcements are engine-driven and user-only.** `createRowAnnouncements` restarts its 750 ms
  idle timer only on `change` events with `isUserInitiated` that change some row's latex or the
  row list; API and transfer changes are recorded silently, so the calculator's live region stays
  silent for transfers (A11Y-11), and pans, zooms and settings never re-announce a value. Errors
  are announced at the same idle point, once per new code and message. A `change` event that
  leaves the rows signature unchanged is ignored, so worker results never restart the timer even
  if 07 marks `change` for them. Because API-8 batches `change` once per frame, the idle timer
  starts at the frame after the edit, not at the edit itself (at most 16 ms later).
- **Announced row.** A11Y-2 says "the focused row's value". The idle point announces the row
  `snapshot.focusedRowId ?? snapshot.activeRowId`: with DOM focus in a row this is exactly the
  focused row, and keypad input on a touch-activated row (OI-7: DOM focus on the frame, no
  focused row) is still announced. Task 5 tests both cases.
- **Gutter tab only on rows with something to hide.** `rowTab` gives a tab to graphing rows
  (point, curve-y, curve-x, implicit, vertical-lines, horizontal-lines, region,
  constant-relation) and to an error row only while it is hidden, so a row hidden before it broke
  can be shown again. Value, definition, empty and other non-graphing rows have no graph to hide
  and show no tab: R-1's "each row's gutter tab" and A11Y-3's Hide and Show control apply to rows
  with a graph, while Delete is on every row. This is reading E1 (below, "Readings for 00-index
  section 7"); the R-1 test asserts it.
- **K-10 key calls.** K-10 sorts keys into "characters with `typedText`, structures with `cmd`",
  with `a²` writing `^2`. Two keys need a reading. `a²` is one `write("^2")` call: `cmd("^")`
  opens an empty exponent and would need a second call to fill it, and K-10 allows one adapter
  call per key. The named single-symbol keys π, θ, ≤ and ≥ go through `cmd` (`\pi`, `\theta`,
  `\le`, `\ge`), so the row's latex holds the canonical command whatever MathQuill's Unicode alias
  table does with a typed `π` or `≤`. Digits, letters, operators, brackets and punctuation are
  `typedText`. This is reading E2 (below); the K-10 test asserts it.
- **The ABC key keeps one accessible name, `ABC`,** on both pages (visible text `ABC` on the main
  page and `123` on the letters page), with `aria-pressed` reporting the letters page. K-3 and
  A11Y-5 call it the ABC key, 10's KB-3 and K-12 tests click `{ name: "ABC", exact: true }`, and a
  toggle keeps one name so a press never renames the focused button.
- **Escape order is by rank, not push order:** any menu or popover, then the Functions panel, the
  ABC page, the keypad (`ESCAPE_RANK`), whatever order they opened in (KB-3).
- **Motion lifecycles read CSS.** Row exit, panel and popover closing, and Collapse list wait
  `MotionContext(el)` ms (the element's computed `transition-duration`), read in a layout effect
  once the exiting, closing or collapsing state is committed, so the duration read is the one
  that state's own CSS sets (AN-2's close is 100 ms, not the open state's 200 ms). An exiting row
  and a closing Functions panel or settings popover render `inert` for that whole time, so a
  quick second tap on a fading panel inserts nothing. A duration of 0 (reduced motion, AN-13, and
  jsdom) finishes in that layout effect, before paint and never through a timer; any other
  duration sets one timeout of that many ms. Tasks 14 and 15 add the transitions and their
  browser checks; component tasks fix the states and timing contracts.
- **Press tone is a 10.3 role (AN-11, TH-3, TH-1).** A pressed key takes the other key background
  role: digit and letter keys `--kc-key-operator`, operator, function and navigation keys
  `--kc-key`, and the Enter key `--kc-key-operator` with its label in `--kc-text`
  (`--kc-accent-label` is measured only on the accent). List-panel buttons rest on `--kc-list` and
  press to `--kc-chrome`. 08's graph buttons already press to `var(--kc-key-operator)`. Each
  pressed pair is one that 03's `it("TH-1 every 10.3 foreground role meets its target on each background it sits on in all 12 skins")`
  measures (`text` and `textSecondary` at 7:1 on `TEXT_BACKGROUNDS`: paper, list, chrome, key,
  keyOperator), and each pressed role differs from the resting one in every skin (10.3: list is
  `surface` and chrome `raised` or `canvas`; key and keyOperator are `surface`/`canvas` in light
  skins and `raised`/`surface` in dark ones). So no new role, no `color-mix()` colour and no new
  contrast pair is needed. The REA capture (00-index section 8, AN-11) may change which role a
  press shows, not the rule that it is a 10.3 role.
- **Functions panel placement follows the layout, not the keypad.** Containers under 560 px use
  the stacked layout (L-2), where the panel covers the keypad area (`cover`); from 560 px it sits
  above the keypad (`above`), including 560 to 599 px containers that show the phone keypad (K-4,
  K-6). 09 cannot import 10's `LAYOUT_DESKTOP_MIN_WIDTH`, so `FUNCTIONS_COVER_BELOW = 560` repeats
  it.
- **Phase 1 shipped parts:** Edit list shows Clear all and Done only; Add item adds an expression
  row; R-5 has no fraction toggle; the Functions panel shows categories 1, 2 and 8 and every one
  of their entries is tested (K-5); a row holding `\sim` shows PR-9's `unsupported` error; AN-4
  covers the settings popover; S-1's order test covers the Phase 1 controls; the audio key stays
  disabled (K-9).
- **REA (00-index section 8):** the K-3, K-5, K-6, AN-1 to AN-5, AN-11 and FN-16 defaults ship as
  written; a capture that changes one edits its constant or CSS and its test in one commit.

## Notes for consumers (10-shell, 11-seam, 14-transfer-ui, 15-release-gates)

1. `App` provides `EngineContext`, `FocusContext` (`createFocusController(engine)`),
   `EscapeContext` (`createEscapeStack()`), `AnnouncerContext` and `SkinContext`;
   `MathFieldFactoryContext` and `MotionContext` work without a provider. `ExpressionPanel` calls
   `useAnnouncer()`, which throws without an announcer, so a host renders the editor only once its
   `LiveRegion` has produced one.
2. `App`'s Escape handler calls `escape.handleEscape()` and `preventDefault()` when it returns
   true, and only otherwise closes the calculator (KB-3).
3. Keyboard Undo, Redo and add-row go through the same functions as the toolbar, so A11Y-2's
   announcements and the NM-42 refusal text are identical on both paths: 10's keyboard handler
   calls `performUndo(engine, announcer)` and `performRedo(engine, announcer)` for its undo and
   redo shortcuts, and `insertRowBelow(engine, focus, announcer, null, "focus")` for Alt+Enter,
   in place of `engine.undo()`, `engine.redo()` and `engine.insertRowAfter(null)` with
   `ROW_LIMIT_MESSAGE` (declarations below the list).
4. The layout sizes the list column from `snapshot.settings.expressionsCollapsed` in one step with
   no transition. The panel flips that setting when each AN-3 transition ends and overlays its
   list while expanding, so the column wrapper keeps `overflow: visible`.
5. `focusOnOpen` uses `FocusController.lastFocusedRowId()`, `focusRow` and `activateRow`; keypad
   input targets `keypadTarget(focus, snapshot)` (Task 9).
6. Keypad accessible names (01 section 11 does not list them; this list and Task 7's key table
   are the contract): `ABC` (one name on both pages, `aria-pressed`), `Functions`
   (`aria-expanded`, `aria-controls` the panel), `Shift` (`aria-pressed`), `Hide keypad` (inside
   the Keypad region), `Show keypad` (outside it, rendered while the keypad is closed) and the
   list toolbar's `Keypad` toggle (stacked layout, `aria-pressed`). Every other key's name is in
   Task 7's table; Functions panel buttons are named by `PanelEntry.spoken`.

Note 3's declarations, from `ui/list/row-actions.ts` and `ui/list/messages.ts` (Tasks 1 and 4):

```ts
export function performUndo(engine: CalculatorEngine, announcer: Announcer | null): void; // no-op unless canUndo(); announces "Undone."
export function performRedo(engine: CalculatorEngine, announcer: Announcer | null): void; // no-op unless canRedo(); announces "Redone."
export function insertRowBelow(
  engine: CalculatorEngine,
  focus: FocusController,
  announcer: Announcer | null,
  afterId: string | null, // null: at the end
  mode: "focus" | "activate"
): string | null; // the new row id, or null after announcing EDITOR_MESSAGES.rowLimit
export const EDITOR_MESSAGES; // the `as const` object of Task 1 Step 3; rowLimit: "The calculator holds at most 100 expressions." (10's ROW_LIMIT_MESSAGE text)
```

Row DOM (01 section 11 plus the parts this package adds; 10, 11, 14 and 15 read it):

```text
section.kc-list-panel[aria-label="Expression list"][data-layout][data-pointer][data-list-state]
  button "Expand list"                           collapsed and expanding states only
  div.kc-list-body[data-enter]                   moves on transform (AN-3); absent while collapsed
    div[role=toolbar][aria-label="List tools"]   Add item, (stacked: Keypad), Undo, Redo, Edit list, Collapse list
    div.kc-edit-bar                              Edit list mode: Clear all expressions, Done
    ol.kc-list[aria-label="Expressions"]
      li.kc-row[data-row-id][data-active][data-focused][data-motion] > div.kc-row-inner
        div.kc-row-gutter   span.kc-row-number, button.kc-row-tab[aria-pressed][data-style], span.kc-row-warning
        div.kc-row-main     div.kc-row-field (MathField), span#kc-row-<id>-label[hidden], span#…-speech[hidden],
                            div.kc-row-value#…-value, div.kc-row-error#…-error, div.kc-row-hint, p.kc-row-note
        button.kc-row-delete
section.kc-keypad[role=region][aria-label="Keypad"][data-open][data-layout][data-pointer][data-page]
  div.kc-keypad-bar > button "Hide keypad";  div[role=group][data-group] > button.kc-key[data-key][data-tone]
  div.kc-functions-panel[role=group][aria-label="Functions"][data-state][data-placement]   inert while closing
button.kc-show-keypad[data-layout][data-pointer] "Show keypad"   rendered while the keypad is closed
div.kc-settings[role=dialog][aria-label="Graph settings"][data-state]                     inert while closing
```

`data-active` and `data-focused` are `"true"` on the active and focused row and omitted (never
`"false"`) on every other row.

## Notes for the lead

09 edits only its own files.

**Applied (no action).** The edits this file used to request are in place: the Note 3
declarations and Note 6 keypad names are in `01-interfaces-integration.md` section 11; 10-shell
Task 9 calls `performUndo`, `performRedo` and `insertRowBelow` and holds
`test("A11Y-2 Ctrl or Cmd+Z and the redo shortcut announce Undone. and Redone. like the toolbar", …)`;
the 00-index section 5.3 A11Y-2 and R-10 rows list 10's contributions. Do not apply them again.

**Readings for 00-index section 7 (lead sign-off, before the plan commit of 00-index section
1).** The lead appends these two bullets to 00-index section 7, "Deliberate deviations and
limits", verbatim (they record the Decisions "Gutter tab only on rows with something to hide" and
"K-10 key calls"):

```markdown
- 09's E1 (R-1, A11Y-3): "each row's gutter tab" and the "Hide expression n" or "Show
  expression n" control are read as each graphing row's: point, curve, implicit, line-set,
  region and constant-relation rows, and an error row while it is hidden. Value, definition and empty rows
  have no graph to hide and show no tab; Delete is on every row. 09 Task 2's R-1 test asserts
  that `2+3` has no Hide control.
- 09's E2 (K-10): `a²` is one `write("^2")` call, because `cmd("^")` opens an empty exponent and
  a second call would fill it; the named symbols π, θ, ≤ and ≥ go through `cmd` (`\pi`,
  `\theta`, `\le`, `\ge`) so the row holds the canonical command; every other character key is
  `typedText`. 09 Task 9's K-10 test asserts the `a²`, π and ≤ calls.
```

If the lead rejects E1, `rowTab` returns `"line"` for every row that is not a point, and Task 2's
R-1 test replaces `expect(screen.queryByRole("button", { name: "Hide expression 3" })).toBeNull()`
with
`expect(screen.getByRole("button", { name: "Hide expression 3", exact: true })).toHaveAttribute("aria-pressed", "true")`.
If the lead rejects E2, the `pi`, `theta`, `le` and `ge` keys become `typedText` `π`, `θ`, `≤`
and `≥`, and the K-10 test expects `{ method: "typedText", arg: "π" }` for Pi and
`{ method: "typedText", arg: "≤" }` for Less than or equal to; `a²` stays `write("^2")`, the only
one-call form.

## ID coverage

Every ID of this package has at least one test whose title starts with it, in these tasks. The
lowest-numbered task listed for an ID owns it (00-index section 4, "Owning task"). Task 1's
focus-controller and escape-stack tests carry no ID: they test plumbing, and R-3 (Task 13's
browser test) and K-5 (Task 10's component test) keep their owning tests. Task 10's
panel-lifecycle test carries no ID either, so AN-2 stays with Task 14's browser test.

| Tasks | IDs                                                              |
| ----- | ---------------------------------------------------------------- |
| 1     | R-10                                                             |
| 2     | A11Y-3, A11Y-4, L-3, R-1; contributions TH-11, T-11              |
| 3     | R-5, R-2, FN-16 (with OI-4), A11Y-3                              |
| 4     | KB-2, R-10, T-13, A11Y-2                                         |
| 5     | A11Y-2                                                           |
| 6     | AN-5, AN-3                                                       |
| 7     | K-1, K-6, K-3, K-11, K-7                                         |
| 8     | K-1, K-3, K-9, A11Y-5                                            |
| 9     | K-10, K-9, K-3, K-7, A11Y-2, K-11, T-13                          |
| 10    | K-4, A11Y-5, K-5; contribution T-9                               |
| 11    | S-1, S-5, A11Y-15, A11Y-2                                        |
| 12    | S-7                                                              |
| 13    | R-3, R-9, KB-2, KB-5, L-3, R-5, K-5                              |
| 14    | K-1, K-6, K-4 (guards of Tasks 8 and 10), K-7, AN-1, AN-2, AN-11 |
| 15    | AN-3, AN-4, AN-5, S-1 (guard of Task 11's placement)             |

R-10's reopen clause ("after a new question or `setBlank()` it receives focus when the
calculator is next opened") is 10's contribution in the 00-index section 5.3 R-10 row
(`shell.spec.ts`: after `setBlank()` a keyboard reopen focuses `Expression 1`). Here Task 1's R-10
test asserts that after `setBlank()` the only row is `"1"` and `lastFocusedRowId()` is null, and
Task 4's covers Clear all's focus and the single row numbered 1.
