# Quiz engine refresh: design

Status: design, written 2026-10-27, waiting for founder review.
Scope: the student question screen (`src/components/learn/`, the quiz hosts listed
below and the quiz routes under `src/app/`). No code until the founder approves this
spec and the implementation plan.

## Goal

One question screen for every quiz in Karman. It looks and behaves like Bluebook,
the College Board's digital SAT app, but in Karman's own themes and with its own
drawn and animated assets. The scratch pad becomes a pencil that writes directly on
the question and its figure. Every device gets a layout designed for it: iPhone,
iPad (portrait and landscape, with or without Apple Pencil), laptop and large
desktop.

Founder's request (2026-10-27, verbatim): "The quiz engine needs to be very similar
to Bluebooks' quiz engine, obviously maintaining our own themes and uniqueness.
Also, for the scratchpad, you should be able to write directly on the question
itself, and then it will clear when you go on to the next question. There are ways
students can draw under screens and also annotate geometry questions and whatnot.
The same applies to the reading and writing scratch pad, so it really is not really
a scratch pad. It's more like a pencil. I want it to be very mobile-friendly and
very friendly to iPad use, and also not unbearable to use for desktop. That is such
a big issue, so we need to brainstorm how to make it just the best possible
experience for all users of iPad, iPhone, laptop, and desktop."

## Founder decisions (2026-10-27)

- **Grading depends on the mode.** Practice and Your Daily 10 grade each question
  right away with its explanation. Timed sections, the diagnostic and full practice
  tests grade at the end, as Bluebook does.
- **Finger input:** the pencil button decides. With the pencil off, a finger
  scrolls, taps and selects text. With it on, a finger draws and two fingers
  scroll. Apple Pencil always draws, and once a Pencil has been seen, fingers never
  draw for the rest of the session.
- **Ink on return:** leaving a question hides its ink, and coming back brings it
  back. Ink is deleted when the section ends. Nothing is stored after that.
- **Ink placement (approach A):** ink is attached to what it was drawn on: a word,
  the figure or an answer choice. It survives rotation, window resizing and text
  size changes.
- **Pen colours:** five colours, picked by tapping the pen icon.
- **Markers:**
  - **Bookmark:** for every student, kept permanently in a "Saved questions" list.
  - **Ask my tutor:** a visible button shown only to students with a cohort
    or 1:1 tutor. Flagging also bookmarks the question.
  - **Mark for review:** the Bluebook marker, kept only for the section.
- **No default assets.** Every icon and control is drawn by Karman and has motion
  with tension. The founder approved the full motion list in the motion section,
  including the "Pick C?" chip and the figure draw-in.
- **Small wins, in the style of Khan Academy (added 2026-10-27, after the first
  review).**
  - **When:** in instant-grading modes only, a correct answer is rewarded so the
    student feels they did well, without overdoing it. There is nothing of this in
    timed sections, the diagnostic, full tests or review.
  - **What the founder chose:**
    - The bottom bar carries the reward.
    - Progress dots fill as the set goes.
    - A happy jingle plays, on by default.
    - Points count up during a set and are saved as a running total.
    - A level-up celebration plays when a skill moves up a mastery step.
  - **What he rejected:** a random pop-up word.
  - **Deferred:** a points display on the dashboard, badges and leaderboards.
  - See "Small wins".
- **Extra time** is in scope: standard, 1.5x or 2x per student, set by an admin or
  the student's tutor.
- **The "Saved questions" browsing page** is a separate follow-up design. This spec
  covers the buttons and the saved data only.

Defaults stated during design and not objected to:

- **Stroke eraser:** touching a stroke removes the whole stroke.
- **One pen width,** varied by Pencil pressure.
- **Clear needs no confirmation,** because Undo restores it.
- **Highlights and notes last for the section only.**
- **iPad portrait stacks** passage above question.

## Out of scope

- **The calculator itself** (`src/lib/calculator/`, `src/components/calculator/`).
  The screen only opens it and honours its existing dock contract (see the
  calculator section).
- **Figure design and drawing.** That belongs to the figure system in the
  coordinator's import session. This spec defines only the contract the screen
  needs from it (see the figure contract section).
- **The "Saved questions" page,** to browse and retry saved and flagged questions.
- **Question selection, adaptivity, scoring and the results pages,** beyond the
  end-of-section check page described here.
- **Deploys.** Several sessions share one Worker.

## Quiz hosts this replaces

