# Scoreboard: notes for the founder

Direction for the home page, built 2026-11-01 from a clean slate. Open it at
`http://127.0.0.1:8813/fresh/scoreboard/index.html` after
`node .impeccable/mocks/serve-mocks.mjs 8813`. Add `?opening=off` to skip the logo opening.

## The idea in one line

The score is the subject: a Swiss, numbers-first page where every claim sits next to its number,
the real practice screen is the hero picture, and Karman's three official 1:1 scores are the
largest type on the page.

## What is on the page, top to bottom (after the fix round)

Every heading and paragraph starts at column 1. Pictures, the live question and tables sit on the
other side, from column 7. Under 1200px (hero) or 900px (other sections) it stacks in reading order.

- **Hero.** "The SAT score before you pay.", the lead, the one marigold button and four facts
  (December 12, about 49 questions, live on Zoom, $0). Beside it: "Try one of our questions. Pick
  an answer." and a live Karman original (adv-3) in the real engine, which grades itself.
- **Your Daily 10.** The 2, 7 and 21 day line, drawn in ink so it reads in both modes, beside the
  bus photograph.
- **Results.** A marigold field: "Official SAT scores." and "Karman 1:1 tutoring, median 16 weeks"
  on the left; 1570 Mateo, Harvard / 1540 Priya, Stanford / 1520 Ava, UC Berkeley on the right.
  No portraits.
- **March program.** Title and text, then tutor and student each at home, then 18 / 6 / 5 / $995.
- **Guarantee.** Text, what your teen does and the Private 20 remedy on the left; the table right.
- **Parent updates, plans table (three columns, from offer.ts only), questions, close** (the
  date, days to go, the every-month answer, the button), footer.
- **The dock.** A full-width bar at the bottom with the same button. It slides up only when the
  reader scrolls back up, and only while no other button is on screen.

## Identity

- **Type:** Instrument Sans (Google Fonts), one family for everything. Headlines 600 with tight
  tracking; the scores use the narrower width axis. IBM Plex Sans loads only for the real engine.
- **Colour:** light ground #f1f0ec, step #e6e5e0, ink #121314, secondary #46484c. Dark ground
  #111213, step #1c1d1f, ink #ecebe6, secondary #a9aaa5. One marigold #f2a30f for the button and
  the results field. Guarantee field: #121314 (light) / #232427 (dark).
- **Shape:** square corners everywhere, no shadows, no gradients, no rules outside real tables.
- **Logo:** drawn by hand on a 20-unit grid. The mark is the Karman line: a marigold line at cap
  height over a block that rises to the x-height. The wordmark is a geometric lowercase "Karman"
  built from one stroke. Header, menu and footer all use it.
- **Opening:** first visit only. The block rises, the line draws, the word wipes in, then the
  lockup flies into the header. 1.24 s. Any key, tap, click or scroll skips it; reduced motion
  gets a plain fade.
- **Motion:** masked headline lines, staggered section entrances, score digits that blur-slide in,
  press feedback on every button, and the dock sliding up on scroll up.

## Checks (after the fix round)

- **Screenshots:** 375x812, 440x956, 834x1194, 1440x900, light and dark, fold and full page, in
  `/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/eae5e585-9868-40a3-bd97-fb3ad26100f3/scratchpad/fresh-scoreboard/shots/`.
  All looked at.
- **Sideways scroll:** 0 px at all four sizes, both modes.
- **Overlap scan (rule 34):** 0 text overlaps at every half-screen step, scanned down the page and
  back up (375: 49 steps, 440: 41, 834: 33, 1440: 37, each in both modes). The dock showed at
  19 / 14 / 11 / 14 of those steps (only on the way up) and is opaque; text behind it counts as
  past the window edge.
- **One highlighted button on screen (rule 35):** at most 1 at every step, every size, both modes.
- **Contrast, calculated:** 14 text colour pairs per mode, all pass. Lowest: light #46484c on
  #e6e5e0 = 7.26:1; dark #a9aaa5 on #1c1d1f = 7.21:1; button #111213 on #f2a30f = 8.95:1. Engine
  pairs: lowest 5.83:1 (light). No text sits on a photograph.
- **Links:** every in-page link has its target and scrolls to it. karmanprep.com/free-practice-test
  (three buttons), /program, /guarantee, /pricing, /terms, /privacy return 200.
  **/cookies returns 404 on the live site** (the page exists in the repo, `src/app/(site)/cookies`).
