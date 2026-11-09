# Karman home page, "people" direction (2026-11-01)

Open it: `node .impeccable/mocks/serve-mocks.mjs 8814`, then http://127.0.0.1:8814/fresh/people/index.html

## The idea

On this page, the Zoom call itself (the tutor in his own room, the student in hers) becomes the
split stage: one half of the screen always shows two people in two places, the other half reads.
As the reader moves through classes, daily practice and the weekly update, the pair changes:
tutor and student, a second tutor and student, a student on the bus and one on the bench, a
mother and a father reading the update. The one live thing is a real Karman question in the real
quiz engine that grades on tap.

Taste-skill draw: direction "The split stage" (seed 712513586), hero "Menu column, sticky
photograph". Redrawn, with reasons: type (Switzer is on Fontshare; the brief asks for Google
Fonts), palette (cobalt on sand is cold; the brief asks for a warm natural palette, so the colours
come from the photographs' daylight, oak and sage), the proof blueprint (a logo row; there are no
logos, so the three real results became a score list beside one picture), the paper bar across the
photograph (it repeated the hero facts, cut in round one).

## Identity

- Type: Newsreader 400 (Google Fonts, optical sizes) for headlines, scores and large lists;
  Instrument Sans 400/500/600 for everything else. Five sizes: 15, 19, 24, 52, 88 px at 1440.
- Colour, light: ground #F2EFEA, surface #E9E2D6, raised #DDD3C3, ink #1D1A16, soft ink #574F44,
  pine #23503F (the one button, with #F6F1E9 text; the closing field). Dark (default when the
  device states no preference): ground #14120F, surface #1E1B17, raised #2A261F, ink #EBE8E3,
  soft ink #B8AE9F, sage #9FCAB1 (button, with #10231A text), field #1C3A2F.
- Shape: 2 px corners on buttons and controls, square photographs, no lines, no shadows.
- Logo: drawn by hand in SVG. The mark is a K split in two: a pine stem and an ink chevron with a
  gap between them (two people, two places, one call). The wordmark "Karman" is a monoline drawn
  from strokes, not a font.
- Opening (first visit only): the stem rises, the chevron slides in, the wordmark writes itself
  stroke by stroke, then the logo shrinks into the header. 1.06 s of animation; any key, tap,
  click or wheel skips it; reduced motion gets a 350 ms fade. Remembered in localStorage
  (`karman-people-opened`).
- Motion: 1.6 s crossfade between photo pairs, a 26 s slow drift on the stills, entrances that
  rise 22 px in reading order (80 ms apart), press feedback at 0.97. All dropped under reduced
  motion.

## Pictures

13 flux-3 jobs through `scripts/generate-assets.mjs` with `assets/fresh/people.manifest.json`
(quoted $1.30 in total; the spend log records $0.80 because the fal balance check is shared with
other directors and misread several jobs). 12 kept, 1 discarded (the first `people-test-girl`,
its laptop had no lid). WebP at 880 px and 800 px in `img/`. Raw PNGs stay in `raw/`.

The three result pictures are the existing stills `c8a-r`, `c8b-r`, `c8c-r` from the October film,
used only in the results section, with name, score, college and "Karman 1:1 tutoring, median 16
weeks".

## The product demo

`redesign/engine/fragments/alg-1.html`, `adv-3.html` and `conv-2.html`, fetched at runtime with
`engine.css`, unchanged. A page-side stylesheet hides calculator, highlight and passage tools,
timer, bookmark, settings, menu, close, cross-out, transfer, flag, Questions, Previous and Next.
Choosing an answer applies the engine's own classes (`border-success/40 bg-success/15`,
`border-error/40 bg-error/15`, `bg-success text-night`, `bg-error text-ivory`,
`border-bronze opacity-50`). The engine follows the page's mode (ivory or observatory). The
explanations are the originals' own, from `src/data/diagnostic-questions.ts`.

## Checks (final version)

- Screenshots: 375x812, 440x956, 834x1194, 1440x900, light and dark, fold and full page, in
  `/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/eae5e585-9868-40a3-bd97-fb3ad26100f3/scratchpad/fresh-people/final-*.jpg`, plus
  scroll frames at 1440 and 375. All looked at.
