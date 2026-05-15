# Karman Prep — Claude Code quick-start

Pre-launch SAT prep platform. Adaptive practice + live tutoring. Live deploy
target Nov 2026. Code is in prod (Cloudflare Workers via OpenNext), no
paying users yet.

## Read these first (5 min)

1. [`CONTRIBUTING.md`](./CONTRIBUTING.md) — branch model, dev commands,
   lint/test/format gates, gotchas.
2. [`docs/handoff.md`](./docs/handoff.md) — what this product is, who uses
   it, current status.
3. [`docs/architecture.md`](./docs/architecture.md) — system map +
   Mermaid diagram of the data flows.
4. [`docs/adr/`](./docs/adr/) — why core decisions exist (per-session pay,
   Stripe Connect Express, ChatGPT-based imports).

## Repo defaults you must respect

- Default branch `main`. Feature branches `zakaria/<short-kebab-description>`.
- Lint rules `@typescript-eslint/no-unused-vars` and `react/no-unescaped-entities`
  are **error**, not warn — CI fails on either.
- 5 required CI checks: TypeScript, ESLint, Prettier, Vitest, Cloudflare build.
- Migrations: `supabase/migrations/<YYYYMMDDHHMMSS>_name.sql`, applied via
  `npm run db:push` or on `main` merges via `.github/workflows/db-deploy.yml`.
- Dev server: `npm run dev:next`. Deploy: `npm run cf:deploy` (Cloudflare, not
  Vercel).
- No file should exceed ~700 lines — split by concern instead.
- Server actions validate inputs with Zod schemas; add a schema when adding
  an action.

## Dev-only auth bypass (for visual smoke tests)

Clerk's sign-in flow can't be driven from automation. To view authenticated
pages locally without typing real credentials, set `DEV_IMPERSONATE_CLERK_ID`
in `.env.local` to any real Clerk id from the `users` table, then restart
`npm run dev:next`. Every page renders as that user — middleware skips
`auth.protect()` and `safeAuth()` returns the synthetic id.

The bypass is hard-gated on `NODE_ENV !== "production"`; it cannot fire on
the deployed Cloudflare Worker. Unset / clear the var to go back to real
Clerk auth. See `src/lib/auth/dev-auth.ts`.

### Dev fixtures: `npm run seed:dev`

Pairs with the auth bypass. Upserts a known set of users (admin, fresh /
mid / stuck student, tutor, parent linked to mid) into Supabase. Idempotent
— re-running merges on `clerk_id`, never wipes anything outside the
`dev_seed_*` prefix.

```
npm run seed:dev                                 # one-time setup
echo 'DEV_IMPERSONATE_CLERK_ID=dev_seed_student_mid' >> .env.local
npm run dev:next                                 # view mid-student dashboard
```

To clean up: `delete from users where clerk_id like 'dev_seed_%';` (cascades).
See `scripts/seed-dev.mjs` for the full fixture list + what state each
persona exercises.

### Playwright end-to-end tests

`npm run test:e2e` — drives the full browser through multi-step user flows.
Built on top of the dev bypass + seed fixtures: the suite auto-starts the
dev server with `DEV_IMPERSONATE_CLERK_ID=dev_seed_admin` and runs
`npm run seed:dev` in global setup, so tests can immediately exercise
admin-only flows like impersonation. CI isn't wired up yet — that needs
a Supabase fixture project reachable from GitHub Actions; tracked as
follow-up.

Tests live in `tests/e2e/`. Add a new spec there when adding a flow worth
protecting end-to-end (UI clicks, navigation, banner state). For pure-logic
checks, keep using Vitest.
