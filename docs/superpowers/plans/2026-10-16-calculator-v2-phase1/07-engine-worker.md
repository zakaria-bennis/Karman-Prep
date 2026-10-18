# 07 engine-worker: headless engine and public API, worker protocol, executor, backends and plot inputs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Package `engine-worker`, increment 1A, wave 2; starts after 02, 03, 04, 05 and 06 merge. Read
`00-index.md` sections 3 to 5 and the contracts in `01-interfaces.md` sections 0 to 5,
`01-interfaces-runtime.md` sections 7 and 8 and `01-interfaces-integration.md` section 16 first;
every name below is theirs. Global Constraints and Review Focus are in `00-index.md`.

**IDs:** NM-16, NM-42; AR-4, AR-43 to AR-50, AR-54; API-1, API-2, API-4 to API-11, API-13.
**Contributions (index 5.3):** TH-10 (owner 03): new rows take `c1` to `c6` in order and repeat,
read back as slot ids from `getExpressions()`, in
`it("API-2, TH-10 a new row takes the next skin colour slot")`,
`src/lib/calculator-v2/core/api/engine.rows.test.ts` (Task 9; 03 coordination note 6). Later
packages contribute to 07's NM-42, AR-43 and AR-50 ("Notes for the lead", Section 5.3 rows).
**Open items:** OI-23 (Task 9), OI-24 (Task 11), OI-10 (Task 12), and the proposed items OI-32
(Task 11) and OI-35 (Task 7; see "Notes for the lead" for both). OI-29's `ready` marker lands in
Tasks 2 and 6; package 11-seam (its Task 15) applies OI-29's spec text.

**Commands.** Node 22 for everything: every `npx`, `npm` and `node` command below carries the
`n exec 22` prefix this machine needs. Unit: `n exec 22 npx vitest run <file>`. Browser:
`n exec 22 npm run test:calculator -- --project=calculator-chrome <spec>`. Each commit stages
exactly the files its task lists, with a plain-sentence message that names the IDs, as in the
other packages.

## Plan files

This file holds the package's shared header: the IDs and contributions, the open items, the
Commands, the Decisions and the Notes for the lead. Its 14 tasks are in seven part files, each
under 700 lines. Tasks run in number order; each part starts where the previous one ends. Index
section 2 still names only this file, which stays the package's entry point.

| File                               | Tasks    | Concern                                                                                                                                                                        |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `07-engine-worker-1-contracts.md`  | 1 to 3   | API types, errors and validators; worker protocol; plot inputs from analysis (API-1, API-7, API-13, AR-45, NM-16, AR-44)                                                       |
| `07-engine-worker-2-executor.md`   | 4 to 6   | Golden graph cases; slice clock, work deadlines, passes and helper parsing; executor (AR-44, AR-45, AR-46, AR-47, AR-48, AR-54, API-10)                                        |
| `07-engine-worker-3-backends.md`   | 7 and 8  | Worker and main-thread backends and the worker entry; import-graph, DOM and code-generation scans (AR-43, AR-49, AR-50, AR-47 gap OI-35, AR-4, AR-44)                          |
| `07-engine-worker-4-rows.md`       | 9        | Engine rows, history and state posting (API-1, API-2, API-4, API-11, NM-42, AR-45, AR-46, OI-23; TH-10 contribution)                                                           |
| `07-engine-worker-5-state.md`      | 10       | Settings, viewport and whole state (API-1, API-5, API-6, API-7, AR-46, NM-42)                                                                                                  |
| `07-engine-worker-6-results.md`    | 11       | Worker results, analyses and observers; the contract check and the OI-32 text (API-8, API-9, AR-45, AR-46, AR-48, AR-54, NM-42, OI-24)                                         |
| `07-engine-worker-7-helpers-ui.md` | 12 to 14 | Helpers, focus and teardown; UI hooks and DOM stubs; harness kit, worker harness and the package gate (API-10, API-6, API-8, API-13, API-1, OI-10, AR-54, AR-43, AR-49, AR-50) |

## Decisions

