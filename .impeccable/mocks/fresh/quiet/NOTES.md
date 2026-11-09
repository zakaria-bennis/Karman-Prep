# Quiet: notes for the founder

**Read "Fix round" at the bottom first.** It replaces the page order, logo, pictures, question
and prices described in the first-build sections below.

Open it: `node .impeccable/mocks/serve-mocks.mjs 8815`, then
http://127.0.0.1:8815/fresh/quiet/index.html. Every word is in `copy.js`.

## The idea

One idea per screen, with lots of room around it, the way a keynote slide works. Each screen has one
headline, one photograph or one product moment, and at most three short points. The middle of the
page is a real Karman question in the real quiz engine. A parent can answer it, and it grades the
way the app does.

## The page, top to bottom

1. **Know the score before the SAT.** What Karman is, the free test button, and the date, time and
   proctor right under it. A student at her desk.
2. **Try one of our questions.** The engine's `alg-1` fragment, live. Pick an answer and it grades
   with the engine's own classes, then says what happens to a miss.
3. **Ten minutes a day, on the phone.** Your Daily 10. A student on a bench by a running track.
4. **Every week, you see the work.** The weekly update. A parent reading it in the kitchen.
5. **Up to six students, one SAT date.** The March class: dates, three points, price, deadline.
6. **100 points higher, or money back.** The guarantee, in its own colour field: the payout table,
   the conditions, and Private 20's version.
7. **One tutor, one student, on Zoom.** Private 1:1. The tutor and the student, each in their own
   room.
8. **Where three of our 1:1 students went.** Mateo 1570 Harvard, Priya 1540 Stanford, Ava 1520
   UC Berkeley, with "Karman 1:1 tutoring, median 16 weeks." Their existing campus stills fade
   slowly from one to the next.
9. **Every plan, and what it costs.** Five plan names. Pick one and its price and contents show.
10. **Questions parents ask.** Five answers, closed until opened.
11. **Saturday, December 12. Free.** The objection first, then the facts and the button again.

## Identity

- **Type:** Instrument Sans (Google Fonts), one family. Headlines are 600 weight, slightly
  narrowed, with tight letter spacing. Body text is 19px.
- **Colour, light:** ground #F2F0EB, step #E8E5DE, ink #151413, secondary ink #55514B, marigold
  #E9A33A. The guarantee field is inverted (#151413 with #F2F0EB text).
- **Colour, dark:** ground #0F0E0D, step #1A1917, ink #EBEAE6, secondary ink #AAA59C, marigold
  #EBA53A. The guarantee field becomes bone (#EBEAE6 with #141311 text).
- **Accent:** marigold, as rule 33 asks. It appears only on the one button, the mark's chevron and
  the small square markers. Square corners (2px) throughout, no shadows, no gradients, no lines.
- **Logo:** a new mark drawn by hand in SVG: an ink stem and a marigold chevron that together make
  a K. "Karman" is set beside it in Instrument Sans. The footer builds it large.
- **Opening (first visit only):** the stem rises, the chevron slides in to meet it, the word wipes
  in, and the whole logo flies into the header. 1.19 s. Any key, tap, click or scroll skips it.
  Under reduced motion it is a plain 0.7 s fade.
- **Motion:** each section's heading, text and picture rise in, 80 ms apart. The hero photo
  settles from 106% over 16 s. The results photos crossfade every 5.6 s and pause when off screen
  or in a hidden tab. Buttons shrink on press. No video (no budget this round).

## Facts used, and what needs your yes

Everything comes from `src/lib/marketing/offer.ts`. Nothing is invented: no testimonials and no
numbers beyond offer.ts.

- CONFIRM: the free test starts at 10:00 a.m. ET (marked CONFIRM in offer.ts).
- CONFIRM: enrollment closes Wednesday, December 30 (marked CONFIRM in offer.ts).
- CONFIRM: "Your Daily 10 opens this winter." PRODUCT.md says the Daily 10 isn't built yet and has
  to be labelled "coming" with a season. I guessed winter because the March class starts January
  4 and includes it.
- The free test button goes to https://karmanprep.com/free-practice-test.
- **https://karmanprep.com/cookies returns 404 on the live site today.** /terms and /privacy load.
  The footer links to /cookies as asked, so the live page has to exist (rule 32).
- The question grades on the first tap. The app selects first and then needs Submit. Here it is
  one tap, because it's a marketing page.
- The correct answer gets a check I drew myself, because the engine's own check is a Lucide icon
  (rule 2).

## Pictures

