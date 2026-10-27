# Quiz Engine Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Karman's six question screens with one Bluebook-style quiz shell. The
shell has a pencil that writes on the question, layouts for each device, the Bluebook
tools, saved bookmarks and tutor flags, extra time, and Khan-style rewards.

**Architecture:**

- **Pure logic** lives in `src/lib/quiz/`, with unit tests: modes, workspace state,
  ink routing, ink operations, anchoring maths, annotations, rewards and timer.
- **React components** live in `src/components/learn/quiz-shell/`, and consume that
  logic.
- **Hosts** (skill practice, catalog practice, daily, diagnostic, review and admin
  preview) render `<QuizShell mode=… />`. Each host moves over in its own task, and
  its old screen is deleted in that task.
- **New data** is three migrations plus Zod-validated server actions.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind and CSS modules,
framer-motion (already used), Supabase (Postgres, RLS), Vitest with Testing Library,
Playwright (chromium, firefox and webkit projects), Howler through
`src/lib/sounds.ts`.

**Spec:** `docs/superpowers/specs/2026-10-27-quiz-engine-design.md`. Read it before
any task. This plan does not repeat its reasoning.

## Global Constraints

**Scope and process**

- Do not modify `src/lib/calculator/` or `src/components/calculator/`. Use only the
  `CalculatorScope`, `CalculatorTrigger`, `CalculatorChoiceAction` and
  `data-calculator-dock-shift` contracts.
- Do not deploy (no `cf:deploy`). Several sessions share the Worker.
- Replace, don't accumulate. Each host task deletes the old screen, its tests and
  its CSS in the same commit.
- **Founder gate before Task 17.**
  `src/components/calculator/transfer-call-sites.test.tsx` imports
  `ActiveQuizScreen`, `TableChoiceOption`, `CatalogQuestion` and `DailyChallenge`
  to prove the calculator's Transfer buttons appear on every answer choice.
  Deleting those screens breaks that calculator test.
  - **If the founder allows it,** the change is limited to that one test file:
    point its imports at the shell's `Choices`, and keep every assertion. No
    calculator code changes.
  - **Without that permission,** stop before Task 17 and ask.
- **Calculator imports.** `src/components/calculator/CalculatorScope.tsx` imports
  `useQuizAnimations` from `@/components/learn/quiz/QuizTools`. That export stays
  at that path for good. `src/components/learn/learn-header.ts` (checked by a
  calculator seam test) is also kept.
- Branch from `main`: `claude/quiz-engine` in a worktree. Commit after every task.

**Code rules**

- No Lucide imports anywhere under `src/components/learn/`,
  `src/components/diagnostic/` or `src/lib/quiz/`.
- No file over 700 lines (`npm run check:sizes`).
- Server actions validate inputs with Zod. `@typescript-eslint/no-unused-vars` and
  `react/no-unescaped-entities` are errors.

**Colour and copy**

- No hex colours in shell components. Every colour is a `--quiz-*` role token or a
  figure role token.
- Visible copy has no em dashes. The reward messages are exactly "Correct" and
  "Not quite". No random words, emoji or sparkle icons.

**Layout and input**

- Layout breakpoints: compact under 700 px, medium 700 to 1099 px, wide 1100 px and
  over (CSS px, available width).
- Tap versus stroke: lift within 250 ms and movement under 6 CSS px means a tap.
  Touches with a contact over 40 px are ignored for drawing.

**Pencil values**

- Pen width 2.5 CSS px. Pencil pressure scales it from 0.6x to 1.4x.
- 500 strokes per question, 5,000 points per stroke.
- Finished strokes are simplified with RDP at 0.5 px tolerance.
- "Pick C?" chip: the start-to-end gap is under 25% of the stroke box diagonal, the
  stroke box covers at least 50% of the badge, and the chip fades after 4 s.

**Motion values**

- Ordinary motion ends within 500 ms. The bar reward ends within 900 ms and the
  level-up card within 1.6 s.
- Reduced motion, or "Question animations" off, turns each motion into a fade of at
  most 150 ms.

**Rewards and timing**

- Points: 10 per correct answer in instant mode, 15 when internal difficulty is 5 to 7.
- Streak counter at 3. A richer reward at every multiple of 5.
- Progress dots for sets of 12 or fewer, "3 of 27" otherwise.
- Timing multipliers: `standard` 1, `time_and_half` 1.5, `double` 2. They apply to
  countdown only.
- Countdown warning at 300 s left. Screen-reader announcements at 300 s, 60 s and
  0 s.

**Data rules**

- Text size goes from 100% to 200% and pinch-zoom is never disabled outside
  finger-draw mode. Touch targets are at least 44 x 44 px with 8 px gaps.
- Each `sessionStorage` and `localStorage` access is wrapped in try/catch.
  Session-only state is wiped on section submit, exit or attempt end.

## Review Focus

These are the conditions most likely to break for a real student. Each one is
pinned by a test in the task named.

- **iPad rotated mid-question with ink on a passage word.** The ink must stay on
  that word after rotation and after a 150% text size, in Safari (webkit). Owned by
  Task 4 (anchoring) and Task 10 (browser test).
- **Apple Pencil writing while a palm rests on the screen and a finger scrolls.**
  The palm draws nothing, the page doesn't scroll under the Pencil, and the finger
  still scrolls. Owned by Task 2 (routing) and Task 10 (browser test with mixed
  pointer types).
- **Reload in the middle of a timed section.** Ink, highlights, eliminations and
  marks return from `sessionStorage`, and the countdown resumes from the server
  start time, not from full time. Owned by Task 1 (store) and Task 12 (timer).
- **The same answer graded twice** (double tap, network retry). Points are awarded
  once and the streak counts once. Owned by Task 15 (server award) and Task 16
  (reward reducer).
- **A tap with the pencil on, over an answer, Next or the bookmark.** It activates
  the control and leaves no dot. A circle around a choice never selects it. Owned
  by Task 2 (classifier) and Task 10 (browser test).

---

## File structure

