# Direction A "Ascent": notes

Built 2026-11-01 on `claude/first-pass`. Open over the mocks root, for example
`node <scratchpad>/serve-mocks.mjs 8771` (a copy of `decision/serve.mjs` whose root is
`.impeccable/mocks/`), then `http://127.0.0.1:8771/redesign/a-ascent/index.html` and
`.../pricing.html`. `?rec=1` forces reduced motion and skips the opening; `?intro=1` replays it.
`decision/serve.mjs` itself serves only `decision/`, so `/redesign/...` is not reachable from it
without a copy or a symlink; nothing outside this folder was changed.

## The idea

On this page, **the Karman line (100 km up, where space begins, and where the company's name comes
from) is the shape of the page: every section is a stage of one calm climb, from a real question at
ground level to orbit, and the one motif is the Ascent mark, a stroke that rises and levels off.**
(Round 4 removed the altitude numbers and the hairline spine; see the ROUND 4 block.)

Competitor test: put Kaplan, Princeton Review or Khan Academy in the sentence and it fails; none of
them is named for an altitude. "A score is an altitude" is Karman's alone.

## The live thing

A real Karman question (`alg-1`, "If 3x + 5 = 26, what is the value of x?") rendered by the real quiz
engine from `../engine/fragments/alg-1.html` with `../engine/engine.css`, on the first screen, at
1:1 size. The engine's controls that do nothing on this page are hidden (the list is in the ROUND 4
block); what stays is the subject and skill bar, the question and the four choices. The parent taps
an answer: the engine's own selected, correct and wrong states appear (the engine's classes, not
drawn), and one line in the page's own words says what happens next in the app (right: the next
question; wrong: the question comes back after 2, 7 and 21 days). The box takes the height of the
question, so choice D is never clipped.

## The direction dealt

`node .claude/skills/taste-skill/scripts/draw.mjs --sector education --sections
features,about,list,how-it-works,proof,showcase,cta,footer --keep palette,type --have
video,photography,product-ui --options 3` dealt **sentence-as-layout**, **one-motif** and
**loud-flat-poster**. Taken: **one-motif** (seed 1691875969), because the brief's world is one
instrument with one shape, the rising stroke of the Ascent mark, and the other two cannot hold a
real engine screen on the first screen. Full sheet in
`/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/9fad26ef-dd92-4e98-8387-7e81608f80d5/scratchpad/taste-a-ascent/draw/direction.json`.

One redraw: `--redraw hero`. The dealt "Tabbed folder stack" hero contradicts the brief (the first
screen states the destination with the real question beside it, and the film is a window, not a
folder stack). The redraw dealt "Giant cropped shape": the field the question stands on is that
shape, cut by the rise's 45 degree chamfer, cropped by the right edge of the viewport.

The motif, at its scales: the header mark (20 px), the bullet in every list (14 px), the chamfer on
every photograph (the rise's 45 degree cut), the field behind the question on the first screen (the
cropped shape), and the footer mark set large across the content width.

Blueprints kept and what they hold: features ("Paragraph with picture words") became the Daily 10
stage with the engine's own phone screen at its own size, no frame drawn over it; about ("Inset panel,
shaped portrait") is the tutors panel, inset 20 px, night in light mode and off-white in dark, the
teacher still cut by the rise; list ("Two-column menu, photo bullets") is the calendar and tools menu
with the mark as bullet and the p-test still beside it (no calendar is drawn); how-it-works became the
weekly update's four things as one plain list; proof became the guarantee as plain headed text, the
promise set large, the three outcomes, both sides' rules, the cover sentence as running text (the
"Large marks on tiles" blueprint was a bento grid, rule 13, and went); showcase ("Object on a disc")
is the campus trio with the names as the index and one view that swaps the clip, the caption under
the picture; cta ("First step, already open") is the orbit window with the test's four facts beside the
button; footer ("The mark, built large") is the Ascent mark across the content width, 120 px tall.

