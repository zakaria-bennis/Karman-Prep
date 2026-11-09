# Quiz bars (quiz-topbar session)

Branch: `claude/overnight-quiz-topbar-d294a2`, cut from `claude/overnight-ship` after it was
merged in. Nothing was deployed or pushed. Only the local test database was used.

## What the founder decided (8 Nov, after seeing options A, B and C)

- **Challenge questions:** option B, the painting window. Built for real.
- **The main quiz** (practice sets, Daily 10, Domain quizzes, full-length tests, diagnostic):
  not the paper look. It stays a full-screen testing app, on the quiz shell's own design, with
  the question and answer buttons unchanged. The top and bottom bars that hold the tools needed
  perfecting. Built for real.

The old A, B and C mock and its screenshots are deleted, since that choice is made.

## How to see it

- **Before and after, side by side:** open `.impeccable/mocks/quiz-topbar/index.html` in a
  browser. Pick light or dark and the screen (practice set, Daily 10, Challenge). It shows
  desktop (1440), iPad (768) and phone (390), then the one open choice below.
- **In the app:** any practice set, the Daily 10 or a Challenge question
  (`/learn/daily`, then "Answer the Math challenge").

## What changed in the real quiz

- **Top bar.** Exit, then the title, the clock in the middle with Hide, then the tools:
  Calculator, Highlight, Pencil, Reference (math only) and More. Every tool is an icon with its
  word under it, with a 48px target. Exit used to hide inside More; now it is in the bar.
- **Highlight is new in the bar.** Select words, then tap Highlight, as on Bluebook. With
  nothing selected, a short note says how. The highlight menu that appears after selecting
  text still works as before.
- **Bottom bar.** Back and Next (or Submit, Finish) carry chevrons. The navigator dots now show
  a tick for a right answer and a cross for a wrong one, so the result is not shown by colour
  alone, with "3 of 10" beside them on bigger screens. In timed sections, "Question 3 of 10"
  opens the navigator.
- **Every button presses.** It squeezes when pressed and springs back with a small overshoot.
  A second quick tap picks up from wherever the first left off. Reduced motion keeps only the
  colour change.
- **Phones fit.** Before, the bar's tools were wider than a phone, so the whole quiz stretched
  and the question and answers were cut off on the right. Now the tools take their own row
  under the top bar and nothing scrolls sideways.
- **The learn area's floating "← Today" pill and theme button** no longer sit on top of the
  quiz bar. The quiz has its own Exit.
- **Challenge questions: the painting window.** Today's Karman painting, finished and held
  still, fills the space around the question on desktop. On phone and iPad, a thin strip of it
  shows under the top bar. The bars are solid and take the painting's hue, so the painting is
  never behind any text.

Files: `src/components/learn/quiz-shell/` (TopBar, BottomBar, Timer, MoreMenu, Rewards,
QuizShell, the new PaintingWindow, icons, styles), `DailyChallenge.tsx` (turns the painting
on), `LearnLayout.tsx` (hides its floating bar during a quiz). The calculator's own files are
untouched: its bar button is restyled from the quiz shell's stylesheet.

## The one open choice (my pick is marked)

Where the tools sit on a phone. Desktop and iPad have room for one bar.

- **Under the top bar (my pick, shipped).** Like Bluebook, the tools are at the top and Back
  and Next at the bottom. The bottom stays clear for the pencil's strip and the answers.
- **Above Back and Next.** Easier to reach with a thumb, but every tool sits right under the
  answers, and the pencil's strip lands on top of them. Shown as a mock only.

Pictures: `variant-top-390-*.png` and `variant-thumb-390-*.png`. Live:
`node .impeccable/mocks/quiz-topbar/lab/server.mjs`, then open
`http://127.0.0.1:4324/?variant=top` or `?variant=thumb`.

## How I checked it

- **Before and after shots**: practice set, Daily 10 and Challenge at 390, 768 and 1440, in
  light and dark, signed in as `dev_seed_student_cohort` (`before-*.png`, `after-*.png`). No
  screen scrolls sideways after; every phone did before.
- **Every tool clicked in the real app**: practice set at 390, 768 and 1440, light and dark.
  Calculator open and close, Highlight with and without a selection (the highlight is made),
  Pencil on and off, Reference, More, Hide and Show, answering and Submit (both a right and a
  wrong answer, with the dot showing it), the navigator, Next, Back and Exit. All passed.
  Script: `.impeccable/mocks/quiz-topbar/click-app.cjs`.
- **Challenge clicked at 390, 768 and 1440**: the painting loads, sets the hue and stays still
  (pixels compared over 3 seconds), and the calculator, Pencil, Reference and Exit work.
  Script: `click-challenge.cjs`.
- **Checks**: types, lint (no errors), all unit tests (568 files), the quiz shell's browser
  tests (251 passed) and file sizes all pass. `format:check` flags three docs that came in from
  `claude/overnight-ship` (`docs/design/student-portal-laws.md`,
  `docs/design/student-portal-research-2026-11-07.md` and `docs/overnight/BRIEF.md`), which I did not touch.

## Decisions I made

- The words under the tools match their names for screen readers: Exit, Hide/Show,
  Calculator, Highlight, Pencil, Reference, More, Back, Next. "Pencil" stays as the name
  rather than "Scratch pad", so existing tests and shortcuts still match.
- Two tests opened More before Exit; they now click Exit in the bar directly.
- The Challenge painting follows the time of day, as the portal's painting does, not light or
  dark mode. At midday in dark mode it is a day painting.
- In development the painting repaints once within its first second, while it fades in, then
  never moves. I did not check a production build for this.

## For the founder

- Tools on a phone: under the top bar (shipped) or above Back and Next?
- Nothing else is waiting on you.
