# Library: from the sky down to the ground

Session: library-diagonal. Branch: `claude/overnight-library-diagonal-343107`. Round 2 builds on
round 1 (`d5a4ae7e`, already in `claude/overnight-ship`). Nothing pushed, nothing deployed, no
database writes.

## What you see now

- The Library opens looking up into the sky. By day it is a high bright sky, deep blue at the top
  with a few faint stars. At dawn and sunset the glow sits low and the first stars show. At night
  it is deep space.
- The sky is split on a clear diagonal, corner to corner: Math above and to the left, Reading and
  Writing below and to the right. Each half has its own tint (Math cool and clear, Reading and
  Writing rosy), so the split reads even at rest.
- **Math sky:** a ringed planet with two moons on perfect elliptical orbits, and constellations in
  the shapes of a triangle, a square and a hexagon.
- **Reading and Writing sky:** a nebula whose wisps are ink strokes with letters set along them,
  and constellations shaped like an open book and a quill.
- Everything is painted in code, stroke by stroke, with the same brush engine as the daily
  paintings. No clip art, no images.
- The names stay in large Young Serif, with "6% done" small beneath.

## Hover

- **Math:** the constellations draw themselves in light, one after another. The moons run their
  orbits with a trail of light, and a glint travels round the planet's ring.
- **Reading and Writing:** letters stream off the nebula and drift away. The book and quill
  constellations draw themselves.
- The other half dims. Keyboard focus does the same. On phones and iPads, the first tap shows the
  effect and the second tap goes down.
- Reduced motion: no movement, pointing only brightens the half.

## The journey down

- Click a half. Its sky slides over the other one, then the camera falls. The sky rises away, a
  deep bank of cloud rushes up past you, and the ground scene settles in underneath: the bridge
  and lake for Math, the meadow and book for Reading and Writing. It takes about 1.9 seconds.
- The name hangs in place on the way down. Then the box opens out of the scene (from the bridge
  or the book) on a spring. "Math" flies into the toggle. "Reading and Writing" is two lines, so it
  fades instead of squeezing into the toggle.
- It only moves things (no relayout), so it runs smoothly: the recording captured about 61 frames
  a second.
- Escape on the way down turns back up.
- **Close** in the box climbs back up through the cloud to the sky (about 1.5 seconds).
- Switching course with the toggle cross-fades the ground scene. It does not fly.
- Reduced motion: the sky and the ground simply cross-fade.

## Night fix

- At night both ground scenes now darken the same way. I measured the average brightness of the
  land in each: Math 26 and Reading and Writing 28 at night on a laptop screen. Before, the meadow
  stayed bright green.

## Challenge banner

- The two four-point stars are gone. They are now two painted dots of light, with the same ragged
  brush edge as the land. The rest of the banner is unchanged.
- No four-point or stock sparkle shapes anywhere in the Library. Lights are painted dots.

## Removed

- The hover animations that used to play on the ground scenes (the arch sweep, turning pages).
  Hover now lives in the sky. The ground scenes keep their quiet life (birds, glints, petals,
  letter leaves).
- `DiagonalPaintings.tsx` became `LibraryWorld.tsx` (sky, clouds, ground).

## How I checked it

All in headless Chrome against my own dev server (port 3163, local database, the dev test
student). I never opened the app's Browser pane.

- 1440 wide light, dark and night; 768 (iPad) light; 390 (phone) light and night. For each: the
  sky, each half hovered, landed on Math with the box open, and switched to Reading and Writing.
  No page errors. No sideways scroll.
- Keyboard: Tab lights the Math half, Enter starts the fall, Escape turns back to the sky, Enter
  again lands and focus moves to the Math toggle.
- Pictures are in `docs/overnight/reports/library-diagonal/`:
  - `<width>-<theme>-<time>-1-sky.jpg`, `-2-hover-math.jpg`, `-2-hover-reading-writing.jpg`,
    `-3-landed-math.jpg`, `-4-switched-reading.jpg`.
  - Frame sequences: `frames-descent-reading-*` (16 frames, day), `frames-descent-night-math-*`
    (night), `frames-climb-*` (Close, back up), `frames-hover-math-*`,
    `frames-hover-reading-writing-*`, `frames-paint-in-*`, `frames-reduced-open-*`.
  - `1440-light-day-5-back-in-sky.jpg`, `reduced-motion-hover-math.jpg`.
  - `challenge-light-day.jpg`, `challenge-dark-night.jpg`: the banner with its dots of light.
  - To make them again: `node scripts/dev/library-diagonal-shots.mjs` (dev server on port 3163,
    run with `npx next dev --webpack -p 3163`).

## Checks

- `npx tsc --noEmit`: passes.
- `npm run lint`: no errors (one old warning in `PortalShot.tsx`, not mine).
- `npm run format:check`: my files pass. `BRIEF.md` and two student portal design notes were
  already unformatted.
- `npm test`: 9,779 pass, including a new Library test (Escape on the way down turns back).
- `npm run check:sizes`: passes.

## Decisions I made

- **Corner-to-corner diagonal** on wide screens; a slanted line across the middle on phones.
- **The sky hands over to the ground inside the cloud**, so no edge between the two ever shows.
- **Two-line name fades** rather than flying into the toggle.
- **The sky's stars twinkle as soft painted dots**, never star shapes.
- **Escape works only during the fall**, so it stays free for menus once the box is open.

## For the founder to decide

- Is 1.9 seconds down and 1.5 seconds back up the right pace?
- Should the open box keep the subject's ground scene behind it (as now), or the day's painting?
