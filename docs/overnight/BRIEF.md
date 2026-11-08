# Overnight build brief, 8 November 2026

Read this whole file before you start. It is the single source for tonight's
work. The founder, Zakaria, is asleep from about 04:15 to 09:00 CST and cannot
answer questions. When something is unclear, make the sensible choice, keep
going, and list it under "Decisions I made" in your report.

## The goal

By 09:00 CST, one branch, `claude/overnight-ship`, holds a complete, polished,
shippable Karman product:

- The public site keeps its live look (the founder is proud of it). Prices,
  pictures and bugs get fixed.
- The student, parent, tutor (with the new affiliate plan), school and admin
  portals are in the painting style, with every button doing something real.
- The quiz flows (Daily 10, practice sets, Domain quizzes, full-length tests)
  use the real quiz engine and its animations, in the Karman style.
- Every work channel (question import, quiz engine, figures, grading,
  calculator, portals) is merged together.
- Bugs and ways to break the site are found and fixed.

Nothing is deployed. Main is never touched. The founder deploys himself.

## The founder's decisions tonight (final)

### Prices

These replace the Oct 30 ladder (Platform $29, Plus $49) everywhere: site,
`src/lib/marketing/offer.ts`, `docs/business/`, app plans, emails, legal pages.

| Plan | Price | What it includes |
| --- | --- | --- |
| Free | $0 | 100 questions in total, plus one free full-length test. |
| Practice | $39 a month, or $89 for 3 months | The core question pool, with written explanations. |
| Pro | $69 a month, or $149 for 3 months | Every question, including the hard mastery pool, plus video explanations. |
| 9-week Cohort | $995 | At most 6 students. 18 sessions, twice a week, 60 minutes each. Score bands 1000 to 1200, 1200 to 1400, 1400 to 1600. No 1:1s. |
| Private 10 | $1,495 | 10 hours of 1:1 tutoring. |
| Private 20 | $2,495 | 20 hours of 1:1 tutoring. |
| Schools | $8 per student a year, first year free | Each student gets Practice-plan access of their own. It is not a shared pool. |
| Tutor affiliate | $199 a month per tutor | See below. |

- **Guarantee:** the Cohort, Private 10 and Private 20 carry it. The target is
  +100 points for a student whose baseline is under 1400, and +50 for a
  baseline of 1400 or higher. Keep the existing remedy structure in
  `offer.ts` (money back or a free repeat) and adapt it to these targets.
- **Scholarship:** $1,500 to the top-scoring student in each cohort. Build all
  of it, in Stripe TEST mode only:
  - The student uploads their official score report (PDF).
  - An automatic check of the PDF (metadata, text, the score itself).
  - An admin review queue.
  - The payout: refund the $995 and pay a $505 merit bonus.
  - A legal clause in the terms.
- **Access is enforced on the server:** which question pool (core or mastery)
  and which explanation type (written or video) a plan may see.
- **Tutor affiliate plan:** aimed at tutors who sell on marketplaces like
  Leland.
  - The tutor pays $199 a month and gets a code.
  - Up to 50 students who redeem the code get the Practice plan free while the
    tutor's subscription is active.
  - The tutor gets admin rights over those students: see their progress,
    assign work, manage the roster, remove a student.
- `offer.ts` has a known inconsistency: a $100 deposit plus 3 × $345 makes
  $1,135, not $995. Fix it so the instalments add up, and say how in your
  report.

### The student portal

The full list is in `docs/design/student-portal-decisions-2026-11-07.md`.
Tonight's additions:

- **Skill levels:** an empty outline square means not started. Then **New**
  (reached on the first try), **Learning**, **Understanding** and
  **Conquered**.
  - A run of 3, 4 and 5 right answers in a row moves a skill up to Learning,
    Understanding and Conquered.
  - A question answered with a hint doesn't count toward the run.
  - Mixed check-ins bring old skills back.
  - A skill drops a level after weeks without practice (skill decay).
- **Practice set:**
  - 10 questions, adaptive within the set.
  - If it ends without the run, the main button is "Rewatch the video", and
    "Try again" is a text link beside it.
  - Tokens show only on the result screen.
- **Domain quiz:** about 12 questions, and it can raise several skills at
  once. There is no course-wide test.
- **Courses:**
  - Two courses, SAT Math and SAT Reading and Writing, each split into the
    College Board's Domains.
  - The course page uses Khan's side-list layout: Domains on the left, the
    open Domain on the right.
  - Each course shows its percent in a ring.
  - "Up next" picks the skill with the biggest score gain, with no reason
    line.
  - Work a tutor assigns lives in Homework.
- **AI homework notes:** signed "David" (David agreed).
- **Visual system:** port it from `prototypes/today-directions/` (open
  `index.html` there; also `today.js`, `screens.js`, `landscapes.js`,
  `painterly.js`, `life.js`, `backdrops.js`; the fox is in
  `prototypes/student-skeleton/fox.js`).
  - **Backdrop:** Karman's own paintings only (no museum art, no photos).
    - One painting a day, relit for dawn, day, sunset and night.
    - On first open it is painted in stroke by stroke in 3.8 seconds,
      following Bob Ross's order.
    - Wildlife and motion come in after the painting.
    - Nothing moves behind text.
  - **The box:** a tinted, squared-off box (4px corners), left of center,
    full height, the same on every tab. Inside it, cards with even gaps.
  - **Skills and progress:** skills are squares; all progress is a ring.
  - **Numbers:** always Hanken Grotesk with lining figures. Young Serif is
    never used for numbers.
  - **Colors:**
    - The accent and the four level shades come from each day's painting:
      one hue, checked so white text on the main button passes 4.5:1.
    - Clean line icons.
    - The fox and streak sit top right.
    - Main buttons carry a chevron.
  - **Type:** the "Bold moments" style. Young Serif for big headings, Hanken
    Grotesk for everything else.
