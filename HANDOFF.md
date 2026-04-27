# Strata — Claude Code session handoff

This doc is the starting prompt for the next Claude Code session. Paste the
**"PROMPT TO PASTE"** block at the bottom into a fresh session, or just point
the session at this file.

---

## What this project is

Strata is a pre-launch SAT prep platform targeting a **November 2026 launch**.
Pre-launch — every student in the database is a stress-test seed (500 students
across 21 cohorts; one real test admin: `bennisz@outlook.com`).

## Tech stack

- **Next.js 16** (App Router) + **React 19** + Tailwind 3.4 + Turbopack
- **Clerk** for auth (text Clerk userId stored in `users.clerk_id`)
- **Supabase** (Postgres) — `createAdminClient()` for server-side service-role,
  RLS for browser
- **Stripe** for subscriptions + checkout (live webhook handler at
  `/api/stripe/webhook` — handles subscription lifecycle + refunds)
- **Slack Web API** — single-bot model: every chat message posts as the Strata
  bot with `*FirstName L.:* prefix`. Students never log in to Slack.
- **Cal.com Platform API + Zoom S2S OAuth** for scheduling (deployed but
  webhook URLs still need registration when production-deployed)
- **Resend + React Email** for transactional email
- **OpenAI Moderation + Gemini Flash 2.0** for chat content moderation (both
  currently 429-ing on the user's accounts; Layer 1 keyword blocklist is doing
  the heavy lifting)
- **react-useanimations + lottie-react** for landing animations

## Repo layout (the bits you'll touch most)

```
src/
  app/
    page.tsx                           — landing
    diagnostic/page.tsx                — pre-payment diagnostic gate + entry
    onboarding/                        — pre-payment questionnaire +
                                          tier recommendation
    onboarding/questionnaire/          — POST-payment intake (separate flow)
    dashboard/student/                 — student dashboard (chat, progress,
                                          schedule, learn, billing)
    admin/                             — admin console
    admin/revenue/                     — NEW revenue dashboard
    api/
      diagnostic/submit/               — submits + scores diagnostic
      chat/                            — chat: messages, send, dm, threads,
                                          unread, cohort-members, read
      stripe/webhook/                  — subscription lifecycle + refunds
  components/
    diagnostic/                        — ChatShell-style: HighlightablePassage,
                                          QuestionNavigator, HintButton, etc.
    chat/                              — ChatShell, CohortChat, DirectMessage
    landing/                           — HowItWorks (per-icon animations now),
                                          DiagnosticTeaser (replaced SampleQuiz),
                                          SampleLesson (free, no gate)
    learn/                             — DesmosWindow, Scratchpad (used by
                                          diagnostic too), MathText (KaTeX)
    dashboard/                         — DashboardLayout (hover-to-expand
                                          sidebar), StudentDashboardClient
  lib/
    diagnostic-scoring.ts              — 8-domain attention-need engine
    onboarding/recommend-tier.ts       — pre-payment tier recommender
    moderation/                        — pipeline (OpenAI + Gemini in parallel)
                                          + blocklist (heavily expanded)
    clerkAppearance.ts                 — uses `dark` baseTheme from @clerk/themes
  data/
    diagnostic-questions.ts            — 35-question Bluebook-style bank
                                          (R&W first, Math second; 8 official
                                          SAT domains)
supabase/
  migrations/                          — 001-019 (all should be applied)
scripts/
  test-reply.mjs                       — seed cohort-chat replies
  test-dm-reply.mjs                    — seed DMs to bennisz
  reset-diagnostics.mjs                — wipe diagnostic_results for a user
```

## What was just done in this session (ordered by recency, top = newest)

### Admin Revenue dashboard (the LAST thing shipped)
- `/admin/revenue` page with: 6 KPIs (MRR, ARR, Students, ARPU, Churn, LTV),
  4 momentum cards (new subs, cancellations, refunds, past-due), MRR sparkline
  from `revenue_snapshots`, 3/6/12-month forecast band, pie chart + tier
  breakdown, **cohort retention matrix** (last 6 signup-month cohorts × M0/M1/M3/M6),
  dunning queue with $ at risk, per-tutor revenue (last 30d).
- "Snapshot now" button (server action `snapshotRevenueAction`) inserts a
  `revenue_snapshots` row. Production: hit the same logic from a Vercel Cron
  nightly.