Today there are separate question screens. All of them move onto one shell, and
their old screen code is deleted in the same change (replace, don't accumulate).

| Host                                 | Today                                                                                          | Grading | Clock |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- | ------- | ----- |
| Skill practice                       | `QuizEngine` + `quiz/ActiveQuizScreen` + `quiz/PracticeToolbar`                                | instant | up    |
| Catalog practice                     | `catalog-practice/CatalogPractice` + `CatalogQuestion` + `CatalogStudyTools`                   | instant | up    |
| Your Daily 10 and Challenge question | `DailyChallenge`, `daily/DailyLearningHub`                                                     | instant | up    |
| Diagnostic                           | `diagnostic/DiagnosticClient` + `parts/*`, `QuestionNavigator`, `HighlightablePassage`         | end     | down  |
| Timed sections and full tests        | (diagnostic path today)                                                                        | end     | down  |
| Read-only review                     | `QuizReviewQuestion`, `tutor/briefing/SavedPracticeReview`, `admin/PrivateStudentQuestionView` | locked  | none  |
| Admin preview                        | `admin/questions/preview/*`                                                                    | locked  | none  |

Deleted with the move:

- `Scratchpad.tsx` and `quiz/scratchpad.module.css`.
- The separate `HighlightTool`.
- `PassageAnnotations` and `diagnostic/HighlightablePassage`, which merge into one
  annotation module.
- `ProgressDot`.
- Every Lucide import in these files.
- Any test that only covers removed code.

`src/lib/quiz/ink.ts` (`eraseInk`, `segmentDistance`) is kept and extended.

## Modes

A host renders the shell with a mode object and nothing else decides behaviour:

```ts
type QuizMode = {
  grading: "instant" | "end" | "locked"; // locked: read-only review or preview
  clock: { kind: "up" } | { kind: "down"; baseSeconds: number } | { kind: "none" };
  markForReview: boolean; // true only when grading === "end"
  showTutorFlag: boolean; // student has a cohort or 1:1 tutor
  canBookmark: boolean; // false in admin preview
};
```

- **Instant mode:**
  - **Submit** grades the question, the explanation unfolds, and **Next** follows.
  - The navigator shows right and wrong per question (rule 56).
  - Questions not yet selected by the adaptive picker stay locked, as they are
    today.
- **End mode:**
  - **Next** and **Back** move freely, and answers can be changed until the
    section is submitted.
  - After the last question, the **check page** shows the full navigator grid
    with "Go back" and "Submit section".
  - When time runs out, the section submits itself and says so.
- **Locked mode:**
  - Answers, the correct answer and the explanation are shown, and nothing can be
    changed.
  - The pencil still works, because tutors annotate during review. Its ink is
    session-only like everywhere else.

## Screen structure

```
QuizShell (mode, questions, callbacks)
├── TopBar            section name · Timer · tools (Pencil, Annotate, Calculator, Reference, More)
├── QuestionArea      split container; owns the InkLayer for each pane
│   ├── PassagePane   passage blocks (R&W); absent for most math
│   ├── Divider       draggable on wide/medium layouts
│   └── QuestionPane
│       ├── QuestionHeader   number · Mark for review (end mode) · Bookmark · Ask my tutor · Eliminator toggle
│       ├── Stem             MathText, tables
│       ├── FigureSlot       figure engine output (see contract)
│       ├── Choices          text / math / table / figure choices, or numeric entry
│       └── Explanation      instant/locked mode only
├── BottomBar         Back · "Question 3 of 27" (opens Navigator) · Next / Submit (the one primary button)
├── Navigator         sheet (compact) or popover (medium/wide); also the end-of-section check page
├── PencilStrip       pen (+ colour arc) · eraser · undo · redo · clear
└── Popovers          highlight menu, note editor, "Pick C?" chip, More menu
```

Each part has one job and its own file:

- Shell and layout: `src/components/learn/quiz-shell/`.
- Ink logic: `src/lib/quiz/ink/`, pure functions with unit tests.
- Annotation ranges: `src/lib/quiz/annotations/`.
- Icons: `src/components/learn/quiz-shell/icons/`, our own SVG with motion.

No file goes over about 700 lines.

### Per-question workspace state

The shell keeps one `QuestionWorkspace` per question for the current section:

```ts
type QuestionWorkspace = {
  answer: string | null;
  crossedOut: Set<string>; // choice letters
  markedForReview: boolean; // end mode only
  ink: InkDocument; // see Pencil
  undo: InkOp[];
  redo: InkOp[];
  highlights: Highlight[]; // { range: AnnotationRange, color: 1|2|3, note?: string }
};
```

- **Answers** keep their existing server saving.
- **Bookmarks and flags** save to the server (see Data).
- **Ink, highlights, notes, eliminations and review marks** are session-only.
  - They are held in memory and mirrored to `sessionStorage` under the attempt id,
    so an accidental reload on an iPad does not lose a student's work.
  - They are wiped when the section is submitted, the quiz is exited, or the
    attempt ends.
  - Each `sessionStorage` read and write is wrapped in try/catch, so the screen
    works without storage.

## Device layouts

The layout is chosen by available width and pointer type, not device name. A narrow
laptop window behaves like an iPad.

| Layout  | Rule               | Typical device                                               |
| ------- | ------------------ | ------------------------------------------------------------ |
| compact | width < 700 CSS px | iPhone portrait and landscape, narrow windows                |
| medium  | 700 to 1099 px     | iPad portrait (744 to 1032), iPad mini, small laptop windows |
| wide    | at least 1100 px   | iPad landscape, laptops, desktops                            |

### Compact (iPhone)

- **One column, scrolling:** passage, then the question header, stem, figure and
  choices.
- **Top bar:** slim, with the timer centred. Pencil and Calculator are visible. More
  holds Annotate help, Reference, text size, Report a problem and settings.
- **Bottom bar:** pinned within thumb reach, with
  `env(safe-area-inset-bottom)` padding.
- **Figure choices** stack one per row.
- **Wide tables and figures** scroll sideways inside their own frame, never the page
  (rule 28).
- **Calculator:** its own phone sheet.
- **Navigator:** a bottom sheet with rubber-band overscroll.
- **Pencil strip:** sits just above the bottom bar while the pencil is on.

### Medium (iPad portrait)

- **Reading and Writing:** passage on top and question below, with a horizontal
  divider dragged up or down. Each pane scrolls on its own, and the divider
  position is remembered for the session.
- **Math:** one centred column. The calculator opens in its own sheet or floating
  mode, as its scope decides for this width.
- **Pencil strip:** floats and can be dragged to any edge.

### Wide (iPad landscape, laptop, desktop)

- **Reading and Writing:** passage on the left and question on the right, with a
  vertical divider. The divider is clamped so neither pane drops below 360 px, and
  it has a rubber-band at its limits.
- **Math:** one centred column, as in Bluebook. When the calculator docks, the shell
  shifts through the calculator's `data-calculator-dock-shift` contract.
- **Line length:** text lines are capped at about 75 characters and panes stop
  growing. On large desktops the extra space becomes margin, and the constellation
  sky shows there (rule 49).
- **Mouse and trackpad:** click-drag draws when the pencil is on, and wheel or
  two-finger scrolling always scrolls.

### Keyboard shortcuts (wide and medium with a keyboard)

Shortcuts are active only when focus is not in a text field:

| Key                | Action                     |
| ------------------ | -------------------------- |
| A to D             | Pick an answer             |
| M                  | Mark for review (end mode) |
| B                  | Bookmark                   |
| P                  | Pencil on or off           |
| E                  | Eraser                     |
| ⌘Z or Ctrl+Z       | Undo                       |
| Shift+⌘Z or Ctrl+Y | Redo                       |
| ← and →            | Back and Next              |
| Esc                | Close the open popover     |

The list is shown under More.

## Pencil

### Input routing

The routing uses Pointer Events. iOS Safari also exposes `Touch.touchType`.

| Pointer                         | Pencil off          | Pencil on                                                |
| ------------------------------- | ------------------- | -------------------------------------------------------- |
| Pen (Apple Pencil, any stylus)  | draws               | draws                                                    |
| Touch, no pen seen this session | scroll, tap, select | one finger draws; two fingers scroll (engine-driven pan) |
| Touch, pen seen this session    | scroll, tap, select | scroll, tap, select (palm rejection)                     |
| Mouse or trackpad               | select text         | click-drag draws; wheel scrolls                          |

- **Pen strokes never scroll.** A non-passive `touchstart` listener on the question
  area calls `preventDefault()` for touches with `touchType === "stylus"`. Finger
  scrolling stays native at the same time.
- **Finger-draw mode:**
  - The panes switch to `touch-action: none`, and the engine pans the pane itself
    for two-finger gestures.
  - Browser pinch-zoom is unavailable inside the panes only while finger-draw mode
    is on, and it returns when the pencil is turned off.
- **Palm rejection:**
  - Once any `pointerType === "pen"` event is seen, touch pointers never draw.
  - Touches during an active pen stroke are ignored.
  - Touches with a contact larger than 40 px are ignored for drawing.
- **Tap versus stroke:**
  - A pointer that lifts within 250 ms and moves less than 6 CSS px is a tap, not a
    dot. The engine finds the control under the point and activates it (answer
    choice, header buttons, Next).
  - Anything longer or further is a stroke.
- **Hover:** when the pen hovers (a pen `pointermove` with `buttons === 0`, on iPads
  that support Pencil hover), a small dot in the current colour previews where ink
  will land.
- **VoiceOver:** web pages cannot reliably detect it, so the engine does not try.
  While VoiceOver is on it takes over finger gestures itself, so finger drawing
  never fights it. Pencil still draws, and the pencil button is an ordinary toggle
  that VoiceOver can operate.
- **Pencil double-tap and squeeze** are not exposed to web pages. Switching between
  pen and eraser uses the strip or the E key. This is a known platform limit.

### Tools

- **Pen.** Tapping the pen icon opens a five-colour arc, and the pen remembers the
  colour for the session.
  - The colours are theme roles `--quiz-pen-1` to `--quiz-pen-5`: theme ink (the
    default), the theme accent (marigold where that is the accent), and a muted red,
    blue and green tuned per theme.
  - Each pen colour must reach at least 3:1 contrast against the pane background in
    that theme, in light and dark modes, checked by calculation.
  - No neon or pastel (rules 4, 26, 27).
  - Stroke width is 2.5 CSS px. Pencil pressure scales it from 0.6x to 1.4x, and
    mouse and finger strokes use the fixed width.
- **Eraser.** A stroke eraser using `eraseInk(..., wholeStroke = true)`.
- **Undo and Redo.** One stack per question, holding add, erase and clear
  operations.
- **Clear.** Removes this question's ink in one operation, with no confirmation,
  because Undo restores it.
- **Limits.** 500 strokes per question and 5,000 points per stroke (the existing
  `ink.ts` limits). Finished strokes are simplified (Ramer-Douglas-Peucker,
  0.5 px tolerance).

### Where ink can go

Ink can go on the passage pane and the question pane: stem, figure, choices and
blank space. It cannot go on the bars, the strip, popovers or the calculator. Pens
over those surfaces behave as pointers.

### Anchoring (approach A)

The point where a stroke starts decides its anchor. The whole stroke is stored
relative to that anchor:

```ts
type InkAnchor =
  | { kind: "figure"; figureId: string } // points in the figure's viewBox units
  | { kind: "text"; blockId: string; charOffset: number } // points in em, relative to that character's box
  | { kind: "choice"; letter: string } // points in em, relative to the choice box
  | { kind: "block"; blockId: string }; // fallback: em, relative to the block's top-left
type InkStroke = {
  id: number;
  pen: 1 | 2 | 3 | 4 | 5;
  anchor: InkAnchor;
  points: { x: number; y: number; p?: number }[];
};
type InkDocument = { strokes: InkStroke[] };
```

- **Figure.** The figure engine's root SVG supplies the viewBox mapping (see the
  figure contract). Ink stays exactly on the figure at any size.
