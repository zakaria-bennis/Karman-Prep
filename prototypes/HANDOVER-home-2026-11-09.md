# Handover: painted home page, 9 November 2026

For the next session working on the home page. Read this, `PRODUCT.md` (Brand Commitments) and
`.impeccable/surfaces/src-app-site-page-tsx.md` before touching anything. Load the `impeccable` skill.

Branch `claude/painted-site`, cut from `main`, in the worktree `.claude/worktrees/painted-site`.
Merged into `main` as pull request #255 and deployed on 9 November, on the founder's word. Dev
server: the `painted-site` entry in `.claude/launch.json` (port 3320, local database).

## What is built

One home page, `src/app/(site)/page.tsx`, in sections on one live landscape that is flown from above the
clouds to the sea as the page scrolls (see "Travelling background"). The founder approved this order.

| # | Section | Files | Animation |
|---|---|---|---|
| 1 | The claim: "Our average student gains 280 points. Yours doesn't have to be average." | `ClaimPill.tsx`, `Flock.tsx`, `CLAIM_BOOT` in `page.tsx` | Headline comes into focus out of the haze, word by word; the "280 points" shape slams in with its lettering cut out to the sky; two or three small flocks of birds cross the sky |
| 2 | The proof: "We're twelve for twelve." | `Lanterns.tsx`, `src/lib/marketing/schools.ts` | 30 real logos on small lit lanterns that rise from the bottom, bump and bounce off one another, fade out at the top and come round again; one can be grabbed and thrown |
| 3 | The offer: "Up to +200 points, or your money back." | `Guarantee.tsx`, `GUARANTEE` in `offer.ts` | One sentence; a +200 ring stamp brought down hard at the top right, level with the headline (the headline jolts and leaves burst); three outcome cards slide in from the side; his own "Karman" signature, kept low, right above the link to the full guarantee |
| 4 | Who: "Our tutors are overqualified. That's the point." | `TutorArc.tsx`, `src/lib/marketing/tutors.ts` | Photos wait in a stack at the left, fan out along a half circle that turns slowly like a wheel with its lower half out of sight; the title of whoever is at the top pops up in the middle |
| 5 | How: "Six ways we make a skill stick, because one would be lazy." | `Ways.tsx` | One small moving drawing per way |
| 6 | Doubts: "Go on. Ask us the hard ones." | `Doubts.tsx` | Floating question bubbles; tap one and its answer springs in |
| 7 | Price and close, at night: "Four ways in. The first one is free." | `Fireflies.tsx` | Rows dealt in; fireflies follow the cursor |

Everywhere: the landscape (`HomeFlight.tsx`, `src/lib/flight/`), a button that leans toward the cursor
and a marker that slides along the top menu (`HomeTouches.tsx`). All styles are in
`src/app/(site)/styles/painted.css`. All words are in `src/lib/marketing/site-copy.ts`.

## Where the founder's approval stands

- **Approved:** the seven-section order; the headline; "We're twelve for twelve."; Start free as the
  main action; the "we" voice, confident and a little cocky; the painting.
- **Section 1:** settled with him on 10 November 2026, from live options. He chose: the headline coming
  into focus out of the haze (he rejected the particles, a brush wipe, rise, wind, flip and horizon); the
  main button in ink with a breathing ring of the sky's light and no sweep of shine; a soft veil of light
  behind the top bar; bolder small text with no glow and no new background; today's dawn sky; small flocks
  of birds passing, which spell nothing and ignore the pointer ("gimmicky").
- **Section 2:** settled with him on 10 November 2026. He was "tired of" the double carousel and chose
  lanterns out of six live options (counted grid, changing wall, clouds, a roll call of names, spotlight,
  lanterns). He asked for them to be physical: bouncing off each other, able to be handled, all thirty
  coming round in a loop.
