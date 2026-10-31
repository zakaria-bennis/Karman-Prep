# Karman Prep site reform: Season Portrait

Final brief, 2026-10-20. Part 1 is for Zakaria, in plain words. Parts 2 to 7 are for whoever builds it.

Where this stands: the judge chose **Season Portrait** (48 of 60). This brief keeps its story and its quiet, disciplined motion. It adds the best ideas from The Session and The Route and fixes every fatal problem the judge named. Nothing has been built yet. No Higgsfield credits have been spent: the balance is 110 on the Plus plan, read 2026-10-20, and no generations exist yet.

---

## Part 1. For Zakaria

### The idea in one line

The homepage is a portrait of one student's season, shown to the parent: an evening of real work, the coach who reviews it, the tools and method behind it, nine dated weeks, and a free first step today.

### What we take from each site, and what we leave

- **Lando Norris (landonorris.com).** We take the order of the story. The person comes before the product, so your signed note is the second thing a parent sees. The page ends where it began: Lando's site opens with the helmet off and closes with it on, and ours opens on a desk in the evening and closes on the same desk on test morning. We also take the film that shrinks into a framed picture, the signature that writes itself, and a colour that tells you which product you are entering. We leave the neon green, the two-second loading screen, the scribbles, the race countdown and the sideways photo strip.
- **Jesko Jets (jeskojets.com, the site you called Just Jets).** We take the feeling that arriving starts a trip. One button travels with the reader from the first screen and lands at the end. The colour changes chapter by chapter. Every movement uses the same few speeds, so the site feels made by one hand. We leave the planes, the three-second loading screen, rounded pill buttons, shadows and gradients.
- **Elevate.** We take the feel of its games. You tap an answer and the result lands almost at once, then the explanation follows a beat later. A card grows into the game itself, with no loading screen in between. Progress is something you watch fill in. We leave the bright game colours, hexagons, points, hearts, streaks, confetti and shouty praise.

### The homepage, in the order a parent sees it

|                   | Headline                                               | What the parent believes after it                                                                        |
| ----------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 1. Arrival        | SAT prep with live classes, daily practice, 1:1 review | This is serious and complete SAT prep, and I can try it free today.                                      |
| 2. Your note      | I review every full-length test myself                 | A real, qualified person will go through my child's mistakes, and his results are labelled honestly.     |
| 3. The nine tools | Nine tools aimed at one test date                      | This is a whole platform built around one date, and they say plainly what exists today.                  |
| 4. The method     | What happens to a missed question                      | The method is specific and backed by research. Every mistake is reviewed, then comes back on a schedule. |
| 5. The season     | How the nine weeks run                                 | I know how each week runs, what my child does, what I will see, and the date it ends.                    |
| 6. Two doors      | Two ways to work with Zakaria                          | There are two clear paths. The program is selective for real reasons.                                    |
| 7. Free today     | Try today's SAT question, free                         | I just used the real product, and my child can start free without signing up.                            |
| 8. Questions      | Questions parents ask                                  | Cost, risk and fit are clear, and nobody is pushing me.                                                  |
| 9. Test morning   | Start with a free practice test                        | This ends on a real date, and the first step is free and small.                                          |

Every headline was measured in Chrome with the real fonts: none runs past two lines on a laptop, a tablet or a phone. The page is about 10 screens on a laptop and 13 on a phone, down from 11 and 15 in the judged version.

### What moves, in plain words

- **The big moment.** As the parent scrolls past the first screen, the evening film shrinks into a framed picture on the left. The headline parts and fades. Your note rises on the right, and your signature writes itself as they scroll. If they scroll back, it unwrites.
- **The game moment.** In the free chapter, the parent answers today's real SAT question. The chosen letter fills at once, a ring draws around the right answer and the explanation slides up. If they miss it, the page shows the exact dates that question would come back in the March program. At the very end, a small card sums up their answer beside the free test button.
- **Doors that open into pages.** Tap the green or oxblood door and its colour grows into the top of the next page. Tap the question card and it grows into the daily page.
- **Quiet everywhere else.** Text rises in once. Buttons change colour when you point at them. Nothing bounces, and nothing loops just for decoration.
- **With "reduce motion" switched on,** the page is complete and still.

### What stays honest (short version)

No testimonials. Your 1:1 results always carry "Karman 1:1 tutoring, median 16 weeks". The question count on the page is the live count rounded down (2,500+ today) until 10,000 are really live. Anything not built yet says "Coming, winter 2027". Dates come from one list and never show a date that has passed. No countdowns and no "seats left" unless it comes from real enrollment data. Generated pictures never show people and are credited in the footer. You appear only in your own photo.

### Before any credits are spent

1. We build the homepage with stock pictures and the real product screens.
2. You watch a phone recording of your note scene and the question game, and say yes or no.
3. Only then do you run the picture list at higgsfield.ai. The Higgsfield connection in these sessions can read your balance, the model list and finished generations, but it cannot generate. Part 6 has the list in order, with every prompt ready to paste.

Your three questions are at the end (Part 7).

---

## Part 2. Builder spec: what must land first

These block every page. Do them in one PR before phase 1 work.

1. **COHORTS refactor in `src/lib/marketing/offer.ts`.** `MARCH_PROGRAM` becomes `PROGRAM` (what every cohort includes) plus `COHORTS[]`, one entry per upcoming SAT date: `id`, `testDate`, `testDateLabel`, `testDateShort`, `startDate`, `startLabel`, `startShort`, `enrollmentClosesDate`, `enrollmentClosesLabel`, `paidSeats` (5), `scholarshipSeats` (1), `price`, `installments`, `depositAmount`. Add `nextOpenCohort(today)` (the first cohort whose enrollment close is today or later) and `returnDates(cohort)` (start plus 0, 2, 7 and 21 days). For March that gives Monday, January 4; Wednesday, January 6; Monday, January 11; Monday, January 25 (weekdays checked). May 1 and June 5 need start and close dates from Zakaria. The March rhythm (start on a Monday, 61 days before the test) gives Monday, March 1 and Monday, April 5. Mark them `CONFIRM:`.
2. **Dash rewrites in rendered strings** (copy rule 1):
   - `includes[2].detail`: "Zakaria goes through every mistake with you: what happened and how to fix it."
   - `includes[3].detail`: "Test mechanics (pacing, Desmos, how the adaptive second module works), alternating with workshops on the skills students miss most."
   - `FREE_PRACTICE_TEST.format`: "One Reading and Writing module and one Math module, about 49 questions."
   - `scheduleLabel`: "Tuesdays and Thursdays, 7:00 to 8:30 p.m. ET" (still `CONFIRM:`).
   - Add a unit test that fails on U+2014 or U+2013 in any exported string.
3. **Question count that can never block a release.** Add `QUESTION_BANK.liveCount` (2588, dated 2026-10-19) and `bankCountLabel()`. It returns "10,000+" only when `liveCount >= claimedMinimum`, and otherwise the live count rounded down to the nearest 500 ("2,500+"). Every rendered count uses it: hero, index, `PROGRAM.includes`, `PRIVATE_INCLUDES`. The release preflight checks `liveCount` against the database's live count and fails if the database is lower. The hero then never states a number the preflight would refuse.
4. **Status map.** Export `TOOL_STATUS` from `offer.ts`: each tool is `live`, `starts` (renders "Starts January 4" from `nextOpenCohort().startShort`) or `coming` (renders "Coming, winter 2027"). The ecosystem index, the season captions, the route and every "Coming" label read it. No status string is typed into a component.
5. **Practice-test dates.** `PRACTICE_TESTS[]` replaces the single `FREE_PRACTICE_TEST` date (December 12 is the first entry). Past dates drop off. When none is upcoming, copy falls back to "Start the 35-question diagnostic now".
6. **Focus ring and dock tokens per ground** (tables in Part 3.5).
7. **Routes.** Add `/method`, `/program/apply` and `/private-tutoring/call` to the spec's URL map. The mockups already link to all three.
8. **Spec updates** to `docs/superpowers/specs/2026-10-19-site-redesign-design.md`: section 3's motion paragraph points to this brief; light `bg` becomes #f1f1ee as in the approved mockups; no hero eyebrow; the `line` token is used only inside `data-ui` fragments and form fields.

