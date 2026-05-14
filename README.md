# Karman Prep

A subscription-based SAT tutoring platform — adaptive practice + live tutoring, built with Next.js 16 on Cloudflare Workers, backed by Supabase + Clerk + Stripe.

Public site: **[karmanprep.com](https://karmanprep.com)** · Launch: November 2026

---

## Quick start

```bash
# Local dev (Next.js + Stripe webhook listener)
npm run dev

# Cloudflare build / preview / deploy
npm run cf:build
npm run cf:preview
npm run cf:deploy
```

Env vars live in `.env.local` (gitignored). Mirror to Cloudflare via `npx wrangler secret put …`.

## Where things live

| Path                                                 | What                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| **[`src/`](./src/)**                                 | Application code — Next.js routes, components, lib helpers, types   |
| **[`supabase/migrations/`](./supabase/migrations/)** | Every SQL migration applied to the database, in numbered order      |
| **[`scripts/`](./scripts/)**                         | Admin / maintenance / seed scripts (run from CLI)                   |
| **[`question-imports/`](./question-imports/)**       | SAT question-extraction pipeline (Python + ChatGPT knowledge files) |
| **[`docs/`](./docs/)**                               | Everything else — see the [docs index](./docs/README.md)            |

## Tech stack

- **Framework**: Next.js 16 (App Router, TypeScript, Server Components)
- **Hosting**: Cloudflare Workers via [OpenNext](https://opennext.js.org)
- **Auth**: Clerk (student / tutor / parent / admin roles)
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **Payments**: Stripe (subscriptions + Connect for tutor payouts)
- **Email**: Resend (transactional templates via React Email)
- **Storage**: Cloudflare R2 (question images, PDF uploads)
- **Styling**: Tailwind CSS

## Documentation

Full docs in **[`docs/README.md`](./docs/README.md)**. Highlights:

- [Deployment — Cloudflare](./docs/deployment-cloudflare.md)
- [Handoff](./docs/handoff.md) — context for new contributors
- [Ingestion routine](./docs/ingestion/routine.md) — how SAT questions get into the bank
- [Recaps & payouts audit](./docs/recaps-payouts/phase-0-audit.md) — recap-email + tutor-payout system design
