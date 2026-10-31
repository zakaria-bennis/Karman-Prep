# Karman Prep site and portals redesign

Date: 2026-10-19. Status: draft for founder review. The homepage layout is being
reworked (section 4.1); the visual system in section 3 stands.
Visual reference: `.impeccable/mocks/decision/g-homepage.html` (screens in the
same folder, `h-*.png`). Its colours, type and light and dark themes are approved;
its homepage layout is not (founder feedback, section 4.1).

## 1. Goal

Replace the whole Karman Prep website with one professional, warm design that
families take seriously, built on the program offer in `src/lib/marketing/offer.ts`.

**Done means** (founder, 2026-10-19):

- A finished landing page and every public subpage.
- A student portal, a parent portal and a tutor portal.
- All of them linked together, with every button, link and redirect clicked
  through in a real browser.
- Every item in `docs/design-rules.md` (design, copy, SEO) and
  `docs/launch-checklist.md` (legal, security, performance) satisfied.

**Not in scope:** the calculator (founder review in progress, do not touch),
the admin area's layout (it picks up the new colours and fonts automatically,
nothing more), the question import pipeline, new paid AI features.

## 2. Binding constraints

These are already written down; this spec does not repeat them, it obeys them.

| Source                       | What it governs                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `docs/design-rules.md`       | 28 bans, 5 "always" rules (incl. cookie policy, light and dark mode), 20 copy rules, SEO requirements |
| `docs/launch-checklist.md`   | Legal, security and performance items that gate "complete"                                            |
| `PRODUCT.md`                 | Audience (parents first), positioning, brand commitments, evidence on hand                            |
| `src/lib/marketing/offer.ts` | Every price, date, count and claim. Components never hard-code these                                  |
| `CLAUDE.md`                  | Marketing honesty, release, code gates, calculator hands-off                                          |

Facts that shape the copy:

- Question bank: the site claims **10,000+ original questions** (founder,
  2026-10-20). 2,588 were live on 2026-10-19, so the release preflight gates
  on the live count (`QUESTION_BANK.claimedMinimum`, launch checklist). The
  word "original" stays until the founder settles the bank's sources.
- Skills: students browse **39 selectable skills in 8 domains**
  (4 Reading and Writing, 4 Math), from `approved-skill-taxonomy.json`. The
  "89" in the business plan is the count of finer concept tags the import
  pipeline uses internally; marketing states 39, the number a student sees.
- Track record: shown as Karman's results with "Karman 1:1 tutoring results,
  median 16 weeks" beside it (`TRACK_RECORD.sourceLabel`).

## 2a. Offer structure and access (decided 2026-10-19)

The ecosystem is sold as separate paths, not a ladder.

| Path                                    | Price           | Unlocks                                                                                                                                                                                                                                                                  |
| --------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Visitor (no account)                    | Free            | Daily Question, daily word game, the free practice test                                                                                                                                                                                                                  |
| Free account                            | Free            | The above, plus the 35-question diagnostic, word-part cards, and a fixed free set of about 150 bank questions across all 39 skills, capped at 20 a day                                                                                                                   |
| The SAT Program (a cohort per SAT date) | $995 founding   | 18 live classes, 5 full-length tests each with a 60-minute 1:1 review, the weekly live session (test mechanics and skill workshops), Daily 10, the full bank, cohort chat with daily answers, weekly parent updates, the 50-point guarantee, video lessons when recorded |
| Private 10 / Private 20                 | $1,450 / $2,900 | Weekly 1:1 sessions, the full platform, the weekly live session, a note to parents after every session. No group classes, no guarantee                                                                                                                                   |

- **Private is a separate path** (founder), for students who want 1:1 instead
  of a group. It is not an add-on and not a higher tier of the program.
- **Admission by application** (founder, 2026-10-20). The SAT Program's call
  to action is "Apply for a seat" (`/program/apply`): a three-minute
  application, a 20-minute call with Zakaria, then the refundable $100 deposit
  holds the seat. The program page states who gets a seat and who is turned
  away. Exclusivity comes only from true facts: six seats, the application,
  the intake rules. No countdowns, no invented scarcity.
- **Free practice test:** available any time, taken in the browser, timed, scored
  automatically with a Karman predicted score and a skill breakdown. A 20-minute
  results call is optional and capped through Cal.com. The monthly live
  proctored session stays as an optional extra. Until the test runner exists,
  the free-test call to action goes to the diagnostic.
