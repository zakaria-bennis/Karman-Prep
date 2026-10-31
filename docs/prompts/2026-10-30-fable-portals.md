# Fable 5.1 brief: the website and the portals

Draft 2, 2026-10-30. Everything below the line is the prompt. The business
decisions are settled (plans, prices, cohort format, school scope), and the
environment checklist at the bottom is done. Start the Fable session on the
`claude/site-redesign` branch, not `main`: `main` doesn't yet have the
current design rules, design principles, launch checklist or offer.

---

ultracode

You are polishing Karman Prep's public website, then designing and building
its signed-in side: the student dashboard, the parent portal, the tutor
portal and a new school portal. Work like a senior product designer and staff
engineer, but remember whose product this is.

## Who you work for

Karman is a pre-launch SAT prep company run by one founder, Zakaria Bennis.
He isn't technical and he leads design on everything: every page, every
portal, every visual decision. You propose and he decides. Show him ideas as
working screens, not paragraphs. Write to him in plain language, short
sentences, no jargon. He often dictates by voice, so if a number or phrase in
his reply reads oddly, ask before you build on it.

The feeling you're designing for:

- **Parent on the website:** "This company is serious, I understand exactly
  what I'd get, and I know the next step." The parent is the buyer.
- **Student:** "I'm getting better, and I know exactly what to do next." After
  any finished set, they should feel proud.
- **Parent:** "I can see the work and the progress, and I trust where my money
  goes." Calm and clear, never a wall of numbers.
- **Tutor:** "Everything I need before a session, in one place, in under a
  minute."
- **School:** "Seats, classes and progress for the whole school, without
  calling anyone."

## The business you're designing for

Karman sells a ladder of plans. Every portal must adapt to the plan a student
is on: what they can open, what's locked, and what an upgrade would add. Treat
plans as data. One config file defines each plan and what it includes, and
screens read from it. Never hard-code a plan name in a component.

The ladder, with prices and the 13 feature bundles each plan includes, is in
`docs/business/plan-ladder-2026-10-30.md`. Build the plan config from that
table. In short, from free to most premium:

- **Free:** 100 questions, the quiz engine, Challenge question and Wordline,
  progress and rewards. No calculator.
- **Platform ($29 a month):** 500 questions. Adds the calculator, Your Daily
  10, full-length tests, planning tools and a parent account.
- **Plus ($49 a month):** all questions, plus live workshops and office hours.
- **Cohort:** a small live group ending on an SAT date, with live classes and
  the guarantee.
- **Private 1:1:** self-booked sessions with the guarantee.
- **School ($10 per student a year):** sold cheaply so the product spreads,
  with 2,000 questions and the Platform features. Schools get classes,
  seat keys, an optional school admin, a teacher view and parent accounts.
  There's no guarantee.

Platform and Plus are plain monthly subscriptions. The guarantee belongs only
to Cohort and Private, and its terms differ by product, so screens read them
from `src/lib/marketing/offer.ts` and never restate them. Everyone else never
sees guarantee progress.

Each bundle is one feature to the student. Don't split it into separate
unlockable parts. The founder wants few, clear choices.

## Read these first, and only these

1. `CLAUDE.md`: repo rules, gates, branches, deploy and database rules.
2. `docs/design-rules.md`: the founder's rules. Rules 49 to 58 are the app
   rules and win inside the portals. Copy rules apply to every word.
3. `docs/design/site-design-principles.md`, sections 1 to 13: motion,
   interaction, Laws of UX and the "build for good UX" checks.
4. `docs/business-plan.md`: who buys, who uses it, the offer, honesty rules.
   Then `docs/business/plan-ladder-2026-10-30.md`: each plan's price and
   features, the source for the plan config.
5. `src/lib/marketing/offer.ts`: dates, guarantee terms and site claims. It matches
   the plan ladder. Don't edit it without the founder.
6. `docs/brand.md`: the Voice section only.
7. The Daily 10 end screen prototype, the reference for how a finished set
   should feel: `prototypes/daily10-end/` (its README lists what it shows and
   which stats belong on the dashboard instead).

Other design and brand docs in the repo predate these and don't apply.

## How design works on this project

**The founder leads.** You may propose tweaks, ideas and alternatives, and
you should. But nothing visual is final until he approves it on a screen. When
a decision is genuinely open, build two or three versions side by side and let
him pick. Don't ask him to judge from a description.

**21st.dev is the component source.** The founder pays for 21st.dev so that
these portals are built from its components, not generic ones.

