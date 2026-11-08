# Student dashboard, Time Trial, mastery and skill points

> **Superseded (2026-11-08).** The screens in this spec (the `/student-preview` dashboard, its Time
> Trials and tests screens) were replaced by the painted student portal; see
> `docs/design/student-portal-decisions-2026-11-07.md` and `docs/overnight/reports/student-portal.md`.
> Its data rules live on in `src/lib/student/` (`mastery.ts`, `skill-points.ts`, `time-trial.ts`,
> `unlocks.ts`, `assemble.ts`); skill levels now come from `src/lib/student/levels.ts`.

Date: 2026-10-27. Status: built for founder review. Branch `claude/student-dashboard-13d0a0`
(cut from `claude/quiz-engine`).

The founder was asleep, so every open question below was decided as a written
ruling. Each ruling says what it costs if it is wrong.

## Goal

A student opens Karman and knows in one look what to do next, how each skill is
going, and how their pacing is improving. They can start the Daily 10, practise a
skill, run a Time Trial, play Wordline or start a full-length test from the same
screen. Everything a student sees comes from their own history and from published
questions in the bank.

## Rules this design answers to

- `docs/design-rules.md` 1 to 58, especially the app rules 49 to 58: a constellation
  ground, liquid-glass controls on solid panels, no unnecessary subtitles, custom
  icons, a slim desktop icon rail, the names "Your Daily 10", "Challenge question",
  "Full-length review session" and "Wordline", tutors named, due dates on due items.
- One highlighted call to action per screen (rule 35). Every other action is a glass
  button or a plain link.
- No bento grid, no three cards in a row, no numbered list markers, no emojis, no em
  dashes, no checkmark bullets, no animated arrows, no horizontal scroll.
- Motion follows the apple-design skill: springs that start from the current value,
  critically damped by default, a little bounce only after a gesture. Under reduced
  motion every move becomes a short fade and the sky stands still.
- Account themes: every colour comes from the theme variables that
  `src/lib/themes/palettes.ts` emits. Time Trial is the one exception (see below).

## Approaches considered

1. **Rework the old `LearnDashboard`.** Cheapest, but its layout is a list of links
   and it has no mastery model, points or Time Trial. Rejected.
2. **A new student home on its own view model (chosen).** One pure function,
   `buildStudentHome()`, turns history into everything the screen shows. The screen is
   a client component that only renders. The same model can be fed by the real
   database or by the demo student, so the founder can click through the whole
   experience without a login and without writing to the live database.
3. **A separate app shell per feature.** More routes, more chrome, more places for
   the look to drift. Rejected.

## Information design

The home screen answers four questions in this order.

1. **What do I do now?** The greeting row carries the one highlighted button. It is
   "Start your Daily 10" until today's ten are done, then "Practise {weakest skill}".
   Beside it: the next SAT date with days left, and the score estimate as a labelled
   range ("Estimated range 1290 to 1360"), never one number.
2. **How are my skills?** The skill sky. Each of the eight College Board domains is a
   small constellation; each skill is a star. A star's state is its mastery band,
   drawn as four shapes (open ring, quarter, half, full star with rays), so it reads
   without colour. Tapping a star opens the skill sheet: band, mastery percentage,
   points in that skill, questions answered, last practised, and "Practise this
   skill". On phones the sky collapses to a list grouped by domain with the same star
   glyphs.
3. **How is my pacing?** The Time Trial panel: the current target for each section
   against the College Board time, and a small step chart of past targets squeezing
   toward the goal line.
4. **What else is there?** Due work (with due dates), the next class with the tutor's
   name, Wordline and Word parts, full-length tests, and points (total and this week,
   by skill).

Layout:

- **Phone (under 700 px):** one column. Bottom glass tab bar with five custom icons
  (Home, Practice, Time Trial, Games, Tests). Sections stack in the order above.
- **iPad (700 to 1099 px):** slim icon rail on the left, one wide column, the skill
  sky full width.
- **Desktop (1100 px and up):** slim icon rail, a main column (greeting, skill sky,
  due work) and a side column (Time Trial, next class, games, tests, points). Two
  columns of different widths, not a grid of equal tiles.

