# One day, in colour

Page: http://127.0.0.1:8872/rebuild/day/index.html (serve with
`node .impeccable/mocks/serve-mocks.mjs 8872` from the repo root).
Every word is in `copy.js`. Every price, date and result comes from `src/lib/marketing/offer.ts`.

## The idea

One student through one school day. Each chapter is a rounded block in its own colour and shows the
feature she uses at that hour inside an iPhone 17 Pro Max (cosmic orange, the motion lab's frame).

| Time | Block | In the phone (or window) | Land |
| --- | --- | --- | --- |
| 6:50 a.m. hero | Card tone stage, marigold light field | Real screens, swapped by the day's tabs: Home, Daily 10, Calendar, Rewards, Parent | The button |
| 7:40 a.m. Your Daily 10 | Marigold | `d10-wrong` clip: she picks 6, 7 is right, the explanation opens | "comes back" |
| 3:40 p.m. Calendar | Pine | `calendar` clip: this week's classes, then a 1:1 booked for Monday 6:00 pm | "booked between sets" |
| 7:00 p.m. Live class | Night | Zoom window with the shared screen (`d10-right`, desktop) | "March 6" |
| 9:00 p.m. Rewards | Card tone (a breath between colours) | `d10-finish` clip: the mystery box, the prize on the fox, the results | "a box to open" |
| 9:15 p.m. Parent | Clay | Parent portrait plus `parent-update` clip on the parent's phone | "sent to you" |
| Plans | Ground, four cards, the March program on pine | | $995 settles last |
| Next fall | Results strip, then the night card | Ava 1520, Mateo 1570, Priya 1540, with the source line | The button |
| Footer | Pine card, cropped wordmark | | |

Feature clips show only the phone's screen, cropped from the 9x16 render and placed inside the page's own
frame, so the same phone sits on every colour. Light mode plays the `pine` renders (light screens), dark mode
the `night` renders (dark screens). The question-engine clips exist only in dark.

## Round 2

### What changed

- The page is rebuilt to the modern-UI recipe (`docs/design/research/modern-ui-2026-11-01.md`): floating
  glass pill nav that hides going down; a framed hero stage; a pill above the headline with the free test
  date; Funnel Display at 540 to 560 with -0.03 to -0.04 em tracking, Funnel Sans for text; the hero's
  "her school day" as the page's one marigold chip; 52 px pill buttons with an inset highlight; every
  surface at 20 to 32 px corners; plans as cards with a pointer spotlight; results in a hairline strip;
  footer in a pine card with the wordmark cropped by its edge; fine grain over the ground.
- The iPhone 17 Pro Max is now the main object on every chapter, and the page shows the platform, not only
  questions: dashboard, Your Daily 10, calendar and booking, the live class, the end-screen box and rewards,
  the parent's weekly update.
- The day's tabs under the hero phone swap its screen (arrow keys work, the screen cross-fades with a 10 px
  rise in 0.2 s). They follow light and dark.
- Replaced, and deleted: the live engine demo and `engine.css`, the offset colour slabs, the flat header,
  the plan rows, the pine odometer band, the old `raw/` stills and every stand-in photo listed below.
- Clips play once when 40% in view and hold (each ends on its first frame); they load 1.5 screens ahead;
  posters first; no video at all under reduced motion or when motion is paused.

### Slot map (`SLOTS` at the top of `day.js`)

The founder's rules of 1 November (no AI-drawn phones; devices must be iPhone 17/18 Pro Max, Sony WH-1000XM5
or AirPods Max 2, Space Black MacBook Pro) emptied most slots. An empty slot shows no picture and the layout
closes up around it (the hero phone stands alone on the stage's light field, the calendar phone centres, the
Zoom window shows the shared screen only, the plans heading spans the row). To fill one: convert the approved
file to WebP in `img/` and paste its path on its line.