The palette and type were kept from the brand (`--keep palette,type`): off-white #f5f5f2 and night
#0e0d0c, black and marigold #eba21f, Hanken Grotesk 800 headlines, #94600a for small marigold text
on light.

## The six laws, where each shaped a decision

- **Hick.** One highlighted button per screen, everywhere (the free practice test); every other
  action is a text link. The header has three links and Sign in. The tools are one list, not a
  calendar drawing plus a dashboard. The stage names were cut so a section is a headline and a
  number, nothing more.
- **Jakob.** Logo left, links right, Menu on phones, the header in the flow (never over the words,
  rule 34); pricing as a stacked list with the price under the name and a comparison table under it,
  the pattern every pricing page a parent has seen; the quiz engine's own styles untouched.
- **Fitts.** 52 px buttons, 44 px targets everywhere (header items, sheet links, campus names, the
  details summaries at 56 px); on phones the first button sits under the headline in thumb reach and
  the question's choices are the engine's own 60 px rows.
- **Peak-end.** The first screen is the product working at full size; the last is orbit with the
  same button and the four facts of the test. Nothing between them has a second marigold thing.
- **Von Restorff.** Marigold on exactly one thing per screen, and that thing is always the button
  (the first and last screens of the home page; the first screen and the close of pricing). Nothing
  else on either page is coloured.
- **Tesler.** The page carries the complexity: the thirteen-by-six comparison is one table on
  desktop and one list per plan on phones; the guarantee's four rules and three outcomes are on the
  page in full; the engine fragment does the rendering of a real question; the parent decides one
  thing, whether to take the free test.

## Copy

Every visible word is in `copy.js` (`## section / label: text`), restructured from the October 31
copy run. The first screen's headline is "Ten minutes of SAT practice a day." (round 4; the earlier
"SAT prep you can read before you pay." was a figure of speech that needed the question to land).
Nothing invented: prices and dates mirror `src/lib/marketing/offer.ts`; the campus captions and the
1:1 line are rule 47's exact words. Sections cut from the home page, with the claim test: "Between sets"
(Challenge question and Wordline) folded into the tools list, since its claim ("free, every day") is a
line of that list; "Student messages" and "Testimonials" (no real ones exist, rule 12).

## What is on the page, for the picture floor

Home: the engine fragment (interface), the engine's phone capture (`conv-2-phone-{mode}-question`),
the day film and its poster (the window at the start, continuous behind the page, orbit at the end),
p-teacher, p-test, p-guarantee, the three campus clips (`c8a`, `c8b`, `c8c`, landscape) with their
stills. Pricing: p-pricing, p-program, p-school-class, and one real engine capture in two sizes
(`conv-2-desktop-{mode}-wrong` from 800 px of viewport, `conv-2-phone-{mode}-wrong` below). Nothing
generated, nothing copied; every file is referenced in place under `../../decision/film/` and
`../engine/`.

Device frames: none. Every engine capture is shown as the screen itself, at its natural ratio.

## The film

Fixed behind the page, poster first (`day.jpg` / `day-p.jpg`), `day.mp4` set after the load event
plus two frames, never driven by the scroll, looping; the orbit clip `c9.mp4` loads when the close
comes within 60 percent of a screen and crossfades in. The two windows (ground, orbit) are the only
transparent sections. Under reduced motion no video gets a source and the windows show the posters.
No pause control on the film (rule 38); the footer's "Pause the film" / "Play the film" is
remembered in `localStorage` `karman-motion` and stops every clip. Note: `day.mp4` and `day-p.mp4`
are still H.264 4:4:4 (ffprobe), which iPhone hardware decoders refuse; `c8a-c` and `c9` are 4:2:0.
That re-encode is the founder's call (first-pass notes).

## The opening