- Sideways scroll: scrollWidth minus innerWidth is 0 at all four sizes, both modes.
- Overlap scan (every text node's boxes, every quarter screen, all sizes and modes, plus anything
  fixed or sticky over text, plus "more than one highlighted button on screen"): 375: 43 steps,
  440: 37, 834: 32, 1440: 34, in each mode; 0 problems. (Round one found closed accordion answers
  overlapping their questions; they are now hidden.)
- Contrast, every text colour pair on its real background, by calculation:
  - Light: ink on ground 15.11, ink on surface 13.47, ink on raised 11.70, soft ink on ground
    7.02, soft ink on surface 6.26, button text 8.15, closing field text 7.99, closing button 7.99.
  - Dark: ink on ground 15.30, ink on surface 14.04, ink on raised 12.31, soft ink on ground 8.54,
    soft ink on surface 7.84, button text 9.05, closing field text 10.13, closing button 10.13.
  - Engine fragment (its own colours): lowest 5.83 light, 8.78 dark.
  - No text sits on a photograph anywhere (0 text nodes without a solid background).
- Links: free practice test, guarantee, terms and privacy on karmanprep.com answer HTTP 200.
  https://karmanprep.com/cookies answers 404 on the live site (see "For the founder"). Both
  mailto links are well formed. Every in-page anchor has its target; skip link works by keyboard.
- Controls: all three questions graded right and wrong, "Try it again" resets; all three result
  rows swap the picture; all six questions open and close one at a time; theme Device, Light and
  Dark set and remember the choice across a reload and repaint the engine; phone menu opens,
  traps focus, closes on Escape, on Close and on a link.
- Opening: light 1,072 ms and dark 1,072 ms after DOMContentLoaded (about 1,170 ms after
  navigation start); reduced motion 599 to 618 ms; not shown on the second load; skipped by a key
  or a tap at 150 ms.
