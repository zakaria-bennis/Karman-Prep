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
| 5 | How: "Seven ways we make a skill stick, because one would be lazy." | `Ways.tsx`, `WayArt.tsx` | Seven detailed pictures that move; layout being chosen |
| 6 | Doubts: "Go on. Ask us the hard ones." | `Doubts.tsx` | Floating question bubbles; tap one and its answer springs in |

Everywhere: the landscape (`SiteFlight.tsx`, `src/lib/flight/`), a button that leans toward the cursor
and a marker that slides along the top menu (`SiteTouches.tsx`). All styles are in
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

## Receipts section (10 Nov 2026, live with sample rows since 11 Nov)

Between "How we teach" and the questions: `Receipts.tsx`, a plain list of students beside the orange phone,
which shows the text conversation behind the lit row. Six seconds a row; a tap holds a row. The heading and
rows are exactly as tall as the phone. Every row in `src/lib/marketing/receipts.ts` is still a made-up
sample. The section is on the live site all the same (founder, 11 Nov: "keep as is for right now and put
on live"), so while `RECEIPTS_ARE_SAMPLES` is true one small line under the heading says the rows are
samples. The founder is supplying the real students and the words they sent; nothing may be written for
them. When the real rows are in, set the flag to false and the line goes away.

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
- `SiteFlight.tsx` puts it behind the page. A browser that cannot draw it keeps a plain sky.
- Light mode is one day (just after sunrise to just after sunset). Dark mode is one night (dusk, stars,
  northern lights, sunrise). Flipping the switch makes the sun set or rise where the visitor is, in about a
  second and a half, and the page does not move.
- The switch is the small sky in the top bar (the existing theme button, restyled in painted.css). The top
  bar is now fixed, so the switch travels with the page. On phones the Menu button shows three lines.
- Dark mode's colours are at the end of painted.css: every section takes the night section's look.
- Dark mode, founder's round two (11 Nov): the question clouds are dark fog with white words and the school
  logos sit on dark lanterns. One-colour logos turn white;
  nine with two colours or a shield have their own dark file in `public/site/schools/night/`
  (`scripts/dev/night-logos.mjs` makes them, `SchoolLogo.tsx` swaps them). Caltech and others whose colour
  reads on dark stay as they are. The six-ways cards, the guarantee cards and the lit receipt row are still
  cream at night; he has not said whether those should turn black too.
- He likes both the Ghibli look and this more realistic one; the realism is on purpose, so the page does
  not read as low quality. The stamp's leaf burst went with the old engine.
- Not done: the footer still ends in a solid black block (he wants it to continue the landscape); a real
  phone has not been tried; the land up close is better but still not a photograph.

## Seven ways section (11 Nov 2026, picked)

He rejected stick-figure cartoon cards ("low quality") and chose detailed objects combined with real moving
diagrams, specific to each method, no people, ink and cream plus one accent colour each. Out of five
layouts he picked the dashboard wall: tiles of different sizes, all moving. `WayArt.tsx` draws the seven
pictures; their labels are `art words` in site-copy section 6. The seventh method is time trials (one
section, starting at 1.25 times the real SAT time and tightening to 0.75 while accuracy holds;
open in the student portal at `/learn/time-trial` since 2026-11-12). The Challenge has no leaderboard: its picture
shows how everyone did, with no made-up numbers. He wants to be asked before any creative direction is
taken on his behalf.

## Founder's wrap-up list (11 Nov 2026, done)

- Top bar: the sliding marker covers only the four links and is a soft tint; the light and dark switch is
  one round button to the right of Start free (the sun sets, the moon rises).
- At night the actions are marigold. The Start free button's pull is capped so it never reaches the words.
- Guarantee: three specific outcome cards worked from a +200 target; the signature and "The guarantee, in
  full" sit level with the last card.
- Receipts phone: deep blue at night, orange by day. The sky chat uses the phone's own grey and blue.
- Question clouds come round in 26 seconds, so all nine pass in about 15.
- Footer: the name rises letter by letter with a sunrise climbing through it; socials are the platforms'
  marks; no switch and no email there.

## Founder's second wrap-up list (11 Nov 2026, done)

- Marigold was too bright: the night actions are cream again. `ActLab.tsx` (development only) lets him try
  other colours through `--act`; once he picks, put the colour in painted.css and delete the file.
- Logo-only schools carry their name beside the mark (`label` in schools.ts), set in a plain serif because
  the schools' own typefaces are not available to us.
- At night the guarantee's three cards are almost black and the lit receipts row is a soft tint.
- Time trials tighten by 5% a round, 1.25 down to 0.75; the stopwatch's hand and ring move together.
- The chat's message bar is the bubbles' grey; the chat no longer traps the scroll wheel.
- The signature has a curved K, clearer letters and is drawn over about five seconds.
- The rising footer letters take no clicks (they were swallowing clicks meant for footer links).

## Third list (11 Nov 2026)

Done: night buttons are soft gold (#e7cf9a); UNC and UT Austin lost their extra name (their logos say it);
the seven-ways number badges are gone; the stopwatch turns a quarter slower; the live teaching picture is a
video call with a sensible worked equation; the guarantee cards have a joke each and a small moving picture.
He then picked: signature version 12 (`SIG` in `signature.ts`), cobalt blue (#2449b8) for the light-mode
buttons, a trinomial on the live teaching board, and flames on the stopwatch as the pace gets faster. The
tester panel is deleted. Do not run Prettier on the stylesheets: they are kept one rule to a line.

## Price section removed (11 Nov 2026)

The founder had the whole last section taken off the home page: "Four ways in. The first one is free.",
its four plan cards, the fireflies, and the closing line and button that sat inside it ("You read this
far. Now start free."). The page now runs from the questions straight into the footer. "Start free" stays
in the travelling top bar and in the hero. Prices live on `/pricing`.

## Footer (11 Nov 2026, picked)

The footer's content is regrouped as he agreed: Programs, Free tools, Company, Legal; then the email, the
four socials, the switch and the still button; then the SAT trademark line in fine print. On the home page
it sits over the landscape with no black block (`styles/foot.css`). He picked "the horizon" out of three
layouts and asked for the links in columns: a last full view, a huge "Karman" on the horizon, the four
columns under it. Pages he agreed to add but that do not exist yet, so are not linked: Contact, Results,
Free tools, For parents, Guides. Other pages keep the plain black footer.

## Questions section (10 Nov 2026)

"Go on. Ask us the hard ones." (`Doubts.tsx`): nine questions drift up the left as clouds, about six in
view, and come round again from the bottom. A picked cloud bursts into puffs, its words fly to the message
box, are typed in and sent, and Karman's answer is typed back in a text conversation on the right. The
founder rejected topic tabs and answers with drawings attached. The nine are in `site-copy.ts` section 13,
built from `offer.ts`; he will supply more questions and answers of his own.

## Phones (11 Nov 2026, founder's list after trying the live site on an iPhone in Safari)

- **Top bar on phones and tablets:** Karman, then Sign in, Start free, the light and dark switch and the
  menu, in that order, on one row. Start free never wraps and never leaves; on the narrowest screens
  (under 373 px, a phone with the page zoomed in) Sign in moves into the menu. The bar has a soft band of
  mist behind it so words do not show through it while the page scrolls.
- **Menu:** a small sheet that drops from its button on every page. The button's three lines cross into an
  X while it is open. It closes when its button is tapped again, on a tap anywhere outside it, when a link
  is picked, and on Escape. The separate Close button and the full-screen menu are gone.
- **Less forehead:** on phones the headline starts close under the bar and sections have less air between
  them.
- **Tutor arc:** a true half circle at every size (it was taller than wide on phones). On phones the title
  sits partly below the circle's centre line (`--arc-below`).
- **Footer:** the big Karman is always one word, sized to the screen. The calculator is not a free tool
  (founder: it is for paying members) and is out of the footer.
- **School lanterns:** a finger on a lantern moves it in any direction (`touch-action: none` on the
  lantern); a finger between lanterns scrolls the page. They are a little larger on phones.
- **Text size:** Safari's own page zoom makes the screen narrower in the page's eyes, and the layout holds
  from 320 px up. The iPhone's system Text Size setting is read by `src/components/site/text-size.ts`,
  which lays the page out for a narrower screen so everything is drawn larger, up to 1.3 times.
- **Speed on phones:** the landscape starts with fewer pixels on a phone and may only use a small share of
  each frame (`PHONE` in `src/lib/flight/engine.ts`); looping drawings stop while they are off screen
  (`data-away`, set in `ShellBehaviour.tsx`, used in `kit.css`); the glow and mist colours no longer ease
  when the light changes from scrolling (that restyled the whole page on every frame), only when the
  switch is pressed; the footer word has no soft shadow on phones.
- Tested in real Safari on an iPhone simulator, which shows layout and touch truthfully but not speed. The
  speed changes still need the founder's own phone to confirm.
- Subpages still have their old top bar; they get this one when each is rebuilt.


## Subpages in the home page's world (from 11 Nov 2026)

`SitePage kind="lit"` gives a subpage the home page's top bar, menu, footer, typefaces and live landscape;
`route={[from, to]}` picks the stretch of the route it flies. Each page passes `litFonts` itself (importing
them in `SitePage.tsx` grows the student app's bundle). The SAT Program page is the first:
`src/components/site/program/ProgramSections.tsx`, styles in `program.css`, words in `site-copy.ts`
sections 21 to 24 and 27. It leads with the outcome, then the offer as a stack, the weekly loop, the
student's side beside the parent's, the promise by starting score, and the close. Its Reserve button goes
to the pricing page until the registration form is built. The founder's product facts and copy rules for
it are in the memory notes (cohort product facts, subpages plan).
