# Report: local-db session

Branch: `claude/overnight-local-db-ea5f69`. Nothing pushed, nothing deployed, production
never written to.

## What is done

1. **A safe local database.** A local Supabase (project `karman-local`) runs in Docker on
   the standard ports (API 54321, database 54322). It runs only what the app needs:
   Postgres, the API, the gateway, and the small auth and storage services the migrations
   depend on. It uses about 520 MB of memory.
2. **The schema.** All 72 migrations applied cleanly, so `supabase/schema.sql` wasn't
   needed. Sessions have since added 8 of their own with the helper script.
3. **The questions.** Copied from production read-only (GET requests only): 11,413
   questions, 40,500 answer choices, 10,760 answer-key rows and 1,100 figures, as of
   08:07. A local copy sits at `/Users/zakariabennis/Karman-Prep-wt/question-bank.dump`
   (20 MB), so a reset never touches production. No users, payments, messages or notes
   were copied.
4. **Test accounts for every role**, with history: Free, Practice, Pro, Cohort and Private
   students; a parent (Rachel, Maya's mother); David the tutor (a cohort of 4 with 18
   sessions and homework, plus Maya's 10 private sessions); Priya, an affiliate tutor with
   code `PRYA-K7M2` and three students; Thomas, a teacher with a class of four; an admin.
   Every student has diagnostics, lesson progress and quiz attempts answered on real
   questions. The full list and how to switch are in `docs/overnight/local-db.md`.
5. **The env file** `/Users/zakariabennis/Karman-Prep-wt/overnight.env.local` (private to
   this Mac user) was ready at 04:41. It points at the local database and switches off
   email, Slack, Cal.com, Zoom, Fireflies, Sentry and R2 uploads. Stripe and Clerk stay on
   their test setups.
6. **The guide** for every session: `docs/overnight/local-db.md`.
7. **The reset script** `scripts/overnight/reset-local-db.sh <worktree>` rebuilds
   everything from that worktree's migrations, the local question copy and the seed.
   Tested twice at 04:43 and 04:46 (the second run after a fix): 37 seconds to 3 minutes.
8. **The refresh script** `scripts/overnight/refresh-questions.sh` (asked for at 08:05)
   copies the four question tables from production, read-only, and touches nothing else.
   Ran it at 08:07: 17 new questions came in, and accounts and history stayed as they were.

## How I checked it

- Ran the app against the local database on port 3113 and loaded each role's pages with
  plain web requests (not the app's browser pane, which froze the app last night):
  - home page: loads
  - Cohort student dashboard: loads with her lessons and saved answers
  - Private student dashboard: loads
  - Daily 10: loads
  - parent page: shows Maya
  - David's tutor page: shows Maya, Sofia and the cohort
  - teacher's page: shows his four students
  - admin users page: lists the accounts
- Switching roles works by changing one line in `.env.local`. The dev server picks up the
  change by itself.
- Counted rows before and after every copy and the refresh. The refresh left the 29
  accounts and the 97 quiz attempts untouched.
- Formatting checked with Prettier on every file I added. My change is scripts, a
  settings file and documents only, so I didn't run the app's type check, lint or test
  suite.

## What is not done

- **Practice, Pro and Free students reach `/billing`, not the dashboard,** until the
  pricing branch lands. Today's code only knows the old plan names. The seed gives
  Practice and Pro their plans automatically once the pricing migration is in.
- **Cohort and Private plans after the pricing merge** come from the pricing session's
  seed file (`supabase/seeds/overnight/pricing.sql`). It isn't written yet.
- **Thomas's school and class** use a stand-in (a cohort). The school tables now exist,
  and the parent-school session should seed them.
- **Priya's students** don't show on today's tutor page. They show on the tutor-affiliate
  pages once that branch is merged.
- **Not seeded:** tutor-assigned homework in the new catalog format, and the AI homework
  notes signed by David.
- **The quiz review page** (`/dashboard/student/quizzes/…`) never finished loading in
  8 minutes while the machine was at full load. I couldn't check it.
- **One open mismatch in the shared database:** `subscriptions` has two of the pricing
  columns but not the third, and no migration record. Someone applied part of the pricing
  change by hand. A reset from the merged branch after the pricing merge fixes it.

## Decisions I made

- **Two extra services stay on.** The auth and storage services run although the brief
  said to leave them out, because the migrations need them (`auth.jwt()` and storage
  buckets). Both are small.
- **Migrations go in through plain `psql`.** The Supabase command-line tool stopped on one
  migration that `psql` applies without trouble.
- **Two image-generation keys are switched off too** (`FAL_KEY` and
  `OPENAI_IMAGES_API_KEY`), so nothing can spend on images tonight.
- **The site address in the env file is `http://localhost:3000`, not karmanprep.com.** A
  test payment's "back to the site" link then never lands on the live site. Each session
  sets its own port.
- **Fake questions removed.** `seed-dev.mjs` adds four "DEV FIXTURE" questions for its
  automated tests, and I delete them so nobody meets a fake question.
- **Production differs from the migrations in two places.** It has a `comparison_key`
  column the migrations didn't have (another branch adds it). It also allows blank SAT
  registration deadlines. The copy skips what the local schema can't hold and invents
  nothing. SAT dates now come from the seed.
- **I stopped an old local Supabase stack** (`audit-worktree`, from October). Docker had
  restarted it on its own and it held the default ports. I only stopped it; its data is
  kept.
- **The env file waited for the database.** I held it back until the schema, questions
  and accounts were in, so no session ran the app against an empty database.
- **Dev server:** the app's normal dev command (Turbopack) fails on this branch with a
  Google Fonts error. The guide says to use `npx next dev --webpack`.

## For the founder

- Nothing to decide tonight. The local database is a test copy only, and production was
  only ever read.
- One heads-up: while running, the local database is reachable from other devices on the
  same Wi-Fi network (Supabase's default). It holds the question bank and fake accounts
  only.