`site.js` imports `startIntro` from `../logo/intro.js` with `MARK = ORDER[0]` ("ascent"); change
`MARK` to drop in another option. The overlay's ground is the page's `--ground` and the mark takes
`--ink`, so it forms bone on night in dark mode and ink on bone in light (checked by pixel in round
4). Measured in Chromium: 1176 to 1184 ms on a first visit, landing 0 px off the header slot; the second load in the same session skips it (`sessionStorage`
`karman-intro`); under reduced motion it is a 310 to 350 ms fade with no travel. The page is in the
DOM before the overlay, and a CSS failsafe restores it at 1.6 s. The favicon is
`../logo/favicon-ascent.svg`.

## Theme

Saved choice first, else the device's `prefers-color-scheme`, dark when it says dark; light when it
says nothing, as the first-pass notes record (browsers no longer report "no preference"). The
toggle (header, sheet and footer) is remembered in `localStorage` `karman-theme`. The engine
fragment and the engine captures follow the page's theme (`observatory` dark, `ivory` light).

## 21st.dev

See `21st.md`: ten components ported and credited by id, each at the top of the file that uses it.

## Checks run

All on the final build, server on port 8771.

- `lint.mjs` on the folder: 0 FAIL, 0 WARN.
- `inspect.mjs` at 1440, 768 and 390, both pages: home 0 FAIL, 2 WARN; pricing 0 FAIL, 2 WARN.
  Allowed on the home page, each defended in one sentence: `hairline` (the altitude scale down the
  left margin is the brief's spine and the direction's one motif, one hairline, never heavier);
  `palette-terracotta` (the orange is the founder's Cosmic Orange iPhone 17 Pro Max frame, a brand
  asset, not a palette choice). Remaining WARNs, defended: `card-rows` (the guarantee fields and the
  plan rows are the dealt "Large marks on tiles" and "Pricing Tiers List" blueprints, flat fields
  with no border, varied by colour); `font-fallback: math` (KaTeX's visually hidden MathML inside the
  engine fragment, the product's own markup); `no-footage` on pricing (the film belongs to the home
  page; no honest clip fits a price list).
  Reports: `/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/9fad26ef-dd92-4e98-8387-7e81608f80d5/scratchpad/taste-a-ascent/{index,pricing}/report.json`
  and the sheets beside them.
- The overlap scan (the decision mock's `overlap-scan.mjs`, pointed at these pages as
  `scratchpad/a-ascent-overlap.mjs`): both pages clean at 375x812, 768x1024 and 1440x900, 61
  positions each: no text on text, nothing under the header, never two highlighted buttons, no
  sideways scroll.
- Contrast by calculation (`scratchpad/a-ascent-contrast.mjs`, from the scratchpad's
  `contrast.mjs`): every text colour pair on both pages, light and dark, at 1440 and 390, meets AA;
  lowest pass 5.15:1 (the campus caption on its scrim). Text inside the engine screens (40 runs) is
  the product's own and listed apart.
