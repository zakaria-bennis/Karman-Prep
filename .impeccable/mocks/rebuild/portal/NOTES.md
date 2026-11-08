# Through the screen

Page: http://127.0.0.1:8871/rebuild/portal/index.html (serve with `node .impeccable/mocks/serve-mocks.mjs 8871`).
Every word is in `copy.js`. Every price, date and result comes from `src/lib/marketing/offer.ts`.

## The idea

A student sits on the edge of an empty school stage with her laptop. Her iPhone 17 Pro Max (Karman's
own drawn frame, Cosmic orange) stands between the headline and her, showing the real Karman Home. As you
scroll, the camera pushes into that phone until its screen fills the view. The screen fades into the
app's own ground, and the page carries on inside the product: five real screens behind tabs, then a
week of it as live tiles, then results, plans and the close.

- The push is one sticky stage, 100vh plus 150vh of scroll, desktop (1024 px and up) with motion only.
  It is one uniform camera scale about a fixed point, computed so the phone's screen lands exactly on
  the viewport. The scale grows geometrically, so the camera moves at an even speed.
- The next section slides up over the last 70vh of the pin, on the same ground colour, so there is
  never an empty screen.
- Under 1024 px and under reduced motion there is no pin. The hero is a pine card with the photo and
  the phone below it.

## Sections (6, plus the footer)

