# Plan access (`src/lib/plans`)

Server-side rules for what each plan opens. Prices and plan facts come from
`src/lib/marketing/offer.ts`; this folder never restates them.

## What each plan sees

| Plan                                  | Questions                         | Explanations    | Limits                       | Tutor admin      |
| ------------------------------------- | --------------------------------- | --------------- | ---------------------------- | ---------------- |
| free                                  | core (difficulty 1 to 5)          | written         | 100 questions, 1 full-length | no               |
| practice, school seat, affiliate seat | core                              | written         | none                         | no               |
| pro, cohort, private-10, private-20   | every question (mastery included) | written + video | none                         | no               |
| tutor-affiliate (the tutor)           | every question                    | written + video | none                         | yes, 50 students |

Mastery pool = `quiz_questions.difficulty_level` 6 or 7. Core = 1 to 5. The
legacy label "mastery" maps to 6. An unreadable difficulty counts as mastery.

## API

```ts
import { getPlan, getUsage, canAccess, canSeeQuestion, difficultyRangeFor } from "@/lib/plans";

const plan = await getPlan(userId);
if (!canAccess(plan, "pool:mastery")) notFound();

// Free plan limits need usage. Skip the query on unlimited plans.
const usage = plan.entitlements.questionLimit === null ? undefined : await getUsage(userId);
if (!canAccess(plan, "question:new", usage)) redirect("/plans");
canSeeQuestion(plan, question.difficulty_level, usage, { alreadyAnswered });
fetchCatalogQuestionPool({ skillId, ...difficultyRangeFor(plan) });
explanationTypes(plan); // ["written"] or ["written", "video"]
```

Features: `pool:core`, `pool:mastery`, `explanations:written`,
`explanations:video`, `question:new`, `full-length-test:new`, `tutor-admin`.
`question:new` and `full-length-test:new` answer false on a limited plan when no
usage is passed.

`@/lib/plans` reaches the database: import it from server code only. The pure
rules (`./access`, `./catalog`) are safe anywhere.

## Where access comes from

- `public.subscriptions` (Stripe): practice, pro, tutor-affiliate. Active and
  trialing count; past_due counts until `current_period_end`.
- `public.plan_grants` (migration `20261108110000_plan_grants.sql`): one-time
  purchases, school seats, tutor-affiliate seats, admin grants. A grant counts
  when started, not expired and not revoked. A tutor-affiliate grant also needs
  its tutor's `tutor-affiliate` subscription to be active.
- A user can hold several. Access is the union, and `plan.planId` is the most
  generous: free < practice (= school and affiliate students) < pro (= cohort,
  private, tutor-affiliate).

## Creating and revoking grants

```ts
// Stripe webhook, after a one-time payment. Safe to retry.
await recordPurchaseGrant({ userId, planId: "cohort", checkoutSessionId: session.id });

// School portal: one Practice plan per student. Pass the license end.
await grantPlan({ userId, planId: "practice", source: "school", sourceRef: licenseId, expiresAt });

// Tutor portal: a student redeems the code. Throws PlanGrantError when the
// tutor's subscription is not active or 50 students already hold a seat.
if (await canSponsorMore(tutorId)) {
  await grantPlan({
    userId: studentId,
    planId: "practice",
    source: "tutor-affiliate",
    sourceRef: redemptionId,
    sponsorUserId: tutorId,
  });
}
await canManageStudent(tutorId, studentId); // before showing progress or assigning work
await revokeGrant({ source: "tutor-affiliate", sourceRef: redemptionId, userId: studentId });
await revokeGrant({ grantId }); // refunds, admin removals
```

- Grants are idempotent on `(source, sourceRef, userId)`. Granting a revoked
  school, affiliate or admin grant again restores it. A revoked purchase (a
  refund) is never restored, so a late webhook retry cannot bring access back.
- The 50-seat cap is checked in `grantPlan`, not in the database. Two
  redemptions at the same instant could reach 51.

## Free usage

`getUsage` counts distinct question ids answered across skill practice
(`catalog_practice_sessions` / `catalog_practice_responses`) and the earlier
node quizzes (`quiz_attempts` / `question_responses`), in
`supabasePlanDataSource().answeredQuestionCount`. The Daily 10 and the
diagnostic store no per-question answers, so they do not count.

Completed full-length tests: no table records them yet, so
`completedFullLengthTests` returns 0. The full-length test flow must count its
completed tests there when it lands.

## Decisions (2026-11-08)

- Cohort, Private 10 and Private 20 include Pro access.
- The tutor-affiliate subscriber gets Pro, plus tutor-admin rights over up to
  50 active students.
- Mastery = difficulty 6 and 7; core = 1 to 5.
- Effective access is the most generous active source.
- CONFIRM: one-time purchases open their plan for 12 months from purchase
  (`ONE_TIME_ACCESS_MONTHS`).
