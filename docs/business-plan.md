# Karman Prep — business plan (October 2026)

The working plan for what Karman sells, how it's priced, and what gets built
in what order. Product copy on the marketing site comes from
[`src/lib/marketing/offer.ts`](../src/lib/marketing/offer.ts); this doc is the
reasoning behind those numbers. Visual and voice rules live in
[`docs/brand.md`](./brand.md).

## North star

Help students succeed on the SAT, measurably. Every feature, price and
promise is checked against one question: does it raise scores, or does it
honestly help a family decide? The methods Karman leans on are the
best-supported ones in learning research: timed practice testing with
review, spaced review of mistakes, mixed practice, frequent small-group or
1:1 feedback, and accountability for practice time.

## The business in one line

A founder-led SAT prep company that sells **programs that end on a specific
test date**, not hours or monthly subscriptions. A small live cohort is the
flagship; private 1:1 packages sit on top; free tools bring families in.

- **Founder:** Zakaria Bennis — solo founder and tutor (99th percentile SAT,
  1,200+ students tutored privately). Nabil Kafil Asrar is no longer
  involved; he must not appear anywhere in product or marketing.
- **Who buys:** parents of high-school students (mostly 11th grade).
- **Who uses it:** students aged roughly 15–18.

## Why programs, not hours

- SAT prep has a finish line. Monthly plans lose students by design, and
  low-ticket plans can't pay for acquiring a family.
- Every session sold one at a time is a new buying decision; families quit
  before scores move.
- Hourly pricing invites comparison with commodity tutors.
- A solo founder's hours are the ceiling, so formats with more revenue per
  live hour (small groups, free funnels, software) matter.

## The offer (launch: enrollment opens November 2026)

All numbers here are mirrored in `src/lib/marketing/offer.ts`.

### The March SAT Program (cohort — flagship)

- Ends on the **Saturday, March 6, 2027 SAT**. Runs 9 weeks from Monday,
  January 4, 2027.
- **5 paying seats + 1 scholarship seat** (small groups of about 4–6 are
  where tutoring research shows the strongest effects).
- Two 90-minute live classes a week (18 classes).
- **5 full-length practice tests.** The week-1 baseline is an official
  Bluebook test, proctored live; the dress rehearsal (about a week before
  the test) is proctored live too.
- **A 60-minute 1:1 session with Zakaria after every full-length**, going
  through every mistake. This is Zakaria's core teaching method; a "tutoring
  session" at Karman _is_ a full-length review.
- One weekly live session for everyone: test mechanics (pacing, Desmos, how
  the adaptive second module works) alternating with rotating skill
  workshops.
- **Daily 10:** spaced review — every missed question comes back after
  about 2, 7 and 21 days. (Must ship before January 4.)
- 5,000+ verified original practice questions across 89 skills × 7
  difficulty levels (growing toward 10,000+).
- Cohort chat; questions to the tutor answered once a day.
- A weekly progress update to parents.
- The 50-point guarantee (below).
- **Price:** $995 founding price for the March cohort (pay in full, or 3
  monthly payments of $345). Later cohorts: $1,295. Target by 2029: $1,495.
- **Reserving:** a $100 refundable deposit holds a seat (Stripe Payment
  Link; set `NEXT_PUBLIC_COHORT_DEPOSIT_URL`). Until that exists, the site
  collects interest through the lead form.
- Next cohorts: the May 1 and June 5, 2027 SATs (enrollment opens in
  February).

### Private 1:1 with Zakaria

- **Private 10:** 10 hours, $1,450. **Private 20:** 20 hours, $2,900
  ($145/hour).
- Weekly 60-minute sessions. Each one goes through every mistake on the
  student's latest full-length, or targets the skill holding them back.
- Includes the full platform, the weekly live session, and an update to
  parents after every session.
- First step: a free strategy call (`NEXT_PUBLIC_STRATEGY_CALL_URL`, a
  Cal.com link) or the lead form.
- From 2028, trained Karman tutors deliver Private at about $135/hour and
  Zakaria's own hours become "Signature" at about $200/hour.

### Free entry points

- **Free practice test:** a half-length test (one Reading & Writing module +
  one Math module, ~49 questions, ~75 minutes) built from Karman's own
  questions, proctored live on Zoom, monthly. First one: Saturday,
  December 12, 2026. Includes an estimated score range, a domain breakdown,
  and a 20-minute results call. Its purpose is to show the quality of
  Karman's questions.
- **35-question diagnostic:** free with an account, any time.
- **Daily Question** (planned, November): one Reading & Writing and one Math
  question a day, streaks, share card.

### The guarantee

- **50 points** over a proctored official Bluebook baseline taken in week 1.
- **Eligibility:** take the baseline; attend at least 80% of live classes
  and every 1:1 session; complete all 5 full-length tests; complete the
  assigned weekly practice; sit the official SAT on the program's test
  date; send the official College Board score report within 30 days.
