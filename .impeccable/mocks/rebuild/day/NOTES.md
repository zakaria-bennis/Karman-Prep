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