Panels are solid theme surfaces with a 1 px theme border and an 8 px radius (rule
19 bans soft, heavy rounding). Buttons are liquid glass: translucent, a bright top
edge, a soft lift, backdrop blur. The primary button is the only filled one.

## Mastery model

**Ruling:** keep the four existing bands in `learn_node_status.confidence_band`
(struggling, developing, proficient, mastered), but compute them from the whole
response history instead of the last quiz score. The bands are already stored,
used by the quiz-engine level-up card and understood by tutors, so replacing them
would cost more than it gives. Cost if wrong: the thresholds change, nothing else.

How a skill's estimate is made (`src/lib/student/mastery.ts`):

- Every answered question in the skill is one observation: right or wrong, its
  difficulty (1 to 7) and how many days ago it was answered.
- **Difficulty weighting.** A one-parameter logistic model. The chance of a right
  answer is `sigmoid(ability - hardness)`, with `hardness = (difficulty - 4) x 0.55`.
  A right answer on a hard question raises ability more than one on an easy question;
  a wrong answer on an easy question lowers it more.
- **Recency weighting.** Each observation counts `0.5 ^ (days ago / 30)`: an answer
  from a month ago counts half as much as one from today.
- **Prior.** Ability starts at 0 with a standard deviation of 1.2, so three lucky
  answers cannot make a skill "mastered".
- The ability is the most likely value given the weighted answers (Newton's method,
  at most 25 steps). Its standard error comes from the same weighted information.
- **Mastery percentage** is the estimated chance of answering a difficulty-5 question
  right. Difficulty 5 is "test-day hard", so the number means something to a student.
- **Bands.**
  - Fewer than 3 weighted answers: no band ("Not started").
  - Mastered: the chance at difficulty 5 is at least 80% even at the low end of the
    estimate (ability minus one standard error), with at least 8 weighted answers and
    at least 2 weighted right answers at difficulty 5 or above.
  - Proficient: the chance at difficulty 5 is at least 60%.
  - Developing: at least 35%.
  - Struggling: below that. Students see "Needs work"; tutors and the database keep
    "struggling". Ruling: "Struggling" on a student's own screen discourages more than
    it informs. Cost if wrong: one label.

## Per-skill points

- Points stay in the quiz-engine table `student_point_awards`, keyed by `award_key`,
  with the `skill_id` column the quiz-engine session is adding. No second ledger.
- A right answer earns 10 points, or 15 at difficulty 5 and above (the quiz-engine
  rule `pointsFor`). Time Trial and full-length test answers use award keys
  `trial:<runId>:<questionId>` and `test:<testId>:<questionId>`.
- `src/lib/student/skill-points.ts` sums awards per skill, per domain, overall and for
  the last seven days. Migration `20261028000010_student_skill_points.sql` adds the
  view `student_skill_points(student_id, skill_id, points, week_points)` once the
  `skill_id` column exists.
- Ruling: no point levels or badges. The level-up moment is a band moving up, which
  the quiz-engine card already celebrates; a second ladder of points levels would
  compete with it. Cost if wrong: a later addition, no rework.

## Time Trial

### Target

College Board module times (standard timing): Reading and Writing 27 questions in
32 minutes; Math 22 questions in 35 minutes.

- **Goal** = the College Board module time x the student's accommodation
  (standard 1, time and a half 1.5, double 2).
- **Starting target**, per section, from the student's untimed history in that
  section (`src/lib/student/time-trial.ts`):
  1. Take the time spent on each of the last 120 untimed answers.
  2. Remove extreme outliers with an IQR fence on the log of the times: anything
     below `Q1 - 3 x IQR` or above `Q3 + 3 x IQR` is dropped. Times are skewed (a
     few long thinks), so the fence works on logs; 3 x IQR is the standard "extreme"
     fence, as the founder asked.
  3. Average what is left (the mean, because a module's time is a sum of question
     times, and the mean is the estimator for a sum) and multiply by the module's
     question count.
  4. Clamp between the goal and three times the goal, rounded to 5 seconds.
  - With fewer than 10 untimed answers the first target is 1.5 x the goal, labelled
    "starting pace".
- **After each trial:** if the student beat the target, the target moves 20% of the
  remaining gap toward the goal. If they missed it, it stays. It never goes below
  the goal, and when the gap is under 15 seconds it snaps to the goal.

