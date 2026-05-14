# Karman Prep — Replit Agent quick-start

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
4. [`docs/adr/`](./docs/adr/) — why core decisions exist.

## Running this on Replit

- Click **Run** — wired to `npm run dev:next` via `.replit`.
- Node 22 is pinned (see `.nvmrc`). Replit's Nix toolchain handles it.
- Secrets: copy `.env.example` → set the same keys in Replit's **Secrets**
  panel. `OPENAI_API_KEY`, `SUPABASE_*`, `CLERK_*`, `STRIPE_*`, `RESEND_*`
  are the load-bearing ones.

## Repo defaults you must respect

- Default branch `main`. Feature branches `zakaria/<short-kebab-description>`.
- Lint rules are at **error** (no unused vars, no naked apostrophes in JSX).
- 5 CI checks required before merge: TypeScript, ESLint, Prettier, Vitest,
  Cloudflare build.
- Migrations live in `supabase/migrations/<YYYYMMDDHHMMSS>_name.sql`. CI
  applies them on `main` merges; locally use `npm run db:push`.
- Deploy target is Cloudflare Workers (not Replit Deployments) — production
  is at karmanprep.com. Replit is a dev environment only.
- No file should exceed ~700 lines.
