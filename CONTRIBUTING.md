# Contributing to Karman Prep

First: **read this file end-to-end before your first PR.** It saves a Slack thread.

## Table of contents

- [Local setup](#local-setup) (~15 min first time)
- [Day-to-day commands](#day-to-day-commands)
- [Branching & PRs](#branching--prs)
- [Code style](#code-style)
- [Architecture quick map](#architecture-quick-map)
- [Common gotchas](#common-gotchas)
- [Deploy flow](#deploy-flow)
- [Where to ask for help](#where-to-ask-for-help)

---

## Local setup

### Prerequisites

- **Node**: version pinned in `.nvmrc` (use `nvm install` then `nvm use`)
- **npm**: comes with Node
- **Stripe CLI**: `brew install stripe/stripe-cli/stripe` (for webhook forwarding in `npm run dev`)
- **Wrangler**: installed automatically with the project (`npx wrangler` works after `npm install`)

### Steps

```bash
# 1. Clone + install
git clone <repo-url>
cd karmanprep
npm install

# 2. Get env vars
cp .env.example .env.local
# Fill in real values — see https://www.notion.so/karmanprep/dev-secrets (or DM Zakaria).

# 3. Run dev server
npm run dev
```

`npm run dev` starts:

- Next.js dev server on http://localhost:3000
- `stripe listen` forwarding webhooks to `localhost:3000/api/stripe/webhook`

If you only need Next.js (no Stripe webhooks), use `npm run dev:next`.

### One-time admin promotion

Your default role after signing up at `localhost:3000/auth/sign-up` is `student`. To get into `/admin/*`:

```bash
node --env-file=.env.local scripts/admin/grant-admin.mjs you@example.com
```

---

## Day-to-day commands

| Command              | What it does                                                 |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`        | Next.js + Stripe webhook listener                            |
| `npm run dev:next`   | Just Next.js                                                 |
| `npm run lint`       | ESLint check                                                 |
| `npx tsc --noEmit`   | TypeScript check (no emit)                                   |
| `npm run cf:build`   | Build for Cloudflare Workers via OpenNext                    |
| `npm run cf:preview` | Run the built worker locally                                 |
| `npm run cf:deploy`  | Push to production at karmanprep.com                         |
| `npm run pdf:pull`   | One-shot poll of the (mostly deprecated) PDF ingestion queue |

Maintenance + admin scripts live in [`scripts/`](./scripts/) — see [scripts/README.md](./scripts/README.md) for a full inventory + when-to-use guide.

---

## Branching & PRs

### Branch naming

```
<your-handle>/<short-kebab-description>

Examples:
  zakaria/payouts-redesign
  jane/fix-stripe-webhook-retry
  sam/seminar-cohort-cap-tweak
```

### PR workflow

1. **Branch off `main`** (see warning below — never push to `main` directly)
2. **Make your changes**, push to your branch
3. **Open a PR** using the [PR template](.github/pull_request_template.md). Fill in Summary, Test plan, Rollback.
4. **Wait for CI to go green** (typecheck, lint, build)
5. **Get one approval** from a CODEOWNER
6. **Squash-merge** (default; keeps `main` history linear)

> ⚠️ **`main` is not yet protected by GitHub.** We're on the GitHub Free plan, which doesn't enforce branch protection on private repos. **The honor system is in effect**: never `git push origin main` directly, never merge your own PR without an approval (unless it's a hotfix and you Slack the team), and never force-push. We'll upgrade to GitHub Pro ($4/mo) and add real protection as the team grows.

### Commit messages

No strict convention, but follow the lead from existing commits — short imperative subject, why-not-what body if non-obvious. Example:

```
Fix Stripe Connect HTTP client compat with CF Workers

The Stripe SDK's default Node HTTP client uses `https.Agent` which
unenv refuses to polyfill. Switching to createFetchHttpClient() —
matches the existing pattern in lib/integrations/stripe/client.ts.
```

---

## Code style

### Enforced automatically

- **Prettier** runs on save (configure your editor) + on commit (Husky + lint-staged).
- **ESLint** runs in CI on every PR. Config lives in [`eslint.config.mjs`](./eslint.config.mjs) (flat config, ESLint 9). Two project rules are hard errors (`react/no-unescaped-entities`, `@typescript-eslint/no-unused-vars` with `^_` escapes); four `react-hooks` v7 rules (`set-state-in-effect`, `purity`, `immutability`, `refs`) are currently OFF — re-enabling them is queued lint debt and needs per-rule refactor PRs.
- **TypeScript strict mode** is on. Use `as` casts sparingly; prefer real types.

### Conventions

- **File names**: kebab-case for multi-word (`compute-amount.ts`). Components keep PascalCase (`PayoutsClient.tsx`).
- **Imports**: use the `@/` alias for anything in `src/` (`import { foo } from "@/lib/utils"`)
- **Server actions**: `"use server"` at top of file. Auth check first thing.
- **API routes**: validate request body with **Zod**. Reference pattern: [`src/app/api/diagnostic/submit/route.ts`](./src/app/api/diagnostic/submit/route.ts) — define a Zod schema as the source of truth, `.safeParse()` the body, return `400` with structured `issues` on invalid input. Never trust `req.json()` blindly.
- **Database queries**: live in `src/lib/supabase/queries/<area>.ts`, not inline in pages or components.
- **No magic strings**: enums or `as const` arrays for things like plan tiers (`"private" | "elite" | "small_group" | "group"`).

### Typing Supabase rows

Row types are **generated from the live DB schema** into [`src/types/supabase.ts`](./src/types/supabase.ts). The Supabase clients in [`src/lib/supabase/server.ts`](./src/lib/supabase/server.ts) and [`src/lib/supabase/client.ts`](./src/lib/supabase/client.ts) are parameterized with the `Database` type, so `.from("table").select(...)` infers the row shape automatically.

**To regenerate after a migration:**

```bash
npm run db:types
```

This runs `supabase gen types typescript --project-id ...` and writes to `src/types/supabase.ts`. Commit the diff alongside your migration so CI typechecks against the new schema.

**Gotchas:**

- `jsonb` columns are typed as the opaque `Json` union. When writing a narrow shape (e.g. `StatusDraft`, `DomainScores`) into a jsonb column, cast at the boundary: `domain_scores: result.domainScores as unknown as Json`. When reading back, the inverse: `data.domain_scores as unknown as DomainScores`. Future work: validate jsonb shapes with Zod at read time so the cast is real.
- `text` columns with constrained values (`role`, `tier`, `status`, `payout_status`) are typed as `string` — the DB doesn't have CHECK constraints or enums to back the narrower TS union. Cast or narrow at the call site: `data.role as AppRole`.
- FK-joined relations (`tutor:users!fk(...)`) come back as `object | array` depending on Supabase's inference. Existing files use a `Raw` pattern + `Array.isArray()` guard; that pattern is being phased out as we adopt typed selects everywhere.

---

## Architecture quick map

| Concern                                            | Lives in                                            |
| -------------------------------------------------- | --------------------------------------------------- |
| Pages + API routes                                 | `src/app/` (Next.js App Router)                     |
| React UI components                                | `src/components/`                                   |
| Third-party SDK wrappers (Stripe, Cal, Zoom, etc.) | `src/lib/integrations/`                             |
| Database queries + Supabase client                 | `src/lib/supabase/`                                 |
| Pure business logic (payouts, taxonomy, etc.)      | `src/lib/<domain>/`                                 |
| Email templates (React Email)                      | `src/emails/`                                       |
| Curriculum data                                    | `src/data/curriculum.ts`                            |
| SQL schema migrations                              | `supabase/migrations/` (numbered, applied in order) |
| CLI scripts                                        | `scripts/` (categorized by concern)                 |
| Docs                                               | `docs/` (start with `docs/README.md`)               |

### Key flows

- **Auth**: Clerk → middleware sees Clerk session → server actions look up `users.role` from Supabase via `clerk_id`.
- **Quiz**: `quiz_questions` (per-question) → `quiz_attempts` (per quiz) → `question_responses` (per answer).
- **Recap → payout**: Fireflies webhook → `bookings` → OpenAI draft → tutor reviews + sends → `sessions` row marked `payout_status='pending'` → tutor self-serves payout via Stripe Connect.

---

## Common gotchas

### Cloudflare Workers vs Node

- The Stripe SDK's default Node HTTP client **does not work on Workers**. Always pass `httpClient: Stripe.createFetchHttpClient()` when instantiating.
- The AWS S3 SDK uses `fs.readFile` which **also fails on Workers**. Our R2 wrapper at `src/lib/storage/r2.ts` falls back to the Cloudflare R2 binding when in a worker context — use that, not the S3 SDK directly.
- Deferred unenv polyfills: don't import `node:fs/promises`, `node:crypto.subtle` directly. Check `lib/storage/r2.ts` for the working pattern.

### RLS is OFF

- We deliberately don't use Supabase Row-Level Security. Auth is enforced at the **server action / API route level** via `requireRole()` from `@/lib/supabase/queries/admin`. Never expose service-role-key queries directly to the client.

### Production logs are masked

- "An error occurred in the Server Components render" in production = Next.js hides the real error. Run `npx wrangler tail --format=pretty` against the live deployment to see the actual stack trace.

### Migrations run via `supabase db push`

Migration files live in `supabase/migrations/` named `<YYYYMMDDHHMMSS>_description.sql` (UTC). The Supabase CLI applies them in timestamp order and tracks state in the remote `supabase_migrations.schema_migrations` table.

**Authoring a new migration:**

1. Generate a fresh timestamp + create the file:

   ```bash
   echo "supabase/migrations/$(date -u +%Y%m%d%H%M%S)_add_thing.sql"
   ```

2. Write your SQL in the new file. Use `IF NOT EXISTS` / `IF EXISTS` so re-runs are no-ops.
3. **Locally**: `npm run db:status` shows local vs remote drift. `npm run db:push` applies any pending migrations to the linked project. Always dry-run first if you're unsure:

   ```bash
   npx supabase db push --dry-run
   ```

4. After the migration applies, regenerate types: `npm run db:types`, commit `src/types/supabase.ts` alongside the migration.
5. PR + merge. CI will also run `supabase db push` on `main` merges — see `.github/workflows/db-deploy.yml`.

**Hotfix / emergency:** the legacy paste-into-SQL-Editor flow still works as a last resort. If you do, follow up by marking the migration as already-applied so the runner doesn't try to re-apply it:

```bash
npx supabase migration repair --status applied <timestamp>
```

**First-time setup** (one-time, per laptop):

```bash
npx supabase login                                     # browser OAuth
npx supabase link --project-ref yyocjxvrakuhnvepaevh   # paste DB password
```

---

## Deploy flow

```bash
npm run cf:deploy
```

That's it. There's no staging environment yet — every deploy goes to production at https://karmanprep.com.

**Before deploying:**

1. CI is green
2. PR is reviewed and merged to `main`
3. Run `npm run cf:build` locally first to catch any build-time issues

**After deploying:**

- Smoke-test the affected feature
- If something breaks, deploy the previous commit (no automated rollback yet — `git revert` + redeploy)

---

## Where to ask for help

| Question                      | Where                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| "How do I X locally?"         | This file → if not here, ask in `#engineering`                                     |
| "Why does the codebase do Y?" | `docs/adr/` (Architecture Decision Records) — coming soon                          |
| "What's broken in prod?"      | Sentry → `#alerts`                                                                 |
| "Who owns this code?"         | [.github/CODEOWNERS](.github/CODEOWNERS)                                           |
| "Is this feature shipped?"    | [docs/reference/webpages-inventory.docx](./docs/reference/webpages-inventory.docx) |
| Stuck for >30 min             | Ask in Slack — don't burn a half-day                                               |

Welcome aboard.
