# School data model

How school seats, classes and keys join the app's existing tables without
reworking the student, parent or tutor portals. Written with the school
portal prototype (2026-11-01); nothing here is migrated yet. The school
portal is not built in Phase 2 (schools buy on a July budget; up to 10
founding schools pilot free from January to June 2027), so this is the
model to build from when it is.

Conventions: every table has `id uuid primary key`, `created_at timestamptz`,
and `updated_at`. People are rows of the existing `public.users` (Clerk id,
role). The school plan is `plan_id = 'school'` from `offer.ts`, never a name
typed into a table. Money is integer cents. RLS is on for every table; the
boundary is written in one line each.

## Tables

### schools

The customer. One row per school.

| column | type | notes |
| --- | --- | --- |
| id | uuid | |
| name | text | "Ridgeview High" |
| slug | text unique | the key prefix, "RHS" |
| domain | text | the school's email domain, for invitations |
| created_by | uuid → users.id | the first admin |

RLS: a row is readable by its members (`school_memberships`), writable by
its admins; Karman staff bypass with the service role.

### school_licences

What the school bought, one row per term (a renewal is a new row), so the
year-end state and the renewal quote are plain rows.

| column | type | notes |
| --- | --- | --- |
| school_id | uuid → schools.id | |
| plan_id | text | `'school'`, checked against the plan config |
| seats | integer | 120 |
| price_cents_per_seat | integer | 1000, from offer.ts at purchase |
| starts_on, ends_on | date | July 1 to June 30; the pilot runs Jan 4 to Jun 30, 2027 |
| pilot | boolean | founding pilot, free |
| renewal_quote_sent_at | timestamptz null | April before `ends_on` |
| stripe_invoice_id | text null | the paid invoice; null in the pilot |
| status | text | `active`, `ended`, `renewed` |

RLS: readable by the school's members, writable by its admins (seats added)
and by the billing webhook (service role). The active licence is the one
whose dates contain today.

### school_memberships

Who works at the school and what they may do. Joins `users`.

| column | type | notes |
| --- | --- | --- |
| school_id | uuid → schools.id | |
| user_id | uuid → users.id null | null until the invitation is accepted |
| email | text | the invitation goes here |
| role | text | `admin`, `teacher` |
| invited_at, accepted_at | timestamptz | the "not signed in yet" state is `accepted_at is null` |
| invited_by | uuid → users.id | |

Primary key (school_id, email). RLS: readable by the school's members;
inserted and deleted by its admins; a member may update their own row on
acceptance.

### school_classes

A class at the school with its teacher.

| column | type | notes |
| --- | --- | --- |
| school_id | uuid → schools.id | |
| name | text | "Period 3" |
| teacher_id | uuid → users.id null | a member with role teacher or admin |
| archived_at | timestamptz null | |

RLS: readable by the school's members; written by admins. A teacher reads
every class of their school but the portal shows them their own.

### seat_keys

A code that gives a student a seat, for a class, for one student, or for
any class.

| column | type | notes |
| --- | --- | --- |
| school_id | uuid → schools.id | |
| licence_id | uuid → school_licences.id | the seats it draws on |
| class_id | uuid → school_classes.id null | null is "any class" |
| code | text unique | "RHS-P3-7KQ2": slug, scope, four characters without look-alikes |
| label | text | "Period 3", "Ravi, Period 6" |
| max_uses | integer | 1 for a student key |
| issued_by | uuid → users.id | |
| revoked_at | timestamptz null | stops new redemptions; seats already taken stay |

`used` is `count(*) from seat_assignments where key_id = id`, never a
column. RLS: readable and written by the school's admins; a student redeems
a key through a server action that checks `revoked_at is null`,
`used < max_uses` and the licence's seat count, never by reading the table.

### seat_assignments

A student on a seat: the join between a student user and a licence.

| column | type | notes |
| --- | --- | --- |
| school_id | uuid → schools.id | |
| licence_id | uuid → school_licences.id | |
| student_id | uuid → users.id | the student's user |
| key_id | uuid → seat_keys.id | how they got in |
| class_id | uuid → school_classes.id null | null is "a seat but no class"; set by the key or by an admin later |
| taken_at | timestamptz | |
| released_at | timestamptz null | the licence ended or the admin removed them |

Unique (licence_id, student_id). `subscriptions` is not touched: a seat is
the student's entitlement to the school plan while `released_at is null`,
read by the same `plan_id` check the family plans use. RLS: a student reads
their own row; the school's members read the school's rows; admins write;
teachers update `class_id` for their own classes only.

### class_practice

Practice a teacher assigns to a class. One row per assignment; the per
student work lives in the existing `catalog_assignments` and
`catalog_practice_sessions`, which this table fans out into (one catalog
assignment per student in the class at assignment time).

| column | type | notes |
| --- | --- | --- |
| school_id | uuid → schools.id | |
| class_id | uuid → school_classes.id | |
| skill_id | text | from the approved taxonomy |
| title | text | "Percentages practice" |
| question_count | integer | 10, 15 or 20 |
| due_on | date | every due item shows its date |
| assigned_by | uuid → users.id | |

RLS: readable by the school's members; written by the class's teacher or an
admin; students read it through their own `catalog_assignments`.

## What joins what

- `users` stays the only table of people; a school person is a `users` row
  with a `school_memberships` row. The admin and teacher are roles in the
  membership, not new values of `users.role`.
- `parent_student_links` is unchanged: a parent of a school student links
  to the student exactly as any parent does, and the parent portal reads
  the student's plan through the seat. Parents of school students have
  parent accounts; the school portal only notes whether one is linked.
- Levels, questions answered and Your Daily 10 come from the existing
  practice tables (`catalog_practice_sessions`, `learn_node_status`,
  `quiz_attempts`) filtered by the students in `seat_assignments`; the
  school portal adds no copy of them. Usage across the school is a view,
  `school_week_usage(school_id, week)`, summed from those rows.
- A student's plan check (`has(plan, bundle)`) reads `plan_id = 'school'`
  from the active seat; nothing in the question bank or the quiz engine
  knows about schools.
- A family on a school seat buys a family plan from their own account; the
  seat stays. `subscriptions` and `seat_assignments` can both exist for one
  student; the higher plan wins in `has()`.

## The RLS boundary, in one line

Every school table carries `school_id`; a row is visible to the school's
members (`exists (select 1 from school_memberships m where m.school_id =
row.school_id and m.user_id = auth_user_id())`), writable by its admins,
and a student sees only their own `seat_assignments` row. Keys are redeemed
by a server action with Zod-validated input, never by a client read.