Generated with flux-3 and ideogram-4.5 on fal (`assets/fresh/quiet.manifest.json`). Raw files are
in `raw/` and the page uses WebP files in `img/`, each with an -800 version.

| Used | Shot | Where |
| --- | --- | --- |
| yes | quiet-hero-a (flux-3) | Hero |
| yes | quiet-daily-a (flux-3) | Your Daily 10 |
| yes | quiet-parent-a (flux-3) | Weekly update |
| yes | quiet-hero-b (ideogram-4.5), cropped 4:5 | The March class |
| yes | quiet-tutor-a (flux-3) | Private 1:1, tutor |
| yes | quiet-student-b (flux-3) | Private 1:1, student |
| yes | quiet-test-b (flux-3) | The close |
| no | quiet-class-a (flux-3) | She looked confused, not focused, and the laptop sat at an odd angle |
| no | quiet-parent-b (ideogram-4.5) | Square and weaker than the flux one |
| no | quiet-test-a (ideogram-4.5) | Two copies of the same boy |

The results section reuses the existing c8a-p, c8b-p and c8c-p campus stills
(`.impeccable/mocks/decision/film/`), converted to WebP. Nothing new was generated for them.

Spend: the quoted cost is $0.88 for 10 images. The shared spend log reads $1.11. The script measures
the fal balance before and after each job, so jobs run by other directors at the same moment got
counted against two of these (logged at $0.15 and $0.19 against quotes of $0.06 and $0.10). Five
runs hit the fal rate limit while checking the balance, before any job was sent, so they cost
nothing. Each was retried at most once.

## Checks (final build, 2026-11-01)

- **taste lint:** 0 FAIL, 0 WARN.
- **taste inspect:** 0 FAIL, 3 WARN, which are fine to leave:
  - The "yellow cream" text #F4F3E7 and the "math" font fallback are inside the real engine
    fragment (observatory theme text and KaTeX MathML), which can't be edited.
  - "No video": this round had no video budget. The moving pictures are the hero settle and the
    results crossfade.
- **Inspect numbers:** headlines are 2 lines at most at 1440, 768 and 390 (hero 111px, 68px and
  44px). Font sizes in use: 16, 19, 23, 64, 111 and 232px. The page is 11.4 screens long, with 612
  words and 10 images.
- **Sideways scroll:** 0px at 375, 440, 834 and 1440 wide, in light and dark.
- **Overlap scan (rule 34):** every text box checked at every third of a screen, all four sizes,
  both modes (37/37/32/32/27/27/35/35 steps). Text on text: 0. Fixed or sticky elements over text:
  0 (the header is static).
- **One highlighted button (rule 35):** at most 1 on screen at any scroll step, at every size and
  in both modes.
- **Contrast (calculated, every text pair):**
  - Light: lowest is 6.26:1 (secondary ink on the footer step). Ink on ground 16.16, button text
    8.56, guarantee field 16.16 and 8.91.
  - Dark: lowest is 7.17:1. Ink on ground 16.02, button text 8.82, guarantee field 15.42 and 7.19.
  - 0 pairs under AA. No text sits on a photograph.
- **Links (36 checked):**
  - Every in-page link points at a real section. Header links land the section at 0px.
  - karmanprep.com /free-practice-test, /program, /guarantee, /private-tutoring, /pricing, /terms
    and /privacy return 200. /cookies returns 404 (see above). The mailto link is correct.
- **Controls clicked:**
  - Both theme toggles switch, are remembered after a reload and re-theme the engine (ivory or
    observatory).
  - The phone menu opens with focus on Close. Escape closes it and returns focus to Menu. A link
    closes it and scrolls to its section.
  - Question: wrong (B) shows B in the error tint, C in success and the "Not this time" line. "Try
    it again" resets it. Right (C) shows the success state.
  - All five plans show their price ($0, $29, $49, $995, $1,495).
  - All five FAQ rows open, one at a time.
- **Opening:**
  - First visit: 1,189 ms in light, 1,185 ms in dark.
  - Skipped by a key press: 169 ms and 161 ms.
  - Reduced motion: a 705 ms and 714 ms fade.
  - Hidden on a second load in both modes.
- **Console:** 0 errors, 0 page errors across all runs.

Screenshots: `/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/eae5e585-9868-40a3-bd97-fb3ad26100f3/scratchpad/fresh-quiet/`
(fold-<width>-<mode>.png and full-<width>-<mode>.png for 375, 440, 834 and 1440).

## Self-critique (taste-skill format)

