# Direction C "Bluebook, honest": notes

Built 2026-11-01 on branch `claude/first-pass`. Home page and pricing page, plain HTML, CSS and
JavaScript, in this folder. Nothing committed, nothing deployed, nothing generated, no money spent.

## How to open it

The brief's URL scheme (`/redesign/c-bluebook-honest/index.html`) needs the server rooted one level
above `decision/`, so the inner-page links (`/decision/film/program.html` and so on) and the engine
folder resolve on one origin. `.impeccable/mocks/decision/serve.mjs` roots itself at `decision/`, so
this build runs a copy with `ROOT` set to `.impeccable/mocks/` (the session scratchpad's
`serve-mocks.mjs`, round 4 on port 8793; the only change is the `ROOT` line and the copy editor's
file). To look: copy `serve.mjs`, set `const ROOT = "<repo>/.impeccable/mocks/";`, run it on a
free port, open `/redesign/c-bluebook-honest/index.html` and `/redesign/c-bluebook-honest/pricing.html`.
`?rec=1` skips the opening for screenshots.

## The idea sentence

On this page, **the Bluebook test screen your student will sit in on the morning of the SAT** becomes
**the object the page is made of**: a calm app frame, a real Karman question in the real engine at
the centre of the first screen, the choices answerable, and every section after it another sheet of
the same test (the daily set, who teaches, what you see, the campus, the rules page, the admission
ticket, the reply card). Competitor test: another SAT company could not put its real engine on the
first screen with a question of its own that a parent can answer and check.

## The direction dealt

`node .claude/skills/taste-skill/scripts/draw.mjs --sector education --brief "Karman, SAT prep for
parents: the digital SAT in Bluebook, a real question from the real quiz engine the parent can
answer, ten questions a day, Karman tutors, a weekly update, a guarantee printed in full"
--sections showcase,features,proof,how-it-works,pricing,cta,footer --keep palette,type
--have video,photography,product-ui --options 3` dealt `type-only-statement`, `page-is-the-object`
and `one-motif`. Taken: **`page-is-the-object`, seed 720649305** (the artefact in the subject's
world is the test screen; the other two carry no object of Karman's own). Full sheet: hero "Card
over a dim room", showcase "Square plate, spare text", features "Stacking colour sheets", proof
"The printed guest list", how-it-works "Drag row of moments", pricing "The ticket", cta "The reply
card", footer "The back of the card", motion "Pinned story". Sheet saved in the scratchpad at
`taste-c-draw/direction.json`.

Redraws and adjustments, each for a stated reason:

- `--redraw section:how-it-works=how-it-works-itinerary-on-a-slip`: the dealt "Drag row of
  moments" is a sideways-scrolling row, banned by design rule 28. The slip holds the guarantee (the
  test's rules page): promise, outcomes, what Karman does, what the student does, the coverage line
  inverted at the foot. Its zigzag edge was not drawn: the artefact is a screen, not a receipt.
- The hero card is the engine screen, not a programme card with words spread along its edge: the
  words sit beside it in the left column so the first screen keeps one H1, one sentence, one button.
- "Square plate" became the engine's own 3:2 screen at full width: a square crop would cut the
  stem mid-line, and the brief asks for questions at readable size (the 1200 px render shows at
  1360 px on desktop; phones get the 440 px phone render).
- The guest list's tilt and bottom crop, the reply card's two-degree rotation and the footer's
  scallops were left out: in this world the sheets are screens and sit flat and whole, and the
  campus captions (rule 47) can never be cut.
- The dealt "Architecture" photographs were not used; every picture is Karman's own (the film's
  stills and clips, the photos folder, the engine renders).
- Round 4: the dealt "Stacking colour sheets" (21st.dev 25275) were dropped. Each sheet slid over
  the paragraph of the one before it (rule 34), so the four features are now flat split sections,
  words beside a whole photo, the photo changing sides.
- A mistake to own: the first `--redraw` was run without `--out`, so it rewrote the repository's
  old `.taste-skill/direction.json` (the October 20 sheet, untracked) once; nothing else of that
  folder was touched and the build's own sheet lives in the scratchpad.