- Console: 0 errors across every run.
- taste-skill lint: 0 FAIL, 0 WARN. inspect: 0 FAIL, 5 WARN, each defended:
  cream (it reads the dark-mode ink #EBE8E3 and the engine's own #F4F3E7), three typefaces
  (IBM Plex Sans is the engine's own), "math" fallback (KaTeX's MathML layer), no video (no budget
  for film this round; the stills drift instead), type not dealt (redrawn for Google Fonts).

## Self-critique

ROUND 1
Seen in one second: a tutor and a student on two stacked video tiles beside "Live SAT classes on Zoom" and one green button.
Idea (one sentence): the Zoom call, two people in two places, becomes the split stage.
Live thing: a real Karman question in the real engine, graded on tap.
Layout words by section: hero=split, sticky pair / classes=split / practice=split / parents=split / demo=index and stage / results=picture and score list / prices=menu / questions=split with tall picture / close=picture and colour field / footer=line.
Scores: design 7 · usability 7.5 · creativity 7 · content 7.5 → overall 7.2.
Caps applied: none.
Top three problems:
1. Three split steps in a row read the same: heading, two small paragraphs, empty column (fr1 1440 frames 01 to 03). Fix: the parents step now sets the update's four contents as a large list; steps are shorter (84svh).
2. The paper bar on the photographs repeated the hero facts and labelled every later pair with the test date (fr1 frames 00 to 03). Fix: bar removed.
3. The engine fragment set its question in the page's headline serif and "Try it again" showed before any answer (r0 cut-2). Fix: the engine keeps IBM Plex Sans, `[hidden]` is respected, the box fits its question.

ROUND 2
Seen in one second: the same, calmer; the button and the date are the only things asking for action.
Idea (one sentence): unchanged.
Live thing: unchanged, now on a wider stage.
Layout words by section: hero=split / classes=split / practice=split / parents=split with large list / demo=index and stage / results=picture and scores / prices=menu with picture / questions=split / close=picture and field / footer=line.
Scores: design 7.5 · usability 8 · creativity 7.5 · content 7.5 → overall 7.6.
Caps applied: none.
Top three problems:
1. The demo box sat at 600 px in a wider stage with an empty result block under it (fr3 1440 frame 04). Fix: the engine fills the stage; the result block appears only after an answer.
2. On iPad the results, questions and closing pictures were full-width 4:5 (nearly a screen each) and the footer squeezed into three columns (inspect tablet-page-02). Fix: pictures capped (results 3:4 at 460 px, others 4:3), the footer stacks below 1100 px. Every result crop checked: no face or sweatshirt word cut.
3. The line "One update a week, with" read as a label above the list (inspect FAIL eyebrow at 768). Fix: deleted; the sentence moved under the list.

Still short of a 7.5 page in places: the four split screens are still one rhythm; a parent sees
people and a price list but no picture of the weekly update itself (there is no approved screen
of it to show).

## Copy

Every word is in `copy.js` (header comment explains how to edit). Written with the
conversion-copywriter method (Harry Dry's three rules); the record is in `copy-run/copy.json`.
Words that are CONFIRM in offer.ts and appear here: the 10:00 a.m. ET start of the free test.
Plan names "Platform" and "Plus" are working names in offer.ts.

## Fix round (2026-11-01, after the independent critique)

Screenshots, all replaced: `/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/eae5e585-9868-40a3-bd97-fb3ad26100f3/scratchpad/fresh-people/final-fold-*.jpg` and `final-full-*.jpg`
(375, 440, 834, 1440, light and dark), `demo-*-conv-2-wrong.jpg`, `open-*-500/900/1100.jpg`.

### Blockers

1. Wrong-answer badge contrast (1.98 light, 1.73 dark). The page now gives the wrong badge the
   engine's `text-night` instead of `text-ivory`. Measured after grading, all three questions:
   6.18 light, 9.05 dark. The right badge is 6.44 and 10.11. The unchosen choices are no longer
   dimmed to 50% (that dimming measured 2.06 light, 2.95 dark), so they now read at 5.31 and 6.97.
2. Cross-out mark on the right answer. `button[aria-label^="Cross out"]` is added to the hidden
   engine controls. After grading, there are 0 visible cross-out controls in all three questions,
   at 1440 and 375, in both modes.
3. The opening crossed the hero headline and snapped at the end. The layer now stays fully opaque
   until the logo has landed, then fades in 160 ms. The landing is measured at landing time, after
   `document.fonts.ready` (capped at 600 ms), so the logo lands exactly on the header logo: the
   offset is 0 px in x, y and size at 1440 and 375, in both modes. It ends 1,144 to 1,153 ms after
   DOMContentLoaded. Reduced motion ends at about 610 ms. It is not shown on a second load, and a
   key or a tap at 150 ms skips it. The frames at 500, 900 and 1,100 ms show only the logo on
   the plain ground.
4. Staged "grandmother" parent overlapping the tall picture. `.faq-square` and its image are
   deleted, with the CSS. The questions section has one picture, with no overlap.
5. Test-day photo with a logo on the lid and a pained face. Retired. The questions section now uses
   the existing `people-test-girl` (plain lid, focused). The prices section no longer has a
   picture, so there is one picture fewer on the page.
6. Paper on the corkboard (`people-student-evening`) and garbled signs on the bus
   (`people-student-bus`). Both are retired. The classes step now shares the call pair with the hero
   (one fewer pair). The bus is regenerated as `people-bus-quiet`: a plain interior, an
   unreadable blur of trees outside, and the phone's back toward the camera with the screen
   facing him. The phone tile and the desktop tile both crop out the one ceiling panel.
7. The kitchen mother's phone faced the wrong way. Regenerated as `people-parent-reading`, with the
   back of the phone toward the camera and her eyes on its screen.
8. Words not in offer.ts. Practice now says "Every question your child misses in Your Daily 10
   comes back after 2, 7 and 21 days." (no "ten questions", no devices). The plan notes are cut
   to what offer.ts holds: 100 / 500 / every practice question, "2,000 practice questions for
   every student, July 1 to June 30", and "$10 a student a year". The guarantee line now carries
   the remedy and the exclusion: "...100 points up on the official SAT, or 1450. If not, you get
   money back, the next cohort free or extra hours free. Students starting at 1450 or above
   aren't covered." The terms link is kept. CONFIRM: GUARANTEE is still pending the lawyer.
9. Dead Cookies link (karmanprep.com/cookies returns 404, and /privacy has no cookie section). The
   link is removed from the footer so the page shows no dead link. The founder needs to ship a
   cookie policy page before launch (rule 32), then add the link back.

### Improvements

- The hero now sells the one action. H1: "Where your child stands on the SAT". The lead: "Take a
  free practice test on Zoom on Saturday, December 12. You get a predicted score and a 20-minute
  call with a Karman tutor about what to do next." The button says "Book the free practice test".
  The photos now belong to the sentence: the tutor and the student are the call.
- The two hero photos didn't read as a Zoom call. Both are regenerated as webcam views
  (`people-call-tutor`, `people-call-student`): straight on, at eye level, no laptop in frame,
  each person in their own room, looking just below the lens. On phones the copy comes first,
  and the two tiles stack full width at 3:2 (343 x 229 at 375), like a call on a phone. They are
  no longer two 168 px thumbnails above the headline. At 600 to 1023 px they sit side by side.
- Headlines keep to two lines at every width (inspector headline-lines FAIL at 1440, 768 and 390).
  The classes headline is now "Classes built on what the group missed", with "live on Zoom" moved
  into its first point. At 1024 to 1279 the reading half gets 1.2fr so the H1 still takes two lines.
  Dates never break ("December&nbsp;12" is joined in the copy reader).
- Fewer photographs. Before: 15 photos on the page (8 in the stage, 3 results, prices, 2 in
  questions, closing). Now: 11 (6 in the stage, 3 results, 1 in questions, 1 closing).
- Dead code removed: `.panel-bar`, `.points-intro`, `.prices-pic`, `.faq-square`, the unused
  `demo.loading` and `footer.cookies` copy lines. The eight retired WebPs are deleted from `img/`.

### Pictures this round

4 flux-3 stills through `scripts/generate-assets.mjs` with `assets/fresh/people.manifest.json`:
`people-call-tutor`, `people-call-student`, `people-bus-quiet`, `people-parent-reading`. The quote
is $0.40 ($0.10 each). The spend log records $0.00, $0.09, $0.00 and $0.05, because the shared
fal balance check misreads jobs. All four were kept, none retried, and each was checked at full
size: five-fingered hands, no text, no logos, no visible screens. One small flaw: the student's
left AirPod sits low. It isn't noticeable at tile size.

### Checks (rerun after the fixes)

- Sideways scroll: 0 at 375, 440, 834 and 1440, in both modes.
- Overlap scan (every text box, every quarter screen, plus fixed or sticky elements over text and
  more than one highlighted button on screen): 375: 45 steps, 440: 40, 834: 31, 1440: 34,
  in each mode. 0 problems.
- Contrast by calculation, every text pair at 375 and 1440, both modes: 0 fails, no text on a
  photograph. The lowest page pair is soft ink on surface: 6.26 light, 7.84 dark. The engine's
  lowest is 5.83 light and 8.78 dark (label text), and graded badges are 6.18 or more.
- Links: free-practice-test, guarantee, terms and privacy all return HTTP 200. Both mailto links
  are well formed. Every in-page anchor exists and scrolls to its target, and the skip link works.
- Controls (27 clicked): all three questions graded right and wrong, and "Try it again" resets.
  All three result rows swap the picture. All six questions open and close one at a time. Theme
  Device, Light and Dark are remembered across a reload and repaint the engine. The phone menu
  opens, takes focus, and closes on Escape, on Close and on a link.
- Console: 0 errors.
- taste-skill lint: 0 FAIL, 0 WARN. inspect: 0 FAIL, 4 WARN. They are the same four defended
  before: cream (the dark-mode ink and the engine's own colours), three typefaces (IBM Plex Sans
  is the engine's), the "math" fallback (KaTeX), and no video (no film budget this round).

### Self-critique, fix round

ROUND 1
Seen in one second: "Where your child stands on the SAT", one button to book the free test, and
a tutor and a student face to face on a call.
Idea: unchanged. The Zoom call, two people in two places, is the split stage.
Scores: design 7.5, usability 8, creativity 7.5, content 8. Overall 7.7.
Top three problems:
1. The practice step was one small sentence next to two big photos. Fix: it is set at lead size.
2. The steps sat in 84svh with short text, leaving big gaps on desktop. Fix: 76svh.
3. The H1 broke as "predicted / SAT score on" (the first rewrite). Fix: a shorter headline that
   keeps to two lines at every width.

ROUND 2
Seen in one second: the same, calmer.
Scores: design 7.5, usability 8, creativity 7.5, content 8. Overall 7.7.
Top three problems:
1. The opening ran 1.23 s after DOMContentLoaded, close to the limit. Fix: the landing starts at
   600 ms and the fade takes 160 ms, so it now ends at about 1.15 s.
2. An empty `<li>` was left in the practice step after the copy change. Fix: replaced with one
   paragraph. A copy-key cross-check finds no missing and no unused keys.
3. The unused `demo.loading` line in copy.js was removed.

Still open: the result stills come from the October film and are softer than the new
photographs. Rule 33 says the website's light mode uses "black and marigold accents", but this
direction uses pine. The founder should choose.
