# The overnight local database

Tonight every session runs the app against a local Supabase on this Mac, never
against production. This page is everything you need to use it.

- **Project:** `karman-local` (Docker). API on `http://127.0.0.1:54321`, Postgres on
  `127.0.0.1:54322` (user `postgres`, password `postgres`: the standard local values,
  not a secret).
- **What runs:** Postgres, PostgREST, the Kong gateway, plus the small auth and storage
  services the migrations need. Studio, realtime, edge functions, logs, mail and image
  resizing are off to save memory (about 520 MB in all).
- **What is in it:** every migration, the question bank (copied read-only from
  production) and fake test accounts for every role. No real users, payments, messages
  or notes.
- **Rules:** never `supabase db push`, never `supabase link`, never point a script at
  production. Only the local-db session reads production, and only to copy questions.

## Start, stop, status

The stack lives in `/Users/zakariabennis/Karman-Prep-wt/local-supabase` (a copy of
`supabase/config.toml` and an empty migrations folder), so it doesn't depend on any
worktree.

```bash
supabase status --workdir /Users/zakariabennis/Karman-Prep-wt/local-supabase
```

```bash
open -a Docker
```

```bash
supabase start --workdir /Users/zakariabennis/Karman-Prep-wt/local-supabase
```

`supabase stop --workdir /Users/zakariabennis/Karman-Prep-wt/local-supabase` keeps the
data but takes the database away from every session, so don't stop it tonight. A SQL
prompt:

```bash
docker exec -it supabase_db_karman-local psql -U postgres
```

## The env file

```bash
cp /Users/zakariabennis/Karman-Prep-wt/overnight.env.local .env.local
```

Run that in your worktree, then change `NEXT_PUBLIC_APP_URL` in your copy to
`http://localhost:<your port>`. Never print, `cat` or commit either file.

Compared with the main checkout's `.env.local`:

- The Supabase URL and both keys point at the local stack.
- Empty, so nothing reaches outside services: `RESEND_API_KEY`, `SLACK_BOT_TOKEN`,
  `SLACK_SIGNING_SECRET`, `CAL_API_KEY`, `CAL_OAUTH_CLIENT_SECRET`, `ZOOM_CLIENT_SECRET`,
  `FIREFLIES_API_KEY`, `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `GITHUB_PAT`, and the image-generation keys `FAL_KEY` and
  `OPENAI_IMAGES_API_KEY` (no image spend tonight).
- `NEXT_PUBLIC_APP_URL` is `http://localhost:3000`, so a Stripe return link never lands
  on the live site.
- `DEV_IMPERSONATE_CLERK_ID` is `dev_seed_student_pro`.
- Stripe (test keys) and Clerk (test instance) are unchanged.

To rebuild it (for example after the stack's keys change):
`node scripts/overnight/write-overnight-env.mjs`. It never prints a value and refuses to
write if a production value would survive.

## Run the app

```bash
npx next dev --webpack -p <your port>
```

`npm run dev:next` (Turbopack) currently fails on this branch with "Can't resolve
'@vercel/turbopack-next/internal/font/google/font'", so use webpack. First visits to a
page compile slowly while the machine is busy.

## Test accounts

Every account is fake and its `clerk_id` starts with `dev_seed_`. Emails end in
`@karman.local`.

| Role             | `DEV_IMPERSONATE_CLERK_ID`  | Name           | What they have                                                                                                                        |
| ---------------- | --------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Free student     | `dev_seed_student_free`     | Noah Kim       | No plan. One diagnostic, a little progress.                                                                                           |
| Practice student | `dev_seed_student_practice` | Ava Patel      | Practice, monthly. About half way through.                                                                                            |
| Pro student      | `dev_seed_student_pro`      | Liam Chen      | Pro, 3 months. Far along. The default account.                                                                                        |
| Cohort student   | `dev_seed_student_cohort`   | Sofia Garcia   | In David's "Fall Cohort 1200 to 1400": 4 students, 18 sessions on Tuesdays and Thursdays (8 done), 3 homework items.                  |
| Private student  | `dev_seed_student_private`  | Maya Johnson   | Private 10 with David: 10 sessions (8 done, 2 booked), 10 tokens, David's notes.                                                      |
| Parent           | `dev_seed_parent_maya`      | Rachel Johnson | Parent of Maya.                                                                                                                       |
| Tutor            | `dev_seed_tutor_david`      | David Cole     | Teaches the cohort and Maya. Payouts set up.                                                                                          |
| Affiliate tutor  | `dev_seed_affiliate_tutor`  | Priya Shah     | Code `PRYA-K7M2`, redeemed by Ethan Brooks, Chloe Nguyen and Marcus Lee (`dev_seed_affiliate_student_1` to `_3`).                     |
| School teacher   | `dev_seed_teacher`          | Thomas Wright  | Class "Lincoln High Period 3 SAT": Isabella Rossi, Jamal Carter, Hannah Schultz, Diego Morales (`dev_seed_school_student_1` to `_4`). |
| Admin            | `dev_seed_admin`            | Dev Admin      | Admin.                                                                                                                                |

Every student also has a diagnostic or two, progress on learn nodes, quiz attempts
answered on real questions from the bank (97 in all) and notifications. Cohort mates:
`dev_seed_cohort_mate_1` to `_3` (Ben Walker, Grace Liu, Omar Haddad).

The CI accounts from `scripts/seed-dev.mjs` exist too: `dev_seed_student_fresh` (not
onboarded, goes to `/onboarding`), `dev_seed_student_mid`, `dev_seed_student_stuck`,
`dev_seed_tutor` and `dev_seed_parent` (parent of the mid student). The seed deletes the
four fake "DEV FIXTURE" questions that `seed-dev.mjs` adds, so nobody meets them.

### What changes when the pricing and tutor branches land

The seed reads the schema and writes what it allows:

- **Before the pricing migration** (`subscriptions.tier` still exists): Cohort and Private
  have subscriptions (tier `group` and `private`). Free, Practice and Pro have none, and
  today's code sends them to `/billing`. Use the Cohort or Private account for the student
  dashboard until then.
- **After it** (`subscriptions.plan_id`): Practice (`practice`, monthly), Pro (`pro`,
  3 months) and Priya (`tutor-affiliate`, monthly) get subscriptions. Cohort and Private are
  one-time purchases: the pricing session's `supabase/seeds/overnight/pricing.sql` adds
  their `plan_grants`.
- **Affiliate:** Priya's code and redemptions are in the tutor-affiliate tables. Today's
  `/tutor` page doesn't list them yet; the tutor-affiliate branch does.
- **Teacher:** Thomas has the role `tutor` and his class is a cohort. The parent-school
  tables (`schools`, `school_classes`, `school_seats`, …) are applied locally but not seeded:
  the parent-school session should put Thomas, his school and his class in
  `supabase/seeds/overnight/parent-school.sql` and drop the cohort stand-in.
- **Right now (08:30)** `subscriptions` has `plan_id` and `current_period_end` but no
  `billing_term`, and no migration row says who added them: part of the pricing change was
  applied by hand. A reset from `/Users/zakariabennis/Karman-Prep-wt/overnight-ship` after
  the pricing merge puts it straight.

## Switch roles

Change one line in your worktree's `.env.local` and reload the page. The dev server picks
up the change by itself ("Reload env: .env.local" in its log); no restart.

```bash
sed -i '' 's/^DEV_IMPERSONATE_CLERK_ID=.*/DEV_IMPERSONATE_CLERK_ID=dev_seed_tutor_david/' .env.local
```

Where each role starts: students `/dashboard/student`, parents `/dashboard/parent`, tutors
and the teacher `/tutor`, admins `/admin/users` (there is no `/admin` index page). Admins
can also use "View as" inside the admin pages, but that is read-only: clicks still act as
the admin.

## Add a migration

1. Name it `supabase/migrations/20261108HHMMSS_<session>_<what>.sql`.
2. Make it safe to run next to everyone else's: `if not exists`, additive changes. Dropping
   or renaming a column breaks other sessions' code until their branches merge.
3. Apply it to the local database:

```bash
scripts/overnight/apply-migrations-local.sh <your worktree>
```

It applies, in order, only the versions the database doesn't have yet (each file in one
transaction), stops at the first failure and tells PostgREST to reload. The CLI's own
runner trips on one of the existing migrations; plain `psql`, used here, doesn't.

