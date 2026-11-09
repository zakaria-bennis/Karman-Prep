# Tutor affiliate plan: overnight report

Branch: `claude/overnight-tutor-9d4a20` (cut from `claude/overnight-ship`, with the painted
shell merged in). Nothing pushed, nothing deployed, production untouched. Stripe test mode only.

## What works now

**For a tutor on the $199 plan** (sign in as `dev_seed_affiliate_tutor`, Priya Shah, locally):

- `/tutor` shows their code in big type, with **Share your join link** (the one main button),
  **Copy code**, **Copy link** and **Make a new code**. A new code retires the old one. Students
  who already joined stay.
- A ring shows seats used out of 50.
- The roster lists each student with a progress ring and one skill square per SAT Domain. Each
  row opens the student.
- `/tutor/[student]` shows a ring per course (SAT Math, SAT Reading and Writing) and a square
  per skill, grouped by Domain. It lists the student's homework (cancel any open item). The tutor
  can assign a **skill practice**, a **Domain quiz** or a **full-length test**, with a due date
  and an optional note. **Remove from my group** moves the student to Free and clears that
  tutor's open homework for them.
- `/tutor/billing` shows the plan's status in plain words ("Active. Renews Dec 8.", "Your last
  payment failed…", "Your tutor plan has ended.") and opens Stripe's customer portal.
- If the tutor's plan lapses, a strip across the top says their students are on Free, with a
  link to restart. They keep the roster and can remove students. Progress, homework and new
  codes wait until they restart.

**For a student:**

- **Tutor code** is in the account menu (fox avatar). `/join` takes a code; a tutor's share link
  `/join/ABCD-EFGH` fills it in. Codes work in any case, with or without the dash.
- Plain messages for every case: joined, already joined, wrong code, tutor's plan not active,
  group full, removed by this tutor (ask for a new code), already in another tutor's group
  (with a **Switch groups** option), not a student account.
- In a group: "You're in Priya S.'s group" and a **Leave the group** link.
- Tutor's plan ended: "Priya S.'s plan has ended. So you're on the Free plan for now. Your work
  is saved, and Practice comes back if your tutor restarts their plan."
- Removed by the tutor: a one-time strip saying so, with **Got it**.

