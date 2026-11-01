# b-apple-product: the product page

Built 2026-11-01 on branch `claude/first-pass`. Home (`index.html`) and pricing (`pricing.html`),
with the header, the phone menu, the footer, the theme toggle, the logo opening and the film behind
the page. Every visible word is in `copy.js`. Serve from `.impeccable/mocks` so the relative paths
to `../engine/`, `../logo/` and `../../decision/film/` resolve (this build ran a copy of
`decision/serve.mjs` with its root moved one folder up, on port 8773:
`http://127.0.0.1:8773/redesign/b-apple-product/index.html`).

## The idea sentence

On this page, **the real quiz engine screen, with a real Karman question the parent can answer,**
becomes **the product shot on the box**: the way a hardware page opens on the object at near 1:1,
this page opens on the thing the student will actually use, and every screen after it shows one
feature at full width with one claim, one proof and one picture.

The borrowed category (direction "Dressed as something else") is the hardware product page: the
founder's own craft bar (Jack Westin's JW+ page, apple.com). It was named before anything was built.
The competitor test: put another SAT company in the sentence and it fails, because no other SAT site
can put its own quiz engine on the front page with its own original question; the engine renders in
`../engine/` are real Playwright captures of Karman's `QuizEngine` on Karman-original questions.

## The live thing

The hero question. `site.js` `liveQuestion()` fetches the real engine fragment
(`../engine/fragments/alg-1.html`, then `data-4`, `adv-3`, `geo-5` on "Try another question"), drops
it in at full width inside a `data-ui` root, hides the controls that do nothing on a marketing page (see
ROUND 4), and lets the four choices answer with the engine's own classes for the chosen, the right and the
other choices, the way the engine's `wrong` capture shows it. The line under the box says what happened, in words
from `copy.js`. Nothing is drawn by hand; no question is invented (rule 45). Fallback: with no script
the hero still reads (headline, sentence, button) and the box is simply empty ground.

## The direction dealt

`node draw.mjs --sector education --sections showcase,features,proof,pricing,cta,footer --keep palette,type --have video,photography,product-ui --options 3`
dealt `page-is-the-object`, `borrowed-category` and `one-motif`. Taken: **`borrowed-category`, seed
653695794** ("Dressed as something else"), because the brief's world is exactly that: SAT prep sold
with the manners of a hardware product page. The full sheet is in `.taste-skill/b-apple-product/`.

Adjustments to the dealt blueprints, each for a stated reason:

- Hero "Flush-left shout, seam photograph" asked for a 2 to 4 word shout and a tilted poster scrap.
  The brief (and the founder's craft bar) wants the product at near 1:1 as the hero image with the
  film as a quiet band behind it, so the hero is the headline row on the page ground, then the real
  engine over a window onto the film. The shout survives as a four-word instruction headline.
- Showcase "Two giant words compared" became the proof section: 1235 and 1520 as the two specimens,
  counted up (21st.dev 20068), captioned Before and After under the figures (above them the inspector
  reads a label as an eyebrow), with the 1:1 line beside.
- Features "Capabilities as a menu" became the platform spec sheet: one plain table, the tool, what it
  does, which plan; no scalloped paper edge (it draws a line the house rules ban, and a product page's
  tech-specs table is the honest version of the same device).
- Proof "Names running off the edges" was not used: there are no names to run (no testimonials exist,
  rule 12). The proof is the track record and the campus trio (rule 47).
- Pricing "The ticket" cannot hold six plans; the brief wants a comparison a parent reads top to
  bottom, so the pricing page uses the 21st.dev tiers list (28540) and comparison table (21218)
  instead of a ticket. Recorded as a section redraw by content, not by comfort.
- CTA "One word is the button" conflicts with the copy rule that every button carries a verb and an
  outcome ("Take the free practice test") and with rule 35 (one highlighted button, everything else a
  text link). The close is a solid night panel over the orbit clip with the headline, the sentence,
  the one button and the honest note.
- Footer "Contact as the headline" became the giant wordmark close (21st.dev 35508): the name returns
  at full width, the email sits in the first column.

## The six laws, where each one shaped a decision

- **Hick:** the header holds three links and the menu seven; every screen has one button or one text
  link; the plan rows each carry one action; the comparison table on phones is a list of "the tool,
  and the plan it starts in" rather than a six-way picker.
- **Jakob:** a product page a parent has seen before: claim row, picture, next feature; a pricing
  list top to bottom with the price at the left; a plain table; a footer with columns; a Menu word on
  phones that opens a full sheet; a sun-and-moon toggle.
- **Fitts:** every control is at least 44 by 44 px (measured in ROUND 4); the free test button is 56 px
  tall; the engine's four choices are the engine's own full-width buttons; the phone menu's links are
  56 px rows; each plan's action sits under the plan's own words.
- **Peak-End:** the first screen is the real engine with a question the parent can answer; the last
  screen is the orbit film with the free test and "No card needed", then the name at full width.
- **Von Restorff:** one marigold button per screen and nothing else in marigold (ROUND 4 measured one
  marigold element per page, `a.btn`); the plan actions are text links so the free test stays the one
  highlighted action on the pricing page.
- **Tesler:** the page carries the complexity: the guarantee in full (promise, baseline, three
  outcomes, seven things Karman does, four things the student does, who is covered) so the parent
  decides one thing; the pricing page prints every price including the later cohort price and the
  three-payment figure; the film loads after first paint and plays by itself.

## Rules kept

Rule 33 (device mode, dark when it states none, toggle remembered in `localStorage`); rule 38 (no
pause button on the film; the footer carries the film switch, remembered); rule 47 (Ava 1520 UC
Berkeley, Mateo 1570 Harvard, Priya 1540 Stanford with "Karman 1:1 tutoring, median 16 weeks");
one continuous film (`day.mp4`, `day-p.mp4` on portrait phones) fixed behind the page, loaded after
first paint only on a page with a window onto it (never on pricing), playing in real time, never driven by scroll, the orbit clip (`c9`) crossfading in at the
close; poster still first (`day.jpg`); no film under reduced motion; no drawn device frame (the phone capture
stands on its own at 1:1, rule 44); no calendar drawing, no
fake dashboard, no level meter; prices only from `copy.js` mirroring `offer.ts`; the free test never
a card; one H1 per page, headings in order, unique title and description, canonical, Open Graph,
favicon from `../logo/favicon-ascent.svg`.

The mark: `MARK = "ascent"` in `site.js` is the one-line switch; the opening is `../logo/intro.js`
into the header's slot, once per session, 0.3 s fade under reduced motion.

## 21st.dev

See `21st.md`: 24622 (hiding header), 19240 (reveal), 20068 (count up), 23552 (segmented control),
28540 (pricing tiers list), 21218 (comparison table), 35508 (giant wordmark footer), 37311 (switch).

## Critique rounds (taste-skill format)

```
ROUND 1 (first render, 1440 dark)
Seen in one second: a big headline over a dark app screen with a question in it.
Idea (one sentence): the real quiz engine is the product shot; every screen after it is one feature at full width.
Live thing: the hero question, answered on the page (not yet working: the engine's stem wrapped into three lines).
Layout words by section: hero=stage / daily=offset / tutors=split / tests=stack / parents=split-mirror / results=statement / guarantee=columns / campus=trio / platform=table / close=statement / footer=wordmark
Scores: design 6 · usability 6 · creativity 8 · content 8 → overall 6.6
Caps applied: inspector FAILs (8 headlines past two lines, Before/After read as eyebrows) → 6.0
Top three problems:
1. The engine's question stem broke into three lines ("If 3x+5=26 / , what is the / value of x?") in desktop-fold.jpg: the page's own h2 rule (max-width 13ch) leaked into the fragment. Fix: scope every page type and reset rule with :where(:not(.karman-engine *)); rename the reveal hook to data-rise because the engine's own markup carries data-reveal.
2. Eight section headlines ran to three or four lines (desktop-page-02.jpg): the 13ch measure. Fix: 20ch, 16ch in the split sections at 64px, 16ch in the close panel.
3. Campus clips and the platform table sat dark in the full-page sheet: posters only loaded near the section and the reveal never fired past the inspector's walk. Fix: static posters on the clips, reveals 60% early.
```

```
ROUND 2 (after the fixes, 1440 and 390, dark; light checked in the sixteen screenshots)
Seen in one second: "Try a Karman question." over the real question screen, on the film.
Idea: unchanged, and it now survives the competitor test on screen (the engine is Karman's).
Live thing: works; a click marks the right answer with the engine's own check and the wrong one in its error tint; "Try another question" loads the next real question.
Layout words by section: as round 1; no two neighbours share a word.
Scores: design 7.5 · usability 7.5 · creativity 8 · content 8.5 → overall 7.7
Caps applied: none (0 FAIL at 1440, 768, 390 on both pages)
Top three problems:
1. The Daily 10 screen: the three returns (2, 7, 21 days) sat small and stranded beside a tall phone (desktop-page-01.jpg). Fix: the numbers at 120px with the lead-in "A missed question comes back after", a row of three on phones.
2. The footer's theme label read the current mode next to the icon for the other one ("Dark mode" beside a sun). Fix: the word names the action, like the button's label.
3. The floating button covered text while scrolling at 768 (covered-text FAIL) and the sticky table header sat over rows (overlap scan). Fix: the dock shows only on the way back up, like the header; the table header is no longer sticky (rule 34).
```

```
ROUND 3 (final, both pages, both modes)
Seen in one second: the question screen; on pricing, the headline and the parent-and-daughter photo.
Idea: carried into pricing (rows read like a spec sheet, the table like tech specs) and into the footer (the name at full width).
Live thing: the hero question, plus the pay-in-full / three-payments switch on the pricing page.
Layout words by section: home as above; pricing: hero=split / plans=rows / compare=table / guarantee=columns / close=statement / footer=wordmark
Scores: design 7.5 · usability 8 · creativity 8 · content 8.5 → overall 7.8
Caps applied: none
Still short, in order:
1. The engine at 390 wide shows the real top bar wrapped to three rows before the question (an engine fact noted in ../engine/README.md, not a page fault); a phone-specific engine capture would read cleaner, but only the engine team can change that.
2. The home page is 15.8 screens at 1440: the platform table and the close sit past the inspector's 11-screen walk (its one remaining blank-gap WARN); the sixteen full-page screenshots show them filled.
3. The pricing page's right margin reads 91px to the inspector because the plan rows' text links end inside their filled rows; the rows and the hero photo reach the margin. Defended, not fixed.
```

## Checks, all run on the final files

- `lint.mjs` on this folder: 0 FAIL, 0 WARN.
- `inspect.mjs` at 1440, 768 and 390 (`?intro=0` so the walk starts on the page, the opening measured separately):
  home 0 FAIL, 5 WARN; pricing 0 FAIL, 3 WARN. Each WARN in one sentence:
  `palette-cream` text #f4f3e7 is the engine's own ivory inside the `data-ui` fragment;
  `font-fallback` "math" is KaTeX's MathML family inside the engine, which the site cannot load;
  `size-count` 13 sizes counts the engine's and the page's together (the page itself uses 15/17/18/22/24 plus the four display steps);
  `no-poster` the two stage videos use the CSS still (`day.jpg`) so a phone never downloads the desktop poster;
  `blank-gap` on home is the stretch past the inspector's 11-screen walk, shown filled in the full-page screenshots;
  `off-centre` on pricing is the plan rows' text links ending inside their filled rows.
  Output in `/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/9fad26ef-dd92-4e98-8387-7e81608f80d5/scratchpad/taste-b-apple-product/{home,pricing}/`.
- Overlap scan (the film mock's scan, re-pointed at these pages with their own selectors, 101 positions each): home clean at 375, 768 and 1440; pricing clean at 375, 768 and 1440.
- Contrast by calculation, both modes, every text colour pair (engine fragment excluded as the product's own): home light 15 pairs, pricing light 9, home dark 20, pricing dark 12, 0 under AA; lowest pair 6.23:1 (#57534b on #e9e8e2, 15px). No text over the film: the close sits on a solid night panel.
- Clicks with Playwright at 1440 and 375 on both pages: every link resolves (local pages 200, external ones on karmanprep.com, mailto for the school pilot and the email), the header and footer theme toggles flip `data-theme` and remember it, the film switch toggles and remembers, the menu opens with focus on Close, closes on Escape, on Close and on a link, the hero question marks the choice and "Try another question" loads `data-4`, the segmented control switches $995 to $345 and back with the arrow keys. Zero console or page errors.
- The opening: 1168 ms on first load, landed on the header slot to 0 px; skipped on the second load ("seen this session"); a 340 ms fade under reduced motion.
- Screenshots at 440x956, 375x812, 834x1194 and 1440x900, light and dark, both pages (sixteen files):
  `/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/9fad26ef-dd92-4e98-8387-7e81608f80d5/scratchpad/redesign-b-apple-product/{index,pricing}-{440x956,375x812,834x1194,1440x900}-{light,dark}.png`.
  No horizontal scroll at any of them (scrollWidth equals clientWidth).

## For the founder

- The hero question is the real engine; the choices answer on the page. Say if you would rather it open on a Reading and Writing question (those lay out as two columns on desktop and the top bar covers the first passage lines at phone width, an engine fact).
- The floating button follows the header: it appears only while scrolling back up, so nothing fixed ever covers the text while you read down (rules 34 and 35 together).
- Links to the SAT Program, Private tutoring, the guarantee, FAQ, About and the free test go to the existing mock pages in `decision/film/`; Sign in, Terms, Privacy and Cookies go to karmanprep.com.
- The server was stopped at the end of the build.

## ROUND 4 (fix round, 2026-11-01)

Served with `node scratchpad/serve-mocks.mjs 8792` (`http://127.0.0.1:8792/redesign/b-apple-product/`).
Every fix moves toward simple and calm: nothing fixed over the page, one accent, pictures at 1:1.

### What changed

- **Campus clips** are found by the student's name (`CLIP = { ava: "c8c", mateo: "c8a", priya: "c8b" }`
  from `assets/manifest.json` and `decision/film/film.js`), never by order. The still is `c8?-r.jpg`, the frame
  with the student and the lettering in it, checked by eye against each caption: Ava, 1520, UC Berkeley is the
  BERKELEY hoodie with Sather Tower; Mateo, 1570, Harvard the HARVARD sweatshirt; Priya, 1540, Stanford the
  STANFORD sweatshirt under the arcade. The trio is one edge-to-edge strip with a 2 px seam, not three framed cards.
- **The engine on the first screen** keeps the real fragment and `engine.css`. A page-side stylesheet scoped to
  `.engine-box .karman-engine` hides, with `display: none`: the top bar's tool group (Calculator, the scratch
  pad pen, Highlight, the 0:00 timer and Hide Timer, bookmark, the engine's own theme toggle, Settings, Menu,
  the close X), the bottom bar (flag, Questions, Previous, Next), each choice's cross-out and Transfer to
  Calculator (`[class^="_choiceTools"]`), and the stem's Transfer to Calculator (`[data-transfer-control]`).
  The bar, the content area and the engine root are laid out in the flow of the page (`position: relative`
  instead of the engine's absolute viewport layout) so the box is as tall as the question: 487 px at 375, 440 and
  834, 489 px at 1440, bar one row of 56 px, all four choices inside the box (choice D ends at y=1003 on a 375
  page whose box ends at 1035). The skill label is unwrapped from `.truncate` and reads "Linear equations (one
  variable)" in full at every size. Visible controls inside the engine: the four choices and nothing else
  (probe counted 4 of 4 visible buttons, against 29 before). A choice grades with the engine's own classes from
  `ActiveQuizScreen.tsx`: chosen wrong `border-error/40 bg-error/15` with the badge `bg-error text-ivory`,
  right `border-success/40 bg-success/15` with `bg-success text-night` and the check, the others
  `border-bronze opacity-50` with `bg-surface-raised text-taupe`, every choice `disabled` after the answer
  (probe: `EdSd`, all four disabled). "Try another question" loads the next real fragment; the order is alg-1,
  adv-3, geo-5, data-4, so the data-4 stem that wraps to a line starting with a period comes last.
- **Buttons.** One marigold button per screen, 251 x 56 px, one line of text, at 375, 440, 834 and 1440
  (measured); the floating dock is gone (it covered body text, rule 34), so the close holds the second one,
  never on the same screen (overlap scan: no step with two buttons).
- **Product pictures.** Every engine render keeps its proportions (`img { height: auto }`, the width and
  height attributes only reserve space). Daily 10: the phone capture of the wrong state, no drawn frame, 440 px
  wide at 1x on 834 and 1440, 1x edge to edge at 440 (0.927x inside the margins was under 1x, so under 472 px the
  box runs full width), hidden under 396 px where 0.9x cannot be reached (so at 375 the words and the three
  returns stand alone). Tests: adv-3 in the question state (light and dark pairs exist, so the picture follows
  the theme), the desktop capture at 1x on 1440 and 0.664x on 834, the phone capture of the same question from
  767 px down (767 is the last width that shows the desktop one at 0.6x). Both boxes end in the empty engine
  ground above the bottom bar (desktop 2:1 of 1200 x 800, phone 440 x 640 and 440 x 700), so the lower half of
  empty ground is gone and no word is cut. data-4's tools capture (dark only, stem break) is no longer used.
- **Contrast and overlap.** The header is in the flow of the page: nothing fixed or sticky remains except the
  menu sheet the reader opens (overlap scan with a fixed/sticky probe: none at 808 positions). "Back to top"
  sits above the giant wordmark. The phone "which plan" column and the comparison list read in the field's
  second ink, not marigold (was 4.35:1 in light, now 8.05:1). No text over the film: the close is a solid panel,
  the engine note a solid panel.
- **The opening.** `intro.js` paints the overlay with `color: var(--ink)`, which on this page is the light
  ink in both modes, so in dark mode the mark formed in #12110f on #0e0d0c (1.04:1). `intro.js` is shared and
  not edited; the page sets `.k-intro { --ink: var(--ground-ink); }` so the forming mark reads the ground's
  ink: bone #f3f3f0 on night #0e0d0c in dark (16.6:1), ink #12110f on bone #f5f5f2 in light (probe:
  `fill rgb(243,243,240)` on `rgb(14,13,12)` dark, `rgb(18,17,15)` on `rgb(245,245,242)` light). For the
  shared file: the overlay's colour should come from the ground's ink token, or take an `ink` option.
