# Numbers: notes

Serve: `node .impeccable/mocks/serve-mocks.mjs 8873`, open
http://127.0.0.1:8873/rebuild/numbers/index.html (`?opening=on` replays the opening, `?opening=off` skips it).

The idea: each screen carries one number from `src/lib/marketing/offer.ts` (or the three real results),
set large, rolled in once, pointing at the real feature beside it in an iPhone 17 Pro Max.

## Round 2

### What changed

- **Modern build.** Floating pill nav (hides on scroll down, returns on scroll up), a date pill above the
  headline, rounded stages and cards (28 px stages, 24 px media cards, 20 px photos), pill buttons with an
  inset top light, Funnel Display 520 to 560 with -0.03 to -0.055 em tracking, Funnel Sans for text,
  a soft light field behind the hero and grain over the ground, footer as a night card with the wordmark
  cropped by its edge. Archivo, IBM Plex and the square slabs are gone.
- **The iPhone is the hero object.** Cosmic orange frame from `../../motion/device/`, with real screens:
  lab clips cropped to the screen (the 9x16 renders hold the phone at 1.62x; `.crop` in the CSS places
  that screen exactly on ours) or real captures. Light mode plays the pine renders (light screens), dark
  mode the night renders (dark screens).
- **The whole platform.** Hero phone plays the 12 s tour (Home, Classes, Daily 10 prize, Rewards), looped.
  A pine card with four tabs (Segmented Tabs, 21st.dev 26923) swaps the phone and rolls one number:
  Your Daily 10 (10, the box moment clip), Private 1:1 (60, the booking sheet), Progress (39, progress and
  rewards clip), Parents (4, the weekly update clip). The class section's phone plays the Classes calendar
  clip; the close shows the full-length test review.
- **One number per screen.** 10 / 60 / 39 / 4 on the pine card, 6 for the class, 1570 leading the results
  (1540 and 1520 are set at less than half its size), +100 for the guarantee, Dec 12 for the close. The hero
  has no number: its focal element is the button.
- **Replaced, not kept:** the live quiz-engine question, the d10-wrong and handoff clip sections, the
  "2 7 21" screen, Archivo/Plex, `engine.css`, the old stand-in photos, `raw/stills/`.

### Big numbers and their source

| Number | Label | offer.ts |
| --- | --- | --- |
| 10 | questions a day | `MARCH_PROGRAM.includes` Daily 10: "Ten minutes a day... after 2, 7 and 21 days" |
| 60 | minute sessions with a tutor | `PRIVATE_INCLUDES[0]` "60-minute sessions" |
| 39 | SAT skills tracked | `QUESTION_BANK.skills` |
| 4 | things in your weekly update | `MARCH_PROGRAM.includes` "Practice time, attendance, test scores and what's next" (four things) |
| 6 | students at most | `MARCH_PROGRAM.includes[0]` "a group of up to six" |
| 1570 / 1540 / 1520 | Mateo, Priya, Ava | founder decision 2026-11-01, with `TRACK_RECORD.sourceLabel` |
| +100 | points or a 1450 | `GUARANTEE.points`, `GUARANTEE.orScore` |
| Dec 12 | the free test | `FREE_PRACTICE_TEST` |

### Slot map (pictures)

| Slot | File now | Source |
| --- | --- | --- |
| hero | none (phone on a clay card) | Gemini `cast-student-pine-floor.jpg` was used, then sent to `needs-fix/` (AirPods Pro, unbranded laptop). Set `SLOTS.hero` to the fixed WebP and the photo returns behind the phone. |
| parent | `img/parent-clay-tile.webp` | Gemini `cast-parent-clay.jpg`, cropped above her hand so the AI-drawn phone is out of the frame. Checked at full size: no device left. |

Dropped under the founder's device rule and the rejection list: `cast-student-marigold.jpg` (rejected),
the round-1 Zoom student (earbuds), Zoom tutor (headset with a boom mic, laptop edge) and parent (phone in
hand) stand-ins. The Zoom tiles come back when `zoom-student-tile.jpg` is fixed and `zoom-tutor-loop.mp4`
arrives. `pool-bleachers.jpg` and `rehearsal-stage.jpg` were not used (phone in hands; silver laptop).