- **Controls clicked:** answer A (wrong, C shown right), Try it again, answer C (right); header mode
  button (dark to light, saved, engine follows, kept after reload); Auto / Light / Dark switch;
  phone menu (focus inside, Escape returns focus, a link closes it, Close closes it); the dock
  (hidden at the hero, hidden while scrolling down, shown on scroll up, hidden at the close
  button, its button goes to the free test).
- **Opening timed:** 1,241 ms light, 1,242 ms dark; a key press at 250 ms skips it (gone at
  427 to 428 ms); not shown on the second load; reduced motion fade 851 to 852 ms.
- **Taste lint:** 0 FAIL, 0 WARN. **Taste inspect:** 0 FAIL, 4 WARN, all defended: cream text and
  the "math" font come from inside the real engine (KaTeX); no film (no video budget this round);
  "empty middle" in results is the grid doing its job (claim and source on the reading column,
  the scores on the media column).
- **Console:** 0 errors at every size and mode.

## Self-critique (taste-skill format)

```
ROUND 1
Seen in one second: a real quiz screen across the top, "Know the score before you pay." in big type, one marigold button.
Idea (one sentence): the SAT score is the subject, and every claim stands next to its number.
Live thing: a Karman original that grades itself in the real engine; a live count of days to December 12.
Layout words by section: hero=masthead band + title on the axis / practice=text + live engine / daily=photo + day line / results=marigold scoreboard / program=axis text + photo pair + tally / guarantee=dark field + table / updates=photo + text / plans=large table / faq=run-in columns / close=date + photo / footer=full-width wordmark.
Scores: design 7.5 · usability 7.5 · creativity 7.5 · content 8 → overall 7.6.
Caps applied: none (headline rule nearly tripped).
Top three problems:
1. Hero 1440: half the screen tile was the empty explanation panel, a blank ivory hole beside the photo. Fix: crop to the question plus the explanation line, give the photo half the band.
2. Phone practice: a 112px blank band inside the engine above the question (its top bar wraps on phones but the tools are hidden). Fix: set the content's top to the real bar height.
3. Three headings ran to three lines (results 1440, updates iPad, program phone, guarantee 1440 at four). Fix: wider measure for results and guarantee, shorter words for program, updates and the close date.

ROUND 2
Seen in one second: same, with the person now as large as the product.
Scores: design 7.8 · usability 8 · creativity 7.5 · content 8 → overall 7.8.
Caps applied: none.
Top three problems:
1. Day line: "0" and "2" crowd each other on phones. Fix: the 0 tick keeps its "Missed today" label and drops the numeral.
2. Guarantee table on phones: the first column wrapped to three lines at lead size. Fix: body size and a 42% column under 520px.
3. Hero fact "Price $0" said nothing. Fix: "$0 for the test, the score and the call", balanced wrap.
Also fixed: the score digits' entrance travelled into the source line (inspector covered-text); travel cut to 0.12em and the line moved down.
```

What a parent understands in five seconds: Karman is SAT prep, the free test is on December 12,
and the button books it. What still looks generated: the generated photographs are clean and a
little catalogue-like (good light, tidy rooms). What is still messy: the results portraits are
small and soft on phones (the Ava still is low resolution).

## Not done, or to decide

- Footer "Cookie Policy" goes to karmanprep.com/cookies, which is 404 on the live site today. Rule 32
  needs the link, so it stays; the page in the repo has to ship before or with this design.
- offer.ts has no entry for the three results (Mateo, Priya, Ava); they come from rule 47. A
  RESULTS constant in offer.ts would make it the single source. Not added: this work may not edit
  outside its folder.
- Private 10 and the guarantee: offer.ts gives one to Private 20 only, CLAUDE.md says "Private".
  The page now says nothing about Private 10 either way. Confirm.
- When Your Daily 10 and full-length tests go live is not in offer.ts, so the page no longer gives a
  date. Confirm whether to say one.
- The average gain (+285), 94% and "10,000+ questions" are not shown (brief allows the three
  named results only).
- The page has no film. The opening skips with `?opening=off`; `?dock=off` turns the dock off for
  reviews.

## Pictures

Generated with fal flux-3 and ideogram-4.5 through `scripts/generate-assets.mjs`, manifest
`assets/fresh/scoreboard.manifest.json`, in the first round (about $1.02). None in the fix round.
On the page now: bus-phone, tutor-zoom, girl-window, parent-phone, weekend-desk. Removed from
`img/`: focus-girl (stray earbud on her cheek), student-zoom (logo on the headphones, scowl), the
cropped hero screens, the campus stills, and the unused alternates. The raw files stay in `raw/`.

