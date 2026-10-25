# Landing redesign: handoff for the next session (2026-10-25)

Start the next chat by reading this file. The work so far is a static mock, not the live site.

## Where it is

- Branch `claude/site-redesign` (local commits, not pushed). Live karmanprep.com is unchanged.
- Mock: `.impeccable/mocks/decision/film/`. Preview: `node .impeccable/mocks/decision/serve.mjs 8765`
  (or the "landing-film" launch config), then:
  - home `http://127.0.0.1:8765/film/index.html`
  - students map `.../film/map.html`
  - pricing `.../film/pricing.html`
  - copy editor `npm run copy` (edits `copy.js`)
- Files: `copy.js` (every word), `site.js` (shared header, menu, pause, guarantee block, reveal),
  `film.js` (home), `map.js`, `pricing.js`, `film.css` (base and home), `phone.css` (the iPhone and the
  phone wall), `pages.css` (map and pricing), `continuous.mjs` (builds the background film from the clips).

## What the founder decided (keep)

- White site, black and marigold accents. One continuous film plays behind the home page in real time;
  the page scrolls normally; nothing is scroll-scrubbed.
- Every phone is the iPhone 17 Pro Max in Cosmic Orange, drawn in CSS (front and edges only), at the
  page edges with text on the other side. Never centered.
- Main features first (live classes, one-on-one reviews, Daily 10, parent updates), Wordline and the
  chat last. No time-of-day theme.
- No social proof block at the bottom. The phone wall (6 straight, staggered, drifting columns; 3 on
  phones) waits for the founder's iMessage screens; the bubbles there now are blank stand-ins.
- Campus B-roll stays as a three-up film, no names or scores.
- Pause is a small button at the bottom right.
- **Never numbered list markers (01, 02, 03).** The founder bans them.
- **The founder writes the copy.** Empty labels in `copy.js` are his to fill: the guarantee headline and
  text, the pricing headline and text, the map headline and text. If an asset is needed, ask him; he
  generates it with Gemini.
- The guarantee is new: `docs/business/guarantee.md` (+100 points or a 1450; half or full refund, or the
  next cohort free, the family's choice; every condition a number). Numbers are in
  `src/lib/marketing/offer.ts` `GUARANTEE`. A lawyer must read it before it goes live.

## Before it can go public

1. Founder fills the empty copy labels and supplies the logo SVG and the iMessage screens.
2. Founder confirms the map's numbers (80 U.S., 20 abroad, the metros and countries) are real.
3. Lawyer reads the guarantee. The live `/guarantee`, `/refunds`, `/terms` and `/faq` pages still run on
   the old policy (`src/lib/guarantee/policy.ts`) and must be rewritten to match, in the same change.
4. Port the mock into the Next.js app: home (`src/app/page.tsx`), `/pricing`, `/students`. Read prices
   and the guarantee from `offer.ts`, not from the mock's copies. Replace, don't accumulate: delete the
   old home and plans pages it replaces. Assets (`day.mp4` 15 MB and the clips) need a CDN or R2 plan.
5. Code gates in `CLAUDE.md`, click every link in a browser, then `npm run cf:build:release && npm run
cf:deploy` only with the founder's go-ahead.

## Open from earlier

- Six extra pages built in another session on branch `claude/gracious-dirac-148d1f` (not merged).
- API budget is low (Atlas about $3, fal about $18). No new generation without approval.