### Checks (2026-11-01, Playwright from the repo, shots in the scratchpad `r2-numbers/`)

- Sizes 375x812, 440x956, 834x1194, 1440x900, light and dark, every 0.8-viewport step, plus frames at 0 and
  400 ms after each scroll: 64 step screens, 128 burst frames; reduced motion: 64 more. Looked at all four
  sizes' contact sheets.
- Sideways scroll: 0 px at every size and mode.
- Overlap scan (text boxes against each other and under the floating nav, at every step): 0 hits in all
  16 runs. The nav also checked for children overflowing the pill (found and fixed at 375, see below).
- Console errors and failed requests: 0 in every run.
- Contrast, calculated (WCAG): 35 pairs, all pass. Lowest: big amber `#b07406` on card `#eceae3` 3.26:1
  (large only), marigold on dark pine 3.66:1 (large only), small text lowest `#5f5d58` on card 5.46:1. No
  text sits on photos or video; the phone screens are product captures.
- Clicked: 4 nav links, the phone menu (open, each link, Escape), the date pill, all 4 tabs (number, screen
  and indicator checked; indicator within 1 px), arrow keys, Home and End, Play it again (after the 8 s clip),
  the theme icon (and remembered after reload), Auto / Light / Dark, Pause motion (every clip stops).
  59 of 60 passed; the one miss was Play it again at 375, because the clip only plays while the phone is
  in view (it passed with the phone in view).
- Free test buttons all go to `https://karmanprep.com/free-practice-test`. Outbound: free-practice-test,
  program, guarantee, terms and privacy return 200; **`/cookies` returns 404 on the live site**.
- One highlighted button: at most 1 on screen at every 200 px step, desktop and phone.
- Reduced motion: no travel, no video (posters), every number final, nothing hidden.
- Opening: about 1 s in both modes, gone by 1.5 s; the hero is never blank.
- Words per 400 px step: desktop max 39, median 30; phone max 56 (footer), median 29. The hero was trimmed
  after this count (pill 5 words, subline 11); it still runs a little over the 25-word phone target.

### Self-critique (modern-UI "what looks dated" list and the brief's section 8)

Fixed in this round:
1. A waiting odometer showed "00" before its roll (read as a figure). Numbers now stay hidden until they roll.
2. At 375 the nav's Book button pushed Menu off the screen once the hero button scrolled away. The wordmark
   and theme icon now step aside on small phones when the button shows.
3. The footer wordmark was a second big marigold shape on the same screen as the nav button. It is bone now.

Still open:
- Six big numbers on one page is still a lot; dominance per screen holds, but the page as a whole is a
  number page by design.
- No person in the hero, class or close until the fixed Gemini pictures arrive (brief: a person every
  third screen). Only the guarantee has a person.
- Mid-roll frames show digits passing (for example "+356" on the way to +100), as any odometer does.
- The class phone's calendar clip ends on the private booking, which the Private tab also shows.
- `numbers.css` is about 1,060 lines (prettier-style), over the 700-line guide for source files.
- The copy was written in this session following the round-1 copywriter run (`copy-run/`), not a fresh
  conversion-copywriter run.
- The nav floats over text while scrolling up, as the modern-UI study accepts; the scan checks scrolling down.

### Questions for the founder

1. Is "4 things in your weekly update" a number you like, or should the Parents tab use another one?
2. The hero now shows the phone on clay. Keep that, or wait for the fixed pine-floor photo behind it?
3. Is "60 minute sessions" the right lead for Private 1:1, or would you rather show the 10 and 20 hour packages?
4. The live site's Cookies page is missing (404). Should it go into the next deploy?

## Fix round 2

From the independent critic's review (`scratchpad/critic2-numbers/`), fixed in its order.

