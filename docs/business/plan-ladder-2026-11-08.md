# Plan ladder (founder, 8 November 2026)

Replaces the 30 October ladder (Free, Platform $29, Plus $49, Cohort, Private, School $10). Platform
and Plus no longer exist. Every number below is in `src/lib/marketing/offer.ts`; the server-side
access rules are in `src/lib/plans/` (see its README); Stripe test prices are created by
`scripts/stripe/setup-test-products.mjs`.

## The plans

| Plan id | Name | Price | What it includes | Guarantee |
| --- | --- | --- | --- | --- |
| `free` | Free | $0 | 100 questions in total, plus one free full-length test. Core pool, written explanations. | No |
| `practice` | Practice | $39 a month, or $89 for 3 months | The core question pool, with written explanations. | No |
| `pro` | Pro | $69 a month, or $149 for 3 months | Every question, including the hard mastery pool, plus video explanations. | No |
| `cohort` | 9-week Cohort | $995 | At most 6 students. 18 sessions, twice a week, 60 minutes each. Score bands 1000 to 1200, 1200 to 1400, 1400 to 1600. No 1:1s. Includes Pro on the platform. | Yes |
| `private-10` | Private 10 | $1,495 | 10 hours of 1:1 tutoring. Includes Pro on the platform. | Yes |
| `private-20` | Private 20 | $2,495 | 20 hours of 1:1 tutoring. Includes Pro on the platform. | Yes |
| `school` | Schools | $8 per student a year, first year free | Each student gets Practice-plan access of their own. It is not a shared pool. | No |
| `tutor-affiliate` | Tutor affiliate | $199 a month per tutor | One code. Up to 50 students who redeem it get Practice free while the tutor's subscription is active. The tutor gets admin rights over them: progress, assigning work, the roster, removing a student. The tutor gets Pro for themselves. | No |

## Rules that go with the prices

- **Monthly and 3-month plans** (Practice, Pro, Tutor affiliate) renew until cancelled. Cancelling
  stops the next payment; the plan runs to the end of the time paid for. No free trials: the Free
  plan is the way to try Karman.
- **Cohort payment:** $995 in full, or a $95 refundable deposit and three payments of $300.
  $95 + 3 × $300 = $995. The deposit is part of the price, not extra, and is refunded in full if the
  family cancels before the first class.
- **Private packages** are paid in full before the first session. A session cancelled with less than
  24 hours' notice counts as a used hour.
- **Guarantee** (Cohort, Private 10, Private 20): +100 points from a baseline under 1400, +50 from a
  baseline of 1400 or higher; a 1600 always counts. Cohort: half or all of the price back, or the next
  cohort free. Private: free extra hours (3 or 6), then half the price back. Full terms:
  `docs/business/guarantee.md`.
- **Scholarship:** $1,500 to the top-scoring student in each cohort: the $995 refunded plus a $505
  merit bonus. Built in the admin portal (upload, automatic PDF check, review queue, payout).
- **Access on the server** (`src/lib/plans/`): Free, Practice, school students and affiliate students
  see the core pool (difficulty 1 to 5) with written explanations; Pro, Cohort, Private and tutor
  affiliates see every question (mastery = difficulty 6 and 7) with video explanations. Free stops at
  100 questions answered and one full-length test.

## Stripe (test mode) lookup keys

`practice_monthly`, `practice_3_months`, `pro_monthly`, `pro_3_months`, `cohort`, `private_10`,
`private_20`, `tutor_affiliate_monthly`. Schools are invoiced by hand and have no checkout price.

## What changed from 30 October

- Platform ($29) and Plus ($49) are replaced by Practice ($39 / $89 for 3 months) and Pro ($69 / $149).
- School licenses drop from $10 to $8 per student a year, with the first year free.
- The cohort is now one price ($995) with 60-minute classes and score bands; no founding/later prices.
- Private 10 now carries the guarantee too.
- The tutor affiliate plan is new.
- The need-based scholarship seat is replaced by the $1,500 merit scholarship.