- **Marigold** is the button's alone: the 2/7/21 digits, the After score, the guarantee bullets, link
  underlines, the comparison marks, the film switch and the plan column all read in ink or the field's second
  ink. Probe: one marigold element per page (`a.btn`) at every size and mode.
- **Removed (replace, don't accumulate):** the dock and its copy line; the hiding header (21st 24622) and its
  scroll listener and `.hd-space`; the count-up (21st 20068) and `data-count`; the reveal's blur; the phone
  frame; the platform spec sheet on the home page (its 14 rows live on pricing as the comparison and the
  phone list; `Platform.headline` left copy.js); `.btn.quiet`, `.mari`, `.sr`, `.hero .try`, `ICON.up`,
  `ICON.dash`; the `--fa-mari`/`--fb-mari`/`--mari-ink` tokens; the marigold check discs.
- **Also:** the header names the sections (The SAT Program, Private tutoring, Pricing, Sign in; site principles
  section 2), so "Free practice test" is no longer a third route on the first screen; the hero headline carries
  the claim ("SAT prep you can try before you pay.") with the question as the proof under it, and "Free." opens
  the button note; each feature says the plan's price ("In Platform ($29 a month) and up", from offer.ts);
  guarantee outcomes are one list of three rows, not three cards in a row (both pages); the plan action sits
  under the plan's words; every tap target is 44 px (footer links, Back to top, the film switch's hit area, the
  segmented buttons); corners are 8 px on panels and square on every picture and the engine box; the day film
  loads only on a page with a window onto it (pricing requests `c9.jpg, c9.mp4` only; home `day.jpg, day.mp4`
  plus the clips as they come near); the fragment keeps `data-ui` for the taste inspector.

