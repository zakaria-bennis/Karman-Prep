# Portal polish: report

Session: portal-polish. Branch: `claude/portal-polish-4562be` (cut from `claude/overnight-ship`
at `ed02be4e`). Nothing pushed, nothing deployed, main untouched, production never touched. I
used the local database only, and read the question bank without changing it.

Your nine points apply to every portal (student, parent, tutor, school and admin), because they
share one shell. The shell fixes below reach all of them.

## What changed

### 1. Loading and the painting

I measured first, on the student Today page, at 1440 wide in headless Chrome on the dev server:

|                                                | Before                                                                             | After                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------- |
| First paint (text on screen)                   | 0.35 to 0.42 s                                                                     | about the same (0.35 to 0.5 s)                     |
| Page usable                                    | 0.32 to 0.40 s                                                                     | about the same                                     |
| Painting finished, later pages                 | 0.7 to 0.8 s after load, and the page froze for about 0.12 s to draw the landscape | about 0.06 s after load, nothing to draw           |
| Moving between tabs (Today, Library, Progress) | the painting was drawn again on every tab                                          | drawn once; the tab shows it within 0.03 to 0.08 s |
| Layout shift                                   | 0                                                                                  | 0                                                  |

- **The cause:** every page drew the day's painting again from nothing: the landscape (0.12 s
  frozen) and then thousands of brush strokes over 0.7 s, which showed as detail "popping in".
- **The fix:** once the painting is finished, it is kept: in memory while you move between tabs,
  and in the browser's own storage for a reload or a new tab the same day. A later page shows
  the finished painting straight away, with all its detail, and nothing has to be painted. A
  new day, a new time of day or a resized window paints afresh. Old days are cleared.
- The stroke slices that finish the small brushes now check the clock more often, so a slice
  can no longer run long and hold up a click.
- The 3.8-second opening (once per session) is unchanged.
- The page never waits for the painting.

### 2. What to do next, and stronger type

- **The Library leads with one thing to do.** At the top of each course: the next skill in big
  type, one line ("Your next Math skill. 2 of 19 skills at Understanding or above."), and the
  screen's only main button, "Start practice". The course ring sits beside it.
- **Bigger type in every portal:** card headings went from 19 to 22 px, page titles from 22 to
  26 px, and list text from 16 to 17 px.
- **More color in the box:** every card carries a little of the painting's hue. Domain cards
  in the Library are washed with the level shade they've reached, with a colored left edge.

### 3. Cards that open in place

- A new building block, `Expand`, opens a card where it is with a smooth slide instead of
  jumping to a new page. Any portal can use it.
- In the Library each Domain is one of these cards. Closed, it shows the name, "2 of 5 strong"
  and the skill squares. Open, it lists every skill with its level and a Practice link, then
  "Domain quiz" and "Open Algebra" (the full Domain page) as links.
- The Domain holding your next skill is open when you arrive.
- With reduced motion, cards open without the slide.

### 4. Background music

- A soft Karman theme, made in code with the browser's sound engine (no file, nothing bought,
  nothing copyrighted).
  - It's in D major, slow (66 beats a minute), with warm pads, a soft bass and a sparse
    plucked melody with an echo.
  - It loops about every 29 seconds without a click, and plays very quietly.
- **Off by default.** Turn it on in Account, Sound and motion: "Background music". Your choice
  is remembered on the device.
- It starts only after you click or press a key, as browsers require. It pauses when the tab is
  hidden and fades back in when you return.
- It has its own switch rather than following "Quiz sounds", because that switch resets to off
  on every visit. With it, the music would never come back on its own.

### 5. The logo

- **Inside any portal, the logo goes to that portal's home.** It used to lead to the public site
  unless a page said otherwise, which looked like being signed out. The pages that forgot are
  fixed for good: the shell now defaults to the portal's first tab.
- The rail shows the site header's "Karman" wordmark instead of the rocket. On a phone it sits
  top left.