- **Section 3:** settled with him on 10 November 2026. He disliked the plus and minus score tiles ("huge",
  "the slider idea") and every version that listed the tiers: too much for the home page, since the full
  rules are one link away. He wants it short and enticing. He rejected a typed-out signature, his own name,
  a title under it, an underline and a drawn-on effect, then sent a picture of how he signs "Karman"; it
  is traced by hand in `Guarantee.tsx`, with the K's lower line carried under the whole word at his
  request. He asked for the stamp, for its landing to be prominent, and for the cards to come from the side.
- **Section 4:** on 10 November 2026 he chose the arc out of ten live layouts, and described the motion
  himself (stack at the left, fan out, slow turn, titles popping up in the middle). He will supply six
  real photos; until then each place on the arc is a plain frame with no picture (he asked for the
  stock stand-ins to be removed). The Open Peeps drawings are deleted. "Quants" is gone from the site: there is none
  on the team. Still open: a word other than "Published" for the researchers, and which kind each real
  photo is.
- **Sections 5 to 7:** built in one pass at his request so the page could be handed over whole. He has
  seen a still sketch of them, not the built versions. Treat each as a first draft to be reviewed with
  him, one at a time.
- **Feeling:** Studio Ghibli. Hand-painted, soft, quietly magical. Not childish, no bright orange.

## Rejected ideas (do not rebuild)

Pennants; a star constellation; logo tiles on white; names under logos; a quiz with a tutor feed; a grid
of 39 skill squares; a nine-week grid; a gauge dial; an animated mountain climb; AI-generated photos;
hover chips for tutor kinds; a code-drawn student; hard boxes, blurred or feathered boxes, ragged
brush-stroke boxes; chunky orange Duolingo-style shapes; a single-device page (a letter, a scoreboard or
a chat as the whole page).

## Open items

1. Section 1: done (10 November 2026).
2. Review sections 2 to 7 with him one at a time. He now has Mobbin and 21st.dev; use them for
   reference and components.
3. Done on 9 November: the Guarantee, Pricing, Refunds, Terms and FAQ pages and the parent portal now
   state the same tiered targets as the home page, from one record (`GUARANTEE` in `offer.ts`). Every
   other rule is the lawyer-reviewed one. The lawyer has not re-read the tiered targets or Terms section 5.
4. The other site pages (program, pricing, guarantee, private tutoring, FAQ, About, schools, tutors)
   still have the old look, old voice, marigold and generated photos.
5. (Closed 10 November: the tutor drawings are gone; real photos are coming.) He had offered custom images from
   prompts if he wants something more his own.
6. Thirty schools are shown on his word that students attend all of the top 12; four of the thirty were
   my substitutions for schools with no usable logo file. Confirm the list in `schools.ts`.
7. He asked for 15 animations; the table above has them, plus mist between sections. Not built: stars
   coming out at dusk as their own moment, ripples on the lake under the cursor.
8. A cleanup of what clutters sessions is in `prototypes/CLEANUP-AUDIT-2026-11-09.md`.

## Decisions on record

- Average gain is 280 (he overrode `offer.ts`; the start and finish averages were removed).
- Tiered targets, in `offer.ts` as `GUARANTEE.bands`: Private 20 promises +200 up to 1200, +150 to 1300,
  +100 to 1400, +50 to 1450. Cohort and Private 10 promise +150, +100, +70, +40. None from 1460. Founder's
  choice on 9 November: tiered targets, with every other rule kept exactly as the lawyer reviewed it
  (15 of 18 classes, five tests, 90% of practice, SAT within 60 days, half or all back, claim in 30 days).
- The home page follows the device's light or dark mode until the visitor flips the switch in the top bar
  (11 Nov). Light: ink on cream mist, cream on dusk mist for the last section. Dark: cream on night mist.
- Logos are from Wikimedia Commons (`public/site/schools/SOURCES.json`). He was told once that a public
  domain mark is still a trademark.
- The top menu keeps The SAT Program, Private tutoring, Pricing, Sign in and Start free. About, FAQ and
  the guarantee are in the footer. The phone menu is a small sheet, not a full screen.

## How to work with him

