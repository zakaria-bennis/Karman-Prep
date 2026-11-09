# Painting detail: report

Session: painting-detail. Branch: `claude/overnight-painting-detail-5b2a55`. 8 November 2026. The first three commits
are already merged into `claude/overnight-ship`; the later ones (speed fix, sheets, this report)
are not yet.

## What changed, in plain words

The paintings looked rough because the engine planned its brush strokes from a small, 480-pixel
version of the picture and then stretched them to fill the screen. Every stroke was a fat
blob, so edges stepped and smeared.

Now:

- **Finer picture.** Strokes are planned from a 960-pixel version, twice as sharp.
- **A fifth, finer brush.** It only paints along edges (tree outlines, the ridge line, the
  shoreline, reflections), so those edges come out clean instead of stair-stepped.
- **Texture inside big areas.** Big strokes leave a lighter and a darker bristle streak.
  Colors drift gently warm and cool across the picture. Strokes in open areas change direction
  with the land instead of all lying the same way. A few small strokes add texture to flat
  areas.
- **Soft canvas grain** over the finished painting, like a weave under the paint.
- **Crisper highlights.** Up to 800 small bright taps along the edges of the brightest spots,
  instead of about 100 random dots.
- **More detail in the scenes themselves:** clouds catch a bright rim on the sun side, water
  gets light and dark ripple lines, trees and bushes get smaller top leaves, rocks get a lit
  edge and cracks, pines get lit needles. None of this moves anything in the composition: the
  deer, owls and birds still line up.

It still reads as a Bob Ross painting: big criss-cross sky first, back to front, small brushes
last, highlights tapped on at the end. It is not a photo.

## The opening

Unchanged in length and order: 3.8 seconds (measured: done at 3.88 s), base coat, sky, far to
near, small brushes, highlights. The new fine brush comes in during the last second. See
`painting-detail/opening.jpg` for frames taken during the opening.

## Speed

Measured with the CPU slowed 4 times in headless Chrome (a mid-range laptop), old engine
against new, same page, same scenes (0, 3, 6, 9 at day and night), medians:

|                                                       | Old    | New                    |
| ----------------------------------------------------- | ------ | ---------------------- |
| Opening: page waits before the first stroke           | 0.82 s | 0.32 s                 |
| Opening: until finished (target 3.8 s plus that wait) | 4.65 s | 4.42 s                 |
| Opening: frames drawn                                 | 214    | 222                    |
| Finished painting (later pages): page blocked         | 1.36 s | 0.29 s                 |
| Finished painting: last fine stroke on                | 1.36 s | 3.4 s, in small slices |

At normal speed in the app: planning before the opening fell from about 70 ms to about 25 ms,
and the first draw of a finished painting from about 180 ms to 10 ms. The fine strokes then
land within about a second, in slices of 8 ms, so clicks are never held up.

How: my first version was much slower (the opening waited about 1.8 s on the slowed CPU). So
only the coat and the two big brushes are planned up front. The three small brushes and the
highlights are planned a row at a time between frames while the big ones paint (they are not
needed until 1.8 s into the opening). Color sampling was also made cheaper. No image cache was
needed.

## Before and after sheets

In `docs/overnight/reports/painting-detail/`:

- `day.jpg` and `night.jpg`: four scenes (mountain lake, winter cabin, rocky shore,
  waterfall), before on the left, after on the right.
- `day-detail.jpg` and `night-detail.jpg`: the same four scenes, zoomed in, to show the edges
  and brushwork.
- `opening.jpg`: the new opening, frame by frame.

## All three copies match

- The app: `src/lib/painting/painterly.ts` and `studio.ts`.
- The prototype: `prototypes/today-directions/painterly.js` and `landscapes.js`.
- The painted home mock: `.impeccable/mocks/painted-home/painterly.js` and `landscapes.js`
  (exact copies of the prototype's).

Both pages were opened headless and painted without errors.

## How I checked

- Captured all ten scenes at 1440 wide, day and night, before and after.
- Opened the student Today page headless (port 3125, as `dev_seed_student_cohort`) with
  `?paint-scene` and `?paint-time`, both the opening (`?paint-in=1`) and the finished painting:
  it paints, no console errors.
- Opened the prototype and the painted home mock headless: they paint, no console errors.
- The Claude app's built-in browser was never opened.
- `npx tsc --noEmit`: passes. `npm run lint`: passes. `npm run check:sizes`: passes.
- `npm run format:check`: three docs I did not touch fail (`docs/overnight/BRIEF.md`,
  `docs/design/student-portal-laws.md`, `docs/design/student-portal-research-2026-11-07.md`).
  All my files pass.
- `npm test`: 9,747 pass, 1 failed under load: a calculator test
  (`reference-rows.test.tsx`, R-11). It passes when run alone (12 of 12), and this branch
  does not change the calculator.
- The computer restarted mid-session and wiped my scratch captures. The sheets were then
  rendered from the prototype, which runs the same engine as the app, old version against new.

## Decisions I made

- I planned at 960 pixels wide, the size the scenes are drawn at. Going higher would only
  enlarge the same picture.
- When the painting appears finished (every page after the first), the big brushes go on at
  once and the small ones in short idle slices over about a second. The page answers clicks
  the whole time. I chose this over caching a finished image: simpler, no storage, and it made
  the new engine faster than the old one.
- I kept timing marks in the engine (`karman-paint-scene`, `-plan`, `-draw`, `-finish`). They
  cost nothing and make the next speed check easy.
- I kept the grain subtle (soft-light, 28%) and the bristles faint (24%), so text boxes over
  the painting keep their contrast.
- The extra scene detail uses its own random numbers, so no scene's layout moves and the
  wildlife still sits where it should.

## Not done

- No unit tests: the engine draws on a canvas, and the test setup has none. It is checked by
  the captures above.

## For the founder

- Look at `day.jpg` and `night.jpg`. If the grain or the streaks are too strong or too faint,
  they are two numbers to change.
