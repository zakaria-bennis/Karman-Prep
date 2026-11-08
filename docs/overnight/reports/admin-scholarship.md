# Admin portal and cohort scholarship (admin-scholarship session)

Branch: `claude/overnight-admin-028faa`. Nothing was deployed or pushed. All data work ran on
the local database only. All Stripe calls were in test mode.

## What is done

### The cohort scholarship, end to end

- **Data.** Two new tables (migration `20261108103000_admin_scholarship_claims.sql`):
  - `scholarship_claims`: one claim per student per cohort. It holds the uploaded report,
    what the automatic check read, the review decision and the Stripe payout ids.
  - `scholarship_claim_events`: a history of every step (upload, check, decision, payout).
  - The database itself allows only one award per cohort.
- **Upload.** Students upload their official score report at
  `/dashboard/student/scholarship`. They also type their score and test date, and confirm the
  file is unchanged. A rejected student can upload again.
  - Files are private. They sit behind a small storage layer that can be swapped:
    on the computer in development, Cloudflare R2 in production. Admins open them through a
    page that checks the admin role first. There is never a public link.
- **Automatic check** (pdf-lib and pdf-parse). It gives pass, warn or fail, with plain reasons.
  - The file: which program made or last saved it (Word or Canva fails; PDF editors such as
    Smallpdf or Acrobat warn), creation and change dates, later saves, text or shapes drawn on
    top, form fields, scripts and attachments.
  - The text: College Board and SAT wording, PSAT reports, practice tests and superscores, the
    name, the test date, the total and both section scores (they must add up).
  - The student's record: the name on file, the score and date they typed, the cohort's date
    window, and the same file uploaded for another student.
- **Ranking.** The top score in each cohort wins. Ties go to the earlier test date, then the
  earlier upload. Only the top claim can be approved; reject it and the next one moves up.
- **Admin review queue** at `/admin/scholarship`: tabs by status with counts, search, the
  cohort rank and the check result. Each claim has its own screen with the PDF, every check
  reason, what the report says, the file details, the cohort ranking and the history.
  - Approve (a note is required when the check didn't pass), reject (the reason is shown to
    the student), run the check again, or undo a decision that hasn't been paid.
- **Payout, Stripe test mode only.** It refunds the student's cohort payment and pays the rest
  of the $1,500 as a merit bonus.
  - The bonus is a **credit on the family's Stripe customer balance**. A Stripe transfer needs
    a Connect account for each family, and families don't have one. The credit works on every
    account.
  - Every step can be retried safely. A refund or credit is never made twice.
  - The code refuses to run with a live Stripe key.
- **Legal.** New section 12, "Cohort Scholarship", on `/terms`. Its numbers come from
  `offer.ts`.

### The admin portal

- The admin area now uses the painted portal shell. It has six tabs: Home, People, Plans,
  Scholarship, Questions and Cohorts. Six fit a phone's tab bar.
- **New admin home** (`/admin`): what needs a decision now, and links to every admin tool.
- **New pages** (built with a shared admin kit: dense tables, filters, search, status pills
  and clear empty states):
  - `/admin/scholarship` and `/admin/scholarship/<claim>`: the review queue.
  - `/admin/bank`: read-only views of the local question bank, plus a "flag for the import
    team" form. Flags go in their own table (`question_import_flags`). Nothing is ever
    written to the question bank.
  - `/admin/plans`, `/admin/affiliates` and `/admin/schools`.
- **Existing pages** (People, Cohorts, Revenue, Moderation, Jobs, Curriculum and the question
  tools) now open inside the painted shell. Their own content kept its old styling. Each
  returns a working page.

## Not done

- **Older admin pages.** People, Cohorts, Revenue, Moderation, Jobs, Curriculum and the
  question tools now sit in the painted shell, and a colour bridge makes them readable in
  light and dark. Their insides were not redesigned with the new admin kit. Each page loads,
  but their buttons were not clicked one by one tonight.
- **The student upload page** still uses the older student layout, not the painted student
  shell, and nothing in the student portal links to it yet. Its upload flow was tested
  through the real upload code and unit tests, but not clicked in a browser.
- **Plans.** Comps (free Practice or Pro) and the schools page need the pricing session's
  `plan_grants` table, which isn't on the local database yet:
  - The comp controls are disabled and say why.
  - The schools page shows its empty state.
  - "Change plan" works only on real Stripe test subscriptions. The seeded ones use
    made-up ids.
- **Affiliate tutors** is a read-only page.
- **The PDF viewer** was not seen working: headless Chrome has no PDF viewer. I checked
  that the file route returns the PDF only to admins, with no caching.
- **`npm run cf:build`** was not run (the brief keeps it for the end). `pdf-parse` adds
  pdf.js to the Worker. Check the Worker's size before deploying. Reading PDF text inside
  Cloudflare Workers is untested. If it fails there, the check says "no readable text,
  check by eye" and never crashes.

## How I checked it

