# Pricing session report (8 November 2026)

Branch: `claude/overnight-pricing-938360`. It has `claude/overnight-ship` merged in (last merge
`6aa8ec5e`, after merge-rest, site-audit, local-db and admin-scholarship landed). Nothing deployed, nothing pushed.
Stripe was used in TEST mode only.

## In one paragraph

Every price, plan name and plan rule on the site, in the app, in the legal pages, in the business
docs, in `PRODUCT.md` and in the portal prototype now matches your 8 November table: Free,
Practice ($39 a month or $89 for 3 months), Pro ($69 or $149), the 9-week Cohort ($995), Private
10 ($1,495), Private 20 ($2,495), Schools ($8 per student a year, first year free) and Tutor
affiliate ($199 a month). Platform, Plus, Self-paced, the 7-day trial and the old cohort and
private prices are gone. There are two new pages, Schools and For tutors. Who can see which
questions and explanations is decided on the server, in one place. The eight paid prices exist in
Stripe's test mode, and each one opens a real test checkout.

## What changed, and where

**The site** (every number comes from `src/lib/marketing/offer.ts`, every word from `site-copy.ts`)

- Pricing page: a Practice and Pro card with a switch ($39 or $69 a month, each with its own
  3-month price), "Or start free: 100 questions and one full-length test, no card", the cohort at
  $995 or "3 payments" of $300 after the $95 deposit (same $995 on every date), both private
  packages with the guarantee ($149.50 and $124.75 an hour), a comparison table, a renewal line,
  and links to Schools and the Tutor affiliate page.
- New pages: `/schools` (free first year, then $8 per student a year, each student their own
  Practice plan; the button emails hello@karmanprep.com with "School license" filled in) and
  `/for-tutors` ($199 a month, one code for up to 50 students, admin rights; the button goes to
  Billing with the tutor plan picked). Both are in the footer, in the live site's style.
- Home, program, private tutoring, guarantee and FAQ: the new guarantee (+100 points from a start
  under 1400, +50 from 1400), 60-minute classes, the score bands, no 1:1s in the cohort, both
  private packages guaranteed with their own terms, five worked guarantee examples, the $1,500
  scholarship, the deposit that adds up, and the home page's week now shows the weekly live
  session instead of office hours and 1:1 reviews for a cohort student.
- Terms and Refund pages: rewritten from the old Seminar/Elite tiers, the 7-day trial and an old
  "12-week course-fee protection" to the new plans, renewal, deposit, school licenses, tutor
  affiliate rules and the guarantee. Effective date now November 8, 2026.
- Wording rules from the team: no test is called "official", and Pro's videos say "added as
  they're recorded" (none exist yet).

**The app**

- `src/lib/plans/` (new, with a README for the portal and quiz sessions): `getPlan(userId)` and
  `canAccess(plan, feature)`, 91 tests.
  - Free: core questions, written explanations, stops after 100 questions and one full-length test.
  - Practice, school students and tutor-code students: core questions (difficulty 1 to 5) with
    written explanations. A skill with no core questions serves its easiest ones instead.
  - Pro, Cohort, Private 10, Private 20 and the tutor on the affiliate plan: every question
    (mastery = difficulty 6 and 7), written and video explanations.
  - Tutor affiliate: admin rights over up to 50 students, whose free Practice stops when the
    tutor's subscription stops.
- The practice-question server action now applies these rules (core plans get difficulty 1 to 5).
- Stripe: `scripts/stripe/setup-test-products.mjs` creates the eight test prices by name (lookup
  key), refuses anything but a test key, and changes nothing when run twice. Checkout finds prices
  by name, refuses if Stripe's amount ever differs from `offer.ts`, and only sells a cohort seat to
  a student Karman has already added to that cohort after the call. The old `STRIPE_PRICE_*`
  settings, the old tiers and the trial are deleted.
- Billing page: Practice and Pro, monthly or every 3 months, plus the Tutor affiliate plan, with a
  working "Continue to checkout". The pricing page's buttons land there.
- Onboarding recommends Practice, Pro, the Cohort or a private package with its real price and
  next step. Sign-up says "Start free". Free students reach their dashboard instead of Billing.
- Admin revenue uses the new prices; parents, students, tutors and admins see Cohort, Weekly live
  session and Private tutoring instead of Seminar, Small Group and Elite; a cohort holds six; a
  late private cancellation counts as a used hour (no more "$135 not refunded").
- Three database changes, not applied anywhere yet: `subscriptions` gets `plan_id`,
  `billing_term` and `current_period_end`; a new `plan_grants` table holds one-time purchases,
  school seats and tutor codes; the cohort cap goes from 5 to 6.