1. **Work units.** `evaluateRows` and `plotRow` are synchronous (01 sections 4, 5), so the
   executor's units are: one values pass (`analyzeRows` then `evaluateRows` for the latest
   state), one helper job, one row's plot. After every unit it reads the clock and, once 8 ms of
   the slice are spent, yields through a `MessageChannel` macrotask (AR-47). Inside a unit every
   `deadline.check()` call posts a heartbeat when one is due, so the AR-49 watchdog fires only on
   work that stops checking. A unit itself never pauses, so one long unit (an implicit plot near
   the G-15 budget, a 100-row values pass) runs past 8 ms: AR-47's bound and AR-50's "8 ms
   slices" hold only between units. This is proposed item OI-35 ("Notes for the lead"); Task 7's
   `it.fails` test measures the gap.
2. **Message order per generation.** `begin` when a row's work starts: a value row on the first
   `deadlineFor` call for it in an evaluation round (in evaluation order), each plotted row just
   before its plot. Then `analysis` and `value` (or `overrun`) for every row in list order; then
   one value per queued helper job; then `plot` for every graphable visible row in list order;
   then `done`. A view-only generation reuses the cached values pass and posts only `begin`,
   `plot` and `done`. Each helper job runs once and is removed after its value is posted; an
   `evaluate` older than the latest `state` is dropped on receipt, and a `state` drops queued
   jobs of older generations, because the engine re-issues every helper after each `state`.
3. **Engine acceptance (AR-46).** `plot` and `done` must carry the latest generation sent.
   `analysis`, `value` and `overrun` are accepted when their generation is at least that of the
   latest `state` sent, because values do not depend on the view. Helper values are accepted
   only while their `jobId` is live; the engine re-issues every helper after each `state`.
   Section 7 of `01-interfaces-runtime.md` already states this rule; AR-46's wording changes
   through OI-32 ("Notes for the lead").
4. **Snapshot geometry.** A row keeps its last geometry until its new plot arrives, except: rows
   deleted, edited, hidden or no longer graphable lose it at once; `region` geometry is dropped
   on every `view` send, because its spans are in the old pixel frame; at `done` only rows
   plotted in that generation keep geometry. Section 8's `geometry` comment in
   `01-interfaces-runtime.md` already states this.
5. **Values.** A value is cleared when its row's latex or hidden flag changes. It is kept across a
   settings switch until replaced (NM-29 allows 250 ms). A row shows its value (`valueText`,
   `evaluationDisplayed`) when its kind is `value` or `definition`, with no error, no chips, no
   overrun, and once a value has arrived.
