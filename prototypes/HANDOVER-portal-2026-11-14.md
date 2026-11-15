# Portal rebuild: where it stands (2026-11-14)

Read this before any work on the student or parent portal. The founder's answers, in his words and in
order, are in the memory note `project_student_portal_spec.md`; this page is the short version plus the
state of the work.

## The decision

The existing student portal was made in one night and the founder calls it "a stupidly early alpha". Its
look, background and layout are to be ignored. The portal is rebuilt from scratch, **one thing at a time,
each approved before the next**: the background, then the sidebar, then each screen's layout. No sets of
options: one blank canvas, built up slowly. The student portal comes first, then the parent portal (he
wants to be asked about every parent feature before it is designed).

He rejected, on 2026-11-14: three welcome-after-payment mockups (`/dev/welcome`) and three Library layouts
(`/dev/portal`). Both lacked the coherence of Canvas, Khan Academy and Duolingo, and the painted backdrop
was "absolutely ass". Do not revive either. Their code is deleted from the portal branch, and their draft
PR 297 is closed unmerged.

## Step 1, the background: in progress, direction approved

Branch `claude/portal-world`, draft PR 302. It also carries the two fixes of PR 296 (below), because it was
cut from that branch; if PR 296 merges first, nothing changes here. Blank page: `/dev/world` (dev only).

The portal's background is the live, lit landscape of the home page (`src/lib/flight/`), not the painted
one in `src/lib/painting/`. On top of the home page's engine this branch adds, all in
`src/lib/flight/shader.ts` and switched on only where a page asks:

- **A generated world** (`uWorld`, engine option `world`): the land is made up as the camera flies, with no
  end: sea, lakes, valleys, mountain height and climate vary along the route (`landAt`). The home page and
  subpages still fly their fixed route.
- **Villages** (`townAt`, `house`, `built`): houses with pitched roofs in the heightfield, lit windows at night.
- **The visitor's sky** (`uHour`, `uWx`, engine option `sky`): the sun follows a clock; cloud, rain, mist
  and snow change the light and the air.
- Flower fields, boats with lanterns, and drifting motes (pollen by day, fireflies by night).

`/dev/world` switches: `?world=1` (fly the generated world), `?z=27` (start there), `?p=0.5` (hold a spot),
`?hour=17.7`, `?wx=cloudy|rain|mist|snow`, `?night=1`, `?live=1` (the visitor's own clock).

What he said about it: "okay for right now"; the valley alone is not enough; he wants scenery that flows
from one kind to the next, generated not preset, with wildlife and particle effects, like a Minecraft
creative-mode flyover (biomes, villages, oceans, life, observatories), in the Ghibli style with detailed
strokes, motion and lighting. He has not yet given a verdict on the generated world.

Known faults and gaps:

- Only stills were checked (six by day). Not watched in motion, not seen at night in the generated world,
  not tried on a phone, and its speed is unmeasured. The houses and the generated land cost extra work on
  every picture; measure before it goes behind a real page.
- The houses are specks from flying height; the boats are specks; trees read as pebbles in green valleys.
- No observatory yet: four candidate hills are in the shader (`domeAt`) and none showed in view. Place one
  by hand and delete the candidates.
- A stray sliver floats near one high peak. Not known whether it predates this branch.
- White patches in one meadow, probably snow lying too low.
- Not started: animals on land, beaches with detail, caves, chimney smoke, the hand-painted stroke quality.
- Real weather is not wired. Cloudflare gives the server the visitor's rough city, so no cookie or prompt is
  needed, but a weather source must be chosen (terms and price unchecked; one popular free source is
  non-commercial only) and the privacy policy needs a line that his lawyer sees. He called it an "essential
  cookie"; that is a legal label and was not given.

## What comes next, in order

1. His verdict on the generated world, then iterate the background until he approves it.
2. The sidebar (phone: a bar of five at the bottom; desktop: a labelled menu on the left).
3. Each screen's layout, one at a time.
4. The 16 characters, their unlock challenges and unlock animations, in the fox's style. The owl must be
   redrawn: he says it looks like a llama.
5. The welcome after payment (a new buyer lands in the portal with nothing special today).
6. The parent portal, after asking him about every feature.

## Rules for the build, from his answers

- **Menu by plan, five at most.** Free, Practice, Pro: Library, Practice, Progress, Rewards, More. Cohort:
  Homework, Library, Class, Progress, More. Private 10 and 20: Homework, Library, Schedule, Progress, More.
  More holds settings, account and upgrade (and Rewards and Chat on the taught plans).
- **Landing.** Practice and Pro land on the Library with a small progress overview. Cohort and Private land
  on Homework.
- **Mastery levels:** Not Started, Learning, Understanding, Proficient. A skill drops when missed later.
  Skipping the Daily 10 drops 1 to 3 skills at most. The code still has the old five names.
- **Library:** two sections, four domains each, then skills. Mastery shows as squares, already designed.
- **Homework (from Canvas): the to-do list.** Grouped by Reading and Writing, Math and full-length exams.
  Done work leaves; overdue stays about a week marked Missing, then closes. No grades.
- **Say "full-length exams".** The diagnostic is dropped; cohort students take the "cohort placement test".
- **Locks.** Only Free shows locked items. A locked thing says "Upgrade" when pressed.
- **Coherence, measured from Khan Academy, Duolingo and Canvas:** one font and two weights; three or four
  text sizes carry over 90% of the text; one corner radius for controls and at most one more for panels;
  one height for every button and field; one action colour on two or three greys, with red, green and gold
  only for states; spacing in steps of 8. The rejected mockups broke most of these.

## Loose ends from the same day (not portal work)

- **PR 296 is open and not merged:** the fix for the return address after paying behind a proxy, and the
  sign-in pills reading "Continue with Google, Apple, Microsoft" in that order. It needs his go-ahead.
- **Live today:** our own payment page (Link first), pay first then account, the home page no longer
  redirecting signed-in visitors, and the header's profile menu.
- **Stripe:** the site still runs on test keys. The live account has the seven prices and both site
  domains, but no webhook, and its keys are not in the site. See `docs/launch-checklist.md`.
- **Test copy:** `/Users/zakariabennis/Karman-Prep-wt/forms-walk` on port 3400 (launch entry `forms-walk`),
  local database, signed in as the stand-in student `dev_seed_student_free`
  (`DEV_IMPERSONATE_CLERK_ID` in its `.env.local`). It is not a branch: files are copied into it by hand.
- **A temporary Cloudflare tunnel** to the test copy may still be running, and its address is on Stripe's
  payment method domain list (live and test). Both can go.