**Docs and prototypes**: `docs/business/plan-ladder-2026-11-08.md` (new), `docs/business/guarantee.md`,
`docs/business-plan.md`, `CLAUDE.md`, `PRODUCT.md`, the portal prototype's plan config, the student
skeleton prototype, the reference design mock (`.impeccable/mocks/decision/film/copy.js`) and the
painted home mock.

## The deposit fix

The old numbers didn't add up: a $100 deposit plus 3 × $345 made $1,135, not $995. Now the deposit
is part of the price: **$95 deposit + 3 × $300 = $995**, all whole dollars, still three payments.
If you'd rather keep a round $100 deposit, the payments would be $300, $300 and $295.

## Checkers

Three independent checker agents each searched the whole repo, the rendered pages (all 14 site
pages at 390 and 1440) and the live site, from different starting points.

- **Round 1** found about 25 real problems: the onboarding screen and admin screens still showing
  Seminar/Small Group/Elite and $40/$60/$135/$800, the cohort capped at 5 in the admin and
  auto-placement, Pro's videos promised without "as they're recorded", the Practice card showing
  Pro's 3-month price under it, the guarantee box not saying private has its own terms, "or your
  money back" where the remedy can be a free repeat, the score bands never shown, the home page's
  week showing office hours and 1:1 reviews for a cohort student, a guarantee drawing whose +100
  didn't match its scores, cohort checkout open to anyone, the quiz path not using the access
  rules, "official SAT" in a mock, and Platform/Plus in a prototype. These are fixed and
  committed. It also raised the private-booking, Daily Challenge, trial-banner and deposit-payment
  gaps, which are still open (see Not done).
- **Round 2 (final)**: no wrong price anywhere. Every price and every sum is correct
  on all 14 pages at both widths, in the money and access code, in the migrations and in the
  docs. What it still found, and what happened:
  - Fixed: Platform/Plus, the $100 deposit, the "1450" guarantee, $10 schools and office hours in
    the reference mock's other pages and the portal prototypes; the guarantee page claiming to
    show the private rules; "Four rules apply" on the pricing page; "official" in the merged
    scholarship terms; two scholarship blocks in `offer.ts` (now one, `COHORT_SCHOLARSHIP`).
  - Not fixed (listed under Not done): the cohort's $95 deposit and three $300 payments can't be
    charged through the site yet; the "Classes start Monday, January 4" label while classes run
    Tuesdays and Thursdays; the home page's demo calendar shows two tutors in one week and puts
    full-length 4 on a Wednesday while its note says Saturday; "office hours" in four portal
    prototype screens; the older exploration mocks (`fresh`, `motion`, `rebuild`, `redesign`).

## What the live site changes from when you deploy

Today karmanprep.com shows the old offer:

- /pricing: Self-paced $199 for 12 months; the cohort at $1,295 (later $1,495) with a $100 deposit;
  Private 10 $1,950 and Private 20 $3,600 at $195 an hour; "+100 points or a 1450" on the cohort and
  Private 20 only; half back $647.50; a 1:1 after every full-length; a free scholarship seat.
- /program: $1,295, or three payments of $435; 18 classes of 90 minutes; five 1:1 reviews; students
  starting at 1450 or above not covered.
- /private-tutoring: $195 an hour; Private 10 with no guarantee.
- /guarantee and the home page: "+100 points or a 1450, or your money back", $647.50 and $1,295.
- /faq: $1,295 or 3 × $435, a $100 deposit, 1450+ excluded.
- /terms and /refunds: a 7-day trial "only on the Seminar (Group) tier", Elite sessions.
- /schools and /for-tutors: don't exist (404). Practice, Pro, Free, Schools and Tutor affiliate
  appear nowhere.

After you deploy this branch, all of that becomes the table above.

## How I checked

- Rendered all 14 site pages headless at 390 and 1440 (twice, the second after all fixes): no
  errors, no sideways scroll, every internal link answers.