- Playwright click-through (`scratchpad/a-ascent-clicks.mjs`): 21 links on home and 26 on pricing,
  0 broken (the decision mock's inner pages answer 200; karmanprep.com routes are not fetched); the
  theme toggle in header, sheet and footer; the phone Menu (opens with focus inside, Escape and
  Close close it); the footer film control (stops and removes every clip, then plays again); the
  campus names; the live question (B marks wrong, C marks right); the plan details on phones; zero
  console errors.
- The intro: 1176 to 1184 ms, skipped on the second load, 310 to 350 ms fade under reduced motion.
- The film: playing 2.5 s after load with no controls; orbit loaded and playing at the close;
  under reduced motion zero stage videos and zero campus sources.
- No sideways scroll at 440, 375, 834 or 1440, light or dark, either page.

## Screenshots

`/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/9fad26ef-dd92-4e98-8387-7e81608f80d5/scratchpad/redesign-a-ascent/`:
`{index,pricing}-{440x956,375x812,834x1194,1440x900}-{light,dark}.png` (the first screen) and the
same names with `-full` (the whole page; fixed-position film and lazy pictures do not always paint in
a full-page capture, so judge sections from the inspector's sheets or the viewport shots). 32 files.

## Critique rounds (taste-skill format)

ROUND 1 (first render, 1440 and 440, light and dark)
- design 5 · usability 5 · creativity 7 · content 8 · overall 5.7 (capped 6.0: overflow and the
  inspector not yet run)
- Pass 13 collisions: the tools list pushed the page to 1562 px wide at 1440 (sideways scroll);
  pass 8 images: the first-screen engine rendered in its phone layout inside an orange phone frame
  (a `.phone` class clash) and the tools' plan notes rendered as grey blocks (a `.plan` clash with
  the pricing rows); pass 5 frame: the footer mark was a 1328 px square.
- Fixed: `min-width: 0` on the grid children; the field extended to the viewport edge so the engine
  gets 768 px and its desktop layout; the classes renamed; the footer mark cropped to the mark's own
  bounds at 34svh; the hero split set to 5/7.

ROUND 2 (inspector sheets at 1440, 768, 390)
- design 6.5 · usability 7 · creativity 7.5 · content 8 · overall 7.0 (capped 6.5 by the eyebrows
  and the 3-line headline)
- Pass 6 type: the first headline ran to 3 lines at 1440 and 15 sizes were in use; the stage names
  ("Ground", "Every morning") and the number notes sat above headings and read as eyebrows; pass 11
  fullness: the window screen and the tools screen were mostly empty ground; pass 7 colour: the
  tutors panel in dark mode had ink on ink (1:1); pricing had one picture and six identical rows.
- Fixed: the stage names cut from the deck, the number moved under the lede; sizes down to seven;
  the deep panel's ink tokens; the windows carry their posters until the film plays; the tools
  section became three columns with the still at the right; pricing got the three engine captures
  and two stills in the rows; the guarantee became two fields and a cover band.

ROUND 3 (final sheets and viewport shots)
- design 7.5 · usability 8 · creativity 7.5 · content 8 · overall 7.7
- Pass 1: one second gives "a test question"; five seconds give what it is, who it is for, what to
  do. Pass 3: cover the logo and the altitude numbers and the question-on-a-cropped-field still
  belong to Karman; the campus names and the orbit close could not be another company's. Pass 9
  sameness: hero split, window, split with phone, inset panel, three-column menu, split with bar,
  fields, index with view, window; no layout twice in a row. Pass 14: the live thing is the real
  question. Remaining soft spots: the close headline ran to 3 lines after the window margins were
  aligned (fixed by widening its column to 8/4); the pricing "screens" band cropped the first
  capture's right edge (fixed with auto rows); the tools still sat low and small at the right
  (fixed by aligning the columns to the top). What still falls short of an 8: the first screen's
  left column has more quiet ground above the headline than a juror would like at 1440 (the one
  rest on the page, kept); the inspector cannot see the film play, so the windows are judged by
  their posters; the weekly update bar is words, not the real parent email, because no real update
  screen exists yet.

## Not done, and why

- `day.mp4` and `day-p.mp4` are 4:4:4 and will not play on iPhones; re-encoding is a media change
  the founder approves (no media generated or re-encoded here).
- No pause control on the film itself (rule 38); the footer control is the accessibility route. The
  founder may amend rule 38.
- The pricing page's phone comparison opens no plan by default so the lists never sit over the next
  heading; the founder may prefer Platform open.
- The School row's picture is p-school-class (approved still); the Private row has no picture so the
  three picture rows do not read as a card row.
- Nothing committed, pushed, deployed or written to the database.

## ROUND 4 (fix round, 2026-11-01)

Three judges' findings for this direction plus the seven fixes asked of every direction. The founder's
test for every change: simpler and calmer than before. Server for this round:
`node <scratchpad>/serve-mocks.mjs 8791`, pages at `http://127.0.0.1:8791/redesign/a-ascent/`.
Screenshots: `/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/9fad26ef-dd92-4e98-8387-7e81608f80d5/scratchpad/redesign-a-ascent-r4/`
(`{index,pricing}-{440x956,375x812,834x1194,1440x900}-{light,dark}.png`, the same with `-full`, and
`intro-{light,dark}-450ms.png`), 34 files. Check scripts: `<scratchpad>/r4-*.mjs`.

### The judges' findings and what happened to each

- Campus clips crossed (all three judges; rule 47). **Fixed.** `home.js` maps by name, never by position:
  `{ mateo: "c8a", priya: "c8b", ava: "c8c" }`, from `assets/manifest.json` (`refs[0]` of each shot) and
  `decision/film/film.js`. `r4-manifest.mjs` reads the manifest and fails if a name points elsewhere:
  "every campus caption points at the clip the manifest names". The frames were checked by eye against
  the captions (`r4tmp/campus-abc.png`): c8a Harvard sweatshirt, c8b Stanford, c8c Berkeley hoodie.
- Portrait stills declared 1440x808 and cover-cropped to 16:10, one a headless torso (judge 3). **Fixed.**
  The view is 16:9 and holds the landscape clip and its still (`c8x.mp4`, `c8x.jpg`: 1440x808 for c8a and
  c8b, 1280x720 for c8c, declared at those sizes), so nothing is cropped. The caption sits under the
  picture, not on it.
- The marigold button: a 102 px arrow, a three-line label, a chamfered slab (all three). **Fixed.** One
  line (`white-space: nowrap`), 52 px tall, 273 px wide at every width measured (375, 440, 834, 1440), a
  16 px arrow after the words, a plain rectangle, no chamfer. The pricing free band (400x220 at 440) is
  gone; the free line and the button sit on the pricing first screen.
- The first screen is the engine's toolbar, not a question (all three). **Fixed.** Hidden with
  `display: none` in `ascent.css` under `.k-engine`, nothing else restyled: the top bar's tool cluster
  (`.top-0 > .justify-end`: Calculator, scratch pad, Highlight, the 0:00 timer and Hide Timer, bookmark,
  the engine's own theme toggle, Settings, Menu, Close), the bottom bar (`.bottom-0.h-16`: flag,
  Questions, Previous, Next), every per-choice cluster (`[data-calculator-cluster]`: cross-out and
  Transfer to Calculator) and the stem's Transfer control (`[data-transfer-control]`). What stays: the
  subject and skill bar (one row, 56 px; the skill label no longer truncates, `scrollWidth ==
  clientWidth` at 375, 440, 834 and 1440), the eyebrow, the stem and the four choices, exactly as the
  engine styles them; the content area starts under the one-row bar (`top: 64px; bottom: 0`). The box
  takes the measured height of the question (495 px at every width), so choice D is never clipped
  (choice D bottom 399 px inside a 431 px content area). Everything tappable does something: the four
  choices grade with the engine's own classes (B marks wrong and shows C, C marks right; verified by
  the click-through at 1440 and 390). No `tabindex` juggling is needed any more. The engine's "Algebra"
  eyebrow under a three-row bar at 375 (judge 3) is gone with the bar.
