# QA sweep, 8 November (qa-sweep)

Branch: `claude/overnight-qa-0acc96`. It is cut from `claude/overnight-ship` and now includes
the admin restyle and painting detail merges. Nothing is deployed or pushed, and production
was not touched.

## What I clicked

I used headless Playwright scripts from the command line, with one dev server and never the
app's Browser pane. I waited a fixed time instead of "network idle", and turned motion off so
the paintings hold still.

- **Links:** I followed every link a page offers, as each person, and checked the answer for
  each one: the public site signed out (20 pages), then Pro (45), Free, Practice, Cohort (35),
  Private (35), the parent (6), Thomas the teacher (25), David the tutor (30), Priya the
  affiliate (5) and the admin (20). **No dead links.** Every page answered.
- **Screens:** I opened each person's main screens at phone width (390) in dark mode and at
  desktop (1440) in light mode. On every screen I checked for console errors, sideways
  scroll, clipped words, contrast, and anything fixed sitting over text. The public site was
  also checked at 390 light, and 7 of its pages at 1440.
- **Buttons:** on desktop, every button that changes nothing was double-clicked: tabs, menus,
  toggles, "Dark mode" and FAQ answers. Buttons that save, pay, send or delete were left
  alone. No double-click caused an error. The quiz's answer button only lets one request
  through at a time, so a double tap can't record an answer twice.
- **Toggles and feedback:** the account switches spring with a small overshoot. Main buttons
  press in when tapped. Both are already right.
- **Not covered:** iPad width (768) for the portals, the Domain quiz and a full test start in
  the browser (their links answer, but I didn't open them), and the admin click-through (the
  Users table was too long for the time left). The dev server ran out of memory and restarted
  itself twice. That cut the Practice student's screen check, but their link check passed.

## What I fixed (one commit each)

1. **Private 10 and 20 buyers can book their hours.** The booking and availability checks
   read the old `private`/`elite` subscription tiers. They now ask `src/lib/plans` (subscriptions and
   one-time purchases alike). Private 10/20 can book, and Cohort counts as a group seat. The
   dead Elite monthly tokens code is deleted.
2. **The "Your trial ends" banner is deleted.** There are no trials.
3. **The recording-consent banner no longer covers the quiz or the portals.** It now shows
   on the public site only. Without an answer nothing is recorded, because recording is opt-in.
4. **The consent banner's "Allow" button is readable** in both themes (it was 1.8 to 1).
5. **Bar charts drew negative bar heights on phones.** This was not one question. 11 bar-chart
   questions broke at 280 to 340 pixels wide, because the rotated category names used up all
   the height. The chart now keeps a minimum plot area and grows taller, as it already does
   for titles. I checked all 800 figure questions at five widths: none draw negative sizes
   now. No questions were edited. For the import team, these 11 were the affected ones:
   `1d9b1aef`, `1e902f8b`, `467a19ff`, `4c3943bc`, `4fcc8caf`, `5ff59fb1`, `616afd5b`,
   `6efe770b`, `74d37e48`, `7ada0aea`, `d8422d9a`.
6. **"Long titles slide under the top-left pill" (found and fixed).** The pill was the old
   Learn header (Karman mark, "← Today", theme picker and avatar). It floated over every quiz
   screen's own top bar, covering the section title, the Back button and a tool. It now hides
   on any screen that has a quiz bar or the painted shell.
7. **The Daily 10 and every quiz screen were wider than a phone.** The quiz screen was 682
   pixels wide on a 390 pixel phone. The passage and answers were cut off on the right, and
   Submit was half off screen. The screen is now held to the phone's width, and the ten
   progress dots sit a little closer on small phones, so Submit fits. This also fixes skill
   practice and the older quizzes, which use the same quiz screen.
8. **The Cohort and Private test students showed as Free.** The pricing session's promised
   seed file `supabase/seeds/overnight/pricing.sql` was never written. I wrote it, with a
   Cohort grant for Sofia and Private 10 for Maya. I added those two rows to the shared local
   database, insert-only. Maya now sees her Calendar tab, workshops and booking area.

## Still broken or worth a look, by area

**Public site**

- On phones, the consent banner covers part of every page until it's answered. That's normal
  for a consent banner, but rule 34 says nothing fixed over text. You may want it smaller.
- Signed out, an unknown address goes to sign-in, not a "page not found" page. This was
  already known from the site audit.
- The phone screen drawn on the home page has two small labels ("Schedule", "Messages") at
  about 2:1 contrast. It's a picture of the app, so it's minor.
- Visitors get a "Dark mode" button on the home page, while the decision is "follow the
  device". It works. Keep or remove it?

**Student portal**

- The Library logs a React warning: the painted shell's start-up script is drawn again after
  a page change, so it doesn't run that time. Nothing visible breaks.
- The phone tab bar sits over the content as you scroll, as tab bars do, and there's room at
  the bottom to scroll the last item clear.
- **Private booking can't be tested locally,** because Cal.com is switched off: the
  Calendar says "David Cole is finishing their booking setup." The server check is fixed (see
  above), but booking a real slot needs Cal.com on.

**Tutor, affiliate, parent, school, admin**

- No dead links, errors or sideways scroll. David's Schedule shows "Join" on a session six
  days away. Please check that's intended.

**Checks**

- `npx tsc --noEmit`: passes.
- Lint on the changed files: passes. Prettier on the changed files: passes.
- Tests: 8,405 pass. Two files failed:
  - `src/lib/educator-briefing/daily-roster.test.tsx` fails because it imports the portal's
    Google font helper (`Hanken_Grotesk is not a function`). It came with the merged branch,
    not my changes.
  - The calculator break corpus timed out under machine load, then passed on its own (37/37).
- I didn't run `cf:build` (the brief allows one, at the end, and the machine was overloaded).

## Decisions I made

- I hid the consent banner on app screens rather than move it, because recording is opt-in
  so hiding it records nothing.
- I fixed the bar charts in the chart drawing code instead of listing one question, because
  the cause was the code, not the data.
- I gave the Cohort test student a cohort grant without picking a cohort id. The seed has no
  checkout to point to.