- **Text.** At the start point, the engine uses `caretPositionFromPoint` (or the
  `caretRangeFromPoint` fallback) to find the character offset inside a text block
  marked `data-ink-block`. Points are stored in em relative to that character's
  box. On reflow, rotation or a text-size change, the stroke moves with its
  character and scales with the font size. A long stroke keeps its shape, and it is
  not re-wrapped.
- **Choice.** Points are stored relative to the choice's box, so the ink moves with
  that choice.
- **Block.** The fallback for blank space inside a block.

**Rendering:**

- Each pane has one finished-ink canvas, sized to the pane's scroll content at
  `devicePixelRatio`.
- A `ResizeObserver` on the pane and the blocks, plus font-size changes, trigger a
  re-layout of anchor positions and a redraw.
- The live stroke is drawn on a separate top canvas, using `getCoalescedEvents()`
  and `getPredictedEvents()` for low latency.
- The canvases are `aria-hidden` and have `pointer-events: none` whenever the
  pencil is off and no pen is active.

### "Pick C?" chip

When a finished stroke is roughly closed and its box contains at least half of a
choice's letter badge, a chip reading "Pick C?" springs out beside the choice.

- "Roughly closed" means the gap between start and end is less than 25% of the
  stroke's box diagonal.
- Tapping the chip selects C.
- The chip fades after 4 s or on the next stroke.
- A stroke never selects an answer by itself.