### 6. Time and effort

- Progress now shows one bar per day for the last 7 days, each labelled (Mon, Tue … Today) with
  its time on top. Today's bar is in the accent color.
- The weekly rings are gone, and the code behind them is replaced.

### 7. The Library splits Math and Reading and Writing

- A big two-tab switch at the top: **Math** and **Reading and Writing**, each with its percent.
- Picking one shows only that course: its next skill, its Domains and their skills.
- Without a pick, it opens the course that's further behind.
- Homework is unchanged and unified. The segmented skill ring on Progress is unchanged.

### 8. The account menu

- **Why it was broken:** in dark mode on a light painting, the menu took the top bar's dark
  text on its own dark background, and the bar's blur stopped the menu's blur. The page showed
  through as "blocks on blocks", with text you couldn't read.
- **Rebuilt:**
  - It opens from the fox with a spring.
  - Your name and email sit at the top, with the fox.
  - Below that, a grid of big tiles. Each has an icon and one or two words: Test date, Invite
    parent, Sound, Plan, Tutor code, Messages, Profile.
  - Sign out sits on its own quiet line at the bottom.
  - Escape, a click outside or a scroll closes it. Arrow keys move between tiles.
- **The other portals' menus** use the same tiles:
  - Parent: Weekly email, your other children, Link student.
  - Admin: Student view, Public site.
  - Tutor: Admin, for admins.

### 9. Skill categories (read only)

**The portal isn't hiding any skills.** It shows all 39 skills in the catalog: 19 Math and 20
Reading and Writing.

- **Algebra (5 skills) and Expression of Ideas (2 skills) match the College Board's official
  list exactly.** The College Board really has only that many.
- **Why Reading and Writing looks skewed:** our catalog splits Standard English Conventions
  into 12 skills, where the College Board has 2 (Boundaries, and Form, Structure and Sense). So
  12 of the 20 Reading and Writing skills sit in that one Domain.
- **The questions are not skewed.** Standard English Conventions has 1,302 usable questions,
  23% of Reading and Writing, slightly below its 26% share of the real test. Expression of Ideas
  has 1,444 questions spread over only 2 skills.

No database field holds finer question types. The question wording does support them, though.
Below is a proposal for you to approve or change. The counts are rough estimates from matching
words in the questions. A real rollout would tag each question once and have the tags checked.