- At 375 the stem was below the fold (judges 1 and 3). **Fixed in part.** The lede is one sentence and
  the headline names the thing; the stem now starts at 646 px of 812 at 375 (and of 956 at 440), with
  choice A on the first screen; the full question is one swipe down. 
- The headline was a slogan (judges 1 and 3). **Fixed.** "Ten minutes of SAT practice a day." The lede:
  "Karman tutors teach every live class, and every week you get an update on practice time, skills and
  scores." The question's caption: "One of Karman's own questions, the way your student sees it. Try
  it." Two invitations no longer compete: the caption invites the tap, the button books the test.
- "Take the free practice test" talks to the student (judge 1). **Defended.** It is the site's one call
  to action in every mock and the principles file (section 11, item 3); changing its verb is the
  founder's call, noted for him.
- Daily 10 phone frame: a drawn island over the toolbar, a corner that clipped "READING & WRITING", the
  capture at 0.73x (all three). **Fixed.** The frame, the island, the orange and the rounded corners are
  gone. The engine's 440x956 capture is shown as the screen itself at its natural ratio (`img` with
  `height: auto`), 440 px wide (1.0x) from 440 px of viewport up; under 440 it bleeds edge to edge and
  never drops under 0.9x (396 px at 375), the 10 px outside the viewport on each side being the engine's
  own 12 px bar padding and 24 px content padding, checked by element screenshot (`r4tmp/crop-index-375.png`):
  no glyph cut. The picture's label is now honest: "A Reading and Writing question on a phone, in the
  quiz engine".