```
ROUND 1
Seen in one second: a huge two-line "Know the score before the SAT." with the marigold button beside it and a quiet photo of a student below.
Idea (one sentence): a keynote for parents, one idea per screen, with a real Karman question as the centrepiece.
Live thing: the alg-1 question in the real engine, graded with the engine's classes.
Layout words by section: hero=headline+aside over wide photo / question=centred stage / daily=full-bleed photo then two columns / parent=text left, photo right / class=photo left, text right / guarantee=inverted field, two columns / private=two columns then photo pair / results=list + crossfade / prices=index + live figure / faq=heading + rows / close=text + photo / footer=mark built large
Scores: design 7 · usability 8 · creativity 6 · content 8 → overall 7.2
Caps applied: none
Top three problems:
1. The left-pointing marigold triangles (logo wedge and bullets) read like a media "previous" button (fold-1440-light). Fix: the mark became stem plus chevron (a K), and the bullets became small squares.
2. "Try it again" showed before any answer, because the hidden attribute lost to display:inline-flex. The stage also left about 150px of dead engine below the choices (full-1440-light). Fix: [hidden] wins everywhere, and the stage is 460px (520px on phones).
3. The full-bleed Daily 10 photo cut the boy off at the forehead (full-1440-light). Fix: crop from the top so the face is never cut.
```

```
ROUND 2
Seen in one second: same hero. The guarantee field is now the loud moment halfway down, and the page closes on the date in large type.
Idea (one sentence): unchanged.
Live thing: unchanged.
Layout words by section: unchanged, splits stack below 1024px so headlines keep two lines.
Scores: design 7.5 · usability 8.5 · creativity 6.5 · content 8 → overall 7.6
Caps applied: none
Top three problems:
1. The results photo was a small 4-column tile next to three big numbers, so the proof read as a stats template (p1440-dark). Fix: the photo now takes 5 columns at 4:5.
2. The price panel sat far right and rendered half faded in full-page captures, because the panel's fade-in animation wasn't advancing off screen (crop-prices). Fix: the panel moved to column 7 and the animation was removed. It always renders solid now.
3. On iPad (834x1194) the hero photo ended two-thirds of the way down, leaving a blank band (fold-834-light). Fix: a 4:3 hero crop between 768 and 1100px.
```

What still falls short:

- The engine's dark theme (observatory) is green-black inside a warm near-black page. That's the
  product as it is.
- The page is long (11 screens) for a "quiet" direction.
- No video.
- The hero photo shows a lot of wall on wide screens. That's on purpose, but some will read it as
  empty.

## Fix round (2026-11-01)

The page keeps the Quiet direction. It now has 8 sections and is 8.6 screens long at 1440 (it was
11.4). At 375 it is 10.8 screens (it was 12.1).

New order:
1. Hero: headline, button, date. One new photograph.
2. The question, running in the real quiz engine.
3. Your Daily 10, with the weekly parent update folded in.
4. The March class, shown as a Zoom call.
5. The guarantee.
6. Private 1:1, with the three real results beside it.
7. Every plan in one list.
8. The questions parents ask, then the date and the button.

### Each critic item and what was done

**Blockers**

- **The opening drew the logo over the hero text.** Fixed.
  - On a first visit the opening now covers the page from the first paint. A small script in the
    head adds a `first-visit` class.
  - The cover stays fully opaque until the wordmark has landed in the header. Measured opacity is
    1.00 at 300 ms and at 750 ms, in both modes.
  - Only then does the cover fade out, over 160 ms.
  - The flying wordmark lands exactly on the header's wordmark (0 px off at 1440 and at 375).
- **The wrong-answer letter failed contrast.** Fixed.
  - The same failure was in the app's own engine: `text-ivory` on `bg-error`, 1.98:1 in light
    and 1.73:1 in dark.
  - The embed gives the wrong letter the same `night` ink the engine already uses for the right
    letter. It now measures 6.18:1 in light and 9.05:1 in dark.
  - **For the app:** the same fix belongs in the quiz code in `src/`. I did not edit `src/`.