## The live thing

The real quiz engine fragment (`../engine/fragments/alg-1.html`, the real DOM of
`QuizEngine` on Karman's own question "If 3x + 5 = 26, what is the value of x?") is mounted in the
first screen, at its own height, with every control that does nothing on this page hidden by the
page's stylesheet (the list is in the round 4 block). The parent taps a choice and the tap grades
it: the right choice takes the engine's success tint and a check, a wrong one its error tint, and
under the panel the page says "Right." or "Not this one." with the diagnostic's own explanation
("3x = 21, so x = 7."), then one line on what Your Daily 10 does with a miss. Before the script
runs the slot holds the real render of the same screen (`renders/alg-1-desktop-<mode>-question.webp`),
so the plain fallback is honest. The words and the panel each sit on a solid card in the page's
ground over the film, so every line passes AA by calculation in both modes. The pricing page's live thing is the SAT date switch: March 6, May 1,
June 5 or another date, and the admission ticket changes its dates, price and close date, or gives
way to the note about monthly plans.

## Where the six laws shaped a decision

- **Hick:** one H1, one sentence, one marigold button on the first screen; every other action is a
  text link; the pricing page asks one question first (which SAT) and the ticket answers it; the
  13-row comparison is folded under one summary bar until asked for.
- **Jakob:** the Bluebook screen itself (the subject bar, the stem, the four choices), tabs that look like
  tabs, a segmented control for a date, a ticket for a dated sitting, plan rows that read like a
  receipt, a footer like every footer.
- **Fitts:** 44 px minimum on every control (checked by script: 0 under 44); the marigold button
  is full width on phones and sits right under the sentence; the engine's choices are the real
  engine's full-width buttons and grade on the tap itself, so there is no second control to reach;
  the comparison summary is a full-width bar; the film switch's hit area is 46 by 44 around a 28 px track.
- **Peak-end:** the first screen is the strongest (the film still, the real question, the proof
  line) and the last is the orbit with the bone reply card, the honest note and the button.
- **Von Restorff:** marigold appears on one action per screen and on the tab indicator and ticket
  bullets only; the night field is used for the campus section, the guarantee and the footer so
  each light card stands out once.
- **Tesler:** the page carries the complexity: the engine's toolbar is hidden where it would do
  nothing and the tap grades, the date switch rewrites the ticket, the table is built from one
  matrix line in copy.js; the parent decides one thing per screen (answer, which SAT, take the test).

## Rules that bound the build, and how they were met

- Rule 33 as rewritten: the device's mode first, dark when it states none, a visible toggle in the
  header, the menu and the footer, remembered in `localStorage karman-theme`; the engine fragment
  follows the page's mode (observatory for dark, ivory for light).
- Rule 38: no visible pause control over the film; the footer's film switch (21st.dev 37311) stops
  and restarts every film and is remembered in `karman-motion`.
- The film: `day.jpg` (or `day-p.jpg` on portrait phones) is painted by CSS first, `day.mp4`'s src is
  set two frames after the load event, the orbit clip loads only when the close is within one
  screen, the campus clips load within 80% of a screen and play once at 45% visible, nothing loads
  under reduced motion. The film is never read from the scroll. It shows only through the opening
  window and the close.
- Rule 47: Ava 1520 UC Berkeley, Mateo 1570 Harvard, Priya 1540 Stanford, each clip mapped by
  name (`CLIP` in home.js, from assets/manifest.json) with its caption on one line, and "Karman 1:1
  tutoring, median 16 weeks" once, under the trio.
- Rule 45 and the founder's note: the only questions on the page are the engine's own renders
  and fragment of Karman originals (`alg-1` live, `adv-3` in three states).
- Device frames: none. No calendar drawing, no dashboard, no level meter, no eyebrow, no numbered
  marker, no em dash, no emoji.
- Prices: only from `copy.js`, which mirrors `src/lib/marketing/offer.ts`: Free $0, Platform $29 a
  month, Plus $49 a month, cohort $995 founding then $1,295, Private $1,495 for 10 hours and
  $2,495 for 20, School $10 per student a year. Six plans, never three cards, the free test a line.
- The guarantee in full on the home page: the promise, the three outcomes, the seven things Karman
  does, the four things the student does, the coverage line, on one full-width slip in two columns.
- One H1 per page, headings in order (H1, H2 per section, H3 inside), unique title and
  description, canonical, Open Graph meta, favicon from `../logo/favicon-ascent.svg`.
- The logo: `data-mark="ascent"` on each page's `<html>` is the one-line switch (threshold, answer
  or fullstop drop in); `shell.js` reads it for the lockups and the opening.