1. **Load.** The logo cover (`pre-open`, its 2.5 s fallback and the opening) is gone. The hero's pill,
   headline, subline and button are static HTML, so they read at first paint with no animation. Google
   Fonts load without blocking (preload, then swap to the stylesheet). GSAP, ScrollTrigger, CustomEase,
   `copy.js` and `numbers.js` are deferred. The hero phone is in the HTML with its first frame chosen by a
   `<picture>` for the device mode and preloaded. Other phones' posters load lazily; every video waits
   for the page's load event and for its phone to be in view.
2. **The founder's name.** OCR (tesseract) of 176 frames (every 0.5 s of the tour, calendar, Daily 10,
   progress and parent clips, night and pine) and the stills used: "Zakaria" appears nowhere; "David"
   appears in the calendar and parent-update frames. None in the page text.
3. **The floating nav** now shows only near the top (under 140 px of scroll) and comes back at the top,
   so it never sits on headings or numbers. The nav's own button is gone with it.
4. **Mid-animation masks.** The hero no longer animates, so the chip is never masked. Word masks are
   exactly one line tall (descenders show through `overflow-clip-margin`) and come off once the words
   have risen, so no word box reaches into the next line.
5. **Colour and fullness.** The fixed Gemini pine-floor photo is back behind the phone (checked at full
   size: AirPods Max, a dark laptop with no logo, clean hands), with a marigold light field in both modes.
   The gap after the hero is one inset step (8 to 16 px), so the hero and the app card read as a group.
   The class section shows the fixed Zoom student tile (Sony WH-1000XM5, clean hand).
6. **Three giant numbers.** The tab numbers, 1570 and Dec 12. "Up to 6 students in each class." and
   "+100 points or a 1450 on the official SAT." are now one line of marigold-ink text above their headlines.
7. **The platform.** The second tab is Classes (18 live classes, the calendar clip), not the booking again.
8. **Parents line** is offer.ts word for word: "Practice time, attendance, test scores and what's next."
9. **The Daily 10 clip** starts at 1.4 s, on the box ("Tap to open"), with that frame as its poster
   (`img/d10-box-night.webp`, `img/d10-box-pine.webp`); Play it again restarts there.

### Load, before and after (critic's own script, `timeline.mjs`, 8 s, a screenshot every 250 ms)

Headline and button readable = first contentful paint (they are static HTML now). Phone = the hero
phone's first frame decoded. 4G = 150 ms latency, 9 Mbit/s. Slow CDN = cdnjs and Google Fonts held 3 s.

| Run (cold, dark) | Before: headline / button / phone | After: headline and button / phone / video playing |
| --- | --- | --- |
| 1440 local | 2,202 / 2,219 / 1,114 ms | 248 / 164 / 785 ms |
| 440 local | 2,178 / 2,270 / 1,169 ms | 376 / 847 / 2,980 ms |
| 1440 4G | 2,523 / 2,539 / 1,435 ms | 424 to 480 / 460 to 489 / 846 to 894 ms (two runs); one earlier run 1,036 / 992 / 2,516 ms |
| 440 4G | 2,449 / 2,541 / 1,434 ms | 428 to 440 / 456 to 458 / 887 to 900 ms (two runs); one earlier run 1,364 / 1,339 / 3,323 ms |
| 1440 slow CDN | 5,200 / 5,217 / 4,112 ms | 476 / 609 ms; video 7.5 s (waits for the load event, which waits for the held fonts) |
| 440 slow CDN | 5,236 / 5,328 / 4,228 ms | 32 / 24 ms; video 6.2 s |

The page is never blank: the first screenshot after first paint already shows the headline, the button and
the photo. The one slow 4G run (first run after the server restarted) is reported as measured. Inlining the
CSS was tried (first paint about 200 ms on 4G) and not kept, so the founder can still edit `numbers.css`.

### Checks after the fix round (2026-11-02)

- 4 sizes x light and dark, every step plus 0 and 400 ms frames, then reduced motion: 0 px sideways,
  0 overlap hits, 0 console errors or failed requests in all 16 runs.
- Word boxes in every heading, scanned 120 ms into each reveal and again once settled, at 375 and 1440:
  0 overlaps. Scrolling back up the whole page: the nav sat over text 0 times.