## Fix round

Each critic item and what was done.

Blockers:

1. **Stray earbud on the hero girl's face.** The hero no longer has a photograph; focus-girl is
   deleted from `img/`. The hero picture is now the real product, live.
2. **Logo on the headphones, scowling boy (student-zoom).** Replaced in the program pair by the
   unused girl-window still (one AirPod, focused, no marks), checked at full size. student-zoom
   deleted. No money spent.
3. **Half a question as the phone hero.** The cropped screen captures are gone at every size. The
   hero now holds the live adv-3 question with all four choices; it grades itself and shows the
   explanation. The separate practice section is merged into the hero, so the product appears
   once, whole.
4. **Cookie Policy 404.** Not fixable from this folder: rule 32 needs the link and /cookies exists
   only in the repo. Left in place and flagged for the founder.
5. **Copy claimed a timer, highlighter and scratch pad the demo hides.** Those points are deleted
   (and the calculator claim with them). The only words beside the question are "Try one of our
   questions. Pick an answer."
6. **Facts not in offer.ts.** "About 49 questions" now. January 2027 dates removed. Plan features
   cut to what offer.ts holds (question counts, cohort includes, Private hours); the guarantee
   column is gone and "Carries the score guarantee" sits only on the March program and Private
   20, so nothing says "No" for Private 10. "Nine weeks" (a computed number) became "18 live
   classes". Daily 10 note now says "Part of the March program and of Private tutoring" (from the
   offer.ts includes). Results and the missing RESULTS constant are flagged for the founder.
7. **No way to act between hero and close.** A dock with the same button: full-width bar at the
   bottom, slides up when the reader scrolls back up, only while no other button is on screen.

Improvements:

1. **Headline without SAT, zigzag reading.** H1 is now "The SAT score before you pay." (two lines
   at every size), on the left, with the lead, the button and the facts directly under it.
2. **Layout jumped sides.** One rule for every section: text from column 1, pictures, live
   product and tables from column 7. Daily and updates swapped sides; results, program tally,
   guarantee and FAQ moved onto the reading column. Section gaps cut from 176px to 128px (desktop)
   and 136px to 112px (tablet).
3. **Tiny soft greyscale portraits, clipped college word.** Portraits removed; the scoreboard is
   numerals, names and colleges only. Phone numerals raised from 84px to 120px.
4. **Daily 10 day line hard to read (track invisible in light mode).** Redrawn in ink: a 3px line,
   3px ticks, numbers above, "Missed" under the 0 tick, "days after the miss" under the line.

Self-critique, fix round (taste-skill format):

```
ROUND 3
Seen in one second: "The SAT score before you pay." with one marigold button, and a real SAT question beside it asking to be answered.
Idea: the SAT score is the subject, and every claim stands next to its number.
Live thing: the self-grading Karman question in the hero; days to December 12; the dock on scroll up.
Layout words: hero=text + live product / daily=text + photo / results=claim + scoreboard / program=text, photo pair, tally / guarantee=text + table / updates=text + photo / plans=table / faq=two-column reading / close=date + photo.
Scores: design 8 · usability 8.5 · creativity 7.5 · content 8.5 → overall 8.1.
Top three problems:
1. Phone scores at 84px were not the largest type on a phone. Fix: 120px minimum.
2. "About 49 questions" broke over two lines on phones, so the fact grid looked ragged. Fix: body-size fact titles under 480px.
3. Results heading "Official scores from Karman 1:1 students." ran to three lines (inspector FAIL). Fix: "Official SAT scores." set at display size.

ROUND 4
Seen in one second: same.
Scores: design 8.2 · usability 8.5 · creativity 7.5 · content 8.5 → overall 8.2.
Top three problems:
1. The close photo was a tall 4:5 crop on phones, pushing the footer two screens down. Fix: 4:3, max 560px wide below 900px.
2. Guarantee table on phones gave the result column 44%, so the remedy wrapped to three lines. Fix: 38%.
3. A fixed bottom dock covered a heading at one scroll position (inspector covered-text FAIL). Fix: the dock appears only on scroll up and leaves as soon as the reader scrolls down.
```

What a parent understands in five seconds: Karman is SAT prep, the free practice test gives a
score before paying, and the button books it; a real question sits right there to try. What
still looks generated: the photographs are clean and a little catalogue-like. What is still
messy: the engine's own top bar (MATH, skill name) and ADVANCED MATH label repeat each other
inside the demo; that is the real product and was left as it is.
