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
it in at full width inside a `data-ui` root, and lets the four choices answer: the chosen choice
takes the engine's own error or success classes and the right one gets the check, the way the
engine's `wrong` and `correct` captures show it. The line under the box says what happened, in words
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
- **Fitts:** every control is at least 44 px; the free test button is 56 px tall and, on phones,
  full width and centred at the bottom in the dock; the engine's four choices are the engine's own
  full-width buttons; the phone menu's links are 56 px rows.
- **Peak-End:** the first screen is the real engine with a question the parent can answer; the last
  screen is the orbit film with the free test and "No card needed", then the name at full width.
- **Von Restorff:** one marigold button per screen; the "After" score is the only other marigold
  type on the home page; the plan actions are black text links so the free test stays the one
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
first paint, playing in real time, never driven by scroll, the orbit clip (`c9`) crossfading in at the
close; poster still first (`day.jpg`); no film under reduced motion; two device frames at most on the
home page (one phone frame around the phone capture, and the engine box); no calendar drawing, no
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
