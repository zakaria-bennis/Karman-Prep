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

Karman Prep helps students raise their SAT scores, measurably. It sells
programs that end on a specific SAT date rather than hours or monthly plans:
a small live cohort is the flagship, private 1:1 packages sit on top, and free
tools bring families in. Success is an official score that went up, and a
family that understood what it was buying.

## Positioning

A platform, not a lone tutor: one program with a fixed finish line (a real SAT
date), built on a review method where every full-length test is followed by a
1:1 session going through every mistake. The cohort, the question bank, the
daily tools and the parent updates all serve that one date.

## Operating Context

- Enrollment for the first cohort opens November 2026. The March SAT Program
  runs January 4 to the Saturday, March 6, 2027 SAT. Later cohorts: May 1 and
  June 5, 2027.
- Classes are live on Zoom. Free practice tests are proctored live monthly,
  first on December 12, 2026.
- Parents receive a weekly progress update.
- Every price, date, seat count and claim the site may state lives in
  `src/lib/marketing/offer.ts`. Reasoning is in `docs/business-plan.md`.

## Capabilities and Constraints

Live today (wired to data): question bank practice by subject, domain, skill
and difficulty; 35-question diagnostic; Daily Question; Wordle-style vocab game
and word-part flashcards (`/learn/daily`); cohort chat with moderation;
bookings; student, parent, tutor and admin portals; Stripe checkout.

Not built yet, must be labeled "coming" with a season when shown: Daily 10
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
- Voice (from `docs/brand.md`): confident, not cocky; warm, not bro-y; respects
  the student's intelligence; plain, not corporate. Short sentences, active voice.
- The 31 rules in `docs/design-rules.md` are binding on every surface
  (no Lucide icons, no pure white, no em dashes, no Inter/Geist/Space Grotesk,
  no bento grids, no three pricing tiers, no drop shadows, no horizontal
  scrolling, skeleton loaders, Terms and Privacy linked from the footer, and the rest).
- Founder direction, 2026-10-19: professional and serious first, because families
  pay thousands; a little character, never poppy or themed. Craft bar and layout
  reference: Jack Westin (jackwestin.com), especially the JW+ MCAT page (each
  product separated with its own colour and section), the tutoring page, and the
  admissions page's muted autoplay hero video. Earlier references (Jesko Jets,
  Graza) set the ambition for motion and imagery, not the tone. Question bank
  modeled on Khan Academy and OnePrep, not the old constellation map.
- Six themed directions (notebook, calendar, poster, dawn, varsity, cartoon) were
  rejected on 2026-10-19 as too poppy. Do not bring back object or costume themes.

## Evidence on Hand

- A real photo of Zakaria (to be supplied by the founder).
- Karman's 1:1 tutoring track record: +285 average gain (1235 to 1520), 94%
  reached their target, median 16 weeks to goal, 4.9/5 rating, 1,200+ students.
  Always shown with its format (1:1 tutoring, median 16 weeks).
- Real product screens: question bank, vocab game, diagnostic, dashboards.
- None yet: testimonials, Karman program results, video footage, press.
  Do not fabricate any of them.

## Product Principles

1. The finish line is a real date. Every page points at the SAT a family is aiming for.
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