6. **History.** Entries hold the row list only; settings and the viewport are never undo steps
   (KB-5, `setView`). `"typing"` and `"keypad"` edits to one row coalesce until 1,000 ms idle,
   `endEditGroup()`, `setFocusedRow()` or any other step. `HISTORY_LIMIT = 100`; the oldest
   entry is dropped first. The 100-step limit and the coalescing of `"keypad"` edits are plan
   values, not spec values: KB-2 names typing only and no ID sets a history size ("Notes for the
   lead").
7. **Ids and colours.** UI ids come from a decimal counter. `setBlank` resets it, leaving row
   `"1"`; within one blank cycle the counter never reuses an id (the next id is one more than
   the larger of the counter and the largest decimal id present). A new row takes
   `nextSlot(its index in the list)`. Removing every row leaves one empty row.
8. **setBlank** keeps `displaySize` and `reverseContrast` and resets every other setting to
   `DEFAULT_SETTINGS`, `reducedMotion` included, as API-6 says. Hosts re-apply their AN-13
   preference with `updateSettings({ reducedMotion })` after `setBlank`, as 10's
   `resetFromBoundary` already does. `setBlank` cancels pending jobs (API-6): it posts `hello`
   with the reset seed (`options.seed ?? deps.randomSeed()`), then `state`, then `view` when the
   size is known, then a new `evaluate` (new `jobId`, current generation) for each live helper.
   Values that arrive for the old `jobId`s are ignored.
9. **setView** stores `view.viewport` as given; 08's `nextViewportForSize` owns the resize policy.
   It ignores a size with a 0 side and any viewport that is not finite and ordered. Before the
   first report the engine assumes `INITIAL_GRAPH_SIZE = { width: 800, height: 600 }`.
10. **isUserInitiated** is true for changes made through the internal UI surface (`editRow`,
    `insertRowAfter`, `deleteRow`, `clearAll`, `setRowHidden`, `setView`) and false for public
    methods. So in Phase 1, UI-driven settings, pan, zoom, undo and redo report false.
11. **Validation** is hand-written in `src/lib/calculator-v2/core/api/validate.ts`: no Zod in `core/api`, so AR-44's
    guard sees no code-generation probe. Objects are strict; unknown keys throw
    `invalid-argument`. Bounds must be finite with `left < right` and `bottom < top`, exactly
    as API-7 says, and nothing more. `setMathBounds` and `setState` then store
    `clampViewport(bounds)` (06): finite, ordered bounds outside the G-23 limits are clamped,
    not rejected, and an axis inside the limits is stored as given.
12. **Quarantine (AR-49).** The backend omits a quarantined row from every `state` it forwards
    until the row's latex differs. The engine keeps `overrun` true until the latex changes or
    an accepted `value` arrives for that row.
13. **Notification.** `subscribe` listeners run synchronously after a commit made by a method
    call, and once per frame after worker-driven changes. API-8 observers run once per frame per
    name.
14. **Engine modules.** `src/lib/calculator-v2/core/api/engine.ts` is the facade and stays at most 450 lines: the
    constructor, the public and internal members with their `destroyed` guards, the commit
    pipeline and `createEngine`. Rows, ids and history live in `document.ts`; settings, wire and
    whole-state conversion in `state.ts`; backend message handling (Decisions 3 to 5 and 12,
    geometry, the AR-45 kind check, faults) in `inbox.ts`; `RowView` and `expressionAnalysis`
    building in `results.ts`; API-8 observers in `observers.ts`; helper jobs in
    `helper-expression.ts`; the default deps in `default-deps.ts`. Step 4 of Tasks 9 to 12
    checks the line counts with `wc -l` (engine.ts at most 450, every other file at most 700).

## Notes for the lead

- **Contract edits (already landed).** Decisions 2 to 4 are already in
  `01-interfaces-runtime.md`: section 7's "Generation rule (AR-46)" paragraph (acceptance rule
  and per-generation message order) and section 8's `EngineSnapshot.geometry` comment. The lead
  landed them before wave 0 (`00-index.md` section 1). No 07 task edits
  `01-interfaces-runtime.md`; Task 11 Step 3 only checks that the text is there. `00-index.md`
  section 1 still lists "07 Task 11" among the steps that edit the `01-interfaces*.md` files;
  it now only reads them, and the lead may drop that mention.
- **Proposed open item OI-35 (major), AR-47 and AR-50 slice bound.** The lead appends it to
  `open-items.md` with the next free OI number after OI-32, replaces every "OI-35" in the
  `07-engine-worker*.md` files with that number in the plan commit (`grep -n "OI-35"` then
  prints nothing), and records the owner's decision before wave 2 starts.
  - Issue: AR-47 requires a yield "after at most 8 ms of continuous work", and AR-50 runs the
    main-thread executor "in 8 ms slices". `evaluateRows` (04) and `plotRow` (06) are
    synchronous (`01-interfaces.md` sections 4 and 5), so the executor can yield only between
    units: one values pass, one helper job, one row's plot (Decision 1). An implicit row at the
    G-15 budget (up to 250,000 evaluations) or a 100-row values pass runs well past 8 ms with no
    yield, which on the main-thread fallback blocks the quiz UI. Task 6's "AR-47 the executor
    yields after a unit once the slice is spent" and Task 7's "AR-50 the main-thread backend
    yields after each unit …" count yields between units under fake time, so they pass while
    the 8 ms bound is not met.
  - Fix, one of:
    - (a) Make `plotRow` and `evaluateRows` resumable at their deadline checks, so the executor
      can yield inside a unit. This is a contract change to `01-interfaces.md` sections 4 and 5
      owned by 04 and 06, with 07's loop consuming it; the lead re-plans 04, 06 and 07 Tasks 5
      to 7, and Task 7's `it.fails` test becomes `it`.
    - (b) Reword the IDs to unit granularity. In AR-47 replace "after at most 8 ms of continuous
      work" with "after each unit of work (one values pass, one helper evaluation or one row's
      plot) that ends 8 ms or more after its slice began". In AR-50 replace "in 8 ms slices"
      with "in the AR-47 slices". Task 7 then applies this text to
      `docs/superpowers/specs/calculator-v2/d-architecture-integration.md` in its commit (adding
      that file to its Files list) and deletes its `it.fails` test.
  - Until the decision: Task 7's `it.fails` test "AR-47, AR-50 the main-thread backend never
    runs more than 8 ms between yields (OI-35 gap)" measures the longest gap with a real clock
    on `createMainThreadBackend()` for `x^{2}+y^{2}=25` at 800×600, so the gap stays visible and
    is never reported as a pass.
