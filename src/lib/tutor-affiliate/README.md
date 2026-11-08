# Tutor affiliate plan and tutor homework

A tutor (for example on Leland) pays $199 a month. They get one code. Up to 50
students who join with it get the Practice plan free while the tutor's plan is
active, and the tutor can see their progress, assign work, manage the roster
and remove a student.

## Data (supabase/migrations/20261108043000 and 20261108043100)

| Table                            | What it holds                                                                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users.role = 'affiliate_tutor'` | An outside tutor. Not `tutor`: staff tutor pools (cohort dropdowns, automatic 1:1 placement, payouts) pick `tutor`, and an outside tutor must never land in them. |
| `tutor_affiliates`               | One row per affiliate tutor; `seat_limit` (50).                                                                                                                   |
| `tutor_affiliate_codes`          | One live code per tutor, `XXXX-XXXX` without I, O, 0 or 1. A new code retires the old one; students stay.                                                         |
| `tutor_affiliate_redemptions`    | The tutor-to-student link. One live link per student. A trigger caps live links at 50 per tutor, race-safe. Removed links stay for history.                       |
| `tutor_homework`                 | Work a tutor assigned to one student (see below).                                                                                                                 |

The $199 subscription and the students' Practice grant belong to the pricing
work (`src/lib/plans/`): the subscription is a `subscriptions` row with
`plan_id = 'tutor-affiliate'`, and each link writes a `plan_grants` row
(`source = 'tutor-affiliate'`, `source_ref` = the redemption id,
`sponsor_user_id` = the tutor). `plan-bridge.ts` is the only file that touches
those tables.

## The assignment model (`homework.ts`)

One row in `public.tutor_homework` is one piece of work for one student:

| Column                | Meaning                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `student_user_id`     | `users.id` of the student                                                                                        |
| `assigned_by_user_id` | `users.id` of whoever assigned it                                                                                |
| `kind`                | `skill_practice`, `domain_quiz` or `full_length_test`                                                            |
| `target_id`           | catalog skill id (`CATALOG_SKILLS`), SAT Domain id (`SKILL_DOMAINS`), or null for a full-length test             |
| `title`               | ready to show: "Practice: Linear equations in one variable", "Domain quiz: Algebra", "Full-length practice test" |
| `note`                | optional, up to 500 characters                                                                                   |
| `due_on`              | a date (YYYY-MM-DD), today or later, within a year                                                               |
| `status`              | `assigned`, `completed` or `cancelled` (with `completed_at` / `cancelled_at`)                                    |

- **Student Homework** (student-portal): list a student's work with
  `supabaseHomeworkStore.listForStudent(studentUserId)` and order it with
  `sortHomework` (open work by due date, then the rest). Show `title`, `due_on`
  and `note`. Start the work from `kind` + `target_id`. When the student
  finishes it, set `status = 'completed'` and `completed_at` (no helper yet:
  add `complete(id, at)` to `HomeworkStore` beside `cancel`).
- **Class assignments** (parent-school): reuse the same table and `kind` /
  `target_id` values, one row per student in the class, with
  `assigned_by_user_id` = the teacher. Write your own rights check (a teacher
  may assign only to their class), the way `assignHomework` calls
  `resolveAffiliateManagement` before every write.
- Rows are never deleted; cancelling keeps history. Removing a student from a
  tutor's group cancels that tutor's open homework for them.

## Rights (`service.ts`)

`resolveAffiliateManagement(deps, { actorClerkId, studentClerkId })` is the one
check. A tutor reaches only students linked to their own code; an admin reaches
any linked student. While the tutor's plan is active they can view progress,
assign, remove and make a new code; once it lapses they keep the roster and
removal only. Server actions always use the signed-in Clerk id, never a
submitted one or an admin's impersonation target.

## Where things are

- Rules (pure, tested): `rules.ts`, `service.ts`, `homework.ts`, `progress-rules.ts`
- Database: `store.ts`, `homework-store.ts`, `plan-bridge.ts`, `progress.ts`
- Server actions: `src/app/tutor/affiliate-actions.ts`, `src/app/join/actions.ts`
- Screens: `src/components/tutor-affiliate/`, routes `/tutor`, `/tutor/[studentId]`,
  `/tutor/billing`, `/join`, `/join/[code]`, `/tutors/start`, `/tutors/welcome`
- Local test data: `supabase/seeds/overnight/tutor-affiliate.sql`