```
src/lib/quiz/
  mode.ts                    QuizMode type + mode presets per host
  workspace.ts               QuestionWorkspace reducer + sessionStorage mirror
  ink/
    erase.ts                 (moved from src/lib/quiz/ink.ts: segmentDistance, eraseInk)
    types.ts                 InkPoint, InkStroke, InkAnchor, InkDocument, InkOp, PenIndex
    routing.ts               pointer routing, palm rejection, tap-vs-stroke
    document.ts              apply/undo/redo ops, limits, simplify
    anchor.ts                anchor maths (layout-provider interface, no DOM)
    closed-stroke.ts         "Pick C?" detection
  annotations/
    ranges.ts                (replaces components/learn/quiz/annotation-ranges.ts)
  timer.ts                   countdown/count-up maths, multipliers, warning thresholds
  rewards.ts                 reward reducer: streak, points display, dot states
src/components/learn/quiz-shell/
  QuizShell.tsx  TopBar.tsx  BottomBar.tsx  QuestionArea.tsx  Divider.tsx
  QuestionHeader.tsx  Choices.tsx  FigureSlot.tsx  Explanation.tsx  NumericEntry.tsx
  InkLayer.tsx  dom-anchors.ts  PencilStrip.tsx  PickChip.tsx
  AnnotationLayer.tsx  Navigator.tsx  CheckPage.tsx  Timer.tsx  MoreMenu.tsx  ReferenceSheet.tsx
  FeedbackBar.tsx  ProgressDots.tsx  LevelUpCard.tsx  drawings/*.tsx
  icons/*.tsx                our own animated SVG icons
  motion.ts                  spring + duration tokens, useShellMotion()
  use-quiz-layout.ts         compact | medium | wide
  use-shortcuts.ts
  quiz-shell.module.css
src/app/dev/quiz-shell/page.tsx   dev-only fixture page (notFound() in production)
tests/quiz-shell/*.spec.ts         Playwright, config playwright.quiz.config.ts
supabase/migrations/2026102800000{1,2,3}_*.sql
src/app/learn/saved-question-actions.ts, timing-actions.ts
```

---

## Phase A: logic (no UI)

### Task 1: Modes and workspace state

**Files:**

- Create: `src/lib/quiz/mode.ts`, `src/lib/quiz/workspace.ts`
- Test: `src/lib/quiz/mode.test.ts`, `src/lib/quiz/workspace.test.ts`

**Interfaces:**

- Produces:
  - `type QuizMode`, exactly as in the spec's Modes section.
  - `type HostKind = "skill" | "catalog" | "daily" | "diagnostic" | "timed" | "review" | "preview"`.
  - `modeFor(host: HostKind, opts: { baseSeconds?: number; hasTutor: boolean }): QuizMode`.
  - `type QuestionWorkspace`, as in the spec, with `crossedOut: string[]` (arrays
    serialize).
  - `type WorkspaceAction`, a union of: `answer`, `toggleCross`, `toggleReview`,
    `inkOp` (carries `InkOp`), `undo`, `redo`, `addHighlight`, `updateNote` and
    `removeHighlight`.
  - `workspaceReducer(state: Record<string, QuestionWorkspace>, questionId: string, action: WorkspaceAction): Record<string, QuestionWorkspace>`.
  - `loadWorkspaces(attemptKey: string): Record<string, QuestionWorkspace>`,
    `saveWorkspaces(attemptKey, value): void` and
    `clearWorkspaces(attemptKey): void`, under the storage key
    `karman-quiz-ws:<attemptKey>`.

**Steps:**

- [ ] **Write the mode tests.** In `mode.test.ts`:
  - `modeFor("skill",{hasTutor:false})` gives
    `{grading:"instant",clock:{kind:"up"},markForReview:false,showTutorFlag:false,canBookmark:true}`.
  - `modeFor("diagnostic",{baseSeconds:1920,hasTutor:true})` gives `grading:"end"`,
    `clock:{kind:"down",baseSeconds:1920}`, `markForReview:true` and
    `showTutorFlag:true`.
  - `modeFor("preview",…)` gives `grading:"locked"`, `clock.kind:"none"` and
    `canBookmark:false`.
- [ ] **Write the workspace tests.**
  - `toggleCross` on the selected letter clears `answer`.
  - `toggleReview` is ignored unless the action carries `allowed: true`.
  - Save, then load, round-trips.
  - Load returns `{}` when `sessionStorage.getItem` throws.
  - `clearWorkspaces` removes the key.
- [ ] **Run the tests and see them fail.** Run
      `npx vitest run src/lib/quiz/mode.test.ts src/lib/quiz/workspace.test.ts`. They
      should fail because the modules are not found.
- [ ] **Implement both modules.** Ink actions delegate to `applyInkOp` (Task 3).
      Until then, import the type only and add the stub case in Task 3.
- [ ] **Run the tests and see them pass.** Then commit with the message
      `quiz: modes and per-question workspace state`.

### Task 2: Pointer routing and palm rejection

**Files:**

- Create: `src/lib/quiz/ink/types.ts`, `src/lib/quiz/ink/routing.ts`
- Move: `src/lib/quiz/ink.ts` to `src/lib/quiz/ink/erase.ts`, and its test to
  `erase.test.ts`. Update the importers (`grep -rn "lib/quiz/ink\"" src`).
- Test: `src/lib/quiz/ink/routing.test.ts`

**Interfaces:**

- Produces:
  - `type PointerKind = "pen" | "touch" | "mouse"`.
  - `type RoutingState = { pencilOn: boolean; penSeen: boolean; activePenId: number | null; screenReaderTouch: boolean }`.
  - `type PointerSample = { kind: PointerKind; id: number; width: number; height: number; touchCount: number }`.
  - `route(state: RoutingState, p: PointerSample): "draw" | "native"`.
  - `class TapClassifier { down(x:number,y:number,t:number): void; move(x:number,y:number): "pending" | "stroke"; up(t:number): "tap" | "stroke" }`.
  - `nextRoutingState(state, p): RoutingState`. Any pen sets `penSeen`.

**Steps:**