Ruling on the founder's wording ("moves 20% of the remaining gap toward College
Board module time, multiplied by the student's timing accommodation"): the
accommodation multiplies the College Board time, so a double-time student squeezes
toward 64 minutes, not 32, by the same 20% steps. The other reading (a 40% step
for double time) would squeeze extra-time students faster, which is the opposite of
an accommodation. Cost if wrong: one line in `nextTarget`.

Ruling: a beat also needs accuracy no worse than 15 points below the student's
untimed accuracy in that section. Without this, guessing through a module would
"beat" the clock and tighten the target. A rushed run counts as a miss, so the
target stays put, which matches the founder's "a missed target stays put". Cost if
wrong: delete one condition.

### The run

- Built on the shared shell: `modeFor("timed", { baseSeconds: target, hasTutor })`,
  grading at the end, mark for review on, bookmarks on.
- Questions: one module's worth from published questions in that section, spread
  across skills in proportion to the College Board domain weights and across
  difficulties. Only questions that pass the bank's publication gate
  (`fetchCatalogQuestionPool`) can appear; held questions never do. Figure questions
  appear only once they pass that gate.
- **Clock:** counts down from the target. At zero the run does not end: the clock
  turns into an overtime count and the student finishes, so the next target is based
  on a real time. Ruling: ending at zero would hide how far off the pace was. Cost if
  wrong: one branch.
- **Pace line:** a thin track under the top bar with a ghost marker for where the
  student should be at this pace, and their actual position. Text reads "2 ahead" or
  "1 behind". No filling boxes.