| Screen | Ground | Picture or product | Focal element |
| --- | --- | --- | --- |
| 1. Hero | Photo stage (28 px card), pine copy card | rehearsal-stage, phone with Home (still) | The button. Written in the HTML, never hidden; the phone settles 16 px. |
| (push) | The phone's screen, then the app ground | Home capture at full width | The screen, the only thing growing. |
| 2. The app | App ground (#F7F6F0 / #101D18), marigold stage | Phone with 5 tabbed real screens (2 clips, 3 stills) | The phone (settles 16 px, never fades). |
| 3. A week | Bone, bento of 4 tiles | Live engine question, the Zoom student photo, test 1 review on a phone, Your Daily 10 clip on a phone | "January 4" (Land). |
| 4. Results | Pine card (colour beat) | Ava, Mateo, Priya in a hairline grid | 1520, written from the start. |
| 5. Plans | Bone, two cards | None | $995 (static). |
| 6. Close | Night card | Parent on clay | The button (Land). |
| Footer | Card with the cropped wordmark | None | None. |

## Identity (round 2)

- **Type.** Funnel Display (540 to 560, -0.03 to -0.045 em) and Funnel Sans. The engine keeps IBM Plex Sans.
- **Shape.** Section cards 28 px, tiles 20 px, media 14 px, pills and buttons fully round.
- **Colour.** Bone `#F5F5F2`, card `#ECEAE3`, ink `#12110F`; dark `#151412`, card `#1E1C19`, ink `#F1EDE4`.
  Pine `#1F4D45` (dark `#275F55`), marigold `#EBA21F`, clay only behind the parent, night for the close.
- **Depth.** Tone steps. The only shadow is under the phone. Grain at 5 % over the page. Glass on the
  nav pill and the hero copy card.
- **Motion.** GSAP 3.12.5, ScrollTrigger and CustomEase from cdnjs. Tokens from the brief (expo.out,
  power3.inOut, settle 0.2,0.8,0.2,1; 0.6 / 0.9 / 1.2 s; 0.06 / 0.08 s staggers; "top 78%").
  Moves: Arrive, Rise, Land, Demo (clips, tabs, live question), Count, Hand-off (the push), Press.
  Every reveal plays once. Starting states exist only under `.motion`.

## Files

- `index.html`, `copy.js`.
- `portal.css` (tokens, base, nav, phone), `stage.css` (hero, push, the app section),
  `sections.css` (week, results, plans, close, footer).
- `portal.js` (content: copy, pictures, phones, theme, nav, tabs; works with no animation library),
  `try.js` (the live question, loaded after the page), `motion.js` (GSAP reveals and the camera push, deferred).

## Round 2

(Kept as the record of round 2. Where "Fix round 2" below says otherwise, it wins.)

What the founder asked for, and where it is:

- **iPhone 17 Pro Max again.** Karman's drawn frame (`motion/device/iphone-17-pro-max-orange.svg`) is used
  four times: the hero, the tabbed app phone, the tutor's class plan and the parent's schedule. The
  motion-lab 9x16 feature clips are cropped to the screen exactly (the clip's own phone sits at 1.62x,
  so the video is 151.5 % wide, offset -25.76 % / -12.0 %).
- **More than the quiz engine.** Tabs: Home (dashboard), Your Daily 10 (the box moment), Calendar
  (classes and booking a 1:1), Progress (and rewards), For parents (the weekly update). Plus the live
  question, the tutor's plan for the live class, the parent schedule and the handoff clip.
- **Modern UI.** Floating glass pill nav that hides on scroll down; announcement pill; framed hero stage;
  rounded cards; pill buttons; bento; hairline results grid; plans as cards; footer card with the
  cropped wordmark; lighter display type; one marigold chip word.

### Picture slots

`SLOTS` and `SCREENS` at the top of `portal.js`. One line per slot.

| Slot | File now | Source |
| --- | --- | --- |
| `hero` | `img/pool-bleachers.webp` (1440 and up), `img/pool-bleachers-faces.webp` (under 1024) | Gemini `pool-bleachers.jpg`. The phone-size file is cropped above the hands. On desktop the pine copy card covers the hands. |
| `closeParent` | `img/cast-parent-clay.webp` | Gemini `cast-parent-clay.jpg`, cropped above the hand and the phone she holds. |
| `resultAva`, `resultMateo`, `resultPriya` | `img/result-*.webp` | The landing film's stills (no devices in them). |

Not used, and deleted from `img/`:

- `cast-student-marigold` (rejected: fake phone and fingers).
- `cast-student-pine-floor`, `zoom-student-tile`, `rehearsal-stage` (in `needs-fix/`: earbuds and
  unbranded laptops break the device rule). When fixed, the Zoom tile can take the student picture again.
- The flux-3 stand-ins: `zoom-tutor` (generic headset and silver laptop), `marigold-light` and the old
  `pool-bleachers` (generic phones).

### Checks (final build)

Screens, bursts and reports: `/private/tmp/claude-501/-Users-zakariabennis-Karman-Prep/eae5e585-9868-40a3-bd97-fb3ad26100f3/scratchpad/r2-portal/`
(`run-<width>-<mode>/s-<y>.png` every 400 px, `report.json`; `burst-<y>-<nn>.jpg`, 20 frames 100 ms apart
after every step at 1440 dark and 375 light; 320 and 340 frames).

| Check | Result |
| --- | --- |
| Sideways scroll | 0 px at 375x812, 440x956, 834x1194, 1440x900, light and dark. |
| Overlap scan (text runs from different blocks, every step, nav pill when shown) | 0 at 1440, 440 and 834 in both modes. At 375: 2 per step at two steps, all inside the engine's top bar: the topic "Linear equations (one variable)" is truncated with an ellipsis by the engine, and its unclipped box runs under the timer. Not visible. Nav pill over text: 0 everywhere (it hides on scroll down). |
| Highlighted buttons on screen | At most 1 at every step, every size. Plan cards use text links. |
| Words per screen (engine words counted apart) | First screen: 30 at 1440, 25 at 375, 440 and 834. Content screens max: 78 at 1440, 54 at 375, 61 at 440, 54 at 834. |
| Coloured pixels (saturation above 0.35) | 1440: hero 12 to 15 %, the push 0 to 2 % (inside a neutral app screen), the app section 12 to 24 %, bento 17 to 26 %, results 45 to 46 %, plans and close 19 to 32 %. 375: hero 50 %, then 13 to 61 %, footer 6 %. 834: 16 to 70 %. |
| Contrast by calculation | Pixel check of every text run against the rendered frame (including the glass card over the photo and the clips): 0 below AA in all 8 runs. Pairs: ink-2 on card 6.12 (light) / 6.45 (dark); on-pine on pine 8.57 / 6.63; on-pine-2 on pine 6.94 / 5.37; ink on marigold 8.74; marigold on pine 4.41 / 3.41 (large only: $995, 1520); "January 4" 4.43 (light, large) / 9.23 (dark). |
| Controls | Every tab by click: screen and clip swap and play (5 of 5). Arrow keys and End move between tabs. Live question: A then Submit is wrong with the "2 days" line; Try it again; C then Submit is right; Hide Timer toggles. Nav theme flips and is remembered after reload (and switches the engine to ivory). Footer switch and its arrow keys work. Phone menu: opens with focus on Close, Escape and Close shut it, a link closes it and lands the section at 0 px. Nav links land each section at 0 px and move focus to it. Back to the top returns to 0. Nav hides on scroll down and returns on scroll up. |
| Links | free-practice-test, program, pricing, guarantee, terms, privacy: 200. **/cookies is 404 on the live site** (linked as briefed). mailto: hello@karmanprep.com. |
| Reduced motion | No `.motion`, no pin, no video loads (0 sources), count shows 1520, 0 page text hidden (the 8 dimmed items are the engine's own hover-only cross-out buttons). Full pages: `rm-1440-dark-full.jpg`, `rm-375-light-full.jpg`. |
| Opening | Plays on first visit in light and dark (`opening-light.png`, `opening-dark.png`), gone by 1.35 s, remembered. |
| Console | 0 errors in every run. |

### Self-critique

Against the modern-UI doc's "what looks dated" list: square surfaces, offset slabs, the welded header,
the flat product, loose layout, heavy type, the plans table, the serif and the sliced odometer are all
gone. Against the brief's section 8, the three worst problems I found were fixed:

1. **Too little colour.** Hero was 5 % and the app section 1 to 8 %. The hero copy now sits on pine
   (glass on desktop, solid on phones) and the app phone stands on a marigold stage: hero 12 to 15 %
   on desktop and 45 to 51 % on phones, the app section 12 to 24 %.
2. **Blank screens after the push.** The pin ended on two empty screens. The next section now slides
   over the last 70vh of the pin, on the same ground.
3. **Too many words where plans meet the close** (91 at 1440). Plan lists cut to three lines each and
   the close line shortened: 78.

Still short:

- **Item 10.** The desktop hero is 12 to 15 % coloured against 30 to 60 %: the Gemini pool picture is
  cool and grey. A warmer grade would carry it. The push frames are 0 to 2 % by design (a neutral app screen).
- **Item 13.** The results stills and the two Gemini pictures come from different batches.
- **Item 22 and 26.** No Chrome performance trace and no blur or one-second test with people this round.
- **Item 30.** The 16x9 handoff clip is small at 375 px; its text is not readable there.
- **Item 32.** tsc, lint, tests and cf:build do not apply to a static mock and were not run.
- The calendar clip still shows the prototype's "7 pm to 8 pm:30" bug in this build. The re-render with
  the fix uses the same file name, so it will appear on reload when it lands.
- The tutor screen in the Zoom tile is the prototype's "December cohort". Only the March program is on sale.

## Fix round 2

From the independent critic (`scratchpad/critic2-portal/`), in its order.

1. **Load.**
   - The first-visit opening cover is gone: the head script, the `.opening` markup, its JS and its CSS.
   - The hero is written into `index.html`: pill, headline with its chip, subline, button and the phone with its first frame. copy.js still overwrites it through `data-copy`.
   - The hero is never hidden. No word masks, no opacity. Only the phone settles 16 px, in CSS.
   - Scripts are split:
     - `portal.js` is the content (it works without GSAP). `try.js` loads the engine after the page has loaded.
     - `motion.js` (GSAP, ScrollTrigger, CustomEase) runs last.
     - All scripts are `defer`.
   - Google Fonts load without blocking. The engine's stylesheet and fragment load after the page has loaded.
   - The hero phone's first frame is one still: `img/screen-home-<mode>-660.webp`, 29 KB, preloaded with `fetchpriority="high"` in the right mode. The sharp 1320 px still swaps in after load, for the camera push.
   - The hero photo is `fetchpriority="low"`. Every other picture is lazy. No video loads before the page has loaded.
2. **Founder's name.** The re-rendered captures say David (the booking sheet: "Book a session with David"). No "Zakaria" appears on the page. The only match in the folder is the editing note at the top of `copy.js`, which is not shown.
3. **Screens that contradicted the offer.** Every screen used now, and why:
   - **Hero and the Home tab.** `img/screen-home-<mode>.webp`: Home with its two due rows ("Due Nov 2", "Live class with David, Mon Nov 2") spliced out at the card's row boundary (capture rows 1230 to 1655 px). It was rebuilt from the tall capture, with the real bottom bar.
   - **Calendar tab.** The Private 1:1 booking sheet (`student-booking-slot`). A Private booking is not tied to the cohort's January 4 start. The cohort calendar clip is no longer used.
   - **For parents tab.** `img/screen-parent-<mode>.webp`: the weekly update with the "Live classes" card and the "Live classes with David" row spliced out (rows 2076 to 2466 and 2841 to 3096 px). It keeps "Week of Oct 19 to 25", which any Plus family can get.
   - **Your Daily 10 and Progress tabs.** The `d10-finish` and `progress-rewards` clips. They state no cohort and no class date.
   - **Zoom tile.** The tutor's "December cohort" screen is gone. The tile now shows the fixed Gemini Zoom student.
   - **January 4 tile.** The parent schedule with November classes is gone. It now shows the full-length test 1 review (`student-testreview-cohort`), which has no dates.
4. **No plain marigold rectangles.** The phone frames are never lazy. The phone screens sit on the app's ground colour, so a phone is always drawn on its colour block. Phones only move (16 px), never fade.
5. **No wrong text mid-animation.**
   - The results number is written as 1520 from the start. No count, so "from 1235 to 1235" can never show.
   - No price animates.
   - No heading is masked: every `rise-lines` split was removed.
6. **The nav.** It is solid (no glass) and shown only within 120 px of the top, or while it holds keyboard focus. Sections get `scroll-margin-top: 88px`. Overlap scan with the nav: 0 at every step and every size, both modes.
7. **Hero photo.** The pool picture was rejected (generic phone), so it was deleted along with its crop.
   - The hero is now Gemini `rehearsal-stage.jpg` (fixed: dark MacBook with no logo). I checked the laptop and hands at full size.
   - On desktop it is scaled from its left edge, so the student sits in the right third and the phone stands between her and the copy card.
   - Under 1024 px it is a 1752 x 1100 crop on the student, and the phone stands over the dark stage.
8. **The phone-and-laptop tile.** It is now the iPhone frame playing `d10-right`: "Every answer comes with the working."
   - The engine clip is cropped to the screen (capture at 1.8x, so the video is 136.4 % wide, at -18.18 % / -0.16 %).
   - It sits below a 54 pt top inset on the engine's own colour, so the Dynamic Island never covers the engine's top bar.
9. **Tab descriptions.** 16 px, in ink-2 (6.12:1 light, 6.45:1 dark).
10. **`.hero__field`.** Uses `inset-inline: 0` under 1024 px. Sideways scroll is 0 at every size.
11. **Content is never invisible on screen** (orchestrator's addition).
   - Reveals start at "top 90%" ("top 95%" for the app section) and last 0.5 s.
   - They only move things: 16 px for headings, phones, pictures and the Land, 12 px for sublines. Nothing fades from 0.
   - Fast-scroll test at 1440 and 440: six 1,600 px wheel steps and five jumps to each section, screenshot 300 ms after each (`scratchpad/r2-portal/fast/`). Headings, phones, pictures, buttons and prices below 0.95 opacity: 0 at every step. The result reads 1520 at every step.

Other pictures, under the device rule:

- `cast-parent-clay` (close) is in `rejected/` because of its phone. The page uses a crop that stops above her hand, so no device shows. It needs your decision.
- The results stills have no devices.
- `zoom-student-tile` (fixed: Sony WH-1000XM5) is used.
- `cast-student-pine-floor` (fixed) is not used yet.

### Load, before and after

Time to the first screenshot where each part is readable, from `timeline.cjs`. Fast 4G is 9 Mbps with 40 ms delay. Slow 4G is 1.6 Mbps with 150 ms delay. Before: the critic's runs. After: `scratchpad/r2-portal/load-after/` (screenshots every 250 ms).

| Run (cold) | Headline before / after | Button before / after | Phone screen before / after |
| --- | --- | --- | --- |
| 1440, local | 1.86 s / 0.07 s | 2.11 s / 0.07 s | 1.81 s / 0.07 s |
| 440, local | 1.81 s / 0.06 s | 2.06 s / 0.06 s | 1.76 s / 0.06 s |
| 1440, fast 4G | 2.06 s / 0.10 s | 2.30 s / 0.10 s | 2.00 s / 0.31 s |
| 440, fast 4G | 2.01 s / 0.11 s | 2.31 s / 0.11 s | 2.01 s / 0.31 s |
| 1440, slow 4G | 3.57 s / 0.22 s | 3.87 s / 0.22 s | 5.22 s / 1.27 s |
| 440, slow 4G | 3.37 s / 0.22 s | 3.62 s / 0.27 s | 5.07 s / 1.22 s |

Warm, slow 4G: headline 0.21 to 0.22 s, phone 0.92 s. No frame is blank: from the first frame the page shows the nav, the pine copy card and the phone frame. The photo fills in by 1.8 s on slow 4G.

### Checks after the fix

| Check | Result |
| --- | --- |
| Sideways scroll | 0 px at 375, 440, 834 and 1440, light and dark. |
| Overlap scan (text runs, and the nav when shown) | 0 at 440, 834 and 1440 in both modes. At 375: 2 hits at each of two steps, in the engine's top bar, where the topic is cut with an ellipsis (not visible). |
| Highlighted buttons on screen | At most 1 at every step. |
| Words | First screen: 30 at 1440, 25 at 375, 440 and 834. Content screens max: 78 at 1440, 55 at 440, 57 at 834, 50 at 375. |
| Contrast (pixels of every text run) | 0 below AA in every run. |
| Console | 0 errors. |
| Controls | All 5 tabs: the screen swaps. Clip tabs play and show their clip; still tabs keep their clip paused and hidden. Arrow keys work. Live question: wrong, Try it again, right, Hide Timer. Theme flip is remembered and switches the engine. Footer switch works. Nav links land each section at 0 and focus it. The phone menu opens, closes (Escape and Close) and its links work. Back to the top works. The nav is hidden mid-page (also on scroll up) and shown at the top. |
| Reduced motion | No `.motion`, no pin, 0 videos load, 1520 shown, 0 page text hidden. |

### Still open

- The close portrait comes from a file in `rejected/`, cropped above the phone. A replacement, or approval of the crop, is needed.
- The desktop hero colour is about 12 to 15 % (the stage photo is warm but dark). Not re-measured this round.
- The Home and parent screens are stills now, so only Daily 10 and Progress move inside the app phone.
- The Zoom tile caption names the student "Maya", the prototype's demo name.