- [ ] **Write the routing tests (`routing.test.ts`), one per row of the spec's
      routing table:**
  - A pen draws whether the pencil is on or off.
  - A touch with no pen seen draws only when the pencil is on and `touchCount===1`.
  - `touchCount===2` is `native`.
  - Once `penSeen` is true, a touch is always `native`.
  - A touch of width 41 is `native`.
  - A touch while `activePenId!==null` is `native`.
  - A mouse draws only when the pencil is on.
  - `screenReaderTouch` makes a touch `native`.
- [ ] **Write the classifier tests.**
  - Down at (0,0,t=0), move (5,0), up at t=249 gives `"tap"`.
  - Move (6,0) gives `"stroke"`.
  - Up at t=251 with no movement gives `"stroke"`.
- [ ] **Run the tests and see them fail.** Run
      `npx vitest run src/lib/quiz/ink`. Then implement `route` and `TapClassifier`
      with the values in Global Constraints.
- [ ] **Run the tests and see them pass,** including the moved `erase.test.ts`. Then
      commit with the message `quiz ink: pointer routing, palm rejection, tap vs stroke`.

### Task 3: Ink document operations

**Files:**

- Create: `src/lib/quiz/ink/document.ts`
- Modify: `src/lib/quiz/workspace.ts` (wire the `inkOp`, `undo` and `redo` cases)
- Test: `src/lib/quiz/ink/document.test.ts`

**Interfaces:**

- Consumes: `eraseInk` from `ink/erase.ts`, and the types from `ink/types.ts`.
- Produces:
  - `type PenIndex = 1|2|3|4|5`.
  - `type InkStroke = { id: number; pen: PenIndex; anchor: InkAnchor; points: {x:number;y:number;p?:number}[] }`.
  - `type InkDocument = { strokes: InkStroke[] }`.
  - `type InkOp = { kind:"add"; stroke: InkStroke } | { kind:"erase"; removed: InkStroke[] } | { kind:"clear"; removed: InkStroke[] }`.
  - `applyInkOp(doc, op): InkDocument`.
  - `invertInkOp(op): InkOp`. The inverse of add is erase, and the inverses of
    erase and clear re-add the removed strokes in their original order.
  - `simplifyStroke(points, tolerance = 0.5)`.
  - `capStroke(points)`, which keeps at most 5,000 points.
  - `MAX_STROKES = 500` and `MAX_POINTS = 5000`.

**Steps:**

- [ ] **Write the tests.**
  - add, then undo, then redo restores the same document (deep equality).
  - A clear, then undo, restores the strokes in the same order.
  - Adding a 501st stroke drops the oldest.
  - `simplifyStroke` on 100 collinear points returns the 2 endpoints.
  - `capStroke` on 6,000 points returns 5,000.
  - Workspace undo then redo around an erase restores the erased stroke.
- [ ] **Run the tests and see them fail,** implement, then run them and see them
      pass. Commit with the message `quiz ink: document ops, undo/redo, limits`.

### Task 4: Anchoring maths

**Files:**

- Create: `src/lib/quiz/ink/anchor.ts`
- Test: `src/lib/quiz/ink/anchor.test.ts`

**Interfaces:**

- Produces:
  - `type InkAnchor`, exactly as in the spec.
  - `interface AnchorLayout { figure(id): { left:number; top:number; scaleX:number; scaleY:number } | null; char(blockId, offset): { left:number; top:number; em:number } | null; choice(letter): { left:number; top:number; em:number } | null; block(blockId): { left:number; top:number; em:number } | null }`.
    All positions are pane-content pixels.
  - `type AnchorHit = { kind:"figure"; figureId; toLocal(x,y) } | { kind:"text"; blockId; charOffset } | { kind:"choice"; letter } | { kind:"block"; blockId }`.
  - `toAnchored(hit: AnchorHit, layout: AnchorLayout, screenPoints): { anchor: InkAnchor; points }`.
  - `toPane(stroke: InkStroke, layout: AnchorLayout): {x:number;y:number}[] | null`.
    It returns `null` when the anchor no longer resolves, and the caller skips the
    stroke.

**Steps:**

- [ ] **Write the round-trip tests.**
  - With a layout where the char box is at (100,40) with `em=16`, a stroke stored
    then placed returns the same pane points within 0.01.
  - When the layout moves the char to (20,200), every placed point is shifted by
    (-80,+160).
  - When `em` becomes 24 (150% text), offsets from the char origin scale by 1.5.
  - Figure anchors map through `scaleX` and `scaleY`.
  - A missing anchor returns `null`.
- [ ] **Run the tests and see them fail,** implement, then run them and see them
      pass. Commit with the message `quiz ink: content anchoring maths`.

### Task 5: Closed-stroke detection, timer maths and the reward reducer

**Files:**

- Create: `src/lib/quiz/ink/closed-stroke.ts`, `src/lib/quiz/timer.ts`,
  `src/lib/quiz/rewards.ts`
- Test: `closed-stroke.test.ts`, `timer.test.ts`, `rewards.test.ts` (alongside the
  modules)

**Interfaces:**

- Produces, in `closed-stroke.ts`:
  - `enclosedBadge(points, badge: {left,top,width,height}): boolean`, using the
    25% gap and 50% coverage values from Global Constraints.
- Produces, in `timer.ts`:
  - `type TimingAccommodation = "standard"|"time_and_half"|"double"`.
  - `limitSeconds(base:number, acc:TimingAccommodation): number`, which rounds
    down.
  - `remaining(startedAtMs:number, nowMs:number, limit:number): number`, which
    never goes below 0.
  - `announcementFor(prev:number, next:number): "5 minutes left"|"1 minute left"|"Time is up"|null`.
  - `forceShow(remaining:number): boolean`, true at 300 s or less.
- Produces, in `rewards.ts`:
  - `type RewardState = { streak:number; seenKeys: string[]; setPoints:number; dots: ("open"|"current"|"correct"|"wrong"|"locked")[] }`.
  - `type RewardEvent = { kind:"graded"; key:string; index:number; correct:boolean; points:number }`.
  - `rewardReducer(state, ev): RewardState`. A repeated `key` is ignored.
  - `rewardFor(state): { tier:"none"|"correct"|"streak5"; showStreak:boolean }`.
  - `useDots(length:number): boolean`, which returns `length <= 12`.

**Steps:**