- **Bank protection:** free accounts only ever receive the free set; questions
  are served one at a time from the server, answers and explanations only after
  submission, no endpoint lists questions, a verified email is required, and
  free use is capped daily. Paid copying is forbidden in the Terms. A
  per-student invisible marker is built only if a leak is ever found.
- **Access rules are rebuilt.** The code still uses the retired tiers
  (`group`, `small_group`, `private`, `elite` in `SubscriptionTier`). They are
  replaced by `free`, `program`, `private` entitlements tied to the enrollment
  record, and `/plans` with `PRICING_TIERS` is deleted.
- **Cohorts rotate** (founder, 2026-10-20). `MARCH_PROGRAM` becomes `PROGRAM`
  (what every cohort includes) plus `COHORTS`, one entry per upcoming SAT date
  with start, test date, seats, price and enrollment close. The SAT runs about
  seven times a year (none in January, February, April or July), so "a new
  cohort before every test date", never "monthly". Past cohorts drop off
  automatically; the site never shows a date that has passed.

## 3. Visual system

Recorded from the approved mockup. Phase 0 turns this into Tailwind tokens and
a component set; the impeccable documenter writes `DESIGN.md` from the result.

### Look

Professional first, a little character. Jack Westin's layout discipline
(products separated, real product shown, generous space) without its purple,
pure white, pill buttons, shadows or checkmark bullets.

### Colour (both themes, every pair AA or better, measured)

| Token                     | Light                       | Dark                        | Use                                     |
| ------------------------- | --------------------------- | --------------------------- | --------------------------------------- |
| `bg`                      | #f5f2eb                     | #11161d                     | Page ground (never pure white or black) |
| `bg-2`                    | #ece7dc                     | #171e27                     | Alternate section ground                |
| `surface`                 | #fbf9f4                     | #19212b                     | Panels                                  |
| `line`                    | #dcd5c6                     | #2f3a48                     | Hairlines, borders                      |
| `ink` / `ink-2` / `ink-3` | #15202e / #434c5a / #5a616d | #ede8de / #c2c8d0 / #a3abb5 | Text tiers                              |
| `program`                 | #1e5b4b                     | #7cc4a5                     | The SAT Program (evergreen)             |
| `private`                 | #7b2d35                     | #e3959c                     | Private 1:1 (oxblood)                   |
| `free`                    | #85570c                     | #e2b867                     | Free tools (ochre)                      |
| `wrong`                   | #a8432f                     | #ee9a86                     | Incorrect answers only                  |
| `band`                    | #15202e                     | #0b0f14                     | Footer and dark bands                   |

Small uppercase labels appear only to name a product (The SAT Program,
Private 1:1, Free practice test) in that product's colour. No generic section
labels above headings; the heading carries the section.

Product colour is the separation device: each product's eyebrow, links,
buttons and highlights use its colour everywhere it appears, in marketing and
in the portals. No other accent colours.

Theme: follows the device, a visible "Dark mode / Light mode" toggle overrides
it, the choice is saved (`karman-theme`, wrapped in try/catch), and a blocking
inline script sets it before paint so there is no flash. Contrast is checked
by a script in CI (section 9), not by eye.

### Type

- Headlines: **Source Serif 4** (500). Body and interface: **Hanken Grotesk**.
- Both self-hosted through `next/font`. Geist, IBM Plex and Atkinson are removed.
- Scale: 62/44/26/22/19/17/15/13. One H1 per page.

### Shape, icons, motion

- Corners 4 to 6px. Hairline borders, no shadows, no gradients except the soft
  scrim behind video text.
