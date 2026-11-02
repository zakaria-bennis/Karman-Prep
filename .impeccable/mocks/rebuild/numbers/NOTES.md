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