- [ ] **Write the tests.**
  - A circle around the badge is true, and an open "C" curve with a gap over 25%
    is false.
  - `limitSeconds(1920,"time_and_half")===2880` and
    `limitSeconds(1920,"double")===3840`.
  - Remaining time after a reload uses `startedAt`, so a start 100 s ago with a
    1920 s limit gives 1820.
  - `announcementFor(301,300)` is "5 minutes left", `announcementFor(61,60)` is
    "1 minute left", and `announcementFor(1,0)` is "Time is up".
  - The same key graded twice changes nothing.
  - The streak reaches 3, and then `showStreak` is true.
  - Streak 5 and streak 10 give the tier `streak5`.
  - A wrong answer resets the streak to 0.
  - `useDots(12)` is true and `useDots(13)` is false.
- [ ] **Run the tests and see them fail,** implement, then run them and see them
      pass. Commit with the message `quiz: closed-stroke, timer and reward logic`.

## Phase B: the shell

### Task 6: Theme roles and contrast test

**Files:**

- Modify: `src/app/globals.css`. Add the `--quiz-*` roles for every
  `html[data-theme="…"]` block, in both light and dark.
- Create: `src/lib/quiz/theme-roles.test.ts`

**Interfaces:**

- Produces these CSS custom properties:
  - Surfaces: `--quiz-bg` and `--quiz-panel`.
  - Text: `--quiz-text` and `--quiz-text-muted`.
  - Lines and states: `--quiz-line`, `--quiz-accent`, `--quiz-correct`,
    `--quiz-correct-soft` and `--quiz-wrong`.
  - Annotation: `--quiz-highlight-1..3` and `--quiz-pen-1..5`.

**Steps:**

- [ ] **Write the contrast test.** It parses `globals.css`, resolves each theme's
      `--quiz-*` values (hex, rgb or oklch, through a small parser in the test), and
      checks, for every theme and mode:
  - `--quiz-text` on `--quiz-panel` is at least 4.5.
  - `--quiz-text-muted` on `--quiz-panel` is at least 4.5.
  - Each `--quiz-pen-n` on `--quiz-panel` is at least 3.
  - `--quiz-text` on each `--quiz-highlight-n` is at least 4.5.
  - `--quiz-accent` on `--quiz-panel` is at least 3.
- [ ] **Run the test and see it fail** (the roles are missing). Add the roles for
      each theme:
  - Pen 1 is the theme ink and pen 2 is the theme accent.
  - Pens 3 to 5 are a muted red, blue and green, tuned per theme until the test
    passes.
  - Nothing neon or pastel (rules 26, 27).
- [ ] **Run the test and see it pass.** Run `npm run calculator:check` as well, to
      prove the calculator theme output is unchanged. Commit with the message
      `quiz: theme roles with calculated contrast`.

### Task 7: Motion tokens and our own icon set

**Files:**

- Create: `quiz-shell/motion.ts`, and in `quiz-shell/icons/`: `Bookmark.tsx`,
  `Flag.tsx`, `ReviewMark.tsx`, `Eliminator.tsx`, `Pen.tsx`, `Eraser.tsx`,
  `Undo.tsx`, `Redo.tsx`, `Clear.tsx`, `Calculator.tsx`, `Reference.tsx`,
  `More.tsx`, `Clock.tsx`, `Flame.tsx`, `Tick.tsx` and `Cross.tsx`.
- Test: `quiz-shell/icons/icons.test.tsx`

**Interfaces:**

- Produces, in `motion.ts`:
  - `SPRING = { stiffness: 520, damping: 32, mass: 1 }`, the one spring family.
  - `DUR = { fast: 0.15, base: 0.3, max: 0.5, reward: 0.9, levelUp: 1.6 }`.
  - `useShellMotion(): { reduced: boolean }`. It is true when
    `prefers-reduced-motion` is set or `useQuizAnimations()` is false. Import
    `useQuizAnimations` from `quiz/QuizTools.tsx`, where it stays because the
    calculator imports it from there.
- Produces, for each icon: `<Icon state?: "on"|"off" size?: number title?: string />`.
  - One stroke weight (1.75) on a 24 grid, using `currentColor`.
  - The motion for each state change is from the spec's Motion tables (the
    bookmark ribbon drop, the flag raise and wave, the pen cap, the eliminator
    strike).
  - Under `reduced`, state changes are fades of 150 ms or less.

**Steps:**

- [ ] **Write the icon tests.**
  - Each icon renders an `svg` with `aria-hidden="true"` unless it has a `title`.
  - No `fill` or `stroke` attribute contains a hex colour.
  - A grep test confirms that no file in `quiz-shell/` imports `lucide-react`.
- [ ] **Run the tests and see them fail,** draw the icons, then run them and see
      them pass.
- [ ] **Commit,** with the message `quiz shell: motion tokens and Karman icon set`.
      Review the icons visually in Task 8's fixture page before Task 8 is committed.

### Task 8: Layout, shell frame and fixture page

**Files:**

- Create: `quiz-shell/use-quiz-layout.ts`, `QuizShell.tsx`, `TopBar.tsx`,
  `BottomBar.tsx`, `QuestionArea.tsx`, `Divider.tsx` and `quiz-shell.module.css`
- Create: `src/app/dev/quiz-shell/page.tsx` (fixture: one R&W passage question,
  one math question with a geometry figure, one with table choices, one numeric
  entry, a 27-question end-mode set, and a 10-question instant set). It calls
  `notFound()` when `process.env.NODE_ENV === "production"`.
- Create: `playwright.quiz.config.ts`, with chromium, firefox and webkit projects,
  plus `mobile-safari` (iPhone 15 Pro Max) and `ipad` (iPad Pro 11 in both
  orientations), against `npm run dev:next`.
- Add the script `"test:quiz": "playwright test --config=playwright.quiz.config.ts"`.
- Test: `tests/quiz-shell/layout.spec.ts`

**Interfaces:**