## Seed data for your feature

Put a re-runnable SQL file in `supabase/seeds/overnight/<session>.sql` (use
`on conflict do nothing`, and find accounts with
`(select id from public.users where clerk_id = 'dev_seed_…')`). The reset runs every file
there, in name order, after the accounts. To run yours now:

```bash
docker exec -i supabase_db_karman-local psql -U postgres -v ON_ERROR_STOP=1 < supabase/seeds/overnight/<session>.sql
```

To re-seed the accounts without wiping anything: `node scripts/overnight/seed-personas.mjs`.

## Reset

```bash
scripts/overnight/reset-local-db.sh <worktree>
```

It recreates an empty database, applies that worktree's migrations, restores the question
bank from `/Users/zakariabennis/Karman-Prep-wt/question-bank.dump` (never from
production), seeds the accounts and runs the worktree's `supabase/seeds/overnight/*.sql`.
It takes 40 seconds to 3 minutes. Everyone loses their test data and sees errors
meanwhile, so say so in the shared notes first, and use a worktree that has every merged
migration (`/Users/zakariabennis/Karman-Prep-wt/overnight-ship`).

## Refresh the questions from production

```bash
scripts/overnight/refresh-questions.sh
```

Only the local-db session or the orchestrator runs this. It reads `quiz_questions`,
`answer_choices`, `answer_key_entries` and `source_assets` from production with GET
requests only, swaps them into the local database in one transaction and rewrites the
dump. Accounts, progress and every other table stay as they are. Last run: 08:07 CST,
11,413 questions.

## Files

| File                                                | What it does                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| `supabase/config.toml`                              | The local stack's settings (project `karman-local`).                     |
| `scripts/overnight/apply-migrations-local.sh`       | Applies a worktree's new migrations locally.                             |
| `scripts/overnight/refresh-questions.sh` (+ `.mjs`) | Read-only question copy from production, and the dump.                   |
| `scripts/overnight/seed-personas.mjs`               | The test accounts and their history (runs `scripts/seed-dev.mjs` first). |
| `scripts/overnight/write-overnight-env.mjs`         | Writes the env file without printing anything.                           |
| `scripts/overnight/reset-local-db.sh`               | The full rebuild.                                                        |

## When something is wrong

- **Connection refused on 54321:** start Docker, then `supabase start` as above.
- **"Could not find the table … in the schema cache":**
  `docker exec supabase_db_karman-local psql -U postgres -c "notify pgrst, 'reload schema'"`.
- **Ports 54321 to 54327 taken by `supabase_*_audit-worktree`:** an old stack that Docker
  restarts on its own. It was stopped tonight; stop it again with
  `docker stop $(docker ps -q --filter name=_audit-worktree)`.
- **Practice or Pro student sent to `/billing`:** the pricing migration hasn't landed yet
  (see above).