- **Remedy:** a free seat in the next Karman cohort.
- Honest intake: students already scoring 1500+, or fewer than ~4 weeks
  from their test, are told plainly that the program probably isn't worth
  it for them.

## The full ecosystem (status)

| Offering                                                        | Status                                 |
| --------------------------------------------------------------- | -------------------------------------- |
| March SAT Program (cohort)                                      | Launching Jan 2027                     |
| Private 1:1 (Private 10 / 20)                                   | Launching Jan 2027                     |
| Free monthly practice test (own questions)                      | First: Dec 12, 2026                    |
| 35-question diagnostic                                          | Live                                   |
| Practice engine: question bank, Daily 10, timed modules         | Bank live; Daily 10 by Jan 2027        |
| Weekly live session + rotating workshops                        | Jan 2027                               |
| Cohort community (chat; DMs later with safeguards)              | Jan 2027                               |
| Insights: student/tutor views, weekly parent update             | Manual Jan 2027; automated summer 2027 |
| Daily Question (free, streaks, leagues)                         | Nov 2026                               |
| Root Words (Wordle-style, root-based vocab)                     | Spring 2027                            |
| Score Plan (test-date and superscore planner)                   | Spring 2027                            |
| Ask Karman (AI mistake coach, grounded in checked explanations) | Summer 2027                            |
| Test-Day Playbook (personal guide generated from student data)  | May 2027                               |
| Video lesson library (clipped from recorded workshops)          | Rolling from Jan 2027                  |
| Karman Live Season Pass ($199, weekly sessions + recordings)    | Fall 2027                              |
| Self-Paced ($249)                                               | Fall 2027                              |
| PSAT & Foundations track (9th–10th grade)                       | Summer 2028                            |
| Karman for Schools (licenses)                                   | 2028–29                                |
| Social video engine (YouTube, Instagram, TikTok)                | Now                                    |

## Marketing honesty rules

1. **No testimonials until real ones exist.** Every past testimonial has
   been removed.
2. **Track-record stats are Zakaria's private tutoring results, not Karman
   program results.** Label them that way wherever they appear: +285
   average gain (1235 → 1520), 94% reached their target score, median 16
   weeks to goal, 4.9/5 rating, 1,200+ students tutored.
3. **No fake urgency.** Real deadlines (enrollment close, test dates, seat
   counts) are fine; countdown gimmicks are not.
4. **Don't sell features that won't exist in time.** Anything not shipped by
   the program start is labeled "coming" with a season.
5. **Only original questions in public.** No College Board content on the
   site, in videos, or in the daily question.
6. **Score estimates are ranges** and are called estimates.
7. **Publish real results** (every enrolled student, including dropouts;
   median gain; share hitting target) once ~15–20 official scores exist.

## Economics

- **Floor:** $80 per working hour. A live hour carries ~25 minutes of prep
  and follow-up (≈1.4 working hours), so a 1:1 hour must bring in ≥ ~$116.
- **Cohort of 5 at $1,295:** 27 class hours + 25 review hours = 52 live
  hours → ~$124 per live hour → ~$89 per working hour. The $995 founding
  cohort runs ~$68 per working hour — the accepted cost of a first set of
  results.
- **Private at $145/hour** → ~$100+ per working hour.
- **Solo ceiling:** ~$80–120k revenue a year.
- **Target:** ~$400k annual profit by 2029, which needs ~$950k revenue:
  tutor-delivered cohorts and private hours (~8 part-time tutors at
  ~$50/hour), Signature hours, Season Pass, Self-Paced, the PSAT track,
  school licenses, and practice-test packs — plus ~1,500–2,000 paying
  families a year from an audience built by the Daily Question and video.

## Build order

**Before enrollment opens (Nov 2026):** marketing site rebuilt around the
programs; honesty fixes (testimonials, Nabil, the misleading predicted-score
page, guarantee terms); lead capture; Daily Question; half-length free
practice test runner; deposits via Stripe Payment Link.

**Before January 4, 2027:** package checkout (one-time + 3 payments) and an
enrollment record that stores outcomes; spaced review + random,
recently-seen-excluding question selection; question source tagging and
College Board removal; chat with DMs off and no Slack dependency; cohort
cap of 6 (5 + scholarship); birth-year gate and parent-visibility consent;
intake screening.

**After March 2027:** Root Words, Score Plan, Ask Karman, Test-Day
Playbook, automated parent digest, Karman's own adaptive full-length tests,
tutor view, video library, Season Pass, Self-Paced, results page.

## Open decisions to confirm

- Class days/times, free practice test start time, and the enrollment
  deadline (placeholders in `offer.ts`, marked `CONFIRM:`).
- The guarantee remedy (free next cohort) replaces the old full-refund
  promise.