- Produces:
  - `useQuizLayout(): "compact" | "medium" | "wide"`, by available width.
  - `<QuizShell mode: QuizMode; questions: StudentQuizQuestion[]; attemptKey: string; index: number; onNavigate(i:number); onSelectAnswer(qid:string, a:string); onSubmit(); onFinish(); reviews: Record<string, StudentQuizReview>; startedAtMs?: number; accommodation?: TimingAccommodation; hasCalculator: boolean; slots?: { explanation?: ReactNode } />`.
  - The panes carry `data-quiz-pane="passage"|"question"`, and the shell root
    carries `data-calculator-dock-shift` on wide.

**Steps:**

- [ ] **Write the layout spec (Playwright).** At 390x844, 820x1180, 1180x820,
      1440x900 and 700x900:
  - `document.documentElement.scrollWidth <= innerWidth`.
  - R&W is a single column on compact, stacked panes on medium and side-by-side on
    wide.
  - Math is a single centred column at every size.
  - The bottom bar's bounding box does not intersect any text box at 10 scroll
    steps (rule 34).
  - The divider clamps both panes to 360 px or more on wide.
- [ ] **Run the spec and see it fail.** Run `npm run test:quiz -- layout`, then
      implement the frame, bars and divider:
  - The divider has a rubber-band at its limits, using `SPRING`.
  - The bars and tool buttons use the app's existing liquid-glass utility, and the
    panes are solid `--quiz-panel`.
  - On wide, the existing constellation sky component shows in the margins only,
    and pauses while `InkLayer` reports an active stroke.
  - A question skeleton shows while the questions load (rule 29).
  - Question change: the old question slides out in the direction of travel with
    a 0.98 scale and a slight tilt, and the new one staggers in (header, stem,
    figure, choices) about 30 ms apart. Under `reduced`, both are fades.
- [ ] **Run the spec and see it pass** on all projects. Commit with the message
      `quiz shell: device layouts and frame`.

### Task 9: Question pane: header, choices, figure slot, eliminator, shortcuts

**Files:**

- Create: `QuestionHeader.tsx`, `Choices.tsx`, `FigureSlot.tsx`, `Explanation.tsx`,
  `NumericEntry.tsx` and `use-shortcuts.ts`
- Test: `quiz-shell/QuestionPane.test.tsx`, `tests/quiz-shell/shortcuts.spec.ts`

**Interfaces:**

- Consumes: `workspaceReducer` (Task 1), the icons (Task 7) and `QuizMode`.
- Produces:
  - `<FigureSlot question />`. It renders today's `FigureFrame`, `ChartFigure`,
    `GeometryFigure` and `QuestionTable` through the existing `drawnFigure` and
    `figureLeadsText` helpers.
  - It marks the figure root with `data-ink-figure="<figureId>"` and passes
    `drawIn={!reduced}` when the component supports it.
  - Text blocks are marked `data-ink-block="<blockId>"`. Each choice is marked
    `data-ink-choice="<letter>"` and its badge `data-choice-badge`.

**Steps:**

- [ ] **Write the component tests.**
  - Choices form a `radiogroup`, and a crossed-out choice's accessible name ends
    in ", crossed out".
  - With the eliminator on, crossing out the selected choice clears the selection.
  - Mark for review renders only when `mode.markForReview`.
  - Flag renders only when `mode.showTutorFlag`.
  - The header buttons have `aria-pressed`.
  - In locked mode, choices are disabled and the correct choice shows `Tick`.
  - Calculator Transfer actions still render on text choices when `hasCalculator`
    is true.
  - The Submit button shows the existing Thinking Orb only after 400 ms of pending
    save.
  - Pressing a choice uses the press-and-spring motion. Hover changes colour and
    outline only, with no transform.
- [ ] **Write `shortcuts.spec.ts`.**
  - A to D select, M marks (end mode), B bookmarks, P toggles the pencil, E picks
    the eraser, the arrows navigate, and Esc closes a popover.
  - No shortcut fires while focus is in the numeric entry.
- [ ] **Run them and see them fail,** implement, then run them and see them pass.
      Commit with the message `quiz shell: question pane, eliminator, shortcuts`.

### Task 10: The pencil: ink layer, strip, colour arc, hover, "Pick C?"

**Files:**

- Create: `InkLayer.tsx`, `dom-anchors.ts`, `PencilStrip.tsx` and `PickChip.tsx`
- Test: `tests/quiz-shell/pencil.spec.ts`, `quiz-shell/dom-anchors.test.ts`

**Interfaces:**

- Consumes: `route`, `nextRoutingState` and `TapClassifier` (Task 2);
  `applyInkOp`, `simplifyStroke` and `capStroke` (Task 3); `toAnchored`, `toPane`
  and `AnchorLayout` (Task 4); and `enclosedBadge` (Task 5).
- Produces:
  - `createDomLayout(pane: HTMLElement): AnchorLayout`, which reads
    `data-ink-*` elements.
  - `hitTest(pane, clientX, clientY): AnchorHit`, which uses
    `document.caretPositionFromPoint`, then `caretRangeFromPoint`. KaTeX nodes
    (`.katex`) anchor as `block`.
  - `<InkLayer pane="passage"|"question" />`, with two canvases (finished and
    live) at `devicePixelRatio`.
  - `<PencilStrip />`, with pen (opening the 5-colour arc), eraser, undo, redo and
    clear. It is draggable to any edge on medium and wide, and docked above the
    bottom bar on compact.

**Implementation notes:**

- **Pen strokes never scroll.** A non-passive `touchstart` on the pane calls
  `preventDefault()` when `touches[i].touchType === "stylus"`.
- **Finger-draw mode** sets `touch-action: none` on the panes, and the engine pans
  two-finger moves with `scrollBy`.
- **A tap from the classifier** dispatches `.click()` on the closest
  `button, [role=radio], a` under the point.
- **Live drawing** uses `getCoalescedEvents()` and `getPredictedEvents()` (the
  predicted points are drawn but not stored).
- **Re-layout** happens on `ResizeObserver` of the pane and the blocks, and on a
  text-size change.
- **The hover dot** shows on a pen `pointermove` with `buttons===0`.

**Steps:**

