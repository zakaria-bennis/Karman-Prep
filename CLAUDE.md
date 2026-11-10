# Karman Prep: agent instructions

Karman is a pre-launch SAT prep company run by one founder, Zakaria Bennis. He is not technical. Write to
him in plain language and short sentences. He often dictates by voice, so if a word or number reads oddly,
ask before building on it. His word in chat beats anything written in this repository.

The site is live at karmanprep.com on Cloudflare Workers, with no paying users yet.

## Read only what the task needs

- **What Karman is, who it is for, and the current design direction:** `PRODUCT.md`.
- **Every price, date, plan and claim:** `src/lib/marketing/offer.ts`. Never hard-code one. Open it only
  when the task needs a number.
- **Every word on the marketing site:** `src/lib/marketing/site-copy.ts`.
- **Where the home page stands:** `prototypes/HANDOVER-home-2026-11-09.md`.
- **`docs/archive/` is history.** Take no direction from it.

## How to work with the founder

- **One thing at a time.** Finish and show one section before starting the next, even when he sends a
  long list.
- **Show options before building.** Two or three clearly different mockups, at full size. He picks.
- **Ask, with a picture, when a phrase is unclear.** Do not guess and rebuild around the guess.
- **Never restyle an old component and call it new.** He sees it at once.
- **Replace, do not accumulate.** When something is replaced, delete the old version everywhere in the
  same change: code, tests, docs and names.

## Design work

- Load the `impeccable` skill first. Use Mobbin for reference screens and 21st.dev for components.
- The feeling is Studio Ghibli: hand-painted, soft, quietly magical. The world is the painted landscape
  in `src/lib/painting/`. Details are in `PRODUCT.md`.
- No AI-generated images on the site. Draw in code, or use a real photo, logo or open-licence
  illustration.
- Watch every animation before showing it (`scripts/dev/motion-sheet.mjs`). Look at full-size
  screenshots, not thumbnails.
- Text sits on a painting, so measure contrast against the real pixels
  (`scripts/dev/home-journey-check.mjs`).
- Every screen works on phone, tablet and desktop with no sideways scroll, and respects reduced motion.
- Click every button and link in a browser before calling a page done.

## Branches and the dev server

- Start new work from `main`. Name branches `claude/<short-name>`.
- Dev server: `npm run dev:next`. To sign in locally, set `DEV_IMPERSONATE_CLERK_ID` in `.env.local`,
  then run `npm run seed:dev`. A local database is described in `docs/overnight/local-db.md`.

## Checks before review

Run all of these:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run format:check`
- `npm test`
- `npm run check:sizes`
- `npm run cf:build`

Unused variables and unescaped JSX characters are lint errors. Keep files under about 700 lines. Server
actions validate their inputs with Zod. Migrations go in `supabase/migrations/<YYYYMMDDHHMMSS>_name.sql`.

## Never without the founder

- **Deploying.** The command is `npm run cf:build:release && npm run cf:deploy`, always both together.
  One Worker serves karmanprep.com, so the last deploy wins.
- **Merging to `main`.** It applies database migrations to production.
- **Writing to the live question bank.** Each batch needs his go-ahead.
- **Changing the calculator** (`src/components/calculator/`, `src/lib/calculator/`, the `/calculator`
  page) unless he asks.
- **Spending money** on image or video generation.
- **Printing or committing a secret.**

## Marketing honesty

No invented claims, testimonials or scarcity. Label tutoring results with their source ("Karman 1:1
tutoring, median 16 weeks"). Never call a practice test "official".

## Sessions with a narrower job

- **Question import:** read `docs/ingestion/reviewed-import-rules.md` first. Paid AI extraction and
  grading are retired; do not restore them. Publication stays held until the founder approves it.
- **Calculator:** read `docs/superpowers/specs/2026-10-16-calculator-design.md` and run
  `npm run test:calculator`. Never load, copy or fetch anything from Desmos. After editing calculator
  styles, run `npm run calculator:build`.