| Domain                       | Official skill                    | Proposed sub-skills (about how many questions)                                                                                                                |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Algebra                      | Linear equations in one variable  | Solve for x (189), Word problems (84), How many solutions (71), Value of an expression (52)                                                                   |
| Algebra                      | Linear equations in two variables | Meaning in context (90), Graphs (64), Parallel and perpendicular lines (61), Write the equation (about 40)                                                    |
| Algebra                      | Linear functions                  | Evaluate or write f(x) (145), From a graph or table (109), Slope and intercept in context (67), Slope and intercept (17)                                      |
| Algebra                      | Systems of two linear equations   | Solve the system (168), How many solutions (66), Word problems (30)                                                                                           |
| Algebra                      | Linear inequalities               | Word problems: at least, at most (83), Solve the inequality (62), Points and graphs (31)                                                                      |
| Advanced Math                | Equivalent expressions            | Polynomials (191), Rational expressions (54), Factoring (33), Exponents and radicals (18)                                                                     |
| Advanced Math                | Nonlinear equations and systems   | Quadratic equations (179), Radical and absolute value (111), Line and parabola systems (87), How many solutions (59), Rational equations (39)                 |
| Advanced Math                | Nonlinear functions               | Exponential growth and decay (248), Quadratic functions (187), Zeros and factors (45), Shifts (9)                                                             |
| Problem-Solving and Data     | Ratios, rates and units           | Unit conversion (137), Ratios and proportions (24), Rates (19)                                                                                                |
| Problem-Solving and Data     | Percentages                       | Percent of a number (135), Percent change (42)                                                                                                                |
| Problem-Solving and Data     | One-variable data                 | Mean and median (78), Spread (22), Reading a distribution (20)                                                                                                |
| Problem-Solving and Data     | Two-variable data                 | Scatterplots and best fit (47), Linear or exponential (10)                                                                                                    |
| Problem-Solving and Data     | Probability                       | Tables (36), Conditional (12)                                                                                                                                 |
| Geometry and Trig            | Area and volume                   | Volume (102), Area (62), Scaling (25)                                                                                                                         |
| Geometry and Trig            | Lines, angles and triangles       | Angle sums (82), Parallel lines (64), Similar triangles (57)                                                                                                  |
| Geometry and Trig            | Right triangles and trig          | Sine, cosine, tangent (101), Pythagoras and special triangles (66)                                                                                            |
| Geometry and Trig            | Circles                           | Circle equations (98), Arcs and sectors (17), Circumference and area (13)                                                                                     |
| Information and Ideas        | Central Ideas and Details         | Main idea (130), Detail from the text (123), Poems and novels (36)                                                                                            |
| Information and Ideas        | Command of Evidence               | From a table or graph (322), Support or weaken a claim (147), Choose the quotation (119)                                                                      |
| Information and Ideas        | Inferences                        | Finish the text logically (485), Inference with data (91)                                                                                                     |
| Craft and Structure          | Words in Context                  | Most precise word (796), Meaning as used (86)                                                                                                                 |
| Craft and Structure          | Text Structure and Purpose        | Role of the underlined part (217), Overall structure (139), Main purpose (99)                                                                                 |
| Craft and Structure          | Cross-Text Connections            | How author 2 would respond (39), What both agree on (24)                                                                                                      |
| Expression of Ideas          | Transitions                       | Contrast (207), Cause and effect (137), Sequence (83), Example (79), Emphasis (76), Addition (32)                                                             |
| Expression of Ideas          | Rhetorical Synthesis              | Compare or contrast (220), Explain or introduce (102), A specific detail (88), Emphasize (80), Give an example (71), For a new audience (40), Generalize (29) |
| Standard English Conventions | already 12 skills                 | Keep, or regroup under the 2 official skills with these 12 as sub-skills                                                                                      |

Two ways to show them, for you to choose:

- **Keep the official skills as the squares,** and list sub-skills inside each skill when its
  card opens. Standard English Conventions would fold back to 2 skills with 6 sub-skills each,
  so Reading and Writing reads 3, 3, 2, 2 like the College Board.
- **Make every sub-skill its own square:** about 90 squares. That's more categories, but it
  drifts from the official list and changes how "Up next" weighs skills.

Also noticed: several reading passages appear more than once under different question numbers.
For example, about 21 Rhetorical Synthesis items start from the same notes. Some of that is
normal for that question type, but it is worth a duplicate check.

## Sub-skills (second round, after your choice)

You chose to make every sub-skill its own square. That is now built: **92 sub-skills**, 52 in
Math and 40 in Reading and Writing.

### How it reads

- **Headings:** in the Library, each Domain card shows the official College Board skills as
  headings, with their sub-skills as the squares beneath. It still reads like the College
  Board.
  - Example: Algebra, then "Linear functions", then "Slope and intercept", "From a graph or
    table", "Evaluate and write f(x)".
- **Math and Reading and Writing stay separate.**
- **Standard English Conventions:** its 12 are the sub-skills, under the two official skills,
  Boundaries and Form, Structure, and Sense.
- **The final list:** it follows my earlier table with small changes, so no square is too thin
  to practice.
  - Folded in:
    - "Exponents and radicals" (13 questions) joins Polynomials.
    - "Circumference and area" (13) joins Arcs and angles.
    - Probability stays one square (only 48 questions).
  - Two Transitions types are renamed: "Time and place", and "Clarify and emphasize".
  - The full list, with the rule for each, is in `src/lib/subskills/rules.ts`.

