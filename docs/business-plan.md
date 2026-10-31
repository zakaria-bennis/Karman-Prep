# Karman Prep: business plan (October 2026)

This is the working plan for what Karman sells, how it's priced, and what gets
built in what order. The plan ladder, with each plan's price and features, is
in [`docs/business/plan-ladder-2026-10-30.md`](./business/plan-ladder-2026-10-30.md).
Product copy on the marketing site comes from
[`src/lib/marketing/offer.ts`](../src/lib/marketing/offer.ts). It matches this plan as of 2026-10-30. Visual and voice rules
live in [`docs/design-rules.md`](./design-rules.md) and the voice section of
[`docs/brand.md`](./brand.md).

## North star

Help students succeed on the SAT, measurably. Every feature, price and promise
is checked against one question: does it raise scores, or does it honestly
help a family decide?

The methods Karman leans on are the best-supported ones in learning research:

- timed practice testing with review
- spaced review of mistakes
- mixed practice
- frequent small-group or 1:1 feedback
- accountability for practice time

## The business in one line

Karman is a founder-led SAT prep company with a ladder of plans:

- **Free and monthly practice plans** bring families in and keep students
  practising.
- **Small live cohorts** end on a specific SAT date.
- **Private 1:1** sits at the top.
- **Cheap school licenses** spread the product.

Who's involved:

- **Founder:** Zakaria Bennis, solo founder and tutor. He scored in the 99th
  percentile on the SAT and has tutored 1,200+ students privately. Nabil Kafil
  Asrar is no longer involved and must not appear anywhere in product or
  marketing.
- **Who buys:** parents of high-school students, mostly in 11th grade, and
  schools.
- **Who uses it:** students aged roughly 15 to 18.

## Why a ladder

- **Reach comes from free plans and schools.** Families and schools try
  Karman for little or nothing. The Daily 10, Challenge question and the
  question bank show the quality.
- **Monthly practice plans earn from software, not hours.** A solo founder's
  live hours are the ceiling, so Platform and Plus earn without adding
  teaching time. Plus adds live workshops and office hours, which competitors
  either don't offer or charge far more for.
- **Live teaching is sold as programs that end on a test date.** SAT prep has
  a finish line. Selling sessions one at a time makes every session a new
  buying decision, and families quit before scores move. Hourly pricing also
  invites comparison with cheap commodity tutors. So the cohort and the
  Private packages run to a date or a number of hours, and they carry the
  guarantee.

## The offer (enrollment opens November 2026)

| Plan        | Price                              | Questions | Guarantee |
| ----------- | ---------------------------------- | --------- | --------- |
| Free        | $0                                 | 100       | No        |
| Platform    | $29 a month                        | 500       | No        |
| Plus        | $49 a month                        | All       | No        |
| Cohort      | $995 founding, then $1,295         | All       | Yes       |
| Private 1:1 | $1,495 for 10 hours, $2,495 for 20 | All       | Yes       |
| School      | $10 per student a year             | 2,000     | No        |

What each plan includes is in the plan ladder.

### Practice plans

- **Free** gives a student the quiz engine, the Challenge question and
  Wordline, and progress and rewards.
- **Platform** adds the graphing calculator, Your Daily 10, full-length tests,
  planning tools and a parent account.
- **Plus** adds every question, plus live workshops and office hours.
- Platform and Plus are billed monthly until the family cancels. Neither
  carries a guarantee.

### The March SAT Program (cohort)

- **Dates.** It ends on the Saturday, March 6, 2027 SAT, and runs 9 weeks from
  Monday, January 4, 2027.
- **Size.** 5 paying seats plus 1 scholarship seat.
- **Live teaching.**
  - Two 90-minute live classes a week, 18 in total.
  - One weekly live session for everyone: test mechanics alternating with
    rotating skill workshops.
- **Five full-length practice tests.** The week-1 baseline (an official
  Bluebook test) and the dress rehearsal are proctored live.
- **How class time works.** Classes teach the skills most of the group
  missed. In class practice, each student works the same skill at their own
  difficulty. Each student's own misses come back in Your Daily 10. The cohort
  doesn't include 1:1 sessions; those are Private 1:1.
