# Karman Prep — business plan (updated 8 November 2026)

The working plan for what Karman sells, how it's priced, and what gets built
in what order. Product copy on the marketing site comes from
[`src/lib/marketing/offer.ts`](../src/lib/marketing/offer.ts); this doc is the
reasoning behind those numbers. The price list itself, plan by plan, is
[`docs/business/plan-ladder-2026-11-08.md`](./business/plan-ladder-2026-11-08.md).
Voice rules live in [`docs/brand.md`](./brand.md).

## North star

Help students succeed on the SAT, measurably. Every feature, price and
promise is checked against one question: does it raise scores, or does it
honestly help a family decide? The methods Karman leans on are the
best-supported ones in learning research: timed practice testing with
review, spaced review of mistakes, mixed practice, frequent small-group or
1:1 feedback, and accountability for practice time.

## The business in one line

A founder-led SAT prep company with a ladder of plans: free practice to start,
two practice plans (Practice and Pro), a small live cohort, private 1:1
packages, and two ways to reach students in bulk (school licenses and a tutor
affiliate plan). Cohorts are sold on their own terms, never tied to "ends on
your SAT date" (retired 2026-10-26).

- **Founder:** Zakaria Bennis — solo founder and tutor (99th percentile SAT,
  1,200+ students tutored privately). Nabil Kafil Asrar is no longer
  involved; he must not appear anywhere in product or marketing.
- **Who buys:** parents of high-school students (mostly 11th grade), schools,
  and independent tutors who sell on marketplaces like Leland.
- **Who uses it:** students aged roughly 15–18.

## Why this ladder

- The free plan and the free practice test let a family judge the questions
  before paying anything.
- Practice and Pro are low-ticket software plans with software margins. They
  carry no guarantee because no tutor teaches the student every week.
- The cohort and private packages are where a tutor teaches every week, so
  they carry the guarantee and most of the revenue per family.
- School licenses and the tutor affiliate plan put the platform in front of
  many students at once without Karman's tutors' hours as the ceiling.

## The offer (founder, 8 November 2026)

All numbers here are mirrored in `src/lib/marketing/offer.ts`. Plan ids are
the same everywhere (site, Stripe lookup keys, the `subscriptions` table and
`src/lib/plans/`).

| Plan            | Price                                  | What it includes                                                                                                               |
| --------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Free            | $0                                     | 100 questions in total, plus one free full-length test.                                                                        |
| Practice        | $39 a month, or $89 for 3 months       | The core question pool, with written explanations.                                                                             |
| Pro             | $69 a month, or $149 for 3 months      | Every question, including the hard mastery pool, plus video explanations.                                                      |
| 9-week Cohort   | $995                                   | At most 6 students. 18 sessions, twice a week, 60 minutes each. Score bands 1000 to 1200, 1200 to 1400, 1400 to 1600. No 1:1s. |
| Private 10      | $1,495                                 | 10 hours of 1:1 tutoring.                                                                                                      |
| Private 20      | $2,495                                 | 20 hours of 1:1 tutoring.                                                                                                      |
| Schools         | $8 per student a year, first year free | Each student gets Practice-plan access of their own. It is not a shared pool.                                                  |
| Tutor affiliate | $199 a month per tutor                 | Up to 50 students on one code get Practice free while the tutor subscribes; the tutor gets admin rights over them.             |

- **Cohort payment:** $995 in full, or a $95 refundable deposit and three
  payments of $300 ($95 + 3 × $300 = $995). The deposit is part of the price.
  (Fixed 2026-11-08: the old $100 deposit plus 3 × $345 made $1,135.)
- **Cohort and private plans include Pro** on the platform (every question,
  video explanations).
- **Scholarship:** $1,500 to the top-scoring student in each cohort, paid as a
  refund of the $995 plus a $505 merit bonus.
- **Free entry points:** the free plan; the free monthly practice test (a
  half-length test proctored live on Zoom, first one Saturday, December 12,
  2026, with a 20-minute results call); the 35-question diagnostic.

## The guarantee

The Cohort, Private 10 and Private 20 carry it. Full terms in
[`docs/business/guarantee.md`](./business/guarantee.md).

- **Target:** +100 points from a baseline under 1400; +50 points from a
  baseline of 1400 or higher. A 1600 always counts.
- **Cohort remedy:** half the price back, or the next cohort free, when the
  student reaches half the target or more; the full price back, or the next
  cohort free, below that. The family chooses.
- **Private remedy:** free extra hours (3 on Private 10, 6 on Private 20),
  then half the price back if the next official SAT still falls short.
- Honest intake: students already scoring 1500+, or fewer than ~4 weeks from
  their test, are told plainly that a program probably isn't worth it for them.