- Pricing's three desktop captures at 0.29x to 0.34x, one dark in light mode, one cut at Next (all
  three). **Fixed.** One real screen: `conv-2-desktop-{mode}-wrong` at 1200 px, its 1x size, from 800 px
  of viewport up (0.64x at 834, above the 0.6 floor), and the phone capture of the same state
  (`conv-2-phone-{mode}-wrong`, 440 px, 1.0x; 0.9x at 375 with the same padding-only bleed) below 800 px,
  through one `<picture>`. Both follow the theme. Nothing cropped, nothing under a frame.
- The orbit facts at 3.99:1 over the real frame, worst case 3.74:1 (judge 2); figcaption on a scrim
  (judge 1). **Fixed.** No word sits on a frame any more: both windows' words sit on a solid card
  (`#0e0d0c`, both modes) and the campus caption sits under the picture. Sampled 30 real frames of
  `day.mp4`, `day-p.mp4`, `c9.mp4` and `c9-p.mp4` (`r4-frames.mjs`): the brightest pixel in the lower
  band is pure white (c9 at 13 s), so white text on the old 0.55 scrim was 4.40:1 at best and 86% white
  3.18:1; on the solid card every word is 19.42:1.
- The sticky header covered text on every upward scroll (judge 1, rule 34). **Fixed.** The header is in
  the flow; nothing sticky or fixed sits on the page. The hide-on-scroll code is deleted.
- The verdict in #94600a on the field at 4.31:1 (judge 3). **Fixed.** The verdict is ink in both states.
- The footer mark filled a screen with nothing to read (judges 1 and 2). **Fixed.** 120 px tall.
- 355 px of empty ground above the headline at 1440 (judge 2). **Fixed.** The first section's padding
  is 40 px, the words align to the top of the field; the headline is at y 160, the field at 195, the
  whole question and "Choose an answer" inside 900 px.
- The altitude hairline down the margin and the 28x2 dashes (judges 1 and 2, taste rule). **Fixed.**
  Deleted, with the `.spine` markup and the dashes on the question label and the window captions.
- The altitude numbers 10, 20, 5, 7, 100 read as a riddle and as numbered markers (judge 1, founder
  memory). **Fixed.** Removed, with their notes, from `copy.js` and the page; the facts they carried are
  already in the sentences (ten questions, 20-minute call, five tests, weekly update, the Karman line in
  the footer).
- The guarantee as a bento grid of filled tiles and a marigold band (judges 1 and 3, rule 13).
  **Fixed.** Plain headed text in two columns: the promise set large with its note and the three
  outcomes as a definition list; the two rule lists with headings; the cover sentence as running text
  with the link. No fills, no band.
- The weekly update as four coloured tiles with a marigold segment (judges 2 and 3, rule 6 and Von
  Restorff). **Fixed.** The four things are one plain list with the mark as bullet. 21st.dev 28381 is
  dropped from the credits (`21st.md`).