---

## Part 3. The homepage, chapter by chapter

Grid: 12 columns, equal outer margins of 32px on desktop and 16px on phones, sections 160 to 200px apart. Type: Source Serif 4 500 for headings and display, Hanken Grotesk for everything else. At most five sizes per page.

| Role                                  | Size                                               | Notes                                           |
| ------------------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| H1                                    | 32px under 600px; `clamp(44px, 5.2vw, 76px)` above | Leading 1.02, tracking -0.03em, max-width 860px |
| H2                                    | `clamp(30px, 3.6vw, 52px)`                         | Leading 1.05, tracking -0.02em                  |
| Display (close date, footer wordmark) | `clamp(44px, 9vw, 136px)`                          | Leading 0.95, tabular figures                   |
| Statement                             | 34px desktop, 22px phone                           | A `<p>`, about 25 words at most                 |
| Body                                  | 18px (17px phone); small text 15px                 | Full ink                                        |

Line counts were measured in Chrome with the Google Fonts files at 1440, 768 and 375px: every H1 and H2 below sets in one or two lines.

### Chapters 1 and 2 share one section: `#portrait` (the signature move)

**Ground.** Night field under a full-bleed film. `data-ground="night"`, header ink bone.

**Chapter 1. Arrival (what is on the first frame, server-rendered)**

- **H1**, authored as two line spans that hold at every width: "SAT prep with live classes," / "daily practice, 1:1 review". Measured: two lines at 375, 390, 768 and 1440.
- **Sentence** (19px, bone, max 52ch): "One program aimed at your student's SAT date. Groups of up to six, {bankCountLabel} practice questions at seven levels, and an hour with Zakaria after every full-length test."
- **Primary button** "Take the free practice test" → `/free-practice-test`. On the film it uses #e2b867 fill with ink text (8.83:1). `data-cta="free-test"`.
- **Text link** "See the SAT Program" → `/program`.
- **"Pause film"** text button, bottom right, 15px bone. It toggles to "Play film" (WCAG 2.2.2).
- **Header:** the Karman Prep wordmark; Programs (The SAT Program, Private tutoring, Pricing); Free tools (Free practice test, Diagnostic, Daily Question and word game, Question bank); The method; About; FAQ; the Dark mode toggle; Sign in. It is transparent over the film, with no blur.
- **Scrim**, the one allowed gradient: `linear-gradient(90deg, rgb(11 15 20 / .62) 0%, rgb(11 15 20 / .35) 45%, transparent 70%)` on desktop, and from the bottom on phones. CI samples the poster's brightest pixels under the text box and checks bone text at 4.5:1 or better.
- **Nothing else sits on the film.** The stats move to chapter 2.

**Load sequence** (CSS keyframes under `html.js` and `prefers-reduced-motion: no-preference`; done by 1.2s; four things move):

| Element                                                  | From              | To      | Duration | Ease          | Delay        |
| -------------------------------------------------------- | ----------------- | ------- | -------- | ------------- | ------------ |
| Poster `<img>` (the LCP element, `fetchpriority="high"`) | scale 1.06        | scale 1 | 1200ms   | `--ease-soft` | 0            |
| H1 line spans, each in an `overflow: clip` mask          | translateY 105%   | 0       | 900ms    | `--ease-expo` | 100ms, 210ms |
| Sentence                                                 | y 12px, opacity 0 | 0, 1    | 500ms    | `--ease-out`  | 420ms        |
| Button and link                                          | y 12px, opacity 0 | 0, 1    | 500ms    | `--ease-out`  | 480ms        |

The film's `src` is set only after the `load` event plus `requestIdleCallback` (2s timeout). It fades in over the poster (600ms ease) once it can play. Phones run the same sequence without the poster scale. Save-Data, a slow connection (`effectiveType` of 3g or slower) or reduced motion gets the poster with a "Play film" button and no autoplay.

**Chapter 2. The coach's note (scrubbed)**

- **H2** (first person): "I review every full-length test myself".
- **Note** (18px, two sentences, a draft for Zakaria to rewrite in his own words): "After each of the five full-length tests, your student and I spend an hour on every question they missed: what happened and what to do next time. Between tests I teach the live classes and answer the cohort's questions every day."
- **Signature:** Zakaria's scan traced to SVG paths (one path per pen stroke). Until it arrives, his name is set in the serif at 26px and rises instead of drawing.
- **Proof** (two lines): "+285 points on average, from 1235 to 1520" and "94% reached their target", with `TRACK_RECORD.sourceLabel` ("Karman 1:1 tutoring, median 16 weeks") set directly beside them at 15px.
- **Link:** "Meet Zakaria" → `/about`.

**Scene build.** A client `PortraitScene` component, ported from `.claude/skills/taste-skill/assets/scenes/stage.js` (keep its resting state, phone plan and reduced-motion guards). GSAP 3.15.0 with ScrollTrigger, imported dynamically after `load` plus idle. Until it loads, the page is the finished reduced-motion composition, so nothing waits on it.

Desktop (992px and up): the section is 250svh with a sticky 100svh stage, so it holds for 1.5 screens. Scrub is `true` when Lenis runs and `0.6` on native scroll. Every tween is linear inside the timeline.

| Progress     | What happens                                                                                                                                                                                                                                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 to 0.3     | H1 line 1 x 0 → -10vw, line 2 x 0 → +10vw, both opacity 1 → 0, inside `overflow: clip`. Sentence and buttons y 0 → -24px, opacity → 0. The dock appears at 0.3.                                                                                                                                                                        |
| 0 to 0.55    | The film frame moves from full bleed to the rect of an invisible placeholder `.note__frame` (grid columns 1 to 6, vertically centred). The transform is computed from the two rects on every ScrollTrigger refresh (`invalidateOnRefresh`). Transform only. A flat night layer over the film goes 0 → 20% opacity. Corners end at 6px. |
| 0.4 to 0.7   | The note H2 lines rise from masks (yPercent 105 → 0, 90ms apart). The paragraph rises 16px with opacity.                                                                                                                                                                                                                               |
| 0.55 to 0.95 | Signature `stroke-dashoffset` runs from the path length to 0, strokes in sequence. Scrolling back unwrites it.                                                                                                                                                                                                                         |
| 0.85 to 1    | The proof lines and the link rise 12px with opacity.                                                                                                                                                                                                                                                                                   |

Phones (under 992px): the section is 200svh and holds for one screen. The film frame shrinks into a card across the top 44% of the stage (16px side margins) using only transforms. The outer frame scales non-uniformly (scaleX about 0.915, scaleY 0.44) with `overflow: clip`. The inner `<video>` counter-scales (scaleX 1, scaleY 0.915 / 0.44) so the picture never distorts, and the corner radius is compensated per axis. The H1 only fades. The note sits below the card, and the signature draws from 0.5 to 0.9. The ecosystem therefore arrives on the third screen on phones and laptops alike.

**Reduced motion and no script:** no pin. The hero is shown as it is on the first frame, with the poster. Then comes a night section with the poster still as a 6px-cornered card (left on desktop, on top on phones), the note, the fully drawn signature and the proof.

**Media:** the hero film (stock now, Higgsfield V1 later) and the same `<video>` element in the card, so nothing extra downloads. No generated or stock face ever stands in for Zakaria. His real photo may sit small under the note once supplied.

**The parent believes:** this is serious, complete prep; a qualified person stands behind it and will personally go through my child's mistakes.

### Chapter 3. The nine tools (`#tools`, night field)

- **H2:** "Nine tools aimed at one test date".
- **Sentence:** "Each part feeds the next: a question missed in class comes back in practice, gets reviewed one-on-one, and shows up in your weekly update."
- **Index:** nine rows. Each row has the name in serif (40px desktop, 24px phone), one fact (17px) and a status from `TOOL_STATUS` (15px, sentence case), right-aligned. Every row is a link to the page that explains it.

