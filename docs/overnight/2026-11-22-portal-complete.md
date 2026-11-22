# Overnight build, 2026-11-22: finish the student portal

The founder asked, before going to sleep, for the whole student portal to be finished by morning: every
missing screen, everything wired so a brand-new student can use it, the question bank verified, retagged
into the 72 skills and published, a question generator for Endless (goal: 200,000 questions), lessons for
every skill with calculator (Desmos-style) and reading tips, strategy quizzes, and 20 adaptive full-length
exams modeled on the digital SAT. He said to use as many sessions and agents as needed ("spawn in as many
agents as you need to get this task and these sets of tasks done") and not to stop until it is done.

His answers to the questions asked before he slept are in the memory note
`project_overnight_build_nov22.md`. In short:

- **Live question bank:** write without asking per batch, once each batch passes two independent checks.
  Back up first. Broken or wrong-key questions are hidden from students and listed for him; nothing is
  "fixed" by guessing.
- **Merge and deploy tonight**, behind a site-wide password lock (the coordinator builds the lock). Only PRs
  307, 308, 309, 281 and tonight's work are merged. Other open PRs stay open.
- **Generation is free only:** Math by code with computed answers; Reading and Writing by Claude helpers
  (subagents and workflows), each item checked by a second, independent helper. **Never the paid API.**
- **Generated questions are used in all practice, never in exams.** The admin can tell original from
  generated; students never see the difference.
- **20 full-length exams from real bank questions held back** from all practice.
- **Exam window:** Saturday, 6 am to midnight, in the student's own time zone; once started an exam runs
  its full time, even past midnight. A test switch (admin or development only) opens it on other days.
- **Video lessons:** animated walk-throughs drawn in code with AI voiceover from VoiceStudio (local, free).
  Teach the skill, then walk through questions (three per video preferred). Voices: some videos a calm,
  friendly male voice, some a calm, friendly female one. Videos come last.
- **New screens:** one best version each, in the portal's current look.
- **Calculator:** changes allowed (error tips, statistics, regression, sliders, tables in the quiz look,
  memory per question and per bookmarked question). Nothing from Desmos is ever loaded, copied or fetched.
- **Bookings follow the Schedule's rules:** three moves a month, a late pass, 90 and 120 minute sessions
  (prices from `src/lib/marketing/offer.ts`; a length with no price there waits for the founder).
- **If usage runs low, the portal working end to end for a new student comes first,** then the bank, then
  exams, then lessons.

## Branches

- **Integration branch:** `claude/portal-complete`, cut from PR 309's `claude/student-portal-swap`. The
  coordinator session merges each workstream's branch into it, runs every check, pushes it to
  `claude/student-portal-swap` (PR 309), merges to `main` and deploys.
- **Each workstream** works in its own worktree on its own branch `claude/pc-<stream>`. Commit often and
  **push your branch to origin at least every hour**, so finished pieces can be merged and deployed during
  the night. Never merge to `main`, never deploy, never push to another branch, and open no pull request:
  the coordinator folds everything into PR 309.
- When the coordinator asks, merge `origin/claude/portal-complete` into your branch to pick up the others'
  work.

## Who owns what

Keep to your own files. If you must touch another stream's file, keep the change small and additive, and
say so in your report.

| Stream       | Branch                 | Owns                                                                                                                                                                                                                                                                                                                                                                       |
| ------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bank         | `claude/pc-bank`       | Retag into the 72 skills, key checks, explanations, hints, hiding broken questions; the 72-skill binding in the database; `src/lib/bank/`; the Library's switch from `skill-bridge.ts` to real tags                                                                                                                                                                        |
| Generator    | `claude/pc-generator`  | `src/lib/generator/`, `scripts/generator/`, the `origin` and `generator` columns, loading generated questions                                                                                                                                                                                                                                                              |
| Exams        | `claude/pc-exams`      | `src/lib/sat-engine/` (from PR 281), exam forms and pools, the practice-pool exclusion, the Practice plan's fixed set, exam play and its screens in `src/components/learn/exam/`, exam pages under `src/app/learn/`                                                                                                                                                        |
| Quiz modes   | `claude/pc-quiz`       | `src/components/learn/quiz-shell/` (sole owner of `QuizShell.tsx`, which is at 695 of 700 lines: split it first), skill set, Daily 10, Endless, time trial, strategy quiz, review mistakes and challenge play; their start and end screens; moving the new endings out of `src/app/dev/end-options/`; coins earning; answer shuffling; pen, highlighter, question selector |
| Portal pages | `claude/pc-pages`      | The pages still in the old look, new-student sign-up to portal, plan gates and paywalls, Settings wiring, bookings rules (`src/app/api/bookings/`, `src/lib/portal/schedule.ts`)                                                                                                                                                                                           |
| Calculator   | `claude/pc-calculator` | `src/components/calculator/`, `src/lib/calculator/`, the calculator's tests                                                                                                                                                                                                                                                                                                |
| Lessons      | `claude/pc-lessons`    | `src/lib/lessons/`, `SkillLesson.tsx` and lesson components, lesson videos and their audio, research notes                                                                                                                                                                                                                                                                 |

## Database migrations

Additive only (new tables or new nullable or defaulted columns); never drop, rename or rewrite data in a
migration. Use your stream's timestamp range so files never collide:

| Stream       | Range            |
| ------------ | ---------------- |
| Bank         | `2026112201xxxx` |
| Generator    | `2026112202xxxx` |
| Exams        | `2026112203xxxx` |
| Quiz modes   | `2026112204xxxx` |
| Portal pages | `2026112205xxxx` |
| Lessons      | `2026112207xxxx` |

Writes to live rows (not schema) happen through scripts run on purpose, after a backup, never through a
migration. Only the Bank, Generator and Exams streams write to the live question bank.

## Shared contracts

1. **Skill IDs.** `src/lib/skills/ids72.ts` (`SKILLS72`, `skill72(id)`, `isSkill72Id`, `skills72In`). Use
   these IDs in the database, lessons, generator, exams and portal. Never invent another ID scheme.
2. **Original or generated** (Generator stream, migration `20261122020000_question_origin.sql`):
   `quiz_questions.origin text not null default 'original'`, checked to `'original'` or `'generated'`, and
   `quiz_questions.generator jsonb` (null for originals; for generated: `kind` `"math-template"` or
   `"rw-helper"`, `template`, `seed`, `batch`, `checks`). Generated questions are never put in an exam.
   Student-facing payloads never carry `origin`; an admin sees a small "Generated" mark in the quiz and the
   Mistake Log (Quiz modes stream renders it after a server-side admin check).
3. **72-skill tags** (Bank stream). Storage is the Bank stream's choice (a binding table such as
   `question_skills72(question_id, skill_id, ...)` is recommended). It exposes read helpers in
   `src/lib/bank/` and switches the Library from `src/lib/portal/skill-bridge.ts` to the real tags. Until
   then every stream may keep using the bridge.