### How each question finds its square

- **The rule:** a fixed rule reads each question's own words (for Transitions, the first words
  of the right answer) and puts it in exactly one sub-skill.
  - Each skill's last sub-skill takes whatever the others don't, so there's no "Other" square.
  - It ran once, read only, over the 10,096 live questions on the local copy of the bank.
- **Stored in code:** the result is in `src/data/curriculum/sub-skill-map.json` (about 150 KB,
  server only).
- **The bank and the import tools are unchanged.**
- **Rebuilding:** after new questions publish, run `scripts/subskills/export-questions.sh` and
  then `scripts/subskills/build-map.ts`. Until then, a new question counts in its skill's
  last sub-skill.
- **Smallest squares:** "Studies and experiments" (13 questions, a small skill on its own),
  "Systems: Word problems" (14) and "Linear and exponential models" (18). These sets can run
  a little short of 10 questions.
- **Rough edges:** the sorting rule reads words, so a few questions will land in a neighbouring
  sub-skill. A reviewed tag per question would make it exact.

### What works per sub-skill

- **Levels:** each sub-skill has its own level.
  - Past answers are placed by their question, so a student's history fills the new squares.
  - Levels saved from now on are saved per sub-skill.
  - The 15 skills that are a single square keep their old saved levels.
- **Practice sets:** `/learn/set/<sub-skill>` serves only that sub-skill's questions. The title
  reads, for example, "Transitions: Contrast".
  - Checked: the first question of a Contrast set had "That said," as its answer.
  - Answering it saved a level under that sub-skill.
- **Domain quizzes:** they raise each sub-skill they touch, and the result screen names
  sub-skills.
- **Up next:** it weighs each sub-skill by its Domain's share of the test, times its share of
  that Domain's questions in the bank (how often that type comes up), times the levels left to
  climb.
- **The Daily 10:** it reads a skill's weakest sub-skill, so weak types come back.
- **Endless mode** and its mistake log work per sub-skill.
- **Progress:** it counts 92 squares, and "What moved" names sub-skills.
- **Parent and school views, and the affiliate tutor's student view:** they count the new
  squares.
- **Homework:** school and tutor homework pickers assign a sub-skill practice set. Assignments
  already given for a whole skill still open.
- **Not changed:** the regular tutor (David) and the admin student page still show the older
  lesson map, as before. They never used these skills.

### Repeated reading passages, for the import team

- **The list:** 85 passages open three or more live Reading and Writing questions each, 357
  questions in all.
  - Some repetition is normal: Rhetorical Synthesis notes are often reused with a new goal.
  - Others look like the same question imported more than once.
- **Biggest groups:**
  - the Mohs hardness notes (15 questions)
  - Victoria Villasana (10)
  - the economics student and 1950 (8)
  - Puerto Rico town nicknames (8)
- **Where:** the full list, with every question id, is in
  `docs/overnight/reports/portal-polish-duplicate-passages.md`. I changed nothing.

## How I checked

