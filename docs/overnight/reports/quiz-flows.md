# quiz-flows report

Branch: `claude/overnight-quiz-7856ae`. I merged `claude/overnight-ship` into it at 09:27 and
again at 10:22 (one conflict on Today's main button: I kept the student portal's version, which
opens the Daily 10 until it is done for the day). Nothing pushed, nothing deployed. Production was not touched. The question bank was
only read, and only the local copy. My new tables live in the local database only.

## What is done

Every flow uses the shared quiz screen (pencil, highlights, navigator, timer, sounds) and only
questions that pass the bank's own check (`readCatalogQuestionScope` plus the
`catalogQuestionPayloadHash` seal). No hard-coded question lists. Question `bcdb21e4` is never
served.

- **Daily 10** (`/learn/daily-ten`). Today's main button, "Start Your Daily 10", opens it.
  - Ten questions a day for each student: five Reading and Writing, then five Math.
  - Weak skills first, then a skill due for review, then a new skill. Difficulty follows each
    skill's level, inside the student's plan. Questions never seen come first.
  - Saved on the server: a reload resumes the same question, and reopening later shows the
    same day's result.
  - Finishing it counts toward the streak (days in a row).
  - The ending is "Box first": the box opens and the tokens come out, then the results. The
    results show the score in a ring, each section, one shape per answer (a filled circle for
    right, a crossed square for a miss), the streak, the tokens, one main button to practise
    the weakest skill, "Done", and the top three skills with their level squares plus "See
    all". The box is squared and flat, with no machine and no shadow, in the painting's
    colour (no marigold). It uses the quiz's first-round sounds.
- **Skill levels**: Not started, New, Learning, Understanding, Conquered, saved per student.
  The rules are in `src/lib/levels/README.md` (written for the student-portal session).
  **One rule everywhere:** the rule lived in four places (mine, the student portal's, the
  parent and school view's, and the tutor roster's). The parent, school and tutor copies
  counted differently: 5 right in a row from scratch showed Conquered, and the parent view
  decayed after 3 weeks, not 4. All three now call `src/lib/levels/rules.ts`, so a parent, a
  tutor and the student see the same level for the same answers.
- **Practice set** (`/learn/set/<skill>`). Ten questions in one skill, adaptive: a right answer
  makes the next one harder, a miss makes it easier.
  - A level-up shows a small banner under the question: the square paints in, the fox hops,
    and the level-up sound plays.
  - If the set ends without a level-up, the main button is "Read the lesson" (the skill's
    written lesson) and "Try again" is a text link beside it.
- **Domain quiz** (`/learn/domain/<domain>`). About 12 questions across one Domain's skills,
  spread evenly. It can raise several skills at once (rule below).
- **Full-length practice tests** (`/learn/test/1` to `/4`). Reading and Writing 27 + 27
  questions (32 minutes each), a break, then Math 22 + 22 (35 minutes each). Module 2 is easier
  or harder depending on Module 1. The report shows one predicted total and one number per
  section (no ranges), each module's right answers, the skills, and a review of every question
  with its written explanation. Answers and explanations stay hidden until the whole test is
  submitted. The Free plan gets one test.
- **Diagnostic from the bank** (`/learn/diagnostic`). 18 Reading and Writing questions
  (22 minutes), a break, 17 Math (27 minutes), difficulty 2 to 5, then the same kind of report.