- [ ] **Write `pencil.spec.ts`.** Pointer events are dispatched with
      `pointerType` pen, touch or mouse through `page.dispatchEvent`, or CDP
      `Input.dispatchTouchEvent` for touch. The tests:
  - A pen stroke on a passage word adds one stroke, and the pane `scrollTop` is
    unchanged.
  - A touch then draws nothing.
  - Two-finger touch scrolls.
  - A 4 px pen tap on choice B selects B, with no stroke added.
  - A pen circle around badge C shows "Pick C?" and does not select C. Clicking
    the chip selects C, and the chip is gone 4 s after appearing.
  - Mouse draws only with the pencil on.
  - After drawing on a word, the viewport changes 1180x820 to 820x1180 and the text
    size goes to 150%. The stroke's first point is still within 4 px of that word's
    box. Run this on webkit, chromium and firefox.
  - Ink is hidden after Next and visible again after Back.
  - The eraser removes the touched stroke. Undo restores it, and redo removes it
    again.
  - Clear, then undo, restores everything.
  - The colour arc shows 5 swatches, picking swatch 4 draws in `--quiz-pen-4`, and
    the choice persists to the next question.
- [ ] **Write `dom-anchors.test.ts` (jsdom with a stubbed `caretPositionFromPoint`).**
      KaTeX hits return a `block` anchor.
- [ ] **Run them and see them fail,** implement, then run them and see them pass
      on all Playwright projects.
- [ ] **Commit,** with the message `quiz shell: pencil with anchored ink`.

### Task 11: Highlights and notes

**Files:**

- Create: `src/lib/quiz/annotations/ranges.ts` (moved and extended from
  `components/learn/quiz/annotation-ranges.ts`) and `AnnotationLayer.tsx`
- Test: `src/lib/quiz/annotations/ranges.test.ts` and
  `tests/quiz-shell/annotate.spec.ts`

**Interfaces:**

- Produces:
  - `type AnnotationRange = { blockId: string; start: number; end: number }`.
  - `rangeFromSelection(sel: Selection): AnnotationRange | null`.
  - `mergeRanges(list): AnnotationRange[]`.
  - `<AnnotationLayer />`. With the pencil off, a selection inside
    `data-ink-block` opens a menu with highlight 1 to 3, Add note and Remove. The
    highlight sweep uses `SPRING`.

**Steps:**

- [ ] **Write the tests.**
  - Overlapping ranges merge.
  - A selection across two blocks splits per block.
  - Highlighting stores the range in the workspace.
  - A note round-trips.
  - Remove deletes it.
  - On 390x844, the menu's box sits above the selection's box.
  - With the pencil on, dragging draws and never opens the menu.
- [ ] **Run the tests and see them fail,** implement, then run them and see them
      pass. Commit with the message `quiz shell: highlights and notes`.

### Task 12: Navigator, check page, timer, More menu, reference sheet, calculator

**Files:**

- Create: `Navigator.tsx`, `CheckPage.tsx`, `Timer.tsx`, `MoreMenu.tsx` and
  `ReferenceSheet.tsx`
- Modify: `TopBar.tsx` (wire `CalculatorTrigger` and `CalculatorScope` keyed by
  `${attemptKey}:${questionId}`)
- Test: `quiz-shell/Navigator.test.tsx`, `quiz-shell/Timer.test.tsx` and
  `tests/quiz-shell/tools.spec.ts`

**Interfaces:**

- Consumes: `limitSeconds`, `remaining`, `announcementFor` and `forceShow`
  (Task 5), and `useConfirm()` from `src/components/shared/ConfirmDialog.tsx`.
- Produces:
  - `<Navigator questions workspaces reviews index mode onJump />`. Each square's
    name is `"Question 4, answered, marked for review"`, plus `", correct"` or
    `", wrong"` in instant mode after grading.
  - `<CheckPage onBack onSubmit />`, in end mode after the last question.
  - `<Timer mode startedAtMs accommodation onExpire />`.

**Steps:**

- [ ] **Write the navigator tests.**
  - The state names are correct.
  - Squares for unselected adaptive questions are disabled.
  - The current square has `aria-current="true"`.
- [ ] **Write the timer tests (fake timers).**
  - A hidden timer re-shows at 300 s.
  - The polite live region announces only at 300 s, 60 s and 0 s.
  - `onExpire` fires once at 0.
  - `double` doubles the limit.
- [ ] **Write `tools.spec.ts`.**
  - In end mode, Next on the last question opens the check page, and "Submit
    section" calls `onFinish`.
  - Exit in end mode asks for confirmation, and Exit in instant mode does not.
  - Reference opens a sheet on 390x844 and a panel on 1440x900.
  - Text size 200% reflows with no horizontal overflow.
  - The More menu holds Text size, Report a problem, Question animations, Sounds
    (the app-wide `sound-preference`, shown only in instant modes), Keyboard
    shortcuts (only with a fine pointer) and Exit.
  - Report a problem posts through `actionReportProblem` (Task 14).
  - The calculator docks on 1440x900, and the question column moves right
    (left edge greater than dock width).
- [ ] **Run them and see them fail,** implement, then run them and see them pass.
      The reference sheet's content is the facts listed in the spec, drawn with our
      own SVG in theme roles.
- [ ] **Run `npm run test:calculator`** and check that it passes unchanged. Then
      commit with the message `quiz shell: navigator, check page, timer, tools`.

## Phase C: data

### Task 13: Migrations

**Files:**

- Create:
  - `supabase/migrations/20261028000001_student_saved_questions.sql`
  - `supabase/migrations/20261028000002_timing_accommodation.sql`
  - `supabase/migrations/20261028000003_student_point_awards.sql`
- Test: `src/lib/quiz/migrations.test.ts`. This is a SQL text check, the same
  pattern as the existing migration tests. If none exist, assert the statements
  below with regexes.

**Schema** (idempotent, matching repo style; RLS uses
`(SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')`):

- **`public.student_saved_questions`.**
  - Columns: `student_id TEXT NOT NULL` (Clerk id), `question_id UUID NOT NULL`,
    `source TEXT NOT NULL CHECK (source IN ('bookmark','tutor_flag'))`,
    `created_at TIMESTAMPTZ DEFAULT now()`, and
    `PRIMARY KEY (student_id, question_id)`.
  - RLS: the student selects, inserts and deletes their own rows. Tutors select
    rows for students linked through `tutor_assignments.student_user_id` or
    `cohort_members` of a cohort whose `tutor_user_id` is theirs. Admins select
    all.
