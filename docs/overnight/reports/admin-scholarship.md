# Admin portal and cohort scholarship (admin-scholarship session)

Branch: `claude/overnight-admin-028faa`. Nothing was deployed or pushed. All data work ran on
the local database only. Every Stripe call was in test mode.

Updated 8 November, about 10:30, for the founder's morning decisions:

- the bonus is paid by bank transfer;
- a tie splits the award;
- admins see every student as a tutor does;
- admins see each tutor's students.

## What is done

### The cohort scholarship, end to end

- **Upload.** Students upload their official score report at `/dashboard/student/scholarship`.
  They also type their score and test date, and confirm the file is unchanged. A rejected
  student can upload again.
  - Files are private. Development keeps them on the computer; production keeps them in
    Cloudflare R2. Admins open them through a page that checks the admin role first. There
    is never a public link.
- **Automatic check** (pdf-lib and pdf-parse). It gives pass, warn or fail, with plain
  reasons. It checks three things:
  - the file: which program made or last saved it, its dates, later saves, anything drawn on
    top;
  - the text: the College Board and SAT wording, PSAT reports, practice tests, superscores,
    the name, the test date and the scores (the sections must add up);
  - the student's record: their name, the score they typed, the cohort's dates, and whether
    the same file was uploaded for another student.
- **Ranking and ties.** The top score wins. A tie for the top splits the $1,500 equally:
  $750 each for two.
  - Each claim stores its share.
  - The database refuses any approval that would take a cohort's awards past $1,500.
- **Review queue** at `/admin/scholarship`. It has tabs for Waiting, Approved, Bank transfer
  due, Paid, Rejected and All, plus search, the cohort rank and the check result. Each claim
  has its own screen with the PDF, the check's reasons, what the report says, the file
  details, the cohort ranking and the full history.
- **Paying, in three steps:**
  1. **Approve.** The screen shows the share ($1,500, or $750 in a two-way tie). A note is
     required when the check didn't pass.
  2. **Refund in Stripe, test mode only.** It refunds what the family paid for the cohort, up
     to the share. It is safe to retry and never refunds twice. Live keys are refused.
  3. **Mark as paid by bank transfer.** You send the rest of the share (the $505 merit bonus
     on a full award) by hand. Then you record the date sent and the bank reference. A
     two-way tie needs no transfer, because $750 is less than the $995 refunded.
- **Legal.** Section 12, "Cohort Scholarship", is on `/terms`, with the tie split and the bank
  transfer. Its numbers come from `offer.ts`.

### The admin portal

- The admin area uses the painted portal shell. It has six tabs: Home, People, Plans,
  Scholarship, Questions and Cohorts. The admin home links every other tool.
- **New pages**, built on a shared admin kit (dense tables, filters, search, status pills and
  clear empty states):
  - **Scholarship:** the review queue and a screen for each claim.
  - **Students** (`/admin/students`): every student, exactly as their tutor sees them.
    Each student's page shows the tutor's own tabs: skills and levels, tutor controls,
    flagged questions and quiz history. Admins see the answers to every attempt, not just
    the last 20. The page also has totals and a Homework list covering tutor homework,
    question sets, checkpoints, cohort homework and assigned tests.
  - **Tutors** (`/admin/tutors`): how many students each tutor has, regular and affiliate,
    with the list. On local data: David 6, Thomas 4, Priya 3 (affiliate, 3 of 50 seats) and
    Dev Tutor 1.
  - **Question bank** (`/admin/bank`): read only. It shows counts by Domain and skill, finds
    a question, and has a "flag for the import team" form. Nothing is written to the bank.
  - **Plans and subscriptions**, **Affiliate tutors** and **Schools.**
- **Older pages** (People, Cohorts, Revenue, Moderation, Jobs, Curriculum, the question tools)
  sit inside the painted shell. A colour bridge keeps them readable in light and dark. Their
  redesign comes after the portals land, as the brief says.

## Not done

- **The older admin pages** were not redesigned (scheduled for after the portals land).
- **The student upload page** still uses the older student layout. Nothing in the student
  portal links to it yet.
- **Plans:** comps and the schools page wait for the pricing session's `plan_grants` table.
  Until it lands, the comp controls are disabled with a note, and Schools shows its empty
  state. Comps have no reason notes, as decided.
