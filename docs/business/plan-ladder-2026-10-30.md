# Plan ladder (founder picks, 2026-10-30)

These are the founder's picks from the plan checklist, plus the decisions he
made in the same conversation. They replace "programs, not monthly plans" in
`docs/business-plan.md`. Both that file and `src/lib/marketing/offer.ts` were updated to
match on 2026-10-30. Lines marked `OPEN:` are not settled yet. The research
behind the prices is in `market-comparison-2026-10-30.md` and
`school-pricing-2026-10-30.md`.

| Plan        | Price                              | Questions | Guarantee |
| ----------- | ---------------------------------- | --------- | --------- |
| Free        | $0                                 | 100       | No        |
| Platform    | $29 a month                        | 500       | No        |
| Plus        | $49 a month                        | All       | No        |
| Cohort      | $995 founding, then $1,295         | All       | Yes       |
| Private 1:1 | $1,495 for 10 hours, $2,495 for 20 | All       | Yes       |
| School      | $10 per student a year             | 2,000     | No        |

Platform and Plus are billed plain monthly, until the family cancels.

## What each plan includes

There are 13 feature bundles. A bundle is one thing, not a list of separate
features:

- **Quiz engine:** practice by skill, explanations, highlight, scratch pad,
  timer, mistake log.
- **Built-in graphing calculator.**
- **Your Daily 10.**
- **Challenge question and Wordline.**
- **Full-length tests:** timed, scored, with a Karman predicted score.
- **Progress and rewards:** skill levels, stats, streaks, tokens, boxes, the
  fox.
- **Planning tools:** Score Plan, Test-Day Playbook, Ask Karman (coming 2027).
- **Live workshops and office hours,** with recordings and video lessons.
- **Live classes:** twice a week, proctored tests, cohort chat.
- **1:1 sessions:** full-length review sessions, questions to the tutor.
- **Parent account and updates.**
- **Score guarantee.**
- **School tools:** classes, seat keys, school admin, teacher view, reports.

| Bundle                          | Free | Platform | Plus | Cohort | Private | School |
| ------------------------------- | ---- | -------- | ---- | ------ | ------- | ------ |
| Quiz engine                     | Yes  | Yes      | Yes  | Yes    | Yes     | Yes    |
| Built-in graphing calculator    |      | Yes      | Yes  | Yes    | Yes     | Yes    |
| Your Daily 10                   |      | Yes      | Yes  | Yes    | Yes     | Yes    |
| Challenge question and Wordline | Yes  | Yes      | Yes  | Yes    | Yes     | Yes    |
| Full-length tests               |      | Yes      | Yes  | Yes    | Yes     | Yes    |
| Progress and rewards            | Yes  | Yes      | Yes  | Yes    | Yes     | Yes    |
| Planning tools                  |      | Yes      | Yes  | Yes    | Yes     | Yes    |
| Live workshops and office hours |      |          | Yes  | Yes    | Yes     |        |
| Live classes                    |      |          |      | Yes    |         |        |
| 1:1 sessions                    |      |          |      |        | Yes     |        |
| Parent account and updates      |      | Yes      | Yes  | Yes    | Yes     | Yes    |
| Score guarantee                 |      |          |      | Yes    | Yes     |        |
| School tools                    |      |          |      |        |         | Yes    |

## The cohort, redefined (founder, 2026-10-30)

- **What it is.** Five students, two live sessions a week, ending on one SAT
  date. Its purpose is to get the most out of each live hour.
- **No 1:1 sessions.** It no longer includes 1:1 full-length review sessions.
  Those belong to Private 1:1. At $995 and 5 students, the 18 classes plus the
  weekly session (about 27 live hours) bring in about $184 per live hour. With
  the old 25 review hours added, it was about $96.
- **How class time is used.**
  - Group classes teach the skills most of the group missed.
  - In class practice, each student works the same skill at their own
    difficulty.
  - Each student's own misses come back in Your Daily 10.
- **Grouping.**
  - First, by test date.
  - Then by diagnostic score, following the ability-grouping research. Karman's
    students usually start around 1200 or around 1400, so the split is at
    1250: one cohort below, one above, once a test date has enough students
    for two.
  - In the first months, with few students, one cohort per test date is fine.

## Notes from the founder

- **Calculator.** It isn't in Free. This is his choice.
- **Private 1:1.**
  - Prices end in 95 to match the cohort.
  - Students book their own next session.
  - There's no fixed weekly or twice-weekly schedule.
- **School.** $10 per student a year, everything in the School column included
  (founder, 2026-10-30). That matches what schools actually pay Khan Academy
  Districts ($8 to $10) and MasteryPrep ($10), and stays below Albert ($15 to
  $18) and Magoosh ($35). Schools buy yearly on a July to June budget.
  Pilot: up to 10 founding schools use it free from January to June 2027,
  covering spring SAT School Day; the renewal quote goes out in April, before
  budgets close. `OPEN:` a minimum number of students per school.

## Follow-ups

1. **Guarantee terms.** The cohort's requirements changed. They need the
   lawyer review that's already pending.
2. **Plan config.** The portals read one plan config. This table is its first
   version.
3. **Plan names.** "Platform" and "Plus" are working names (`CONFIRM:` in
   `offer.ts`).
