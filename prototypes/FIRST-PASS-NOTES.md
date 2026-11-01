# First pass notes

Written 2026-10-31, at the start of Phase 1, before any screen was built. Branch
`claude/first-pass`, cut from `claude/site-redesign`. Everything below is a
default I chose so the work could keep going. Correct any of it at the review.

## What I understood, in five lines

1. Karman sells a ladder of six plans. Every screen reads one plan config and
   adapts to it. Only the cohort and Private 20 carry the guarantee.
2. The website is in a good direction. I polish it, make it fast on a phone,
   and put the six plans on the pricing page. You edit the words yourself.
3. Then one design system, then four portals as clickable prototypes with mock
   data, every plan, every state, phone, iPad and desktop, light and dark.
4. You lead design. Where a choice is open I build the options side by side,
   mark my pick, and you choose at the review. Nothing is final until you say.
5. Phase 2 builds what you approve into the app, replacing the old portal code.

## Where things stand before this pass

- The live site (karmanprep.com) was built from branch `claude/musing-kare-59cd6e`
  (PR #232). That code is not on `claude/site-redesign`. The redesign branch
  still has the old landing page from before PR #232. See "Conflicts" below.
- Live home page on a mid-range phone, measured with Lighthouse on
  2026-10-31: performance 36 to 45 out of 100, first paint 2.1 s, largest paint
  6.8 to 8.4 s, main thread blocked 1.8 to 2.0 s, 5.5 MB downloaded. Layout
  shift is already zero.
- The live pricing page still shows three cards (Self-paced $199, cohort
  $1,295, Private $195 an hour) and names Zakaria on the page. Both break your
  rules (17 and 40) and the prices are from before October 30.
- Inner pages on the live site ignore the device's light setting (dark for
  everyone). Rule 33 asks for the device setting first.
- The mock (`.impeccable/mocks/decision/film/`) has the October 30 prices but
  its home page still sells the cohort section by section, and its pricing page
  has no Free, Platform, Plus or School.
- The Daily 10 end screen prototype is approved and stays the reference for
  how a finished set feels. It is plain HTML and JS. I re-port it to React in
  the portals so one design system covers everything.
- 21st.dev works on the paid tier with no retrieval cap. The design system is
  built from its components, recoloured and credited.

## Open questions, each with the default I chose

### The website

1. **Which branch holds the website code?** The Next.js site that is live
   exists only on `claude/musing-kare-59cd6e`. CLAUDE.md says to work from
   `claude/site-redesign`. Default: I bring the site code (the `(site)` pages,
   components, film and photos) onto `claude/first-pass` file by file, delete
   the old landing pages it replaces, and fix it to the October 30 offer. Speed
   work happens here. Why: one branch for the review and for Phase 2, and the
   old landing page cannot stay next to the new one.
2. **The pause button on the film.** Rule 38 bans a visible play or pause
   button; the principles doc still asks for one. Default: no visible button
   on the film. Reduced motion still shows posters, and the footer keeps a
   motion control. You may want to amend rule 38 for accessibility (a film
   over 5 seconds normally gets a pause control).
3. **Light or dark first.** Default: the device's setting, dark when it states
   none, the toggle remembered. This is rule 33 as you rewrote it on
   October 30. The mock and the live inner pages did not do this yet.
4. **Campus chapter names.** Rule 47 requires Ava 1520 UC Berkeley, Mateo 1570
   Harvard, Priya 1540 Stanford with "Karman 1:1 tutoring, median 16 weeks".
   The mock dropped the labels. Default: restore one caption per clip plus the
   1:1 line. I never remove the chapters.
5. **"Five students" or "six".** The plan ladder says five; offer.ts says five
   paid seats plus one scholarship seat, "a group of up to six". Default: the
   copy says "five paid seats and one scholarship seat" and never a bare "six".
6. **Home page sections.** Your rule: home shows only what every student
   shares. Default order: Opening, Your Daily 10, The tutors, The calendar and
   tools, The guarantee, The close. Cohort content moves to the program page,
   1:1 content to the private page. The testimonials slot stays hidden until
   you fill it.
7. **The guarantee on the home page.** Default: shown in full, with one line
   saying it covers the SAT Program and Private 20 only.
8. **The pricing page layout.** Rule 17 bans three pricing tiers; there are six
   plans. Default: two program cards (cohort by SAT date, Private 10 and 20),
   the three practice plans as one band (Free, Platform, Plus), School as its
   own band with its own button, the free practice test as a line, never a
   card, and the 13 bundles as one comparison table that stacks on phones. I
   build a second layout beside it for you to compare.
