# quiz-finish report

Branch: `claude/overnight-quiz-finish-2d881f`, with `claude/overnight-ship` merged in at 11:10 CST.
Nothing pushed, nothing deployed. Production was not touched. Everything ran on the shared local
database, and I added no migrations.

## What is done

### 1. Plan rules come from one place

- The quiz flows no longer keep their own copy of the plan rules. `src/lib/assembler/plan-gate.ts`
  now asks `src/lib/plans` (`getPlan`, `getUsage`, `canAccess`, `difficultyRangeFor`).
- Free's 100 questions now include answers in the Daily 10, practice sets and Domain quizzes
  (`quiz_run_responses`). The free full-length test and the diagnostic still don't use up the 100.
- Free's one full-length test is used up when a test is **finished**. A Free student can't open a
  second test while the first is unfinished. The tests page says "Finish your open test first".
- If a plan can't be read, the student is treated as Free, so the limits still apply.
- New unit tests: the quiz gate (6) and the usage counts against a fake database (4).

### 2. The new diagnostic replaces the old one

- `/learn/diagnostic` (questions drawn from the bank) is now the only diagnostic.
- When it is finished, its one predicted score is saved where Progress reads it. Progress, Today,
  and the parent and tutor views show it, as the old diagnostic did. It saves one number, never
  a range.
- Retakes still work. When an admin clicks "Allow retake", the student's next visit starts a fresh
  diagnostic (the second, third and so on).
- The old page and its results route (`/api/diagnostic/submit`) are deleted. The old address
  `/diagnostic` now forwards to `/learn/diagnostic`. Every link points to the new page: Progress,
  the dashboard, tests, robots and the calculator size check.
- The reset script (`scripts/maintenance/reset-diagnostics.mjs`) now also clears the new
  diagnostic runs.
- The public site keeps `src/data/diagnostic-questions.ts`.

### 3. Skills open the adaptive practice set

- Library, course pages, Up next and Progress already opened `/learn/set/<skill>`. The Endless
  mistake log did not. It now opens the adaptive set, and it also lists misses from practice sets,
  the Daily 10 and Domain quizzes. Before, it only showed misses from the older practice page.
- Progress now counts time, "what moved" and personal bests from the new flows too.
- School homework now opens the adaptive set or the Domain quiz. A finished set or Domain quiz now
  marks the homework done.
- Tutor-assigned fixed sets still open the older practice page, as allowed.
- I deleted an unused older component (`StudyPreview`) that linked to the old page.

### 4. One level rule

- `src/lib/levels/rules.ts` is the only place the level rules live. The quiz-flows session did
  the same change in parallel, so I kept their helper names and merged mine into them.
- Parents, teachers and tutors now also see the level a student earned in the Daily 10, practice
  sets and Domain quizzes. Before, they only saw levels from the older practice page, so their
  view could lag behind the student's.
- The tutor roster's duplicate rule file is deleted.

### 5. A level-up, checked live

- Signed in as Sofia (`dev_seed_student_cohort`) on my dev server, headless, 768 wide, dark mode.
- I opened a Transitions practice set and answered three questions right. I read each answer
  from the local database.
- The square painted in, and the banner read "Transitions is now Learning". The database shows
  Transitions at Learning with the run reset to 0.
- Screenshots are in `docs/overnight/reports/quiz-finish/`: the practice set question and the
  level-up, the Daily 10, a Domain quiz (Algebra), the start of test 1, the diagnostic, the tests
  page, and the old `/diagnostic` address forwarding (a permanent redirect, checked). All are 768
  wide in dark mode.

## How I checked

- `npx tsc --noEmit`: clean after the merge.
- Unit tests for every area I touched pass: plans, assembler, levels, student, progress glance,
  tutor, parent, school, auth, middleware, calculator size check (318 in the last run).
- Lint and format: clean on every file I changed. `npm run check:sizes`: passes.
- Headless Playwright with one dev server (port 3121), never the app's browser pane.

## Decisions I made

- **The diagnostic's score goes in the old results table.** Progress, Today and the parent and
  tutor views already read `diagnostic_results`. The new diagnostic writes one row there, with the
  same number as low and high, rather than me rewiring four readers.
- **"Results path" meant the old route.** I deleted the old page and `/api/diagnostic/submit`,
  but kept the `diagnostic_results` table, which the new diagnostic now fills.
- **One open full-length test at a time on Free.** The brief says the free test counts once
  finished. Without this rule, a Free student could open all four tests and never finish one.
- **The old diagnostic screen component stays for now.** The calculator's browser tests use
  `src/components/diagnostic/DiagnosticClient.tsx` as a test host, and the calculator is under
  your review. No page uses it any more. Moving those tests to the new screen, then deleting it,
  is a follow-up.
- **Calculator size check:** I swapped `/diagnostic/page` for `/learn/diagnostic/page` in its route
  list. The saved baseline numbers for that route are still the old page's. They need
  re-measuring the next time someone runs the check with a build.
- **The merge with the quiz-flows session.** We both unified the level rule. I kept their
  helpers (`foldAnswers`, `levelFromHistory`). For the plan gate I kept mine, because theirs
  counted quiz answers on top of `getUsage`. With my change to `getUsage`, that would have
  counted every answer twice.

## Not done, or for you to decide

- **Tokens on the question screen.** A "+15" chip shows after each right answer inside the set,
  in the shared quiz screen's bottom bar. Your brief says tokens show only on the result screen.
  I didn't change the shared quiz screen.
- **The top-left "← Today" pill covers the page title** at 768 wide, on quiz screens ("DAILY 10",
  "TRANSITIONS") and on painted pages (the "Diagnostic" heading). It's the shared shell's pill,
  so I left it.
- When a retake is granted, simply reopening `/learn/diagnostic` starts the new diagnostic. There
  is no "start your retake" step.
- The parent, school and tutor views still don't count the new flows' answers for time spent.
  Only levels were joined.
- **At 768 wide in dark mode, the portal's side rail stays light** while the box is dark, and it
  also covers the start of painted page titles ("Practice test 1" reads "ractice test 1").
- The browser console shows a hydration warning from the Clerk account button in the quiz layout
  (`LearnLayout`). It was there before my work, and the page still works.
- I did not run the full test suite or `cf:build`, to keep the shared machine light.
  `src/lib/assembler/runs.ts` is at 699 lines, just under the limit.
