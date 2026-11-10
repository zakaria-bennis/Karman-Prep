# Karman Prep: agent instructions

Karman is a pre-launch SAT prep company run by a solo, non-technical founder,
Zakaria Bennis. Write updates for him in plain language. The site is live at
karmanprep.com on Cloudflare Workers, with no paying users yet.

**What Karman sells (founder, 2026-11-08):** a ladder of plans, never tied to
"ends on your SAT date" (that positioning is retired):

- Free ($0: 100 questions in total, plus one free full-length test)
- Practice ($39 a month or $89 for 3 months: the core pool, written explanations)
- Pro ($69 a month or $149 for 3 months: every question incl. mastery, video explanations)
- 9-week Cohort ($995: at most 6 students, 18 x 60-minute classes, score bands, no 1:1s)
- Private 10 ($1,495) and Private 20 ($2,495)
- Schools ($8 per student a year, first year free; each student their own Practice)
- Tutor affiliate ($199 a month: up to 50 students on one code get Practice)

Only the Cohort and both Private packages carry the guarantee, tiered by starting
score (founder, 2026-11-09; `GUARANTEE_TIERS` in `offer.ts`). Families join a call
with the company before any cohort seat. The entry point is **Start free**: sign
up and go straight into the free student portal.

- Each plan's price and features: `docs/business/plan-ladder-2026-11-08.md`.
- The reasoning behind them: `docs/business-plan.md`.
- Every price, date and claim the site may state: `src/lib/marketing/offer.ts`;
  values marked `CONFIRM:` there need the founder before launch.
- Server-side access per plan: `src/lib/plans/` (read its README).

## Branches

- Start new work from `main`. It carries the live release line (merged 2026-10).
- Branch names: `zakaria/<short-kebab>` (founder), `claude/*` and `codex/*` (agents).
- `wrangler.toml` defines one Worker for karmanprep.com, so the last deploy wins.
  Coordinate deploys between parallel sessions.

## Active workstreams

- **Website.** Being rebuilt in the student portal's painted look (founder,
  2026-11-09). His current direction is in `PRODUCT.md` under Brand Commitments,
  and it wins. `docs/design-rules.md` is steering, not law. `docs/design-tokens.md`,
  the palette and the voice section of `docs/brand.md` no longer apply. Every
  button, link and redirect must work, and be clicked through in a browser before
  it ships. Where the home page stands: `prototypes/HANDOVER-home-2026-11-09.md`.
  - Load the `impeccable` skill before any design work.
  - One section at a time: perfect it before the next, even when he sends a long
    list. Show two or three clearly different mockups before building a section,
    and ask with a picture when a phrase of his is unclear.
  - Watch every animation before showing it (`scripts/dev/motion-sheet.mjs`), and
    look at full-size screenshots in light and dark.
  - No AI-generated images on the site. Draw in code, or use a real photo or logo
    he supplies. Never restyle an old component and call it new.
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