9. **Private 10 and the guarantee.** offer.ts defines guarantee terms for
   Private 20 only. Default: Private 10 shows no guarantee. Confirm.
10. **Platform, Plus and School buttons before checkout exists.** Default:
    Platform and Plus go to sign-up with the plan name; School opens an email
    to hello@karmanprep.com. A school lead form comes later.
11. **The question count.** The site claims 10,000+ questions; 2,588 were
    live. The release check that should gate this does not exist yet.
    Default: the copy says "original practice questions across 39 skills"
    without a number until the gate exists.
12. **"Your Daily 10".** Default: that exact name everywhere (rule 53), not
    "The Daily 10".
13. **The students map.** It uses d3 and topojson (the one third-party
    visual). Default: kept, with the "CONFIRM" counts, until you decide.
14. **Zakaria on the About page.** Rule 40 says introduce him in full there.
    Default: one short paragraph: name, 99th percentile SAT, 1,200+ students
    tutored, the track record with its label. Company voice everywhere else.
15. **Student messages wall (section 10).** The bubbles are placeholders.
    Default: hidden until you supply real screens, like testimonials.
16. **The film on a slow phone.** Default: the opening still paints first,
    the film starts downloading after the first paint, the orbit clip loads
    only near the close, clips below the fold load when they come near, and
    phones no longer download the desktop stills. The film still plays
    continuously once it arrives. The phone encode could drop from 6.2 MB to
    about 4.3 MB; I did not re-encode anything, because you approve the look.
17. **Clerk on the marketing pages.** Every first visit goes through a
    three-step sign-in handshake before the page loads, because the live site
    runs a Clerk development instance. Default: the marketing pages stop
    loading Clerk at all (code change). Switching Clerk to a production
    instance is yours to do and removes the handshake everywhere.
18. **Caching the marketing pages at the edge.** Default: the pages become
    static and carry a one-day cache header. A Cloudflare cache rule is yours
    to add in the dashboard.
19. **Legal pages.** Terms, Privacy and Refunds still describe the old tiers,
    trials and subscriptions, and there is no Cookie Policy page (rule 32).
    Default: strip the old-tier text, state the deposit, installments and
    guarantee from offer.ts, add a Cookie Policy page, mark the rest CONFIRM
    for the lawyer.

### The app, shared

20. **The background.** Rule 49's constellation sky is now one option. I built
    four: Night sky, Ruled field (like exam paper), Contour lines (the climb),
    Quiet grain (time-of-day tint). Default pick: Contour lines, because it
    says "score going up", works with every account theme and does not
    default to stars or space. All four are in the gallery.
21. **Typeface in the app.** The website is Hanken Grotesk only; the approved
    Daily 10 end screen uses IBM Plex. Your brief says the portals borrow the
    website's type. Default: Hanken Grotesk across the app, with a type switch
    in the gallery so you can see IBM Plex on the same screens.
22. **Glass.** Rule 50: buttons and controls are liquid glass; panels are
    heavier and darker. The end screen prototype never modelled the panel
    recipe. Default: controls bend the background (a 21st.dev refraction
    button, id 12460), panels are 92 percent opaque tinted surfaces with a
    hairline edge, so glass never sits on glass. Two control recipes sit side
    by side in the gallery.
23. **Gold and the accent.** Default: tokens, the medal and coin effects are
    fixed gold in every theme; every other progression element uses the
    theme's accent; no marigold inside the app.
24. **The phone frame.** Rule 58: iPhone 17 Pro Max, 440 by 956. The end screen
    prototype used 390 by 844. Default: 440 by 956 with a Dynamic Island, and
    every screen also checked at 375.
25. **Light theme fallback.** The "Clean paper" account theme uses pure white
    (rule 3). Default: when a device prefers light and no theme is saved, the
    app uses Warm ivory; Clean paper's surface should move off pure white in
    `palettes.ts` (Phase 2).
26. **Skill levels.** Default thresholds: Learning under 35, Developing 35 to
    59, Proficient 60 to 79, Mastered 80 and up, Not started at zero, as the
    approved end screen uses. Skill names are the exact 39 approved labels.
27. **The Karman predicted score before enough data.** Default: a "no score
    yet" state that says what unlocks it (the diagnostic or a full-length
    test). Never after a Daily 10. Never a range.