- **Results:** time against target, right answers, the new target (or "Target
  holds"), and a step chart of every target so far down to the goal line.

### Its own look

Time Trial always uses its own theme, whatever the account theme: a deep track
green-black ground (`#10130f`), warm off-white type, marigold (`#EBA21F`) for the
clock and pace marker, and a fine lane-line motif instead of the stars. Each Time
Trial screen carries a lane-stripe badge "Time Trial" in the top corner, and the
countdown sits in tabular figures. It is a dark theme in every account, so it can
never be mistaken for ordinary practice. It is applied by overriding the shell's
`--quiz-*` colour variables on the host, so the shell itself is unchanged.

## Mini-games and full-length tests

What exists today:

| Thing                                                          | Where                                    | State                               |
| -------------------------------------------------------------- | ---------------------------------------- | ----------------------------------- |
| Challenge question (one Math, one Reading and Writing per day) | `/learn/daily`                           | Live                                |
| Wordline (daily word lab)                                      | `/learn/daily` (`DailyWordLab`)          | Live                                |
| Word parts flashcards                                          | `/learn/daily` (`WordPartFlashcards`)    | Live                                |
| Skill practice                                                 | `/learn/practice/[skillId]`              | Live, published bank only           |
| 35-question diagnostic                                         | `/diagnostic`                            | Live, one attempt per student       |
| Full-length practice test                                      | none                                     | Built here on the shell (see below) |
| Your Daily 10                                                  | none (only the daily Challenge question) | Built here on the shell             |

- **Your Daily 10:** ten published questions, five per section, weighted toward the
  student's two weakest skills (by mastery) and including one difficulty-5-or-above
  question per section. Instant grading on the shell (`modeFor("daily")`).
- **Full-length practice test:** four modules (Reading and Writing 1 and 2, Math 1
  and 2) on the shell with College Board timing x accommodation, a 10-minute break
  between sections. Ruling: the bank cannot yet make Module 2 adaptive (needs item
  calibration), so both modules are linear and the result shows right answers per
  module and per skill, not a scaled score. Cost if wrong: a scoring step later.
- Wordline and Word parts open their existing screens.

## Assigned modes (founder, 2026-10-27, 2:50 a.m.)

Karman has five modes: full-length exams, the question bank, Time Trials, Your Daily 10 and
the mini-games. Full-length exams and Time Trials are scheduled by the tutor, made ahead, and
unlocked by the tutor, so a student cannot repeat them at will.

### Who controls what

| Mode                              | Who starts it                                   | Limit                       |
| --------------------------------- | ----------------------------------------------- | --------------------------- |
| Full-length exam                  | Tutor plans a date, then unlocks it             | One attempt per unlock      |
| Time Trial                        | Tutor plans a date per section, then unlocks it | One attempt per unlock      |
| Your Daily 10                     | Student                                         | Once a day                  |
| Question bank (skill practice)    | Student                                         | Open; fresh questions first |
| Mini-games (Wordline, Word parts) | Student                                         | Wordline is one word a day  |

Ruling: the question bank and mini-games stay open. Locking practice would cut the retrieval
practice the program depends on; only the exams and trials, whose value comes from being
taken fresh and on schedule, are gated. Cost if wrong: one more gate.

Ruling: unlocking is a tutor action, not an automatic one on the planned date. The date is the
plan; the tutor opens it when the student is ready (sessions move, students get sick). Cost if
wrong: an auto-unlock job later.

### States (`src/lib/student/unlocks.ts`)

- **Scheduled:** on the plan, not open. Student sees a padlock, the date and "David unlocks it".
- **Open:** the tutor unlocked it. The student sees "Unlocked by David" and one Start button.
- **Done:** taken. Starting again shows "You have taken this one. Your tutor schedules the next."
- **Locked:** nothing planned. Student sees "Nothing planned yet. Ask David."
- Run pages check the state before starting, so a copied link cannot start a locked item.

### Tutor control

The tutor's plan screen lists the student's exams and trials by date, each with its state and
one Unlock button. Before unlocking, the tutor sees a spacing note when the last one of the
same kind (and section, for trials) was recent: full-length exams 14 days apart, Time Trials
2 days apart per section. The note advises; it does not block, because the tutor knows the
student's week. The same screen shows the student's current Time Trial targets and weakest
skills, so the decision is made with the data in view.

### Research behind the design

- **Retrieval practice (testing effect):** answering questions from memory builds retention
  more than rereading (Roediger and Karpicke, 2006). So the bank, the Daily 10 and the trials
  are all question-first, with explanations after the answer in practice.
- **Spacing:** practice spread over days beats the same amount massed (Cepeda and others,
  2006). So the Daily 10 is once a day, exams are spaced, and mastery counts recent answers
  more.
- **Interleaving:** mixing skills in one set improves telling problem types apart (Rohrer and
  Taylor, 2007). So the Daily 10 mixes sections and skills instead of drilling one.
- **Desirable difficulty:** practice that is a little hard sticks better (Bjork). So the Daily
  10 always includes a difficulty-5-or-above question, and the Time Trial squeeze moves 20% at
  a time rather than jumping to test pace.
- **Fresh items on full-length exams:** a retaken form measures memory of those items, not
  skill. So each exam is one attempt and draws questions the student has not seen in the
  other modules.
- **Speed after accuracy:** pace training that rewards guessing teaches guessing. So a Time
  Trial only tightens the target when accuracy holds.

### Next research-backed features (not built tonight)

- **Mistakes to retry:** every missed question comes back after 1, 3 and 7 days until it is
  answered right twice (spaced retrieval of errors).
- **Tutor review after each full-length exam:** the "Full-length review session" opens the
  exam's missed questions grouped by skill.
- **Weekly plan:** the tutor's plan screen as a week view across all their students.

### Data

Migration `20261028000010` adds `student_assignments` (kind, section, scheduled date,
unlocked at and by, completed at) and links each `time_trial_runs` row to its assignment.

## Data flow and safety

- `buildStudentHome(input)` is pure. Input: profile (name, accommodation, SAT date,
  tutor), responses, point awards, trial runs, due items, next class.
- The founder demo lives at `/student-preview`, available only when `NODE_ENV` is
  not `production` (the route returns 404 in a release build). It uses a seeded demo
  student ("Maya") for history, and reads real published questions from the bank for
  every run. Answers are graded on the server from the bank (read only) and kept in
  the browser session. Nothing is written to any database.
- The real `/dashboard/student` switches to this design once the founder approves it
  and the quiz-engine migrations land. The old `LearnDashboard` is deleted in that
  same change.

## Testing

- Unit tests for every pure function: the outlier fence, the starting target, the
  squeeze (beat, miss, rushed, snap, never below goal, every accommodation), mastery
  (recency, difficulty, prior, bands, evidence gate), skill points and the home model.
- Browser click-through of every button at 375 px and 1440 px, plus iPad width, with
  screenshots, in a dark and a light account theme.