### Judge findings and what was done

| Finding (judges 1, 2, 3) | Outcome |
| --- | --- |
| Rule 47: campus captions under the wrong students (clips mapped by index) | Fixed: mapped by name, stills checked against captions |
| Rule 33: opening invisible in dark mode (mark #12110f on #0e0d0c) | Fixed in the page (`--ink` on `.k-intro`); intro.js finding recorded above |
| Rule 34: "Back to top" under the giant wordmark | Fixed: the meta row sits above the word |
| Rule 34: the dock covers text on the way up; the returning header covers 74 to 77 text boxes | Fixed: dock removed, header in the flow of the page; scan finds no fixed element |
| Rule 34 inside the engine: three-row bar over the eyebrow at phone widths, Highlight clipped, Settings at x=-24 | Fixed: the tool group is hidden; the bar is one 56 px row |
| Engine chrome: 25 of 29 controls dead, the engine's own theme toggle under the site's | Fixed: hidden; the four choices are the only controls |
| Rule 44: product pictures distorted (no `height: auto`), tests capture at 0.29x on phones, Daily 10 at 0.75x | Fixed: natural proportions, 1x captures, phone capture under 768 px, hidden under 396 px |
| Rule 44: the answered state was a page-side imitation | Fixed as far as a static fragment allows: the engine's exact classes for all four choices, disabled after the answer; the engine's Show explanations / Next question buttons are not in the fragment, so the page's own "Try another question" link stays (said on the page as "the way the engine shows it") |
| Rule 44: Daily 10 phone capture shows the Calculator side tab over choice D | Defended: it is the real phone screen and every math phone capture carries the tab (engine README); the capture is now at 1x so it reads as the tab it is |
| Rule 33: "which plan" column 4.35:1 in light | Fixed: 8.05:1 |
| Rule 6: three guarantee outcome cards in a row; the campus trio as three framed cards | Fixed: outcomes as one list of three rows; the trio as one edge-to-edge strip |
| Rule 16 / Von Restorff: 57 to 70 marigold check discs; marigold on digits, bullets, underlines, switch | Fixed: ink discs and dashes; marigold only on the button |
| Rule 19: 14 px and 44 px radii everywhere | Fixed: 8 px panels, square pictures, the one pill button |
| Rule 37: 1235 and 1520 count up | Fixed: static figures |
| Rule 58: the CSS phone frame without an island | Fixed: no frame |
| Principle 7 / Fitts: footer links 40 px, switch 28 px, segmented 38 px, Back to top 23 px | Fixed: all 44 px (probe lists no target under 44 x 44) |
| Principle 11.18: the 1.2 s opening delays every first visit | Defended: the founder asked for the logo opening; its timing lives in the shared `intro.js` (1,174 to 1,209 ms measured); a tap, key or scroll skips it; it runs once per session |
| Copy rules 4 and 9: the headline names an action, no price on the home page | Fixed: claim headline, "Free." in the note, each feature names its plan's price |
| Principle 11.7: 15.7 screens at 1440, spec table duplicated | Fixed in part: 11.6 screens at 1440 (10,432 px), 13.4 at 375; the spec sheet left home; the guarantee stays in full because the headline promises it (Tesler) |
| Site principles section 2: header lacks the named sections | Fixed |
| Lucide icons and 10 to 12 px labels inside the fragment | Defended: engine facts; the hidden chrome takes 25 of the 27 Lucide SVGs and the 12 px tool labels off the first screen; the 11 px eyebrow and 12 px section label stay as the engine draws them |
| data-4 stem breaking to a line starting with a period | Fixed in part: data-4 is last in the order and no longer the Tests picture; the break itself is an engine fact |
| Speed: day.mp4 on pricing with no window; 25 MB on home | Fixed for pricing (no day film); home still loads the day film for its window (the strips around the engine), kept by the direction |
| 21st.dev components invisible as such | Defended: the brief asks for ported, recoloured components; two were removed for the rules, the rest are credited in `21st.md` |
| The free test page's old chrome after the main button | Not in this folder: the link goes to the existing `decision/film/free-test.html` mock |
| Faint grey block beside the engine's theme icon at 375 | Moot: the toolbar is hidden |

### Checks, all on the final files

- `lint.mjs` on this folder: 0 FAIL, 0 WARN.
- `inspect.mjs` at 1440, 768 and 390 (`?intro=0`): home 0 FAIL, 4 WARN; pricing 0 FAIL, 2 WARN. Each WARN:
  `palette-cream` and `font-fallback` are the engine fragment's ivory text and KaTeX's math family;
  `size-count` 14 (home) and 13 (pricing) sizes count the engine's, the giant figures and the wordmark with the
  page's 15/17/18/22; `no-poster` is the stage video that uses the CSS still (`day.jpg`) so a phone never
  downloads the desktop poster. Output in `scratchpad/taste-b-apple-product-r4/{index,pricing}/`.
- Overlap scan (`scratchpad/bap4/overlap.mjs`, 101 positions, with a probe for any fixed or sticky element
  and for two buttons on one screen): home and pricing clean at 375x812, 440x956, 834x1194 and 1440x900.
- Contrast by calculation (`bap4/contrast.mjs`), every text element, both modes, 1440 and 375: home light 6
  pairs, pricing light 9 to 10, home dark 8, pricing dark 12 to 13; 0 under AA; lowest 6.23:1 (#57534b on
  #e9e8e2, 15 px); 0 text elements over the film; marigold button text 9.11:1.
- Clicks (`bap4/clicks.mjs`) at 1440 and 375 on both pages: 10 local links 200 each, 4 (home) and 7 (pricing)
  on karmanprep.com, mailto for the school pilot and the email; header, menu and footer theme toggles flip
  `data-theme` and store it; the film switch toggles and stores; Back to top; the menu opens with focus on Close
  and closes on Escape and Close; the question grades (A wrong: `EdSd`, all choices disabled), "Try another
  question" loads adv-3 and C grades right; the segmented control switches $995 to $345 and back by arrow key.
  Console and page errors: 0.
- The opening (`bap4/intro.mjs`): 1,209 ms dark, 1,174 ms light, landed on the header slot to 0 px; bone on
  night / ink on bone measured; 312 to 345 ms fade under reduced motion; skipped on the second load.
- Media (`r4-probe2`): pricing requests `c9.jpg, c9.mp4` only; home `day.jpg, day.mp4, c9.*` and the clips.
- Screenshots at 440x956, 375x812, 834x1194 and 1440x900, light and dark, both pages, fold and full page
  (32 files), plus the opening at 150, 450 and 750 ms in both modes and the answered state:
  `/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/9fad26ef-dd92-4e98-8387-7e81608f80d5/scratchpad/redesign-b-apple-product-r4/`.
  Page heights: home 10,432 px at 1440 (11.6 screens), 10,868 at 375, 12,155 at 440, 9,802 at 834; pricing
  6,534 at 1440 (7.3 screens), 8,285 at 375. No sideways scroll at any of them.
- The server was stopped at the end of the round.

### For the founder, after this round

- The hero headline is now "SAT prep you can try before you pay." and each feature names its plan's price;
  both are copy changes in `copy.js`, yours to keep or rewrite.
- On a 375 px phone the Daily 10 and Tests pictures are gone (they could not show at 0.9x); the hero's live
  question is the product picture there. On the iPhone 17 Pro Max (440) both show at 1x.
- The header no longer hides and returns; it scrolls away with the page, and the footer carries the links.
- The 1.2 s logo opening stays; say if you want it shorter, since that change lives in the shared `intro.js`.
