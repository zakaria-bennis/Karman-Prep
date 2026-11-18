# Library: ten opening animations to compare

The Library now plays one of several opening animations. Each one lets the student choose Math or
Reading and Writing, plays its own ending, and then lands on the same place: the Library box open
over that subject's painted ground (the bridge and lake, or the meadow and book).

## How to compare them

- **Without a database or sign-in (for clips and quick looks):** `/dev/library-intros?intro=N` on a
  dev server. It shows the real painted shell, intro N and the real Library box, with made-up
  courses (Math 6%, Reading and Writing 8%). `&paint-time=day|sunset|night` sets the light, and
  `?challenge=1` opens the Challenge banner first. It is a 404 on the live site.
- In the real Library, open it with `?intro=N`, for example `/dashboard/student/library?intro=2`.
- A small picker at the bottom right lists the intros that exist. Click a number to switch. Hover
  a number to see its name.
- Add `&paint-time=day`, `sunset` or `night` to see another light.
- Close, at the top right of the box, plays the same intro again from the start.
- Without `?intro`, the Library uses intro 1 and has no picker.
- Clips of each intro are in `docs/overnight/reports/library-intros/clips/`: one per subject and
  light (`intro1-math-day.mp4`, `intro1-rw-sunset.mp4` and so on) and one with all six in a row
  and a small caption on each (`intro1-all.mp4`). Each clip holds the opening for about 1.5
  seconds, rests the pointer on each side for about 1 second, clicks, plays the whole animation to
  the open box and holds about 2 seconds. They are recorded in real time (about 50 frames a
  second), from the dev preview page.

## For the other intro builders

- The contract is `src/components/student-portal/library/intros/registry.ts`. Add one line to
  `INTROS`.
- Mark your two choices `data-slug="math"` and `data-slug="reading-writing"` (on the buttons) so
  the screenshot and clip scripts can find them.
- Optional: `useIntroStage().showGround("math" | "rw")` from `intros/stage-context.ts` paints the
  shared ground in under your intro while you animate, so you can land on it. Without it, your
  intro cross-fades into the end state.
- Scripts: `node scripts/dev/library-intros-shots.mjs 4,5` (stills) and
  `node scripts/dev/library-intros-clips.mjs 4,5 skip-challenge` (clips). Both use the dev preview
  page (no database), need a dev server on port 3163 (or set `BASE`) and the installed Chrome. The
  clips use Chrome's screen recording and `/opt/homebrew/bin/ffmpeg`; nothing extra to download.
  They decline the session-replay consent bar first, so it doesn't cover the picture.

## 1. Sky to ground

- The Library opens looking up, the two subjects split on a corner-to-corner diagonal.
- **By day, dawn and sunset** there is no space. It is a high sky with clouds. Math has a striped
  hot-air balloon, two diamond kites on curving strings and birds in a V. Reading and Writing has
  a kite whose ribbon tail is written with letters, and paper planes folded from pages.
- **Only at night** it opens into space: a ringed planet with moons on elliptical orbits and
  geometric constellations for Math, a nebula of ink and letters with book and quill
  constellations for Reading and Writing.
- **Hover:** by day, the Math kite strings and kites trace themselves in light, a triangle joins
  the kites and the balloon, the burner flares and a flock crosses. Reading and Writing's letters
  lift off the kite's tail and paper planes glide off. At night, the constellations draw
  themselves and the moons run their orbits. The other half dims.
- **Choosing:** the chosen sky slides over the other, then the camera falls through a bank of
  cloud onto the subject's ground (about 1.9 seconds). Escape on the way down turns back.

## 2. Telescope

- You are inside an old observatory: dark timber ribs up the dome, the shutter slit letting in the
  hour's light, a brass lamp. In the middle is the telescope's round view, framed in brass.
- Through it you see both ground scenes, split on the diagonal, each with its name.
- **Hover:** the view pans toward that subject, a fine line of light traces it (the arch's
  parabola, or the open book), the brass focusing ring turns, and the other half dims.
- **Choosing:** the chosen scene slides over the other, the view pulls back a little, then the
  lens opens out to the whole screen while the room falls away, landing on the ground (about 1.6
  seconds).

## 3. Library doors

- A stone library hall with a round window in the hour's sky, wall lamps and a timber floor. Two
  tall oak doors stand side by side under carved panels: a compass rosette for Math, an open book
  for Reading and Writing. Each door carries its name.
- **Hover:** the door's leaves ease ajar, warm light glows in the gap and spills across the floor,
  and the other door dims.
- **Choosing:** both leaves swing open onto the subject's ground beyond, and the camera walks
  through the doorway until the scene fills the screen (about 1.8 seconds).

## Challenge stars

- The two lights in the Challenge banner are now clean round stars: a crisp core, a soft halo that
  slowly brightens and dims, and two tiny round glints that come and go. Ten small background stars
  twinkle out of step. No four-point shapes.
- With reduced motion, or "Keep the painting still", nothing twinkles.
- Clip: `clips/challenge-twinkle.mp4`. Stills: `challenge-day.jpg`, `challenge-night.jpg`.

## Shared rules for my three

- Painted in code with Karman's brush engine, in the hour's light. No images.
- Pointing, keyboard focus and a first tap on a phone all show the hover. The second tap chooses.
- Reduced motion: no movement, the hover only brightens, and choosing is a cross-fade.
- Phone, iPad and desktop. No sideways scroll.

## How I checked

- Headless Chrome only, one browser at a time, against my own dev server (port 3163).
- Stills of each intro at 1440 and 390 wide, day and night: start, each choice hovered, middle of
  the ending, and the open box. Files are `<intro>-<width>-<time>-1-start.jpg` and so on, plus
  `<intro>-reduced-hover.jpg`. No sideways scroll at either width, before or after opening, and no
  page errors.
- 22 clips (six per intro, one combined per intro, the Challenge), each under 3.5 MB.
- `npx tsc --noEmit`, `npm run lint`, `npm run format:check` (my files), and the Library tests
  (8 pass: the stage with a stub intro, the picker, Close returning to the intro, `?subject=`,
  intro 1's tap-then-tap and Escape, and the Challenge).

## Decisions I made

- Without `?intro`, a course kept from earlier in the session reopens straight away, as before.
  With `?intro`, it always starts at the intro, so the founder can compare.
- The picker shows whenever `?intro` is in the address, also on the live site, so the founder can
  compare there too.
- After the app restarted twice tonight, Docker (and with it the local database) was down. I
  started Docker again both times, before the orchestrator asked everyone to keep it off to save
  memory. Nothing was reset. Everything since was recorded from the dev preview page.
- The Library's side column (Practice, Full-length tests, Skill levels) moved into its own
  component, `LibrarySide.tsx`, so the real page and the preview share it.
- The preview page is let through the sign-in check in `src/middleware.ts` (two list entries).
  The page itself is a 404 in production builds.