- Stripe webhook now handles `charge.refunded` → upserts into `refunds` table
  (idempotent via `stripe_refund_id` UNIQUE).
- `subscriptions.canceled_at` populated by webhook on
  `customer.subscription.updated` (status=canceled) and
  `customer.subscription.deleted`. Backfilled to `created_at` for existing
  canceled rows.

### HowItWorks animations
- Scrapped the SVG rail (3 alignment iterations failed). Replaced with
  per-badge `react-useanimations` icons — checkmark / bookmark / arrowUpCircle.
  Plays once on viewport enter and on hover. Badges back to `w-12` (48px).
- `lottie-react` is also installed if we ever want to drop in custom Lottie
  JSON files from lottiefiles.com — recommendation: save to
  `/public/lottie/step-N.json` and swap the import in HowItWorks.tsx.

### Pre-payment questionnaire (replaces old `/onboarding` role picker)
- 10 steps: role · SAT date (incl. May/Jun + "Not registered yet") · goal ·
  baseline · hours/week · independence · learning pace · prior-prep result ·
  billing preference · recommendation.
- The old "small group vs 1-on-1" question is GONE — too direct. The engine
  in `lib/onboarding/recommend-tier.ts` infers attention need from diagnostic
  questions and uses the billing preference as the second axis (subscription =
  Seminar / Elite, per-session = Small Group / Private).
- Recommendation card surfaces the picked tier, a 2-3 sentence why, the
  signals it used (bullet list), and an "we also considered ___" alt.

### Diagnostic — full surface
- 35 questions covering all 8 official SAT domains, ordered R&W first then
  Math (mirrors real Bluebook section order). Per-section numbering resets
  between sections.
- **Section timers**: Math 32 min, R&W 18 min (proportional to real SAT).
  Auto-advances past last question of section when timer expires.
- **One-and-done** — page redirects users with prior `diagnostic_results` rows
  to `/dashboard/student/progress`.
- **Exit button** with confirmation modal + `beforeunload` guard.
- **Calculator (Desmos)** + **Scratchpad** floating windows on math questions
  only. Both **persist state across open/close within a single question**
  (CSS `display:none` toggle, key bumps on question change to reset).
- **Hint button** bottom-left, 1 per question, max 3 total. Shows "Hint shown"
  + emerald checkmark after spending.
- **Bookmark button** in header; bookmarked questions surface in the
  navigator (white ribbon) AND on the results page in a "Bookmarked for
  review" card.
- **Question Navigator** (slide-in panel from right): tile per question,
  section-relative numbering (R&W 1-15, Math 1-20), color-coded by state
  (correct=green, wrong=red, hint=amber), bookmark ribbon corner, current=blue
  ring. **Cross-section jumps disabled** — you can't jump from Math back to
  R&W.
- **Per-choice hover icons** (replaces 3-dot menu): Highlighter (amber tint)
  + Ban (cross-out + dim). Crossed-out choices can't be picked.
- **Passage highlighting + annotation** on R&W questions:
  - Auto-commits highlight on selection mouseup (no floating button)
  - Each new highlight cycles through an 8-color Strata palette (sky, amber,
    emerald, pink, violet, cyan, rose, lime)
  - Click highlight → draggable, fixed-position **AnnotationEditor** appears
    OUTSIDE the passage column; smart placement (right-of-passage, then
    left, then above, then below); Enter saves, Esc closes
  - Hover annotated highlight → translucent draggable **AnnotationViewer**
    pops up ALWAYS above the highlight; titled "Annotation"
