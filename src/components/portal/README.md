# Painted portal shell

The shared look for every signed-in portal: student, parent, tutor, school and admin.
Ported from `prototypes/today-directions/` (founder approved, 2026-11-08). The painting
engine lives in `src/lib/painting/`.

```tsx
import { PortalShell, Panel, Card, SectionHeader, Row, Cta } from "@/components/portal";

<PortalShell portal="Parent" nav={PARENT_NAV} name={firstName} accountDetail={email}>
  <Panel side={<Card>...</Card>}>
    <section>
      <h2 className="kp-title">Maya's week</h2>
      <Cta href="/dashboard/parent/report">Open the full report</Cta>
    </section>
    <Card>
      <SectionHeader title="Homework" note="6 open" />
      <Row title="Skill practice: Transitions" href="..." right="Tonight" />
    </Card>
  </Panel>
</PortalShell>;
```

`PortalShell` is a client component. Everything else is server-safe, so a server page can
render its content straight into the shell. The working example is the student Today page:
`src/components/dashboard/StudentDashboardClient.tsx`.

## Rules

- **One main button per screen.** `Cta` is the only highlighted button. Every other action is a
  text link (`MoreLink`, a `Row` link, or `className="kp-link"`).
- **Progress is a ring.** Use `Ring` or `LevelRing`. The one exception is time and effort, which
  is one labelled bar per day so days compare at a glance (founder, 2026-11-08).
- **Open in place.** A card that has more to show uses `Expand`: it slides open where it is
  instead of jumping to a new page, and the opened part links to the full page if one exists.
- **Skills are always squares.** Use `SkillSquares`. Outline for not started, then New,
  Learning, Understanding, Conquered in the painting's four shades.
- **Numbers are Hanken Grotesk** with lining, even-width figures: wrap them in `Num`.
  Young Serif is only for the big page heading, never for numbers.
- **Square corners.** The box and cards have 4px corners.
- **Nothing moves behind text.** Anything marked `data-paint-keepout` (the heading, the box,
  the rail, the app bar) is kept clear of birds, leaves and weather.
- **Light and dark follow the device.** Use the shell's CSS variables (`var(--ink)`,
  `var(--mute)`, `var(--line)`, `var(--accent)`, `var(--l1)` to `var(--l4)`), not Tailwind
  `dark:` classes, which follow the site's own theme switch.
- No eyebrow labels, no numbered 01/02 lists, no score goal, one predicted score (never a range).

## PortalShell

| Prop            | What it does                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `portal`        | Who it is for, read by screen readers on the nav ("Student", "Parent").                                                                               |
| `nav`           | The portal's tabs: `{ href, label, icon, badge? }[]`. Rail on desktop, tab bar on phone. The active tab is the longest `href` the path starts with.   |
| `title`         | The page heading, typed in. Leave it out on a home page to get a rotating greeting for the hour.                                                      |
| `name`          | First name, for the greeting and the account menu.                                                                                                    |
| `accountDetail` | Second line in the account menu, usually the email.                                                                                                   |
| `satDate`       | ISO date. Adds the milestone greetings at 100, 60, 30, 14 and 7 days.                                                                                 |
| `streak`        | `{ days, href }`. Shows the flame and count beside the fox. Leave out to hide.                                                                        |
| `menu`          | The portal's own account menu items: `{ label, icon, href }` (or `onSelect` from a client component). A short label each, with an obvious point.      |
| `settingsHref`  | This portal's Settings page. With it, "Settings" heads the menu; without it, "Account" opens Clerk's account window. "Sign out" is always added last. |
| `home`          | Where the Karman logo leads. Defaults to the first nav item: the logo never leaves the portal.                                                        |

The fox avatar drops down the account menu as a list: who is signed in (name and email), then one
row per item (a small line icon and a short label), then Sign out below a divider. Escape, a click
outside or a scroll closes it, and focus returns to the avatar. Up and down arrows move between
rows.

Icons for `nav[].icon`: `today`, `homework`, `library`, `calendar`, `progress`, `students`,
`child`, `messages`, `money`, `settings`, `school`, `questions`, `review`, `upload`, `code`,
`shield`, `home`. They are Karman's own line icons (`icons.tsx`); add new ones there.

