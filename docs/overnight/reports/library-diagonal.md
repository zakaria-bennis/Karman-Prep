# Library: two paintings on a diagonal

Session: library-diagonal. Branch: `claude/overnight-library-diagonal-343107` (cut from
`claude/overnight-ship` at `53c8c7e3`). Nothing pushed, nothing deployed, no database writes.

## What you see now

- The Library opens with no box. After the Challenge (if it shows), two paintings fill the screen.
  They meet on a soft painted diagonal, from the top (right of center) to the bottom (left of
  center).
- **Math** is on the left: a lake under mountains with one sharp triangular peak, the stone bridge
  whose arch is a parabola, terraced fields that climb like a bar chart, and a ring of light around
  the sun.
- **Reading and Writing** is on the right: a meadow, an open book with the grass and flowers
  growing out of its pages, a stream running from its spine, a quill in an inkpot, and a tree whose
  leaves now and then fall as letters.
- Both are painted in code, stroke by stroke, with the same brush engine as the daily paintings.
  They follow the time of day (dawn, day, sunset, night). The first visit in a session paints them
  in (about 2.6 seconds). Later visits show them finished.
- Each subject's name sits in its half in large Young Serif, with "6% done" small beneath.

## Hover

- **Math:** a light runs along the bridge's arch and draws the curve behind it. The posts light up
  one by one, like points on a graph. Then the graph draws itself: the waterline becomes the
  x-axis with ticks, a dashed y-axis rises through the top of the arch, a circle is drawn round the
  sun with its radius, a triangle is drawn on the peak, and the tops of the terraces are joined
  into a rising line.
- **Reading and Writing:** pages turn over in the book, and letters lift off the pages and drift
  up like leaves.
- The half you point at brightens. The other half dims a little, and the seam leans slightly toward
  it. The name lifts a few pixels.
- **Keyboard:** Tab onto a half does the same, with a white rule under the percent. Enter opens it.
- **Phone and iPad:** the first tap shows the effect, the second tap opens.
- **Reduced motion** (or "Keep the painting still"): painted at once, nothing moves, and pointing
  only brightens the half.
- Nothing moves behind the names.

## Opening the box

- Click a half. Its painting swells with light and grows over the other one (the seam slides off
  the screen). The box opens out of the point you clicked, on a spring. The subject's name flies
  from the painting into the small Math / Reading and Writing toggle at the top left of the box.
- The box holds the course (Up next, Domains) and, beside it, Practice, Full-length tests and
  Skill levels.
- The chosen painting stays behind the box. Switching course with the toggle slides the seam
  across to the other painting.
- **Close** (top right of the box, an X on phones) shrinks the box away and brings back both
  paintings. Focus returns to the painting you had open.
- The open course is remembered for the browser session. Changing tabs or reloading reopens it.
  Closing the box forgets it. A `?subject=math` link still opens a course straight away.

## Phone and iPad

- On a phone, and an upright iPad, the diagonal runs gently across the middle: Math on top,
  Reading and Writing below. The page heading steps aside on phones while the paintings show, so
  it doesn't sit on the Math name.
- No sideways scroll at 390, 768 or 1440 wide, closed or open.

## Removed

- The in-box subject cards (`CourseChooser`, `SubjectMarks`, `chooser.module.css`).
- The `?hero=a|b|c` trial versions (`heroes/`), their art (`src/lib/painting/subjects/`) and their
  screenshot script. The bridge and book drawings moved to `src/lib/painting/library/`, which is
  now the only place they live.
- The Challenge moment is unchanged (its "wait for the painting" helper moved to `moment.ts`, so
  both moments share it).

## How I checked it

All in headless Chrome against my own dev server (port 3163, local database, the dev test
student). I never opened the app's Browser pane.

- 1440 and 390 wide, light, dark and night; plus 768 (iPad) light. Closed, each half hovered, and
  open. No page errors. No sideways scroll.
- Keyboard: Tab reaches the Math half and lights it; Enter opens the box and focus lands on the
  Math toggle.
- Close brings both paintings back (`1440-light-4-closed-again.jpg`).
- Reduced motion: hover only brightens (`reduced-motion-hover-math.jpg`).
- Pictures are in `docs/overnight/reports/library-diagonal/`:
  - `<width>-<mode>-1-closed.jpg`, `-2-hover-math.jpg`, `-2-hover-reading-writing.jpg`,
    `-3-open.jpg`.
  - Frame sequences: `frames-paint-in-*` (the first paint), `frames-hover-math-*`,
    `frames-hover-reading-writing-*` and `frames-open-math-*` (click to open).
  - To make them again: `node scripts/dev/library-diagonal-shots.mjs` (needs the dev server on
    port 3163, or set `BASE`; it uses the installed Chrome).

## Checks

- `npx tsc --noEmit`: passes.
- `npm run lint`: no errors (the one old warning in `PortalShot.tsx` is not mine).
- `npm run format:check`: my files pass. `BRIEF.md` and two student portal design notes were
  already unformatted; I left them.
- `npm test`: 9,778 pass. The Library tests are rewritten: box closed at first, a pick opens it
  with the toggle, close goes back and forgets, first tap then second tap on touch, keyboard focus
  lights a half, and `?subject=` opens straight away.
- `npm run check:sizes`: passes.

## Decisions I made

- **Seam direction:** top right to bottom left, Math on the left. It keeps the bridge and the name
  clear of the box's usual spot and the nav rail.
- **One sun:** both paintings put the sun (or moon) on the seam, so you see one sun, not two.
- **The open course keeps its painting** behind the box instead of the day's painting, so the
  choice stays part of the picture. The "Painted by Karman" credit hides on this tab.
- **"Remember for the session"** means until the tab or window closes. Closing the box forgets it,
  so the paintings show next time. (Before, the pick also reset each day.)
- **Close** is a quiet button with an X and the word Close, top right of the box.
- **No Escape key to close the box**, so Escape stays free for menus inside the course.
- The light that grows on click is the painting brightening and spreading, not a glowing orb
  (design rule 21).

## For the founder to decide

- Should the open course keep its own painting behind the box (as now), or go back to the day's
  painting once the box is open?
- Is the diagonal angle right, or would you like it steeper or flatter?
