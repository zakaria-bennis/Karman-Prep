# student-portal report

Branch: `claude/overnight-student-93c11d` (cut from `claude/overnight-ship` at `421f0672`).
Nothing pushed, nothing deployed, main untouched, production never touched. All database work
was on the local database.

## What is done

Every student tab now runs on the painted shell, with real data from the local database.
The tabs are Today, Homework, Library, Calendar and Progress, plus an Account page behind the
fox's menu.

- **Today** (built by paint-foundation) now uses the same student frame as the other tabs.
  It gained two cards: the homework due soonest, and the next two sessions or live events.
- **Homework** (`/dashboard/student/homework`): Canvas-style lists, Past due, Tonight,
  Tomorrow, This week and Later, then Done.
  - Work comes from four places: the tutor's homework (the tutor-affiliate table, once it
    merges), assigned practice sets, the time trials and tests a tutor opens, and cohort posts.
  - Time estimates count active time only. Each answer counts at most 2 minutes, rushed sets
    are ignored, and a new student's pace is blended with everyone's until they have 30 answers.
  - Done items show the result ("9 of 10 right · 11 min") and open the review.
  - Each done item has a one-line note signed David. The notes are written by fixed rules from
    the result, not by a paid AI, so they cost nothing.
  - One gentle line for late work, never repeated.