## Bluebook tools

- **Navigator.**
  - "Question 3 of 27" in the bottom bar opens a grid of the section. Each square
    shows answered, unanswered, marked for review (end mode), bookmarked, and right
    or wrong (instant mode, after grading). The current square is outlined.
  - A square's accessible name carries all of its states.
  - The navigator doubles as the end-of-section check page in end mode.
- **Question header.** In order: the question number box, Mark for review (end mode
  only), Bookmark, Ask my tutor (only if `showTutorFlag`), and the eliminator
  toggle ("ABC" with a strike, drawn by us).
- **Eliminator.**
  - When the toggle is on, each choice shows a cross-out button set at least 8 px
    away from the choice.
  - A crossed-out choice is struck and dimmed, and a second press restores it.
  - Crossing out the selected choice clears the selection, as in Bluebook.
- **Highlights and notes.**
  - With the pencil off, selecting text in the passage or stem opens a menu: three
    highlight colours (`--quiz-highlight-1..3`), Add note, and Remove.
  - A note is short plain text attached to a highlight. Tapping the highlight opens
    it.
  - On a phone, the menu sits above the selection, clear of the iOS edit menu.
  - Ranges reuse and replace the existing `annotation-ranges.ts` logic.
- **Timer.**
  - Counts up in instant mode and down in end mode. "Hide" collapses it to a clock
    icon.
  - In countdown, it shows itself again at 5:00 left, with one slow pulse and no
    flashing.
  - At 0:00 the section submits and says so.
  - Countdown length is `baseSeconds x timing multiplier` (see Data).
