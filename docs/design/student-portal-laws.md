# Student portal: the laws as layout decisions

Written 2026-11-06 for the student portal skeleton
(`prototypes/student-skeleton/`, now filled with a simulated student). `docs/design-rules.md` still wins where it
disagrees. Each law below says what it means and what it forces on the screen.

The feeling to reach: "I'm getting better, and I know exactly what to do next."

## Laws of UX

| Law | What it means | What it forces in the portal |
| --- | --- | --- |
| Hick's Law | More choices, slower decisions | One highlighted action per screen. Five tabs at most, so Cohort and Private reach Rewards from the top strip and the Today card. Practice recommends one mode before listing the rest |
| Miller's Law | People hold a few things at once | Up next shows three rows at most. Skills to work on shows three, then "See all" |
| Tesler's Law | Complexity has to live somewhere | Karman picks the next set and the weak skills, so the student doesn't have to. Plan rules live in one config |
| Progressive disclosure | Show detail when asked | Full stats are collapsed under "All stats" on Progress |
| Jakob's Law | People expect what other apps do | Bottom tabs on phone, side rail on desktop. The character sits top right on every device and opens a small account menu, as on Google or YouTube |
| Fitts's Law | Big, close targets are faster | Full-width main button on phone. Every target is at least 44 by 44 |
| Von Restorff | The different thing gets noticed | The accent fills only one button per screen. Everything else is neutral |
| Serial position | First and last are remembered | Next action first on Today. Today is the first tab, profile is the last stop |
| Goal gradient | Effort rises near the finish | Ten segments on Your Daily 10. Tokens show the distance to the next box. The score has no target: students are never capped at a number |
| Zeigarnik | Unfinished work stays on the mind | Leaving a set mid-way turns the main button into "Continue Your Daily 10" |
| Peak-end | People judge by the peak and the end | Every set ends on the approved end screen, then a clear next action |
| Doherty threshold | Response under 400 ms keeps flow | Buttons respond on press. Section skeletons while loading, button orb only after 400 ms |
| Proximity and common region | Close together means related | Each card holds one idea. Date sits on the same row as its item |
| Law of similarity | Alike means same function | Every row is built the same way everywhere |
| Aesthetic-usability | Good-looking feels easier | Applied in the visual round. The skeleton only sets space and order |

## Apple's design guidance

- **Hierarchy:** size and position show what matters, not decoration.
- **Spatial consistency:** navigation stays in one place on each device. Sets
  hide the navigation so the student can focus.
- **Feedback on press:** buttons react on touch, not on release.
- **Clarity:** each screen answers what this is and what to do next.

## Build for Good UX (`site-design-principles.md`, section 11)

- Button words name the action, never "Learn more".
- No dead ends: every screen offers a next step.
- Locked features say plainly what they add, once per screen, with one link.
  No nagging, no fake urgency.

## Motion (founder, 2026-11-06)

Buttons are tactile, bubbly and kinetic. Nothing moves on a straight line. All
of it lives in `prototypes/student-skeleton/motion.js`.

- **Press:** the main button sinks onto its lip the moment a finger lands, then
  springs back past its rest position. No waiting for release.
- **Springs:** damping 0.55 for releases and rewards, 0.72 for things arriving,
  1.0 for large surfaces. Every spring retargets from where the element is now.
- **Open and close:** screens leave quickly and arrive in a loose stagger. Tabs
  slide along their order, sets grow from the spot that was tapped, and sheets
  can be dragged down, flicked away or interrupted.
- **Answers:** a right answer bounces, a wrong one shakes, and numbers roll to
  their new value.
- **Reduced motion:** short cross-fades only, no slides, bounce or fox blinks.

## Style (founder, 2026-11-07)

The student portal's world is print, in an ink look and a woodblock look. The founder rejected
the rounded-box look, The Tide, The Note, the mountain climb as a measure of progress, and link
underlines. Homework does not say who assigned it. The research behind these rules is in
`student-portal-research-2026-11-07.md`.

**The art can be new, but the controls must be familiar (Jakob).** Tabs, to-do
rows with due dates, the calendar and the Bluebook-style question screen work as
students expect. Art never replaces a control.

**A living world, never on questions.** `world.js` moves mist, stars and moonlight over the
painting from `art/paint.mjs`, and the mist parts around the pointer. It stops on question screens
and holds still under Reduced Motion.

**Today is a real dashboard.** Gamified prep mixed with Canvas, where every element is useful.
It opens with the next task, then the to-do list, skills, the predicted score with its test
history, more practice and what's coming up. It has no weekly dots and no tokens: tokens only buy
mystery boxes, so they live on Rewards.

**No score goal anywhere.** Karman never caps a student's aspiration at a number.

**Mastery follows Khan Academy's logic.** Four bars per skill, a plain count of skills at
Proficient or above, and a short goal per domain. Bars and squares, never rings. Moving a skill
up is the moment that gets motion.

**Account menu:** the character opens a small panel, never a full screen. Escape, a click
outside or moving to a new page closes it.

**Desktop rail:** a pane of liquid glass, the only glass in the portal. It slides out when the
pointer reaches the left edge and slides back the moment the pointer leaves it. It also opens on
keyboard focus. Touch screens keep tabs or a fixed rail.

## Founder rules this layout depends on

Rule 28 (no sideways scroll), 29 (skeleton loaders), 33 (device theme, dark by
default, AA contrast), 34 (nothing fixed over text being read), 35 (one
highlighted action), 51 (no needless subtitles), 52 (few icons, slim rail), 53
(product names), 54 (tutors named), 55 (due dates shown), 56 (question tools and
set indicator), 58 (phone drawn for iPhone 17 Pro Max). The predicted score is
one number, never a range, and never shown at the end of a Daily 10.

## Left for the visual round

Liquid-glass buttons (rule 50), the background world (49), final custom icons
(52), 21st.dev components, final copy and the score trend options.