- **Math/R&W rendering**:
  - Math via `<MathText>` (KaTeX) — fixed escaped-`$` handling for currency,
    fixed inline alignment so math sits on prose baseline at the same size
  - R&W in 2-column split: passage left (serif, scrollable), prompt+choices
    right
  - Italic intro line above passage in Bluebook style ("The following text
    is adapted from…")
- **Results page** rewritten:
  - Predicted SAT range marker is now an in-line capsule on the gradient
    bar showing the actual range (low to high), with endpoint labels
  - All scores rounded to nearest 10 (SAT convention)
  - Domain breakdown split into Math + R&W subsections
  - Bookmarked-for-review card

### Diagnostic scoring engine (`lib/diagnostic-scoring.ts`)
- Per-domain difficulty-weighted accuracy
- Section subscores (Math 200-800, R&W 200-800) → total 400-1600
- **Foundation-aware focus area** — if `easy-question accuracy < 60%`, the
  recommendation is "build foundations" regardless of which domain is lowest
  (fixes the old "260-320 score → focus on advanced math" bug)
- Strongest domain only surfaces with ≥3 correct in that domain
- All scores snapped to multiples of 10

### Chat (full surface)
- `ChatShell` with top tabs (Chat / Q&A), left sidebar listing engaged DM
  threads, "New DM" picker dropdown limited to cohort-mates
- Sidebar threads show unread badge in blue, pull to top on new message
  (Supabase realtime subscription)
- Chat nav item in dashboard sidebar shows total unread DM badge
- `DirectMessage` component for 1:1 DM threads
- "Cloud chat" bubble theme: self bubbles in blue→indigo gradient (right),
  others in glass card (left)
- Profanity blocklist heavily expanded (Layer 1 catches without needing
  flaky AI providers)
- Rejection copy aligned: "This message breaches Strata's terms of use…"

### Sidebar / dashboard layout
- Hover-to-expand sidebar: collapsed `w-16`, expands to `w-56` on hover with
  smooth transition. No layout shift (fixed-position spacer)
- Strata wordmark (thin gradient, pink→purple→cyan) fades in next to the
  mark when expanded
- Logo links to `/` (landing) — NOT to dashboard home
- Profile (Clerk's openUserProfile) is a normal nav row under Billing
- Chat nav item shows live unread DM badge as a corner pip (collapsed) or
  inline (expanded)

### Misc
- Clerk dark theme: `@clerk/themes` `dark` baseTheme + targeted overrides for
  the UserProfile modal
- Strata `Wordmark` exported as `StrataWordmark` for reuse
- NodeDetail.tsx text contrast fixes (text-slate-600/700 → 300/400)
- Sample lesson on landing: removed sign-up gate, plays inline when video
  URL is wired (currently `null`)
- DiagnosticTeaser replaced the old 22-question SampleQuiz on landing

## Migrations applied (verify with the user before assuming)

```
015_chat_realtime.sql                    — adds chat_messages + direct_messages
                                            to supabase_realtime publication
016_dm_read_state.sql                    — adds direct_messages.read_at
017_diagnostic_text_concepts.sql         — diagnostic_results.weak_concepts → text[]
018_diagnostic_total_score_range.sql     — score_range CHECK widened to 200-1600
019_revenue_infra.sql                    — adds subscriptions.canceled_at,
                                            revenue_snapshots, refunds tables
```

User has applied all of these as we went. **Migration 019 was just applied.**

## What's pending / queued up

### Immediate (the ask that was in flight when we cut over)

**Standard English Conventions questions need rewriting.** The user said:

> "the standard English questions are not asked like typical standard English
> questions in the SAT, which I don't like. I want you to make sure that the
> standard English questions are phrased with their sentence, as well as their
> question, and then the answer choices as well. I want you to test over
> roughly six of the standard English rules in the diagnostic exam and make
> them decently hard."

**Plan agreed in chat (not yet executed):**
- Replace the 3 existing conventions questions (`conv-1`, `conv-2`, `conv-3`
  in `src/data/diagnostic-questions.ts`) with **6 new harder ones**, each in
  proper SAT "Which choice completes the text so that it conforms to the
  conventions of Standard English?" format.
- Drop the easiest question from each other R&W subdomain to keep the total
  at 35: drop `info-1`, `craft-1`, `expr-1`. New R&W shape: 3 + 3 + 3 + 6 = 15.
- Cover 6 different rules across the 6 questions:
  1. Subject-verb agreement (with intervening prepositional phrase)
  2. Pronoun-antecedent (collective noun)
  3. Verb tense consistency (past perfect vs past)
  4. Punctuation (colon vs semicolon vs comma between independent clauses)
  5. Sentence boundaries (subordinate + main clause; avoid fragment / run-on)
  6. Modifier placement (dangling modifier)
- Difficulty bias toward 2-3 (medium-hard).
- Use the existing `passage` + `text` + `options` shape. For punctuation
  questions, options should embed the surrounding word(s) so the punctuation
  is visible (e.g., `"A) proposals,"`, `"B) proposals;"`, `"C) proposals:"`).

### Carried-over backlog from earlier sessions

- **OpenAI + Gemini moderation 429s** — user needs to add a payment method
  to OpenAI for moderation rate limits, and either upgrade Gemini billing or
  use a different Google project. Layer 1 keyword blocklist is functional in
  the meantime.
- **Cloudflare Stream for video hosting** — recommended over YouTube unlisted
  for real privacy. Currently SampleLesson uses `SAMPLE_VIDEO_URL: null`
  placeholder. When ready, swap the URL source to a signed-URL endpoint your
  API mints per request.
- **Lottie animations from lottiefiles.com** — if user wants to upgrade
  HowItWorks visuals beyond the bundled `react-useanimations` icons, save
  3 JSONs to `/public/lottie/step-N.json` and swap to `lottie-react` for
  full control + custom recoloring.
- **Apple sign-in fix** — still parked from earlier sessions per memory.
- **Production Stripe wiring on /admin/revenue** — when going live, swap the
  Supabase queries inside `getRevenueMetrics()` for `stripe.subscriptions.list()`
  grouped by Stripe price id. Marked with `TODO(prod):` comments. Same
  applies for the snapshot action — could pull MRR directly from Stripe.
- **Diagnostic scoring** — when OpenAI quota is fixed, optionally layer LLM-
  generated personalized diagnosis copy on top of the rule-based
  `recommendTier` output. We discussed this earlier and explicitly chose A
  (rule-based only) for now.
- **MRR snapshot cron** — manual "Snapshot now" button works; production
  needs a Vercel Cron (or pg_cron) calling `snapshotRevenueAction` nightly.
- **Refund rate UI** — table exists, webhook wired, but until Stripe is live
  the refunds table will be empty. Card shows "No refunds yet" until then.

## Dev workflow notes

- `npm run dev` runs Next dev + Stripe CLI listener (the `dev` script).
  `npm run dev:next` if you want Next only.
- Dev server log lives at `/tmp/strata-dev.log` if user is running in their
  own terminal — useful for diagnosing 500s.
- `node --env-file=.env.local scripts/<name>.mjs` for the seed scripts.
- **Don't run destructive operations without confirmation** — user has SQL
  Editor access and prefers to paste migrations themselves.
- Type-check with `npx tsc --noEmit` after substantial edits.

## Conventions in this codebase

- **No comments unless WHY is non-obvious.** Don't write what code does;
  write why a non-obvious choice was made or what bug a workaround fixes.
- **No emojis** unless the user explicitly asks.
- **No new docs (README, MD)** unless explicitly asked.
- **Strata aesthetic**: dark navy bg (`#0B1026`), blue → indigo → violet
  gradients, glass cards (`bg-white/[0.04] border-white/10 backdrop-blur-md`),
  italic-last-word echo on hero headings ("How Strata *works*").
- **Section-relative everything** in the diagnostic (numbering, timer,
  navigator).
- **Auto memory system** at
  `/Users/zakariabennis/.claude/projects/-Users-zakariabennis-strata/memory/`
  has user/feedback/project/reference memories. Read MEMORY.md first to
  learn what's already known about the user.

## User context (from auto memory)

- Email: zbennisx@gmail.com
- Working on Strata pre-launch for Nov 2026
- Prefers methodical phased work, asks design questions first when something
  has multiple reasonable approaches
- Voice-dictation quirks (occasional fragments)
- Single-bot Slack chat is locked & deferred until scheduling ships
- Plan tiers locked: Seminar $40/mo, Small Group $60/session,
  Private $135/session, Elite $800/mo (no annual)

---

## PROMPT TO PASTE into the next Claude Code session

```
You're picking up the Strata project mid-build (a pre-launch SAT prep
platform launching Nov 2026). Read HANDOFF.md in the project root for the
full state of play — it documents what was just shipped, what's pending,
and the conventions used.

The immediate task waiting for you is rewriting the Standard English
Conventions section of the diagnostic question bank
(src/data/diagnostic-questions.ts). The user wants 6 new harder questions
in proper SAT "Which choice completes the text so that it conforms to the
conventions of Standard English?" format, covering 6 different rules
(subject-verb, pronoun-antecedent, tense consistency, punctuation,
sentence boundaries, modifier placement). To keep the diagnostic at 35
questions total, also drop info-1, craft-1, and expr-1. See HANDOFF.md
"What's pending" section for the agreed plan.

Before doing anything: skim HANDOFF.md and read the project memory at
/Users/zakariabennis/.claude/projects/-Users-zakariabennis-strata/memory/
to understand the user's preferences and the project's locked decisions.
```