4. **Pools** (Exams stream). Questions held for the 20 exams are excluded from every practice pool (skill
   sets, Daily 10, Endless, time trials, challenge questions, strategy quizzes). The Exams stream puts the
   exclusion in the shared pool code (`src/lib/assembler/`) and exports one helper the others call. It also
   marks the Practice plan's fixed set of 5,000 (levels 1 to 6, never an exam question); the Portal pages
   stream builds the plan gate that reads it.
5. **Lessons** (Lessons stream). `src/lib/lessons/index.ts` exports `lessonFor(skillId)`,
   `strategyQuizFor(skillId)` (at most five questions, each `{ text, choices, right, why, subject }`) and
   `videoFor(skillId)`. The Quiz modes stream plays strategy quizzes from it (the compass, at the end of the
   lesson).
6. **Exam play** (Exams stream) lives in its own components and reuses the quiz engine's parts. It does not
   edit `QuizShell.tsx`; if the engine needs a hook, ask the Quiz modes stream in your report or keep the
   change to a few lines.
7. **Coins** (Quiz modes stream). Earning follows `project_start_screens_spec.md`; amounts are stand-ins
   aimed at about 3,000 coins a week for a steady student, marked as stand-ins in code.

## Rules for every stream

- Follow `CLAUDE.md`, the memory notes it points to, and the founder's notes for your area (each brief names
  them). American spelling. Plain words on screen. No AI-generated images. Never call a practice test
  "official", and never name the College Board's app on screen.
- **Memory on this Mac is 16 GB, shared by eight sessions.** Run `next dev` only while you are looking at a
  page, on your own port (below), and stop it right after. Never leave two running. Close headless browsers
  after each check. Prefer unit tests to screenshots.

  | Stream       | Port |
  | ------------ | ---- |
  | Bank         | 3481 |
  | Generator    | 3482 |
  | Exams        | 3483 |
  | Quiz modes   | 3484 |
  | Portal pages | 3485 |
  | Calculator   | 3486 |
  | Lessons      | 3487 |

- **Set up a worktree fast:** `cp -cR /Users/zakariabennis/Karman-Prep/.claude/worktrees/karmanprep-student-portal-0a96e6/node_modules ./node_modules`
  (an instant copy on this disk), then `npm install`. Copy the main folder's `.env.local` for local runs;
  never print it, never commit it.
- **Secrets:** never print or commit one. The site password is not in git.
- **Before each push of finished work:** `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, the
  tests for what you touched, `npm run check:sizes`. Never run Prettier over `src/**/*.css`.
- **Research notes** go in `docs/research/2026-11-22-<topic>.md`, written in plain language.
- **Report back** when your stream is done or blocked: what works, what does not, your branch and last
  commit, the checks you ran and their results.

## What happened during the night (coordinator's log)

- 10:33 UTC: PR 311 (migration only) put the Bank stream's `question_skills72` and `question_bank_checks`
  tables in production, so tagging could start before the rest was merged.
- 10:35 UTC: PR 312 (migration only) put `quiz_questions.origin` and `generator` in production, with a check
  that a generated question can only sit in the `practice` pool.
- The site lock (`src/lib/site-lock/lock.ts`) is on the integration branch; it switches on when the Worker
  has a `SITE_PASSWORD` secret.

## Open for the founder in the morning

- **Database size.** Supabase is on the free tier: a 500 MB cap, and going over makes the database
  read-only. It held about 152 MB before tonight. Generated questions are loaded in stages and stop near
  400 MB, so tonight's count is below the 200,000 goal. Reaching 200,000 stored questions needs a paid
  Supabase plan (a spending decision), or Math questions built on demand from their seed.
