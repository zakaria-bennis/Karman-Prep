# Editorial: the page as a magazine feature

Page: http://127.0.0.1:8811/fresh/editorial/index.html (serve with `node .impeccable/mocks/serve-mocks.mjs 8811`).
Every word is in `copy.js`. Prices, dates and claims come from `src/lib/marketing/offer.ts`.

## The idea

The home page reads like a magazine feature written for one parent. Its title is "The SAT, off the dinner table." Every section answers one question that parent has, and the page ends on the dinner table it promised.

- Taste-skill direction: `editorial-report` ("The printed annual", seed 1299416869). I took its composition: a masthead photograph, a column axis at 42%, text pages that alternate with full colour pages, a results table, two plan fields, and FAQ answers set as reading text.
- Redrawn by hand, with reasons:
  - Type: the deal was Hanken Grotesk, which is the rejected site's face.
  - Palette: the deal was plum, pink and pure white. That breaks rules 3 and 20 and rule 33's marigold.
- The live thing: a real Karman question, run in the real quiz engine fragment, that grades itself.

## Identity

- **Type.** Newsreader (serif, optical sizes) for headlines, reading text, prices and scores. Schibsted Grotesk for captions, navigation, tables and buttons. The engine keeps its own IBM Plex Sans.
- **Colour, light.** Paper `#f1efe9`, paper-2 `#e5e2da`, ink `#151514`, ink-2 `#4a4843`, marigold `#e9a11e` (with `#151514` on it).
- **Colour, dark.** Paper `#141413`, paper-2 `#1f1f1d`, ink `#ecebe8`, ink-2 `#aeada8`, inverse field `#e4e3df`. Marigold is the same in both modes.
- **Shape.** Square corners, no shadows, no gradients and no rules. Surfaces are separated by tone steps only.
- **Logo.** The mark is a square: ink across the top third, marigold below. The line between them stands for the Kármán line. The wordmark is "Karman", hand-drawn as one monoline stroke family in SVG, with no font.
- **Opening.** First visit only. The marigold rises, the ink band drops, the letters draw themselves, and the logo glides into the header. It takes 1.21 s, and any key, tap or wheel skips it. Under reduced motion it is a plain fade of 0.73 s.
- **Motion.**
  - Masked line reveal on the title.
  - Staggered rise on each section's parts.
  - A 40 s drift on the masthead photograph.
  - Buttons press to 0.97.
  - In-page links glide (instant under reduced motion).
- **Header.** In the page flow, never fixed or sticky (rule 34). On phones and iPads the links move behind a "Menu" sheet.

## Pictures (fal flux-3, manifest `assets/fresh/editorial.manifest.json`)

| Still | Status |
| --- | --- |
| kitchen-a | Kept (fix round). Masthead: a girl reads her phone at the kitchen island while her father pours coffee. Also the OG image. |
| zoom-student-b | Kept. Tutors diptych, left. |
| zoom-tutor | Kept. Tutors diptych, right. |
| parent | Kept. Note section. |
| dinner | Kept. Closes the page. |
| kitchen-b | Rejected (fix round). An Apple logo on the laptop lid. In `raw/rejected/`. |
| bus, desk-b | Retired in the fix round (bus read as stock; the desk photo was cut to shorten the page). Raw files stay in `raw/stills`, their WebPs are deleted. |
| desk, zoom-student, parent v1 | Rejected in round one (`raw/rejected/`). |
| bench, library, steps | Generated in round one, never used. In `raw/stills`. |

- The results section has no photographs any more. The old c8a-p, c8b-p and c8c-p stills are gone from `img/`.
- flux-3 on this route always returns 1360x768, so every photo slot is landscape or cropped from it.

## Checks (first build, superseded by the fix round below)

- **Taste lint:** 0 FAIL, 0 WARN.
- **Taste inspect** at 1440, 768 and 390: 0 FAIL, 3 WARN. I can defend all three:
  - `palette-cream`: the text `#f4f3e7` is the engine's own observatory ink inside the real fragment.
  - `font-fallback "math"`: KaTeX's MathML fallback inside the engine.
  - `no-footage`: there was no video budget this round. A slow drift on the masthead still stands in.