- The 21st.dev MCP is configured for this project. If its tools don't load,
  reach it with JSON-RPC over curl using the key in `~/.claude.json`. Never
  print, log or commit the key.
- The plan allows unlimited component retrievals, but AI generation is off.
  So search, fetch the code, and port it yourself.
- For every meaningful surface (numbers that count up, celebrations and
  confetti, progress, cards, sheets, segmented controls, lists, empty states,
  charts, navigation), search 21st.dev first and pick the strongest fit.
- Recolour every component with Karman's tokens. Swap any Lucide icon for a
  custom Karman icon (rule 52).
- Credit the component id in a comment, and keep a list in
  `prototypes/portals/21st-components.md`.

The founder has said the 21st.dev layer must be obvious. If a screen looks
like any other dashboard, it isn't done.

**The app look (rules 49 to 58):**

- **The background world is open (founder, 2026-10-30).** Rule 49's
  constellation sky is one option, not a requirement. Don't default to stars,
  night or space.
  - Propose three or four distinct background directions, each with a reason
    it fits studying for the SAT. Build each as a working screen so the founder
    can pick.
  - Whatever wins stays subtle, never competes with content, works with every
    account theme, and stops moving under reduced motion.
- Raised liquid-glass buttons and controls. Panels are heavier and darker than
  buttons, so glass never sits on glass.
- Custom-drawn icons and a slim icon rail on desktop.
- Each visitor sees their device's light or dark setting, with dark when there's
  no preference (rule 33). A remembered toggle overrides it.
- AA contrast, checked by calculation, in both modes.
- The account themes in `src/lib/themes/palettes.ts` each carry their own
  accent. No marigold in the student progression UI. Tokens are gold in every
  theme.

**Also non-negotiable:**

- Phone, iPad and desktop for every screen. Phone is drawn at the iPhone 17
  Pro Max size (440 x 956) and must also work at 375 wide, with no sideways
  scroll anywhere.
- Skeleton loaders for sections. A small orb inside a button only after 400 ms.
- One highlighted call to action per screen.
- No row subtitles unless they carry a date, a due time or a state.
- Every due item shows its due date.
- Product names: "Your Daily 10", "Challenge question", "Full-length review
  session", "Wordline".
- The March cohort's tutor is David, named on screen.
- No em dashes, no emoji, no fake numbers presented as real, no testimonials.
- The Karman predicted score is one number, never a range, and never shown
  after a Daily 10 (see the student dashboard).
- Every asset is custom: icons, drawings, loaders, illustrations. Where a
  drawing is needed, use the hairline-create skill.
- Use the apple-design and impeccable skills for direction and review.

## The website

The current website design is in a decent direction. Take it and polish it.
You're free to make whatever refinements you judge will ship the best
product: layout, type, motion, copy flow, page structure. Show the founder the
before and after for anything significant.

- **Where it lives.** The reference build is the mock in
  `.impeccable/mocks/decision/film/`. Its copy lives in `copy.js`, which the
  founder edits himself (see `EDIT-COPY.md`).
- **The live site.** The site at karmanprep.com came from PR #232
  ("Marketing site rebuild", branch `claude/musing-kare-59cd6e`). That PR
  ported an earlier version of this mock into the Next.js app. Check it
  before building, and extend that port rather than starting a second one.
- **The look today.** Light mode is off-white with black and marigold. Dark
  mode is the default when a visitor's device doesn't say. A continuous film
  plays behind the page and is never driven by scrolling. The pages are home, the March program, private tutoring, pricing, the free
  practice test, the guarantee, about and FAQ.
- **Speed is part of the polish.** On a mid-range phone over slow 4G, the home
  page takes 11 to 13 seconds to load today (measured 2026-10-30). Slow pages
  make Karman look less trustworthy. Get Core Web Vitals into the green on
  mobile. The film and heavy motion must never hold up the first view.
- **The website follows the same rules as the app.** Copy rules, SEO
  requirements and `docs/launch-checklist.md` apply as well.
- **Prices and claims come from `src/lib/marketing/offer.ts`.** The pricing
  page must show the new plan ladder.

Polish the website first (Phase 1 and 2 below apply to it too), so the
portals can borrow its finished type, colour and motion.

## What each portal must do

### Student dashboard

This is home for every plan. Lead with the next thing to do: Your Daily 10,
the next due item, the next class or review session.

It also receives the stats the Daily 10 end screen deliberately leaves out:

- pace
- hardest question answered right
- slowest question
- changed answers
- set difficulty
- cohort average and rank (cohort plans only)
- misses reviewed
- skills by level
- skills covered
- personal bests
- days to the SAT

