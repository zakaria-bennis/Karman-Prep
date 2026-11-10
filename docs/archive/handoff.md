# Project handoff — context for new contributors

Read this once to understand **what Karman Prep is**, **where it's at**, and **why it's built the way it is**. For "how do I run this," see [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## What this is

**Karman Prep** is a pre-launch SAT prep platform — adaptive practice + live tutoring — targeting **November 2026 launch**.

- **Public site**: [karmanprep.com](https://karmanprep.com)
- **Founder + CEO**: Zakaria Bennis ([@zakaria-bennis](https://github.com/zakaria-bennis))
- **Stage**: code is live, no paying users yet, pricing is locked
- **Differentiator**: "give every student access to elite SAT prep that was once reserved for the few" — the founder's pitch

## Who uses it

Four roles, each with their own dashboard area:

| Role | What they do |
|---|---|
| **Student** | Take a diagnostic, follow an adaptive learning path, attend live sessions, track score progression toward their SAT goal date |
| **Parent** | Pay the bill, see their student's progress, get session recap emails |
| **Tutor** | Run live 1:1 / small-group / seminar sessions, send recap emails, get paid |
| **Admin** | Internal — curriculum, question bank, user mgmt, revenue, payouts oversight |

## Pricing tiers (locked)

Per the founder's product memo:

| Tier | Format | Price |
|---|---|---|
| **Group** (Seminar) | Up to 250 students per session | low monthly |
| **Small Group** | Up to 5 students per session | mid monthly |
| **Private** | 1:1 | higher monthly |
| **Elite** | 1:1 with extras | premium monthly |

No annual plan. Specific dollar amounts are in Stripe price IDs; see `STRIPE_PRICE_*` env vars.

## Status snapshot

### What's shipped

- ✅ Marketing site + auth (Clerk) + onboarding flow
- ✅ Adaptive diagnostic + per-concept practice (Learn portal)
- ✅ Curriculum tree (89 concept slugs, 8 SAT domains)
- ✅ Bulk question importer with auto-flagging for visual review
- ✅ Tutor portal: roster, cohorts, schedule, student deep-dive (4 tabs)
- ✅ Recap-email pipeline: Fireflies → OpenAI → Resend (per ADR 0001)
- ✅ Stripe Connect tutor payouts (Instant + ACH; per ADR 0002)
- ✅ Admin tools: revenue, jobs queue, question review/preview/import

### What's deferred (intentionally)

- ⏸️ Slack chat for cohorts — single-bot model designed but build paused (per project memory)
- ⏸️ Tutor-side messaging
- ⏸️ Full booking flow (Stripe-auto-places integration with Cal.com)
- ⏸️ Staging environment ($25/mo Supabase Pro; defer until paying users exist)

### Active rough edges

- ~70 ESLint warnings deferred from Phase A (unused vars + unescaped JSX entities) — Phase B retighten planned
- 5 monster files (1000+ lines): `data/curriculum.ts`, `QuestionEditor.tsx`, `QuizEngine.tsx`, `DiagnosticClient.tsx`, `ReviewClient.tsx` — refactor sprint planned
- No staging environment yet (every deploy goes to prod)
- Branch protection not enforced (GitHub Free limitation; plan to upgrade to Pro at $4/mo)

## Why things are the way they are

Major architectural decisions are documented as ADRs:

- [ADR 0001](./adr/0001-per-session-tutor-pay.md) — Per-session pay model (not per-seat)
- [ADR 0002](./adr/0002-stripe-connect-express.md) — Stripe Connect Express (not Standard or Custom)
- [ADR 0003](./adr/0003-chatgpt-custom-gpt-imports.md) — ChatGPT Custom GPT for question imports

Other "why" docs:

- [`docs/architecture.md`](./architecture.md) — system map + key data flows
- [`docs/deployment-cloudflare.md`](./deployment-cloudflare.md) — how the app ships
- [`docs/recaps-payouts/phase-0-audit.md`](./recaps-payouts/phase-0-audit.md) — full audit + decisions for the recap+payout system
- [`docs/ingestion/`](./ingestion/) — SAT question pipeline (legacy daemon docs; current flow per ADR 0003)

## How to start contributing

1. Read [`CONTRIBUTING.md`](../CONTRIBUTING.md) — local setup, branching, PR conventions, gotchas
2. Read [`docs/architecture.md`](./architecture.md) — system map
3. Pick an issue from the [issue tracker](https://github.com/zakaria-bennis/Karman-Prep/issues) labeled `good-first-issue` (or ask the founder for a starter task)
4. Open a PR following the [PR template](../.github/pull_request_template.md)

Welcome.