- **`public.users`.** `ADD COLUMN IF NOT EXISTS timing_accommodation TEXT NOT NULL DEFAULT 'standard' CHECK (timing_accommodation IN ('standard','time_and_half','double'))`.
- **`public.student_point_awards`.**
  - Columns: `award_key TEXT PRIMARY KEY`, `student_id TEXT NOT NULL`,
    `points SMALLINT NOT NULL CHECK (points IN (10,15))`, and
    `created_at TIMESTAMPTZ DEFAULT now()`.
  - Index on `student_id`.
  - RLS select works the same as saved questions. There are no client insert
    policies, because only the service role writes.
  - View `public.student_point_totals(student_id, total)`.

**Steps:**

- [ ] **Write the text test, run it and see it fail,** write the SQL, then run it
      and see it pass.
- [ ] **Apply locally** with `npm run db:push`, against the local Supabase only.
      Confirm with `npm run db:status`. Production is applied only by `db-deploy.yml`
      on merge to `main`.
- [ ] **Commit,** with the message
      `db: saved questions, timing accommodation, point awards`.

### Task 14: Server actions: bookmark, tutor flag, timing, has-tutor

**Files:**

- Create: `src/app/learn/saved-question-actions.ts`,
  `src/app/tutor/timing-actions.ts` and `src/lib/quiz/has-tutor.ts`
- Modify: the tutor student page under `src/app/tutor/[studentId]/` (add a
  three-option timing control; find the page with
  `ls src/app/tutor/\[studentId\]`)
- Test: `saved-question-actions.test.ts`, `timing-actions.test.ts` and
  `has-tutor.test.ts`

**Interfaces:**

- Produces:
  - `actionToggleBookmark({ questionId: string }): Promise<{ saved: boolean }>`.
  - `actionFlagForTutor({ questionId: string; nodeId: string | null; note: string | null }): Promise<void>`.
    It inserts into `flagged_questions`, the existing `flagQuestion` path, when
    `nodeId` is set, and always upserts a saved row with source `tutor_flag`.
    `actionFlagQuestion` in `quiz-actions.ts` is deleted and its callers move to
    this action.
  - `actionSetTimingAccommodation({ studentUserId: string; value: TimingAccommodation })`.
    The caller must be an admin or the tutor linked to that student. Otherwise it
    throws "Not allowed".
  - `actionReportProblem({ questionId: string; nodeId: string | null; note: string })`.
    It writes the existing `flagged_questions` row (note required, 1 to 2,000
    characters) and does not save the question.
  - `hasTutor(clerkId: string): Promise<boolean>`. It is true when the student
    has an active `cohort_members` row or a `tutor_assignments` row.

**Steps:**