- **Challenge questions** (`/learn/daily`). Still two hard questions a day, the same for every
  student, from the existing selection. Each signed-in student's first answer is now kept, and
  after answering the student sees how everyone did ("62% of the 13 students who answered today
  got it right") with the worked explanation.
- **Tests and quizzes page** (`/learn/tests`): the four tests (Start, Resume or the predicted
  score), the diagnostic, and every Domain quiz.
- **The assembler** (`src/lib/assembler/`) builds the tests, the Domain quizzes and the
  diagnostic. Checked against the import session's bank export (10,096 questions): four full
  tests fill completely for both pools with no question family repeated within or across the
  four forms, every Domain quiz fills, and the diagnostic fills.
- **Plan gates** now call pricing's rules (`src/lib/plans`, merged at 10:22): core pool
  (difficulty 1 to 5) for Free and Practice, every question (1 to 7) for Pro, Cohort and
  Private. Free stops at 100 questions (the free full-length test and the diagnostic do not
  count) and one full-length test. If a plan cannot be read, the student is treated as Free,
  the same as the student portal does.
- **The flow screens use the student portal's frame** (its tabs, streak and account menu).

## How I checked

- Unit tests (all pass): level rules and decay (9), Daily 10 selection, day and streak (9),
  the assembler and predicted score (15), including the check against the real bank export.
- Clicked in headless Chrome (Playwright) on my own dev server (port 3109) and the local
  database, signed in as Sofia (the Cohort test student), at 1440 wide:
  - Today, then "Start Your Daily 10", ten questions, a reload in the middle (same question
    came back), the box, the results, "See all", "Done" back to Today, and reopening the Daily 10
    (shows the saved result).
  - Two practice sets to the end, "Read the lesson" (the lesson page opens), and "Try again"
    (a new set starts).
  - An Algebra quiz to the end.
  - Practice test 1: both Reading and Writing modules, the break, both Math modules, the report,
    and the review with explanations. I checked the report never says "official", "actual SAT"
    or an exam date.
  - The diagnostic to the end, and the Math challenge question with "how everyone did".
- Phone width (390): the Daily 10 results and the tests page, in light.
- After the 10:22 merge: `npx tsc --noEmit` has no errors; lint and format pass on every file I
  changed; `npm run check:sizes` passes; 180 unit tests pass (mine plus catalog practice, plans
  and the challenge). I did not run the full `npm test` suite (time).
- Smoke test after the merge, at phone width: Today renders with no sideways scroll, and the
  Daily 10 page opens a fresh Daily 10. (The local database had been reset since my 09:44 run,
  which wiped my earlier test runs; that is expected.)

## Decisions I made

- **Each level needs its own run.** 3 right in a row reaches Learning, then 4 more Understanding,
  then 5 more Conquered (12 in a row in total from New). The first try makes a skill New.
- **Wrong answers never take a level away.** Only decay does.
- **Decay: 4 weeks.** After 4 weeks without an answer in a skill it drops one level, and
  another every further 4 weeks, never below New.
- **Domain quiz rule:** when the quiz ends, each skill moves up at most one level, and only if
  it had at least two questions and every one was right without a hint.
- **Tests and the diagnostic measure; they never move levels.** They mark skills as tried.
- **Hints:** the quiz screen has no hint button yet, so every answer counts as without a hint.
  The database already records hints for when one exists.
- **Module 2 routing:** the harder Module 2 needs 15 of 27 right (Reading and Writing) or
  12 of 22 (Math) in Module 1.
- **Predicted score:** our own estimate. Harder questions count more, and the easier Module 2
  caps that section at 650. The screen says "Our estimate from this practice test, built from
  Karman's question bank."
- **Four test forms per pool** (core and full). A student never meets a question family again
  from an earlier full test.
- **The Daily 10's day** is the student's own day (their device's time zone).
- **Tokens are the existing points** (10 a right answer, 15 from difficulty 5). They show only
  on result screens. The older mastery estimate stays internal (it ranks weak skills); its
  labels (Needs work, Developing...) must not be shown beside levels.
- **The practice set's "no run" button reads "Read the lesson"**, not "Rewatch the video",
  because no videos exist. A skill with no written lesson links to its subject's skills page.

## Not done, and what you may want to decide

- **The old `/diagnostic` page** still uses the 35 hard-coded questions and saves to the old
  results table, which feeds the progress and predicted-SAT pages. I built the bank version
  at `/learn/diagnostic` but did not switch the old page over or delete it. Decide whether the
  new one replaces it (the public site keeps `src/data/diagnostic-questions.ts` either way).
- **Pricing's usage count does not read the new tables yet.** `getUsage` counts skill practice
  and old quizzes; my plan check adds the quiz runs and full tests on top
  (`src/lib/assembler/plan-gate.ts`). Better: pricing's usage source reads `quiz_runs` itself.
- **The local database has no `plan_grants` table yet** (pricing's migration is not applied
  there), so every local plan lookup fails and local students count as Free.
- **Tutor-assigned practice still uses the older practice page** (`/learn/practice/<skill>`),
  which is not adaptive and does not move levels. The student portal's Library already links
  skills to the new practice sets.
- **I did not see a level-up live.** My test answers were random, so no run of 3 happened. The
  rules are covered by unit tests; the banner is built but unclicked.
- **Not captured:** iPad width (768) and dark mode. Each painted page took about 4 minutes to
  load on the busy machine, so I stopped there.
- Found in other areas (not changed):
  - The recording-consent banner sits over the quiz's bottom bar (Submit) until the student
    answers it (design rule 34).
  - Long page titles slide under the shell's top-left pill on desktop. I shortened mine.
  - One Math chart question draws bars with negative heights (browser console errors).
  - Painted pages wait for the painting before the box appears; in a busy headless browser that
    took minutes, which is why I could not capture more widths.

## Database

One migration, applied to the local database only:
`supabase/migrations/20261108120100_quiz_runs_levels_challenge.sql`. It adds `quiz_runs`,
`quiz_run_responses`, `student_skill_levels` and `daily_challenge_answers`, all closed to
everyone but the server. A local reset from a branch without this file removes these tables.