**For a new tutor:** `/tutors/start` explains the plan and starts Stripe checkout.
`/tutors/welcome` (Stripe's return page) turns the account into a tutor-plan account and issues
the first code once payment is confirmed.

## How it is built (short)

- Five tables and one role, in `supabase/migrations/20261108043000_tutor_affiliate.sql` and
  `20261108043100_tutor_homework.sql`. Applied to the local database only.
- **The 50-student cap is enforced by the database**, and it holds under a race: I ran two
  students against the last seat at the same moment; one got in, the other was told the group
  was full.
- A tutor sees and changes only their own students. One server check decides this for every
  page and action; another tutor's student, or a removed one, is a "page not found".
- Server actions validate input with Zod and always act as the signed-in account (never an
  admin's "view as" target).
- How homework is stored, for the student-portal and parent-school sessions:
  `src/lib/tutor-affiliate/README.md`.

## How I checked it

- 65 unit tests for the tutor plan: the 50-seat cap (50th in, 51st out, seat freed on leave,
  a lost race reported as full), lapses (canceled, unpaid, past due after the paid period, no
  subscription), permissions (own students only, lapsed rights, admin, other roles), codes,
  homework and progress levels.
- Database checks on the local copy: cap, one tutor per student, failed code swaps keep the old
  code, the role list keeps every existing role.
- Headless browser (no app browser pane), reduced motion: every tutor screen at 390, 768 and
  1440 wide, light and dark, with no sideways scroll; every tutor button clicked; the student
  code page at all six sizes and its buttons clicked. Results below.

Results:

- **Tutor screens:** 52 of 63 headless checks passed on the run. None of the 11 misses was a
  broken feature. Six were page-text checks that ran before the page had finished opening (I
  fetched those pages again: progress, homework and the assign form are all there). Four were a
  dark-mode console warning from the shared shell (see the notes at the end). One was a
  removed-student check that ran too early; fetched again, that page is a "not found" as it
  should be. Every button worked: copy code, copy link, share (falls back to copying), make a
  new code, assign each of the three kinds of work, cancel homework, remove a student.
- That run also showed the old Stripe portal route failing locally, so I gave the tutor its own
  billing button (see "Decisions"). That new button passed the typecheck and lint, but I haven't
  clicked it in a browser again.
- **Student code page:** 12 of 12 layout checks (390, 768 and 1440 wide, light and dark, no
  sideways scroll) and 11 of 11 flow checks: the lapsed message, the in-a-group card, leave,
  a wrong code, rejoin with a loosely typed code, the removed notice and **Got it**, refused
  rejoin with the same code, the join link filling in the code, and joining with the new code.
- **Code checks on this branch:** `npx tsc --noEmit` passes. `npm run lint` passes.
  `npm test` passes: 541 files, 9,388 tests (plus 254 tests that are written to fail on
  purpose). `npm run check:sizes` passes. `npm run format:check` lists 20 files, all from the
  shared branch (the brief, prototypes and `PortalShell.tsx`), none of mine.

## Not done

- **Restyling the existing staff tutor screens** (cohorts roster, staff student page, briefing,
  schedule, earnings, payouts, settings) into the painted shell. The app froze from about 04:45
  to 07:55 and there wasn't time. They still work in the old style.
- An affiliate tutor who types a staff address (like `/tutor/schedule`) gets the old staff page,
  empty because they have no cohorts or staff students. It shows no student data. A guard
  should send them back to `/tutor`.
- **Joining the pricing work.** The $199 subscription and the students' Practice grant live in
  the pricing session's tables (`subscriptions.plan_id = 'tutor-affiliate'` and `plan_grants`),
  which aren't merged yet. `src/lib/tutor-affiliate/plan-bridge.ts` reads and writes those
  tables with their column names. After the merge, swap its insides for `grantPlan`,
  `revokeGrant` and `getPlan` from `src/lib/plans/`, and read the price from
  `TUTOR_AFFILIATE_PLAN` in `offer.ts` (it's written once, in `components/tutor-affiliate/nav.ts`).
- **Stripe checkout end to end.** The start button calls the checkout route with
  `{ plan: "tutor-affiliate", term: "month" }`, the pricing session's new format. Until that
  merges, it shows an error. I asked pricing to send tutors back to `/tutors/welcome`.
- Homework completion: the table has a "done" state, but nothing marks it yet. The quiz flows
  should mark an item done when the student finishes it (see the README).
- Signed-out students who open a join link are sent to sign-up and back. Pre-launch, the
  maintenance gate shows the coming-soon page to signed-out visitors first.

## Decisions I made

- **A separate role, `affiliate_tutor`.** Staff tutors are picked by role for automatic 1:1
  placement of paying private students and for payouts. An outside tutor with the `tutor` role
  could have been handed a Karman private student. The new role keeps them out of every staff
  pool by default.
- **50 seats per tutor, not per code.** Otherwise a new code would open 50 more seats.
- **A student removed by their tutor can't rejoin with the same code.** They need the tutor's
  new code. A student who leaves on their own can rejoin.
- **A failed payment keeps students on Practice until the paid month ends**, then they move to
  Free. This is the pricing session's rule for every plan, so tutor and student screens agree.
- **Codes look like `K7Q2-FEMH`**: eight characters without I, O, 0 or 1 (about a trillion
  possibilities, so guessing one is impractical).
- **Lapsed tutors keep their roster and can remove students**, but can't see progress, assign
  work or make new codes until they restart.
- Billing uses the pricing session's subscription instead of a second copy in my tables.
- The tutor's billing button uses its own small server action, because the existing portal
  route picks "the" subscription for an account (it breaks when an account has two) and can't
  run under the local sign-in bypass.

## For the founder to decide

- Should a tutor's lapse be immediate for students, or keep them on Practice a little longer
  (today: until the end of the month the tutor paid for)?
- Should a tutor be able to raise their cap above 50 (for example a $349 plan for 100)?
- Where tutors find the plan: the pricing page needs a "For tutors" link to `/tutors/start`.

## Notes for the orchestrator

- The dark-mode console warning "Encountered a script tag while rendering React component"
  comes from the shared shell (`PortalShell.tsx` / `Fox.tsx`), not these screens.
- The local-db apply script once tried to re-run an old migration while the database was being
  reset; running it again worked.
- To check the active tutor screens before the pricing tables exist locally, I added a temporary
  `plan_id` and `current_period_end` to the local `subscriptions` table and a test row for
  Priya. I removed all three at 08:48; the local table is back to how it was.
- Another session reset the local database during my checks, which re-created Priya's group with
  code PRYA-K7M2. My seed file (`supabase/seeds/overnight/tutor-affiliate.sql`) is safe alongside
  it. After my checks, Priya's live local code is NEWC-2346 and all three students are in her group.
- Commits on this branch: tables and rules (`956fc13a`), the active-plan rule (`d7f73d6d`),
  stores and plan bridge (`680abf84`), progress levels (`35efcc49`), README and seed
  (`757dcd64`), server actions (`8ee52434`), screens (`5967b3ac`), and this report.
