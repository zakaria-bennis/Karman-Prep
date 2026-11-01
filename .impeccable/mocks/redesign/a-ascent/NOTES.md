# Direction A "Ascent": notes

Built 2026-11-01 on `claude/first-pass`. Open over the mocks root, for example
`node <scratchpad>/serve-mocks.mjs 8771` (a copy of `decision/serve.mjs` whose root is
`.impeccable/mocks/`), then `http://127.0.0.1:8771/redesign/a-ascent/index.html` and
`.../pricing.html`. `?rec=1` forces reduced motion and skips the opening; `?intro=1` replays it.
`decision/serve.mjs` itself serves only `decision/`, so `/redesign/...` is not reachable from it
without a copy or a symlink; nothing outside this folder was changed.

## The idea

On this page, **the Karman line (100 km up, where space begins, and where the company's name comes
from) becomes the altitude scale that runs down the page's spine: every section is a stage of one
calm climb, each with its own real number set large, from a real question at ground level to orbit.**

Competitor test: put Kaplan, Princeton Review or Khan Academy in the sentence and it fails; none of
them is named for an altitude. "A score is an altitude" is Karman's alone.

## The live thing

A real Karman question (`alg-1`, "If 3x + 5 = 26, what is the value of x?") rendered by the real quiz
engine from `../engine/fragments/alg-1.html` with `../engine/engine.css`, on the first screen, at
1:1 size. The parent taps an answer: the engine's own selected, correct and wrong states appear
(the engine's classes, not drawn), and one line in the page's own words says what happens next in
the app (right: the next question; wrong: the question comes back after 2, 7 and 21 days). It works
with a thumb, needs no script to read (the fragment is static HTML), and never blocks reading.

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
every photograph and on the one marigold button (the rise's 45 degree cut), the field behind the
question on the first screen (the cropped shape), the altitude hairline down the left margin with the
section's number on it, and the footer mark built large.

Blueprints kept and what they hold: features ("Paragraph with picture words") became the Daily 10
stage with the engine's own phone screen in the page's one phone frame; about ("Inset panel, shaped
portrait") is the tutors panel, inset 20 px, night in light mode and off-white in dark, the teacher
still cut by the rise; list ("Two-column menu, photo bullets") is the calendar and tools menu with the
mark as bullet and the p-test still beside it (no calendar is drawn); how-it-works ("Stages as one
bar") is the weekly update as one bar of four segments; proof ("Large marks on tiles") is the
guarantee as filled fields, the promise on ink, the three outcomes, both sides' rules, the cover line
on marigold; showcase ("Object on a disc") is the campus trio with the names as the index and one view
that swaps the clip (the disc swapped for the page's own frame); cta ("First step, already open") is
the orbit window with the test's four facts beside the button; footer ("The mark, built large") is
the Ascent mark across the content width.

The palette and type were kept from the brand (`--keep palette,type`): off-white #f5f5f2 and night
#0e0d0c, black and marigold #eba21f, Hanken Grotesk 800 headlines, #94600a for small marigold text
on light.

## The six laws, where each shaped a decision

- **Hick.** One highlighted button per screen, everywhere (the free practice test); every other
  action is a text link. The header has three links and Sign in. The tools are one list, not a
  calendar drawing plus a dashboard. The stage names were cut so a section is a headline and a
  number, nothing more.
- **Jakob.** Logo left, links right, Menu on phones, a sticky header that hides on the way down;
  pricing as a stacked list with the price under the name and a comparison table under it, the
  pattern every pricing page a parent has seen; the quiz engine's own chrome untouched.
- **Fitts.** 52 px buttons, 44 px targets everywhere (header items, sheet links, campus names, the
  details summaries at 56 px); on phones the first button sits under the headline in thumb reach and
  the question's choices are the engine's own 60 px rows.
- **Peak-end.** The first screen is the product working at full size; the last is orbit with the
  same button and the four facts of the test. Nothing between them has a second marigold thing.
- **Von Restorff.** Marigold on exactly one thing per screen: the button on the first and last
  screens, the "Which skills moved" segment in the update bar, the cover line in the guarantee, the
  marker before the chosen campus name, the free-test band on pricing. Nothing else is coloured.
- **Tesler.** The page carries the complexity: the thirteen-by-six comparison is one table on
  desktop and one list per plan on phones; the guarantee's four rules and three outcomes are on the
  page in full; the engine fragment does the rendering of a real question; the parent decides one
  thing, whether to take the free test.

## Copy

Every visible word is in `copy.js` (`## section / label: text`), restructured from the October 31
copy run. Headlines are the shipped lines or their listed alternates: the first screen uses the 3/3
alternate "SAT prep you can read before you pay." because the question beside it proves it. Nothing
invented: prices and dates mirror `src/lib/marketing/offer.ts`; the campus captions and the 1:1 line
are rule 47's exact words. Sections cut from the home page, with the claim test: "Between sets"
(Challenge question and Wordline) folded into the tools list, since its claim ("free, every day") is a
line of that list; "Student messages" and "Testimonials" (no real ones exist, rule 12).

## What is on the page, for the picture floor

Home: the engine fragment (interface), the engine's phone capture (`conv-2-phone-{mode}-question`),
the day film and its poster (the window at the start, continuous behind the page, orbit at the end),
p-teacher, p-test, p-guarantee, the three campus clips with their stills. Pricing: p-pricing,
p-program, p-school-class, and three real engine captures (`alg-1-desktop-{mode}-question`,
`info-2-desktop-dark-tools`, `geo-5-desktop-{mode}-correct-explain`). Nothing generated, nothing
copied; every file is referenced in place under `../../decision/film/` and `../engine/`.

Device frames on the home page: one (the Daily 10 phone). The first screen's engine is the screen
itself, not a frame.

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
`MARK` to drop in another option. Measured in Chromium: 1176 to 1184 ms on a first visit, landing
0 px off the header slot; the second load in the same session skips it (`sessionStorage`
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