- **Never:**
  - A score goal anywhere.
  - Coins outside Rewards and Progress.
  - A score range (show one predicted score).

### The public site

- Keep the live look.
- Every phone or laptop that appears in a photo must show real Karman UI.
  Overlay it in a clean, realistic device frame using code (canvas, sharp or
  CSS). No money is spent on image generation tonight.
- Also build a painted version of the home page as a separate mock for the
  founder to compare. It must not replace anything.

## Rules that never bend

- Never deploy (`cf:deploy`), never merge or push to `main`, never push any
  branch except where your brief says so.
- **Never touch the production database.** `.env.local` in the main checkout
  points at the production Supabase project (`yyoc…`). Never run `db:push`,
  migrations, seeds or the app against it.
  - Use the local database: copy
    `/Users/zakariabennis/Karman-Prep-wt/overnight.env.local` into your
    worktree as `.env.local`.
  - Until that file exists, the local-db session is still setting it up: do
    code work and don't run the app.
  - Reading the production question bank to copy questions into the local
    database is allowed only for the local-db session.
- Never write to the live question bank.
- Never print, log or commit a secret. Never `cat` an env file.
- Never write inside `~/Library/CloudStorage/`.
- No image-generation spend tonight.
- **The calculator:**
  - The founder allowed merging its branches tonight. Merge them as they are.
  - Don't redesign it, and don't load Desmos.
- **Replace, don't accumulate.** When something is replaced, delete the old
  version in the same change.
- **Commits:**
  - Commit by explicit paths, with hooks off:
    `git -c core.hooksPath=/dev/null commit -m "..." -- <paths>`.
  - End every commit message with
    `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Design rules in `docs/design-rules.md` win over everything else. In
  particular:
  - 28: no sideways scroll.
  - 33: theme follows the device; AA contrast by calculation in both modes.
  - 34: nothing fixed or sticky over text being read.
  - 35: one highlighted call to action per screen.
  - No eyebrow labels, no 01/02 numbered lists.
- Every screen works on phone (390), iPad (768) and desktop (1440).
- Click every button and link you build in a real browser before calling it
  done. No stub toasts may remain.
- Server actions validate their inputs with Zod. Keep files under about 700
  lines. Unused variables and unescaped JSX characters are lint errors.
- External services are switched off in the overnight env file:
  - email, Slack, Cal.com, Zoom, Fireflies, Sentry and R2 uploads.
  - Stripe is test mode.
  - Code that calls a switched-off service must fail gracefully and log
    instead.

## The machine

- 12 CPUs, 16 GB RAM, about 30 GB of disk free. Up to ten sessions share it.
- **Dev servers:**
  - Keep at most one dev server running, on your own port (table below).
  - Stop it when you aren't checking.
- **Heavy jobs:** run `npm run cf:build` at most once, at the end. Never run
  two heavy jobs (build, full test suite, lint) at the same time inside your
  session.
- **Install and tests:**
  - Install with `npm ci --prefer-offline` in your worktree.
  - Tests: `NODE_OPTIONS=--no-experimental-webstorage npm test`.
  - Playwright is in `node_modules`.
- **Lint:** `npm run lint` dies on the `.wrangler` folder. Add `.wrangler/**`
  to the ESLint ignores if your branch lacks it.

| Session | Port |
| --- | --- |
| merge-ui | 3101 |
| merge-rest | 3112 |
| pricing | 3102 |
| paint-foundation | 3103 |
| site-audit | 3104 |
| painted-home | 3105 |
| tutor-affiliate | 3106 |
| admin-scholarship | 3107 |
| student-portal | 3108 |
| quiz-flows | 3109 |
| parent-school | 3110 |
| qa-sweep | 3111 |

The local Supabase runs on its default ports (API 54321, database 54322).

## Branches and merging

- Your session works in its own worktree, on its own branch, cut from
  `claude/overnight-ship`.
- Commit often. Don't push.
- **Merging:**
  - Don't merge other sessions' branches into yours unless your brief says
    so.
  - You may merge `claude/overnight-ship` into your branch to pick up shared
    work. It moves forward during the night as the orchestrator merges
    finished sessions.
  - Check `git log --oneline -5 claude/overnight-ship`.
- Shared files (package.json, layouts, tokens): change them only if your brief
  owns them. Otherwise add what you need inside your own folders and say so in
  your report.

## Deadlines (CST)

- Builders stop adding features at 07:40, commit, and report by 07:50.
- The orchestrator merges everything from 07:50.
- A QA sweep runs on the merged branch from about 08:00.
- The final checks and the founder's report are due by 09:00.

## How to report

When you finish, end your turn with a short report:

- your branch name
- what is done
- what is not
- how you verified it (screens you clicked, checks you ran)
- "Decisions I made"
- anything the founder must decide

Also write the report to `docs/overnight/reports/<your-session-name>.md` and
commit it. Write plainly, in short sentences. The founder isn't technical.

## The checks

Run these before reporting, on your branch:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run format:check`
- `NODE_OPTIONS=--no-experimental-webstorage npm test`
- `npm run check:sizes`

Fix what you broke. If a failure was there before your work, say so in your
report instead.
