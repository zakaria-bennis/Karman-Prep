# Quiz top bar options (quiz-topbar session)

Branch: `claude/overnight-quiz-topbar-d294a2`. Nothing in the real quiz changed. Nothing was
deployed or pushed, and no data was touched beyond the local test database (opening a practice
set as the Cohort student starts a set there).

## How to open the comparison

- **Pictures, side by side:** open `.impeccable/mocks/quiz-topbar/index.html` in a browser
  (double-click it). Switch light and dark, and math or a reading passage, at the top. Today's
  version and options A, B and C sit next to each other at desktop (1440), phone (390) and
  tablet (768) size. Click any picture to see it full size.
- **Live, to click through:** from the repo folder run

  ```bash
  node .impeccable/mocks/quiz-topbar/lab/server.mjs
  ```

  then open `http://127.0.0.1:4324/?option=a` (or `b`, `c`, `today`). Add `&q=rw` for a
  reading question with a passage, `&set=end` for a timed section. This is the real quiz
  screen, with its real tools, and only the bar and margins restyled on top.

## The options

- **A. Paper sheet (my pick).** A solid paper bar with Bluebook's dashed line under it, in the
  painting's color. Tools carry their names under the icons, as on Bluebook. On a big screen
  the question sits on a squared sheet, with painted-paper margins. Closest to a real test, and
  the calmest: the painting's color appears only as a thin line, so the question stays the hero.
- **B. Painting window.** A solid tinted bar. On a big screen today's painting, finished and
  still, fills the margins on both sides of the question. On phones and tablets a thin still
  strip of the painting runs under the bar. The most "Karman", but on desktop the painting
  pulls the eye away from the question.
- **C. Navigator bar.** The question squares (1 to 10) live in a second row of the bar, so any
  question is one tap away, and the dots leave the bottom bar. A plain page with thin colored
  edges either side of the question. Useful, but the second row costs height on phones, and
  Bluebook keeps the navigator at the bottom.

All three: no glass, nothing moving behind text (the drifting stars in the margins go), 4px
corners, Hanken Grotesk for the clock and counters, no uppercase label line, Exit in the bar
(today it hides inside More), and the main button in the painting's accent with a chevron.

## A bug in today's quiz (found while capturing)

1. **On a phone, math questions slide off the right edge.** With the calculator on, the top
   bar's tools need about 620px, and the quiz screen grows to fit them. On a 390 phone the
   question, the answers and Submit are cut off and the page scrolls sideways (design rule 28).
   See `quiz-topbar/today-set-390-light.png`. All three options fix it with one line of CSS
   (`grid-template-columns: minmax(0, 1fr)` on the shell and its body) plus a phone layout for
   the bar. The real fix belongs in `quiz-shell.module.css` whichever option is chosen.
2. **The learn layout's floating "← Today" pill and theme button sit on top of the quiz's top
   bar** at every size (they cover the section name and the last tool). See
   `quiz-topbar/today-set-1440-light.png`. The quiz screen should hide that layout's floating bar.

I did not fix either in the real quiz, as asked. Both are worth a fix whichever option wins.

## Screenshots

In `docs/overnight/reports/quiz-topbar/`:

- `today-*.png`: the real app, signed in as `dev_seed_student_cohort`, from
  `/learn/set/ma-skill-linear-equations-in-one-variable` and `/learn/daily-ten`, at 390, 768
  and 1440 wide, light and dark.
- `lab-<option>-<math|rw>-<width>-<light|dark>.png`: the comparison shots (today, a, b, c).

## How I verified

- Captured every screen with headless Playwright (no app browser pane).
- Measured the widest element on each option at 390: everything fits inside the phone; today's
  bar measures 623px.
- Clicked through the live lab: answer, Submit, Next, the pencil, the calculator, More, Exit,
  and option C's question squares.

## Decisions I made

- Built the options on the quiz shell's existing test fixture (`tests/quiz-shell/fixture`),
  so the question block, answer buttons and tools are the real components, not drawings.
- The question is the fixture's made-up one, not a live question, so the mock needs no
  database.
- The bar's tool buttons keep their icons; only their frame changes (square, no outline). The
  calculator's own button keeps its icon and name; on phones its word "Calculator" is hidden to
  fit (the calculator's side tab still names it).
- On phones the section name leaves the bar; Exit, the clock and the tools stay.
- The painting in the mock is today's, painted with the portal's own brush strokes and held
  still (no birds, no particles). Day light in light mode, night in dark mode.

## For the founder to decide

- Which option, A, B or C (or a mix, such as A's bar with C's squares on timed sections).
- Whether Exit should sit in the bar (all three options) or stay inside More (today).
