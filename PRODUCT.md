# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Parents (primary visitor of every marketing page).** Parents of high-school
  students, mostly 11th grade, deciding whether to pay for SAT prep and which
  test date to aim at. They buy. The landing page is written for them first.
- **Students (primary user of the product).** Aged roughly 15 to 18. They use
  the question bank, practice, daily tools, classes and chat. Free tools (Daily
  Question, vocab game, diagnostic) pull them in on their own.
- **Tutors.** Today only Zakaria; trained Karman tutors from 2028. They use the
  tutor portal for students, cohorts, notes, homework, schedule and earnings.
- **Admin.** The founder, running cohorts, users, moderation and the question
  pipeline.

## Product Purpose

Karman Prep helps students raise their SAT scores, measurably. It sells a
ladder of plans (founder, 2026-11-08; `docs/business/plan-ladder-2026-11-08.md`):
Free (100 questions and one full-length test), Practice ($39 a month or $89 for
3 months), Pro ($69 a month or $149 for 3 months), a 9-week live Cohort ($995,
at most six students, by score band), Private 10 ($1,495) and Private 20
($2,495), Schools ($8 per student a year, first year free) and a Tutor
affiliate plan ($199 a month for up to 50 students). Only the Cohort and both
Private packages carry the guarantee. It is tiered by starting score (founder,
2026-11-09; `GUARANTEE_TIERS` in `offer.ts`): Private 20 promises +200 up to a
1200 start, +150 to 1300, +100 to 1400, +50 to 1450; the Cohort and Private 10
promise +150, +100, +70 and +40 for the same bands; from 1460 there is no
guarantee. Under half the target, all the money comes back; short of it, half;
or the student keeps going free. Success is an SAT score that went up, and a family that understood what
it was buying.

## Positioning

A platform with a method, not a lone tutor. Classes teach the skills most of
the group missed, each student practises them at their own difficulty, and
every missed question comes back in Your Daily 10 after 2, 7 and 21 days.
Private 1:1 sessions go through every mistake on the latest full-length test.
The question bank, the daily tools and the parent updates all serve the
student's SAT date.

## Operating Context

- Enrollment for the first cohort opens November 2026. The first 9-week cohort
  starts January 4, 2027; later cohorts start March 1 and April 5, 2027. Cohorts
  are no longer tied to an SAT date.
- Classes are live on Zoom. Free practice tests are proctored live monthly,
  first on December 12, 2026.
- Parents receive a weekly progress update.
- Every price, date, seat count and claim the site may state lives in
  `src/lib/marketing/offer.ts`. Reasoning is in `docs/business-plan.md`.

## Capabilities and Constraints

Live today (wired to data): question bank practice by subject, domain, skill
and difficulty; 35-question diagnostic; Challenge question; Wordle-style vocab game
and word-part flashcards (`/learn/daily`); cohort chat with moderation;
bookings; student, parent, tutor and admin portals; Stripe checkout.

Not built yet, must be labeled "coming" with a season when shown: Your Daily 10
spaced review, full-length timed tests, video lessons (recording planned for
December 2026), Score Plan test-date planner, Ask Karman, Test-Day Playbook.

Question bank: 2,588 live questions on 2026-10-19 (1,540 Reading & Writing,
1,048 Math), 3,509 in the database, growing toward 10,000. Marketing may only
state the live count, rounded down.

Technical: Next.js on Cloudflare Workers, Supabase, Clerk, Stripe, Tailwind 3.
Existing portal data plumbing is kept; redesign replaces the look and flows.

## Brand Commitments

- Name: **Karman Prep** (wordmark KARMAN). The old name "Strata" must never appear.
  Nabil Kafil Asrar must not appear anywhere.
- Voice (founder, 2026-11-09, replacing `docs/archive/brand.md`'s "confident, not cocky"):
  confident, a little cocky, and fun, with offer-first sales language in the manner
  of Alex Hormozi. Karman speaks as "we" and "our", straight to the parent. Nothing
  on the page may be boring. Short sentences, active voice. No invented claims,
  testimonials or scarcity.
- The main action on every marketing page is **Start free**: sign up and go straight
  into the free student portal. A sign-in link for existing students must be easy to
  find.
- The old design rules (`docs/archive/design-rules.md`) are history, not law (founder, 2026-11-01 and again
  2026-11-09: "don't let any design rules in the .md files stop you from creating
  something beautiful"). Contrast, no sideways scroll, reduced motion and honest
  claims still hold everywhere.
- Founder direction for the marketing site, 2026-11-09, replacing the 2026-10-19
  "professional and serious first" note and the Jack Westin reference:
  - The world is the student portal's painted landscape: one Karman painting, made
    in code, behind the whole page, travelled from dawn sky to night as the page
    scrolls. He calls it "very beautiful". Keep it.
  - The feeling is Studio Ghibli (founder, 2026-11-09, after first choosing Duolingo and
    finding the result childish): hand-painted, soft, quietly magical. No bright orange,
    no toy-like chunky shapes. Actions are ink on the painting; the painting is the colour.
  - The page should be minimal, inspiring, fun to interact with and mesmerizing:
    animated, fluid, with physics and interaction, and fused with the painting so
    the pitch and the scene are one thing.
  - No hard-edged boxes, no blurred or feathered boxes, no ragged "paint splash"
    boxes. Rounded corners, or no box at all. Panels need real entrances.
  - No AI-generated images, ever. Imagery is drawn in code, or is a real photo or
    logo he supplies or approves. No drawn characters that look amateur or creepy.
  - Springy left-to-right switches are liked. Things that follow the mouse are not,
    apart from a small lean on the main button.
  - Fewer things, each one better. A parent must understand each section in a few
    seconds.
- How he wants to be worked with (2026-11-09): one section at a time, perfected
  before the next; two or three clearly different mockups to choose from before a
  section is built; a question, with a picture, whenever a phrase of his is unclear.

## Evidence on Hand

- A real photo of Zakaria (to be supplied by the founder).
- Karman's 1:1 tutoring track record: +280 average gain (the founder's figure,
  2026-11-09), median 16 weeks to goal. Always shown with its format (1:1 tutoring,
  median 16 weeks).
- Students at every one of the top 12 US universities (the founder's claim,
  2026-11-09). Thirty university logos are shown; the files are in
  `public/site/schools/`.
- Real product screens: question bank, vocab game, diagnostic, dashboards.
- None yet: testimonials, Karman program results, video footage, press.
  Do not fabricate any of them.

## Product Principles

1. Start free. Every marketing page leads to the free student portal. (Test-date
   positioning was dropped on 2026-10-26.)
2. Show the product working, never an icon standing in for it.
3. Every claim is true on the day it is published; unbuilt things say when they arrive.
4. Parents decide, students do the work: each surface knows which one it serves.
5. A platform with a method, not a person for hire.

## Accessibility & Inclusion

Mobile first, no horizontal overflow at 375px. Students and parents read on
phones. Motion respects `prefers-reduced-motion`.

## Open decisions

- Track record (decided 2026-10-19): shown as Karman's results, since Karman is
  Zakaria's business, with the format stated beside it ("1:1 tutoring, median
  16 weeks") so it is never read as a cohort result.