- **Unit tests:** 70 pass. They cover:
  - the PDF check, including real PDFs made in the test (clean, edited, not a PDF);
  - ranking and ties;
  - the payout, with a fake Stripe (retries never refund or credit twice; live keys and
    live payments are refused);
  - the form checks and the private storage;
  - the admin bank and plans helpers.
- `npx tsc --noEmit`: no errors. Eslint and Prettier on every file this branch changed:
  clean. `npm run check:sizes`: OK.
- **Local database:**
  - Both migrations applied.
  - The demo seed made a finished cohort.
  - The real upload code ran on three sample reports. Ella's passed. Omar's warned (saved
    with Smallpdf, changed after it was made). Zoe's failed (she typed 1550, the report
    says 1450).
- **Headless Chrome** (Playwright from the command line, never the app's Browser pane):
  - 11 admin pages at 1440, 768 and 390 wide, in light and dark: all 66 loads worked, and
    none scroll sideways.
  - The scholarship flow, clicked through:
    1. Approving Zoe was blocked, because she isn't the top score.
    2. I rejected her with a reason.
    3. I ran Ella's check again.
    4. I approved Ella.
    5. I paid in Stripe test mode: a $995 refund and a $505 credit, both recorded with their
       Stripe ids.
- **Problems found in other sessions' code:**
  - The painted shell's start-up script causes a React warning ("Encountered a script
    tag"), and sometimes a hydration warning, on every shell page. This is for
    paint-foundation.
  - The existing `/admin/questions/review` page hit a database timeout once while the
    machine was overloaded.

## Decisions I made

- The $505 bonus is a Stripe customer-balance credit tonight (see above). The terms say the
  bonus is paid to the parent who paid. In live mode that needs a real payment method.
- Ties: earlier official test date wins, then the earlier upload.
- The admin tab bar has six tabs (Home, People, Plans, Scholarship, Questions, Cohorts),
  so it fits a phone. Every other tool is linked from the admin home.
- The admin box is wider than the student portal's, because admin tables are dense.
- The older admin pages got a colour bridge, not a redesign, to fit the time left.
- The automatic check never approves or pays on its own. An admin always decides, and must
  write what they checked by hand when the check didn't pass.
- The scholarship window: the test must be on or after the cohort's first day, and no later
  than 60 days after its last class. That matches the guarantee's 60 days.
- Scores the check reads from the PDF count as verified. A score the student only typed is
  shown as "typed, not read".
- A student who wins can't also claim the guarantee refund for the same cohort.
- Admin actions check the real role in the database, not the "view as" preview role.
- I added `pdf-lib` and `pdf-parse` to `package.json`, because the brief asked for them.

## For the orchestrator (merging)

- `offer.ts`: my block `COHORT_SCHOLARSHIP` sits right after the old `SCHOLARSHIP`. The
  pricing branch rewrites `SCHOLARSHIP` as the $1,500 merit scholarship, with the same field
  names (`amount`, `refund`, `meritBonus`). When you merge pricing:
  1. Keep pricing's `SCHOLARSHIP`.
  2. Add three fields to it: `satWithinDays: 60`, `claimDays: 30`, `payWithinDays: 30`.
  3. Delete my `COHORT_SCHOLARSHIP` block.
  4. Rename `COHORT_SCHOLARSHIP` to `SCHOLARSHIP` in `src/lib/scholarship/terms-section.ts`,
     `src/lib/scholarship/service.ts`, `src/lib/scholarship/schemas-storage.test.ts`,
     `src/app/admin/scholarship/page.tsx`, `src/app/admin/scholarship/[id]/page.tsx` and
     `src/app/dashboard/student/scholarship/page.tsx`.
     On this branch the price is still $1,295, so the pages read "$1,295 back plus a $205
     bonus". After the pricing merge they read $995 and $505. The payout always refunds what was
     actually paid.
- Terms page: I only added `SCHOLARSHIP_TERMS_SECTION` as the last entry of `SECTIONS` (and
  its import).
- The old shared `src/components/shared/PortalShell.tsx` lost its admin tabs (admin moved
  to the painted shell). Students still use it through `DashboardLayout`.
- Local database: after a reset, apply my two migrations again
  (`scripts/overnight/apply-migrations-local.sh <worktree>`). Then run
  `supabase/seeds/overnight/admin-scholarship.sql` and
  `npx tsx --env-file=.env.local scripts/scholarship/seed-local-claims.ts`. That makes a
  finished cohort with three sample claims and two $995 test payments.

## For the founder to decide

1. **How the $505 bonus reaches families in live mode.**
   - Tonight it is a credit on the family's Stripe balance, which only lowers future Karman
     bills.
   - The new terms say the bonus is paid to the parent who paid.
   - Options: a Stripe Connect payout, a check, or a bank transfer.
   - Live payouts stay off until you choose.
2. **A lawyer's review of the new terms section 12:** a merit award tied to a purchase,
   taxes, and students who are minors.
3. **The tie rule** (earlier test date, then earlier upload).
4. **Whether comps should keep their reason.** That needs a note column on `plan_grants`.