| Tool                                | Fact                                                                | Status              | Link                    |
| ----------------------------------- | ------------------------------------------------------------------- | ------------------- | ----------------------- |
| Live classes                        | Two 90-minute classes a week, groups of up to six.                  | Starts January 4    | /program#how-it-runs    |
| Full-length tests with a 1:1 review | Five tests, each followed by an hour with Zakaria on every mistake. | Starts January 4    | /program#reviews        |
| Daily 10                            | Ten minutes a day. Missed questions return after 2, 7 and 21 days.  | Coming, winter 2027 | /method#daily-10        |
| Question bank                       | {bankCountLabel} questions across 39 skills at seven levels.        | Live                | /question-bank          |
| Weekly live session                 | Pacing, Desmos, the adaptive second module, and skill workshops.    | Starts January 4    | /program#weekly-session |
| Cohort chat                         | Questions to Zakaria answered every day.                            | Live                | /program#cohort         |
| Weekly parent update                | Practice time, attendance, test scores and what's next.             | Starts January 4    | /program#parents        |
| Daily Question                      | One real SAT question a day, free, no account needed.               | Live                | /daily                  |
| Word game                           | A daily vocabulary game, free.                                      | Live                | /daily#word-game        |

- **Preview frame:** sticky in grid columns 1 to 5, 4:3. It shows the real screen of the hovered or focused row, built from portal components with Example data. It shows row one at rest. Daily 10 and the in-app full-length test are drawn as designed states that carry their "Coming" label, never as fake finished screens.
- **Motion:**
  - Rows rise 16px with opacity, 70ms apart, once, when the list's top reaches 85% of the viewport.
  - Hovering or focusing a row lightens its band one tone (180ms ease) and swaps the frame: the new screen fades in (400ms ease) and settles from scale 1.04 (600ms `--ease-expo`).
  - On touch devices 768px and wider (`hover: none`), the frame follows whichever row crosses the middle band of the viewport.
  - Phones get an accordion with the first row open. Opening a row animates `grid-template-rows` from 0fr to 1fr (320ms `--ease-out`). The screen inside rises with the Jesko curtain: wrapper yPercent 100 → 0 and image yPercent -30 → 0, 900ms `--ease-expo`.
  - Reduced motion: instant swaps.
- **The parent believes:** this is a whole platform built around one date, and they say plainly what exists today.

### Chapter 4. The method (`#method`, bone field)

- **H2:** "What happens to a missed question".
- **Statement** (34px, ink fill): "A 2013 review of ten study techniques rated two highest: practice tests and spaced practice. Karman is built on both."
- **Citation** directly under it (15px): "Dunlosky, Rawson, Marsh, Nathan and Willingham (2013), Psychological Science in the Public Interest." Link "See the research" → `/method`.
- **Practice page** (right, `data-ui`, labelled Example): a Reading and Writing question tagged "Transitions", "Level 4 of 7", with the student's wrong choice marked. Skill names are copied word for word from `approved-skill-taxonomy.json`.
- **Review handle** splits the page. Left of the handle is the student's attempt. Right of it is the same page after the 1:1, with three margin notes from Zakaria: what the question tests, why the wrong choice looked right, and the fix.
- **The route** (graft from The Session) replaces the three static return chips. Four dated stops come from `returnDates(nextOpenCohort())`:
  - "Monday, January 4": "Missed in class. Zakaria's note goes in the mistake log."
  - "Wednesday, January 6": "Back in the Daily 10." Labelled "Coming, winter 2027".
  - "Monday, January 11": "Back again, and answered right." Labelled "Coming, winter 2027".
  - "Monday, January 25": "Answered three weeks later. Transitions moves from level 4 to level 5." Labelled "Coming, winter 2027".
  - A chip rides the route. It reads "Example miss: Transitions, level 4", or, only if the visitor missed today's question in chapter 7, "Your miss: {skill}, level {n}".
  - Link: "Try today's question" → `/daily`.
