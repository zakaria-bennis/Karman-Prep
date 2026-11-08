# parent-school report

Branch: `claude/overnight-parent-school-ec079c`, cut from `claude/overnight-ship` at 421f0672
(the painted portal shell). Nothing pushed, nothing deployed, main untouched, production
database untouched. Everything was checked against the local database.

## What is done

### Parent portal (`/dashboard/parent`)

A bigger-picture, less detailed version of the student's view, on the painted shell. Four tabs:
Week, Progress, Sessions, Billing. A parent with one child goes straight to that child; a parent
with several picks one, and can switch from the account menu.

- **Week:** homework done, late and due this week, minutes practiced in the last 7 days, the next
  sessions, the predicted score, the guarantee and the latest tutor note. The main button opens
  this week's email.
- **Progress:** one predicted score with its history (a ring per measure), skills by level in a
  ring (New, Learning, Understanding, Conquered), skill squares by Domain, and a percent ring for
  SAT Math and for SAT Reading and Writing.
- **Guarantee:** shown for Cohort and Private families only. The target is +100 points from a
  starting score under 1400, +50 from 1400 or higher. The start is the first measured score.
- **Sessions:** what is coming up, recordings (when Zoom saved one), past sessions, and the
  family calendar link.
- **Billing:** opens Stripe's own billing page (test mode) to change the card, see invoices or
  cancel.
- **Weekly email:** a preview of the exact email. "Send it to me now" logs instead of sending,
  because email is switched off on this computer.
- **Parents have their own account** (founder decision, 8 November morning). At sign-up,
  "I'm a parent" makes a parent account at once and opens the parent portal; the student
  questions and checkout are for students only now. The new parent is asked for their child's
  code.
- **Invite a parent:** the student opens `/dashboard/student/invite-parent` and gets a link and a
  short code (like DCJS-XDNX). Both work once and last 14 days. The parent opens the link and
  presses "Accept and link", or types the code under "Link a student". Either way they land on
  the child's week. A used, expired or mistyped code or link says so. A parent can link more
  children from the account menu.
- **Join on Zoom** (founder decision, 8 November morning): each upcoming session and cohort class
  gets a "Join" button for its Zoom meeting, from 10 minutes before the start until the end. When
  a session is on, the parent's week leads with "On now: 1:1 with David" and "Join on Zoom". Only
  real Zoom links (https, zoom.us) are offered.
- **Parents never see questions.** The parent pages read only skill names, levels, counts, minutes
  and dates: never a question, a question id or an answer. The student's invite page does not
  describe what the parent will see.

### School portal (`/school`)

For a teacher or school admin. Two tabs: Classes and Billing.

