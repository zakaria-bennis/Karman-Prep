# One morning

Open it: `node .impeccable/mocks/serve-mocks.mjs 8812`, then
http://127.0.0.1:8812/fresh/morning/index.html

## The idea

One school day of one fictional student, Nora, told in film stills. Each chapter takes the colour
of its hour: blue before sunrise, the white of the morning, the warm kitchen at 4:40 p.m., the navy
of a 7 p.m. class on Zoom. Each still carries one fact about Karman. The real practice question sits
in the 7:25 a.m. chapter and runs through the engine's own states (select, Submit Answer, Show
explanations).

Order: 6:40 a.m. (what Karman is, the button) / 7:25 a.m. (the real question) / 4:40 p.m. (the
weekly update to the parent) / 7:05 p.m. (the live class, Nora and the tutor each at their own desk)
/ Ava, Mateo and Priya / the plans / the guarantee / Saturday (the free practice test, with the
objection answered right above the button) / questions / footer.

## Identity

- Type: Newsreader (headlines, prices, scores) and Schibsted Grotesk (everything else), both Google
  Fonts. Headlines 500, tracking -0.028em, leading 1.02.
- Colour, dark (default, and whenever the device does not say light): ground #0f1419, ink #e9e8e4,
  secondary ink #b5bac0, hours #111c29 dawn, #0b0f13 morning, #221b13 afternoon, #0a0f1d evening,
  #16130f results. Light: ground #f3f1ec, ink #14181d, secondary #4a5057, hours #dce4ec, #f3f1ec,
  #efe4d3, #d5dbe7, #ebe5db. Marigold #e8a33d is the button and the guarantee field, with #15110a
  text, in both modes (rule 33: off-white with black and marigold accents).
- Shape: 3 px corners, no shadows, no lines; rows separated by a step in tone.
- Logo: drawn by hand in SVG. The mark is a short line with a half sun rising over its left end
  (the Kármán line, and the morning). The wordmark is monoline strokes, one weight. Header reads
  "Karman" alone.
- Opening (first visit only): the line draws, the sun rises, the name arrives, and the logo flies
  into the header. 1.04 s of motion, measured removed at 1,064 to 1,074 ms after DOMContentLoaded;
  any key, tap, click or wheel skips it (gone 164 to 190 ms after the key); a plain 0.7 s fade under
  reduced motion; not shown on a second load.
- Motion: each still is uncovered by a sliding mask while it settles from 1.12 to 1 (21st.dev
  39591), then drifts very slowly (one cycle a minute). Headings, text and pictures rise in order as
  each chapter arrives. Buttons press to 0.97. All of it off under reduced motion.

## Pictures

Generated with flux-3 on fal through `scripts/generate-assets.mjs` with
`assets/fresh/morning.manifest.json`. One grade across all: Kodak Vision3 500T look, slate shadows,
amber lamp and low sun. Nora wears the same green sweater all day. Phones and laptops face away
from the camera. Captions sit on a solid dark card on the picture, so no text lies on photo pixels.

| Still | Used | Note |
| --- | --- | --- |
| morning-wake | hero | |
| morning-walk | no (fix round) | looked British, empty hands, no bus; replaced by morning-bus-us-b, files deleted |
| morning-bus-us-b | 7:25 a.m. chapter (desktop only) | fix round: US yellow school bus, phone in both hands, back to camera |
| morning-bus-us-a | no | a readable "7:25" clock sign in the frame |
| morning-table | 4:40 p.m. chapter | |
| morning-class-2 | 7:05 p.m., Nora | |
| morning-tutor | 7:05 p.m., the tutor | unnamed, so he is not passed off as David |
| morning-saturday | free test chapter | |
| morning-class | no | an Apple logo on the laptop, and a pained face |
| morning-wake-ideo | no | route test; square and less filmic |
| morning-bus | never made | two attempts stopped before submission (network timeout, rate limit); not tried again |

Ava, Mateo and Priya are the campus stills from the October film (c8c-p, c8a-p, c8b-p), cropped
4:5 without cutting a face or a word, and nudged toward the page grade with sharp. They carry only
name, score and college, with "Karman 1:1 tutoring, median 16 weeks."

Spend: 7 flux-3 stills at a $0.10 quote and 1 ideogram-4.5 at $0.06, so $0.76 quoted. The shared
spend log shows $0.59 for the five it caught; two saves hit a rate limit on the balance call after
download and were not logged, and one logged charge ($0.19 for the walk) likely includes another
director's job.

## The real product

