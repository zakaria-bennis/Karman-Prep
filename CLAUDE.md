# Karman Prep: agent instructions

Karman is a pre-launch SAT prep company run by a solo, non-technical founder,
Zakaria Bennis. Write updates for him in plain language. The site is live at
karmanprep.com on Cloudflare Workers, with no paying users yet.

**Current direction:** sell programs that end on a specific SAT date (a small
live cohort, private 1:1 packages on top, free entry points) instead of hours or
monthly plans. The plan is in `docs/business-plan.md`, and every price, date and
claim the site may state is in `src/lib/marketing/offer.ts`. Values marked
`CONFIRM:` there need the founder before launch.

## Branches

- Start new work from `main`. It carries the live release line (merged 2026-10).
- Branch names: `zakaria/<short-kebab>` (founder), `claude/*` and `codex/*` (agents).
- `wrangler.toml` defines one Worker for karmanprep.com, so the last deploy wins.
  Coordinate deploys between parallel sessions.

## Active workstreams

- **Website.** Being rebuilt around the program offer. Design rules are in
  `docs/design-rules.md` (founder's 31 rules, 2026-10-18). The espresso-and-gold
  look is retired, and `docs/design-tokens.md` and the palette in `docs/brand.md`
  no longer apply. The voice section of `docs/brand.md` still does. Every button,
  link and redirect must work, and be clicked through in a browser before it ships.
- **Question import.** Continue the founder's existing Codex pipeline, do not
  replace it. Goals: about 10,000 questions, difficulty 1 to 7, skill tags, no
  duplicates. Import sessions must read `docs/ingestion/reviewed-import-rules.md`.
  Other sessions can skip it. Detail docs are in `docs/ingestion/`.
- **Calculator.** One calculator: engine in `src/lib/calculator/`, quiz window and
  UI in `src/components/calculator/`, browser tests in `tests/calculator/`. The
  living spec is `docs/superpowers/specs/2026-10-16-calculator-design.md` plus
  `docs/superpowers/specs/calculator/`; the active plan is
  `docs/superpowers/plans/2026-10-19-calculator-phase2-desmos/`. The founder is
  reviewing it, so do not change the calculator without being asked.

## Must-follow rules

### Replace, don't accumulate

- Replace, don't accumulate: when a feature is replaced or reworked, delete the old
  version everywhere (code, tests, docs, flags, version-suffixed names) in the same
  change.

### Release and deploy

- Public release: `npm run cf:build:release && npm run cf:deploy`. `cf:deploy` only
  uploads `.open-next/` and never rebuilds, so always run both together.
- Release builds need the production `NEXT_PUBLIC_*` values, including
  `NEXT_PUBLIC_KARMAN_LAUNCHED=true`. `scripts/build/check-release-env.mjs` rejects
  missing values, placeholders, maintenance mode and mismatched Supabase keys.
  Check the built Worker and keep the previous version for rollback.
- Merging to `main` runs `db-deploy.yml`, which applies new migrations to production.

### Code gates

- Before review, run `npx tsc --noEmit`, `npm run lint`, `npm run format:check`,
  `npm test`, `npm run check:sizes` and `npm run cf:build`. Run `npm run sync:taxonomy`
  and check that `git diff` shows no change. For calculator changes also run
  `npm run test:calculator`.
- `@typescript-eslint/no-unused-vars` and `react/no-unescaped-entities` are errors.
- No file over about 700 lines. Server actions validate inputs with Zod.
- Dev server: `npm run dev:next`. Dev-only sign-in bypass: set `DEV_IMPERSONATE_CLERK_ID`
  in `.env.local` (`src/lib/auth/dev-auth.ts`), then `npm run seed:dev`.

### Database

- Migrations go in `supabase/migrations/<YYYYMMDDHHMMSS>_name.sql`. Apply with
  `npm run db:push`, check with `npm run db:status`.
- Live question writes need the founder's go-ahead for each batch. Check the
  before-state, read each write back, and keep a rollback.

### Question import (short version)

- Paid AI extraction, grading, figure interpretation and orchestration are retired.
  Do not restore them without a new founder decision.
- Publication stays held until the founder approves it.
- Never label generated answers as printed or official keys. Never alter approved
  source bytes.

### Calculator

- Never load a Desmos API, SDK or component. Never copy Desmos code, DOM, asset
  files, fonts, logo or name, and never fetch anything from desmos.com. Matching
  Desmos's visual design and behaviour with our own drawings and code is allowed
  (founder, 2026-10-18). Locally bundled MathQuill and KaTeX are fine (mathjs only
  in the reference-value script).
- After editing calculator styles or theme sources, run `npm run calculator:build`
  (`npm run calculator:check` must pass). Run `npm run test:calculator`. Automated
  mobile, keyboard and theme checks are required.

### Marketing honesty

- No testimonials until real ones exist. Label tutoring stats as Zakaria's private
  results. Give score estimates only as labeled ranges. No fake urgency.