28. **Score trend.** You asked for options. Default pick: a milestone ladder
    (each full-length test as a point on a vertical scale toward the target,
    the predicted score as the top mark), beside a sparkline and a plain
    table, all three in the gallery.
29. **Days to the SAT.** Default: counted to offer.ts's date (March 6, 2027),
    not the static date list, which says March 13 and is marked projected.
30. **Demo questions.** The ten questions in the end screen prototype are
    imported exam material. Default: they appear only in the local prototype,
    never in screenshots sent to you, films or marketing; captured screens use
    Karman originals from the diagnostic set.
31. **Companions.** Default: the fox wears accessories; the owl is the first
    earned companion, for 7 days in a row; bunny, cat, bear and wolf stay
    drawn but unlisted.
32. **Tap targets.** Default: every control is at least 44 by 44, including
    the answer-path dots, which keep their 34 px look inside a 44 px hit area.
33. **The tryout line before a full-length test.** Default wording: "A few
    questions in this test don't count toward your score. We don't say which."

### The student dashboard

34. **Cohort rank with five students.** You asked for cohort average and rank.
    Default: shown as asked, as "3rd of 5", on cohort plans only. Flagging
    that rank in a group of five can sting; easy to drop.
35. **Endless mode and time trials.** Built as screens with the picker as one
    swappable module. Default picker: aims at 75 percent right, weights weak
    skills by how often they appear on the SAT, brings misses back after 2, 7
    and 21 days, never repeats a question within a session or 14 days, steps
    up after three right in a row, steps down after two misses in a row.
36. **Score reports at onboarding.** Default: photo or screenshot only, never
    typed. The reader is one swappable piece. Until the Jev key exists, the
    upload waits in the tutor view where a person enters the score. The image
    is treated as private student data.

### Parent, tutor and school

37. **One parent, two students.** Default: a student switcher at the top of the
    parent portal, the first student open by default.
38. **Attendance.** Default: a flag only when a class is missed, never a
    number (rule 57).
39. **Guarantee detail for tutors.** Default: every requirement with its
    current count against the threshold (classes attended 11 of 15, tests
    taken 3 of 5, practice 92 percent, and the test date), so slippage shows
    early.
40. **Earnings and payouts.** Default: at the bottom of the tutor portal,
    read-only in the prototype.
41. **School portal.** Prototyped, not built in Phase 2. Default data model
    adds schools, seats, classes and seat keys without touching the other
    portals. Teachers reuse the tutor portal's student and class views.
42. **The default cohort tutor.** Default: none. The admin assigns one when
    the cohort is created. Nabil is removed everywhere in Phase 2.

### Assets and spending

43. **New shots.** Three are proposed in `assets/manifest.json` with prompts
    and quoted prices, status "proposed", nothing generated: a classroom of
    students on laptops (school portal), a teacher at a laptop (teacher
    view), a student photographing a score report (onboarding). Screens in
    all three are blank for a Karman screen to be placed later.
44. **Generated faces as people in the app.** Default: never beside a score or
    a result (rule 47). Students and parents in the prototypes are initials
    and the fox; the generated photos are page imagery only.
45. **The spend log.** It overstates by $0.40 from two runs that overlapped,
    and one $0.07 still is unlogged. Default: left as is; corrected total is
    about $28.27.

## Conflicts between the docs

- **design-rules.md vs site-design-principles.md.** The principles doc's
  override (white, black, marigold, Hanken Grotesk 800, one continuous film)
  wins, but its body still says Source Serif 4 headlines, a night/green
  palette, films that follow the scroll, and a visible pause control. I follow
  the override and rule 38. The body sections need a rewrite.