`../../redesign/engine/fragments/alg-1.html` is fetched and dropped in as it is, with
`../../redesign/engine/engine.css`. A page-side stylesheet in `morning.css` hides the controls
that do nothing here (calculator, scratch pad, highlight, timer, bookmark, theme, settings, menu,
close, cross-out, transfer, and the bottom bar with flag, Questions, Previous and Next). It keeps
the label bar, the question and the four choices. Choosing an answer applies the engine's own
classes from `ActiveQuizScreen.tsx` (`border-success/40 bg-success/15`, `border-error/40
bg-error/15`, `opacity-50`); the right answer's letter becomes a check drawn for this page. The
engine follows the page theme (observatory in dark, ivory in light). Without script, the real
desktop capture shows. A skeleton holds the place while it loads. Nothing in `engine/` was edited.

## Checks (2026-11-01, final build)

- Screenshots: 375x812, 440x956, 834x1194, 1440x900, dark and light, fold and full page, in
  `/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/eae5e585-9868-40a3-bd97-fb3ad26100f3/scratchpad/fresh-morning/`
  (`fold-<w>-<mode>.png`, `full-<w>-<mode>.png`). All looked at.
- Sideways scroll: none. scrollWidth equals clientWidth at all 8 (375, 440, 834, 1440). Below
  340 px the theme switch moves to its own row.
- Overlap scan (every text run, every 200 px of scroll, 1440 and 375, both modes): 0 overlaps. No
  fixed or sticky element on the page (the phone menu sheet only while open). At most 1 highlighted
  button in view at any scroll position.