- Clicks: 61 of 61 passed (nav links, phone menu, Escape, date pill, all four tabs with number, screen and
  indicator, arrow keys, Home and End, Play it again, theme icon and memory, Auto / Light / Dark, Pause
  motion, nav away from the top and back at the top, one highlighted button at most, free test URL).
- Contrast: the 35 pairs above all pass; the new fact lines are 5.47:1 (light) and 9.99:1 (dark).
- Words per 400 px: desktop max 43, median 35 (hero 35); phone max 61 (footer), median 29 (hero 36,
  over the 25 target).

### Still open after the fix round

- The hero runs over the 25-word phone target (36 with the menu and pill).
- `cast-parent-clay.jpg` was rejected for its phone; the page uses it cropped above her hand (no device in
  frame). Say if the crop is not enough and the guarantee should lose the portrait.
- The laptop in the pine-floor photo is dark with no logo; it reads as a MacBook but can't be proved to be a
  Space Black MacBook Pro.
- The Zoom tutor tile waits for `zoom-tutor-loop.mp4`.
- The Daily 10 clip passes the "7 of 10" results screen.
- `/cookies` still returns 404 on the live site.

## Fix round 3 (scroll reveals and numbers)

The orchestrator saw sections stay empty for 2 to 3 s after a normal mouse-wheel scroll, and the
odometer show junk such as "0001". Both are fixed by removing what hid things.

- **Nothing on screen is ever hidden.** The word masks and every fade from 0 are gone. Each section's
  pictures, phone, tabs, heading and lines are always visible. They only travel 16 px up into place in
  0.5 s, with a 0.03 s stagger. The reveal starts 120 px before the section reaches the screen
  (`top bottom+=120`). A section already past its start when the page loads is shown finished. A jump or a
  fast scroll (over 3,000 px/s) finishes the reveal at once.
- **Numbers never show anything but their final value.** The odometer (Count Up, 21st.dev 20068) is
  removed. 10 / 18 / 39 / 4, 1570, 1540, 1520 and Dec 12 are in the HTML or set at once from `copy.js`.
  They only arrive: 12 px up and 0.98 to 1 scale over 0.5 s, the lead score last. A tab change swaps the
  number at once with the same small arrival. The phone screen moves 8 px and is never dimmed.

### Checks after fix round 3 (2 November)

- **Scroll test.** At 1440 dark and 375 light: mouse wheel in 1,200 px steps, then `scrollTo` jumps
  (2600, 900, 4200, 1800, 3400, bottom, top), with a screenshot 300 ms after each step. 24 screenshots in
  total. Headings, phones, photos, numbers, lines and buttons on screen were invisible or more than 16 px
  out of place 0 times. Every frame recorded every value the numbers showed: only 10, 1570, 1540, 1520
  and Dec 12 ever appeared, 0 non-final values.
- **Four sizes, light and dark**, every step with frames at 0 and 400 ms: 0 px sideways, 0 overlaps,
  0 console errors or failed requests in 8 runs.
- **Word boxes and the nav.** Word boxes 120 ms into each reveal and once settled, at 375 and 1440:
  0 overlaps. Scrolling back up the whole page, the nav sat over text 0 times.
- **Clicks:** 61 of 61 passed.
- **Load** (critic's script, cold, dark). Headline and button are visible in the first frame after
  first paint:

| Run | Headline and button | Phone frame | Video playing |
| --- | --- | --- | --- |
| 1440 local | 42 ms (first paint 88 ms) | 42 ms | 171 ms |
| 440 local | 12 ms (first paint 44 ms) | 12 ms | 155 ms |
| 1440 4G | 391 ms (first paint 428 ms) | 447 ms | 942 ms |
| 440 4G | 396 ms (first paint 424 ms) | 452 ms | 885 ms |

The machine was heavily loaded during these runs (load average 12 to 52, from other sessions). The 4G
numbers match the earlier runs.

- The reduced-motion pass from fix round 2 still applies: reduced motion sets nothing hidden and no travel,
  and nothing in this round adds any.