- **Rule 3 (never pure white) vs "the site is white".** Read as off-white
  (#f5f5f2 in the mock). The "Clean paper" account theme is the one real
  pure-white surface.
- **Rule 8 (no liquid glass) vs rule 50 (glass in the app).** Rule 50 wins
  inside the app only. The taste-skill checker bans glass on app screens, so
  it runs with that rule allowed.
- **Rule 39 (no level meters on marketing pages) vs rule 57 (parent screens
  lead with mastery).** The product screen drawn on the home page shows level
  meters. Default: the marketing drawing uses words (Mastered, This week's
  focus); meters live in the app only.
- **Rule 47 vs the October 25 handoff ("no names or scores").** Rule 47 is
  the lawyer-cleared exception and says never remove the chapters. I restore
  the captions.
- **Pause control.** Rule 38 vs the principles doc vs the handoff. Rule wins.
- **Light by default (handoff) vs rule 33 (device, then dark).** Rule 33 as
  rewritten on October 30 wins.
- **Cohort size.** Plan ladder "five students" vs offer.ts five paid plus one
  scholarship. See question 5.
- **1:1 reviews in the cohort.** Removed on October 30 in offer.ts and the
  plan ladder, but still in the live site's copy, the guarantee page's rules,
  PRODUCT.md and docs/design/scroll-film.md. PRODUCT.md and the live copy get
  fixed; scroll-film.md is superseded and should be rewritten or deleted.
- **Score ranges.** One number everywhere (October 30). Still "range" in the
  live site's copy, the diagnostic scorer, and two older design docs.
- **SAT date for the March cohort.** offer.ts says March 6, 2027 (official);
  `sat-dates-static.ts` says March 13 (projected). I use offer.ts.
- **The research note vs the brief on score entry.** The note allows typed
  scores; the brief says photo or screenshot only. The brief wins.
- **Migrations.** This branch's `supabase/migrations` does not match
  production (main was rewritten to match it on October 30). Phase 2 must
  start from main's migration history before any new table. Never
  `db:push` from this branch.
- **Branches.** See question 1.
- **PRODUCT.md** still describes the old positioning (no monthly plans, a 1:1
  session after every full-length). Updated in this pass to the October 30
  offer.
- **Fonts in the Daily 10 end screen.** IBM Plex, while the site is Hanken
  Grotesk. See question 21.
- **The end screen's phone frame** is 390 by 844; rule 58 says 440 by 956.

## What Phase 1 found (added 2026-10-31, after the site and system tracks)

- **The home film cannot play on iPhones as encoded.** Both home films
  (`day.mp4`, `day-p.mp4`) are H.264 4:4:4, which iPhone hardware decoders
  refuse. The orbit clip is fine. A same-quality re-encode to 4:2:0 is in
  progress; a lighter phone encode is yours to approve on a phone.
- **Speed.** Measured locally with the same Lighthouse settings: home page
  36 to 45 before, 100 after; largest paint 8.4 s to 1.1 s; main thread
  blocked 2.0 s to 25 ms; 59 requests to 20; nothing from Clerk on the
  page. The live site measured at the same hour scored 94, so part of the
  old gap was a busy machine; the fair pair is live-now 94 versus local 100,
  and the real phone gains come from the removed handshake and fonts.
- **"Dark when the device states no preference."** Browsers report "light"
  for a device with no setting; there is no "no preference" signal any more.
  So such devices get light. Say if you want dark forced instead by ignoring
  the device.
- **Mobbin** is on a paid plan this account does not have. The builders use
  the taste-skill's studied app screens and 21st.dev for references.
- **Tooling, not product.** `npm run lint` dies on scratch files under
  `tmp/` (fix: ignore `tmp/**`; in progress). `npm test` shows 20 failures
  under Node 25 only, from its built-in localStorage; the suite is green with
  `NODE_OPTIONS=--no-experimental-webstorage` or on Node 22, which CI uses.
- **The pricing page** has two working layouts (`pricing.html?layout=a`
  and `?layout=b`); A is my pick.
- **The site code and the branch.** The live site's code is now on
  `claude/first-pass`, reconciled to the October 30 offer, with the app
  routes moved under `src/app/(app)/` (URLs unchanged) so the marketing
  pages carry no Clerk, cookies or app CSS. Deploying this branch is still
  your call, never from `main`.
- **The 21st.dev key** appeared once inside a helper agent's own local log
  while it pulled component bundles. The log was scrubbed; nothing is in
  git. Rotating it is yours to decide.

## Things that need you, not me

- Approve or change any default above.
- Move Clerk to a production instance (removes the sign-in handshake on
  every first visit).
- Add the Cloudflare cache rule for the marketing pages.
- Decide the five-or-six wording, the Private 10 guarantee, and whether rank
  shows in a cohort of five.
- Approve the three proposed shots before any money is spent.
- The lawyer review of the guarantee terms, still pending.

## What this pass did not do

- Deploy anything, merge anything, push anything, or write to the database.
- Generate any image or video, or spend any credit.
- Touch the calculator, the question import tools or live questions.
- Build the school portal into the app (prototype only, by your brief).