- **Calculator.** In math, the top bar has a Calculator button using the existing
  `CalculatorTrigger` and `CalculatorScope`, keyed by attempt and question. The
  Transfer actions on choices keep working.
- **Reference.**
  - In math, a Reference button opens the SAT math reference facts: area and
    circumference of a circle, rectangle, triangle, Pythagorean theorem, special
    right triangles, the volume formulas, and the angle and arc facts.
  - It opens as a sheet on compact and a panel on medium and wide.
  - The content is written and drawn by Karman, in theme colours, and is not copied
    from College Board artwork.
- **More menu:** text size (100% to 200%), Report a problem (content errors, for
  every student), Question animations on or off, Sounds on or off (the app-wide
  sound preference),
  keyboard shortcuts, and Exit.
  - In instant mode Exit says "Your progress is saved".
  - In end mode Exit asks for confirmation through the in-app `useConfirm()`
    dialog.

## Data

There are two small database additions, as migrations under `supabase/migrations/`.
Server actions validate inputs with Zod.

- **`student_saved_questions`.**
  - Columns: `student_id`, `question_id`, `source` (`bookmark` or `tutor_flag`),
    `created_at`, unique on `(student_id, question_id)`.
  - The RLS policy lets students read and write their own rows. Tutors and admins
    can read rows for their students.
  - Bookmark toggles a `bookmark` row. Ask my tutor writes the existing flag
    record with an optional note (today `flag_note` on the quiz response) and also
    upserts a saved row with source `tutor_flag`.
  - The plan routes every host's existing flag path through one server action.
- **Timing accommodation on the student profile.**
  - Values: `standard` (1x, the default), `time_and_half` (1.5x) or `double` (2x).
  - It can be set only by an admin or by a tutor assigned to that student, from the
    tutor's student page, through a Zod-validated server action.
  - It applies only to countdown clocks.
  - The timer shows the adjusted time with no special label.

`showTutorFlag` is computed on the server from the student's active cohort
enrollment or 1:1 tutor assignment, and passed to the shell. The plan names the
exact source tables.

- **Points.**
  - Table `student_point_awards`: `student_id` (Clerk id), `award_key` (unique
    text: `lesson:<question_responses.id>`, `catalog:<session id>:<question id>` or
    `daily:<date>:<subject>`), `points`, `created_at`. One key format covers the
    three instant-grading hosts, whose answers live in different tables.
  - The grading server action inserts the award inside the same request that
    grades, so retries cannot double-award.
  - The running total is the sum. It is computed by the view
    `student_point_totals`.
  - RLS lets students read their own rows. Tutors and admins can read their
    students' rows. Only the server writes.
- **Level-up data.** `actionCompleteQuiz` adds `bandBefore` to its result. Its
  existing `confidenceBand` is the band after. No new table is needed.

## Figure contract (with the figure system session)

The figure system draws figures, and this screen only hosts them. The screen needs
the following from it:

- **Inline SVG** with a finite `viewBox`, sized responsively by its container, and
  colours taken only from theme roles.
- **A stable `figureId`** for each figure in the question, and **named parts**
  (`data-part`) so a later tutoring tool can tell which part was marked. The pencil
  only needs the viewBox today.
- **Figure answer choices rendered at choice size,** and readable as real figures
  at the compact layout's one-per-row width.
- **A draw-in hook.** A prop or class lets the figure's lines draw themselves in
  over at most 400 ms when a question arrives. The figure is complete and inkable
  from the first frame under reduced motion, and the draw-in never hides the
  labels.
- **Wide tables** scroll inside their own frame on compact.
- **An accessible description** of each figure, used as its label.

Until the figure system lands, the shell hosts today's `FigureFrame`,
`ChartFigure`, `GeometryFigure` and `QuestionTable` through the same `FigureSlot`.
Ink on those figures anchors to their SVG viewBox when they have one, and falls
back to block anchoring for raster images.