## 21st.dev

Thirteen components, each credited at the top of its file and listed with what changed in
`21st.md`: 28290 navbar, 554 theme toggle, 26630 hero with demo panel, 23570 tabs, 26909 gallery
with captions, 29356 order summary rows, 22433 ticket geometry, 18475 call to action, 28291 footer,
37311 switch, 23552 segmented control, 28540 pricing tiers list, 21218 comparison table. 25275
(stacking cards) was removed in round 4.

## Checks

All run on the final files, against the mocks-rooted server on port 8793 (round 4; the numbers are
repeated in the round 4 block below).

- `lint.mjs` on the folder: 0 FAIL, 0 WARN.
- `inspect.mjs` at 1440, 768 and 390: home 0 FAIL, 4 WARN; pricing 0 FAIL, 4 WARN. The WARNs, each
  defended in one sentence:
  - `palette-cream` (#f1ede4): this is Karman's bone, the token the logo folder and rule 58 name,
    not a yellow cream.
  - `font-fallback` "math": a KaTeX family inside the engine fragment, the app's own cascade.
  - `no-poster` (one clip): the day film carries no poster attribute on purpose; CSS paints the
    still so a phone never downloads the desktop still.
  - `size-count` at 768 and 390: the engine fragment and renders add their own sizes to the page's
    six steps (15, 17, 19, 30, 50, 58).
  - `no-footage` on pricing: the brief puts the film on the home page's opening and close only.
  - `off-centre` on pricing at 768 (23 left, 43 right): both gutters are 23 px; the inspector reads
    the right edge of the right-aligned text links inside the plan rows, which carry 20 px of padding.
- Overlap scan (`c-overlap.mjs`, 101 to 121 scroll positions, nothing excluded any more): clean at
  375, 440, 768, 834 and 1440 on both pages; never two marigold buttons on one screen; no sideways scroll.
- Contrast by calculation (`c-contrast.mjs`), every text element against the solid surface behind
  it, both pages, both modes: 0 under AA (home 113 elements, 10 pairs; pricing 198 elements,
  11 pairs; 0 elements left over the film without a solid card; 19 inside the engine fragment are
  the app's own cascade).
- Playwright click-through (`c-clicks.mjs`): 33 links on home and 36 on pricing, all local links
  200, 0 broken, 0 empty; the menu, the theme toggles, the film switch (accessible name "Background
  film"), the tabs, the date switch and the comparison (13 rows) work; the engine fragment mounts
  with 4 visible controls (the four choices), the skill label reads in full, a tap on B marks B
  wrong and C right and shows the explanation and the after line, a second tap changes nothing;
  controls under 44 px: 0; page errors: 0.
- Buttons at 375, 440, 834 and 1440: every marigold button one line of text and 56 px tall.
- The opening: first visit 1159 to 1168 ms, landed on the header slot to 0 px; in dark mode the
  mark is bone (#f1ede4) on the night ground (#151412), in light ink (#12110f) on bone (#f5f5f2);
  second load skipped; reduced motion a 306 to 309 ms fade.
- No horizontal scroll at 375, 440, 834 or 1440 (scrollWidth equals clientWidth in every capture).

## Screenshots

`/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/9fad26ef-dd92-4e98-8387-7e81608f80d5/scratchpad/redesign-c-bluebook-honest-r4/`
holds `<page>-<w>x<h>-<mode>-fold.png` and `-full.png` for index and pricing at 440x956, 375x812,
834x1194 and 1440x900, light and dark (32 files), plus `intro-<mode>-450ms.png` and `-800ms.png`.

## Critique rounds

```
ROUND 1
Seen in one second: a dark kitchen at dawn with a white test question on it.
Idea (one sentence): the page is the Bluebook screen; the first thing on it is a real Karman question the parent can answer.
Live thing: the engine question, answerable and checkable; on pricing, the SAT date switch.
Layout words by section: hero=card-over-film / daily=split / shared=stacking-sheets / campus=card-trio / guarantee=split-slip / dates=ticket / close=reply-card / footer=back
Scores: design 6.5 · usability 6 · creativity 8 · content 8 → overall 6.0 (capped)
Caps applied: inspector FAILs (headline 4 lines at 1440, sheet titles half covered, a link read as an eyebrow, 0 pictures and still page on pricing, a 1.2:1 pair on the date switch).
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. look1/index-1440: the H1 wraps to four lines in a 4/12 column and the Daily render sits at 62% scale, too small to read. Fix: a 780 px engine column with the words beside it; the Daily render at full width with phone renders under 760 px.
2. look1/index-390: the header covers the top of the H1 (grid centring overflowed upward) and the panel showed only two choices. Fix: align-content start under 1360 px, the engine at 720 px tall on phones.
3. taste/pricing desktop-fold: no pictures, no motion, a 1.2:1 pair on the segmented thumb. Fix: four Karman photos (hero, free line, private, school), the reveal on every part, the chosen cell fills with ink after the thumb lands.
```

```
ROUND 2
Seen in one second: the question panel on the dawn still; on pricing, "Every price, before you talk to anyone." with the parent and daughter.
Idea (one sentence): the test screen as the page; every section a sheet of the same test.
Live thing: the answerable engine question; the date switch and ticket.
Layout words by section: hero=card-over-film / daily=words-then-full-screen / shared=stacking-sheets / campus=card-trio / guarantee=split-slip / dates=ticket / close=reply-card / footer=back; pricing: hero=split-with-photo / free=band / plans=rows / guarantee=split / compare=bar / close=statement / footer=back
Scores: design 7.5 · usability 7.5 · creativity 8 · content 8 → overall 7.65
Caps applied: none (0 FAIL on both pages).
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. redesign-c-bluebook-honest/pricing-834x1194-light-full: the Private and School rows squeeze their text beside a 180 px photo and the action link wraps to three lines. Fix: under 1000 px the rows restack (photo and name on one row, text and link under them).
2. redesign-c-bluebook-honest/index-440x956-light-fold: the sentence says the question is "on the right", which is false on a phone. Fix: "One of the ten is here, in the real Karman engine, the way your student sees it."
3. taste/pricing desktop-fold (dark): a void between the H1 and the date question on the left while the photo stretches the rows. Fix: the lede and the switch align to the top, the photo at 400 px wide.
```

```
ROUND 3
Seen in one second: a real SAT question on a dark morning, and a marigold button.
Idea (one sentence): the page is the Bluebook screen, honest to the last sheet (rules, ticket, reply card).
Live thing: the engine question (answer, check, explanation); the date switch.
Layout words by section: as round 2, no two neighbours alike.
Scores: design 7.5 · usability 8 · creativity 8 · content 8 → overall 7.8
Caps applied: none.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. index-1440x900-light-full: the stacked sheets leave slices of earlier photos in the title bands (the tabbed-folder look of 21st.dev 25275); a juror may read the slices as clutter. Left as the direction's signature; the founder decides.
2. index-375x812-dark-fold: the engine's top bar wraps to two rows on phones, an engine fact (README) the site cannot change here; the stem is still on the first screen of the panel.
3. pricing-1440x900-dark-full: the night ticket on the near-night page reads as a quiet block in dark mode; the bone stub carries the price. A tone step under the ticket section would lift it; left for the founder's eye.
```

## For the founder

- Pick the mark: `data-mark` on each page's `<html>` (ascent is shown).
- The words are all in `copy.js` in the usual format; the hero sentence and the live-question lines
  ("One of the ten, in the real Karman engine. Answer it the way your student would.", "Right.",
  "Not this one.") are new.
- Whether the alg-1 question (the simplest of the eight originals) is the one to open with, or a
  Reading and Writing one (`conv-2`, the one-word choices, reads well on desktop but its top bar
  wraps to three rows on phones).
- CONFIRM items carried from the copy run: class days and times, the free test's start time, the
  enrollment close date, the May and June dates, the names Platform and Plus, the guarantee wording.

## ROUND 4 (fix round)

Fixes after the three judges' findings (`w3/judges-c-bluebook-honest.md`) and the shared list for
every direction. Served from the session scratchpad's `serve-mocks.mjs` on port 8793. Nothing
committed, nothing deployed, no new photo or film, no spend.

```
ROUND 4
Seen in one second: two solid cards on the dawn kitchen, the words left and a real SAT question right, one marigold button.
Idea (one sentence): the page is the Bluebook screen, with only the question of it on the first screen.
Live thing: the engine question (a tap grades it); on pricing, the date switch and the ticket with its price and button.
Layout words by section: hero=two-cards-over-film / daily=words-then-full-screen / features=four-flat-splits / campus=stepped-trio / guarantee=full-width-slip / dates=ticket / close=centred-reply-card / footer=back; pricing: hero=headline-question-ticket / free=line / plans=rows-with-table-folded / guarantee=split / close=words-beside-photo / footer=back
```

### The shared list

1. Campus clips: already mapped by name (`CLIP = { ava: "c8c", mateo: "c8a", priya: "c8b" }`, the
   manifest's ids), checked frame by frame against the captions: c8a-r0.jpg is the boy in the
   HARVARD sweatshirt (Mateo, 1570, Harvard), c8b-r0.jpg the STANFORD arcade (Priya, 1540,
   Stanford), c8c-r0.jpg the BERKELEY hoodie on the steps (Ava, 1520, UC Berkeley). Captions are
   one line each.
2. The engine on the first screen: the real fragment and `engine.css` stay. `hero-panel.css` hides,
   with `display: none` scoped to `.hero .karman-engine`: the top bar's tool cluster
   (`.min-h-14 .justify-end`: Calculator, scratch pad pen, Highlight, the 0:00 timer and Hide
   Timer, bookmark, the engine's own theme toggle, Settings, Menu), the Close quiz X
   (`[aria-label="Close quiz"]`), the bottom bar (`.h-16.bottom-0`: flag, Questions, Previous,
   Next), every Transfer to Calculator control (`[data-transfer-control]`, in the stem and on each
   choice) and the cross-out cluster (`[data-calculator-cluster]`). What stays is the subject and
   skill bar (the skill now wraps instead of truncating: "Linear equations (one variable)" in full),
   the ALGEBRA line, the stem and the four choices, styled by the engine. The bar and the question
   area sit in the flow, so the panel is as tall as the question: 720 x 487 at 1440, 380 x 487 at
   440, 315 x 518 at 375, choice D never clipped; on phones the bar is one row. The stem's `<h2>`
   becomes a `<p>` when mounted, so the page outline is H1, then the sections. Visible controls in
   the panel: 4 (A, B, C, D); a tap grades with the engine's own classes (border-success/40 and
   bg-success/15 on C, border-error/40 and bg-error/15 on the chosen wrong one); the result and the
   after line are the page's, under the panel. The page's "Check the answer" control and its result
   strip are gone (copy line `check` removed).
3. Buttons: one marigold button per screen; every `.btn` is one line of text and 56 px tall at 375,
   440, 834 and 1440 (measured by text rects: lines=1 for every button at every size). On the
   pricing page the first screen's button is the ticket's "Apply for a seat" (175 x 56 at 1440, 368 x
   56 at 440); the free-test line carries a text link and the close carries the free-test button.
4. Product pictures: every render is an `<img>` with `height: auto` at its natural 3:2 (desktop) or
   440:956 (phone) ratio, nothing drawn over it, no crop. The Daily 10 figure runs edge to edge on
   phones: 1.00x at 440, 0.85x at 375 (a 440 capture cannot reach 0.9x inside 375 px without a
   crop; kept and reported, see "could not"); desktop capture 0.65x at 834, 1.13x at 1440.
5. Contrast and overlap: the hero words and the panel each sit on a solid card in the page's ground
   over the film, and the close is one centred bone card, so no text is over the film any more;
   contrast 0 under AA (home 113 elements, 10 pairs; pricing 198 elements, 11 pairs) in both modes.
   The stacking sheets are gone; nothing sticky or fixed sits over text (the comparison table's
   sticky header row is plain now; the header still hides while reading down). Overlap scan clean
   at 375, 440, 768, 834 and 1440, 101 to 121 positions, nothing excluded. The guarantee slip is
   full width in two columns, the pricing close has its photo on the right, the comparison is
   folded under the plan rows: no desktop screen is mostly empty ground.
6. The opening: measured on a first visit, the overlay ground is `var(--paper)` (#151412 in dark,
   #f5f5f2 in light) and the mark is `var(--ink)` (#f1ede4 bone in dark, #12110f ink in light),
   visible in both (`intro-dark-450ms.png`, `intro-light-450ms.png`); nothing to fix in the page's
   call and nothing in `intro.js`. Duration 1159 to 1168 ms (the budget lives in intro.js, see
   "could not").
7. Replace, don't accumulate: `components/stack.css` and `stack.js` deleted with their stylesheet
   and script tags, 25275 removed from `21st.md`; the ticket's `.perf` dots removed from both pages,
   `ticket.css` and `ticket.js`; the `students` route and the footer's empty link removed; the
   copy's `check` line removed; the `.ticket .stub .lk` rule replaced; the section comments and
   the paragraphs above rewritten to the current state.

### The judges' findings, one by one

- Stacking sheets slide over the paragraph being read (rule 34; all three judges): fixed, four flat
  split sections at natural height, 21st.dev 25275 deleted.
- Hero text over the film fails AA on real frames (rule 33; all three): fixed, the words on a solid
  card in the page's ground, 0 under AA by calculation in both modes.
- Light mode opens dark (judge 1): fixed, in light mode the first screen is a light header and two
  off-white cards; the film shows only around them.
- The engine's toolbar on the first screen, 12 to 14 inert controls, three rows at 375 (all three):
  fixed, see shared item 2; visible controls in the panel are the four choices.
- "Linear e..." truncated at 1440 and 834 (all three): fixed, the label wraps and reads in full.
- Choice D clipped under the 540 px panel (judges 2 and 3): fixed, the panel is as tall as the
  question (auto height, no fixed height).
- "Check the answer" floats over choice D, lands below the fold on phones, is not the engine's
  Submit (all three): fixed by removal; the tap grades, the result sits under the panel, nothing
  floats over a choice.
- The stem is an H2 in the page outline, reading the KaTeX three times (judges 1 to 3): fixed, the
  stem is a paragraph in the mount; the KaTeX HTML layer already carries aria-hidden.
- Phone calculator side tab over choice C in the Daily 10 phone render (judges 2 and 3): could not
  here; it is inside the engine's own capture (README), and the brief says show the engine as it is.
- Campus trio as three equal cards (rule 6; all three): fixed, one clip large in the middle
  (Mateo, the clearest frame) and two smaller stepped beside it, captions one line each, no card
  frame around the trio.
- "Karman 1:1 tutoring, median 16 weeks" printed twice (all three): fixed, once under the trio.
- Comparison table's 51 checkmarks and 1 px "not included" dot (rule 16; judges 1 and 2): fixed,
  the words "Included" and "Not included".
- Empty footer link to map.html, unnamed for screen readers (all three): fixed by removing the
  entry (the map page is the October 31 mock's).
- Film switch has no accessible name (judge 1): fixed, aria-labelledby on the switch.
- Lede and "Answer it" both introduce the question (judge 1): fixed, the lede's last sentence
  dropped; the panel's label says "One of the ten, in the real Karman engine. Answer it the way your
  student would."
- "100 km up is the Kármán line" alone over a blurred frame (judge 2): fixed, the last small line
  inside the close card.
- Guarantee section's left half empty for a screen and a half (judges 1 and 2): fixed, the slip is
  full width in two columns under the heading and lede.
- Pricing close huddled left, "What each plan includes" bar on an empty screen, the 200 px hole in
  the pricing hero (judges 1 and 3): fixed, the close is words beside the parent-and-daughter
  photo, the comparison is folded under the plan rows, the lede and the date question share a row.
- Pricing first screen has no price and no button at 1440 (judge 3): fixed, the ticket with $995
  and "Apply for a seat" (marigold) is on the first screen at every size (button top 608 at
  1440x900; 562 at 440x956).
- Price stub before the product it prices on phones (judge 1): defended; on a phone the price is
  the top of the ticket, directly under the date question that names what it prices, and the
  inspector reads the other order as an eyebrow over the price.
- Ticket's dotted perforation (judge 3, taste house rule): fixed, the dots removed; the two notches
  alone say ticket.
- No floating free-test button on long scrolls (rule 35 as read by judge 1): defended; rule 34 and
  this round's brief keep every fixed element off the text being read, so the button appears in
  the first screen, the close and (on pricing) the ticket instead.
- Footer film switch is a visible film control (rule 38, judge 3): defended; it is the remembered
  footer control the round keeps, in the footer and never over the film.
- The opening holds a finished mark for 300 ms and runs 1.16 s (judge 3): could not; FORM, HOLD
  and TRAVEL are constants in `../logo/intro.js`, which this round does not edit, and `startIntro`
  takes no timing option. The founder can shorten them there.
- Google Fonts request for IBM Plex Sans and engine.css in the head (judge 3): defended; the
  fragment is the app's own cascade and font, and the brief keeps the real fragment.
- Lucide icons inside the engine (rule 2, judge 2): mostly gone from the first screen with the
  toolbar hidden; the Daily 10 renders still show the app's icons (an app decision for the founder).
- The day film is 4:4:4 and will not play on iPhones (judge 3): could not here; the files live in
  `.impeccable/mocks/decision/film/` and this round makes no film; flagged to the founder.
- Links lead to the October 31 mock's inner pages (judges 2 and 3): could not here; the inner
  pages are outside this round; flagged.
- The eight questions are diagnostic originals, not live bank rows (judge 3): could not here; the
  README records that no live row is an original; the founder decides.
- Plan rows as five identical cards (judge 3): defended; they are rows of one shape, with a photo
  on the two plans that have a person to show, which rule 17 allows.

### Numbers

- lint.mjs: 0 FAIL, 0 WARN. inspect.mjs: home 0 FAIL, 4 WARN; pricing 0 FAIL, 4 WARN (each
  defended in Checks above).
- Overlap: clean, 375, 440, 768, 834 and 1440, both pages; marigold buttons on one screen: never
  more than 1; sideways scroll: none (scrollWidth equals clientWidth in all 32 captures).
- Contrast: 0 under AA, 4 runs (two pages, two modes), 0 text elements left over the film.
- Clicks: 69 links, 0 broken; engine 4 visible controls, skill label full, tap grades B wrong and C
  right; controls under 44 px: 0; page errors: 0.
- Intro: 1159 to 1168 ms first visit, landing 0 px off; reduced motion 306 to 309 ms.
- Daily figure scale: 1.00x at 440, 0.85x at 375, 0.65x at 834, 1.13x at 1440.
- Buttons: 1 line, 56 px, at all four sizes, both pages.

### Could not

- The Daily 10 phone render at 375 shows at 0.85x, under the 0.9x floor: a 440 px capture cannot
  reach 0.9x inside a 375 px screen without cropping its frame, and the text is still 13.6 px.
  Left in place rather than removed, for the founder to call.
- The opening's timing, the film's 4:4:4 encoding, the old inner pages and the question source are
  outside this folder (above).