| Slot | Now | Why |
| --- | --- | --- |
| `hero` | empty | The flux stand-in (generic headphones, a drawn phone) is dropped. Gemini `cast-student-marigold.jpg` was rejected. |
| `calendar` | empty | Gemini `pool-bleachers.jpg` arrived, but the phone in her hands is not an iPhone 17 Pro Max (checked at full size). Dropped. |
| `class-student` | empty | Gemini `zoom-student-tile.jpg` is in `needs-fix` (wired earphones). The flux stand-in (earbuds) is dropped. |
| `class-tutor` | empty | The flux stand-in (wired earphones) is dropped. `zoom-tutor-loop.mp4` has not arrived. |
| `parent` | `img/gemini-parent-clay-top-900.webp` | **Gemini** `cast-parent-clay.jpg`, cropped above her hand so no device is in frame. |
| `pine-floor` | empty | Gemini `cast-student-pine-floor.jpg` is in `needs-fix` (laptop). It sits beside the plans heading when it returns. |
| `ava`, `mateo`, `priya` | October film stills | Real, approved results. Checked: no device in frame. |

Not used: `rehearsal-stage.jpg` (in `needs-fix`; no chapter of this day is at a rehearsal).

Gemini files used: one (`cast-parent-clay.jpg`). Every hand and device in every picture on the page was
cropped at full size and looked at; the parent crop and the three results show none.

### Checks (Playwright from the repo's node_modules, `scratchpad/r2-day/`)

Screens and frame bursts are in
`/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/eae5e585-9868-40a3-bd97-fb3ad26100f3/scratchpad/r2-day/r2-day/`
(each scroll step: three frames 150 ms apart while things move, then a settled frame).

| Size | Mode | Scroll steps | Sideways scroll | Contrast fails | Text overlaps | Most marigold buttons at once | Console errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 375 x 812 | light / dark | 15 / 15 | 0 px | 0 / 0 | 0 / 0 | 1 | 0 |
| 440 x 956 | light / dark | 13 / 13 | 0 px | 0 / 0 | 1 / 1 (nav leaving) | 1 | 0 |
| 834 x 1194 | light / dark | 8 / 8 | 0 px | 0 / 0 | 0 / 0 | 1 | 0 |
| 1440 x 900 | light / dark | 12 / 12 | 0 px | 0 / 0 | 0 / 1 (nav leaving) | 1 | 0 |
| 375 and 1440 | reduced motion | 15 / 12 | 0 px | 0 | 0 | 1 | 0 |

- Contrast is calculated from computed colours on every visible text run (WCAG, 4.5:1, or 3:1 at 24 px and
  up). No text sits on a photograph or a video frame any more: the Zoom caption sits under the shared
  screen on the window's own colour (9.6:1). One fix made: the inactive tabs were 4.2:1 on their track in
  light mode; the track is now the page ground (5.12:1).
- Overlap: text boxes compared pairwise (glyph boxes trimmed by 18% top and bottom so neighbouring lines of
  one headline do not count). The only hits are the nav in the first 150 ms of its 200 ms hide, at the
  first scroll step down, over the hero headline or button. It is leaving, not resting.
- Every control clicked: the five tabs (each loads its real screen; arrow keys move and activate), the theme
  switch (Auto, Dark, Light, remembered after reload; screens and clips swap with it), "See all plans" both
  ways, the three nav links and the menu links (land 88 px and 108 px under the top), the phone menu (opens
  with focus on Close, Escape closes, links close it), Pause motion (stops video, shows final states,
  remembered) and Play motion. Every outside link goes to karmanprep.com routes that exist in
  `src/app/(site)`: free-practice-test, program, private-tutoring, pricing, guarantee, terms, privacy, cookies.
- All five clips load and play once in view.
- The opening (first visit only): gone at 1.09 s (light) and 1.10 s (dark) including load; skipped by a key
  in 12 to 17 ms; not shown on the second visit.
- Reduced motion: no travel, no video, posters only, every word and screen visible.

### Self-critique

Against the modern-UI doc's "what looks dated" list: square surfaces, offset slabs, the flat header, the
flat product, loose text on the ground, heavy display type and plan rows are all gone. The clocks now sit
inside their chapter block beside the phone. The ghosted "Next fall" is a plain label.

Against the brief's section 8, the three worst problems, and what was done:

1. **The live class did not read as Zoom** once the tiles were emptied. Added a caption inside the Zoom
   window, under the shared screen ("On Zoom with David, 7:04 p.m."). Still weak until real tiles return.
