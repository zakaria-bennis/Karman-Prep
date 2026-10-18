# 06 dock: open docked from the toolbar and side buttons

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On wide viewports (at least 1024 px wide and more than 500 px tall) the quiz toolbar
Calculator button and the side button open the calculator docked as the left column of the quiz;
narrower viewports open full screen. Undock, Maximize and Minimize keep working.

**IDs:** L-4.

**Owns:** the v2 `toggle` of `src/components/calculator/CalculatorScope.tsx`; L-4's cases in
`tests/calculator/v2/quiz-window.spec.ts` and `quiz-dock.spec.ts`.

## Decisions

- `toggle()` writes `{ mode: "docked", restoreMode: "docked" }` when `FULL_SCREEN_QUERY` does not
  match, before `onOpenChange(true)`. A student who undocks gets the floating window; reopening in
  the same page session follows the store, so Restore and reopening keep the last mode the student
  chose (`windowModeFor`), and only the first open of a page session docks by default.
- The v1 path is untouched (AR-8).

### Task 1: Dock on open (L-4)

**Files:** modify `CalculatorScope.tsx`; tests `CalculatorScope.test.tsx`,
`tests/calculator/v2/quiz-window.spec.ts` (the floating-on-open cases now undock first),
`quiz-dock.spec.ts`. Spec edit: amend L-4 in E: "the quiz toolbar Calculator button and the
mobile side button open the docked calculator (L-7) on wide viewports and full screen (L-11) on
narrow viewports; the first open of a page session docks, and later opens keep the mode the student
last chose".

- [ ] **Step 1: failing tests.** `it("L-4 the toolbar opens v2 docked on a wide viewport and full screen on a narrow one")` (component, fake `matchMedia`); `test("L-4 at 1280 by 800 the toolbar button docks the calculator on the left of the question")`; `test("L-4 after Undock, closing and reopening keeps the floating window")`.
- [ ] **Step 2–4:** fail, implement, pass; rerun every `quiz-*.spec.ts` on every runnable project.
- [ ] **Step 5: commit** `Open calculator v2 docked from the toolbar on wide viewports (L-4)`.