- **Grouping.** First by test date. Then, once a date has enough students,
  split at a diagnostic score of 1250. Karman's students usually start around
  1200 or around 1400.
- **Also included.**
  - Your Daily 10: spaced review that brings missed questions back. It must
    ship before January 4.
  - Original practice questions across 39 skills and 7 difficulty levels,
    growing to 10,000+.
  - Cohort chat, and questions to the tutor answered once a day.
  - A weekly progress update to parents.
  - The guarantee.
- **Price.** $995 founding price for the March cohort, paid in full or in 3
  monthly payments of $345. Later cohorts are $1,295.
- **Reserving.** A $100 refundable deposit holds a seat, through a Stripe
  Payment Link (set `NEXT_PUBLIC_COHORT_DEPOSIT_URL`). Until that link exists,
  the site collects interest through the lead form.
- **Next cohorts.** They end on the May 1 and June 5, 2027 SATs. Enrollment
  opens in February.

### Private 1:1

- **Packages.** Private 10 is 10 hours for $1,495. Private 20 is 20 hours for
  $2,495.
- **Booking.** Students book their own next session. There's no fixed weekly
  schedule.
- **Sessions.** Each one goes through every mistake on the student's latest
  full-length, or targets the skill holding them back.
- **Also included.** The full platform, live workshops and office hours, and
  an update to parents after every session.
- **First step.** A free strategy call (`NEXT_PUBLIC_STRATEGY_CALL_URL`, a
  Cal.com link) or the lead form.
- **Later.** From 2028, trained Karman tutors deliver Private at about $135 an
  hour, and Zakaria's own hours become "Signature" at about $200 an hour.

### Schools

- **Price.** $10 per student a year, on a July to June term. That matches what
  schools pay Khan Academy Districts and MasteryPrep, and is below Albert and
  Magoosh (see `docs/business/school-pricing-2026-10-30.md`).
- **What schools get.** Classes, seat keys, an optional school admin, a
  teacher view, reports and parent accounts.
- **Pilot.** Up to 10 founding schools use it free from January to June 2027,
  covering spring SAT School Day.
- **Families.** Upgrades from school accounts are opt-in and started by the
  parent. State student-privacy laws forbid marketing with school data.

### Free entry points

- **Free practice test.** A half-length test (one Reading and Writing module
  and one Math module, about 49 questions, about 75 minutes), built from
  Karman's own questions and proctored live on Zoom, monthly.
  - The first one is Saturday, December 12, 2026.
  - It includes an estimated score range, a domain breakdown and a 20-minute
    results call.
- **35-question diagnostic.** Free with an account, any time.
- **Challenge question.** One hard question a day, with streaks and a share
  card.

### The guarantee

- **Who gets it.** It belongs only to the cohort and Private 1:1.
- **Terms.** The terms differ by product and live in `offer.ts`: +100 points
  or 1450, with the remedy depending on the result.
- **Pending.** The requirement to complete five one-on-one reviews was removed
  on 2026-10-30 with the cohort's 1:1s. The terms still need the lawyer review.
- **Honest intake.** Students already scoring 1500+, or fewer than about 4
  weeks from their test, are told plainly that a program probably isn't worth
  it for them.

## The full ecosystem (status)

| Offering                                                        | Status                                 |
| --------------------------------------------------------------- | -------------------------------------- |
| Free, Platform and Plus plans                                   | Launching with enrollment              |
| March SAT Program (cohort)                                      | Launching Jan 2027                     |
| Private 1:1 (Private 10 / 20)                                   | Launching Jan 2027                     |
| School licenses                                                 | Pilot Jan to Jun 2027                  |
| Free monthly practice test (own questions)                      | First: Dec 12, 2026                    |
| 35-question diagnostic                                          | Live                                   |
| Practice engine: question bank, Daily 10, full-length tests     | Bank live; Daily 10 by Jan 2027        |
| Live workshops and office hours                                 | Jan 2027                               |
| Cohort community (chat; DMs later with safeguards)              | Jan 2027                               |
| Insights: student, parent and tutor views                       | Manual Jan 2027; automated summer 2027 |
| Challenge question (free, streaks)                              | Nov 2026                               |
| Wordline (root-based word game)                                 | Spring 2027                            |
| Score Plan (test-date and superscore planner)                   | Spring 2027                            |
| Ask Karman (AI mistake coach, grounded in checked explanations) | Summer 2027                            |
| Test-Day Playbook (personal guide generated from student data)  | May 2027                               |
| Video lesson library (clipped from recorded workshops)          | Rolling from Jan 2027                  |
| PSAT and Foundations track (9th and 10th grade)                 | Summer 2028                            |
| Social video engine (YouTube, Instagram, TikTok)                | Now                                    |