- **Headless browser** (Playwright from the command line, never the app's browser pane), one
  dev server on port 3130.
  - Every tab of every portal: student (Liam, Pro), parent (Rachel), tutor (David), affiliate
    tutor (Priya), school (Thomas) and admin.
  - Each at 1440 and 390 wide, in light and dark: 76 page loads.
  - Every page opened (200), with no sideways scroll and no console errors.
  - The logo leads to that portal's home on every page.
  - The account menu opens, and Escape closes it.
  - At most one main button per screen.
  - `/tutor/settings` timed out once while the machine was busy, then passed on retry.
- **Library:** the switch moves between Math and Reading and Writing, and each shows only its
  own four Domains. A Domain card opens in place (it grows to 328 px) and its links work.
- **Music:** the switch turns it on (the sound engine runs) and the choice is saved. On the next
  page it waits for a click before playing. Turning it off saves "off". I can't hear it from
  here, so please give it a listen.
- **Painting:** timings above, from `scripts/overnight/portal-measure.mjs`.
- **Checks:**
  - `npx tsc --noEmit`: passes.
  - `npm run lint`: passes (0 errors; one old warning about an image tag).
  - `npm run check:sizes`: passes.
  - `npm run format:check`: fails only on two student-portal design docs that came with the
    branch.
  - Full test suite (`NODE_OPTIONS=--no-experimental-webstorage npm test`): 569 files,
    9,759 tests pass, 0 fail (254 are marked "expected to fail", as before).
- **After the sub-skills** (merged with `claude/overnight-ship` first):
  - Every tab of every portal again, each at 1440 and 390 wide in light and dark: 100 page
    loads.
    - Every page opened, with no sideways scroll and no console errors.
    - I also opened a school class (its homework picker lists all 92 sub-skills), an affiliate
      tutor's student, and a parent's Progress page.
  - Library: Math shows 52 squares and Reading and Writing 40.
  - A Transitions: Contrast practice set served a contrast question. One answer saved its level
    under that sub-skill.
    - Liam's local account now has that set open with one answer.
  - `npx tsc --noEmit`, `npm run lint` (0 errors), `npm run check:sizes` and
    `npm run sync:taxonomy` (no change) all pass.
    - `runs.ts` had grown past 700 lines. I moved its practice-set pool and mastery helpers into
      two small files.
  - `npm run format:check` fails only on the same older docs (and the BRIEF).
  - Full test suite: 570 files, 9,765 tests pass.
    - One calculator test failed once under load and passes when run alone. The calculator
      isn't touched by this work.

## Before and after pictures

Sub-skills: `subskills-library-math-1440-light.jpg` (full page),
`subskills-library-rw-1440-light.jpg`, `subskills-library-math-390-dark.jpg`,
`subskills-practice-set-1440-light.jpg`.

All in `docs/overnight/screens/portal-polish/`:

- Today: `before-today-1440-light.jpg`, `after-today-1440-light.jpg`, `before-today-390-dark.jpg`,
  `after-today-390-dark.jpg`.
- Account menu: `before-menu-390-dark.jpg` (the broken one), `after-menu-390-dark.jpg`,
  `before-menu-1440-light.jpg`, `after-menu-1440-light.jpg`.
- Library: `before-library-1440-light.jpg`, `after-library-1440-light.jpg`,
  `before-library-390-dark.jpg`, `after-library-390-dark.jpg`.
- Reading and Writing: `after-library-rw-1440-light.jpg`.
- A Domain card open: `after-expand-390-light.jpg`.
- Progress: `before-progress-1440-light.jpg`, `after-progress-1440-light.jpg`.
- The daily bars: `after-time-bars-1440-light.jpg`.

## What is not done

- **Expand is used in the Library only.** Today, Homework and the other portals can adopt it
  card by card; I ran out of the hour.
- **The first painting of the day** still takes the same time (the 3.8-second opening, or about
  0.12 s of drawing when it appears finished). Moving that work off the main thread would need
  a rewrite of the painting engine.

## Decisions I made

- Music has its own switch (see point 4) and is never started by reduced-motion settings alone.
- The Library opens the course that's further behind when you haven't picked one.
- The menu labels are shortened to one or two words ("Plan" for "Plan and billing", "Tutor code"
  for "Redeem a tutor's code").
- The time bars show the last 7 days, not weeks, because you asked to compare days.
- The rail logo is the site's "Karman" wordmark. The rocket drawing is deleted from the shell.

## Machine note

The disk is nearly full: about 2 to 3 GB free, shared by every session. My first full test run
stopped on "no space left on device". I stopped my dev server and deleted my build folder
(about 0.6 GB) to finish.