- [ ] **Write the tests (mocked Supabase, the repo's existing pattern).**
  - Zod rejects a non-uuid `questionId`.
  - Toggling twice ends unsaved.
  - A flag writes both rows.
  - A tutor not linked to the student gets "Not allowed".
  - A tutor who is linked succeeds.
  - `hasTutor` is false with no links.
- [ ] **Run them and see them fail,** implement, then run them and see them pass.
      Commit with the message
      `learn: bookmark, tutor flag, timing accommodation actions`.

### Task 15: Points awards and level-up data

**Files:**

- Create: `src/lib/quiz/points.ts`
- Modify:
  - `src/app/learn/quiz-actions.ts` (`actionRecordResponse` and
    `actionCompleteQuiz`)
  - `src/app/learn/catalog-quiz-actions.ts` (`actionSubmitCatalogPractice`)
  - `src/app/learn/daily-challenge-actions.ts` (`actionReviewDailyAnswer`)
  - `src/types/quiz.ts` (`StudentQuizReview` gains `points: 0 | 10 | 15`)
- Test: `src/lib/quiz/points.test.ts`, plus extend the existing action tests.

**Interfaces:**

- Produces:
  - `pointsFor(correct: boolean, difficulty: QuizDifficultyLevel): 0 | 10 | 15`.
  - `awardPoints(key: string, clerkId: string, points: 10 | 15): Promise<10 | 15 | 0>`.
    It does `INSERT … ON CONFLICT (award_key) DO NOTHING` and returns 0 when the
    row already existed.
- Award keys: `lesson:<question_responses.id>`,
  `catalog:<sessionId>:<questionId>` and `daily:<YYYY-MM-DD>:<subject>`.
- `actionCompleteQuiz` returns `{ …existing, bandBefore: ConfidenceBand | null }`.
  It reads `learn_node_status.confidence_band` before `completeQuizAttemptAtomic`.

**Steps:**

- [ ] **Write the tests.**
  - `pointsFor(true,4)===10`, `pointsFor(true,5)===15` and `pointsFor(false,7)===0`.
  - Recording the same response twice returns `points:10`, then `points:0`.
  - `actionCompleteQuiz` returns `bandBefore` from the pre-read.
  - The catalog and daily actions return `points`.
- [ ] **Run them and see them fail,** implement, then run them and see them pass.
      Commit with the message `learn: server-awarded points and band before/after`.

## Phase D: rewards

### Task 16: Feedback bar, progress dots, streak, level-up, sounds

**Files:**

- Create: `FeedbackBar.tsx`, `ProgressDots.tsx`, `LevelUpCard.tsx` and
  `drawings/` (8 Hairline-style line drawings: constellation, rocket, ring,
  comet, orbit, satellite, telescope, shooting line; plus a larger
  `LevelUpConstellation.tsx`)
- Create sound files `public/sounds/correct.mp3`, `streak.mp3` and `levelup.mp3`.
  They are our own synthesized tones, generated by a script in `scripts/sounds/`
  with an offline Web Audio render or a node synth, and are about 0.6 s, 1 s and
  1.5 s at low volume.
- Modify `src/lib/sounds.ts`. Add the `SoundName` values `"correct"`,
  `"correctStreak"` and `"levelUp"`. Remove `"nodeComplete"` if nothing else uses
  it after this task (`git grep nodeComplete`).
- Test: `quiz-shell/rewards.test.tsx` and `tests/quiz-shell/rewards.spec.ts`

**Interfaces:**

- Consumes: `rewardReducer`, `rewardFor` and `useDots` (Task 5); the `points` on
  `StudentQuizReview` (Task 15); and `bandBefore` and `confidenceBand` (Task 15).
- Produces:
  - `<FeedbackBar result: "correct"|"wrong"|null points tier onNext />`.
    "Correct" plus the count-up `+10` or `+15`, where 15 turns the chip gold. A
    random drawing is used, never the same twice in a row. "Not quite" is
    neutral.
  - `<ProgressDots states onOpenNavigator />`.
  - `<LevelUpCard skill band onDone />`.

**Steps:**

- [ ] **Write the component tests.**
  - In end mode and locked mode, `FeedbackBar` never renders.
  - The text is exactly "Correct" or "Not quite".
  - Two consecutive correct answers use different drawings.
  - Next during the reward calls `onNext` and unmounts the animation.
  - With `reduced`, the drawings render as static (no `animate` props).
  - The sound plays only when `soundEnabled()`, and the sound name is
    `correctStreak` at streak 5.
  - `LevelUpCard` renders only when `rank(after) > rank(before)`.
  - The live region text is "Correct. Plus 10 points. 3 in a row.".
- [ ] **Write `rewards.spec.ts`.**
  - On 390x844, the bar reward's box never intersects the question text boxes.
  - The dots fill on correct answers.
  - A 27-question set shows "3 of 27".
- [ ] **Run them and see them fail,** implement, then run them and see them pass.
      Commit with the message `quiz shell: Khan-style rewards and sounds`.

## Phase E: hosts (each task deletes the old screen it replaces)

Each host task follows the same steps:

- [ ] **Change the host test first.** Update its existing tests to drive
      `QuizShell` (Submit, Next, the navigator), and run them to see them fail.
- [ ] **Render the shell.** Render `<QuizShell mode={modeFor(host, …)} … />` from
      the host and pass `hasTutor` from the server page.
- [ ] **Delete the old files.** Delete the files listed, then
      `git grep` the deleted symbols and fix every importer.
- [ ] **Run the gates.** Run `npx tsc --noEmit`, `npm test`, `npm run lint` and
      `npm run test:quiz`, and see them pass.
- [ ] **Click through.** Click every button on the host route in the browser
      preview at 390x844 and 1440x900.
- [ ] **Commit,** with the message `quiz: <host> moves to the shared shell`.

### Task 17: Skill practice

- Host: `src/components/learn/QuizEngine.tsx` (with `QuizContext`).
- Delete:
  - `quiz/ActiveQuizScreen.tsx` and its test.
  - `quiz/PracticeToolbar.tsx` and `quiz/ProgressDot.tsx`.
  - `Scratchpad.tsx` with `Scratchpad.test.tsx` and `quiz/scratchpad.module.css`.
  - `quiz/PassageAnnotations.tsx` and its test.
  - `quiz/annotation-ranges.ts`.
  - The `HighlightTool`, `PracticeTimer` and `TimerToggle` exports in
    `quiz/QuizTools.tsx`.
- **Also check:** the level-up card shows after the last question when
  `actionCompleteQuiz` returns a higher band.

### Task 18: Catalog practice

- Host: `catalog-practice/CatalogPractice.tsx`.
- Delete: `CatalogQuestion.tsx` with its test, and `CatalogStudyTools.tsx`. Update
  `CatalogPractice.preview-tools.test.tsx` to the shell.

### Task 19: Your Daily 10 and Challenge question

- Hosts: `DailyChallenge.tsx` and `daily/DailyLearningHub.tsx`.
- **Also check:** a perfect Daily 10 plays the results celebration once.
- Delete: the inline question rendering in `DailyChallenge.tsx`.

### Task 20: Diagnostic, timed sections and full tests (end mode)

- Host: `src/components/diagnostic/DiagnosticClient.tsx` with
  `_hooks/useDiagnosticState.ts`.
- **Countdown:**
  - Pass `startedAtMs` from the server attempt and `accommodation` from
    `users.timing_accommodation`.
  - `onExpire` submits the section and shows "Time is up. Your section was
    submitted."
- **On submit:** call `clearWorkspaces(attemptKey)`.
- Delete:
  - `parts/AnswerChoiceButton.tsx`, `parts/DiagnosticHeader.tsx` (with its test),
    `parts/PassageMarkTools.tsx` and `parts/ExitConfirmModal.tsx`.
  - `QuestionNavigator.tsx`, `HighlightablePassage.tsx` and `HintButton.tsx`.
  - `DiagnosticTools.test.tsx`, or rewrite it against the shell.

### Task 21: Review and preview hosts; final sweep

- **Hosts, in locked mode:** `QuizReviewQuestion.tsx`,
  `tutor/briefing/SavedPracticeReview.tsx`,
  `admin/PrivateStudentQuestionView.tsx`,
  `app/admin/questions/preview/QuestionPreview.tsx` and
  `rapid/RapidReviewClient.tsx`.
- **Delete** what each replaced.
- **Trim `quiz/QuizTools.tsx`** to the animation preference only:
  `useQuizAnimations` and its storage helpers, which the calculator imports. The
  "Question animations" switch moves into `MoreMenu`.
- **Sweep:**
  - `git grep -n "lucide-react" -- src/components/learn src/components/diagnostic src/lib/quiz`
    must be empty.
  - `git grep -n "bg-night\|text-ivory\|border-bronze" -- src/components/learn/quiz-shell`
    must be empty.
- **Full gates:**
  - `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm test`,
    `npm run check:sizes` and `npm run cf:build`.
  - `npm run sync:taxonomy` followed by `git diff --exit-code`.
  - `npm run test:calculator` and `npm run test:quiz` (all projects).
- **Hand to the founder** for the real-device check on an iPhone and an iPad with
  Apple Pencil (palm rejection, latency, hover dot). No deploy.
- Commit with the message `quiz: review hosts on the shell; remove old screens`.