- **Library** (`/dashboard/student/library`):
  - The Challenge question banner (today's two hard questions). It can be dismissed for the day.
  - SAT Math and SAT Reading and Writing, each with its percent in a ring, the skill squares for
    every Domain, and Up next (the skill with the biggest score gain, no reason line).
  - Each course has its own page in Khan's side-list layout: Domains on the left, the open
    Domain on the right, each skill a square with its level and a practice link.
  - Practice: Endless mode (untimed, picks the next skill, mistake log inside) and Time trials.
  - Full-length tests.
- **Calendar** (`/dashboard/student/schedule`):
  - Booked 1:1s and cohort classes, with Move and Cancel. Cal.com and Zoom are off locally,
    so these fail with a clear message instead of breaking.
  - Book a session (Private plans only).
  - Workshops and office hours with "Save a spot". These are new: a `live_events` table and a
    `live_event_rsvps` table.
  - Recordings of past sessions, a month grid, and the private calendar feed link.
- **Progress** (`/dashboard/student/progress`):
  - One predicted score with its history line. Never a range, never a goal. The diagnostic only
    stores a range, so the page shows its middle, rounded to the nearest 10.
  - Skills by level in a ring, what moved this week, weekly time as small rings, personal bests.
  - Streak and rewards at the bottom: current and longest streak, tokens, the mystery box ring
    and the fox. Tokens appear nowhere else in the portal.
  - The old Mastered page and predicted-SAT chart are folded in and deleted.
- **Account** (`/dashboard/student/account`), opened from the fox's menu:
  - Your test: SAT or PSAT, and the date.
  - Invite a parent.
  - Sound and motion, including "Keep the painting still", which the painting now obeys.
  - Plan and billing (opens the Stripe customer portal in test mode).
  - Redeem a tutor's code.
  - Sign out stays in the menu.
- **Onboarding** now asks SAT or PSAT, and shows only upcoming test dates (the old list had
  run out in December).
- **Skill levels** (`src/lib/student/levels.ts`, one small module with tests):
  - Any answer makes a skill New.
  - Then 3 right in a row move it to Learning, 4 more to Understanding, 5 more to Conquered.
  - An answer given with a hint doesn't count toward the run.
  - A skill drops one level after 28 days without practice, never below New.
  - Levels are read from saved skill practice (`catalog_practice_*` tables).
- **Plan gates**: Free students get the portal with honest locks ("In Pro", "Practice plan",
  "See the plans"), never a dead end. The rules sit in one file (`src/lib/student/plan-gate.ts`)
  that mirrors the pricing session's `canAccess`, so swapping in `src/lib/plans` is one change.
- **The old Oct 27 dashboard** (`/student-preview`, its Time Trials and test runners, demo
  data) is deleted. Its data rules stay in `src/lib/student/` (mastery, skill points, time
  trial targets, unlock states, the module assembler) and are used by Homework and Progress.
  The old Learn landing page and the two skill maps now redirect into the Library.

## Founder decisions of 8 November morning (done)

- **Today's main button** starts the Daily 10 until it's done for the day, then the most
  urgent homework leads ("Start this homework"). With neither, it resumes the last lesson or
  opens the Library. Where the student left off shows as a link under the button.
  - The Daily 10 is the quiz-flows session's page at `/learn/daily-ten`. Today reads whether
    it's done from that session's `quiz_runs` table.
  - Checked with local rows: before the Daily 10, the button says "Start Your Daily 10"; after
    a finished Daily 10 for today, it says "Start this homework" and opens the late set.
- **Join from the account:** a "Join" button opens the Zoom meeting from 30 minutes before a
  class, 1:1 or office hours until it ends, on Today (Coming up) and in Calendar. Workshops
  show it once a spot is saved. Checked with a local class starting in 10 minutes.
- **Links to the quiz flows:** practice sets now open `/learn/set/<skill>`, Domain quizzes
  `/learn/domain/<domain>` and full-length tests `/learn/test/<1 to 4>`. A tutor's fixed
  assigned set still opens in catalog practice, which serves its questions. Time trials stay
  "Not open yet". These pages exist only once the quiz-flows branch is merged.
- **Levels and streak:** the Library, course pages, Endless mode and Progress also read the
  levels the quiz flows save (`student_skill_levels`). Each skill shows the higher of the
  saved level and the level from older practice. Finished quiz runs count toward the streak.

## Merged with claude/overnight-ship (10:20 CST)

`claude/overnight-ship` (pricing, parent-school, tutor, admin, site-audit) is merged into this
branch. Six conflicts, resolved keeping both sides:

- **Today** (page and its client): the painted Today stays (Daily 10 first, Join, homework,
  coming up). Ship's only change there was dropping the bounce to billing, which this branch
  already does.
- **Calendar page:** the painted Calendar stays, with ship's wording for an empty cohort list.
- **Onboarding:** the SAT or PSAT step and its date props stay. Ship's changes win elsewhere:
  parents no longer take the questionnaire, and the old `tier` link is gone.
- **The painting:** both the motion switch and ship's "pause when the tab is hidden" are kept.

Also changed so the pieces fit together:

- **Plans:** the portal now reads the plan from the pricing session's `getPlan`
  (`src/lib/plans`), so school seats, tutor codes and purchases count. My stand-in reader is
  deleted; `src/lib/student/plan-gate.ts` keeps only what the portal adds (live sessions,
  workshops, which tabs show, where to upgrade).
- **Invite a parent and tutor codes:** ship built the real pages (`/dashboard/student/invite-parent`
  and `/join`). The fox's menu and the Account page now lead there, and my stand-in forms for
  both are deleted. Those two pages and "Join a class" (`/join/class`) now use the same student
  frame as every other tab.
- The tutor-code page titles no longer say "Karman" twice.

Checked after the merge:

- `npx tsc --noEmit` passes, `npx eslint` on every touched folder passes, and the 26 test files
  around the merged code pass (300 tests).
- Headless browser: Today, Homework, Library, a course page, Endless mode, Calendar, Progress,
  Account, Invite a parent, Tutor code and Join a class, at 1440 light and 390 dark: all open,
  no sideways scroll, at most one main button, tokens only on Progress. The 36 links on the five
  tabs answer, except 10 that open the quiz flows' pages (`/learn/daily-ten`, `/learn/set/...`),
  which arrive with the quiz-flows merge. The fox's menu items open the right pages.
- **The local database lacks the pricing session's two migrations**
  (`20261108100000_subscriptions_plan_ids.sql`, `20261108110000_plan_grants.sql`), so locally
  every student reads as Free and each page logs "plan lookup failed". I didn't apply them: the
  first drops `subscriptions.tier` on the database every session shares. Apply them with
  `scripts/overnight/apply-migrations-local.sh <ship worktree>` when that's safe.

## What is not done

- **Time trials** aren't built by the quiz flows yet, so the Library shows them as "Not open
  yet" with no link. Their address is fixed in `src/lib/student/quiz-routes.ts`; flipping
  `ready` to true turns the link on.
- **When the quiz-flows branch merges:**
  - `src/components/dashboard/StudentDashboardClient.tsx` will conflict (both branches changed
    Today's main button). Keep this branch's version: it has the "done for the day" rule.
  - The level rule exists twice: the quiz flows' `src/lib/levels/rules.ts` (it saves levels)
    and this branch's `src/lib/student/levels.ts` (it reads older practice). They follow the
    same rule. Once merged, `levels.ts` should import the quiz flows' rule instead of its own.
- **Mystery box opening and the fox wardrobe** don't exist yet, so Progress shows the ring
  and the fox with no button.
- **Quiz history and Messages** (`/dashboard/student/quizzes`, `/chat`) still use the older
  frame. They work, but aren't painted yet.
- **Hints**: practice doesn't record hints yet, so every right answer counts toward the run
  until the quiz screen saves them.

## How I checked

- `npx tsc --noEmit`: passes.
- `npm run lint`: passes.
- `npm run check:sizes`: passes.
- `npm run format:check`: fails only on 19 files that came with the base branch
  (`prototypes/`, `docs/overnight/BRIEF.md` and two student-portal design docs). Every file I
  touched is formatted.
- Unit tests for the portal (levels, streak, courses, endless mode, plan gates, homework,
  notes, calendar, progress, onboarding schemas, the Learn redirects): 19 files, 132 tests pass.
  Full suite (`NODE_OPTIONS=--no-experimental-webstorage npm test`): 542 files, 9,360 tests pass,
  0 fail (254 are marked "expected to fail", as before).
- Headless browser (Playwright from the command line, never the app's browser pane), signed in
  as the local Pro persona (Liam):
  - Every tab (Today, Homework, Library, a course page, Endless mode, Calendar, Progress,
    Account) at 390, 768 and 1440 wide, in light and dark: 48 page loads, all open, no
    sideways scroll, no console errors, at most one main button per screen, tokens only on
    Progress, no score range anywhere.
  - All 52 internal links on those tabs answer.
  - The fox menu opens, Escape closes it and returns focus, and each item lands on its section.
  - The Challenge banner dismisses and stays dismissed for the day.
  - Account: SAT or PSAT and a date save; a parent invite saves and says no email went out; an
    unknown tutor code is refused; the painting switch saves and clears (and is locked on when
    the device already asks for less motion); "Manage plan and billing" answers with a clear
    message (the local test customer isn't a real Stripe customer).
  - Calendar: "Save a spot" saves and gives the spot back; Move and Cancel show clear messages
    because Cal.com is off; Cancel asks to confirm first.
  - Homework's main button opens the practice set.
  - I put Liam's local test date and parent email back afterwards.

## Decisions I made

- No subscription now means the Free plan with locks, not a bounce to billing.
- Homework and Calendar tabs show only when the plan uses them (a tutor or cohort; anything
  bookable), as decided on Nov 7. The pages still open if visited directly.
- "Up next" weighs each skill by its Domain's share of the test, split over the Domain's
  skills, times the levels left to climb.
- Endless mode's first rule: skills missed in the last two weeks come back first; otherwise the
  course that is further behind gets its Up next.
- The Challenge question opens the existing daily challenge (one Math, one Reading and Writing,
  the same for everyone).
- Workshops and office hours needed a home, so I added `live_events` and `live_event_rsvps`
  (migration `20261108083000`). `users.test_type` is new too (migration `20261108084000`).
  Both are applied to the local database only.
- The painting's motion switch is stored on the device (`karman-motion`), and the shell,
  greeting and painting all read it.
- Redeeming a tutor's code uses a small stand-in that follows the tutor-affiliate rules until
  that branch merges (`src/components/student-portal/account/tutor-code.ts` says how to swap).
- A parent invite is saved on the account. Email is off tonight, so the page says plainly
  that no email went out.
- The Today tab's browser title is now "Today" (it said "Dashboard").
- The local Progress test data used ids the practice history rejects, which made Today say
  saved practice couldn't load. The seed now makes valid ids
  (`supabase/seeds/overnight/student-portal-progress.sql`).
- Shared files I changed, kept small: the painted shell (`PortalShell.tsx`, `Greeting.tsx`)
  and the painting (`src/lib/painting/backdrop.ts`, new `motion.ts`) to obey the painting
  switch; the old Learn layout lost its dead subject switch; the theme toggle's page list lost
  `/student-preview`.

## Notes for the other sessions

- **Site-wide debug banner.** The "Help us debug your experience?" consent banner sits fixed
  over the bottom of every portal page until it's answered (design rule 34). It isn't part of
  the portal; the site-audit or QA session may want to move it.
- **Local daily challenge.** The dev server logged "Reviewed skill questions could not be
  loaded" for `/learn/daily` (where the Challenge banner leads). The page opens, but the local
  question pool read failed once; worth a look in QA.
- **The Pro test persona is a Cohort student here.** Liam's local subscription still has the
  old `tier = group`, so the portal reads him as Cohort until the pricing migration gives him
  `plan_id = pro`.
- **Quiz flows:** the route contract is `src/lib/student/quiz-routes.ts` (also in the shared
  notes).

## For the founder

- Level names: the four levels are New, Learning, Understanding and Conquered, as the brief
  says. You asked for ten fun options for the top level; that list is still open.
- Whether a full-length test card should show for Free students beyond the one free test, or
  hide them. Right now they show with "Practice plan" beside them.