A score trend is wanted but needs its own design round, so propose options.

**The Karman predicted score.** It's one number, not a range, calculated from
everything the student has done. It is never shown after a Daily 10. The
research behind it is in `docs/research/2026-10-bluebook-difficulty-and-adaptivity.md`
(PR #233); ignore its advice to show ranges, which the founder rejected.
Collect as much answer data as possible, because the score gets more accurate
with it. Every answer saves:

- the question version
- the mode
- its position
- whether it was a first try
- the time spent
- whether help, the calculator or the explanation was used
- the device

The full list is in Part 6 of that research.

**Onboarding asks for real SAT and PSAT scores.** Take the section scores and
test dates, plus an optional photo of the score report that is read
automatically. `DECIDE:` the founder said the photo goes "through Jev"; confirm
what that is.

**Endless mode.** A student starts a session and keeps answering. Each next
question is chosen from:

- the last answer
- the session so far
- the student's whole history
- their weak skills

It aims for about 75% success, weights skills by how often they appear on the
SAT, brings missed questions back on a spaced schedule, and never repeats a
question too soon. Build the picker as one swappable module, so better
difficulty data can replace its first version later. The design is in Part 4.3
of the research.

**Time trials.** The same picker with a clock, at the real test's pace: about
71 seconds per Reading and Writing question and 95 per Math question.

**Full-length tests** follow Bluebook's two-module design. Module 1 decides
whether module 2 is harder or easier. Full-length tests may include a few
unscored tryout questions, and students are not told which ones.

**A demo 1:1 student.** By the time the dashboard is done, the founder must be
able to sign in as a demo Private student and click through everything a real
one experiences: onboarding, the diagnostic, Your Daily 10, practice by skill,
time trials, endless mode, a full-length test and its review, booking a
session, and the parent's view. Use real questions from the bank in the dev
environment, never live student data.

Skill levels are four bars: Learning, Developing, Proficient, Mastered. "Not
started" means four empty bars.

The rewards carry over from the end screen:

- gold tokens and the token balance
- mystery boxes (one at a time, opened or saved for later)
- the fox and its accessories (wear it or keep for later, never auto-equipped)
- companions earned from achievements, such as the owl
- streaks shown as days in a row

What's locked on the student's plan shows plainly what it would add, with one
upgrade action, never nagging. Cohort students see their class schedule,
homework, full-length tests, cohort chat and guarantee status. Private
students see their 1:1 sessions, can book the next one themselves, and see
their guarantee status.

### Parent portal

The parent is the buyer. Lead with skill mastery and questions answered (rule
57). Attendance appears only as a flag when a class is missed.

It also holds:

- the weekly progress update
- upcoming sessions and test dates
- the plan, billing and upgrade path
- guarantee status, for cohort and private plans only

One parent may have more than one student.

### Tutor portal

This is for Zakaria and David now, and hired tutors from 2028. It has two
hearts:

- **For Private students: the 1:1 session.** Before each one, a briefing shows
  every mistake on the student's latest full-length, grouped by skill, with
  what to cover.
- **For a cohort: the next class.** It shows the skills most of the group
  missed, and each student's level on them, so class time goes to shared
  weaknesses. Cohorts are grouped by test date, then split at a diagnostic
  score of 1250 when there are enough students.

It also holds:

- my students and cohorts
- homework and assignments
- notes
- the post-session update to parents
- the schedule
- guarantee eligibility in full detail, so they can catch slippage early
- earnings and payouts, lower down

### School portal (new)

This has two roles:

- **School admin:** buys and assigns seats, creates classes, issues and
  revokes keys, adds teachers, and sees usage across the school.
- **Teacher:** sees their classes. Reuse the tutor portal's student and class
  views rather than building a second set.

**Scope:** prototype the school portal in Phase 1, but don't build it in
Phase 2. Schools buy on a July budget, and up to 10 founding schools pilot
free from January to June 2027, so it gets built after the first three
portals ship. Design the data model so school seats, classes and keys can be
added later without reworking the others.

## What the code already has

The prototypes come first, but design with the real data in mind. Facts from
a survey on 2026-10-30:

- **Routes.** The student pages are in `src/app/dashboard/student/`, parent in
  `src/app/dashboard/parent/`, tutor in `src/app/tutor/`. There's no bare
  `/dashboard` route.
- **Roles.** Roles come from `users.role` (student, tutor, admin, parent) via
  `src/lib/supabase/queries/admin.ts`. Admin "view as" uses cookies, and the
  same gate is copied into every page. A central gate is welcome.
- **Missing data.** There are no streaks, no Daily 10 or spaced review, no
  full-length tests, no tokens for students and no skeleton loaders. These
  need designs and data models.
- **Skills.** Mastery (`learn_node_status`) is keyed to legacy curriculum
  nodes. The approved taxonomy is 39 selectable skills (20 Reading and
  Writing, 19 Math) in `src/data/curriculum/approved-skill-taxonomy.json`.
  Difficulty runs 1 to 7.
- **Old tiers.** `group`, `small_group`, `private` and `elite` are spread
  across about 20 files. Replace them with the new plan config, and delete the
  old tiers everywhere in the same change.
- **Nabil.** `src/lib/onboarding/placement.ts` still defaults the cohort tutor
  to Nabil. Remove it.
- **Stack.** Next.js 16, React 19, Tailwind 3.4, framer-motion, and 12 account
  themes. `lucide-react` is installed but banned in the UI.

## How to run this

### Phase 0: questions (stop here first)

Read the files above. Then send the founder one short message with:

- your understanding in five lines
- any question the docs leave open
- any conflict you found between docs

Give each question closed options and your recommendation. Wait for his
answers.

### Phase 1: prototypes (stop again at the end)

Build one shared design system first: tokens, the sky, glass controls, type,
icons, and ported 21st.dev components. Every portal uses it.

Then build clickable prototypes of every screen, for every plan and role,
with realistic mock data:

- **Location:** under `prototypes/portals/`. Never imported by `src/`, never
  deployed, and kept out of the app's build, lint and type check.
- **Stack:** React and Tailwind, so approved screens move into the app with
  little rework.
- **States:** every screen needs empty, loading, error, locked-by-plan,
  first-day and long-time-user states, in light and dark, on phone, iPad and
  desktop.
- **Gallery:** a start page lets the founder switch portal, role, plan,
  device, theme and state.

Check your own work before he sees it:

- Screenshot every screen at all three sizes, in both modes.
- Run the design rules as a checklist.
- Calculate the contrast.
- Click every control.

Then stop and send him the gallery link and a short tour. Iterate until he
approves each portal.

### Phase 2: build the approved portals

Work on a `claude/portals-*` branch cut from `claude/site-redesign`. That's where the current design rules, offer and these docs live; `main` is behind it until the site redesign merges. Move the approved design into
`src/`, replacing the old portal code rather than adding beside it.

New tables go in migrations. Every server action validates with Zod. Row
Level Security covers every new table.

Before handing over, run every gate in `CLAUDE.md`, plus Playwright on phone,
iPad and desktop, in light and dark.

### Phase 3: the handover

Send him a plain-language summary covering:

- what changed
- what was checked, and how
- what wasn't checked
- what he needs to decide or click through himself

## Working with many agents

Ultracode is on, so split the work, but protect consistency.

- One agent owns the design system, and no portal starts until it exists.
- Portals can then run in parallel, one agent each.
- A separate reviewer agent checks every screen against `docs/design-rules.md`
  and the 21st.dev requirement, and returns fixes. It does not return praise.
- Two agents never edit the same files.
- The founder is cost-conscious. Spend agents where they buy quality, not to
  look busy.

## Never

- Deploy, or run `cf:deploy`.
- Write to the production database, or write live questions.
- Merge to `main` without the founder's go-ahead. Merging applies migrations
  to production.
- Touch the calculator, or load anything from Desmos.
- Write in `~/Library/CloudStorage/Box-Box`. It's read-only.
- Spend Higgsfield credits.
- Print a secret.
- Show a real student's data in a prototype.
- Claim a feature works without having clicked it.

---

## Environment checklist (done 2026-10-30)

These were cleaned up so Fable reads one consistent picture:

1. `docs/business-plan.md` was rewritten around the plan ladder.
2. Stale auto-memory notes were retired: old tiers, the old design language
   and the May focus. The overview was rewritten, and a plan-ladder note was
   added.
3. The Daily 10 end screen prototype was copied to `prototypes/daily10-end/`,
   with a README. The folder is excluded from lint and formatting.
4. `GEMINI.md`, `replit.md` and `dashboard-qa-report.md` were deleted.
5. `CLAUDE.md` now describes the plan ladder and the portals workstream.

6. `src/lib/marketing/offer.ts` was updated to the ladder: Private prices
   and booking, the cohort without 1:1 reviews, and the new plans.