- **The PDF frame** was not seen working, because headless Chrome has no PDF viewer. The
  file route was checked: admins only, no caching.
- **`npm run cf:build`** was not run. `pdf-parse` adds pdf.js to the Worker, so check its
  size before deploying.
- **No browser test of a tie.** The tie split is covered by unit tests and a database test.

## How I checked it

- **Unit tests** for the scholarship (PDF check, ranking and ties, refund, form checks,
  storage, terms), the admin helpers (bank, plans, tutors, students) and the admin nav. All
  pass.
- **Database:** two $750 shares in one cohort are accepted; a third award is refused.
- **Headless Chrome** (Playwright from the command line, never the app's Browser pane):
  - the full flow on Ella's claim: approve $1,500, refund $995 in Stripe test mode, record a
    $505 bank transfer (date and reference), and the claim shows as paid;
  - every admin page at 1440, 768 and 390 wide, in light and dark: each one loads, and none
    scroll sideways.
- **Final checks on this branch:**
  - `npm test`: all 547 test files pass (9,441 tests, no failures).
  - `npm run lint`: passes.
  - `npm run check:sizes`: OK.
  - `npx tsc --noEmit`: the only errors are the 4 in `src/middleware.ts`, from the
    site-audit merge (see below).

## Decisions I made

- If a tied claim is rejected after its partner was approved for $750, undo that approval and
  approve it again: the share then goes back to the full $1,500. If a third student ties
  after one approval, the screen asks you to redo the approvals, so the award splits evenly.
- The refund always returns what the family actually paid, up to the claim's share. Anything
  left is paid by bank transfer.
- The $1,500 cap is also written into the database, as a safety net. If the award ever
  changes, change it in the migration too.
- "Regular" students of a tutor are counted the way the tutor portal counts them: assigned
  students, plus current members of a cohort the tutor leads.
- Admin actions check the real role in the database, not the "view as" preview role.
- I added `pdf-lib` and `pdf-parse` to `package.json`, because the brief asked for them.

## For the orchestrator (merging)

- **`offer.ts`:** my block `COHORT_SCHOLARSHIP` sits right after the old `SCHOLARSHIP`. The
  pricing branch rewrites `SCHOLARSHIP` with the same field names (`amount`, `refund`,
  `meritBonus`). When you merge pricing:
  1. Keep pricing's `SCHOLARSHIP`.
  2. Add `satWithinDays: 60`, `claimDays: 30` and `payWithinDays: 30` to it.
  3. Delete my block.
  4. Rename `COHORT_SCHOLARSHIP` to `SCHOLARSHIP` in `src/lib/scholarship/terms-section.ts`,
     `src/lib/scholarship/service.ts`, `src/lib/scholarship/schemas-storage.test.ts`,
     `src/app/admin/scholarship/page.tsx`, `src/app/admin/scholarship/[id]/page.tsx` and
     `src/app/dashboard/student/scholarship/page.tsx`.
     On this branch the cohort price is still $1,295, so some text reads "$1,295". After the
     pricing merge it reads $995. The refund always uses what Stripe says was paid.
- **The scholarship migration was edited in place** (`20261108103000_...`), because it has
  never left this branch. On a local database that already has it, drop
  `scholarship_claim_events` and `scholarship_claims`, delete that version from
  `supabase_migrations.schema_migrations`, and apply it again. Then run
  `supabase/seeds/overnight/admin-scholarship.sql` and
  `npx tsx --env-file=.env.local scripts/scholarship/seed-local-claims.ts`.
- **`src/middleware.ts` (site-audit's merge) fails `npx tsc --noEmit`** with 4 type errors:
  the `clerkMiddleware(karmanAuth, ...)` typing at lines 114 and 139. I didn't touch it: it
  is security code owned by site-audit.
- **The painted shell's start-up script** causes a React "script tag" warning and an
  occasional hydration warning on every shell page. This is for paint-foundation.
- **Headless checks:** wait for the network to go quiet before clicking. Clerk's
  development handshake reloads each page once after it loads.

## For the founder

Nothing is waiting on you from this session. Your morning decisions are built.