- Four "Coming 2027" tool lines (judge 2, founder's home-shows-the-shared-product rule). **Fixed.**
  Cut from `copy.js`; the list is the calendar, the full-length tests, the calculator and the Challenge
  question.
- The ground window's lede was a sentence about the page (judge 2). **Fixed.** "Ten questions at the
  kitchen table before school, and a weekly update to you."
- The phone comparison's check and dash bullets (judges 1 and 2, rule 16). **Fixed.** Each plan's
  `<details>` holds "Included" as a list with the page's mark bullet and one sentence "Not included:
  ...". The accordions stay (judge 2, Tesler): the thirteen-by-six table is secondary detail on a phone
  and the plan rows above it already say what each plan is; the founder may prefer Platform open.
- No button on the pricing first screen (judges 1, 2 and 3). **Fixed.** The free line and the button are
  in the first screen's words, under the lede, at every width (y 587 at 1440, inside 956 at 440 and 812
  at 375).
- "Start with one Saturday, December 12." ran to three lines at 375 (all three). **Fixed.** "Start on
  Saturday, December 12.", two lines at 375; no headline on either page runs past two lines at 375, 440,
  834 or 1440.
- Two `style` attributes on the pricing lede (judge 3). **Fixed.** One.
- The phone sheet's Close and Dark mode buttons in default grey chrome (judge 3). **Fixed.** `.tb` is
  styled once for header, sheet and footer.
- The honest note indented 120 to 176 px in the close (judge 3). **Fixed.** The cause was the entrance
  state class `in` colliding with the layout class `.in` (which carried the gutter padding); the layout
  class is now `.inner`.
- Entrances arrived late and grey (judge 2). **Fixed.** 0.5 s, from 150 px before the fold
  (`rootMargin: 0 0 150px`, threshold 0), delays 0, 60 or 120 ms, nothing longer.
- No floating free-test button on long phone scrolls (judges 1 and 3, rule 35 second sentence).
  **Defended.** Rule 34 says nothing fixed sits over text being read and this round's brief says no
  floating button over body text; the page keeps one button on the first screen and one at the close,
  and the founder decides between the two rules.
- The hero's instant grading is not the engine's select-then-submit flow (judge 2). **Defended.** This
  round's brief accepts the four choices grading with the engine's classes; the verdict line says what
  the app does next.
- 27 Lucide icons and a backdrop-blur bar inside the engine (judge 3, rules 2 and 8). **Defended.** They
  are the product's own; the icons in the hidden controls no longer show, and the bar is the engine's.
- No JSON-LD, no server rendering, the page empty without JavaScript (judge 3). **Could not** in a
  static mock; for the Next port.
- `decision/serve.mjs` cannot serve `/redesign/...` (judge 3). **Could not** here (nothing outside this
  folder is edited); the scratchpad's `serve-mocks.mjs` is the copy rooted at `.impeccable/mocks/`.
- The pause control in the footer (judge 2, rule 38 borderline). **Defended.** It is not on the film;
  this round's rules keep the remembered footer control.
- "Visibly used" 21st.dev credits (all three). **Noted.** 28381 is dropped; the nine left are credited
  at the top of the file that carries each (18475 now in `home.js` and `pricing.js` too). Half are
  recognisable on screen (the navbar and toggle, the plan rows, the table and its phone lists, the
  footer); the hero, the campus index and the close are credits on plain layouts, as before.

### The opening

No bug found. `site.js` passes `ground: "var(--ground)"` and the overlay's mark takes the page's
`--ink`; at 450 ms into a first visit the forming mark's pixel is 18,17,15 on a 245,245,242 ground in
light mode and 245,245,242 on 14,13,12 in dark (`intro-{light,dark}-450ms.png`, sampled with sharp).
1177 to 1204 ms over three runs, landing 0 px off the header slot, skipped on the second load, a 317
to 326 ms fade under reduced motion. `intro.js` was not edited.

