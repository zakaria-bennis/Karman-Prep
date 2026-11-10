# Handover: painted home page, 9 November 2026

For the next session working on the home page. Read this, `PRODUCT.md` (Brand Commitments) and
`.impeccable/surfaces/src-app-site-page-tsx.md` before touching anything. Load the `impeccable` skill.

Branch `claude/painted-site`, cut from `main`, in the worktree `.claude/worktrees/painted-site`.
Pushed as pull request #255 into `main`. Not merged, not deployed: both are the founder's call. Dev
server: the `painted-site` entry in `.claude/launch.json` (port 3320, local database).

## What is built

One home page, `src/app/(site)/page.tsx`, in seven sections on one painting that travels from dawn to
night as the page scrolls. The founder approved this order.

| # | Section | Files | Animation |
|---|---|---|---|
| 1 | The claim: "Our average student gains 280 points. Yours doesn't have to be average." | `LetterMotes.tsx`, `ClaimPill.tsx`, `Flock.tsx` | Headline forms from motes; the "280 points" shape slams in with its lettering cut out to the sky; a flock of birds spells 280 and regathers when the shape is pressed |
| 2 | The proof: "We're twelve for twelve." | `Logos.tsx`, `src/lib/marketing/schools.ts` | 30 real logos land like leaves, then drift in two rows |
| 3 | The offer: "Up to +200 points, or your money back." | `ScoreTiles.tsx`, `GUARANTEE_TIERS` in `offer.ts` | Flip tiles: their score now, the score guaranteed; leaves burst when it changes |
| 4 | Who: "Our tutors are overqualified. That's the point." | `public/site/tutors/*.svg`, `scripts/dev/make-tutor-peeps.mjs` | Six Open Peeps drawings pop up and hop on hover |
| 5 | How: "Six ways we make a skill stick, because one would be lazy." | `Ways.tsx` | One small moving drawing per way |
| 6 | Doubts: "Go on. Ask us the hard ones." | `Doubts.tsx` | Floating question bubbles; tap one and its answer springs in |
| 7 | Price and close, at night: "Four ways in. The first one is free." | `Fireflies.tsx` | Rows dealt in; fireflies follow the cursor |

Everywhere: the painting (`HomeJourney.tsx`, `src/lib/painting/journey.ts`), the sun crossing the sky,
leaves with physics (`leaves.ts`), springy switches (`Seg.tsx`), a button that leans toward the cursor
and a marker that slides along the top menu (`HomeTouches.tsx`). All styles are in
`src/app/(site)/styles/painted.css`. All words are in `src/lib/marketing/site-copy.ts`.

## Where the founder's approval stands

- **Approved:** the seven-section order; the headline; "We're twelve for twelve."; Start free as the
  main action; the "we" voice, confident and a little cocky; the painting; springy switches.
- **Section 1:** he asked for the motes, the slam and the cut-out lettering, and for no orange. That is
  built. Asked whether it now feels right he said "not necessarily" and did not say what is off. Ask.
- **Sections 2 to 7:** built in one pass at his request so the page could be handed over whole. He has
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

1. Section 1: find out what still feels off.
2. Review sections 2 to 7 with him one at a time. He now has Mobbin and 21st.dev; use them for
   reference and components.
3. The guarantee page and pricing page still show the OLD guarantee (+100, or +50 from 1400). The home
   page shows the tiered one. They must match before launch. He has not formally signed the tiers off.
4. The other site pages (program, pricing, guarantee, private tutoring, FAQ, About, schools, tutors)
   still have the old look, old voice, marigold and generated photos.
5. The six tutor drawings are stock Open Peeps. He offered to generate custom images in Gemini from
   prompts if he wants something more his own.
6. Thirty schools are shown on his word that students attend all of the top 12; four of the thirty were
   my substitutions for schools with no usable logo file. Confirm the list in `schools.ts`.
7. He asked for 15 animations; the table above has them, plus mist between sections. Not built: stars
   coming out at dusk as their own moment, ripples on the lake under the cursor.
8. A cleanup of what clutters sessions is in `prototypes/CLEANUP-AUDIT-2026-11-09.md`.

## Decisions on record

- Average gain is 280 (he overrode `offer.ts`; the start and finish averages were removed).
- Tiered guarantee, in `offer.ts` as `GUARANTEE_TIERS`: Private 20 promises +200 up to 1200, +150 to
  1300, +100 to 1400, +50 to 1450. Cohort and Private 10 promise +150, +100, +70, +40. None from 1460.
  Under half the target, all money back; short of it, half; or keep going free. Paid within 14 days.
- The home page takes its light from the painting, not from the device: ink on cream mist by day, cream
  on indigo at night. It has no light and dark switch.
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

- `node scripts/dev/home-journey-check.mjs`: measures text contrast against the real painting pixels in
  all seven sections at desktop, tablet and phone, and tests the tiles, the bubbles, the flock, the
  phone menu, the still button and every link. Passing.
- `node scripts/dev/home-journey-shots.mjs <dir>`: screenshots.
- The six checks in `CLAUDE.md` pass on this commit.
