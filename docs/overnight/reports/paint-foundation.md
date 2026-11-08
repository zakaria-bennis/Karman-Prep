# Paint foundation: report

Branch: `claude/overnight-paint-shell-c31ea8` (cut from `claude/overnight-ship`). The first
version is already merged on `claude/overnight-ship` (421f0672). The fixes below are newer
commits on this branch and still need merging.

## What is done

- **The painting world is in the real app.** `src/lib/painting/` holds Karman's ten
  paintings, the stroke-by-stroke opening (3.8 seconds, Bob Ross's order), the living scenes
  (birds, deer, owls, smoke, fireflies and the rest), the season's particles and the weather.
  The day's painting is chosen by the date and relit for dawn, day, sunset or night. The
  painting follows the pointer slightly.
- **The opening plays once per browser session.** Later pages show the finished painting.
  With reduced motion the painting shows finished and holds still.
- **The page is usable at once.** The painting is drawn after the page appears, in its own
  code chunk, split into two short pieces of work.
- **Colors come from the painting.** Its main hue sets the button color and the four level
  shades, and the button is darkened until white text passes 4.5 to 1, as in the prototype.
  The last colors are remembered, so the next visit starts in them.
- **Nothing moves behind text.** Birds, leaves and weather stay out of the greeting, the box,
  the rail and the top-right bar.
- **The shared shell** (`src/components/portal/PortalShell.tsx`): a rail on desktop and a tab
  bar on phone with Karman's own line icons, the streak and the fox top right, a fox account
  menu (Escape closes it), a greeting typed in time with the painting, and the tinted squared
  box. Light and dark follow the device. Fonts are Hanken Grotesk, Young Serif and Caveat
  through `next/font`.
- **Building blocks** for the portal sessions: `Panel`, `Card`, `Row`, `SectionHeader`,
  `Legend`, `Ring`, `LevelRing`, `SkillSquares`, `Cta` (with its chevron), `Num`,
  `TutorNote`, `Banner`, and `SKILL_LEVELS` (names, runs of 3, 4 and 5, colors).
- **The student Today page uses it** (`/dashboard/student`), with its data logic unchanged.
  The student-portal session owns the student pages from here.
- **How to use it** is in `src/components/portal/README.md`.

## Found and fixed after the first version

- **The main button had dark text in light mode**, which failed contrast. A link style in the
  shell overrode the button's white text. Fixed: white text, 5.4 to 1 on the day's blue.
- **The cards did not reach the bottom of the box** on desktop. Fixed: the last card in each
  column now stretches to the bottom, as in the prototype.
- **The painting kept animating at full speed forever.** Painting pages left open in the
  app's browser pane helped freeze the Claude app tonight, and a student could leave Today
  open the same way. Now the living scene runs at about 30 frames a second, and after a
  minute with no input it rests on its last frame until the pointer moves, a key is pressed
  or the tab comes back.

## How I checked it

Headless Playwright against the local database, signed in as the test student Maya Johnson.
No browser pane.

- At 390, 768 and 1440 wide, in light and dark: no sideways scroll, the box shows, the nav
  is a tab bar on phone and a rail from 768.
- Dawn, day, sunset and night: each paints and gives its own button color.
- The opening: the box waits, the greeting types ("Up and at it, Maya."), the box arrives.
- The main button is clickable on top of the painting (the painting never blocks a click).
- The account menu opens with focus on its first item; Escape closes it and returns focus to
  the fox. Its items go to Messages, Quiz history, Plan and billing, Profile and Sign out.
- The living scene: about 50 ms of work per second while it moves; after a minute with no
  input it rests at about 1 ms per second, and it comes alive again when the pointer moves.
- The main button has white text at every size in light and dark (5.4 to 1 on the day's blue),
  and the last cards reach the bottom of the box.
- No errors in the browser console on any of these pages.
- Type check passes. Lint passes on the new and changed files. File sizes pass. The related
  tests pass (student dashboard layout, Library page, LearnDashboard: 24 tests).

Screens are in `docs/overnight/screens/paint-foundation/`: `today-390-dark.jpg`,
`today-390-light.jpg`, `today-768-dark.jpg`, `today-768-light.jpg`, `today-1440-dark.jpg`,
`today-1440-light.jpg`, `opening-mid-1440-dark.jpg`, `opening-done-1440-dark-day.jpg`,
`light-dawn-1440.jpg`, `light-day-1440.jpg`, `light-sunset-1440.jpg`,
`light-night-1440.jpg`, `account-menu-1440-dark.jpg`. The `light-*` and `opening-*` ones were
taken before the two fixes above.

## What is not done

- The other student pages (Progress, Calendar, Quiz history, Messages, Billing) and the
  tutor, parent and admin portals still use the old shell
  (`src/components/shared/PortalShell.tsx` through `DashboardLayout`). The portal sessions
  move them. Once none is left, delete the old shell and `DashboardLayout`.
- There is no Homework tab yet, because there is no Homework page to link to.
- There is no streak data in the app yet, so the streak stays hidden until a portal passes one.
- Real local weather is not wired; the weather is clear unless forced in development.
- The site's "Help us debug your experience?" consent banner covers the phone tab bar until
  it is answered. It comes from the site layout, not the shell.
- The `/school` portal is missing from the list of paths where the site's floating light and
  dark button hides (`src/components/shared/ThemeToggle.tsx`). The parent-school session
  should add it.
- I did not run the full lint, the full test suite or the Cloudflare build tonight (the
  machine was overloaded). Only the related tests.

## Decisions I made

- The shell follows the device for light and dark, as the brief says, and ignores the site's
  own theme switch inside the portal.
- The top-right bar scrolls away with the page instead of staying fixed, so it never sits on
  top of text (rule 34).
- The phone tab bar stays fixed at the bottom, with a nearly solid background.
- With no assignment in progress, the main button on Today opens daily practice
  (`/learn/daily`). I did not call it "Your Daily 10", because that page is not the Daily 10.
- No score or skills on Today, as decided on Nov 7.
- The living scene rests after a minute without input (see above).
- Development-only query strings force the painting: `?paint-time=dawn|day|sunset|night`,
  `?paint-scene=0..9`, `?paint-season=...`, `?paint-weather=...`, `?paint-in=1`.
- The prototype's unused mesa drawing was left out.

## For the founder to decide

- Nothing blocking. Worth a look on a real phone: whether the fixed tab bar over scrolling
  text is fine (rule 34).
