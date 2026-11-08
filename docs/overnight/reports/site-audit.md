# Site audit report, 8 November 2026

Session: site-audit. Branch: `claude/overnight-site-audit-e5cb0e` (cut from
`claude/overnight-ship`, which I merged in at 04:43 to work on current code).
Nothing was deployed or pushed. The live site was only read.

The list of changes, with before and after pictures, is in
`docs/overnight/reports/site-audit/README.md`.

## What happened tonight

- Six checkers looked at the live site and the code, each from one angle:
  links and buttons, layout, forms, sign-in and access, headers and search,
  and speed. They found 59 problems. Most are small.
- A second checker was started for every list to try to disprove each
  problem. The Claude app froze from about 04:45 to 07:55 and stopped them
  before they wrote anything. So for every problem I fixed, I checked it
  again myself (in the code, on the live site, or with a test). Problems I
  could not re-check are listed below as not fixed.
- The freeze also cost about three hours, so some fixes are listed for later.

## The founder's decisions of 8 November morning (done)

- **Eyebrow labels:** removed from every site page, with their style and copy.
- **Cookie Policy:** a new page at /cookies, linked from the footer's Legal
  column, in the sitemap. It lists what the site really keeps: Clerk's
  sign-in cookies, the session-recording consent cookie, and browser-storage
  notes (light or dark choice, the film's pause, account display settings).
  No advertising or analytics cookies.
- **Study tools on the home page:** one column on phones, two by two below
  1200 px, a row of four on wide screens. Nothing scrolls sideways.
- **Free practice test form:** it now says we send occasional emails (with
  unsubscribe), and the confirmation says to join on test day from the Karman
  account, where the Join button opens Zoom.
- **Theme follows the device**, on the site and in the portals, until a
  visitor picks one with the toggle (design rule 33 as written). The portals
  no longer save their default as if it were a choice.
- **Photos:** both versions are kept. One sheet with every original beside its
  device version: `docs/overnight/reports/site-audit/photos-before-after.jpg`.
- **A type error I had introduced** in `src/middleware.ts` (caught by the full
  type check after the first merge) is fixed.

## What is done

**The pictures (the founder's main ask)**

- None of the 11 people photos showed a screen. Every phone and laptop faces
  the person using it, so there was nothing to replace in place.
- Each photo now has a copy with one of Karman's own code-drawn devices in
  front: the site's Cosmic Orange iPhone for phone scenes, a Space Black
  MacBook Pro for laptop scenes. Each shows a real Karman screen (the Daily 10,
  the parent view, the live class on Zoom, the one-on-one review), captured
  from the site, with perspective, rounded corners, a light glare and a shadow.
- The two moving clips (daily, call) show the same device.
- No image generation and no spend.
- The originals stay beside the copies. Going back is one line.
- The home film shows no screens either (phones face the people, and the
  phones in the box are switched off), so it was left as it is.

**Bugs fixed**

- The /program application form was cut off on phones: the date field and
  the send button could not be reached. Fixed.
- On /program at wide sizes, the steps scrolled over their own heading. Fixed.
- "+285" on /private-tutoring was too faint in light mode. Fixed.
- Mistyped addresses showed a bare "404" page. There is now a 404 page in the
  site's look, with links. A failing page now shows a site error page with
  "Try again".
- The phone menu let the Tab key wander behind it. Fixed.
- The study-tools arrows did nothing on wide screens. Fixed.
- Links on the legal pages forgot a visitor's light or dark choice. Fixed.
- "The guarantee, with worked examples" reloaded the same page. It now jumps
  to the examples.
- Parents who signed up never got an account, so they could not finish the
  questionnaire or take the diagnostic after paying. Fixed.
- With email switched off, every lead form failed. They now save the lead and
  log that no email went out.
- The lead form could be crashed with a made-up form name, and names could
  carry hidden characters into the admin email. Fixed.
- The email sign-up accepted a 10,000-character address. It now stops at 254.
- One admin email (a failed class placement) put the student's name into its
  HTML as typed, so a name could carry a link. It is now escaped.
- The consent banner could not save a signed-out visitor's choice. Fixed.
- /coming-soon still said "not ready" after launch. It now sends people home.
- www.karmanprep.com served a second copy of the site. It now redirects to
  karmanprep.com.

**Safety and speed**

- Search engines and link previews: the live site uses Clerk's development
  account, which bounced visitors without cookies (Google's crawler, Slack and
  iMessage previews) through endless redirects. The marketing pages now skip
  Clerk after launch, so they load directly.
- Security headers are on every page and API answer; the
  `x-powered-by: Next.js` header is gone.
- Built files are cached for a year; photos and films for a day. Before,
  every visit downloaded everything again.
- The home films used a format iPhones can't play. They are now standard
  H.264 with the same frames, 20 MB instead of 31 MB.
- The opening headline and buttons waited about 8 seconds for scripts on a
  slow phone. They now rise at first paint with the same motion.
- Photo clips no longer download with the page; they load near the screen.

## What is not done

- Clerk's production keys (see "For the founder").
- HTTP is not redirected to HTTPS. That is one Cloudflare setting (below).
- No Content-Security-Policy yet. It needs a trial run with Clerk and Stripe.
- Every marketing page still loads Clerk's sign-in code (about 350 KB) and 12
  font files. Both come from the shared root layout, which other sessions own.
- The video server ignores partial-download requests; the films would be
  better served from R2.
- No rate limit on the forms. A Cloudflare rate-limiting rule is the fix.
- The phone's floating button (the dock) can sit over text being read
  (design rule 34). Not changed.
- Two header links over the opening film are a little faint at 1440 and 1920.
- Several API routes send raw error details to the browser; the onboarding
  questionnaire doesn't check the parent email's shape or answer lengths; the
  hidden anti-bot field is named "company", which autofill might fill.
- The onboarding page still carries on to checkout if the account sync fails.
  That file belongs to the pricing work tonight, so I left it.
- Parents now get an account at sign-up, still as a student account. The
  founder decided parents get their own account type and land in the parent
  portal; that is the parent-school work, not built here.
- Some secret checks compare with `!==` instead of a timing-safe compare;
  the Fireflies webhook takes its secret in the address. Low risk.
- Some portal server actions don't check their inputs with Zod. Those files
  are being rewritten by the portal sessions tonight.
- No apple-touch-icon or web manifest (iPhones ask for one on every visit).
- Browser-side Sentry never loads (Next 16 needs `instrumentation-client.ts`).
- The painted home mock is another session's job.

## How I checked

- Live site: page loads and GET requests only, in headless browsers. Nothing
  was submitted.
- Every photo and clip: zoomed in at full size on the frame edges, screen
  text, glare and shadow, and on the crops the site uses.
- Unit tests: the middleware (6, including a new one for the launched site),
  the lead forms and the sign-in routes (19), the email sign-up rules (9).
  All pass.
- Lint and Prettier on every file I changed: clean. File sizes: OK.
- Local server (port 3104, local database), headless Chromium:
  - /pricing loads with no Clerk redirect and no Clerk headers.
  - /program at 390 px: the form card is 553 px tall with nothing hidden; the
    date field is there; a tap on "Send the application" lands on the button.
  - Home at 390 px with scripts turned off: the headline words and both
    buttons are fully shown.
  - A missing public address (/blog/an-old-post) answers 404 with the site's
    look, six links, noindex, and no stray floating theme button.
  - After this morning's changes: on a light-mode phone the site opens light,
    on a dark-mode phone dark; the study tools are one column at 390 px and two
    at 768 px, with nothing wider than the screen; /cookies answers 200 and the
    footer links to it; the free-test form says "occasional emails" and no
    longer says "Nothing else"; no eyebrow label is left on the home page,
    /faq, /pricing, /program or /free-practice-test.
- Full type check (after merging the shared branch at 09:39): clean except
  four errors in the scholarship work's files, which import `pdf-lib` and
  `pdf-parse`. Both are in package.json but not installed in this worktree;
  `npm ci` on the merged branch fixes them. My own earlier type error in the
  middleware is fixed.
- Theme tests (86), middleware and calculator route tests (12), copy, lead
  form, sign-in and email tests: all pass. Lint, Prettier and file sizes are
  clean on every file changed today.
- Not run: `npm run cf:build` (the brief allows one, at the end, and the
  machine was at load 20 or more all morning).
- I did not use the app's built-in browser after the freeze.

## Decisions I made

1. No photo showed a screen, so I added our own code-drawn devices in front
   instead of drawing screens onto the backs of devices. The originals stay.
2. The parent phone hides its two score boxes, because design rule 47 says no
   screen held by a person shows a score.
3. Signed-out visitors who type an unknown address still go to sign-in rather
   than the 404 page. New portals are landing tonight, and this keeps them
   private by default. Signed-in visitors see the new 404 page.
4. HSTS covers karmanprep.com only, not every subdomain, so mail links and
   image hosts are never forced to HTTPS by surprise.
5. Marketing pages skip Clerk only once the site is launched. Before launch
   the maintenance gate still needs Clerk.
6. The films were re-encoded at a quality where a full-size frame shows no
   difference.
7. The Cookie Policy describes what the code really stores, not the first
   draft's "no cookies" (the draft was written for a mock page without
   sign-in).
8. The study tools make a 2 x 2 grid on tablets as well as stacking on phones,
   because a row of four only fits from 1200 px.
9. A device with no light or dark preference gets dark, as rule 33 says.

## For the founder to decide

1. **Switch Clerk to its production keys** (`pk_live_` / `sk_live_` with
   karmanprep.com as the domain). The live site still runs on Clerk's
   development account. It caps users, accounts can't be moved later, and
   until tonight's fix it hid the site from Google. Then make
   `scripts/build/check-release-env.mjs` refuse `pk_test_` keys.
2. **Turn on "Always Use HTTPS"** in Cloudflare (SSL/TLS, Edge Certificates).
   Today `http://karmanprep.com` serves pages, sign-in included, unencrypted.
3. **The photos:** pick the left or right column of
   `photos-before-after.jpg`. The site shows the right-hand versions now;
   going back is one line (`DEVICE = ""` in `src/components/site/Photo.tsx`).
4. /learn is open to any signed-in account on any plan. Intended for
   self-paced, or should it check the plan?
5. The Privacy Policy says Karman uses PostHog analytics, but no PostHog code
   is in the app, and the new Cookie Policy says no analytics cookies are set.
   One of them should change (the legal copy is the pricing session's).
6. The free practice test page still promises "a score range" in two places,
   while tonight's brief says to show one predicted score, never a range.
   CLAUDE.md asks for labelled ranges. Which rule wins on this page?

## Price and plan problems for the pricing session

- "Start self-paced" on /pricing goes to the free practice test. The founder
  decided plan buttons create an account, then go straight to checkout.
- The self-paced note says the guarantee "covers the cohort and Private 20";
  tonight's guarantee covers the Cohort, Private 10 and Private 20.
- The pricing scholarship line describes a free seat for a family that can't
  afford it; tonight's scholarship is $1,500 to the top scorer.