2. **The phone in the phone hero sat below the fold** (about 23% of the first screen). Tightened the hero's
   spacing on phones; the phone now fills about 44% of the first screen's height.
3. **The iPad hero** had small, offset tabs in a one-column layout. Chapters and the hero now stay two
   columns down to 760 px, and the tabs become a 3-column grid on tablets.

Still failing or at risk:

- **People** (item 29, a person every third screen): only the parent chapter and the results show people,
  because the device rule emptied five slots. This is the biggest gap.
- **Daily 10 in light mode** plays a dark engine clip (no light render exists).
- **The nav returns over text** on any scroll up, by design (modern-UI 2.1 accepts this).
- Shadows: the phones carry one soft drop shadow (modern-UI 2.11 allows it); rule 5 is bent there only.
- `day.css` is about 1,560 lines and `day.js` about 900; a production build would split them.

### Not done

- No real student, tutor or pool picture is on the page until approved Gemini files arrive.
- The calendar captures and the calendar clip still show the prototype's "7 pm to 8 pm:30" time bug
  (the clip was re-rendered at 22:15 and still has it). The clip is referenced from `motion/out/`, so a fixed
  render appears here with no change.
- The booking sheet and Sessions screens say "Zakaria" (rule 40 keeps him off marketing pages).
- Copy for the new lines (pill, tab names, calendar, rewards, plan links, Zoom caption) was written in the
  round 1 voice, not run through the conversion-copywriter skill again.

## Fix round 2

The fixes from the independent critic's report (`scratchpad/critic2-day/REPORT.md`), in the order given.

### 1. Load: content on screen under 1 s, never a blank screen

- Nothing in the hero is ever hidden. The headline, button, pill, tabs and phone are in the HTML and show
  from the first paint. Only sections below the hero wait for their scroll reveal, and they show anyway
  after 2.5 s if motion has not started.
- The opening is deleted (markup, CSS and script).
- The Home screen is in the HTML as a `<picture>` with `fetchpriority="high"`. It is preloaded for each
  colour scheme as a 720 px, 46 KB copy (`img/home-{light,dark}-720.webp`). The other four tab screens load
  on the first hover, focus or click.
- The five tab buttons are in the HTML, so the tray never jumps in.
- The phone rises 24 px in 0.6 s through a CSS animation that runs from the first paint, with no script.
- Google Fonts load without blocking (`media="print"`, then all).
- GSAP and ScrollTrigger load after the page's `load` event, so they no longer compete with the CSS and
  the Home screen for bandwidth. They are still the same pinned cdnjs files with integrity.
- Chapter headline rise: 0.6 s, 0.03 s per word (was 0.9 s, 0.06 s).

Load numbers. Throttled "4G" means 150 ms latency, 1.6 Mb/s down and 750 kb/s up. Times are milliseconds
from navigation.

| Run | Before (critic): headline / button / phone | After: headline / button / phone |
| --- | --- | --- |
| Local, cold, 1440 | 2,260 / 2,010 / 1,760 | 34 / 34 / 460 |
| Local, cold, 440 | (not given) | 31 / 31 / 401 |
| 4G, cold, 1440 | 2,920 / (blank or logo to 1,200 to 1,500) / 4,420 | 877 / 877 / 1,244 |
| 4G, warm, 1440 | | 866 / 866 / 1,233 |
| 4G, cold, 440 | | 886 / 886 / 1,309 |
| 4G, warm, 440 | | 863 / 863 / 1,237 |

How these numbers were taken:

- "After" comes from `scratchpad/r2-day/tools/loadfine.mjs`. It runs the critic's probe every 50 ms with
  no screenshots, and the cache is disabled for cold runs.
- Screenshots every 250 ms come from a second, identical run, saved in `scratchpad/r2-day/load/*-frames/`.
  In every 4G frame the headline and button are on screen. Before the phone's screen arrives, the
  marigold field and the tab tray are already there, so the screen is never blank.
- The critic's own script (`load.mjs`, run again unchanged in `scratchpad/r2-day/load/`) reports 4G cold at
  1,669 to 1,741 ms. It takes no sample between 0.18 s and those times, because its Playwright screenshots
  wait while the page loads. Those figures are an upper bound, not the moment the content appeared.
  Locally, the same script reports headline 15 to 33 ms and phone 505 to 549 ms.
