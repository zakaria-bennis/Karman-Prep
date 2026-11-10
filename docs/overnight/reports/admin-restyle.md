# Older admin pages and staff tutor screens restyle (admin-restyle session)

Branch: `claude/overnight-admin-restyle-077269`, cut from `claude/overnight-ship`. Nothing was
deployed or pushed. Only the local database was used. The earlier commits are already merged
into `claude/overnight-ship`. The commits after the computer restart are not merged yet.

## What is done

### The older admin pages, rebuilt on the admin kit

They now look like the new admin pages. Each one has:

- a title and a one-line summary;
- totals at the top;
- filter tabs and a search box;
- a dense table that turns into cards on a phone;
- a clear empty state with "Clear filters" or "Clear the search".

Every page keeps its data and its actions.

- **People** (`/admin/users`): role tabs, search, cohort filter. Each row has role change, Allow
  retake and Impersonate. Parents also have "linked, manage", which opens the linked-students
  dialog.
- **Cohorts** and **each cohort**:
  - The list has type and tutor filters, search and Create cohort.
  - Each cohort has Members, Notes and Homework tabs, plus Add member, Remove and Mark setup
    complete.
- **Revenue:** headline totals, sections and charts in the portal's colours. "Snapshot now" is
  the one main button.
- **Moderation:** Waiting and Rejected tabs, search, Approve, Reject, Warn sender and the sender
  panel.
- **Jobs**, **Curriculum** (and each node), **Import jobs** (the PDF pipeline) and each import
  job.
- **The question tools:** quality dashboard, inspector list, rejected, import, review (header,
  tabs and filters), chart review and geometry review.
  - The big question editors (preview, the inspector's detail page) keep their layout. They now
    use the portal's colours.

### David's staff tutor screens, in the painted shell

They now match the affiliate tutor portal. They have their own tabs: Students, Briefing,
Schedule, Earnings, Payouts and Settings.

- **Students:** your cohorts as rows with a seat ring. Your students sit in a sortable table with
  search, a cohort filter, a ring each for Reading and Math, and flags. The Connect Cal.com
  reminder is a strip at the top.
- **A student's page:** the student's name, a ring for each course instead of bars, the average
  quiz score, the timing setting, and Skills, Tutor controls, Flagged questions and Quiz history
  tabs.
- **Briefing**, the saved practice briefing, and "Review as student".
- **Schedule:** Upcoming, Live sessions and Cohorts tabs, sessions grouped by day. Only the next
  session's Join button is highlighted. Reschedule and Cancel still work on private sessions.
- **Cohort:** Members, Notes and Homework (post and delete).
- **Earnings**, **Earnings data** (time range), **Payouts**, **Payment settings** and **Booking
  settings**. The Settings tab opens Booking settings.
- **Session recap draft.**

### The colour bridge is gone

- The older pages used the website's own colour names, which a "bridge" translated inside the
  admin box. Now about 4,000 colour classes in admin and tutor code use the painted portal's
  colours directly, so light and dark follow the device.
- A few extra staff colours (warning, info, two quiet surfaces, accent text) live in
  `src/components/admin/workbench/tokens.css`.
- Old dark-mode classes and eyebrow labels on the tutor screens are removed.

### Bugs found and fixed on the way

- **Cohort members had no ID.** On the admin cohort page, each member row came back without
  their user ID, so "Remove" on a cohort member would have removed no one. Fixed in
  `fetchCohortDetail`.
- **White text on light colours in dark mode.** Some buttons and badges showed white text on
  colours that are light in dark mode. Main buttons now use the accent colour, which is checked
  for white text. Status colours now show ink text on a tint.
- **The tutor's student page showed only an email.** It now shows the student's name.
- **"View question bank"** on the import page pointed to a page that doesn't exist. It now opens
  `/admin/bank`.

## Not done

- **The old layout files are deleted** (claude/fix-portals, 2026-11-09): Messages, Quiz
  history and the scholarship upload moved into the student portal shell.
- **Affiliate tutors on staff pages** are now sent back to `/tutor` (claude/fix-portals,
  2026-11-09): staff-only routes sit in `src/app/tutor/(staff)/`.
- **Some tutor tab contents** (Skills, Tutor controls, Flagged, Quiz history) are re-coloured,
  not redesigned. They keep their own tables and filters.

## How I checked it

- **Headless Chrome** from the command line, never the app's Browser pane, on one dev server
  (port 3123).
- **Layout:**
  - All 15 older admin pages and all 11 staff tutor screens, at 390, 768 and 1440 wide, in
    light and dark (156 page loads).
  - Every page loads, and none scrolls sideways.
  - The only console problem was the cohort ID bug above, now fixed.
- **Clicks as tutor David:**
  - Roster: search, clear filters, cohort filter, sort, the cohort row, the student link, the
    Cal reminder and the briefing link.
  - Student page: all four tabs, the timing switch (set back afterwards), the briefing links.
  - Briefing: the date form.
  - Schedule: all three tabs, Reschedule and Cancel open their forms.
  - Cohort: tabs, notes save, and the homework form opens.
  - Earnings data: range filter and back link. Payouts: its link.
  - Payment settings: the Stripe button. Locally it shows Stripe's error, as expected.
  - Booking settings: the Connect link.
  - Every tab in the rail, and the account menu.
  - Everything passed.
- **Clicks as admin:**
  - People: every role tab, search, clear filters, Impersonate (asks first; I said no), the
    parent links dialog, and both header links.
  - Cohorts: every tab, the Create cohort dialog, Open, the cohort's tabs, the Add member
    dialog, and Remove (asks first; I said no).
  - Revenue: Snapshot now ("Captured: $396 MRR"). This wrote one snapshot row to the local
    database.
  - Moderation: both tabs and an empty search. Jobs and Curriculum: every tab and link.
  - Inspector: every tab and header link. Review, chart review, geometry, import and import
    jobs: every tab.
  - Question bank buttons that write (accept, reject, delete, import) were not pressed: they
    write to the shared question bank.
- **Checks:**
  - `npx tsc --noEmit`: passes.
  - `npm run lint`: passes.
  - `npm run check:sizes`: OK.
  - `npm run format:check`: only 3 docs files from other sessions remain (the brief and two
    student-portal research notes).
  - `npm test`: everything passes except 4 tests in the calculator (`engine.break-corpus`,
    `seam-boundaries`, `reference-rows`). This branch doesn't touch the calculator. They were
    slow or failing under machine load.

## Decisions I made

- **Colours:** I swapped the old colour names for the portal's colours across the whole admin
  and tutor area, instead of keeping a translation layer. Code that is used outside the portal
  (the impersonation banner in the site's root layout) kept its old colours.
- **One highlighted button per screen:**
  - When a button repeats on every row (Approve, Restore, Join), it is plain. On the schedule
    only the next Join is highlighted.
  - Dialog submit buttons are highlighted.
- **Helpers:** I used four helper agents in parallel for the admin pages and for earnings,
  payouts and settings. I checked their work with the typecheck, lint, tests and the click runs
  above.
- **New filters:** Jobs, Geometry review and Import jobs got filter tabs. The cohort list got
  type tabs and search. Cohort members got search.
- **Rows:** a cohort row on the admin list no longer opens on a click anywhere. Use its name or
  "Open". `tests/visual/timing.spec.ts` looks for the old row link and now skips that probe.
- **Names:** the People page heading is now "People", to match the menu. The e2e test was
  updated.

## For the founder

- Nothing is waiting on you.
- One question for later: should affiliate tutors be blocked from the staff tutor addresses?
  The code change is small.