## Look and themes

- **Colours.** Every colour is a role token that inherits the account theme
  (`html[data-theme]`). There are no hex values in the components. The quiz roles
  are:

  | Role group       | Tokens                                                              |
  | ---------------- | ------------------------------------------------------------------- |
  | Surfaces         | `--quiz-bg`, `--quiz-panel`                                         |
  | Text             | `--quiz-text`, `--quiz-text-muted`                                  |
  | Lines and states | `--quiz-line`, `--quiz-accent`, `--quiz-correct`, `--quiz-wrong`    |
  | Annotation       | `--quiz-highlight-1..3`, `--quiz-pen-1..5`                          |
  | Figures          | the figure roles in `docs/design/question-figure-theme-contract.md` |

- **Light and dark.** Dark is the default, and light works fully (rules 33 and 58).
  Every text pair meets WCAG AA in every theme, checked by a test that calculates
  contrast.
- **Right and wrong** always carry a drawn tick or cross as well as colour.
- **Materials (rules 49, 50).**
  - Panes are solid panels.
  - The bars and tool buttons use the app's liquid glass.
  - Glass never sits on glass of the same weight.
  - The constellation sky shows only in the margins on wide screens, and pauses
    while a stroke is being drawn.
- **Fonts.** The app's existing type tokens. No Inter, Geist or Space Grotesk.
- **Icons.** All are drawn by Karman, in one stroke weight and one size grid. No
  Lucide or stock sets (rules 2, 52), no emoji, no checkmark bullets.
- **Hover.** On pointer devices hover only changes colour or outline, with no hover
  animations (rule 25).
- **Loading.**
  - A skeleton of the question layout shows while a question loads (rule 29).
  - The Thinking Orb appears inside Submit only if saving takes more than 400 ms.
- **Copy.** No em dashes in any visible text.

## Motion

There is one spring family and one duration scale for everything. No motion runs
on its own while the student is reading or drawing, nothing loops, and every
motion ends within 500 ms, except the small-win rewards (bottom bar within
900 ms, level-up card within 1.6 s). With reduced motion on, or the "Question animations"
setting off, each motion becomes a fade of at most 150 ms, and the sky stands
still.

**Markers and tools**

| Element         | Motion                                                                             |
| --------------- | ---------------------------------------------------------------------------------- |
| Bookmark        | The ribbon drops with a small overshoot and settles. Removing it lifts the ribbon. |
| Ask my tutor    | The hand rises and waves once.                                                     |
| Mark for review | The marker flips in.                                                               |
| Eliminator      | The strike draws across the choice left to right. Undo retracts it.                |
| Pencil toggle   | The cap slides off the pen icon on, and snaps back on off.                         |
| Pen colours     | The five colours spring out in an arc, and the chosen colour fills the pen tip.    |
| Desktop cursor  | A small nib that tilts with the direction of movement.                             |

**Ink and highlights**

| Element        | Motion                                                              |
| -------------- | ------------------------------------------------------------------- |
| Fresh ink      | A faint wet sheen dries in about 300 ms.                            |
| Undo           | The last stroke un-draws back along its path.                       |
| Eraser         | The touched stroke shrinks back along its path.                     |
| Clear          | A left-to-right sweep wipes the ink, and Undo sweeps it back.       |
| "Pick C?" chip | Springs out beside the choice, then fades after 4 s.                |
| Highlight      | Sweeps across the words like a marker, with a slightly uneven edge. |

**Questions and choices**

| Element                | Motion                                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Answer choice press    | It gives a little and springs back. The letter badge fills from the tap point.                                                          |
| Leaving a question     | It slides out in the direction of travel with a slight tilt and scale (0.98), like turning a card. Its ink fades with it.               |
| Arriving question      | Header, then stem, then figure, then choices, staggered about 30 ms apart.                                                              |
| Figure                 | It draws in through the figure contract's hook.                                                                                         |
| Correct (instant mode) | The tick draws, the choice lifts, and a thin accent line runs once around its border.                                                   |
| Wrong (instant mode)   | The cross draws and the choice gives one small horizontal shake. Then the tick draws on the correct choice and the explanation unfolds. |

**Navigation and layout**

| Element            | Motion                                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navigator          | The grid springs up from "3 of 27", the squares settle in a quick stagger, marked squares drop their ribbons in sequence, and the current square's outline pulses once. |
| Check page         | The squares move into place before "Submit section" appears.                                                                                                            |
| Divider and sheets | Rubber-band resistance past their limits.                                                                                                                               |
| Timer              | Only the minutes roll like an odometer. Hiding folds the digits into a clock face, and the 5-minute warning is one slow pulse.                                          |

