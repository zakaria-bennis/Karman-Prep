# Account menu and Settings: report

Session: menu-settings. Branch: `claude/overnight-menu-settings-85d46d`, cut from
`claude/overnight-ship` at `1053be37`. Nothing pushed, nothing deployed. I used the local database
only. I didn't touch the Library page or the Challenge banner.

Screenshots are in `docs/overnight/reports/menu-settings/`.

## What changed

### 1. The menu is a drop-down list

- It drops down from the fox with a small spring.
- Name and email sit at the top.
- Then one row per item: a small line icon and a short label.
- Sign out is last, under a thin line.
- Escape, a click outside or a scroll closes it. The up and down arrows move between rows.
- Every portal (student, parent, tutor, school, admin) uses the same list.
- The old grid of tiles is deleted, code and styles.

### 2. Fewer items, each with a point

**Student menu:**

| Item             | What it does                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Settings         | Opens the new Settings page.                                                                    |
| Plan and billing | Opens Settings at the plan and billing section.                                                 |
| Invite a parent  | Makes a link or code for a parent to join.                                                      |
| Messages         | Opens the cohort group chat. Shown only to students in a cohort, because only they have a chat. |
| Sign out         | Signs out.                                                                                      |

Removed from the student menu:

- **Tutor code.** It's now a field in Settings, "Have a code from your tutor?".
- **Test date** and **Sound.** Both are sections of Settings now.
- **Plan.** Renamed "Plan and billing".
- **Profile.** It opened the sign-in provider's window. That window is now the "Change name,
  email or password" button in Settings, Account.

**Parent menu:** Settings, Weekly email (a preview of the weekly email, with a "Send it to me
now" button), "Switch to" another child (only with more than one child), Link another student,
Sign out.

**Tutor, school and admin menus:** they have no Settings page, so the first row is "Account". It
opens the sign-in provider's window (name, email, password). Then their own items (admin:
Student view, Public site; tutor admins: Admin), then Sign out.

### 3. A real Settings page

The student's page is at `/dashboard/student/settings`. The parent's is at
`/dashboard/parent/settings`. The old student Account page became Settings. Old links to
`/dashboard/student/account` now land on Settings.

Student sections:

- **Test:** SAT or PSAT, and the test date.
- **Sound and motion:** Background music, Quiz sounds, Reduce motion.
- **Appearance:** says the theme follows the device, and shows today's accent color (it comes
  from the day's painting).
- **Account:** name and email, read only, and a "Change name, email or password" button.
- **Plan and billing:** the plan, what it includes, and the billing button (or "See the plans" on
  Free).
- **Have a code from your tutor?:** the code field. If the student is already in a tutor's group,
  it shows the tutor's name and a "Leave the group" button instead.

The parent's page has Sound and motion (no quiz sounds), Appearance, Account, and Plan and billing
with a link to each child's billing page.

There's no Notifications section. No notification settings exist in code for students or
parents.

"Reduce motion" now does more than hold the painting still. It also stops the shell's springs and
slides.

### 4. Music is on by default

- With no choice saved, the music plays.
- Browsers block sound until the first click or key press, so it starts then.
- The off switch is Settings, Sound and motion, Background music. The choice is saved on the
  device.
- I made it a little quieter than before (master volume 0.07 down to 0.05).

### 5. Shell fixes

- **The rail in dark mode.** During the day it turned white over a light painting, even in dark
  mode. Now it follows the device theme: dark in dark mode (with thicker glass so the light text
  stays readable), white in light mode. The same goes for the top-right fox bar and the phone logo.
  - Checked headless in dark mode at `/dashboard/student/library` with `?paint-time=day` and
    `?paint-time=night`. The rail is dark both times.
- **Falling particles.** Each painting now has its own season. The particles follow it, not the
  calendar month.
  - The winter cabin gets snow.
  - Only "Autumn forest on the lake" gets autumn leaves.
  - Spring paintings get petals. Summer paintings get slow drifting motes.
  - "The old oak in the meadow" (a summer scene) had orange leaves falling too. I removed them.

## How I checked it

- I clicked every menu link headless, for a cohort student and for a parent. Each one landed on
  the right page. "Plan and billing" scrolls to its section.
- The switches change, are saved, and survive a reload.
- A wrong tutor code shows "That code doesn't work. Check it with your tutor."
- No sideways scroll at 390, 768 or 1440 wide, light or dark.
- `npx tsc --noEmit`, ESLint on every file I touched, `npm run check:sizes`: pass.
- Tests: the touched areas pass (82 tests). New tests cover the list menu (rows, arrows, Escape)
  and the painting seasons (snow on the cabin, leaves only in autumn).
- `npm run format:check` flags three docs I didn't touch (`docs/overnight/BRIEF.md` and two in
  `docs/design/`). They were like that before.

## Not checked

- **"Change name, email or password".** The local sign-in bypass has no real sign-in session, so
  the provider's window can't open locally. The old "Profile" item had the same limit. Please
  click it once on a real sign-in.
- **Sign out.** It's the same call as before. I didn't click it on the local bypass.
- **Hearing the music.** The browser can't play sound headless. I checked that the setting is on
  by default and turns off.

## Decisions I made

- "Sound effects" (an older switch that turned itself off on every visit) is gone from Settings.
  It drove only older pages, and you listed only three switches.
- Tutor, school and admin have no Settings page yet. Their menus start with "Account" instead.
- Messages shows only for cohort students. Other students would land on an empty chat.
- The `/join` page stays, because tutors share `/join/CODE` links. Settings uses the same form.