### Replace, don't accumulate

Deleted in the same change: the phone frame (`.phone`, `.glass`, `.island`), the spine, the marks
(`.mark`, `markOf`), the update bar (`.bar`), the guarantee tiles (`.tiles`), the pricing free band
(`.freeline` block), the three-capture grid (`.screens`), the chamfer on the button, the hide-on-scroll
header, the `tabindex` loop, the `.mari`, `.display`, `.ghost` and `.plan .price small` rules, the
engine's `.lucide` override, the scrim token. `r4-deadcss.mjs` lists every selector in `ascent.css`
that matches nothing on either page in any state: 8, all of them state selectors that exist only
while something happens (`html[data-theme="dark"]` and its hover, `.stage video(.on)`,
`.stage.waiting .orb`, the intro's `[data-intro-wait]` and `[data-intro]`, `.karman-engine.dark`).

### Checks, with the numbers

- Taste lint on the folder: 0 FAIL, 0 WARN.
- Taste inspect at 1440, 768 and 390, motion on: home 0 FAIL, 3 WARN; pricing 0 FAIL, 1 WARN. No
  `--allow` any more (the hairline and the orange are gone). The WARNs, each defended: `palette-cream`
  (the text colour #f4f3e7 is the engine's own ivory inside the fragment, the product's palette);
  `font-fallback: math` (KaTeX's visually hidden MathML inside the engine fragment); `blank-gap` (the two
  film windows, where the fixed film layer is the picture and the inspector cannot see it);
  `no-footage` on pricing (the film belongs to the home page). Reports and sheets in
  `<scratchpad>/taste-a-ascent-r4/{index,pricing}/`.
- Overlap scan (`r4-overlap.mjs`), both pages at 375x812 (121 positions), 768x1024 and 1440x900 (101
  positions each): clean. No text on text, nothing fixed over anything, never two highlighted buttons,
  no sideways scroll.
- Contrast by calculation (`r4-contrast.mjs`), both pages, light and dark, 1440 and 390: every text
  colour pair meets AA; lowest pass 7.47:1 (the question's caption, #4a4741 on #e8e7e1); text inside
  the engine (21 runs) is the product's own and listed apart. The film windows: 19.42:1 on the solid
  card against the brightest sampled frame (`r4-frames.mjs`, 30 frames).
- Click-through (`r4-clicks.mjs`): 21 links on home and 26 on pricing, 0 broken; theme toggle in header,
  sheet and footer; the phone Menu opens with focus inside, Escape and Close close it; the footer film
  control stops and removes every clip, then plays again; the campus names switch the clip; the live
  question grades B wrong and C right; the plan details open on phones; zero console errors.
- The film: playing 2.5 s after load with no controls; orbit loaded and playing at the close; under
  reduced motion zero stage videos and zero campus sources.
- Product pictures (`r4-shotcrop.mjs`): home phone capture 1.0x at 440, 0.9x at 375 (11 px of the
  engine's padding outside each edge, no glyph cut); pricing 0.639x at 834 (desktop capture), 1.0x at
  440 and 0.9x at 375 (phone capture).
- Buttons at 375, 440, 834, 1440: every `.btn` 273x52, one line.
- No sideways scroll at 375, 440, 834 or 1440, light or dark, either page; zero console errors in the
  32 page screenshots.

### Still for the founder

- The headline "Ten minutes of SAT practice a day." and the shorter lede are new words; he may want
  his own.
- The button's verb: "Take the free practice test" (the student's action) or "Book the free practice
  test" (the parent's), judge 1's point.
- The phone comparison opens no plan by default; Platform open is one line to change.
- The home page keeps no floating button (rule 34 against rule 35's second sentence).
- `day.mp4` and `day-p.mp4` remain 4:4:4 (no iPhone playback) until he approves a re-encode.