- Clicked every control I built, headless, at both widths: 44 of 44 checks pass (plan switches,
  payment switch, hour switch, every start button, Schools and Tutor links on the pricing page and
  in the footer, both new pages' buttons).
- Stripe test mode: created the eight prices, re-ran the script (nothing changed), and opened a test
  checkout for each of the eight (all test mode, `livemode=false`).
- Checks: `npx tsc --noEmit` is clean on my work. On the merged branch it shows 8 errors that are
  not from this branch: 4 in `src/middleware.ts` (from the site-audit merge) and 4 because
  `pdf-lib` and `pdf-parse`, added by the admin-scholarship merge, aren't installed in this
  worktree yet (run `npm ci`; the scholarship PDF test fails for the same reason). Lint: 0 errors
  (2 old warnings) before the last merges; every file I changed after them lints clean. 297
  targeted unit tests pass (marketing, plans, onboarding, scheduling, Stripe, admin).
  `check:sizes` passes. I did not run the full test suite or `cf:build` at the end, because the
  machine was overloaded and the team asked to keep it light.

## Decisions I made

- The deposit: $95 + 3 × $300 (see above).
- The Cohort and both private packages include Pro on the platform (every question, videos).
- A tutor on the affiliate plan gets Pro for themselves.
- One-time purchases (Cohort, Private 10, Private 20) open their access for 12 months. Marked CONFIRM.
- The guarantee's half-back line is half the target: +50 to +99 under 1400, +25 to +49 from 1400.
  A 1600 always counts as reaching the target (someone starting at 1560 can't gain 50).
- Private 10 now carries the guarantee, so I scaled Private 20's remedy for it: up to 3 free hours
  (Private 20: 6) and two full-length tests (Private 20: four).
- The merit scholarship replaces the old free "scholarship seat", so all six cohort seats are paid.
- One cohort price ($995) for every cohort; the "founding price, later $1,495" line is gone.
- The 3-month plans renew every 3 months until cancelled; no free trials anywhere.
- Refunds: the deposit is refunded in full if the family cancels before the first class; time
  already paid for on Practice and Pro is not refunded; a private session cancelled with less than
  24 hours' notice counts as a used hour.
- Cohort checkout only works for a student already added to that cohort (after the call). Until a
  page sends families there, the $95 deposit still goes through your Stripe Payment Link.
- The Schools button opens an email to hello@karmanprep.com; there is no school sign-up flow yet.
- The admin session and I both added a scholarship block to `offer.ts`; I kept theirs
  (`COHORT_SCHOLARSHIP`, same numbers) and deleted mine.
- `subscriptions.tier` stays (now optional) because the booking code still reads it as a class
  format; new subscriptions use `plan_id`.
- I did not apply the three database changes to the shared local database: the other sessions'
  seed data still wrote the old `tier` column and would have broken. Apply them after the merge.

## Not done

- **Old design exploration mocks** in `.impeccable/mocks/` (the `fresh`, `rebuild` and `redesign`
  folders and the older `decision/*-v*.html` pages) still show Platform, Plus and the Oct 30 prices.
  I updated the reference mock (`decision/film`) and the painted home mock only; the others are
  past explorations, not the site.
- The portal prototype keeps its internal keys `platform` and `plus` (now named Practice and Pro,
  with the new prices); renaming the keys touches about 15 prototype files.
- Access rules on the quiz paths: the practice-question action uses them, but the Daily Challenge
  still serves difficulty 5 to 7 to every plan, Free's 100-question limit isn't applied where
  answers are saved, and no table records finished full-length tests yet, so Free's one test can't
  be counted. The quiz and student-portal sessions should call `src/lib/plans` (see its README).
- Private 10 and Private 20 buyers: the booking system still decides who can book 1:1 hours by the
  old private/elite tier, so a buyer doesn't get the availability step or booking yet.
- The cohort's $95 deposit and three $300 payments aren't charged through checkout: the deposit goes
  through your Payment Link, and the three payments need a Stripe payment schedule.
- I couldn't click through signed-in Billing to Stripe inside the running app, because the shared
  local database doesn't have the new columns yet (see Decisions). Each Stripe price was opened
  directly in test mode instead.
- A dead "Your trial ends" banner is still in the student dashboard code (another session's file;
  trials can't happen any more).
- The Oct 30 ladder file `docs/business/plan-ladder-2026-10-30.md` never reached this branch, so
  there was nothing to delete.
- The home page's demo calendar (two tutors in one week, full-length 4 on a Wednesday while the
  note says Saturday) and "office hours" in four portal prototype screens.
- Full test suite and `cf:build` not re-run at the end (machine overloaded).

## For you to decide

- The $95 deposit, or $100 with payments of $300, $300 and $295.
- The Private 10 guarantee remedy (3 free hours, two full-length tests).
- How long cohort and private buyers keep platform access (I put 12 months).
- The cohort start label says "Monday, January 4" while classes run Tuesdays and Thursdays (a
  CONFIRM value from before tonight).
- Refund wording and the tutor affiliate terms need a lawyer's read before launch.
- Production Stripe: the setup script only runs on a test key. Live prices, and a $95 deposit
  Payment Link (the live one is set up for $100), need creating in live mode at launch.
