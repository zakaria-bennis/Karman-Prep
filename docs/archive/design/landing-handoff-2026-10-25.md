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
  - inner pages `program.html`, `private.html`, `free-test.html`, `guarantee.html`, `about.html`, `faq.html`
  - every loader and message, with its rule: `loaders.html` (internal, not linked)
- Files: `copy.js` (every word, all pages), `site.js` (shared header, menu, footer, pause, guarantee block,
  reveal), `film.js` (home), `pages.js` (the six inner pages and their three forms), `map.js`, `pricing.js`,
  `kit.js`/`kit.css` (our own orb, top loading line, skeletons, messages, field errors, icons, first-visit
  opening), `screens.js`/`screens.css` (the five product screens, drawn in code), `ten.js` (the Daily 10
  drawing), `art.js` (one isometric drawing per inner page), `film.css`, `phone.css`, `pages.css`,
  `inner.css`, `continuous.mjs` (builds the background film from the clips).

## Round 4 (2026-10-25, later)

- All copy rewritten from scratch with the Conversion Copywriter skill (Harry Dry's three rules). The
  reasoning, alternates for every headline and the per-line scores: `docs/copy/copy-run/copy-deck.html`.
  The argument: the industry hides its fine print and stops watching after you pay; Karman prints every rule
  on the front page and reports the work to parents weekly. The founder asked for this, replacing "he writes
  the copy".
- No third-party libraries for visuals: thinking-orbs and the Hairline engine are deleted and replaced by our
  own code. The map still uses d3 and topojson to draw the world (open item).
- Product screens are code, in white, black and marigold, and the parent screen leads with skill mastery.

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

## Round 5 (2026-10-25, night)

- Paper is warm (#f7f5f0), never pure white (rule 3). Light panels dissolve into the film through a tall soft
  edge instead of a hard box, and the film lifts toward the paper's tone while paper fills the screen.
- Light and dark modes on every page (rule 33), with a switch in the header and phone menu, remembered.
  Light is the default (founder 10-25); rule 33 says dark: the founder decides.
- `alive.js`/`alive.css`: slow glints (buttons, guarantee numbers, phone edges, date card) on their own clocks,
  and on desktop a few things lean or light up as the cursor nears. Off with reduced motion.
- Rule fixes: no drop shadows, firmer corners, no animated arrow, no checkmark bullets, About is rows not three
  cards, pricing is the program plus private with the free test as one line (no three tiers).
- Phones: a bottom button in thumb reach shows only on the way back up and only when no other main button is
  visible; laptop screens show larger and run off the edge so they stay readable; the header turns solid over
  black sections. Desktop: long lists sit beside a pinned heading; the apply form is two fields per row.
- Six still shots are in `assets/manifest.json` as "proposed" (Nano Banana 2.1, about $0.05 each). They run
  only once the founder approves them.

## Before it can go public

1. Founder reviews the new copy (`npm run copy`) and supplies the logo SVG and the iMessage screens.
2. Founder confirms the map's numbers (80 U.S., 20 abroad, the metros and countries) are real.
3. Lawyer reads the guarantee. The live `/guarantee`, `/refunds`, `/terms` and `/faq` pages still run on
   the old policy (`src/lib/guarantee/policy.ts`) and must be rewritten to match, in the same change.
4. Port the mock into the Next.js app: home (`src/app/page.tsx`), `/pricing`, `/students`. Read prices
   and the guarantee from `offer.ts`, not from the mock's copies. Replace, don't accumulate: delete the
   old home and plans pages it replaces. Assets (`day.mp4` 15 MB and the clips) need a CDN or R2 plan.
5. Code gates in `CLAUDE.md`, click every link in a browser, then `npm run cf:build:release && npm run
cf:deploy` only with the founder's go-ahead.

## Open from round 4

- The map still draws with d3 and topojson; replacing them with our own projection is open.
- The deposit Stripe link and the Cal.com call link don't exist yet: the apply and call forms are mock
  forms (no server). Sign in, Terms, Privacy and Cookies point at the live site.
- Dark mode and its toggle: the founder asked for it on 10-20 and never withdrew it. Needs a decision.
- The background film is still clips dissolving into each other; his eyes decide whether it reads as one.

## Open from earlier

- Six extra pages built in another session on branch `claude/gracious-dirac-148d1f` (not merged).
- API budget is low (Atlas about $3, fal about $18). No new generation without approval.

## Round 6: people photos (2026-10-25)

- Founder approved the six photo shots (p-program, p-private, p-test, p-guarantee, p-about, p-pricing).
- Google's prepaid image credit ran out, so the six were rerouted from Nano Banana 2.1 to Seedream 5 edit
  on Atlas ($0.07 each, $0.43 total, same prompts and cast references). The script now has a 4:5 size.
- p-program was generated and charged ($0.07) but its download failed: this session's network sandbox
  can't reach the Seedream (volces.com) or fal (fal.media) file hosts. Its link is saved in
  assets/generation-state.json and expires about 02:44 UTC on 2026-10-27. Fetch it free with
  `node scripts/generate-assets.mjs --fetch p-program`. The other five are not generated yet.
- Placement is built: site.js `photo()`, photos.css, captions and alt text in copy.js section 90.
  Files go in `photos/p-<name>.webp`. Until a file exists the figure hides and the section keeps its drawing.
  Phones: opening photos run edge to edge above the headline, others hang off the right edge.
  Desktop: opening photos beside the headline, others beside their heading at the right edge.
  Pricing: beside the headline on desktop, after the plans on phones.
- Motion (alive.js): one warm shine on first view, a slow drift inside the frame on scroll, and on
  desktop a few pixels of depth against the cursor. Off with reduced motion.
- Update, later on 2026-10-25: the founder chose Seedream and downloaded over a phone hotspot (the campus
  Wi-Fi can't resolve volces.com; visitors are unaffected because the photos are self-hosted). All six were
  regenerated at 4:5 with a "no paper, notebooks or calculators" line ($0.42, plus the first $0.07 square
  draft, kept in raw/stills, unused). Five are placed as photos/p-<name>.webp plus an 800 px phone size.
  p-pricing was charged but its download dropped when the network switched back. Fetch it free with
  `node scripts/generate-assets.mjs --fetch p-pricing` before about 03:43 UTC on 2026-10-27, on a network
  that reaches volces.com, then convert it like the others (cwebp 1400 px q80 and 800 px q78).
- A Nano Banana Pro on fal route (`nano-banana-pro-fal`, $0.15, US storage) is in the script as a fallback.
- p-pricing fetched over the hotspot and placed (2026-10-25). All six photos are now on the pages.