## Marketing honesty rules

1. **No testimonials until real ones exist.** Every past testimonial has been
   removed.
2. **Track-record stats are Karman's 1:1 tutoring results.** This was a
   founder decision on 2026-10-19: Karman is Zakaria's business, so his
   students are Karman's students.
   - The stats: +285 average gain (1235 to 1520), 94% reached their target
     score, median 16 weeks to goal, 4.9/5 rating, 1,200+ students tutored.
   - Always state the format next to them: 1:1 tutoring, median 16 weeks.
   - Never present them as results of the 9-week cohort.
   - Replace them with cohort results once those exist.
3. **No fake urgency.** Real deadlines (enrollment close, test dates, seat
   counts) are fine; countdown gimmicks are not.
4. **Don't sell features that won't exist in time.** Anything not shipped by
   a plan's start is labeled "coming" with a season.
5. **Only original questions in public.** No College Board content on the
   site, in videos, or in the Challenge question.
6. **Score estimates are ranges** and are called estimates.
7. **Never claim "cheapest".** Khan Academy, Bluebook and Varsity Tutors are
   free, so no paid plan is the cheapest.
8. **Publish real results** once about 15 to 20 official scores exist: every
   enrolled student including dropouts, the median gain, and the share hitting
   their target.

## Economics

- **Floor.** Karman needs at least $80 per working hour. A live hour carries
  about 25 minutes of prep and follow-up, about 1.4 working hours.
- **Cohort.** Without 1:1 reviews, a cohort is about 27 live hours: 18 classes
  plus the weekly sessions.
  - At 5 students and $1,295, that's about $240 per live hour, or about $171
    per working hour.
  - The $995 founding cohort is about $184 per live hour, or about $131 per
    working hour.
- **Private.** Private 10 is about $150 an hour and Private 20 about $125,
  roughly $107 and $89 per working hour.
- **Platform, Plus and School** earn without adding live hours, apart from the
  workshops and office hours, which serve every Plus, cohort and Private
  student at once.
- **Target.** About $400k annual profit by 2029. That comes from:
  - tutor-delivered cohorts and Private hours
  - Signature hours
  - monthly plans
  - school licenses
  - the PSAT track
  - an audience built by the Challenge question and video

## Build order

**Before enrollment opens (Nov 2026):**

- the marketing site rebuilt around the plans
- honesty fixes
- lead capture
- the Challenge question
- the half-length free practice test runner
- deposits via Stripe Payment Link

**Before January 4, 2027:**

- checkout for programs (one-time and 3 payments) and monthly plans
- an enrollment record that stores outcomes
- spaced review, and question selection that is random but skips recently
  seen questions
- question source tagging and College Board removal
- chat with DMs off and no Slack dependency
- a cohort cap of 6 (5 plus the scholarship seat)
- a birth-year gate and parent-visibility consent
- intake screening
- the student, parent and tutor portals, rebuilt around the plan config

**Spring 2027:** the school portal, before school budgets close.

**After March 2027:**

- Wordline, Score Plan, Ask Karman and the Test-Day Playbook
- the automated parent digest
- Karman's own adaptive full-length tests
- the video library
- the results page

## Open decisions to confirm

- **Placeholders in `offer.ts`,** marked `CONFIRM:`: class days and times, the
  free practice test's start time, and the enrollment deadline.