- Contrast, computed from the painted colours of every text run: dark 25 page pairs, lowest 7.57
  (guarantee table text on #dc962f); light 25 page pairs, lowest 6.35 (note text #4a5057 on
  #dce4ec). Button 8.72 (#15110a on #e8a33d). Engine text, dark lowest 10.35, light lowest 5.83.
  0 failures. Caption cards #e9e8e4 on #0b0e12: 15.77.
- Links: 24 per page, 16 in-page anchors (all targets exist), every nav link lands its section at
  0 px; menu opens, closes on Escape, on a link and on Close; theme Auto / Dark / Light switch the
  page and the engine and are remembered after reload; all four answers grade correctly and "Try it
  again" resets; FAQ keeps one open; the guarantee rules open; back to the top lands at 0.
  External: karmanprep.com/free-practice-test 200, /program 200, /terms 200, /privacy 200,
  **/cookies 404 on the live site today**.
- Console: 0 errors, 0 page errors across all runs.
- taste-skill lint: 0 FAIL, 0 WARN. inspect: 0 FAIL, 4 WARN, each defended:
  palette-cream and font-fallback "math" come from inside the real engine fragment (its ivory
  text and KaTeX); no-footage, because this round had no video budget and the page moves with the
  shutter and drift instead; font-not-dealt, because the dealt face (Chillax) is not on Google Fonts.
- Taste direction: "Colour chapters", seed 36959420. Palette redrawn (dealt candy pastels on pure
  black, and then pure white with acid yellow, both break rules 3, 26 and 27); colours taken from the
  stills' own hours instead. Type redrawn (Chillax is Fontshare only); chose Newsreader and
  Schibsted Grotesk.

## Self-critique

ROUND 1
Seen in one second: a girl on her bed at dawn with her phone, "Ten minutes of SAT before school.", a
marigold button.
Idea (one sentence): one student's school day in film stills, each chapter in the colour of its
hour, each still carrying one fact.
Live thing: the real practice question; a wrong answer shows the dates it would come back.
Layout words by section: hero=split, bleed right / daily=copy and still | live engine /
update=full-bleed still, then split / class=heading, diptych, then split / results=rows with huge
scores / plans=table / guarantee=marigold field, table / test=still bleeding left, copy right /
faq=accordion / footer=wordmark.
Scores: design 7.5, usability 8, creativity 7.5, content 8, overall 7.7.
Caps applied: none.
Top three problems:
1. The class chapter and the update chapter both closed on the same heading-left, points-right
   split, and the class points sat at body size under a huge diptych (full-1440-dark). Fixed: the
   class heading and its points now sit above the diptych, the price set larger as one line below.
2. The class headline ran to three lines at 1440 and 834 once moved. Fixed: wider heading column on
   desktop, one column on tablet.
3. Results on a phone stacked name, college and score so tightly that the score touched the next
   row (full-375-dark). Fixed: larger portrait, more space between rows, smaller name.

ROUND 2
Seen in one second: the same; the parent knows it is SAT prep, for their student, with a free test.
Scores: design 7.5, usability 8, creativity 7.5, content 8, overall 7.7.
Caps applied: none.
Top three problems:
1. The header theme switch sat in a grey box that read as app chrome next to plain links. Fixed: no
   box; only the chosen option is tinted.
2. In the 7:25 a.m. chapter the copy column ran 300 px longer than the engine. Fixed: the engine box
   is taller and the walk still is cropped 16:9.
3. Two adjacent chapter paddings left a 416 px empty band between plans and guarantee. Fixed:
   chapter padding 72 to 128 px.

What a parent understands in five seconds: SAT prep for their student, ten minutes in the morning,
live classes on Zoom, a weekly update, and a free practice test on December 12.
What looks generated: the stills are clean and evenly lit in the way image models are; the tutor's
open hand is slightly large.
What is messy: on tablet the engine keeps its desktop layout, so its choices sit in the left two
thirds of the box.

## Open for the founder

- Approve or replace the six stills (and whether the fictional family reads clearly as fictional).
- Your Daily 10 is now shown as "coming this winter" (PRODUCT.md asks for a season). Confirm the season.
- The live site has no /cookies page yet (404). This mock links its own cookies.html; the real policy is needed before launch.
- Class days and times, the test's 10:00 a.m. start, the names Platform and Plus, the guarantee
  wording: all still marked CONFIRM in offer.ts.
- Light and dark: dark is the default, and the page turns light only when the device says light.
  Chrome now reports "light" when a device states nothing, so in practice such visitors see light.

## Fix round (2026-11-01)

Each item from the critic, and what was done.

Blockers
1. Wrong answer gave November dates before Your Daily 10 exists. Dates removed. The line now reads
   "Not this time. In Your Daily 10, this question comes back 2, 7 and 21 days from now." (offer.ts
   MARCH_PROGRAM.includes, Daily 10). The date-counting code is deleted.
2. Facts not in offer.ts. "Opens in January" cut; per PRODUCT.md, Your Daily 10 is now labelled with
   a season: "coming this winter, in the March SAT Program and Private 1:1" (both list Daily 10 in
   offer.ts; the season is CONFIRM in copy.js). The weekly update now says "It comes with the March
   SAT Program" (offer.ts: Weekly updates for parents) and adds attendance, as offer.ts lists. Plans
   rows cut to offer.ts only: Free 100 questions, Platform 500, Plus every question, the program's 18
   live classes, Private 10/20. Class headline is now "A live class of up to six that ends on
   March 6." Also aligned to offer.ts: "You choose." on the outcomes, "assigned weekly practice",
   "or with a doctor's note", "A domain-by-domain breakdown"; removed "Nothing is added later" (not in
   offer.ts) and the FAQ question became "What does the March program cost?".
3. FAQ Bluebook answer rewritten: "The first and last full-length tests are official Bluebook tests."
4. 7:25 a.m. still. Two new flux-3 takes (quoted $0.20; the shared log caught $0.05) of a US yellow
   school bus. morning-bus-us-b kept: green vinyl seats, frost, sunrise, Nora with the phone in both
   hands, back to camera, hands checked at 2x, the front plaque is an unreadable blur. morning-bus-us-a
   discarded (a readable clock reading "7:25"). The walk still and its three WebPs are deleted.
   Caption "Nora, 7:25 a.m., the bus to school." now true, with alt text.
5. Cookies link 404. The footer now links `cookies.html` in this folder (200), a short page that says
   only what is true of this page: no cookies, no analytics, two local-storage notes (theme, opening
   seen). The live site still has no /cookies (404 checked today); it needs its real policy before
   this ships.
6. Light mode pastels. Light hours are now one off-white #f3f1ec (hero, morning, evening, plans, header,
   first paint) and one warm step #ece8e0 (afternoon, results). Marigold is the only colour.
7. Phone: question a screen below "Pick an answer". The section is now heading + text, then the live
   question, then the points. The bus still shows on desktop only (hidden at 1080 px and below).
   At 375 the first choice sits about 150 px under the instruction.
8. Opening logo over the hero. The intro ground stays fully opaque until the logo has landed (1,040 ms),
   then fades in 180 ms. Frames at 650, 900, 1100 and 1180 ms checked: the logo is only ever over the
   header. Removed at 1,236 to 1,282 ms after DOMContentLoaded (under 1.3 s).

