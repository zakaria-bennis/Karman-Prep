# The Karman portals design system

Read this before building a screen. Everything here is in `src/design-system/`;
import from `@/design-system/<folder>`. The look follows `docs/design-rules.md`
rules 49 to 58 inside the app: an open background world, liquid glass controls
over opaque panels, custom icons, a slim icon rail, device light or dark with
dark as the default, AA contrast by calculation, no marigold in the student
progression UI, gold only on tokens.

## Tokens (`tokens.css`, generated from `themes.json` by `scripts/tokens.mjs`; `tokens.ts` lists them)

Colour, as `rgb(var(--k-name) / alpha)` and Tailwind `bg-name`, `text-name`, `border-name`:
`canvas`, `surface`, `raised`, `panel`, `line`, `text`, `muted`, `border`, `gold`, `math`,
`reading`, `accent`, `accent-ink`, `positive`, `positive-bg`, `positive-ink`, `negative`,
`negative-bg`, `negative-ink`, `notice`, `notice-bg`, `notice-ink`. Set per theme on
`html[data-theme=<id>]` for the 12 account themes: observatory, charcoal, forest, plum
(dark); ivory, paper, sand, sage, lavender, peach, rose, blush (light). Each carries its
own accent (from the end screen's palette.js); four light accents were darkened so accent
text passes 4.5:1 on `raised`. Fixed gold for the coin and medal: `--k-coin-rim-1..3`,
`--k-coin-face-1..3`. Nothing inside the app uses marigold.

Type (`text-title` 24, `text-section` 16, `text-body` 15, `text-dense` 14, `text-small` 12,
`text-kpi` 24, `text-kpi-lg` 36). Running text never under 15px, nothing under 11px,
tabular figures everywhere (`font-variant-numeric` is set on html), tracking 0 and
negative only above 32px. Faces: `--k-font-sans` (Hanken Grotesk; `html[data-type="plex"]`
switches to IBM Plex Sans), `--k-font-serif` (IBM Plex Serif, question stems).

Spacing on a 4px base. Radii: `rounded-chip` 4, `rounded-control` 6, `rounded-card` 8,
`rounded-panel` 12, `rounded-pill`. Z: `z-rail` 10, `z-sticky` 20, `z-scrim` 39, `z-sheet` 40,
`z-toast` 50, `z-confetti` 60. Easing: `ease-k` = `cubic-bezier(.22,1,.36,1)`.

## Theme (`theme.tsx`, `themes.ts`)

`<ThemeProvider initial>` resolves the theme: a stored or chosen theme wins; else mode
`dark` or device dark or no preference gives observatory; device light gives ivory (not
paper, whose surface is pure white). `useTheme()` returns `{ theme, mode, type, glass, bg,
resolved, dark, set(patch, remember), toggleMode() }`. `useThemeColors()` returns the
resolved theme's hex values for canvas drawing. `THEMES`, `themeById`, `statusFor(dark)`,
`hexToRgb`, `rgba` live in `themes.ts`. `index.html` applies the same rule before paint.

## Motion (`motion.ts`)

`EASE`, `SPRINGS` (quick 0.32/0.86, settle 0.4/1, bounce 0.42/0.62), `bakeSpring(response,
damping)` to a CSS `linear()` plus duration, `spring(name)`, the `--k-spring-<name>` and
`--k-spring-<name>-ms` vars (installed by the provider), `animateSpring(from, to, onFrame,
name, velocity)` for gesture hand-off, `project(velocity)` and `rubber(offset, dim)` from
Apple's fluid interfaces, `useReducedMotion()` live, `reducedMotionNow()`. Feedback on press.

## Backgrounds (`backgrounds/`)

`<Background variant? hour?>` draws the chosen world on a canvas filling its `relative`
parent, under the content, pointer-events none, 8 to 12 fps, paused off screen, still
under reduced motion. Variants: `sky` (rule 49's constellation), `ruled` (exam paper with
one travelling rule), `contour` (drifting topographic lines, the recommended pick),
`grain` (paper grain with a time-of-day tint; pass `hour`). `BG_MAX_ALPHA` caps each
world's strongest mark (0.14, 0.14, 0.14, 0.05 of the text colour) so body and muted text
stay AA over any spot; `scripts/contrast.mjs` checks it.

## Glass and panels (`glass/`)

- `<GlassButton variant="primary"|"glass" size="md"|"sm"|"icon" icon loading disabled
  recipe>`: ported from 21st.dev 12460. `primary` is the one highlighted action per screen
  (accent-tinted glass, accent-ink text); `glass` is clear. 44px tall, pill, press scale
  0.97 on pointer down, focus-visible ring, a drawn orb after 400ms when `loading`,
  `disabled` stays legible and focusable (clicks ignored, `aria-disabled`).
- Recipes: `refract` (A) bends the backdrop through an SVG displacement filter on
  Chromium; `frost` (B) is CSS blur with the same bright top edge and soft shadow, and the
  automatic fallback on Safari and Firefox. `html[data-glass]` sets the default.
- `<GlassSegmented options value onChange label fill>`: glass thumb on an opaque track,
  arrow keys, 44px options. `<GlassToggle checked onChange label icons>`: role switch,
  tap, drag with velocity, arrows.
- `<Panel as className>`: the opaque surface (92 percent surface over canvas, hairline
  edge, radius 12, no shadow). `<Well>`: one more tone step inside a panel. Glass never
  sits on glass; a glass control sits on a panel or the canvas.
- `<Orb size>`: the loader; `useLiquidGlass(rootRef, options)` for a new glass control.
- `glass.css` holds the recipes; the `k-glass` class is the root.

## Icons (`icons/`) and marks (`marks/`)

`<Icon name size={24|20} label className>`, names: home, daily10, practice, tests, timer,
endless, calendar, chat, parent, tutor, students, school, classes, keys, settings, tokens,
box, streak, lock, upgrade, back, close, menu, search, bell, help, download, share, play,
pause, check, cross, chevronRight, chevronLeft, chevronUp, chevronDown, plus, minus, edit,
sort, filter, camera, upload, book, mark, sun, moon, eye, eyeOff, info, alert, more.
`ICON_NAMES` lists them. Marks: `<Token size glint>`, `<TokenCount value>`, `<MysteryBox
size>`, `<BoxIcon>`, `<Flame>`, `<Streak days>`, `<LevelMark level>`, `<LevelBar value was
size>` with `band(p)`, `BANDS`, `SEGMENTS`, `<Medal>`, `<CompanionHead animal stage mood
accessory size>`, `<CompanionBody>`, `ACCESSORIES`, `<AccessoryIcon id>`.

## Components (`components/`), props in brief

`Skeleton` (`.Block w h`, `.Text lines`, `.Circle size`, `.Row sub`, `.Kpi label lead`,
`.Swap loading fallback label`), `CountUp to from duration decimals prefix suffix onEnd`,
`ConfettiLayer` with `useConfetti().fire(kind, element)` (kinds score, companion, prize,
level, tokens), `Sheet open onClose title side width done`, `ProgressBar value max label
startLabel endLabel`, `Empty title detail action`, `ErrorBlock what lastGood onRetry`,
`Sparkline data labels label width height format`, `LineChart data labels today target
min max height label format`, `IconRail items bottom active onSelect` (`RailItem`: id,
label, icon, count), `BottomBar items active onSelect`, `TopBar title leading onLeading
action heading`, `Heatmap data end weeks cell label`, `DataTable rows columns rowKey
caption defaultSort emptyMessage`, `Timer seconds running hideable onDone` with
`useCountdown`, `ToastProvider` and `useToast().push({ title, detail, kind, action })`,
`Dropzone accept maxMB label onFile`, `Stepper steps current onChange onFinish`,
`WeekCalendar events dates today from to` with `Legend`, `Tabs tabs value onChange label`,
`Row title sub leading trailing onPress href selected` (sub only for a date, due time or
state), `List total viewAll`, `Pill tone`, `KpiStrip items` (label, value, unit, delta,
lead), `Locked bundle onUpgrade`, `Welcome name context`, `Wordmark size`, `DeviceFrame
device bare`, `useWidth(ref)`, `useMediaQuery`, `useCoarsePointer`.

House rules on every screen: one h1 (the TopBar's title on a real screen), one highlighted
action, no row subtitles unless they carry a date, a due time or a state, every due item
shows its due date, counts only on queues that need action, numbers right-aligned and
tabular, no zebra, 12px grey headers, skeletons for loading, an error inside its block,
an empty block keeps its frame, a locked panel stays readable, no em dashes, no emoji.

## Plans (`src/plans/`)

`PLANS` (free, platform, plus, cohort, private10, private20, school: id, name,
description, price, billing, priceLabel, questions, guarantee, bundles), `BUNDLES` (the 13:
quiz, calculator, daily10, challenge, fullLength, progress, planning, workshops,
liveClasses, oneToOne, parent, guarantee, school), `has(plan, bundle)`, `upgradeFor(plan,
bundle)`, `LADDER`. `<PlanProvider plan>` and `usePlan()` give `{ plan, name, has(bundle),
upgradeFor(bundle) }`. Never hard-code a plan name in a component.

## Mock data (`src/mock/`), the fixed clock is 2026-10-31 09:41

`TODAY`, `NOW`, `SAT_MARCH` (2027-03-06), `FREE_TEST`, `daysUntil`, `addDays`, `fmtDate`;
`STUDENTS` (Maya private20, Noah free first day, Lin platform, Sofia plus, Ava cohort with
David, Theo on a Ridgeview High seat), `PARENTS` (Dana has Maya and Noah), `TUTORS` (David,
Zakaria), `STAFF`, `SCHOOL`, `COHORTS`, `CLASSES`, `studentById`; `SKILLS` (39, exact
labels), `DOMAINS`, `levelsFor(studentId)`, `movedToday`, `weakest`, `byBand`; `QUESTIONS`
(10 Karman originals), `DAILY10_RESULT`, `DAILY10_TOKENS`; `WELCOMES`, `pickWelcome`;
`REWARDS`, `BOX_COST`, `practiceDays`, `streakFrom`; `EVENTS`, `DUE`, `WEEK_DATES`,
`TODAY_INDEX`; `<MockProvider state studentId>` and `useMockState()` giving `{ state,
student, now, loading, error, empty, locked }`. Every file carries `console.assert`
checks that its totals add up.