- The mock server sends no-cache and no gzip. On the live site, day.css (about 45 KB raw) would be about
  9 KB.

### 2. No "Zakaria" and no Private student in the cohort story

- The Calendar tab and the 3:40 p.m. chapter now show the cohort Classes screen: the next live class with
  David, this week's classes (times now read "7:00 pm to 8:30 pm"), and homework.
- In the chapter, the screen is a code demo. The capture's own top and bottom bars stay, and the long
  capture scrolls between them once, in 4.2 s.
- The calendar clip (which dissolves to the Private Sessions screen and "Book a session with Zakaria") is
  no longer used anywhere on the page.
- The parent's update named "Ava", a real results student. The Parent tab and the 9:15 p.m. chapter now
  start the scroll band below that line, so the update opens at "Skills that moved". Checked in both modes.

### 3. The chip and the underlines

- The marigold chip now sits behind the line above it (`.h1` is a stacking context, the chip has
  `z-index: -1`, line height 1.08). The descender of "prep" now shows over it.
- The underlines are no longer dashed. They are revealed by a clip from left to right, so the stroke stays
  whole. Checked at 2x after landing.

### 4. A big, readable phone

- Hero phone: 270 to 350 px wide. Chapter phones: 270 to 360 px. Each phone is cropped by its card's
  bottom edge, so it can be large.
- Screens are real captures at 1:1 proportions. The hero Home capture is 720 px wide, and the others are
  the full 1320 px captures.

### 5. Colour in the first screen, and no empty slots

- The hero's media is now a marigold field holding the day's tabs and the phone.
- The chapter colours follow the day:
  - 7:40 a.m. Daily 10: the card tone.
  - 3:40 p.m. Calendar: pine, with the rehearsal photo.
  - 7:00 p.m. Live class: night.
  - 9:00 p.m. Rewards: marigold.
  - 9:15 p.m. Parent: clay.
- Zoom chapter: Maya's tile (Gemini, fixed) sits beside David's tile with his camera off, showing an
  initial and his name, as Zoom does. A caption under the shared screen reads "On Zoom with David,
  7:04 p.m.".
- Plans heading: the pine-floor student (Gemini, fixed) is back beside it.
- Daily 10 in light mode now uses the engine's light captures, stepping question, then wrong, then
  explained. There is no dark clip in light mode any more.

### 6. Copy only from offer.ts

- Removed "Your Daily 10 arrives this winter." and the tokens line ("Each Daily 10 earns tokens...").
- The Daily 10 line is offer.ts's own: "Ten minutes a day. Every question she misses comes back after 2,
  7 and 21 days."
- The honest line is `INTAKE_NOTE` word for word.
- "Next fall" over the results is removed. The three results and their source line stay (founder-approved).

### 7. Content is never invisible while it is on screen (orchestrator rule, added during this round)

- No element starts hidden any more: the CSS hidden states are deleted.
- Every reveal moves content up 12 to 16 px in 0.5 s or less, with no opacity change. This covers headings,
  phones, pictures, plan cards and results. The hero phone rises 16 px by CSS, without fading in.
- Reveals start at "top 95%", before the section enters.
- If a section is passed in a jump (`onLeave`/`onEnterBack`), or reached faster than 1,600 px/s, it is
  shown finished at once.
- The results no longer roll digit columns, which showed zeros and partial digits. Each score counts from
  60 under its value to the exact value in 0.5 s, so every frame is a real-looking four-digit score
  (for example 1518 on the way to 1520).
- Fixed along the way: arriving from another page with `#close` (or any section link) now lands on that
  section. Before, it stopped near the top, because the plans and results are built after the browser's
  own jump.

Test: `scratchpad/r2-day/tools/fast.cjs`, at 1440 x 900 and 440 x 956.

- **Steps:** eight `mouse.wheel` steps of 1,400 px, one instant jump to the top, then six instant
  `scrollTo` jumps (35%, 80%, 55%, 15%, 98%, 65% of the page), then a fresh load at `#close`.