- **Plan status:** "Free until August 31, 2027, then $8 per student a year" (the date is the
  school's own).
- **Classes:** each with its join code and number of students. A teacher can create a class.
- **A class:** the join code with Copy code and Copy link, and "Make a new code" (the old code
  stops working). The roster shows each student with a progress ring, skill squares for each of
  the 8 Domains, when they last practiced and how much assigned work they finished.
- **Assign work:** a skill practice set, a Domain quiz or a full-length test, with a due date.
  The class's assigned work lists "2 of 4 done" and can be taken off Homework.
- **Remove a student:** behind a confirmation step. Their own practice history stays theirs.
- **Renewal:** "Set up renewal" opens Stripe Checkout (test mode) for a yearly plan at $8 per
  seated student. The first charge is on the free-until date, so nothing is charged in the free
  year. Afterwards the button becomes "Manage billing in Stripe".
- **Students join** at `/join/class` with the code, or from the class link (code filled in).
  Each student who joins gets a Practice plan of their own, never a shared pool.

### Data

- New table file `supabase/migrations/20261108130000_parent_school.sql`: parent invites,
  schools, school members (admin or teacher), classes with join codes, seats (one student in one
  class) and class assignments. Server only: nothing in the browser can read these tables.
- Local test data `supabase/seeds/overnight/parent-school.sql`: Lakeview High School (free until
  August 31, 2027) with Thomas Wright as its admin, Period 3 (code LKV3PQ, four students) and
  Period 5 (code LKV5RT, empty), one assignment, practice history for Maya Johnson and the four
  Lakeview students, and an open invite from Ava Patel.

## How I checked it

- Headless Chromium from the command line only, never the app's browser pane. One dev server, on
  port 3110, stopped when done. Roles were switched with the admin's "view as" feature.
- Every page (5 parent pages, 3 school pages, the invite page and the join page) at 390, 768 and
  1440 wide, in light and dark: 60 loads, all opened, none scrolls sideways, no page errors, and
  never more than one main button. I looked at the screenshots: phone, iPad and desktop, both
  themes.
- Clicked every button and link, 37 checks, all pass: each parent tab and link, the account menu,
  the email preview and "Send it to me now", Stripe's billing page (it opens, test mode), creating
  a class, a new join code, copying the code and the link, assigning a practice set and a Domain
  quiz, refusing work with no Domain, taking work off Homework, removing a student, renewal
  (Stripe Checkout opens, test mode), joining with a code from the link, refusing a wrong code,
  the student making an invite, copying it, the parent accepting it and landing on the child's
  week, the two-children list, a used link saying so, and the student seeing the linked parent.
  I also read the rows back from the database after each change.
- The founder's two morning decisions, 12 more checks, all pass: a session on now leads the week
  with "Join on Zoom" (it opens the meeting in a new tab, still one main button), Join shows only
  for the session that is on, the student sees a short code, "I'm a parent" at sign-up opens the
  parent portal, a wrong code is refused, the right code (typed in lower case) links the child,
  "Link another student" in the menu, and a used code is refused. I set one of Maya's local
  sessions to "now" for the test and put it back afterwards, along with the test accounts.
- I found and fixed four bugs on the way: billing and the email preview crashed while email is
  off, roster rings were squashed, numbers sat outside their rings, and the assign form was
  below a long roster.
- 19 new unit tests (skill levels, guarantee, weekly email, school terms and homework, the Join
  window and Zoom links): all pass.
- Code checks on this branch: `npx tsc --noEmit` passes, `npm run lint` passes,
  `npm run check:sizes` passes, and the full unit test suite passes (540 files, 9,336 tests, 0
  failures; 254 are written to fail on purpose). `npm run format:check` lists 21 files, all from
  before my work (prototypes, docs and the portal shell); my files are formatted. I did not run
  `npm run cf:build`: the machine was overloaded and the brief keeps it for the merged branch.

## Not done, and limits

- **The student's Homework tab** belongs to the student-portal session and is not on my branch.
  School work is ready for it through one function, `listSchoolHomeworkForStudent`, and I sent
  that session the details. Until it is wired in, students see school work only through the
  teacher's roster counts.
- **The tutor-affiliate assignment model** is not on `claude/overnight-ship` yet, so school work
  uses its own small table and a documented interface with the same item shape
  (`src/lib/school/homework.ts`). After both merge, the Homework tab can list both.
- **Plan access (`src/lib/plans`)** from the pricing session is not on my branch, and its table is
  not in the local database yet. Joining a class writes the student's Practice grant in exactly
  the pricing session's format; until the table exists it logs "not installed" and carries on.
- **Completing a renewal checkout** was not clicked through: it needs a test card typed into
  Stripe's own page, which I may not do. Checkout opens correctly in test mode, and the return
  path checks the payment with Stripe before recording it.
- **Recordings:** no session in the local data has one, so the list shows its empty line.
- **Domain quizzes and full-length tests** assigned as homework show as open until the quiz
  flows record a finished quiz against the assignment. Their "start" link opens the Library.
- **The weekly email is not scheduled.** The preview and "send now" work; nothing sends it every
  week yet.
- **Adding teachers and signing up a school** have no screens. A school is created by Karman.
- **Zoom in the school portal:** school classes have no live sessions in this build, so there is
  nothing to join there yet. The student's own Join button belongs to the student portal's
  Calendar (student-portal session).

## Decisions I made

- **Predicted score:** the middle of the measured range, rounded to the nearest 10. The founder's
  rule is one score, never a range.
- **Skill levels** come from skill practice answers. Old lesson quizzes do not count (the skill
  map says old topics are never counted as mastery). Practice answers do not record hints yet, so
  every right answer counts toward the run. A skill drops one level for every three weeks
  without practice, never below New.
- **School roles** (admin, teacher) live with the school, not on the person's account. Teachers
  see their own classes; admins see every class.
- **One Practice grant per student per school.** It ends when they leave the school's last class.
- **Times** show in Central time, marked "CT", until families can pick their own zone.
- **Parent accounts:** only a new account becomes a parent (at sign-up, or by accepting an invite
  link). A student who has set up their account, a tutor or an admin is never changed; they are
  asked to use another email for the parent account. A new invite retires the old one.
- **Link codes** are 8 characters without look-alikes (no I, O, 0 or 1), shown as two groups of
  four, typed in any case.
- **Join** appears 10 minutes before a session and stays until it ends.
- **Deleted:** the old parent page's "focus summary" helper, unused since the parent pages were
  rebuilt (replace, don't accumulate).

## For whoever merges

- `src/lib/progress-glance/levels.ts` and the tutor-affiliate session's
  `src/lib/tutor-affiliate/progress-rules.ts` both hold the skill-level rule. Keep one.
- After the pricing merge: swap `src/lib/school/plan-bridge.ts` to `grantPlan` and `revokeGrant`,
  read $8 from `SCHOOL_PLAN` instead of `src/lib/school/terms.ts`, and read the guarantee numbers
  from `GUARANTEE` instead of `src/lib/parent/guarantee.ts`. Each file says so at the top.
- Add "Invite a parent" (`/dashboard/student/invite-parent`) and "Join a class" (`/join/class`)
  to the student's account menu. I left `StudentDashboardClient.tsx` alone to avoid a conflict.
- Run `supabase/seeds/overnight/parent-school.sql` after a local reset.
- Onboarding: the pricing session rewrote `OnboardingClient.tsx` and `RecommendationStep.tsx`, so I
  changed only one line there. Parents no longer reach the questionnaire, so after the merge
  delete its leftover parent wording ("Parent intake" and "your child").
- The parent role test (`tests/e2e/local-role-audit.spec.ts`) now expects a one-child parent to
  land on that child's week.

## For the founder to decide

- Should the weekly email go out on its own, and on which day?
- Who adds teachers to a school: the school admin from the portal, or Karman?
- Which time zone families see (now Central time for everyone).