- One section at a time, perfected before the next, even when he sends ten notes at once.
- Before building, show two or three clearly different options, at full size, and let him pick.
- Do not guess what a vague phrase means. Ask, with a picture.
- Watch motion before showing it: `node scripts/dev/motion-sheet.mjs --help` is a film strip tool.
- Never restyle an old component and call it new.

## Checks

- `node scripts/dev/home-journey-check.mjs`: measures text contrast against the real pixels behind the words, in light and dark, in
  all seven sections at desktop, tablet and phone, and tests the guarantee's stamp and cards, the bubbles, the birds, the
  phone menu, the still button and every link. Passing.
- `node scripts/dev/home-journey-shots.mjs <dir>`: screenshots.
- The six checks in `CLAUDE.md` pass on this commit.

## Receipts section (10 Nov 2026, in progress)

Between "How we teach" and the questions: `Receipts.tsx`, a plain list of students beside the orange phone,
which shows the text conversation behind the lit row. Six seconds a row; a tap holds a row. The heading and
rows are exactly as tall as the phone. Every row in `src/lib/marketing/receipts.ts` is still a made-up
sample, so `RECEIPTS_ARE_SAMPLES` keeps the section out of production builds. The founder is supplying the
real students and the words they sent; nothing may be written for them.

The phone's Messages screen (11 Nov) is measured from two real iPhone screenshots the founder sent, light
and dark, and follows the page's mode. Sizes are in points of a 402-point screen (`--pt` in painted.css).

## Travelling background (11 Nov 2026, approved and on the home page)

The founder asked for a photorealistic, lit, moving background that changes as the page scrolls and differs
in light and dark mode, and approved the first version ("Yes, keep going"). It replaced the code-made
painting on the home page. The portals still use `src/lib/painting/`.

- `src/lib/flight/shader.ts` is the landscape, drawn on the graphics card: above the clouds, down through
  them, past the high peaks where it snows, along a valley and a fjord where birds fly, out to the sea.
- `src/lib/flight/engine.ts` runs it: scroll flies the camera, it draws softer on slow devices, stops when
  nobody is there, and steps by short fades when motion is held still.
- `HomeFlight.tsx` puts it behind the page. A browser that cannot draw it keeps a plain sky.
- Light mode is one day (just after sunrise to just after sunset). Dark mode is one night (dusk, stars,
  northern lights, sunrise). Flipping the switch makes the sun set or rise where the visitor is, in about a
  second and a half, and the page does not move.
- The switch is the small sky in the top bar (the existing theme button, restyled in painted.css). The top
  bar is now fixed, so the switch travels with the page. On phones the Menu button shows three lines.
- Dark mode's colours are at the end of painted.css: every section takes the night section's look.
- Dark mode, founder's round two (11 Nov): the question clouds are dark fog with white words, the price
  cards are black with white words, and the school logos sit on dark lanterns. One-colour logos turn white;
  nine with two colours or a shield have their own dark file in `public/site/schools/night/`
  (`scripts/dev/night-logos.mjs` makes them, `SchoolLogo.tsx` swaps them). Caltech and others whose colour
  reads on dark stay as they are. The six-ways cards, the guarantee cards and the lit receipt row are still
  cream at night; he has not said whether those should turn black too.
- He likes both the Ghibli look and this more realistic one; the realism is on purpose, so the page does
  not read as low quality. The stamp's leaf burst went with the old engine.
- Not done: the footer still ends in a solid black block (he wants it to continue the landscape); a real
  phone has not been tried; the land up close is better but still not a photograph.

## Questions section (10 Nov 2026)

"Go on. Ask us the hard ones." (`Doubts.tsx`): nine questions drift up the left as clouds, about six in
view, and come round again from the bottom. A picked cloud bursts into puffs, its words fly to the message
box, are typed in and sent, and Karman's answer is typed back in a text conversation on the right. The
founder rejected topic tabs and answers with drawings attached. The nine are in `site-copy.ts` section 13,
built from `offer.ts`; he will supply more questions and answers of his own.