## Panel

The tinted, squared box, left of center, full height on desktop. `children` is the main
column. `side` adds a second column from 1100px wide (it stacks below on smaller screens).
`banner` spans the top. Cards inside get even 16px gaps, and the last card in each column
stretches to the bottom on desktop. On the first open of a session the box waits for the
painting, then slides down.

## Card, SectionHeader, Row, MoreLink

- `Card` groups related things. `tone="late"` warms the border for overdue work.
- `SectionHeader title note?` is the card heading, with an optional small count on the right.
- `Row title sub? right? rightTone? href? leading?` is one line in a list. Give `sub` only for a
  date, a due time or a state the person needs (design rule 51). `leading` takes a `Ring` or
  `SkillSquares`. With `href` it is a link.
- `MoreLink href` is a text link with a small chevron ("See all homework").

## Cta

`<Cta href="...">Start Your Daily 10</Cta>`, or `<Cta onClick={...}>` / `type="submit"` inside a
client component. It always carries the chevron: white text on the painting's accent, which is
darkened until the text passes 4.5:1.

## Expand

`<Expand summary={<b>Algebra</b>} tint="var(--l3)" label="Algebra">...details...</Expand>`. The
summary is a button (`aria-expanded`); the details slide open with grid rows (no measuring).
`tint` colors the card's wash and its left edge. `defaultOpen` opens it on arrival.

## Ring and LevelRing

- `<Ring value={0.62} label="SAT Math: 62%"><Num>62%</Num></Ring>`, with optional `size`,
  `width` and `color`.
- `<LevelRing counts={{ 0: 5, 1: 3, 2: 8, 3: 4, 4: 2 }} />` splits a ring by skill level.

## SkillSquares and SKILL_LEVELS

`<SkillSquares skills={[4, 3, 2, 0]} label="Algebra: 2 of 4 at Understanding or above" />`,
or pass `{ level, name }` objects so each square names its skill on hover.

`SKILL_LEVELS` (in `skill-levels.ts`) is the one source for the level names, the run of right
answers needed (3 to Learning, 4 to Understanding, 5 to Conquered; an answer given with a hint
doesn't count) and the colors.

## Legend, Num, TutorNote, Banner

- `Legend items={[{ label, value?, color }]}` is the key under a ring or squares.
- `Num` sets a number in Hanken Grotesk; `<Num big>` is the 64px score style.
- `TutorNote from="David"` is a handwritten note in Caveat, signed.
- `Banner` is a strip across the top of the box (pass it to `Panel banner`).

## The painting

- One of ten Karman paintings a day, by date, relit for dawn, day, sunset or night.
- On the first open of a browser session it is painted in stroke by stroke in 3.8 seconds, in
  Bob Ross's order, and the heading types along with it. Later pages show it finished. Reduced
  motion always shows it finished and still.
- Once painted, the scene comes alive (birds, glints, smoke, deer, owls, fireflies) along with
  the season's particles. A click on open painting scatters a few. It runs at about 30 frames a
  second, and after a minute with no input it rests on its last frame until the pointer moves,
  a key is pressed or the tab comes back, so a page left open does not keep the computer busy.
- The heavy work runs after the first paint, in its own code chunk, so the page is usable at
  once. The painting's hue sets `--hue`, `--hs` and `--accent`; the four level shades `--l1` to
  `--l4` are derived from them in `portal.css`.
- Detail (2026-11-08): strokes are planned from the picture at 960 pixels wide, with five
  brushes; the finest only follows edges. Big strokes carry bristle streaks, colors drift a
  little warm and cool, and a soft canvas grain goes over the finished painting. When the
  painting appears finished, the big brushes go on at once and the small ones in idle slices
  (about half a second), so no single task holds the page for long. Timing marks
  `karman-paint-scene`, `-plan`, `-draw` and `-finish` show in the browser's Performance panel.
- Development only: force the light and the painting with query strings:
  `?paint-time=dawn|day|sunset|night`, `?paint-scene=0..9`,
  `?paint-season=fall|winter|spring|summer`, `?paint-weather=clear|rain|snow|fog`,
  `?paint-in=1` (plays the opening again).