- **Sideways scroll:** 0 px at 375x812, 440x956, 834x1194 and 1440x900, in light and dark.
- **Overlap scan:** text boxes were scanned at every third of a screen. 0 overlaps at all four sizes (41, 34, 25 and 34 steps). There are no fixed or sticky elements over text.
- **Contrast** (calculated for every text element against its composited background):
  - 0 failures in light and 0 in dark.
  - Lowest pairs, light: ink-2 on paper-2 at 7.06:1, ink on marigold row tint at 7.33:1.
  - Lowest pairs, dark: ink-2 on paper-2 at 7.34:1, ink-2 on inverse at 7.11:1.
  - Button: 8.34:1 in both modes.
  - No text sits on a photograph.
- **Links:**
  - The free test button goes to https://karmanprep.com/free-practice-test (200).
  - /program, /private-tutoring, /pricing, /guarantee, /about, /terms and /privacy all return 200.
  - **/cookies returns 404 on the live site.** The footer links to it as briefed.
  - All 5 section anchors land at 0 px at 1440 and at 375 (header links and the phone menu).
  - The skip link, the brand link and "Back to the top" work.
  - Both mailto links work.
- **Controls:**
  - Theme: Light and Dark switch the page and are remembered across a reload. The device decides first, and dark is the default when the device states nothing.
  - Phone menu: opens with focus on Close, closes on Escape, and a link closes it and jumps.
  - Demo: A grades wrong (A in the engine's error tint, C marked with a check). "Try it again" resets. C grades right and the other choices dim.
- **Opening:**
  - Light: shown on the first visit, 1207 ms, not shown on the second load.
  - Dark: shown on the first visit, 1205 ms, not shown on the second load.
  - A key press at 200 ms ends it at 210 ms.
  - Reduced motion: a 729 ms fade.
- **Console:** 0 errors and 0 warnings at every size and mode.
- **Screenshots:** `/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/eae5e585-9868-40a3-bd97-fb3ad26100f3/scratchpad/fresh-editorial/` (`fold-` and `full-` files, sizes 375, 440, 834 and 1440, `light` and `dark`).

## Self-critique (first build)

ROUND 1
- Seen in one second: a calm masthead photograph, then a big serif title, "The SAT, off the dinner table." A marigold button sits under it.
- Idea: a magazine feature for the parent. The SAT shrinks to ten questions a day, a tutor on Zoom and a weekly note.
- Live thing: a real Karman question in the real engine that grades itself.
- Layout by section:
  - hero: masthead
  - method: photo and text, then the live figure
  - tutors: diptych
  - note: text and photo, then the dinner photo
  - results: marigold page with a triptych and a table
  - plans: two fields
  - guarantee: axis text and a table
  - questions: reading columns
  - close: photo strip and band
  - footer: the name first
- Scores: design 7 · usability 7 · creativity 7 · content 8, overall 7.2.
- Top three problems:
  1. On 1440x900 the button sat below the fold, under the standfirst. Fixed: the photo height follows the viewport, the button moved into the left zone under the title, and on phones it sits right after the standfirst.
  2. Four of the first five photographs were the same East Asian face, so the cast looked like one model's default. Fixed: recast desk and zoom-student (South Asian girl, Black boy).
  3. "Try it again" showed before any answer, and the method text floated low beside the photo. Fixed: `[hidden]` is now honoured and the text is centred against the photo.

ROUND 2
- Seen in one second: the same, now with the button visible on every first screen.
- Scores: design 7.5 · usability 8 · creativity 7 · content 8, overall 7.6.
- Top three problems:
  1. The note section showed two photographs back to back, and the photo strip at the close repeated the hero's "practise anywhere" point. That read as a picture dump. Fixed: the dinner photo now closes the page above the last button (peak-end), and the strip is gone. The page dropped from 12.1 to 11.3 screens.
  2. The schools line floated alone between plans and the guarantee. Fixed: it became a FAQ answer.
  3. The results table mixed three type styles in one row. Fixed: college is now set in the serif at the name's size.
- One more bug was found after round 2: on phones the standfirst collapsed to one word per line (a grid column under `display: contents`). Fixed and re-shot.

What a parent gets in five seconds: what Karman is (daily practice, a tutor on Zoom, a note to you), the free test's date, and one button.
What still looks generated: the flux skin is a little smooth, and the bus and desk light is very even.
What is still messy: the page is long on phones (about 13 screens at 375).

## For the founder (first build; see the fix round for the current list)

- Is the headline idea right for you: "The SAT, off the dinner table"?
- /cookies is 404 on the live site, and the footer links to it (rule 32).
- The page says Your Daily 10 and full-length tests are in Platform and Plus. PRODUCT.md says both must be labelled "coming" with a season until they ship. Tell me the season and I will add it.
- The class times (Tue and Thu, 7:00 to 8:30 p.m. ET) and the free test's 10:00 a.m. start are still `CONFIRM:` in offer.ts.
- The guarantee wording comes from offer.ts and still needs the lawyer's review.
- "Platform" and "Plus" are working names.
- Unused stills (bench, library, steps) are in `raw/stills` if you want them elsewhere.

## Fix round

Fixes for the independent critic's list, 2026-11-01. The direction is unchanged: a magazine feature for one parent.
The page went from 13.4 to 8.1 screens at 375 and from 11.3 to 7.7 screens at 1440.

### Critic items and what I did

| Critic item | What I did |
| --- | --- |
| The title was a metaphor ("The SAT, off the dinner table.") and did not say what Karman sells | New headline: "SAT prep without the nagging." The standfirst says the rest in one sentence each: real SAT questions on a phone or laptop, a Karman tutor live on Zoom, a note to you every week. The note section closes the loop ("You know how the week went without having to ask."). |
| Blocker 1: Your Daily 10 and full-length tests sold as live (PRODUCT.md:58) | Removed from every line of the page, the demo messages and the JSON-LD. The practice section now leads with what is live: practice skill by skill, a worked explanation for every question, a timer that hides, highlighting and a scratch pad. "Until it sticks" is gone. Founder question below about a "coming" season. |
| Blocker 2: the demo hid the tools and graded on tap; "exactly as your student sees it" | The engine's top bar is back with Calculator, Scratchpad, Highlight, the timer with Hide Timer, and the bookmark (rule 56). The timer runs from when the question comes into view, and Hide Timer works. The other tools are shown but inert. The flow is now the engine's own: choose (the engine's selected classes), then the engine's Submit Answer button (its exact classes from ActiveQuizScreen.tsx, all present in engine.css), then graded. The intro now reads "A Karman question in the Karman quiz engine. Choose an answer, then submit it." Hidden still: the engine's own theme toggle (the page switch drives it), Settings, Menu, Close, cross-out, Transfer and the bottom bar (Previous and Next lead nowhere here). |
| Blocker 3: the note photo's alt text described a rejected image | Rewritten from the file: "A father on a grey living-room sofa smiles at his phone, a green throw and a fig plant beside him." Checked every alt in copy.js against its file: hero (new kitchen photo), diptych left and right, parent, dinner. |
| Blocker 4: plan-by-plan selling, cohort schedule, "ends on the SAT", eight-question FAQ | The six-row price list, the cohort dates and the guarantee table are off the home page. The guarantee is now two lines with "Read the full terms" beside the results (proof next to the promise). "Ends on the SAT" is gone from copy and JSON-LD. The FAQ is three shared questions (cost, the 1500 student, phones), with "See every price" linking /pricing. Header and footer lose "Plans". |
| Blocker 5: filler captions | All five captions are deleted (hero, method photo, tutors, note photo, demo). On phones the H1 sits right under the photo. |
| Blocker 6: old c8 results stills with defects | Removed. The results are a typographic marigold page: name, official score, college, and "Karman 1:1 tutoring, median 16 weeks." I did not generate new portraits: putting a score next to a generated face is the riskiest use of rule 47, and the table reads faster. Founder can ask for portraits later. |
| Blocker 7: nothing gets a phone reader to the free test for most of the page | Two in-flow repeats of the button (after the live question, after the note section), not a floating dock, because a fixed dock covers body text on the way past (rule 34; the apple-product director hit the same wall and removed theirs). Rule 35 is kept by script: a repeat steps back (fades out, keeps its space) while any other button is on screen. Steps with a button on screen: 375: 13 of 25 (was 4 of 17); 440: 16 of 21 (was 4 of 15); 834: 13 of 16; 1440: 14 of 24 (was 3 of 15). Steps with two buttons: 0 at every size. |
| Blocker 8: OG image and /cookies 404 | Made `img/og-home.jpg` (1200x630, the kitchen photo with the mark and wordmark), pointed og:image at it with width, height and alt, and added twitter:card. /cookies still 404s on the live site and the footer still links to it (brief and rule 32); the founder has to publish it. I also checked /cookie-policy and /legal/cookies: both 404, and /privacy has no cookies section to link to. |
| Blocker 9: structured data | JSON-LD now has Organization, a Course for The March SAT Program (start date, no "ends on"), a Course for Private SAT tutoring with both packages, the Event with eventStatus and a free offer, and a FAQPage. editorial.js rebuilds the FAQPage from copy.js at load, so the founder's edits stay in sync. |
| First impression: stock-looking bus photo | New masthead photo (kitchen-a): a family kitchen at breakfast, the student on her phone, her father in the background. It tells the headline's story. |
| First impression: theme switch an unlabelled grey box on phones | The switch shows "Light" and "Dark" as words at every width (glyphs join from 1280 px). At 375 the header fits brand, switch and Menu in one row. |
| First impression: the page is long | 8.1 screens at 375, 7.0 at 440, 5.1 at 834, 7.7 at 1440 (was 13.4 and 11.3). |
| First impression: the first marigold met is a phone picture | The first marigold is now the button. |

### Pictures this round

- Generated editorial-kitchen-a and editorial-kitchen-b on flux-3, quoted $0.10 each, $0.20 in all. The balance read $0.05 and $0.00 because other directors share it.
- Kept kitchen-a. At full size the hands, faces and spoon are clean, the laptop lid has no logo and the screen faces away. Rejected kitchen-b for an Apple logo on the lid.
- Converted kitchen-a to `img/hero.webp` (1360) and `img/hero-800.webp`. Deleted the unused bus, desk, mateo, priya and ava WebPs.

### Checks (fix round, all rerun)

- **Taste lint:** 0 FAIL, 0 WARN. The clock's `padStart` carries a taste-skill-ignore comment.
- **Taste inspect** at 1440, 768 and 390: 0 FAIL, 4 WARN. The headings are 10, the longest is 2 lines and the median is 4 words. I can defend all four warnings:
  - `palette-cream`, `font-count` (IBM Plex Sans) and `font-fallback math` all come from inside the real engine fragment.
  - `no-footage`: there is no video budget this round.
- **Sideways scroll:** 0 px at 375x812, 440x956, 834x1194 and 1440x900, in light and dark.
- **Overlap scan** of text boxes, every third of a screen:
  - 0 overlaps at all four sizes (25, 21, 16 and 24 steps).
  - No fixed or sticky element.
  - A separate scan inside the engine finds 0 overlaps at 375, 440, 834, 1180, 1280 and 1440, and Submit Answer stays inside the frame at every width.
  - At 1024 the scan flags the engine's own ellipsis on "Linear equations (one variable)": the clipped text box runs under Calculator. That is the engine's `truncate`; the render shows no overlap.
  - Fixed this round: at 440 the tools ran over the "MATH" label. The label now keeps 11rem and the tools wrap under it.
- **Contrast**, calculated for every text element against its composited background: 0 failures in light, 0 in dark.
  - Lowest, light: ink-2 on paper-2 7.06:1; ink on the marigold row tint 7.33:1.
  - Lowest, dark: inverse-ink-2 on inverse 7.11:1; ink-2 on paper-2 7.34:1.
  - Button: 8.34:1 in both modes.
  - No text sits on a photograph.
- **Links**, all clicked or fetched:
  - The free test URL returns 200 (three buttons and the header link).
  - /program, /private-tutoring, /guarantee, /pricing, /about, /terms and /privacy return 200.
  - /cookies returns 404 on the live site.
  - Every header, sheet and footer anchor lands at 0 px: #method, #tutors, #results and #questions. So do the skip link (keyboard), the brand link and "Back to the top".
  - The mailto link works.
- **Controls:**
  - Theme: Light and Dark switch the page and are remembered after a reload.
  - Phone menu: opens with focus on Close, Escape closes it, and a link closes it and lands at 0 px.
  - Demo:
    - Choosing A shows the selected state with no grade.
    - Submit Answer grades it: A gets the error tint and C the check.
    - "Try it again" resets it.
    - C then Submit marks it right and dims the rest.
    - The timer runs, and Hide Timer hides it and reads "Show Timer".
    - The other tools have pointer-events none.
- **Opening:**
  - First visit: 1209 ms in light, 1210 ms in dark.
  - Not shown on the second load.
  - A key press at 200 ms ends it at 224 ms.
  - Reduced motion: a 724 ms fade.
- **Console:** 0 errors and 0 warnings at every size and mode.
- **Screenshots** are in `/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/eae5e585-9868-40a3-bd97-fb3ad26100f3/scratchpad/fresh-editorial/`: `fold-` and `full-` at 375, 440, 834 and 1440, light and dark (replaced). Also `demo-*`, `engine-*`, `results-*` and `menu-375.png`.
  - Full-page shots are taken from the top of the page, with the hero button on screen. So the two in-flow repeats show as gaps there, by design (rule 35).

### Self-critique, fix round

ROUND 1
- **A parent understands in five seconds:** this is SAT prep, the practice is on a phone, there is a tutor on Zoom, a weekly note comes to the parent, and the free test is on December 12.
- **What looks generated:** the flux skin on every face, and the dinner photo's staged pasta table.
- **What is messy:**
  1. At 1440 the results table stretched across all 12 columns, and the guarantee floated alone under it. Fixed: the table takes 7 columns and the promise stands beside it, aligned with the intro.
  2. At 440 the engine's tools ran over the "MATH" label. Fixed: the label keeps 11rem, so the tools wrap.
  3. At 1024 Submit Answer fell below the demo frame. Fixed: the frame is 620 px from 1024 to 1279 and 560 px above that. The probe now confirms it at seven widths.

ROUND 2
- **A parent understands in five seconds:** the same. The proof now sits next to the promise.
- **What is messy:**
  1. The hero facts ended on a lone "Free" under a button that already says "free". Fixed: the line is deleted.
  2. The close repeated "Free." Fixed: it now reads "Saturday, 10:00 a.m. ET. A new one runs every month."
  3. The phone demo opened with the question above its "Try one." intro. Fixed: the intro comes first, the question next, then the result, "Try it again" and the button.
- **Left as is:**
  - At 375 the engine's own top bar wraps into three rows. That is the real engine at that width, and the page does not restyle it.
  - The dinner photo still looks a little staged.

### For the founder (current)

- Your Daily 10 and full-length tests are no longer on the home page. Tell me the season they ship, and I can add them back labelled "coming".
- /cookies is a 404 on the live site, and the footer links to it (rule 32).
- og:image points at `img/og-home.jpg` in this mock. On ship it needs to live at https://karmanprep.com/og/home.jpg with an absolute URL.
- The headline is new: "SAT prep without the nagging." Is the word "nagging" right for your parents?
- The results have no portraits now. Do you want new generated campus portraits of Ava, Mateo and Priya (rule 47), or does the table stay alone?
- Still `CONFIRM:` in offer.ts:
  - the free test's 10:00 a.m. start
  - the March class times
  - the lawyer's review of the guarantee wording