- **Probe:** 300 ms after each step it screenshots the page (`scratchpad/r2-day/fast/`) and checks every
  heading, phone, picture, tile, plan card, result and button on screen for opacity under 0.95, and every
  score for a value that is not a plausible four-digit score.
- **Result:** 16 of 16 steps clean at each size, zero errors. The fresh `#close` load lands on the results
  with the scores mid-count at 1518, 1565 and 1529.

4G load after this change (phone no longer fades in):

| Run | Headline / button | Phone screen |
| --- | --- | --- |
| 4G cold 1440 | 859 | 972 |
| 4G warm 1440 | 850 | 953 |
| 4G cold 440 | 853 | 1,010 |
| 4G warm 440 | 872 | 1,396 |

These were measured while the machine was under heavy load (load average 15 to 19, other sessions were
running).

### Pictures (the slot map at the top of `day.js`)

Every hand and device was cropped and checked at full size against "Devices in pictures and film".

| Slot | File | Check |
| --- | --- | --- |
| `calendar` | `img/gemini-rehearsal-stage-1400.webp` (+800) | Dark MacBook lid, no logo; the visible hand is clean |
| `class-student` | `img/gemini-zoom-student-tile-800.webp` | Sony WH-1000XM5 style headphones; the hand at her chin is natural |
| `class-tutor` | none: a camera-off tile | `zoom-tutor-loop.mp4` was never downloaded |
| `parent` | `img/gemini-parent-clay-top-900.webp` | RESULTS.md now lists `cast-parent-clay.jpg` as rejected for its phone, adding that the portrait and hand are good. This crop ends above the hand, so no device is in frame. **The founder should confirm this crop is acceptable.** |
| `pine-floor` | `img/gemini-cast-student-pine-floor-900.webp` | AirPods Max, dark MacBook with no logo; hands are clean |
| results | October film stills | No device in frame |
| hero | none: a marigold field | Every marigold student shot so far was rejected |

### Checks (after the fixes)

| Size | Mode | Steps | Sideways scroll | Contrast fails | Text overlaps | Most marigold buttons | Console errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 375 x 812 | light / dark / reduced | 16 / 16 / 16 | 0 | 0 | 0 | 1 | 0 |
| 440 x 956 | light / dark | 14 / 14 | 0 | 0 | 0 / 1 (nav leaving) | 1 | 0 |
| 834 x 1194 | light / dark | 10 / 10 | 0 | 0 | 0 | 1 | 0 |
| 1440 x 900 | light / dark / reduced | 13 / 13 / 13 | 0 | 0 | 1 / 1 (nav leaving) / 0 | 1 | 0 |

- **Overlaps:** the only hits are the nav during the first 150 ms of its 200 ms hide, at the first step
  down.
- **Clicked, all working:**
  - The five tabs, which load lazily and swap the screen.
  - The arrow keys on the tabs.
  - The theme switch (Auto, Dark, Light), remembered after reload.
  - "See all plans", both ways.
  - The nav and menu links.
  - Escape on the menu.
  - Pause and Play motion.
  - Every outside link.
- **Clips:** both play once in view.
- **One error found and fixed:** pressing Play motion reloaded the page scrolled to the footer, and
  ScrollTrigger threw "reading 'pin'". A once-only trigger was removing itself inside ScrollTrigger's own
  refresh. Triggers now remove themselves on the next tick (`whenReached` in `day.js`). Zero errors since.

### What is left

- **No hero portrait.** A marigold student shot that passes the device rule is still needed. The hero
  reads well as a phone on marigold.
- **No tutor video.** `zoom-tutor-loop.mp4` still needs downloading and checking.
- **The parent portrait comes from a file marked rejected.** It is cropped so no phone shows. The founder
  should say yes or no.
- **The nav still returns over text** when you scroll up, by design.
- **The page is 8 parts** against the brief's limit of 7.
- **File sizes:** `day.css` is about 1,670 lines and `day.js` about 1,040, past the repo's 700-line guide.
  A production build would split them.
- **Copy:** the new lines (pill, tabs, calendar, Zoom caption) were written in the round 1 voice, not
  rerun through the copywriter skill.