- **The question was a frozen snapshot graded by the page.** Fixed. The real `QuizEngine` now runs
  on the page.
  - **How it was built.** It is the engine harness from `redesign/engine/README.md`, built as a
    static bundle into `live/`. Its source and build script are in `live/src/`.
  - **How the page shows it.** It loads in a frame when the visitor scrolls near it. Until then,
    the engine's own capture shows in its place.
  - **The question.** It is `adv-3`, the exponential growth question. `data-4` was ruled out
    because its explanation has an em dash.
  - **What works.** The engine's own selection, Submit Answer, grading, Show explanations (the
    engine's own explanation panel), the live timer with Hide Timer, Highlight, the scratch pad and
    the Questions guide.
  - **What is hidden, and why.** These do nothing on a marketing page: the calculator, the theme
    toggle (the page's toggle drives the engine's theme), Settings, Menu, close, bookmark, flag,
    cross-out, Transfer, Previous, Next and "See results". The last one would open a mastery
    screen, which rule 39 rules out.
  - **Start again.** A "Start the question again" link reloads the engine. It appears only after
    the question has been touched.
  - **Nothing in `engine/` or `src/` was edited.**
- **Your Daily 10 claimed a launch date.** Fixed.
  - "This winter" is gone. The headline is now "Ten minutes a day. Every miss comes back.", from
    offer.ts.
  - The point now reads "Coming to every paid plan." That is from the plan ladder, which lists Your
    Daily 10 in Platform, Plus, the class, Private and School.
  - **CONFIRM:** PRODUCT.md wants a season next to "coming". Please give one and add it to
    offer.ts.
- **The photos repeated one AI stock scene.** Fixed. The page now has 5 photo moments, each in a
  different place and light:
  - **Hero:** blue hour, teal bedroom, desk lamp. New.
  - **Your Daily 10:** the running track, daylight. Kept.
  - **The March class:** a Zoom gallery of four people, each in their own place (rule 46). David,
    the tutor, has a green study. Leo has a navy bedroom. Nora is at a yellow kitchen table. Jun is
    in a library study room. Each tile is a separate photograph set in HTML. No image model drew
    a screen.
  - **Private 1:1:** the tutor's study, kept, beside a new 17-year-old in a terracotta room with
    afternoon sun.
  - **Results:** the existing landscape campus stills (c8a, c8b, c8c), at 1440 and 1280 px wide.
  - **Removed:** hero-b (it had the steam artifact), the second chin-on-hand girl, parent-a,
    test-b and the old student-b.
- **The Cookies link was dead.** It now points at https://karmanprep.com/privacy.
  - /cookies still returns 404.
  - The Privacy page has no section about cookies (its headings run 1 to 10, and none covers them).
  - **For you, before launch:** publish the Cookie Policy at /cookies (rule 32), then point the
    link back. There is a comment at the link in index.html.

**Improvements**

- **Guarantee headline.** It now reads "Up 100 points, or up to the full price back." The table
  rows quote offer.ts word for word, including "You choose." and "Nothing back. The promise was
  kept." The lawyer should still read it.
- **Prices.**
  - Every plan now shows at once in one plain list, with name, price and one line each. The
    five-click selector is gone.
  - The heading is now "What each plan costs."
  - School has its own line: "Schools pay $10 per student a year."
- **Dead space.**
  - The verdict area is gone, because the engine grades the question itself.
  - The results now sit beside Private and are aligned to the top.
  - The weekly update is merged into Your Daily 10.
  - There are 8 sections now.
- **The logo stutter.** The separate mark is gone.
  - The wordmark now carries the marigold chevron inside its own K: an ink stem with marigold
    arms that touch it. It reads "Karman", never "K Karman".
  - The K is sized to the measured cap height of Instrument Sans (0.72 em).
  - The favicon is the same K.
  - **For you:** your own logo SVG replaces this when you send it.
- **Soft images.** fal returns 1360 x 768 at most, so no larger source exists.
  - No new image is shown wider than about 1.3x its file on a retina screen. The hero is a 652 px
    square from a 1360 file. The Daily 10 photo is about 650 px wide.
  - The campus stills now come from the 1440 and 1280 landscape sources. Before, they were the
    432 to 576 px portraits.
- **The critic's list was cut off after its fifth improvement.** The items after it never
  arrived, so they were not addressed.

### Pictures and spend this round

| Used | Shot | Where |
| --- | --- | --- |
| yes | quiet-hero-c | Hero |
| yes | quiet-zoom-tutor | Class tile, David |
| yes | quiet-zoom-a | Class tile, Leo |
| yes | quiet-zoom-b (second take) | Class tile, Nora |
| yes | quiet-zoom-c | Class tile, Jun |
| yes | quiet-student-c | Private 1:1, student |
| no | quiet-zoom-b (first take) | She looked upset, not locked in |

All shots used flux-3 on fal. 7 runs at a $0.10 quote each comes to **$0.70** quoted, under the
$0.75 limit. The spend log reads $0.24, because the balance check shares a balance with other
directors.

