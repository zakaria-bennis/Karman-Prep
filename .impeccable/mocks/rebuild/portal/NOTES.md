# Through the screen

Page: http://127.0.0.1:8871/rebuild/portal/index.html (serve with `node .impeccable/mocks/serve-mocks.mjs 8871`).
Every word is in `copy.js`. Every price, date and result comes from `src/lib/marketing/offer.ts`.

## The idea

Two swimmers sit on the pool bleachers between sessions. Their iPhone 17 Pro Max (Karman's own drawn
frame, Cosmic orange) floats over the empty half of the photo, playing the real Karman Home. As you
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
| 1. Hero | Photo stage (28 px card), pine glass copy card | pool-bleachers, phone with the Home clip | The button, last (Land). |
| (push) | The phone's screen, then the app ground | Home capture at full width | The screen, the only thing growing. |
| 2. The app | App ground (#F7F6F0 / #101D18), marigold stage | Phone with 5 tabbed real clips | The phone (Land). |
| 3. A week | Bone, bento of 4 tiles | Live engine question, tutor's class plan, parent schedule, handoff clip | "January 4" (Land). |
| 4. Results | Pine card (colour beat) | Ava, Mateo, Priya in a hairline grid | The count 1235 to 1520. |
| 5. Plans | Bone, two cards | None | $995 (Land). |
| 6. Close | Night card | Parent on clay | The button (Land). |
| Footer | Card with the cropped wordmark | None | None. |

## Identity (round 2)

- **Type.** Funnel Display (540 to 560, -0.03 to -0.045 em) and Funnel Sans. The engine keeps IBM Plex Sans.
- **Shape.** Section cards 28 px, tiles 20 px, media 14 px, pills and buttons fully round.
- **Colour.** Bone `#F5F5F2`, card `#ECEAE3`, ink `#12110F`; dark `#151412`, card `#1E1C19`, ink `#F1EDE4`.
  Pine `#1F4D45` (dark `#275F55`), marigold `#EBA21F`, clay only behind the parent, night for the close.
- **Depth.** Tone steps. The only shadow is under the phone. Grain at 5 % over the page. Glass on the
  nav pill and the hero copy card.
- **Opening.** First visit only (`karman-portal-opening`): the mark draws, the line draws, the wordmark rises.
- **Motion.** GSAP 3.12.5, ScrollTrigger and CustomEase from cdnjs. Tokens from the brief (expo.out,
  power3.inOut, settle 0.2,0.8,0.2,1; 0.6 / 0.9 / 1.2 s; 0.06 / 0.08 s staggers; "top 78%").
  Moves: Arrive, Rise, Land, Demo (clips, tabs, live question), Count, Hand-off (the push), Press.
  Every reveal plays once. Starting states exist only under `.motion`.

## Files

- `index.html`, `copy.js`.
- `portal.css` (tokens, base, nav, phone, opening), `stage.css` (hero, push, the app section),
  `sections.css` (week, results, plans, close, footer).
- `portal.js` (copy, pictures, phones, theme, nav, tabs, motion), `try.js` (the live question).

## Round 2

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