## Small wins

Modelled on Khan Academy's practice feedback, as the founder asked. The question
stays calm, and the reward lives in the bottom bar, the progress dots and the
sound. It runs only when `grading === "instant"`: practice, catalog practice, Your
Daily 10 and the Challenge question. It never runs in end mode (timed sections,
the diagnostic, full tests) or locked mode.

### Bottom-bar reward

- **On a correct answer:**
  - The bottom bar becomes the feedback bar. Its background tints to a soft
    `--quiz-correct`, and a small animated line drawing plays at its left, drawn by
    Karman in the Hairline style.
  - The drawing rotates through a set of about eight on the Karman sky theme, never
    the same one twice in a row: a constellation joining up, a rocket lifting
    past a line, a planet's ring turning once, a comet, and so on.
  - Beside the drawing sit the fixed message "Correct" and the points earned, which
    count up (for example "+10").
  - Next is the bar's primary button, right there.
  - On the question itself, only the tick draws and the choice lifts slightly.
- **On a wrong answer:**
  - The bar tints neutral, not red, with the fixed message "Not quite" and Next.
  - The correct choice gets its tick, and the explanation unfolds.
  - There is no drawing and no penalty.

### Progress dots

- **What they are:** in instant mode the bottom bar shows one dot per question in
  the set. This is the question-set indicator rule 56 asks for, and tapping the
  row opens the navigator.
- **States:**
  - The current dot is outlined.
  - A correct answer fills its dot in the accent colour with a small pop and a
    drawn tick.
  - A wrong answer fills its dot neutral with a small drawn mark.
  - Locked future questions stay hollow.
- **Long sets:** sets longer than 12 questions, or any set on compact screens
  narrower than the dots need, show "3 of 27" instead, and the dots appear in the
  navigator grid.
- **Rule 37:** the dots respond to answers, not to scrolling, so rule 37 does not
  apply.

### Streaks

- **At 3 correct in a row:** a streak counter appears in the bar with our own drawn
  flame, and its number rolls up on each further correct answer.
- **At every 5 in a row:** the bar's drawing is a richer one and the jingle is the
  longer version.
- **When it resets:** a wrong answer resets the streak quietly, with no message.
  The streak lives within one set and is not stored.

### Points

- **Earning:**
  - Each correct answer in instant mode earns 10 points.
  - A correct answer to a hard question (internal difficulty 5 to 7) earns 15.
  - The difficulty number is never shown. The student just sees a larger number,
    and the points chip turns gold.
- **Where points show:** they count up in the bar on each correct answer, and the
  set total shows on the set's results screen.
- **Who decides:** the server awards points when it grades, so the client never
  decides points.
- **Storage:** a running total is saved (see Data). The dashboard display of the
  total, badges and leaderboards are a follow-up.

### Level up

- **When the band changes:** Karman tracks a confidence band per skill
  (struggling, developing, proficient, mastered) in `learn_node_status`. The band
  is recomputed only when a skill-practice set is completed (`actionCompleteQuiz`),
  not after each answer. This was found while writing the plan, and the founder
  was told.
- **What triggers it:** `actionCompleteQuiz` returns the band before and after.
  When it moves up, the level-up card springs up from the bottom bar after the
  last question's reward, before the results screen.
- **The card:**
  - The skill's name and its new band, for example "Linear equations,
    Proficient".
  - A larger constellation drawing that connects star by star.
  - A short fanfare.
- **Limits:**
  - It plays once per band change, never for a band moving down, and only in
    skill practice, the one host that has bands.
  - Next dismisses it.
- **Perfect Daily 10:** the results screen gets the largest celebration, once.

### Sound

- **One preference:** sounds go through the existing `src/lib/sounds.ts` and its
  `sound-preference`, so the quiz's "Sounds" switch in More is that same
  preference. Sound is on by default.
- **Three jingles,** each new and made by Karman (not from a stock library):
  - Correct: about 0.6 s, three rising notes. It replaces `nodeComplete` for
    correct answers.
  - Streak: a longer version, about 1 s.
  - Level up: a fanfare, about 1.5 s.
- **Volume:** low. Sound starts only after the student's first tap, which browsers
  require anyway.
- **Never the only signal:** the tick, the bar and the screen-reader announcement
  always carry the result.

### Limits

- The reward never covers the question text (rule 34).
- No confetti over the page, no sparkle icons (rule 23) and no emoji (rule 7).
- No random words: the messages are always "Correct" and "Not quite".
- Next works at once and pressing it ends any reward in progress.
- The bar reward finishes within 900 ms and the level-up card within 1.6 s.
- Nothing loops.
- **Reduced motion or "Question animations" off:** the bar tints and shows the
  message and points with a fade, the dots fill without a pop, and the drawings
  and the level-up constellation appear as still pictures. Sound still plays
  unless it is muted.