Improvements
- Real engine flow: tapping a choice gives the engine's selected state (border-info/40 bg-info/10,
  ivory badge) and the engine's "Submit Answer" button; submitting grades with the engine's classes
  and shows "Show explanations"; that opens the engine's Explanation panel with the question's own
  explanation, "$3x = 21$, so $x = 7$." (src/data/diagnostic-questions.ts), rendered with KaTeX
  0.16.9 from cdnjs (loaded only on first open; plain text if it fails), and "Hide explanations"
  works. "Next question" is left out because there is no next question here. The page's own line
  under the box carries the Your Daily 10 fact.
- Timer: visible, counts from when the question is first on screen, and Hide Timer / Show Timer works
  as in QuizTools.tsx. Highlight stays hidden: on this question there is no passage to highlight, so the
  button would do nothing (the brief's hide list).
- Demo box is sized by its content (no fixed 600 px): the engine root, top bar and question area
  join the normal flow. Box 696 px tall with four choices; it grows when the explanation opens.
- Found while fixing: the page's heading rule had been setting the engine's question and headings in
  Newsreader. Scoped out, so the engine shows its own IBM Plex Sans.
- Removed the 104 px reserved under the demo, which left an empty band on phones.

Checks, rerun after the fixes
- Screenshots: 375x812, 440x956, 834x1194, 1440x900, dark and light, fold and full, replaced in the
  scratchpad folder `fresh-morning/`. All looked at (fold sheet and every full page in parts).
- Sideways scroll: none at all 8 (scrollWidth = clientWidth: 375, 440, 834, 1440).
- Overlap scan every 200 px, 1440 and 375, both modes: 0. Again with the explanation, the guarantee
  rules and an FAQ answer open: 0 (collapsed FAQ answers excluded, they are clipped to 0 height).
  No fixed or sticky element. At most 1 highlighted button in view.
- Contrast: dark 25 page pairs, lowest 7.57 (guarantee rows #15110a on #dc962f); light 17 pairs,
  lowest 7.22 (#4a5057 on #f3f1ec); 0 failures. Engine in its question and selected states: dark
  lowest 7.39, light lowest 5.83. Engine graded state (its own, not editable here): the dimmed
  unchosen choices are opacity 0.5 by design (2.95 dark, 2.06 light), and the wrong-answer badge
  letter measured 1.73 dark / 1.98 light by my composite. Reported as an engine finding, not changed.
  Caption cards #e9e8e4 on #0b0e12: 15.77 (no text on photo pixels).
- Clicks: 24 links per page, 16 in-page anchors all exist, every nav link lands its section at 0 px
  (1440); phone menu opens, Escape / link / Close all close it; theme Auto/Dark/Light switch page and
  engine and are remembered; each of A to D: selected state, Submit, the right grade, Show and Hide
  explanations, Try it again; timer ticks (0:06 to 0:08) and hides; FAQ one open at a time; rules
  open; back to the top 0; both buttons go to karmanprep.com/free-practice-test; Cookies opens
  cookies.html (200) and its back link returns.
- Opening: first visit only in both modes, gone 1,236 to 1,282 ms; skipped by a key 190 ms after it;
  0.73 s plain fade under reduced motion; not shown on a second load.
- Console: 0 errors.
- taste-skill lint 0 FAIL 0 WARN (the engine's own separator lines and the clock's padStart carry
  taste-skill-ignore). inspect 0 FAIL, 4 WARN: palette-cream and font-fallback "math" are inside the
  real engine (its ivory text, KaTeX); font-count 3 is the engine's IBM Plex Sans, now correctly its
  own; no-footage, no video budget this round.

Self-critique, fix round
ROUND 1
Five seconds: SAT prep for her, ten minutes on the phone, live classes on Zoom, a free test on
December 12, one marigold button. Light mode now reads as one calm off-white page.
Generated look: the bus still is clean and evenly lit; the tutor's hand is still a little large.
Messy: (1) at 834 a 90 px empty band sat between the question and the points (a leftover grid row);
fixed. (2) Centering the question against the copy column looked tidier but made the choices jump
when the explanation opened; reverted to top-aligned. (3) The hero caption named Your Daily 10 on
the first screen, a feature still to come; now "Nora, 6:40 a.m.".
ROUND 2
Five seconds: same. The demo now behaves like the app, which is the strongest thing on the page.
Messy: (1) the FAQ asked "all in?" after the answer lost its "nothing added" line; question reworded.
(2) The cookies page had no space after its list; fixed. (3) Platform and Plus rows are now one line
each; left as is until the founder confirms per-plan features in offer.ts.

Spend, fix round: 2 flux-3 stills, $0.20 quoted ($0.05 caught by the shared log).