- Icons: **Lucide is removed everywhere outside the calculator** (178 files
  import it today, using 123 different icons; 14 are calculator files and stay
  until the founder's review). Phase 0 audits every use: decorative icons are
  deleted, and the ones that carry meaning (close, menu, back, play, search,
  status marks that are not checkmarks) are redrawn as an in-house set in
  `src/components/icons/`, one 20px grid, 1.5px stroke. The phase 0 plan lists
  the final set. Text labels lead; an icon never stands alone without an
  accessible name.
- Motion: one vocabulary. Product cards rise in, staggered, once. Sections fade
  in on first view. Video plays muted and looped. Hover feedback only on
  interactive things. Everything stops under `prefers-reduced-motion`.
- Loading states are skeletons in the final layout's shape.

### Imagery

- Hero and section video: licensed Pexels clips (5536753, 4495519) now, hosted
  on Cloudflare R2 with a poster image, 1080p max, under 3.5 MB, never blocking
  the LCP. Replaced by the founder's own footage after December filming.
- Photos: Unsplash, licence checked per image. Never captioned or implied to be
  Karman students.
- The founder's real photo on Private 1:1 and About (to be supplied).
- Product screens on marketing pages are built from real components fed with
  labelled example data ("Example"), never fake screenshots.

## 4. Public site

### URL map

| URL                                          | Page                                                                        | Replaces                                            |
| -------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| `/`                                          | Home (the approved mockup)                                                  | `/`                                                 |
| `/program`                                   | The SAT Program: one evergreen page, upcoming cohorts listed from `COHORTS` | part of `/plans`                                    |
| `/program/<test-date>`                       | One cohort (e.g. `/program/2027-03-06`): dates, seats, schedule, deposit    | none                                                |
| `/private-tutoring`                          | Private 1:1                                                                 | part of `/plans`                                    |
| `/pricing`                                   | Two paths side by side                                                      | `/plans`                                            |
| `/free-practice-test`                        | The December 12 test and monthly dates                                      | none                                                |
| `/diagnostic`                                | Diagnostic intro, then the existing test                                    | `/free-diagnostic`                                  |
| `/daily`                                     | Daily Question and word game, free, no account needed                       | public part of `/learn/daily`                       |
| `/question-bank`                             | Public preview of the bank                                                  | `/questions`                                        |
| `/guarantee`                                 | The 50-point guarantee and its terms                                        | `/guarantee`                                        |
| `/about`                                     | Zakaria, the method, the mission                                            | `/about`                                            |
| `/faq`                                       | FAQ with FAQPage schema                                                     | `/faq`                                              |
| `/terms`, `/privacy`, `/cookies`, `/refunds` | Legal                                                                       | `/terms`, `/privacy`, `/refunds`; `/cookies` is new |
| `/sign-in`, `/sign-up`                       | Clerk, restyled                                                             | `/auth/sign-in`, `/auth/sign-up`                    |

Removed outright, with 301 redirects so no old link breaks: `/plans` to
`/pricing`, `/free-diagnostic` to `/diagnostic`, `/questions` to
`/question-bank`, `/auth/*` to `/sign-in` and `/sign-up`, `/coming-soon` to `/`,
`/blog` to `/` (the blog returns when there is something to publish).
`/dashboard/student/predicted-sat` is removed with its redirect.

### 4.1 Homepage rules (founder feedback, 2026-10-19)

The first mockup's homepage was rejected. The rebuilt homepage follows these:

- **Sales order:** what Karman is, why it works, proof, how it runs, what can be
  tried free, objections answered, a free first step. Money comes after belief.
- **No price above the questions section.** No prices in the product overview,
  so nothing reads as a pricing table. Cost first appears as one line in the
  FAQ, linking to `/pricing`.
- **The primary call to action is free:** the free practice test (any time).
  "Reserve a seat" and deposits live on the program and pricing pages only.
- **Hero:** a full-screen video like the first version (stock until the
  founder's generated video is ready), with only an eyebrow, the headline, one
  sentence and two buttons. No cards or panels over the video.
- **The headline sells the whole ecosystem,** not one date or one feature.
  "Raise your student's SAT score by March 6" is rejected.
- **Skill names come only from `approved-skill-taxonomy.json`,** word for word.
  No invented skills or class titles.
- Generated video must not show people presented as Karman students next to
  results.

### Page anatomy

Every product page follows the JW+ pattern: a page-level sub-nav that sticks
under the header (Overview, What you get, How it runs, Pricing, FAQ), one idea
per section, one to three points each, proof beside every claim, the objection
answered right before each call to action, and a closing call to action.

- **Home:** per section 4.1. Full-screen video hero, why scores stall, the
  method (mistake-review demo with a real skill name), the whole ecosystem,
  how the nine weeks run, who teaches with the labelled results, the two paths
  without prices, free tools, what parents see, questions (cost appears here),
  a free closing step. Footer with Terms, Privacy and Cookie Policy.
- **The SAT Program:** the page is evergreen and never names one month in its
  title. Hero with the program video, a cohort picker (every upcoming SAT date
  with its start date, seats left and enrollment close), the inclusions from
  `PROGRAM.includes`, a week-by-week schedule, the mistake-review demo,
  seat count (5 + 1 scholarship, real numbers only), guarantee, intake honesty
  note (`INTAKE_NOTE`), deposit button, FAQ.
- **Private 1:1:** founder photo, how a session runs, Private 10 and Private 20,
  strategy call button (Cal.com link, or the lead form when unset).
- **Pricing:** the two plans only (rule 17), installments, later-cohort price,
  guarantee, scholarship line, the free entry points.
- **Free practice test:** date, time, format, what the student gets, sign-up form
  (lead form, source `practice-test-2026-12-12`), Event schema.
- **Daily:** the Daily Question and the word game playable without an account,
  with a light prompt to create one. The word game's long-word board is
  redesigned to wrap or shrink tiles so nothing scrolls sideways (rule 28).
- **Question bank preview:** the real browser (section 5.2) on a sample of
  questions, with a sign-up gate after a few answers.

Every call to action resolves to something real: the Stripe deposit link or
the lead form (`ENROLL_LINKS` fallback), the Cal.com link or the lead form,
sign-up, or an on-page anchor.

## 5. Portals

### 5.1 Shared app shell

- One layout for all signed-in roles. Desktop: a left rail with the role's
  sections, the student's test date and days remaining at the top of the rail
  (real date, never a countdown gimmick). Phone: a bottom bar with the four
  most used sections and a "More" sheet.
- Header: page title, theme toggle, notifications, account menu with
  "Switch to parent / tutor view" when the user has more than one role and
  admin "View as" kept.
- Role routing: sign-in lands each role on its home. Every portal route checks
  the role on the server (`resolveEffectiveRole`, `canTutorAccessStudent`,
  parent link ownership). The UI hiding a link is never the protection.
- The existing data layer (Supabase queries, server actions, Zod schemas) is
  kept. This redesign changes pages and components, not tables, except where a
  phase plan names a migration.

### 5.2 Student portal (`/app`)

| Section        | What it shows                                                                                            | Data today                                          |
| -------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Home           | Today: Daily 10 progress, next live class, next full-length test, days to test date, last mistake review | Partly live; Daily 10 is new (5.5)                  |
| Question bank  | Khan Academy / OnePrep style browser                                                                     | Live data, new interface                            |
| Practice tests | Full-length and module tests                                                                             | Not built: "Coming, winter 2027"                    |
| Mistake log    | Every missed question with the review note and when it returns                                           | New view over `question_responses` and review notes |
| Classes        | Schedule, joining links, recordings when they exist                                                      | Live (bookings, cohorts)                            |
| Daily          | Daily Question, word game, word-part cards                                                               | Live                                                |
| Messages       | Cohort chat and questions to the tutor                                                                   | Live (existing chat and moderation)                 |
| Progress       | Karman predicted score (one number), skill mastery by domain                                             | Live (`progress`, `mastered`), redesigned           |
| Settings       | Profile, test date, notifications, theme                                                                 | Live                                                |

**Question bank design.** Two panes on desktop, stacked on phones:

- Left: Section (Reading and Writing, Math), then Domain, then Skill, each with
  a count and the student's accuracy. Filters: difficulty, status (new, missed,
  correct, flagged), and "exclude seen". Difficulty uses the bank's 1 to 7 scale
  (`quiz_questions.difficulty_level`), shown as numbers with plain bands
  (1 to 2 easier, 3 to 5 medium, 6 to 7 hardest).
- Right: the question list for the current filter (number, skill, difficulty,
  status, a short preview), paginated, with "Start practice" for the set.
- Practice view: the existing quiz engine restyled (passage, choices with
  strike-out, highlighter, calculator button that opens the existing calculator
  untouched, mark for review, timer optional). After answering: the
  explanation, "Add to my mistake log", and the next question.
- No constellation map. `ConstellationMap` and `NodeDetail` are deleted.

### 5.3 Parent portal (`/app/parent`)

| Section        | What it shows                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Overview       | One panel per linked student: this week's practice time, attendance, latest test score, next events, the weekly update |
| Student detail | Score history, skills by domain, recent mistake reviews (read-only), tutor notes meant for parents                     |
| Messages       | Messages with the tutor (existing chat, parent permissions)                                                            |
| Billing        | Plan, payments, receipts (Stripe portal)                                                                               |
| Settings       | Notifications, linked students, theme                                                                                  |

Read-only toward student work. Ownership checked on every request through
`parent_student_links`.

### 5.4 Tutor portal (`/app/tutor`)

| Section  | What it shows                                                                           |
| -------- | --------------------------------------------------------------------------------------- |
| Today    | Sessions and classes today, students who need attention (missed practice, low accuracy) |
| Students | Assigned students, each with mistake log, notes, briefing, practice sessions            |
| Cohorts  | Members, homework, notes, attendance                                                    |
| Schedule | Calendar, booking settings                                                              |
| Earnings | Earnings, payouts, payment settings                                                     |
| Settings | Profile, availability, theme                                                            |

All existing tutor routes keep working through redirects to their new homes.

### 5.5 New capabilities the portals need

These are product features, not restyles, and each gets its own plan:

1. **Daily 10 spaced review** (business plan: must ship before January 4).
   Missed questions return after about 2, 7 and 21 days.
2. **Mistake log** with review notes written by the tutor during the 1:1.
3. **Weekly parent update** (manual by the tutor in January, automated summer 2027).

Score Plan (test-date planner), Ask Karman, the video library and full-length
tests stay "coming" with a season until they exist.

## 6. Phases

Each phase gets its own implementation plan, its own branch and PR, and passes
the code gates in `CLAUDE.md` before review. Nothing deploys to karmanprep.com
without the founder's go-ahead.

| Phase               | Delivers                                                                                                                                                                                                                                                                              | Depends on |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 0. Foundation       | Entitlements rebuilt (free, program, private), tokens (light and dark), fonts, theme toggle, contrast check script, in-house icon set, core components (buttons, labels, panels, rows, form fields, skeletons), Lucide and Geist removed outside the calculator, `offer.ts` count fix | Nothing    |
| 1. Public site      | Every page in section 4, redirects, legal pages incl. Cookie Policy, SEO set (sitemap, robots, canonicals, meta, schema, OG images, `llms.txt`), lead form wired                                                                                                                      | 0          |
| 2. Question bank    | Browser, practice view restyle, public preview, constellation removal                                                                                                                                                                                                                 | 0          |
| 3. Student portal   | App shell, all student sections, mistake log view                                                                                                                                                                                                                                     | 0, 2       |
| 4. Daily 10         | Spaced review engine and its Home card                                                                                                                                                                                                                                                | 3          |
| 5. Parent portal    | All parent sections, manual weekly update                                                                                                                                                                                                                                             | 3          |
| 6. Tutor portal     | All tutor sections, mistake-review note entry                                                                                                                                                                                                                                         | 3          |
| 7. Launch checklist | Every remaining security and performance item, Lighthouse on all public pages, full click-through                                                                                                                                                                                     | 1 to 6     |

Phases 1 and 2 can run in parallel after phase 0. Phases 5 and 6 can run in
parallel after phase 3.

## 7. Content the founder supplies

- A photo of Zakaria (Private 1:1, About, footer of the program page).
- Real video after December filming (replaces stock).
- Confirmation of the `CONFIRM:` values in `offer.ts`: class days and times,
  enrollment deadline, free test start time.
- Approval of the guarantee terms wording and the Cookie Policy text.
- Google Search Console verification on his Google account.

## 8. Error and edge states

- Every list has an empty state that says what to do next ("No mistakes yet.
  Take a practice set to start your log.").
- Every data view has a skeleton while loading and a plain error with a retry.
- Unset enrollment links fall back to the lead form, never a dead button.
- Signed-out visits to portal routes go to sign-in and come back after.
- A parent with no linked student sees how linking works, not an empty page.
- Video that fails to load shows its poster image.

## 9. Verification

- Code gates from `CLAUDE.md` on every PR.
- A contrast test that reads the token file and fails CI if any text pair in
  either theme is below 4.5:1 (3:1 for large text).
- A link test over the built site (no 404s, every redirect lands).
- Playwright click-throughs per phase for every call to action and form, at
  375px and 1440px, in both themes. No horizontal overflow at 375px.
- Screenshots of every page in both themes reviewed against this spec before
  the phase PR is opened.
- The impeccable finish review on the public site, then `DESIGN.md` written
  from the built result.

## 10. Open questions

1. Portal URL: `/app/...` as proposed, or keep `/dashboard/...` and `/tutor/...`
   for familiarity? (Proposed `/app` keeps one shell and short links.)
2. Should the public `/daily` games require nothing at all, or an email after
   a few days? (Proposed: nothing; an account is offered, never forced.)
3. Analytics: cookieless (no consent banner needed) or Google Analytics
   (needs the banner)? (Proposed: cookieless.)