## The full ecosystem (status)

| Offering                                                        | Status                                 |
| --------------------------------------------------------------- | -------------------------------------- |
| Free plan, Practice and Pro                                     | At launch                              |
| 9-week Cohort                                                   | First cohort January 4, 2027           |
| Private 1:1 (Private 10 / 20)                                   | At launch                              |
| School licenses                                                 | At launch (first year free)            |
| Tutor affiliate plan                                            | At launch                              |
| Free monthly practice test (own questions)                      | First: Dec 12, 2026                    |
| 35-question diagnostic                                          | Live                                   |
| Practice engine: question bank, Daily 10, timed modules         | Bank live; Daily 10 by Jan 2027        |
| Weekly live session + rotating workshops                        | Jan 2027                               |
| Cohort community (chat; DMs later with safeguards)              | Jan 2027                               |
| Insights: student/tutor views, weekly parent update             | Manual Jan 2027; automated summer 2027 |
| Video explanations (Pro)                                        | Rolling from launch                    |
| Root Words (Wordle-style, root-based vocab)                     | Spring 2027                            |
| Score Plan (test-date and superscore planner)                   | Spring 2027                            |
| Ask Karman (AI mistake coach, grounded in checked explanations) | Summer 2027                            |
| PSAT & Foundations track (9th–10th grade)                       | Summer 2028                            |
| Social video engine (YouTube, Instagram, TikTok)                | Now                                    |

## Marketing honesty rules

1. **No testimonials until real ones exist.** Every past testimonial has
   been removed.
2. **Track-record stats are Karman's 1:1 tutoring results** (founder
   decision, 2026-10-19: Karman is Zakaria's business, so his students are
   Karman's students): +285 average gain (1235 to 1520), 94% reached their
   target score, median 16 weeks to goal, 4.9/5 rating, 1,200+ students
   tutored. Always state the format next to them (1:1 tutoring, median 16
   weeks) and never present them as results of the 9-week cohort. Replace
   them with cohort results once those exist.
3. **No fake urgency.** Real deadlines (enrollment close, seat counts) are
   fine; countdown gimmicks are not.
4. **Don't sell features that won't exist in time.** Anything not shipped by
   the program start is labeled "coming" with a season.
5. **Only original questions in public.** No College Board content on the
   site, in videos, or in the daily question.
6. **Score estimates are ranges** and are called estimates.
7. **Publish real results** (every enrolled student, including dropouts;
   median gain; share hitting target) once ~15–20 official scores exist.

## Economics

- **Floor:** $80 per working hour. A live hour carries ~25 minutes of prep
  and follow-up (≈1.4 working hours).
- **Cohort of 6 at $995:** $5,970 for 18 class hours (no 1:1 reviews any
  more) → ~$330 per live hour → ~$235 per working hour before the
  scholarship. The scholarship ($1,500, the winner's $995 back plus $505)
  brings a full cohort to $4,470 net, still ~$175 per working hour.
- **Private 10 at $1,495** → $149.50 per hour → ~$107 per working hour.
  **Private 20 at $2,495** → $124.75 per hour → ~$89 per working hour.
- **Practice ($39) and Pro ($69):** software margins; the cost is content
  (questions, written and video explanations) and acquisition.
- **Schools:** free in year one to win adoption; $8 per student a year after.
- **Tutor affiliate:** $199 a month for up to 50 Practice seats (about $4 a
  seat at full use), sold to tutors who bring their own students.
- **Target:** ~$400k annual profit by 2029, from tutor-delivered cohorts and
  private hours, Practice/Pro subscriptions, school licenses and tutor
  affiliates, plus an audience built by the Daily Question and video.

## Build order

**Before launch (Nov 2026):** marketing site on the new ladder; Stripe
checkout for Practice, Pro, Cohort, Private 10/20 and Tutor affiliate (lookup
keys, `scripts/stripe/setup-test-products.mjs`); server-side plan access
(`src/lib/plans/`); lead capture; half-length free practice test runner.

**Before January 4, 2027:** cohort deposit and instalments; an enrollment
record that stores outcomes; scholarship review and payout; spaced review +
random, recently-seen-excluding question selection; chat with DMs off;
cohort cap of 6; birth-year gate and parent-visibility consent; intake
screening.

**After March 2027:** Root Words, Score Plan, Ask Karman, automated parent
digest, Karman's own adaptive full-length tests, results page.

## Open decisions to confirm

- Class days/times, free practice test start time, and the enrollment
  deadline (placeholders in `offer.ts`, marked `CONFIRM:`).
- Lawyer review of the guarantee, refund and affiliate terms.
- The deposit: $95 keeps the three payments at a round $300. A round $100
  deposit would make the payments $300, $300 and $295.