- **Motion:**
  - **Ink fill.** Split the statement into words once, then scrub their colour with `animation-timeline: view()` over the `cover 20%` to `cover 45%` range, from 55% ink (3.63:1 on bone, 5.31:1 in dark mode; large text) to full ink. Where scroll timelines are unsupported, the statement is full ink.
  - **Handle on desktop.** The pointer's x drives `clip-path: inset(0 0 0 X)` on the review layer, smoothed by a lerp of 0.18 per frame. It rests at 50%, so the page reads as half reviewed with no input. Keyboard: `role="slider"`; arrow keys move 10%, Home and End jump to the ends. Touch: two buttons, "Their answer" and "The review", wipe the layer across in 600ms `--ease-in-out`.
  - **Marker sweep** (Lando), once, on the first reveal of the notes: each line's text uncovers left to right (`clip-path: inset(0 100% 0 0)` → `inset(0)`, 600ms `--ease-out`). A solid program-green block shrinks away from the right (scaleX 1 → 0, 600ms `--ease-in-out`, starting 300ms later). Lines are 90ms apart.
  - **Route.** The rail is a filled 4px bar (#1e5b4b light, #7cc4a5 dark). It scales on Y with `animation-timeline: view()` (cover 30% to cover 70%, linear); without scroll timelines it fills once over 1200ms. As the bar reaches each stop, the stop's 14px square fills (300ms `--ease-out`) and its text goes from 65% to full ink. The chip rides the bar's leading edge. Native scroll only: no hold.
  - **Reduced motion:** full ink, the handle jumps, no sweep, the bar is full, every stop is filled and the chip sits at the last stop.
- **The parent believes:** the method is specific and backed by research; a person reviews each mistake and it comes back on a schedule.

### Chapter 5. The season (`#season`, bone field, CSS sticky, no GSAP)

- **H2:** "How the nine weeks run".
- **Stage, desktop:** sticky 100svh. On the left (grid columns 1 to 7): a 3:2 picture, an Example student's skill map under it (the eight domains named as in the taxonomy: Information and Ideas, Craft and Structure, Expression of Ideas, Standard English Conventions, Algebra, Advanced Math, Problem-Solving and Data Analysis, Geometry and Trigonometry; each a seven-segment bar in program colour), then a row of nine week squares ending in the label "Test day, Saturday, March 6" (26px serif). On the right (columns 8 to 12), three captions pass, each with an H3 and a minimum height of 70svh. The section is about 240svh, so the hold is about 1.4 screens.

| H3                          | Caption                                                                                                                                                                                    | Picture                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Monday, January 4           | Classes start. The baseline is an official Bluebook practice test, proctored live on Zoom, so you see where your student starts.                                                           | S3, the kitchen table set for a test |
| Every week                  | Two 90-minute live classes in a group of up to six, and the weekly live session on pacing, Desmos and the adaptive second module. Ten minutes of Daily 10 every day (coming, winter 2027). | S4, the class-evening desk           |
| After each full-length test | An hour one-on-one with Zakaria on every mistake, and a weekly update for you. The last test is the dress rehearsal, the week before Saturday, March 6.                                    | S7, the kitchen table in the evening |

- **Count** in words, "2 of 3", updated live in an `aria-live="polite"` span. Link: "See the full schedule" → `/program/{nextOpenCohort().testDate}`. Every date comes from `COHORTS`.
- **This is where the old date card went.** The separate full-bleed date chapter is cut. The season's last caption and the end of the week row carry "Saturday, March 6", and the closing chapter shows that same date large over the test-morning photograph.
- **Motion** (the taste skill's "held picture, passing captions" recipe; one IntersectionObserver):
  - The caption crossing the middle band (40% to 60% of the viewport) becomes active at full opacity. The others sit at 65% (4.91:1 on bone, 6.93:1 dark).
  - The active picture crossfades in over 500ms ease.
  - The skill map adds segments for each new step: scaleX 0 → 1 from the left, 300ms `--ease-out`, rows 70ms apart (Elevate's progress as something built).
  - Week squares fill (300ms ease, 50ms apart): step one fills week 1, step two fills weeks 2 to 7, step three fills weeks 8 and 9 and turns the "Test day" label to full ink.
- **Phones:** no sticky. Each step stacks with its H3, caption and 3:2 picture. The skill map and week row appear once, after step three, and fill on view.
- **Reduced motion:** three static steps, then the final map and the full week row.
- **The parent believes:** I know how the nine weeks run, what my child does each week, what I will see, and the date it ends.

### Chapter 6. Two doors (`#paths`, two full-height product fields)

- **H2** (on bone, above the fields): "Two ways to work with Zakaria".
- **Green field.** H3 "The SAT Program". Sentence: "A class of up to six aimed at one SAT date. Admission by application." Six seat squares: five bone, one #e2b867, with the line "Five seats, plus one scholarship seat." Below them: "Seats are offered by application, and Zakaria reads every one." Next dates: "Next: Saturday, March 6. Then May 1 and June 5." (from `COHORTS`). Picture: the cohort class-schedule component (code, Example). Button: "See the SAT Program" → `/program`.
- **Oxblood field.** H3 "Private tutoring". Sentence: "Weekly one-on-one sessions with Zakaria, planned back from your test date." Picture: Zakaria's real photo, or the 1:1 session-note component until the photo arrives. Button: "See private tutoring" → `/private-tutoring`.
- **No prices.**
- **Motion:**
  - Entrance, not a scrub. When the section's top reaches 85% of the viewport, the green field arrives from xPercent -14 and the oxblood field from +14, opacity 0 → 1, 1000ms `--ease-expo`, 90ms apart, inside `overflow: clip`.
  - Pictures inside settle from scale 1.06 (1200ms `--ease-soft`).
  - Seat squares fill 70ms apart, once.
  - Buttons change fill only (180ms) and press 1px (140ms).
  - Clicking a door starts a view transition: the field (`view-transition-name: field-program` or `field-private`) grows into the destination page's hero field (480ms `--ease-in-out`).
  - Phones: stacked, each field rises 24px.
- **The parent believes:** there are two clear paths, and the program is selective for real reasons.

### Chapter 7. Free, today (`#free`, ochre field; the Elevate moment)

- **H2:** "Try today's SAT question, free".
- **Sentence:** "No account needed. Your student can also play the daily word game or take the free practice test."
- **Desktop fan:** three real phone-sized cards in the session shell. The centre card is today's real Daily Question and is playable. The left card is the word game (a link to `/daily#word-game`). The right card is the free practice test's intro card (a link to `/free-practice-test`). Cards have 6px corners and are separated by tone and a gap of ochre field, never by a shadow.
- **Links under the fan:** "Play the word game" (`/daily#word-game`) and "Take the free practice test" (`/free-practice-test`, `data-cta="free-test"`).
- **Fan motion:** on entry, the stack spreads once. Side cards rotate ±7 degrees, scale to 0.93 and move x ±22% of a card width (±11% under 992px), 1000ms `--ease-expo`, 70ms apart. The centre card stays flat. Side cards are links: on hover or focus their band steps one tone and the underline thickens. They do not lift (rule 25).
- **Phones:** no fan. The Daily Question card is full width and playable, with choices at least 56px tall. The word game and practice test are two rows below it (picture left, name and line right), rising 70ms apart.
- **Behaviour:** Part 4, moment E1. After an answer, the card footer offers "Open the daily page", which grows the card into `/daily` (moment E2).
- **No script:** the card is a link to `/daily`.
- **The parent believes:** I just used the real product, and my child can start free without signing up.

### Chapter 8. Questions parents ask (`#faq`, bone field)

- **H2:** "Questions parents ask". Five `<details name="home-faq">` rows, so only one is open at a time.
  - **What does it cost?** "The SAT Program is $995 for the founding March cohort, or three payments of $345. Later cohorts are $1,295. Private tutoring starts at $1,450 for 10 hours." Link "See pricing" → `/pricing`.
  - **What if the score doesn't go up?** `GUARANTEE.remedy`, plus "if you meet the conditions". Link "Read the guarantee" → `/guarantee`.
  - **When are the classes?** `scheduleLabel` (dash fixed, still `CONFIRM:`), live on Zoom.
  - **Do we talk to Zakaria first?** "Yes. After a three-minute application, you have a 20-minute call with Zakaria. A refundable $100 deposit then holds the seat."
  - **Is there financial help?** `SCHOLARSHIP.summary`.
  - Link: "See every question" → `/faq`.
- **Motion:** rows rise once, 60ms apart. Each answer opens with `grid-template-rows` 0fr → 1fr (320ms `--ease-out`). The open row steps from bg-2 to bg-3 (it does not turn green, because green means the program). The plus mark turns 45 degrees (240ms `--ease-in-out`).
- **The parent believes:** cost, risk and fit are clear, and nobody is pushing me.

### Chapter 9. Test morning (`#start`, the close)

- **Photo:** S2, the opening desk from the same camera on a Saturday morning in flat overcast light, laptop closed, kit packed. It reverses the first frame. On desktop it opens on scroll: `clip-path: inset(8svh 32px round 6px)` → `inset(0)` across one screen of scroll (scroll timeline, linear; IntersectionObserver fallback plays it once over 1000ms `--ease-in-out`). It also settles from scale 1.06 to 1.
- **Date figure** on the photo's calm left third, over the scrim, at display size: "Saturday, March 6" (a `<p>`, from `nextOpenCohort().testDateLabel` without the year, with the full date in `aria-label`). It rises once from a line mask (900ms `--ease-expo`). Measured: one line at 1440 and 768, at most two at 375.
- **Below, on bone, left column:**
  - **H2:** "Start with a free practice test".
  - **Sentence**, written from `FREE_PRACTICE_TEST` and the first upcoming `PRACTICE_TESTS` entry: "Live on Zoom on Saturday, December 12, proctored by Zakaria. About 75 minutes, with an estimated score range, a domain-by-domain breakdown and a 20-minute results call." The time (10:00 a.m. ET) is shown only once confirmed.
  - **The objection, directly above the button** (graft from The Route, copy rule 19): `INTAKE_NOTE`, verbatim.
  - **Button** "Take the free practice test" → `/free-practice-test`. Text link "Or start the 35-question diagnostic now" → `/diagnostic`.
- **Right column** (never empty): the finish card (moment E4) if the visitor answered chapter 7's question. Otherwise, the practice test's real intro card.
- **Dock handover** (Jesko's button that lands in the finale): as the closing button enters view, the dock leaves (translateY 120%, 260ms `--ease-exit`) and the closing button settles from scale 0.96 (400ms `--ease-out`).
- **Footer** (night band): "Karman Prep" set at full width in the serif, rising once from a line mask (900ms `--ease-expo`); Zakaria's signature, small; link groups (Programs; Free tools; Company: About, The method, FAQ, Contact; Legal: Terms of Service, Privacy Policy, Cookie Policy, Refunds); the theme toggle; the picture credit line; and the College Board line ("SAT is a trademark registered by the College Board, which is not affiliated with, and does not endorse, this website."). The header ink switches at the footer edge (300ms ease).
- **The parent believes:** this ends with my child ready on a real date, and the first step is free and small.

### Page length gate

The Playwright gate fails the homepage if `documentElement.scrollHeight / innerHeight` is over 11 on a 1440×900 screen or over 14 on a 390×844 phone. Targets are about 10 and 13.

---

## Part 3.5. Motion system

### Principles

1. The first frame is the finished hero. H1, sentence, button and poster are server-rendered and visible. The load sequence only adds arrival and ends by 1.2s. There is no preloader and no gate.
2. Bold twice, quiet everywhere else. The homepage has two held stages: the portrait (GSAP, 1.5 screens) and the season (CSS sticky, about 1.4 screens). `/program` has one. Every other page has none.
3. Every move shows where something came from or confirms an action: the film becomes the note's card, a door becomes its product page, the question card becomes the daily session, a missed question becomes its return dates. No decorative loops, marquees or particles.
4. One hand: one family of curves and a few durations everywhere (Jesko's discipline, in the taste skill's tokens).
5. Product colour is the only colour that moves. Marker sweeps, door fields, fills and the dock always use the colour of the product they belong to.
6. Text is readable at every frame. Nothing crosses text being read, there is no blur on text, the ink fill starts at 55% and dimmed captions sit at 65%.
7. Native scroll and an honest scrollbar. Nothing captures the wheel. Lenis is off at launch.
8. The reduced-motion page is the finished page. Phones get their own plan, not a shrunken desktop.
9. No racing vocabulary or props anywhere. The performance idea lives only in the structure: a portrait, a season, a date, a coach.

### Tokens (CSS custom properties, mirrored in `src/components/motion/tokens.ts` for GSAP)

| Token           | Value                           | Use                                                               |
| --------------- | ------------------------------- | ----------------------------------------------------------------- |
| `--ease-out`    | cubic-bezier(.22,1,.36,1)       | Entrances and UI under 600ms                                      |
| `--ease-expo`   | cubic-bezier(.16,1,.3,1)        | Reveals of 800ms or more, line rises, openings                    |
| `--ease-in-out` | cubic-bezier(.76,0,.24,1)       | Wipes, sheets, view-transition groups (the same curve Jesko uses) |
| `--ease-soft`   | cubic-bezier(.33,1,.68,1)       | Slow scale and drift on photographs                               |
| `--ease-exit`   | cubic-bezier(.55,.055,.675,.19) | Things leaving for good, at 60 to 70% of the entrance time        |
| (linear)        |                                 | Anything tied to scroll                                           |
| (ease)          |                                 | Colour and opacity                                                |
| `--t-instant`   | 67ms                            | Answer fill (about four frames)                                   |
| `--t-press`     | 140ms                           | Press                                                             |
| `--t-hover`     | 180ms                           | Hover colour                                                      |
| `--t-ui`        | 240ms                           | Menus, toggles, small UI                                          |
| `--t-ring`      | 300ms                           | Feedback ring, segment fills                                      |
| `--t-dock`      | 400ms                           | Dock, phone menu                                                  |
| `--t-vt`        | 480ms                           | View transitions (maximum)                                        |
| `--t-reveal`    | 800 to 900ms                    | Line rises and reveals                                            |
| `--t-open`      | 1000ms                          | Doors, fan, curtain swaps                                         |
| `--t-set`       | 1200ms                          | Picture settle (nothing runs longer)                              |

- **Staggers:** lines 90 to 110ms, list items 60 to 70ms. No character splits anywhere.
- **Triggers:** reveals fire once when the element's top reaches 85% of the viewport (one shared IntersectionObserver, `rootMargin: 0px 0px -15% 0px`). Nothing in view stays hidden longer than 900ms, and a 2.5s failsafe reveals everything.
- **No easing ever overshoots**: no bounce, elastic or magnetic buttons.

### Page transitions

- **Helper.** A `navigate(href)` helper in `src/components/motion/navigate.ts` wraps `router.push` in `document.startViewTransition`. The update callback resolves when `usePathname()` reports the new route. A 600ms guard calls `transition.skipTransition()` if the route is slow, so nothing ever hangs. It runs only on a plain left click without modifier keys, to a same-origin marketing route that is not a hash link or the current page. Back and forward are instant.
- **Root.** The old page fades out in 200ms `--ease-exit`. The new page rises 16px and fades in over 380ms `--ease-out`, starting at 60ms. The header carries `view-transition-name: site-header`, so it never flickers.
- **Named elements**, each name used once per page:
  - `field-program` and `field-private`: the homepage and `/pricing` doors grow into the hero field of `/program` or `/private-tutoring` (480ms `--ease-in-out`).
  - `dq-card`: the homepage Daily Question card grows into the `/daily` session shell (450ms `--ease-in-out`).
  - `cohort-{testDate}`: a `/program` cohort row grows into the hero of `/program/{testDate}` (480ms).
- **On arrival,** the subpage H1 rises from line masks (900ms `--ease-expo`). Next's route announcer stays on.
- **The theme toggle** crossfades the root over 240ms through the same API.
- **Reduced motion, or no View Transitions support** (Safari before 18, Firefox before 144): navigation is instant and every link still works.

### Controls and feedback (rule 25: feedback only on what can be used)

- **Buttons:** fill steps one tone (180ms ease), press 1px down (140ms), 4px corners, no icon motion, no shadow.
- **Text links:** underline goes from 1px to 2px and recolours (180ms). Links in body copy are always underlined.
- **Rows** (index, cohort table, FAQ): lighten one tone on hover and focus (180ms).
- **Focus ring:** 3px, offset 3px, on every focusable element. Colour by ground (calculated):

| Ground                                       | Ring                                                   | Contrast            |
| -------------------------------------------- | ------------------------------------------------------ | ------------------- |
| Bone #f1f1ee, bg-2 #e8e6df, bg-3 #dcd9cf     | Ink #15202e                                            | 14.52, 13.16, 11.64 |
| Night #15202e; dark grounds #11161d, #0b0f14 | #e2b867                                                | 8.83, 9.76, 10.33   |
| Program green #1e5b4b                        | #e2b867                                                | 4.25                |
| Oxblood #7b2d35                              | #e2b867                                                | 4.97                |
| Ochre field #85570c                          | Bone #f1f1ee (the light ochre ring would be only 3.35) | 5.51                |

The judged plan's #e2b867 ring on bone measured 1.64:1 and is gone. Each section declares `data-ground`, and the ring colour is a custom property set per ground.

- **Docked action button** (Jesko's travelling button): one solid button with 4px corners and no shadow or surround. On the homepage and free pages it is "Take the free practice test"; on `/program` and `/program/*` it is "Apply for a seat"; on `/private-tutoring` it is "Book a free strategy call".

| Ground under the dock  | Free                           | Program              | Private              |
| ---------------------- | ------------------------------ | -------------------- | -------------------- |
| Bone                   | #85570c fill, bone text (5.51) | #1e5b4b, bone (6.99) | #7b2d35, bone (8.18) |
| Night or dark          | #e2b867, ink text (8.83)       | #7cc4a5, ink (8.06)  | #e3959c, ink (7.08)  |
| Green or oxblood field | #e2b867, ink (4.25 and 4.97)   | n/a                  | n/a                  |

Ochre on green would be 1.27:1, which is why the dock never keeps one colour everywhere. Placement:

- It appears (translateY 120% → 0, 400ms `--ease-out`) once the hero's own button has left: progress 0.3 of the portrait scene, or out of view where nothing is pinned.
- It hides (260ms `--ease-exit`) while any `[data-cta]` for the same action is on screen, while the menu, the cookie banner or a form field is open, and over the footer.
- Desktop: bottom right, 32px in. Phones: a 52px full-width bar inside the 16px margins, above `env(safe-area-inset-bottom)`, with matching bottom padding on the page so it never covers content.
- Under reduced motion it appears and leaves with opacity only.
- **Header:** transparent over the hero, then a solid ground. Its ink follows the `data-ink` of the section under its midline (300ms ease). On phones it hides on scroll down (240ms `--ease-exit`) and returns on scroll up (240ms `--ease-out`). No blur, no pill.
- **Menus:**
  - Desktop dropdowns open in 240ms `--ease-out` from 6px below, each product link paired with its real screen.
  - The phone menu is a full-height ink sheet: `clip-path: inset(0 0 100% 0)` → `inset(0)`, 400ms `--ease-in-out`. Rows rise 16px, 50ms apart, and product names appear in their light product colours.
  - The in-house two-bar icon turns into a cross in 240ms. Focus is trapped while the menu is open, and Esc closes it.
- **Skeletons:** flat bg-3 blocks in the final shape, pulsing opacity 0.6 → 1 (1200ms ease-in-out, alternate). No gradient shimmer, and no pulse under reduced motion.
- **Icons:** the in-house 20px set with 1.5px strokes (menu, close, play, pause, plus). No Lucide.

### Reduced motion (and no script)

Every hidden start state sits inside `@media (prefers-reduced-motion: no-preference)` and under `html.js` (one inline line before paint). A site-wide `NEXT_PUBLIC_MOTION=off` switch adds `.motion-off` and serves this same page to everyone.

- **Hero:** the poster with a "Play film" button. No autoplay, no load sequence.
- **Portrait:** unpinned. The hero, then a night section with the still card, the note, the drawn signature and the proof.
- **Ink fill:** full ink. **Handle:** jumps, no lerp, no marker sweep. **Route:** full, every stop filled.
- **Season:** three stacked static steps with the final map.
- **Doors and fan:** in place, with no travel.
- **Answer feedback:** colour changes stay (they are 200ms or less and carry meaning). The ring appears already drawn, and nothing rises.
- **View transitions, the theme crossfade, Lenis and every loop:** off. Videos pause.

### Light and dark

- Tokens are defined on `:root` and redefined under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and again under `[data-theme="dark"]`. The existing `karman-theme` inline script sets the theme before paint. The visible toggle overrides the device setting and is remembered (wrapped in try/catch).
- **Chapter fields per theme:**

| Field           | Light            | Dark             |
| --------------- | ---------------- | ---------------- |
| `--field-night` | #15202e          | #0b0f14          |
| `--field-day`   | #f1f1ee          | #11161d          |
| bg-2, bg-3      | #e8e6df, #dcd9cf | #18202a, #212b37 |

- **Product fields** keep their deep values in both themes, because bone text passes on all of them: 6.99 on green, 8.18 on oxblood, 5.51 on ochre. Dark-mode text #ecebe6 measures 6.63, 7.75 and 5.23.
- **Small product-coloured text, rings and fills on dark grounds** switch to the light variants: #7cc4a5 (8.90 on #11161d), #e3959c (7.82), #e2b867 (9.76). Program green on night would be 2.08:1, so it is never used for small things there.
- **Photographs and film** are the same in both themes. Text over them always sits on the neutral scrim.
- **In dark mode the night and day fields differ by only 1.06:1,** so the story's change of light is carried by the photographs and the header ink, not the ground.
- **CI contrast script:** every text pair in both themes; the 55% ink-fill start (3.63, large text only); the 65% captions (4.91 on bone, 4.72 on bg-2); the ring on every ground; the dock fill against every ground; and bone text against the scrimmed poster pixels.

### Tech stack and budgets

- **Framework:** Next.js 16.3.8 (App Router), React 19.2, Tailwind 3.4, on Cloudflare Workers through OpenNext. The Worker serves only HTML and static assets for all of this.
- **Quiet layer, CSS first:** scroll-driven animations inside `@supports (animation-timeline: view())`, and one shared IntersectionObserver hook (about 1 KB) for reveal-once effects elsewhere.
- **Scenes:** `gsap@3.15.0` (exact pin; released 2026-04-13) with ScrollTrigger, only on `/` (portrait) and `/program` (season). Dynamically imported after `load` plus `requestIdleCallback`, and never under reduced motion or `.motion-off`. `gsap.matchMedia()` separates desktop, phone and reduced motion. Held stages use `position: sticky` stages inside tall sections (the stage.js pattern), not pin spacers.
- **Smooth scroll:** `lenis@1.3.26` (exact; 1.3.27 is under two weeks old), behind `NEXT_PUBLIC_SMOOTH_SCROLL`, **off at launch**. If it is switched on: desktop wheel only, lerp 0.12, driven by `gsap.ticker`, off for touch, keyboard, reduced motion and open dialogs.
- **framer-motion 12** stays only in the portals (LazyMotion, `domAnimation`; `domMax` only where `layoutId` runs). It is not shipped on marketing routes.
- **Not used:** three.js, WebGL, Rive, Lottie, Barba, character-split libraries.
- **Video:** native `<video muted playsinline loop>`. `preload="metadata"` for the desktop hero and `none` elsewhere. Plays only while in view. H.264 MP4 plus AV1 WebM on R2 with immutable caching, 1080p and 3.5 MB at most; phone crops 720×1280 and 1.5 MB at most. Posters are pre-sized AVIF or WebP at 1920 and 960 (`next.config` has images unoptimized on Workers, so sizes are generated at build time).
- **Budgets:** LCP under 2.5s on a mid-range Android on 4G, with the poster as LCP; CLS 0 (every animated element reserves its box, and text splits only after `document.fonts.ready`); INP under 200ms (answer feedback is a class toggle in the same frame); motion JavaScript on `/` under 55 KB gzipped (GSAP core plus ScrollTrigger is about 45 KB, our code under 10 KB), and none of it before first paint.
- **Files:** `src/components/motion/` holds `tokens.ts`, `PortraitScene.tsx`, `useReveal.ts`, `navigate.ts`, `Dock.tsx` and `SessionShell/`. `src/styles/motion.css` holds the tokens and keyframes.
- **Gates (all required before review):**
  - The CLAUDE.md code gates.
  - The taste skill's `lint.mjs`, `inspect.mjs` (0 FAIL at 1440, 768 and 390) and `scenes.mjs` (each held stage at 0 to 100% on desktop, phone and reduced motion).
  - The contrast script.
  - A Playwright click-through of every link and button at 375 and 1440 in both themes, with `scrollWidth === innerWidth` asserted at every 10% of each held stage.
  - Reduced-motion screenshots, the page-length gate, and Lighthouse mobile on every public page.

---

## Part 4. Elevate-style moments, exact behaviour

All of these use one **session shell**:

- **Top bar:** the skill name in sentence case on the left, and "Example" or "3 of 10" in words on the right.
- **Body:** the passage, the question, and four full-width choice buttons at least 56px tall. On phones, Check (where a set uses it) is fixed at the bottom.
- **Ground:** the bg-2 step.
- **Accent:** the product colour of the surface (ochre on free pages, green in the program).
- The same component serves the homepage card, `/daily`, `/diagnostic`, `/free-practice-test`, the `/question-bank` preview and the portal's Daily 10.

**E1. Instant answer feedback** (homepage chapter 7 and `/daily`; one press answers, because it is a single daily question).

The spec's bank protection keeps answer keys off the client, so feedback has two halves:

| Time                                  | What happens                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0ms (pointerup, or Enter/Space keyup) | The chosen letter disc fills ink locally (`--t-instant`, linear), and the other choices dim to 65% over 180ms. This is the touch acknowledgement.                                                                                                                                                                                           |
| On the server reply                   | A server action checks the answer and returns correctness, the right letter and the explanation. Target: under 150ms median on the Worker. If there is no reply after 400ms, "Checking your answer" appears in place. On failure: "Could not check that answer." with a Try again button.                                                   |
| Reply + 0ms                           | Correct: the chosen disc refills right-colour (#1e5b4b, or #7cc4a5 in dark). Wrong: it fills wrong-colour (#a8432f, or #ee9a86), and the right choice gets a 2px outline (inside `data-ui`).                                                                                                                                                |
| Reply + 40ms                          | One 1.5px ring draws around the right answer's disc (`stroke-dashoffset` from the circumference to 0, 300ms `--ease-out`). It holds 400ms, then fades over 200ms.                                                                                                                                                                           |
| Reply + 120ms                         | "Correct" or "Not quite" rises 8px into the top bar (240ms `--ease-out`).                                                                                                                                                                                                                                                                   |
| Reply + 250ms                         | The explanation panel rises 8px with opacity (300ms `--ease-out`).                                                                                                                                                                                                                                                                          |
| Reply + 550ms, missed answers only    | A dated line slides in (240ms): "In the March program this would come back on Wednesday, January 6; Monday, January 11; and Monday, January 25." Small label: "Daily 10, coming winter 2027". The shared state `karman.dq.{date}` (sessionStorage, try/catch) is written, so the chapter 4 route chip and the chapter 9 finish card update. |

- **Accessibility:** choices are buttons in `role="group"` with an accessible name. The result is announced in a polite live region ("Correct. The answer is B." or "Not quite. You chose B. The answer is D.").
- **Reduced motion:** the colours change, the ring shows already drawn, and nothing rises.

**E2. The card becomes the session.** "Open the daily page" on the answered homepage card runs a view transition: `dq-card` grows into the `/daily` shell (450ms `--ease-in-out`). The answered state is already inside it (read from `karman.dq.{date}`), with the word game below. There is no spinner or loading screen. The 600ms guard skips the transition on a slow route. In the portal, the Daily 10 card on Home grows into its session, and a mistake-log row grows into its review (framer-motion `layoutId`, 420ms `--ease-in-out`).

**E3. Progress as something built.**

- **Skill map:** eight domain rows from the taxonomy, seven segments each, matching the bank's 1 to 7 scale. Segments fill from the left (scaleX, 300ms `--ease-out`), segments 40ms apart, rows 70 to 80ms apart. A level change fills the new segment, then the level figure rolls from 4 to 5 inside a clipped box (400ms `--ease-expo`).
- **Practice-days strip and week squares:** 14px squares, 2px corners, in the product colour. A finished square fills in 300ms. The current square is a static 2px outline, with no pulse.
- **Colour** follows the product, never the skill.

**E4. The quiet finish.**

- **Homepage chapter 9 card:** "You answered today's {skill} question. Correct." For a miss: "You chose {x}. The answer was {y}." plus the three return dates and the Daily 10 label. The return dates appear only for a missed question. The card fixes The Session's error of promising a return for a correct answer.
- **In sessions:** a sentence comes first ("8 correct. Words in Context and Linear functions come back on Thursday."), then today's square fills (300ms) and level changes are listed.
- **Free practice test and diagnostic:** the result is the Karman predicted score (one number) growing in from zero (600ms `--ease-expo`), plus eight domain bars filling 150ms apart. Never a single score counting up. Count-ups (800ms) are only for true counts.

**E5. Section cards.** In a full-length test, moving from Reading and Writing to Math shows a full-bleed card ("Math, 22 questions, calculator allowed", from the real test spec), with a hard cut from bone to night. The heading rises from its mask (800ms `--ease-expo`). Continue appears after 900ms, and the timer starts only on Continue. Nothing auto-advances.

**E6. Rules at the moment of need.** The top chip always names the skill and level. After a miss, Zakaria's one-line rule appears with its dated return line.

**E7. One thing per screen.** `/program/apply` uses the shell for five short steps ("2 of 5" in words, with a five-segment bar filling). Each step slides in over 240ms `--ease-in-out` (x 24px with opacity, inside `overflow: clip`).

**E8. The word game on `/daily`.** Tiles reveal by flipping on the X axis: 150ms in with `--ease-exit`, the colour swaps at the edge, then 150ms out with `--ease-out`, 90ms apart. Long words wrap or shrink tiles, so nothing ever scrolls sideways.

**Left out on purpose:** hexagons, a colour per skill, hearts and lives, points, streak multipliers, leagues, mystery cards, 3-2-1 openers, particles, confetti, colour floods, white flashes, and praise like "EXCELLENT".

---

## Part 5. Subpages and portals

**Every public page shares:**

- the header and the docked button in the page's product colour;
- a hero in the page's product colour, with the H1 rising from line masks (900ms);
- at most one moving picture and one interactive feature;
- colour by chapter, with hard cuts;
- the footer with the full-width wordmark and legal links;
- view transitions between pages.

Scroll scenes appear only where a page sells a season. Product pages carry a plain sticky sub-nav under the header (Overview, What you get, How it runs, Pricing, FAQ): a tone-step bar, the current item in the product colour, and anchors that scroll over 600ms `--ease-in-out` (instant under reduced motion).

**`/program` (green, Lando's On Track page).**

- The hero field arrives from the homepage door. The V3 class-evening film plays behind it, with the H1 "The SAT Program", one sentence, "Apply for a seat" (`/program/apply`) and "See the dates" (`#dates`).
- True figures set as display type, each digit rolling in a clipped column once (600ms `--ease-expo`, 90ms apart), each with its sentence beside it: 6 seats, 18 live classes, 5 full-length tests, a 60-minute 1:1 after each.
- **"Choose a test date":** the cohort table. One row per `COHORTS` entry shows the test date, start, applications close, and six seat squares. Rows take a tonal green band on hover and focus, and each grows into `/program/{testDate}`. No "seats left" unless enrollment data supplies it.
- **"Who gets a seat":** two plain lists, no checkmarks, with `INTAKE_NOTE`.
- **The season scene in full,** this page's one GSAP held stage. Four steps (week one, every week, after each full-length, the dress rehearsal and test day), with the skill map building. Phones stack.
- **"Everything a seat includes":** `PROGRAM.includes` as tone-banded rows, with `TOOL_STATUS` labels.
- The review handle (static rest at 50%), the guarantee (→ `/guarantee`), "How a seat is offered" (application, 20-minute call, refundable $100 deposit; $995 founding or three payments of $345; later cohorts $1,295; the scholarship line), and the FAQ.
- `INTAKE_NOTE` directly above the closing "Apply for a seat". The dock is green "Apply for a seat".

**`/program/{testDate}`.**

- Hero: the date at display size over the V4 hallway loop (S6). H1 from the cohort name ("The March SAT Program").
- Then that cohort's start, schedule (`CONFIRM:`), dress rehearsal week, enrollment close, seats, price and deposit, and "Apply for a seat" (`/program/apply?cohort={testDate}`). The deposit link or the lead form appears only after the call.

**`/program/apply`.**

- The intro card: "About three minutes. Zakaria reads every application."
- Five steps (E7): About your student, Test date, Goal, Schedule, Your contact details.
- A Zod-validated server action that submits only on the parent's click.
- Finish card: "Application received. Zakaria will email you to book a 20-minute call."

**`/private-tutoring` (oxblood, Lando's Off Track page).**

- The hero field arrives from the door. Zakaria's real portrait, large, with his note and a small static signature (until the photo exists: the session-note component, never a stock face). H1 "Private tutoring". "Book a free strategy call" → `/private-tutoring/call`.
- The live thing: "Plan back from your test date". Pick an SAT date and Private 10 or Private 20, and it shows "Start by the week of {date}". Plain arithmetic at one 60-minute session a week, with no score promise.
- "Every session starts from the latest test" (the review handle in oxblood); Private 10 ($1,450) and Private 20 ($2,900) side by side, never three; "Private or the SAT Program?" as a comparison table with tonal row bands; the objection, then the call button. The dock is oxblood.

**`/private-tutoring/call`.** The Cal.com link as a button (`ENROLL_LINKS.strategyCallUrl`), or the lead form (source `private`) when it is unset. No third-party embed that sets cookies.

**`/pricing`.** The two doors as side-by-side fields, now with prices, installments, the later-cohort price, the guarantee, the scholarship line and the free entry points in ochre. No scenes.

**Free pages (ochre; the Elevate pages).** Each hero is the real intro card of its session, beside one still or loop.

- **`/free-practice-test`** (V2 morning loop from S2): "Free practice test. 49 questions, about 75 minutes. Live on Zoom, proctored by Zakaria." It shows the next `PRACTICE_TESTS` date and lists what the student gets. Primary: "Save a spot for Saturday, December 12" (lead form, source `practice-test-2026-12-12`). Secondary: "Start the 35-question diagnostic now". It also shows an Example result (E4) and carries Event schema.
- **`/diagnostic`:** the intro card (35 questions, about 35 minutes, free account), the existing test in the shell, and the quiet finish.
- **`/daily`** (S8 night-lamp still): playable without an account, and it arrives through E2. Daily Question plus the word game (E8).
- **`/question-bank`** (S5 still): the real browser on the free sample, the 1 to 7 scale, the skill map filling as the visitor answers, and a sign-up gate after a few answers.

**`/method`.**

- The Dunlosky paragraph as the page's one ink fill, with the full citation (Dunlosky, Rawson, Marsh, Nathan and Willingham, 2013, Psychological Science in the Public Interest, volume 14, issue 1).
- The Daily 10 route at full size (ten named slots with real skills and levels, three tagged as returns, ending at the test date), labelled "Example" and "Coming, winter 2027".
- The review handle, then the citations.

**`/about`.** The portrait and the full note, the signature drawn once on entry (1200ms `--ease-in-out`), the track record with `sourceLabel` beside every number, and why Karman exists.

**Quiet pages:** `/guarantee`, `/faq` (accordions, FAQPage schema), `/terms`, `/privacy`, `/cookies`, `/refunds`, `/sign-in` and `/sign-up` carry only the header, entrances, accordions and the footer.

**Portals** (`/app`, `/app/parent`, `/app/tutor`). These carry the Elevate side of the system, under the taste skill's app-screen rules. All three:

- inherit the tokens, both themes, the in-house icons and the skeletons;
- take their product colour from the student's entitlement (program green, private oxblood, free ochre), never from the skill;
- have no scroll scenes, no Lenis, no colour wipes and no named view transitions. Route changes are a 160ms root crossfade through the same helper, and instant under reduced motion.

By portal:

- **Student Home ("Today"):**
  - The Daily 10 card (grows into its session, E2).
  - The next live class.
  - The next full-length test (labelled "Coming, winter 2027" until built).
  - The last mistake review.
  - The test date in the side rail as a real date.
  - Sessions use the shell, E1, E5, E6 and E4. Mistake-log rows grow into their review. Progress is the skill map and the Karman predicted score.
- **Parent:** the weekly update in the finish-card layout (a sentence first, the practice-days strip, attendance, level changes), read-only.
- **Tutor:** the same tokens and feedback timings, the review-note entry and skeletons. No scenes.
- **The calculator is not touched.**

---

## Part 6. Pictures: who makes what

| Source                       | What                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Code** (ships day one)     | Every product screen with Example data: practice page, review handle, route, index screens, skill map, week row, seat squares, cohort table, Daily Question, word game, intro and finish cards, parent update. The signature drawing, page transitions, dock and header.                    |
| **Founder**                  | Zakaria's photo, the signature scan, the note in his own words. December footage later replaces the generated film.                                                                                                                                                                         |
| **Stock** (until Higgsfield) | Hero: the Pexels clip home-v3 uses now (15198034), or the spec's 5536753, whichever shows no face and no readable screen, on R2 with its poster. Season and close: licence-checked Unsplash stills of the same scenes with no people, credited in the footer and never captioned as Karman. |
| **Higgsfield**               | The cast, stills and film in the concepts doc linked below.                                                                                                                                                                                                                                 |

### Higgsfield shot list

Replaced on 2026-10-20 by `docs/design/2026-10-20-higgsfield-concepts.md`,
after the founder ruled out empty rooms, unreadable screens, calculators and
a fixed palette (design rules 41 to 48). Nothing has been generated.

---

## Part 7. What stays honest, rule resolutions, risks, questions

### What stays honest

- **No testimonials** until real, approved ones exist.
- **The track record** always shows "Karman 1:1 tutoring, median 16 weeks" directly beside it. Scores are one Karman predicted score (founder, 2026-10-30), never called official.
- **Question count:** `bankCountLabel()` shows the live count rounded down (2,500+ today) and switches to "10,000+" only when it is true. The release can never be held up by hero copy.
- **Unbuilt things carry "Coming, winter 2027"** from one status map: Daily 10, the in-app full-length test runner, and the mistake log if it is not live at release. Return dates appear only for a missed question and say "would come back in the March program".
- **Dates** come from `COHORTS` and `PRACTICE_TESTS`, so nothing shows a date that has passed. No countdowns, nothing ticking. Seats show as five plus one scholarship seat from `offer.ts`, and "seats left" appears only from real enrollment data.
- **The free practice test copy** matches `offer.ts`: live on Zoom, proctored by Zakaria, Saturday, December 12, with the start time shown only once confirmed. The free button leads to that page, which offers the diagnostic right away.
- **Generated scenes** contain no people and no classrooms of students (classes are on Zoom). They are never captioned as Karman students or classes, and the footer credits them. No real face is ever fed into a model. Zakaria appears only in his own photo.
- **Every product fragment** with sample data says "Example". Skill names are copied word for word from the taxonomy.
- **"Zakaria reads every application"** is true while he is the only reviewer. Change it when tutors join.
- **No em or en dashes** in rendered copy, enforced by a test.
- **The College Board line** sits in the footer.

### Rule resolutions

- **Rule 1 and the taste gradient ban:** the only gradient is the neutral scrim behind text on film and photos. The film dims through a flat night layer. Lando's glowing footer and Jesko's skies are dropped.
- **Rule 5 (shadows) and rule 8 (glass):** cards, fan, dock and menus are separated by tone steps. The header is a solid ground with no blur.
- **Rule 6 (three cards in a row) and rule 13 (bento):** the ecosystem is an index list, the free chapter is a fan of real screens (a list on phones), and the products are two fields.
- **Rule 16 (checkmark bullets):** correct answers show a filled disc, a ring and a word, never a check glyph. Lists are plain sentences.
- **Rule 17 (three pricing tiers):** two paths everywhere, and two private packages.
- **Rule 18 (a real product demo):** every fragment is a real component with Example data.
- **Rule 19 (soft corners):** 4px on controls and panels, 6px on cards, square photographs.
- **Rules 21 to 23 (orbs, dot grids, sparkles):** one ring, drawn once. Squares, not dots. No particles.
- **Rule 24 (animated arrows):** none. Every call to action is a verb.
- **Rule 25 (hover on everything):** hover only on controls, and only colour or tone. The Session's 8px card lift is removed.
- **Rules 26, 27 and 20 (neon, pastels, purple and black):** only the three product colours and their light variants. Night is navy.
- **Rule 28 (horizontal scrolling):** the headline split, the door entrances and the fan all move inside `overflow: clip`. Sideways tracks are not used. Playwright asserts no overflow at every 10% of each held stage.
- **Rule 33 (light and dark, AA by calculation):** every pair above was calculated. The ring is fixed per ground, and the dock colour is set per ground.
- **Copy rules 1, 4, 16, 17, 18, 19 and 20:**
  - no dashes;
  - specific headlines, all measured at two lines or fewer;
  - no two-beat antithesis and no aphorisms;
  - written to the parent;
  - the objection sits directly above the closing button;
  - the citation sits beside the method claim, and the 1:1 label beside the figures.
- **Taste skill:**
  - no eyebrows and no tracked caps (product names are the headings);
  - no index numbering (dates and "2 of 3" in words);
  - no thin rules (tone steps; a filled 4px route bar);
  - no styled accent words; two typefaces;
  - at least four real pictures (film, three season stills, the close, plus interface fragments);
  - two held stages;
  - no preloader;
  - blur never used on text (The Route's 8px caption blur is not used).
- **Spec against the taste skill, resolved in favour of the taste skill** (Zakaria may overrule in one word):
  - no hero eyebrow;
  - the `line` token only inside `data-ui` and form fields;
  - the spec's eight-step type scale becomes at most five sizes per page;
  - the spec's "cards rise in, sections fade in" motion paragraph is replaced by Part 3.5.
- **Spec 4.1:**
  - the hero carries only the H1, one sentence and the buttons;
  - no price appears before the questions;
  - the main action is free;
  - "Apply for a seat" lives on `/program` only.
- **PRODUCT.md rejected themes:** no racing, aircraft or departure-board language or props. The cohort list is a "cohort table". The morning close uses flat overcast light, with no sunrise colours or gradient sky.
- **SEO:**
  - one H1 per page, headings in order;
  - text visible without script;
  - motion code loaded after LCP;
  - CLS 0;
  - the readable slugs `/program/2027-03-06` (spec) are kept over the rules file's example `/programs/march-sat`.
- **CLAUDE.md:** nothing touches the calculator.

### Risks

- **Generation cannot run from this session.** Zakaria runs Part 6 at higgsfield.ai, or enables generate tools in a later session.
- **The signature move needs his signature scan and his own note.** It ships with his typeset name until then. His photo is needed for the private door and About. No stand-in face, ever.
- **AI stills can invent writing, warp pencils or look like stock.** Every still gets a full-size review before it becomes a start frame. The December footage replaces them.
- **Mid-range phones:** film plus GSAP. The poster is the LCP, motion loads after idle, phones hold less, and Lighthouse on a throttled profile is required.
- **iOS Safari:** sticky stages with video can stutter. Phones use transform-only scaling and pause loops off screen. Test on a real iPhone.
- **Answer-check latency:** a slow Worker reply would dull the Elevate feel. Keep the check light, and measure p50 and p95.
- **Daily 10 must ship before January 4,** or the route and season copy change (the status map makes that a one-line edit).
- **The test-morning close sits near the rejected "dawn" direction.** If Zakaria reads it that way, the close uses S9 (the front hallway) instead.
- **View transitions are skipped in older browsers.** Navigation stays instant, and every link is still tested.

### Three questions for Zakaria

1. **Can you send your photo, a scan of your signature (black pen on plain white paper; a phone photo is fine), and the note in your own words** (two or three sentences, first person)? Until they arrive, your name is typeset and the draft note in chapter 2 stands in.
2. **For the last screen, do you want the same desk on test morning (the mirror of the opening),** or the front hallway at 7 a.m. with the packed bag, if the morning desk feels too close to the "dawn" look you rejected?
3. **May and June cohorts: what are the start dates and enrollment deadlines?** The March rhythm suggests Monday, March 1 and Monday, April 5. While you are at it: are class times (Tuesdays and Thursdays, 7:00 to 8:30 p.m. ET) and the December 12 start time (10:00 a.m. ET) confirmed?