- **Screen readers** hear one announcement, for example "Correct. Plus 10 points.
  3 in a row." or "Level up: Linear equations, Proficient."

## Accessibility

- **Keyboard.**
  - Every control is reachable with Tab and has a visible focus outline.
  - The shortcuts are listed in the layouts section.
  - Popovers close on Esc and return focus to where it was, and there are no
    keyboard traps.
- **Screen readers.**
  - **Choices** form a radio group whose names include "crossed out" when struck.
  - **Markers** are toggle buttons with `aria-pressed`.
  - **Navigator squares** carry their full state in their accessible names.
  - **Grading** is announced once, and focus moves to the explanation.
  - **The timer** announces only at 5:00 and 1:00 left and at time up, through a
    polite live region.
  - **Figures** carry the figure engine's description.
  - **Ink canvases** are hidden from assistive technology.
- **Text size.** 100% to 200% in More. The layout reflows, and ink follows its
  anchors. Pinch-zoom is never disabled outside finger-draw mode.
- **Contrast.** Text, highlights, the five pen colours and the state colours are
  checked by calculation in every theme and mode.
- **Colour.** No state uses colour alone.
- **Touch.** Every target is at least 44 x 44 px with 8 px gaps.
- **Extra time.** The timing accommodation described under Data.

## Testing

- **Unit tests** for the pure ink logic in `src/lib/quiz/ink/`: routing decisions,
  tap versus stroke, anchoring maths and re-layout, eraser, undo and redo, the
  closed-stroke test for "Pick C?", and simplification.
- **Component tests** for each part:
  - Grading, clock and locked behaviour in each mode.
  - Marker visibility rules (`showTutorFlag`, Mark for review in end mode only).
  - Eliminator rules, keyboard shortcuts, navigator states and the check page.
- **Browser tests** (Playwright, in the existing quiz test setup):
  - The four layouts at 390x844, 820x1180, 1180x820 and 1440x900, plus a narrow
    700 px laptop window.
  - No horizontal page overflow.
  - No text overlapping bars at any scroll position (rule 34).
  - Ink drawn with mouse, touch and pen pointer types.
  - Ink staying on its word after a resize, rotation and a text-size change.
  - Palm rejection after a pen event.
  - Ink clearing on leave and returning on back.
  - Light and dark themes.
- **Accessibility:** an axe scan per layout, plus a contrast test calculated across
  every theme.
- **Small wins.**
  - Component tests that rewards fire only in instant mode, that the dots fill
    correctly and switch to "3 of 27" past 12 questions, and that streaks trigger
    at 3 and 5.
  - Component tests that the points chip shows 10 or 15 from the server's award,
    that level-up fires only when the completed set's band moves up, that Next cancels a reward,
    that the sound preference is honoured, and that reduced motion leaves still
    pictures.
  - A server test that one graded response awards points exactly once.
- **Click-through:** every button and link in the shell is clicked through in a
  browser before it ships, as `CLAUDE.md` requires.
- **Real devices:** the founder checks on an iPhone and an iPad with Apple Pencil,
  because palm rejection and Pencil latency cannot be proven in an emulator.
- **Code gates:** the standard gates in `CLAUDE.md`. The calculator test suite also
  runs, because the shell hosts the calculator, even though the calculator code is
  not changed.

## Risks

- **Ink anchoring on text** is the hardest part.
  - `caretPositionFromPoint` behaves differently across Safari, Chrome and Firefox.
  - KaTeX math inside text has no character offsets, so ink there anchors to the
    math element's box.
  - The plan builds anchoring first and tests it in all three browsers before
    building on it.
- **Finger-draw mode** blocks pinch-zoom inside the panes while it is on. This is
  accepted because the student turned it on, and turning the pencil off restores
  zoom.
- **The amount of motion** is large. The single spring family, the 500 ms ceiling
  and the reduced-motion fallbacks keep it consistent. Each motion is reviewed on a
  real phone for smoothness.
- **The hosts have drifted apart.** Moving all of them onto one shell touches many
  files. The plan moves one host at a time behind the same shell, and deletes each
  old screen as its host moves.

## Follow-ups (not in this spec)

- **Points beyond the set:** the running total on the student dashboard, and any
  badges or leaderboards.
- **The "Saved questions" page,** to browse, filter (bookmarked or flagged for
  tutor) and retry. This is a separate short design.
- **Tutoring tools on figures:** shading, rotating and unfolding solids, using the
  figure engine's named parts.