The style suffix in `assets/fresh/quiet.manifest.json` was changed. It no longer asks for "plain
negative space, warm neutrals", which is what made every room beige.

### Checks (fix round, final build)

- **taste lint:** 0 FAIL, 0 WARN.
- **taste inspect:** 0 FAIL, 2 WARN.
  - "No video": this round had no video budget.
  - Size count at 768: these are fluid steps of the same scale. At 1440 the sizes are
    16/19/23/35/52/64/88/218.
  - The hero headline is 2 lines at 1440 and 390, and 1 line at 768. No heading runs past 2 lines.
  - The page is 8.6 screens and 654 words, with 12 images.
- **Sideways scroll:** 0 px at 375, 440, 834 and 1440, in light and dark.
- **Overlap scan (rule 34):** every third of a screen, at all four sizes and both modes (33, 27,
  24 and 26 steps). Text on text: 0. Fixed or sticky elements over text: 0.
- **One highlighted button (rule 35):** at most 1 on screen at every step.
- **Contrast, by calculation, every page text pair:**
  - Light: 9 pairs, lowest 6.26:1.
  - Dark: 10 pairs, lowest 7.17:1.
  - 0 fails.
  - The tile name labels sit over photographs. Each label's ground was blended over the real
    photo pixels under it. Lowest: 10.52:1 in both modes.
  - In the engine: the wrong letter is 6.18 and 9.05, and the right letter is 6.44 and 10.11.
- **Links:** 36 checked, 0 bad.
  - Every in-page link points at a real section. They land the section at 0 px once the smooth
    scroll finishes; re-measured at 3 s.
  - The external links (free test, program, guarantee, private tutoring, pricing, terms,
    privacy) return 200.
  - The mailto link is correct.
- **Controls:**
  - Both theme toggles switch, are remembered after a reload and change the engine's theme
    without reloading it.
  - The phone menu opens with focus on Close. Escape closes it and returns focus to Menu. A link
    closes it and scrolls to its section.
  - The engine: B then Submit shows the error and success tints and Show explanations. The
    explanation opens. "Start the question again" resets it, then C grades correct. This was
    checked at 1440 and 375, in light and dark.
  - All five plan rows show.
  - The FAQ opens all 5 rows, one at a time.
- **Opening:**
  - First visit: 1,212 ms in light and in dark.
  - Skipped by a key press: 174 ms and 171 ms.
  - Reduced motion: a 728 ms and 727 ms fade.
  - Hidden on a second load.
- **Console:** 0 errors and 0 page errors across all runs, the engine frame included.

### Self-critique, two rounds

```
ROUND 1
Seen in one second: "Know the score before the SAT." beside a girl studying under a lamp at dusk; the marigold button and the date.
Idea: a keynote for parents, one idea per screen, with the real quiz engine in the middle.
Live thing: adv-3 in the real QuizEngine (Submit, explanation, timer, Highlight, scratch pad).
Scores: design 7.5 · usability 8.5 · creativity 7 · content 8.5 → overall 7.9
Top three problems:
1. "Start the question again" showed before the question had been touched (Hick). Fix: hidden until the first tap inside the engine; its line keeps its height, so nothing jumps.
2. The two stacked 16:9 Private photos made a 700 px column beside short text. Fix: 2:1 crops, framed on the faces.
3. The flying wordmark landed about 10 px below the header's wordmark. Fix: the wordmark itself flies, not its box (now 0 px off).
```

```
ROUND 2
Seen in one second: the same hero. Then the engine, the Zoom gallery and the bone or ink guarantee field as the three loud moments.
Scores: design 8 · usability 8.5 · creativity 7 · content 8.5 → overall 8.0
Top three problems (what still looks generated or messy):
1. Leo's brow is knitted and Jun looks a little glum. They read as concentrating at tile size, but they are the weakest faces. Not regenerated: the budget had $0.05 left.
2. The Private tutor photo is still the beige study from the first round. It is now paired with a strongly coloured student room. It is the next shot to replace.
3. On the 834 iPad the engine frame shows two hairline marks at its right edge (the engine's own scrollbar track). Left as the product is.
```

### Needs your yes

- **CONFIRM:** a season for Your Daily 10, then add it to offer.ts.
- **CONFIRM:** 10:00 a.m. ET.
- **CONFIRM:** the Wednesday, December 30 deadline.
- **CONFIRM:** "Platform" and "Plus" as plan names.
- **Before launch:** publish /cookies.
- **For the app:** the wrong-answer ink fix belongs in the app.
- **Your call:** the K wordmark versus your own logo.
- **Your call:** the four Zoom faces.