- **Plan values that no spec ID sets (Decision 6).** `HISTORY_LIMIT = 100` and the coalescing of
  `"keypad"` edits come from Decision 6. KB-2 names typing only, and so does section 8's
  `editRow` comment (`// KB-2 coalesces "typing" until 1,000 ms idle or endEditGroup()`). 09
  (KB-2 owner) already tolerates either grouping ("whatever 07 does when it groups keypad
  edits"). Task 9's "API-11 the history keeps the last 100 steps" and "API-11 typing and keypad
  edits … coalesce" assert these plan values under API-11, each with a comment saying so. If
  the owner wants a different size or no keypad coalescing, only `document.ts` and those two
  tests change; the lead may also raise it as an open item for 09.
- **constant-region and 04's pending edit.** Task 3 now compiles one
  `{ kind: "rel", ops, operands, span }` node per `constant-region` row with
  `compileExpression` and reads `holds` from its `n(1)` result. It does not compile each
  operand itself and re-implement NM-22. It relies only on the first sentence of
  `01-interfaces.md` section 4's decision-6 comment: "`compileExpression` on a `rel` node gives
  `n(1)` when every link holds between real operands, else `UNDEFINED`". That sentence stays
  whichever way the edit below goes. `04-semantics.md` (header, "One edit is still pending")
  asks the lead to drop that comment's last clause ("; 07's `constant-region` compiles
  `{ kind: "rel", ops, operands, span }` with it"), giving as its reason that 07 Task 3 compiles
  each operand itself, and 04 Task 1 Step 0 checks that the clause is gone. That reason no
  longer holds. Before wave 1 the lead either keeps the clause (and drops 04's pending edit and
  its Step 0 `"ops, operands, span"` check) or drops it with 04's reason corrected. 07 is
  unaffected either way.
- **AR-4 reading.** "Only `math-field/MathField.ts` imports `vendor/mathquill`" is checked over
  `src/` and `tests/`. The only other imports allowed are `vendor/mathquill/mathquill.css?inline`
  from the harness pages under `tests/calculator/fixture/` (05, 09). A `src/` file that imports
  the CSS is flagged (Task 8).
- **Proposed open item OI-32 (major).** The lead appends it to `open-items.md` with the next
  free OI number and records the owner's decision before wave 2 starts. Task 11 applies the
  text to `docs/superpowers/specs/calculator-v2/d-architecture-integration.md`.
  - Issue: AR-46 says the main thread "discards any message whose generation is not current".
    A `view` send (every pan or zoom frame) increments the generation without changing any
    value, so a strict reading drops every value computed for the latest state and blanks the
    results until the executor re-posts them.
  - Fix: in AR-46 replace "and the main thread discards any message whose generation is not
    current." with "and the main thread discards any message whose generation is not current:
    `plot` and `done` are current only at the latest generation sent, and `analysis`, `value`
    and `overrun` messages are current while no later `state` was sent, because a view change
    does not change values."
  - If the owner rejects it: Decision 3 becomes "every message must carry the latest
    generation sent", the executor re-posts the cached values in a view-only generation, and
    Task 11's AR-46 acceptance test accepts the value only at the latest generation.
- **Assumed of 04.** `evaluateRows` keys its map by row id and does not evaluate rows with an
  analysis error. Its decision 5 calls `deadlineFor(id).check()` before each row and at every
  user-function call, where `id` is the row whose value is being computed, so `deadlineFor` can
  be called many times for one row. Task 5's `deadlineFor` therefore returns one cached deadline
  (and posts one `begin`) per row id per evaluation round, so the 250 ms clock starts once.
  Helpers parse like rows (04 decision 2): dependent definitions are zero-parameter entries of
  `analysis.functions` and are never callable, so Task 5's `runHelper` parses with
  `{ userFunctions: userFunctionNames(analysis.functions) }` (04, section 3), never with the
  keys of `analysis.functions`; after `a=2x` the helper `a(x+1)` is a product, as the row
  `a(x+1)` is. **Assumed of 06:** `plotRow` calls `deadline.check()` inside its sampling loops.
- **Section 5.3 rows.** `00-index.md` section 5.3 needs the rows below. Each contribution is a
  titled test in the contributor's own file (index section 4); 07 edits none of those files.
  - TH-10 (owner 03), required before 07 starts (03 coordination note 6):
    `| TH-10 | 03 | 07: new rows take c1…c6 then repeat in getExpressions(), core/api/engine.rows.test.ts |`.
    07's test is `it("API-2, TH-10 a new row takes the next skin colour slot")` (Task 9).
  - NM-42 (owner 07):
    `| NM-42 | 07 | 09: typed and keypad refusals, ui/list/ExpressionPanel.test.tsx and ui/keypad/key-input.test.tsx; 10: Alt+Enter row-limit refusal, shell.spec.ts; 12: over-limit transfer inserts nothing, transfer/apply.test.ts; 13: over-long paste, paste.spec.ts; 14: over-limit transfer reported only in the TR-67 region, transfer-docking.spec.ts |`.
    NM-42's typing, keypad and paste refusals (status message in the calculator's live region)
    and its transfer refusal (TR-67 region only, TR-73 message) are built by those packages.
    07's own NM-42 tests cover the API throws, the `editRow` and `insertRowAfter` refusal codes
    and the row-error limits (Tasks 9 to 11). The contributing tests, which the lead has each
    contributor title before the row lands:
    - 09, `09-editor-ui-2-list.md` Task 4 (retitled from T-13): "T-13, NM-42 a typed edit past
      2,048 characters is refused with a status message and leaves the row unchanged".
    - 09, `09-editor-ui-3-keypad.md` Task 9 (retitled from T-13): "T-13, NM-42 a keypad key at
      the 2,048-character limit is refused with the status message and leaves the row
      unchanged".
    - 10, `10-shell.md` Task 9 (already written): "NM-42 an Alt+Enter row-limit refusal
      announces the row-limit message and adds no row".
    - 12, `12-transfer-core-4-apply.md` Task 9 (retitled from TR-73): "TR-73, NM-42 a transfer
      past the row or character limit inserts nothing".
    - 13, `13-paste-standalone-4-browser.md` Task 10 (retitled from T-13): "T-13, NM-42 an
      over-long paste is refused with the status message and leaves the row unchanged".
    - 14, `14-transfer-ui.md` Task 12 Step 1 (new, in `transfer-docking.spec.ts`): "NM-42 an
      over-limit transfer inserts nothing and is reported only through the TR-67 region". It
      fills the calculator to 100 rows through the test-exposed engine, then transfers a stem
      item, and asserts that the quiz-side status region reads "This can't be added to the
      calculator.", the calculator's own live region stays empty and the row count stays 100.
  - AR-43 and AR-50 (owner 07): 13's `13-paste-standalone-5-standalone.md` Task 14 already
    titles "AR-43 the standalone page constructs its own worker.js named karman-calculator" and
    "AR-62, AR-50 the standalone page opened from file:// graphs, falling back to the main
    thread where the worker cannot start" in `tests/calculator/v2/standalone.spec.ts`, so the
    rows are
    `| AR-43 | 07 | 13: the standalone page constructs its own worker.js named karman-calculator, standalone.spec.ts |`
    and
    `| AR-50 | 07 | 13: the standalone page opened from file:// graphs, falling back to the main thread where the worker cannot start, standalone.spec.ts |`.
- `plot/golden.test.ts` and `from-analysis.test.ts` title their tests AR-44, not G-, because they
  verify that the pure pipeline runs unchanged headless. G- ownership stays with 06.
