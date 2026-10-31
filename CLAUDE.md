# Karman Prep

Karman is a pre-launch SAT prep company run by one founder, Zakaria Bennis. He
isn't technical. Write to him in plain language, in short sentences. He often
dictates by voice, so if a number or phrase reads oddly, ask before building
on it. The site is live at karmanprep.com, with no paying users yet.

## What Karman sells

Karman sells a ladder of plans:

- Free
- Platform ($29 a month)
- Plus ($49 a month)
- A small live cohort that ends on an SAT date
- Private 1:1
- School licenses at $10 per student a year

Only the cohort and Private carry the guarantee.

- Each plan's price and features: `docs/business/plan-ladder-2026-10-30.md`.
- The reasoning behind them: `docs/business-plan.md`.
- Every price, date and claim the site shows: `src/lib/marketing/offer.ts`.
  Values marked `CONFIRM:` need the founder.

## Where to work

- **Branch.** Start from `claude/site-redesign` until it merges into `main`,
  because `main` is behind it. Name branches `claude/<short-name>`.
- **The website.** The reference design is `.impeccable/mocks/decision/film/`,
  and its copy is in `copy.js`. The live site came from PR #232.
- **The portals.** The brief is `docs/prompts/2026-10-30-fable-portals.md`.
  Prototypes the founder has reviewed live in `prototypes/`.
- **Dev server.** Run `npm run dev:next`. To sign in locally, set
  `DEV_IMPERSONATE_CLERK_ID` in `.env.local`, then run `npm run seed:dev`.

## Design

- **The founder leads design.** Propose freely, but show ideas as working
  screens, and nothing visual is final until he approves it.
- **The rules are in `docs/design-rules.md`.** They win over everything else
  here. How pages should move and behave is in
  `docs/design/site-design-principles.md`.
- **Build components from 21st.dev first.** Port them to the project, recolour
  them with Karman's tokens, and credit the component id in a comment.
  Everything else (icons, drawings, loaders, illustrations) is custom-made for
  Karman.
- **Photos and film are generated** through `scripts/generate-assets.mjs`
  (`docs/design/generation-models.md`). The founder approves every shot before
  money is spent.
- **Website copy is written with the conversion-copywriter skill** and lives in
  the mock's `copy.js`, which the founder edits himself.
- **Every screen works on phone, iPad and desktop**, with no sideways scroll.
- **Light and dark mode follow the visitor's device**, with dark when it states
  no preference (rule 33).
- **Click every button and link in a browser** before calling a page done.
- **Replace, don't accumulate.** When something is replaced, delete the old
  version everywhere in the same change: code, tests, docs and names.

## Checks before review

Run all of these:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run format:check`
- `npm test`
- `npm run check:sizes`
- `npm run cf:build`

Unused variables and unescaped JSX characters are lint errors. Keep files
under about 700 lines. Server actions validate their inputs with Zod.

## Never without the founder

- **Deploying.** The live site was built from `claude/musing-kare-59cd6e`
  (PR #232), which holds the redesign. A deploy built from `main` would take
  the redesign off the site, so never deploy from `main`. The deploy command
  is `npm run cf:build:release && npm run cf:deploy`, always both together.
- **Merging to `main`.** It applies database migrations to production.
- **Writing to the live question bank.** Import sessions follow their own
  standing rules for this.
- **Changing the calculator.** Don't edit `src/components/calculator/`,
  `src/lib/calculator/` or the `/calculator` page unless asked.
- **Printing or committing a secret.**

## Questions and figures

Questions are imported by their own sessions on their own branch. Design
sessions never edit the import tools, the pipeline or live questions.

Question figures are being redrawn by one in-house engine in the Bluebook
look, taking colours only from the theme's roles. Show them as they are, and
don't restyle them.

## Sessions with a narrower job

- **Question import sessions:** read `docs/ingestion/reviewed-import-rules.md`
  before anything else.
- **Calculator sessions:** read `docs/superpowers/specs/2026-10-16-calculator-design.md`
  and run `npm run test:calculator`.
