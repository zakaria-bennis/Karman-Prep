# Karman Prep — Gemini quick-start

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
