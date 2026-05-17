# Karman Prep — Feature Inventory & Audit

> A plain-English walkthrough of every feature in the app, the path a real person clicks to get there, what "working correctly" looks like, and any red flags worth knowing about. Use this as both a reference and a smoke-test checklist.

**Last sync:** 2026-05-16. Covers all merged PRs through **#97 + #64** (the previous 2026-05-15 sync covered #33–#59; #60–#97 landed in a follow-up triage + merge batch on 2026-05-16). Major additions since 2026-05-14: reliability tightenings (Fireflies matcher, Zoom fuzzy names, Stripe Connect retry, SAT-date seed fallback, Cal-webhook email retry queue, recent-approved-sender moderation cache), new admin affordances (cohort unarchive, granular impersonation Phase 1 + 2, bulk-reject, diagnostic retake grant), one new tutor surface (`/tutor/schedule` self-serve cancel + reschedule), an opt-in session-recording consent banner for EU/CA visitors (#88), the ESLint v9 + flat config upgrade (#87), and a developer-only test/visual harness (seed-dev personas, Playwright E2E in CI via `supabase start`, Vitest+RTL, axe + tokens + timing visual specs, real-device iPhone captures, visual regression baselines).

All 3 launch-blocking critical-issues now resolved — see strikethroughs in _Block-the-launch_ below.

---

## How to use this doc

Each feature has the same shape:

- **What it is** — one sentence in plain English.
- **What the user does** — the click path / interactions.
- **What "working" looks like** — the success state you'd see if you tested it.
- **🚩 Red flags** — issues to fix before launch, or behaviors worth being aware of. Only present when there's something worth calling out.

If you want the high-leverage stuff first, read the **Critical issues** section right below. Then walk the dev server (`npm run dev:next`) section by section and check each feature against the "What 'working' looks like" line.

---

## Critical issues to fix before launch

Pulled from the audit notes below. Ranked by how much they'd hurt a real user or your business.

### What changed since 2026-05-14

Compact changelog of merged PRs since the previous sync. Use this as the diff against what the inventory below claims. Most of these are reliability fixes for surfaces already documented; new surfaces are called out explicitly.

| PR                                                           | Title                                                         | Surface                  | Reflected in section      |
| ------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------ | ------------------------- |
| [#40](https://github.com/zakaria-bennis/Karman-Prep/pull/40) | Tutor self-serve cancel + reschedule on /tutor/schedule       | **New tutor feature**    | `/tutor/schedule`         |
| [#41](https://github.com/zakaria-bennis/Karman-Prep/pull/41) | Shared CSV parser between UI + cron                           | internal refactor        | J10 question-import       |
| [#42](https://github.com/zakaria-bennis/Karman-Prep/pull/42) | Onboarding placement failures → admin alert + student message | reliability              | J1 signup, admin notif    |
| [#43](https://github.com/zakaria-bennis/Karman-Prep/pull/43) | Zoom attendance: fuzzy name fallback for email mismatches     | reliability              | Zoom webhook              |
| [#44](https://github.com/zakaria-bennis/Karman-Prep/pull/44) | Hide /blog from public footer until content exists            | visibility               | `/blog`                   |
| [#45](https://github.com/zakaria-bennis/Karman-Prep/pull/45) | Admin can view + unarchive auto-archived cohorts              | **New admin affordance** | `/admin/cohorts`          |
| [#46](https://github.com/zakaria-bennis/Karman-Prep/pull/46) | Tutor schedule honors users.time_zone                         | correctness              | `/tutor/schedule`         |
| [#47](https://github.com/zakaria-bennis/Karman-Prep/pull/47) | SAT-date scraper: static seed fallback                        | reliability              | sync-sat-dates cron       |
| [#48](https://github.com/zakaria-bennis/Karman-Prep/pull/48) | Retry Stripe Connect webhook processing                       | reliability              | Stripe Connect webhook    |
| [#49](https://github.com/zakaria-bennis/Karman-Prep/pull/49) | Bulk-reject for flagged questions                             | **New admin affordance** | `/admin/questions/review` |
| [#50](https://github.com/zakaria-bennis/Karman-Prep/pull/50) | Tighten Fireflies transcript matcher                          | reliability              | Fireflies webhook         |
| [#51](https://github.com/zakaria-bennis/Karman-Prep/pull/51) | Phase 1 granular admin impersonation                          | **New admin affordance** | Admin impersonation       |
| [#52](https://github.com/zakaria-bennis/Karman-Prep/pull/52) | Dev-only auth bypass                                          | dev-only                 | n/a (not user-visible)    |
| [#53](https://github.com/zakaria-bennis/Karman-Prep/pull/53) | Dev fixtures: npm run seed:dev                                | dev-only                 | n/a                       |
| [#54](https://github.com/zakaria-bennis/Karman-Prep/pull/54) | Playwright E2E + safeAuth in server actions                   | reliability + dev-only   | n/a                       |
| [#55](https://github.com/zakaria-bennis/Karman-Prep/pull/55) | Component tests via Vitest + RTL                              | dev-only                 | n/a                       |
| [#56](https://github.com/zakaria-bennis/Karman-Prep/pull/56) | Testing & verification workflow in CLAUDE.md                  | dev-only                 | n/a                       |
| [#57](https://github.com/zakaria-bennis/Karman-Prep/pull/57) | Visual perception harness (a11y + tokens + timing)            | dev-only                 | n/a                       |
| [#58](https://github.com/zakaria-bennis/Karman-Prep/pull/58) | Cross-browser + mobile device emulation                       | dev-only                 | n/a                       |
| [#59](https://github.com/zakaria-bennis/Karman-Prep/pull/59) | Real-device capture workflow for iPhone 17 PM                 | dev-only                 | n/a                       |

**Product-surface deltas worth re-reading in the sections below:**

- `/tutor/schedule` now has self-serve cancel + reschedule (was view-only).
- `/admin/cohorts` shows archived cohorts and lets admins unarchive them.
- `/admin/questions/review` has a bulk-reject affordance.
- Admin impersonation: "View as [user]" is wired through students (Phase 1). Tutors/parents land in Phase 2 (open PR #64 / queued).

**No critical-issue removals** — all "block-the-launch" items below are still open. The new "open PRs queued" list at the bottom of this section tracks 15+ improvement PRs that haven't merged yet.

### Block-the-launch

1. ~~**The booking page uses a hardcoded smoke-test Cal.com event-type id (`5489022`).**~~ **RESOLVED 2026-05-16** — [src/app/dashboard/student/schedule/page.tsx](src/app/dashboard/student/schedule/page.tsx) now reads `users.cal_event_type_id` per tutor via the `tutor_assignments` join. If the tutor's id is null, the booking widget is gated and `alertAdminAboutMissingTutorSetup()` fires a deduped (24h) admin email so the tutor can be onboarded before any student tries to book.

2. ~~**Chat is fully fail-closed on OpenAI outages.**~~ **RESOLVED** — `src/lib/moderation/cache.ts` + `pipeline.ts` add a recent-approved-sender cache. After a sender's message passes the full pipeline, subsequent messages within a 5-min window skip Layer 2 (OpenAI Moderation) + Layer 2.5 (Karman classifier) and rely on the cached approval. Layer 1 (keyword blocklist) still runs on every send, so the cache can't bypass the explicit safety floor. New / occasional senders still hit OpenAI and still fail-closed on outages — the cache only protects active conversations.

3. ~~**The Cal.com booking webhook silently swallows email-send failures.**~~ **RESOLVED** — all 3 email-send paths in [src/app/api/webhooks/cal/route.ts](src/app/api/webhooks/cal/route.ts) (confirm / cancel / reschedule) wrap the Resend call in try/catch and route failures to `enqueueFailedEmail()` ([src/lib/integrations/resend/email-queue.ts](src/lib/integrations/resend/email-queue.ts)). The retry cron at `/api/cron/retry-failed-emails` drains the queue with exponential backoff. Webhook still returns 200 so Cal.com doesn't double-fire.

### Fix soon (high priority)

4. **Seminar-overflow webhook creates orphan cohorts.** When a seminar passes 200 students, the system auto-creates an "Overflow" sibling cohort and emails admins — but doesn't provision the Cal.com event-type or Zoom integration. If the admin forgets, students sit in a cohort with no meetings scheduled. Now mitigated by the new empty-cohort auto-archive (PR #32), but only after students drop. Add a reminder cron or a "needs Cal/Zoom config" admin badge.

5. **Slack post failures on chat-send leave a race.** If the message moderates as approved but the Slack POST fails (network blip), the route returns a 502 and _doesn't_ insert a database row. The student sees "send failed" and retries. But Slack may have actually received the first one (the failure was after the post, on a slow response). Possible: duplicate messages in Slack.

6. **PDF processing jobs have no auto-refresh.** Admins import a PDF, then have to manually F5 the `/admin/jobs` page to watch progress. Add polling or live-status events.

7. ~~**Diagnostic is one-and-done with no student retake path.**~~ **RESOLVED** — `users.diagnostic_retakes_remaining` column added. [src/app/diagnostic/page.tsx](src/app/diagnostic/page.tsx) gates the retake on a positive balance; [src/app/admin/users/actions.ts](src/app/admin/users/actions.ts) `actionGrantDiagnosticRetake` lets admins increment it; the submit route decrements on retake. Admin grants the retake from the user list when a student asks.

8. ~~**Tutor cannot reschedule or cancel their own sessions.**~~ **RESOLVED 2026-05-15 ([PR #40](https://github.com/zakaria-bennis/Karman-Prep/pull/40))** — `/tutor/schedule` now has self-serve cancel + reschedule with the 24-hour rule.

9. ~~**CSV ingest cron parser is a duplicate of the UI parser.**~~ **RESOLVED 2026-05-15 ([PR #41](https://github.com/zakaria-bennis/Karman-Prep/pull/41))** — Both sides now import `src/lib/question-bank/csv-parser.ts` (pure functions). No more drift.

### Fix when convenient (medium)

10. **Blog landing page is shipped but has no content.** `/blog` is publicly linked from the footer and shows "coming soon." Either publish a first article or remove the link.

11. ~~**Empty-cohort archive (PR #32) has no admin "undo" button.**~~ **RESOLVED 2026-05-15 ([PR #45](https://github.com/zakaria-bennis/Karman-Prep/pull/45))** — `/admin/cohorts` includes archived rows; each has an Unarchive button.

12. ~~**Tutor timezone is hardcoded to `America/New_York`.**~~ **RESOLVED 2026-05-15 ([PR #46](https://github.com/zakaria-bennis/Karman-Prep/pull/46))** — `/tutor/schedule` now reads `users.time_zone` and formats times in the tutor's local zone.

13. ~~**The College Board SAT-date scraper will eventually break.**~~ **RESOLVED 2026-05-15 ([PR #47](https://github.com/zakaria-bennis/Karman-Prep/pull/47))** — daily cron seeds from `STATIC_SAT_DATES` first; live scrape upserts over the seed when fresher data arrives.

14. ~~**Stripe Connect payout webhook silently fails on processing errors.**~~ **RESOLVED 2026-05-15 ([PR #48](https://github.com/zakaria-bennis/Karman-Prep/pull/48))** — webhook now retries via `decideRetryOutcome`; gives up after `MAX_PROCESSING_ATTEMPTS` and emails admin.

15. ~~**Admin question-review has no bulk-reject.**~~ **RESOLVED 2026-05-15 ([PR #49](https://github.com/zakaria-bennis/Karman-Prep/pull/49))** — multi-select checkboxes + "Reject N selected" button on `/admin/questions/review`.

16. ~~**Fireflies transcript matching uses a ±60-min time window fallback.**~~ **TIGHTENED 2026-05-15 ([PR #50](https://github.com/zakaria-bennis/Karman-Prep/pull/50))** — `pickBookingByTime` now requires uniqueness; ambiguous matches are recorded as `match_failed` with `error_message` set, no longer attached to a random booking. Edge case still exists for two sessions within the window — manual review needed when flagged.

17. **PARTIALLY RESOLVED 2026-05-15 ([PR #51](https://github.com/zakaria-bennis/Karman-Prep/pull/51) — Phase 1 only).** Granular admin impersonation now works for students via the "View as [user]" menu on `/admin/users` — picks specific student data, not a generic dashboard. **Phase 2** (extending to tutor + parent surfaces) is open as PR #64 / queued.

---

# Glossary

Vocabulary an AI ingesting this doc cold should learn first. Code mappings in `monospace`.

## Business model

- **Tier** — one of four delivery models a student subscribes to. Defined in code as `subscriptions.tier` and `cohorts.tier`. The four values are:
  - **`group`** — also called **Seminar**. Large-group instruction, up to 200 students per cohort. Sessions pushed by admin; no self-booking.
  - **`small_group`** — also called **Small Group**. Up to 5 students per cohort. Sessions pushed by admin.
  - **`private`** — 1:1 tutoring. Student self-books sessions via Cal.com. Pay-per-session.
  - **`elite`** — 1:1 tutoring with a monthly token bundle (set number of sessions/month, granted lazily on first booking each month).
- **Cohort** — a group of students sharing a tutor + SAT test date for the `group` or `small_group` tiers. Stored in `cohorts` table. Membership in `cohort_members` (active = `left_at IS NULL`).
- **SAT date** — the official College Board test date the student is preparing for. Each cohort is keyed to one SAT date. Synced daily from College Board via cron.
- **Seminar** — verbal shorthand for the `group` tier (200-cap classroom-style). Auto-overflow into "Overflow" sibling cohorts when the cap is exceeded.
- **Token / session credit** — Elite tier only. Monthly allocation that allows booking sessions. Granted by `ensureEliteMonthlyTokens()` lazily. Forfeited on within-24h cancel/reschedule per the locked tier policy.
- **Booking** — a scheduled tutoring session row. `bookings` table. Status: `scheduled` → `completed` / `cancelled` / `no_show`.
- **Subscription** — Stripe subscription tied to a tier. `subscriptions` table. Status: `trialing` / `active` / `past_due` / `cancelled` / `unpaid` / `incomplete_expired`.
- **50-point guarantee** — Karman's signature promise. Conditional refund if a student doesn't gain 50 SAT points after 16+ weeks of subscription with 80%+ attendance.

## Content & learning model

- **Constellation** — the visual map of all curriculum nodes (one for Reading & Writing, one for Math). Renders at `/learn/reading` and `/learn/math`.
- **Node** — a single concept/topic in the constellation (e.g. "Pronouns", "Linear Equations"). Stored in `learn_nodes`. Has prerequisites that gate access.
- **Domain** — top-level SAT category. Math has 4 (Algebra, Advanced Math, Geometry, Data Analysis); Reading & Writing has 4 (Info & Ideas, Craft & Structure, Expression of Ideas, Conventions).
- **Mastery** — per-(user, node) completion state, tracked in `learn_node_status`. States: `locked` / `available` / `in_progress` / `mastered`.
- **Diagnostic** — 35-question SAT baseline. Stored in `diagnostic_results` with score range (e.g. 1050–1150), domain percentages, and weak-topic tags. First attempt is automatic; retakes require an admin grant via `users.diagnostic_retakes_remaining` (incremented by `actionGrantDiagnosticRetake`, decremented on submit).
- **Question bank** — `quiz_questions` table. Two flavors: live (live = node_id IS NOT NULL + import_status = `ok`) and bank (un-routed: node_id IS NULL, awaiting triage at `/admin/questions/review`).

## Chat & moderation

- **Channel** — Slack-backed chat surface tied to a cohort. Two per cohort: `cohort_chat` (general) and `qa` (tutor-moderated Q&A). `chat_channels` table.
- **DM** — direct message between two users in the same cohort. Supabase-only, no Slack. `direct_messages` table.
- **Moderation pipeline** — 3-layer chat content review. Layer 1 (keyword), Layer 2 (OpenAI Moderation, fail-CLOSED), Layer 2.5 (Karman bullying classifier, additive). Run on every send via `src/lib/moderation/pipeline.ts`.
- **Flagged** — `moderation_status='flagged'`. Held back from delivery; admin must approve at `/admin/moderation` for Slack post. Outcome of `approved_with_flag` from the pipeline.
- **Rejected** — `moderation_status='rejected'`. Permanently hidden. Sender sees a rejection notice; recipient never sees the content.
- **Mute** — per-(student, channel) posting block in `channel_mutes`. Tutor/admin exempt.
- **Karman classifier** — Layer 2.5 of the pipeline. School-audience-specific GPT-4o-mini prompt that asks "would a parent be upset to see this?". Additive to Layer 2.

## Roles & access

- **Role** — `users.role` enum: `student` / `parent` / `tutor` / `admin`.
- **Impersonation** — admin-only "View as" mechanic. Sets a `karman_impersonate_role` cookie (2hr TTL) so admin sees the chosen role's UI. Real role stays admin in the DB; all actions log under true identity.
- **Parent-student link** — `parent_student_links` table. Parent must have a row per student they can view at `/dashboard/parent/[studentId]`. Created by admin.

## Technical infra

- **Clerk** — auth provider. Owns the login UI + Clerk user IDs. We mirror to `users.clerk_id`.
- **Supabase** — Postgres + Storage + RLS. Service-role client used by all API routes; RLS used for client-side direct queries.
- **Stripe** (main account) — subscriptions. Webhook at `/api/stripe/webhook`.
- **Stripe Connect** — separate account for tutor payouts. Webhook at `/api/webhooks/stripe-connect`.
- **Cal.com** — booking system for Private/Elite. Webhook at `/api/webhooks/cal`. Booking creation uses `createBooking()` adapter.
- **Zoom** — video sessions. Webhook at `/api/webhooks/zoom` tracks attendance. Booking creates a meeting + enables registration + registers attendee for unique-per-student join URL.
- **Slack** — chat backbone (Bot User OAuth token). Posts are made from `/api/chat/send` after moderation passes. Inbound Slack Events webhook at `/api/webhooks/slack` is logging-only today.
- **Resend** — transactional email (welcome, booking confirmation, cancellation, overflow alerts).
- **Fireflies** — meeting transcript service. Webhook at `/api/webhooks/fireflies-transcript` triggers OpenAI session-recap draft generation.
- **OpenAI** — used for moderation (`omni-moderation-latest`), the Karman classifier (`gpt-4o-mini`), and session recap drafts (`gpt-4o`).
- **R2** — Cloudflare object storage. Holds PDF uploads + extracted CSVs + chat media.
- **OpenNext + Cloudflare Workers** — deploy target. Edge runtime for routes; Node runtime for routes that need it (`export const runtime = "nodejs"`).
- **Hybrid runner** — the admin's local Claude-Code instance that processes queued PDFs. Off-platform (not on Cloudflare); writes results to R2 + updates `pdf_processing_jobs` rows.
- **Cohort archival** — soft-delete via `cohorts.archived_at` (PR #32). Triggered inline when active member count drops to zero; reverses when a student joins back.
- **Zod boundary validation** — every API route with a JSON body parses through a `<route>/schemas.ts` Zod schema (PRs #27–#28). Zod is the gate; business logic runs only after parse succeeds.

---

# Part 0 — End-to-end user journeys

What happens across the whole stack when a real user takes a real action. Each journey has a stable ID for cross-reference.

## J1 — Anonymous visitor becomes paying student `{#journey-signup-to-first-lesson}`

**Audience:** prospective student (or parent buying for student).
**Trigger:** visitor lands on the marketing site and decides to sign up.

**Steps:**

1. Visitor browses `/`, `/about`, `/faq`, `/guarantee` etc. Clicks "Start free trial."
2. **`/auth/sign-up`** — Clerk creates the user (email + password or social). Clerk fires its own user.created event.
3. App calls **`POST /api/auth/sync-user`** on first sign-in. Mirrors Clerk profile (`first_name`, `last_name`, `avatar_url`, `email`) into `users` table. Captures `signup_ip` once (anti-fraud signal).
4. App routes to **`/onboarding`**. User picks role (typically `student`).
5. **`/billing`** is gated next. Stripe Checkout opens (`POST /api/stripe/checkout`). User picks a tier, enters card, completes checkout.
6. **Stripe fires `customer.subscription.created`** → **`/api/stripe/webhook`** receives it. Upserts `subscriptions` row with tier + trial_end. Calls `restoreLastCohort()` (no-op for new users). Sends welcome email via Resend.
7. App routes user to **`/onboarding/questionnaire`**. Validates active subscription, then collects SAT date, goal score, hs_year, availability (Private/Elite only), parent contacts.
8. **`POST /api/onboarding/submit`** runs `placeInCohort()` (group/small_group) or `assignTutorOneToOne()` (private/elite). Filters out archived cohorts. Sets `onboarding_completed_at`.
9. Returns placement result. Frontend redirects to **`/dashboard/student`**.

**Data touched:** `users` (insert + role + sync), `subscriptions` (insert), `cohort_members` or `tutor_assignments` (insert), `cohorts` (insert if auto-created), `parent_student_links` (insert if parent info given).
**External services:** Clerk, Stripe Checkout, Stripe webhook, Resend.
**Failure modes:**

- Stripe webhook delayed → student lands on dashboard with no subscription, gets redirected to `/billing?required=1`.
- Placement throws → onboarding marked complete with warning payload; student has no cohort/tutor; admin must manually resolve.

---

## J2 — Group/Seminar student lifecycle `{#journey-seminar-lifecycle}`

**Audience:** `group` or `small_group` tier student.
**Trigger:** completes Journey J1 with tier `group` or `small_group`.

**Steps:**

1. Placement attaches the student to a cohort (`cohort_members.left_at IS NULL`).
2. **Slack channels** auto-provision via `ensureCohortChannels()` (called from the Stripe webhook for cohort restores; also triggerable from `/admin/cohorts/[id]`). Two channels: `cohort_chat` + `qa`.
3. **Admin pushes sessions** at `/admin/sessions` → **`POST /api/sessions/push`** with `{cohortId, sessionStart, sessionEnd, zoomJoinUrl, ...}`. Creates one `bookings` row per active member.
4. `sendBookingConfirmation()` emails each student + their linked parents via Resend.
5. Student sees the session on **`/dashboard/student/schedule`** and gets the Zoom join URL.
6. **Zoom session happens.** `/api/webhooks/zoom` records `meeting.participant_joined` / `_left` / `meeting.ended` events in `attendance_log`. Booking flips to `completed` or `no_show`.
7. (If Fireflies is wired) `/api/webhooks/fireflies-transcript` fires after the session — see J7.
8. **If student churns** → Stripe webhook drops them via `dropFromActiveCohort()` → `archiveCohortIfEmpty()` archives the cohort if they were the last member.

**Data touched:** `cohort_members`, `chat_channels`, `bookings`, `attendance_log`, optionally `cohorts.archived_at`.
**External services:** Slack, Resend, Cal.com (event-type setup is admin-side), Zoom, Fireflies.
**Failure modes:**

- Slack provisioning fails silently in the webhook `.catch()` — no Slack channels created; admin must manually trigger from `/admin/cohorts/[id]`.
- Seminar passes 200-cap → `/api/webhooks/seminar-overflow` auto-creates "Overflow" cohort but doesn't set up Cal/Zoom for it — admin email is the only signal.

---

## J3 — Private/Elite student books a session `{#journey-book-private-session}`

**Audience:** `private` or `elite` tier student.
**Trigger:** student opens `/dashboard/student/schedule` and picks a time in the Cal widget.

**Steps:**

1. Frontend POSTs to **`/api/bookings/create`** with `{eventTypeId, tutorClerkId, start, timeZone}`.
2. Route validates: Clerk auth → active subscription → tier in `(private, elite)` → Zod body parse → student + tutor UUID resolution.
3. **Acquires per-user mutex** via `users.booking_lock_until` (10s TTL) — prevents double-tap race.
4. **Anti-abuse rate limit:** rejects if student created ≥10 bookings in last 24h.
5. **Token check** — for `elite`, calls `ensureEliteMonthlyTokens()` to lazy-grant the month's bundle. Confirms `getAvailableTokenCount() ≥ 1` else 403.
6. **`createBooking()`** on Cal.com (single point of contact). Returns Cal UID, start/end, meeting URL.
7. **Zoom registration:** extracts meeting ID from Cal's URL, calls `enableMeetingRegistration()` + `registerAttendee()` — Zoom returns a unique-per-attendee join URL with a tk= token.
8. Persists `bookings` row with `cal_booking_uid`, `zoom_join_url`, `zoom_meeting_id`, `scheduled_start/end`.
9. **Assigns a token** to the booking via `assignTokenToBooking()`.
10. Returns the booking row with 201. Frontend updates the schedule view.
11. **Async (separately):** Cal.com fires `BOOKING_CREATED` to `/api/webhooks/cal` → sends confirmation email to student + parents + tutor.

**Data touched:** `users.booking_lock_until`, `bookings`, `tokens`.
**External services:** Cal.com (booking create), Zoom (meeting registration + attendee registration), Resend (via Cal webhook).
**Failure modes:**

- Cal.com error → 502 returned; booking never created.
- Zoom registration error → falls back to Cal's non-unique join URL; booking still succeeds.
- Persist fails after Cal succeeds → 500 with `calBookingUid` in response so admin can reconcile.
- Email fails inside Cal webhook → silently swallowed (return 200); student never knows. (Top critical issue.)
- ~~**Hardcoded `eventTypeId=5489022` smoke-test** in the frontend would route everyone to the same fake event — blocking issue.~~ **RESOLVED 2026-05-16** — now reads `users.cal_event_type_id` per tutor via the `tutor_assignments` join. Booking is gated when null + admin alerted.

---

## J4 — Cancel or reschedule a booking `{#journey-cancel-reschedule}`

**Audience:** student or tutor on the booking.
**Trigger:** clicks Cancel or Reschedule on `/dashboard/student/schedule` (or the tutor dashboard, currently admin-only).

### Cancel path

1. **`POST /api/bookings/cancel`** with `{bookingId, reason?}`.
2. Auth → ownership check (`callerUuid === student_id || tutor_id`) → `findBookingById()`.
3. Computes `isWithinCancellationWindow(scheduled_start)` (24-hour rule) and `shouldForfeitCredit(plan_tier, withinWindow)` (group/small_group never forfeit; private/elite forfeit if within window).
4. **`cancelBooking()`** on Cal.com. If Cal returns "already cancelled" 400, treats as success.
5. Updates booking: `status='cancelled'`, `cancelled_at`, `cancelled_within_window`, `credit_forfeited`.
6. **Token resolution:** within-window + forfeit → `consumeTokenForBooking(reason='forfeited_within_window')`; outside-window → `releaseTokenFromBooking()` (refunds the token).
7. **Cal webhook** fires `BOOKING_CANCELLED` → `/api/webhooks/cal` sends cancellation email (route does NOT email itself — email is idempotent via webhook).

### Reschedule path

1. **`POST /api/bookings/reschedule`** with `{bookingId, newStart, reason?}`.
2. Same auth + ownership checks.
3. Enforces **one-reschedule-per-booking cap** (DB CHECK + clean 403).
4. **Anti-abuse fix #1:** within-window reschedule that would forfeit a credit is rejected unless student has a replacement token in their bank. (Closes the "reschedule within 24h then cancel outside new window" loophole.)
5. **`rescheduleBooking()`** on Cal.com → returns new Cal UID + new Zoom URL.
6. Re-registers student on the new Zoom meeting (Cal generates a fresh Zoom on every reschedule, so the prior unique URL is dead).
7. Updates booking: new start/end, increments `reschedule_count`, captures within-window flag.
8. **Token transition** (within-window only): consumes original token (`forfeited_within_window`), reserves replacement token for the same booking (the unique index on (assigned_booking_id) WHERE active permits this).

**Data touched:** `bookings`, `tokens` (consume + assign).
**External services:** Cal.com, Zoom (re-registration on reschedule), Resend (via Cal webhook).
**Failure modes:**

- Cal cancel error → 502; DB row stays `scheduled` — student must retry.
- Token consume/release errors are logged but don't fail the request (the booking is already updated).

---

## J5 — Student sends a chat message `{#journey-chat-send}`

**Audience:** any student/tutor in a cohort.
**Trigger:** sender clicks Send in `/dashboard/student/chat` or DMs a peer.

**Steps:**

1. **`POST /api/chat/send`** (or `/api/chat/dm` for DMs) with `{channelId, content, mediaUrls?, messageType, parentMessageId?, isAnonymous?}` (Zod-validated).
2. Wave 1 (parallel): resolves sender UUID + finds channel.
3. Wave 2 (parallel): fetches role + cohort membership + tutor-of-channel + mute status + Clerk display name + runs the moderation pipeline. (Was sequential; parallel saves 500–2000ms.)
4. **Mute / authority check** via `evaluateSendChannelAuth()` (pure function): student in cohort? tutor of channel? admin? muted? — decides ok/forbidden.
5. **Moderation pipeline** runs in parallel:
   - **Layer 1 (keyword):** instant text-only regex blocklist. Hit → `rejected`.
   - **Layer 2 (OpenAI Moderation):** multimodal text + image URLs, 4-second hard timeout, **fail-CLOSED.** Returns flagged + per-category scores. Error or timeout → `rejected`.
   - **Layer 2.5 (Karman bullying):** parallel to Layer 2. School-audience GPT-4o-mini classifier. Error → logged + ignored.
6. **Decision:**
   - `rejected` → inserts row with `moderation_status='rejected'` + `rejection_message`. Returns 400 with rejection text to sender.
   - `approved_with_flag` → inserts row with `moderation_status='flagged'`, **does NOT post to Slack.** Sender sees own bubble with "pending admin review" caption. Recipient sees placeholder. Returns 201 with `pendingReview: true`.
   - `approved` → posts to Slack via `slackPostMessage()` → inserts row with `moderation_status='approved'` + real `slack_message_ts`. Returns 201.

**Data touched:** `chat_messages` or `direct_messages`.
**External services:** OpenAI Moderation, OpenAI (Karman classifier), Slack (only on approved-clean), Supabase Storage (if mediaUrls were uploaded earlier).
**Failure modes:**

- OpenAI Moderation outage → recent-approved senders keep posting via the 5-min cache (`src/lib/moderation/cache.ts`); Layer 1 keyword blocklist still runs. **New / occasional senders still fail-closed during an outage** — that's the safety floor we keep intentionally.
- Slack POST fails after moderation → route returns 502 and DB row is **not** inserted. Student retries; possible Slack duplicate.
- Karman classifier error → ignored; Layer 2 result wins alone.

---

## J6 — Admin reviews flagged content `{#journey-admin-moderation}`

**Audience:** admin.
**Trigger:** flagged messages exist (`moderation_status='flagged'`); admin opens `/admin/moderation`.

**Steps:**

1. **`/admin/moderation`** (server component) fetches the queue: `listFlaggedChatMessages()` + `listFlaggedDirectMessages()` filtered by status. Joins sender info + channel info + warning counts (batched, one query per page).
2. Admin sees rows ranked newest-first: sender + email + prior-warnings badge + channel/recipient + the message content + AI/keyword reason.
3. Admin can:
   - **Approve & deliver** → `POST /api/admin/moderation/approve` with `{kind, messageId}`. Chat case: posts to Slack via `slackPostMessage()`, then `approveChatMessage()` updates row with status='approved' + real `slack_message_ts` + audit fields. DM case: just `approveDirectMessage()`. Audit row written via `recordModerationAction(action='approve_message')`.
   - **Reject** → `POST /api/admin/moderation/reject`. Sets status='rejected', stores admin's reason as `rejection_message`. Audit row `remove_message`.
   - **Warn sender** → opens modal (severity + reason) → `POST /api/admin/moderation/warn`. Records `moderation_actions` row with `action_type='warn'` + severity. Warning count badge updates on next page load.
   - **Click sender name** → opens drawer; fires `GET /api/admin/moderation/sender/[userUuid]`. Returns warning count, recent flagged messages, recent admin actions.
   - **Search** → `?q=` reruns the list query with `ilike('content','%q%')` on both tables.

**Data touched:** `chat_messages` / `direct_messages` (status + audit fields), `moderation_actions` (insert per action).
**External services:** Slack (only on chat approve).
**Failure modes:**

- Slack POST during approve fails → DB row already flipped to approved; admin sees 502 but the message never reaches Slack. (Top critical issue.)
- No bulk actions; admin must click one-by-one.

---

## J7 — Tutor session recap pipeline `{#journey-session-recap}`

**Audience:** tutor + back-office (admin).
**Trigger:** Zoom session ends; Fireflies generates a transcript.

**Steps:**

1. Zoom meeting ends. Cal.com may fire `MEETING_ENDED` to `/api/webhooks/cal`.
2. Fireflies finishes processing the recording. Fires `/api/webhooks/fireflies-transcript?token=<FIREFLIES_WEBHOOK_TOKEN>` (query-param auth).
3. Route logs raw payload to `webhook_events` (dedup on `(source, external_event_id)`).
4. Fetches full transcript via Fireflies GraphQL API.
5. **Matches transcript to a booking** via three strategies, in order:
   - Direct `zoom_meeting_id` match.
   - `zoom_join_url` substring match.
   - **Time-window fallback:** bookings scheduled ±60 minutes of the transcript date. (Fragile; could mismatch with adjacent sessions.)
6. **OpenAI generates recap draft** via `gpt-4o`. 1:1 sessions personalized to student. Group sessions anonymized (no student names).
7. Persists on the booking row: `transcript`, `recap_draft` (JSON), `tutor_hours`.
8. Inserts `notifications` row for the tutor ("Session recap draft ready for [Student]").
9. Tutor opens the booking detail, reviews + edits draft, sends to student.
10. **Session becomes payout-eligible** once recap is sent: `payout_status='approved'`. Eligible for next payout cycle.

**Data touched:** `webhook_events`, `bookings.transcript/recap_draft/tutor_hours/payout_status`, `notifications`.
**External services:** Fireflies (transcript fetch), OpenAI (recap generation).
**Failure modes:**

- OpenAI error → fallback notification "transcript saved — write recap manually." Tutor still has the raw transcript.
- Time-window match picks wrong booking → recap on wrong session. Rare today (low volume).
- Webhook returns 200 once raw payload is logged so Fireflies doesn't retry, even if OpenAI failed downstream.

---

## J8 — Tutor gets paid `{#journey-tutor-payout}`

**Audience:** tutor.
**Trigger:** tutor has payout-eligible sessions and clicks Instant or ACH at `/tutor/payouts`.

**Steps:**

1. Sessions become eligible after J7 (recap sent → `payout_status='approved'`).
2. Tutor must have completed Stripe Connect onboarding at `/tutor/settings/payment`.
3. Tutor opens `/tutor/payouts`, sees pending amount, clicks **Instant** (debit, instant) or **ACH** (bank, 1-2 day).
4. Frontend POSTs to the payout-request endpoint (server action). Creates `payout_requests` row with eligible sessions bundled. Calls Stripe Connect payout API.
5. **`/api/webhooks/stripe-connect`** fires asynchronously:
   - `account.updated` → refreshes `users.stripe_payouts_enabled` so we know onboarding status.
   - `payout.paid` → marks payout_request as `paid`, flips all linked sessions' `payout_status='paid'`, refreshes the `tutor_earnings_summary` materialized view.
   - `payout.failed` → marks `failed`, emails admin with failure reason.
6. Tutor sees status update on `/tutor/payouts` (history table, last 10).

**Data touched:** `payout_requests`, `bookings.payout_status`, `users.stripe_payouts_enabled`, `tutor_earnings_summary` (view refresh).
**External services:** Stripe Connect (payout create), Stripe Connect webhook, Resend (admin failure alert).
**Failure modes:**

- Webhook returns 200 once raw payload is logged; if downstream processing fails, payout_request stays stale forever — no retry, only the admin email signals.
- No tutor-visible retry button.

---

## J9 — Subscription cancel → cohort drop → archive `{#journey-churn-and-archive}`

**Audience:** student (via Stripe portal) or system (Stripe's involuntary cancel for past-due).
**Trigger:** subscription status changes to `cancelled` / `past_due` / `unpaid` / `incomplete_expired`.

**Steps:**

1. Stripe fires `customer.subscription.updated` (or `.deleted`) → **`/api/stripe/webhook`**.
2. Verifies Stripe signature via `constructEventAsync`. Upserts the `subscriptions` row.
3. If new status is inactive → **`dropFromActiveCohort(clerkId)`** sets `cohort_members.left_at = now()` on the student's active membership.
4. **`archiveCohortIfEmpty(cohortId)`** runs inline (PR #32): counts active members; if zero, sets `cohorts.archived_at = now()`. Archived cohorts disappear from all dashboards.
5. Welcome email is NOT re-sent on cancel.

### Re-subscribe path

1. Student updates payment + resubscribes. Stripe fires `subscription.created` (or `.updated` to active).
2. Webhook upserts row, then **`restoreLastCohort(clerkId)`** finds the student's most-recently-left cohort, validates it's not completed + has open seats + isn't completed, clears `left_at`.
3. **`unarchiveCohort(cohortId)`** clears `archived_at` so the cohort reappears on dashboards.
4. **Slack channels auto-provision** via `ensureCohortChannels()` if missing.

**Data touched:** `subscriptions`, `cohort_members.left_at`, `cohorts.archived_at`, `chat_channels`.
**External services:** Stripe webhook signature verification, Slack channel create (on restore).
**Failure modes:**

- Cohort restore / Slack provision wrapped in `.catch()` — partial failures logged but not retried.

---

## J10 — Question import pipeline `{#journey-question-import}`

**Audience:** admin.
**Trigger:** admin uploads a PDF (or CSV) at `/admin/questions/import`.

**Steps:**

1. **PDF path:** admin drags PDF → creates `pdf_processing_jobs` row with `status='queued'` + per-module fields (`key`, `m1`–`m4`).
2. **Hybrid runner** (admin's local Claude-Code instance, off-platform) polls for queued jobs, downloads PDF from R2, extracts content via Claude API for each module, writes CSVs to R2 + updates job progress.
3. Once all modules complete, job sits with `status='complete'` + populated `csv_storage_paths`.
4. **Cloud cron `/api/cron/ingest-csv-inbox`** runs every 5 minutes. Auth via `CRON_SECRET` Bearer token.
5. Cron finds completed jobs with empty `imported_counts`, downloads CSVs from R2 (prefers native R2 binding; falls back to AWS SDK).
6. Parses CSV (parser duplicated from `BulkImportPanel`), calls `bulkImportRows()`. Deduplicates on `content_hash`. Rows that fail validation are inserted with `import_status='needs_review'`.
7. Updates job's `imported_counts` and marks `progress.stage='complete'`.
8. Questions are now visible at **`/admin/questions/review`**:
   - **Bank tab:** un-routed questions (node_id IS NULL). Admin bulk-accepts to auto-route by `concept_slug`.
   - **Flagged tab:** `needs_review` rows. Admin accepts (optionally picks node) or rejects.
9. Accepted questions become live in the bank (visible at `/admin/curriculum/[nodeId]` and to students via the lesson quiz engine).

### CSV path (manual)

1. Admin downloads template CSV, fills locally, uploads at `/admin/questions/import`.
2. Goes through same `bulkImportRows()` pipeline. No PDF job; CSV processed inline.

**Data touched:** `pdf_processing_jobs`, R2 storage, `quiz_questions`.
**External services:** R2 (PDF + CSV storage), Claude API (via hybrid runner, off-platform), Sentry (error capture).
**Failure modes:**

- Hybrid runner not running → PDFs queue indefinitely.
- CSV parser duplication risk (parser in UI changes but cron's copy doesn't).
- Cron caps at 20 jobs/run; backlog risk at scale.
- Cron returns 500 on R2 env-var lookup failure with no fallback.

---

What an unauthenticated visitor sees before they sign up.

### `/` — Homepage

- **What it is:** Conversion-focused landing page introducing Karman's diagnostic-first SAT prep platform with the 50-point score guarantee, founder bios, sample lessons, and pricing.
- **What the user does:** Scrolls through hero / diagnostic teaser / how-it-works, sees pricing tiers, reads social proof and founder bios, drops their email for the waitlist or clicks through to sign-up.
- **What "working" looks like:** Visitor lands, gets the pitch in under 10 seconds, and can either join the waitlist or start the trial.

### `/about` — Company story

- **What it is:** Founder story + mission + the four differentiators (diagnostic-first, live tutoring included, parent dashboards, 50-point guarantee).
- **What the user does:** Reads through, clicks "Start Free Trial."
- **What "working" looks like:** Founder photos render, mission copy is current, all CTAs deep-link to `/auth/sign-up`.

### `/faq` — Frequently asked questions

- **What it is:** Collapsible Q&A covering subscriptions, tutoring, progress tracking, the guarantee, and technical questions.
- **What the user does:** Expands answers, then jumps to sign-up or contact.
- 🚩 **Red flags:** Content lives in `FAQClient.tsx` — when you change pricing or policy, check that file too.

### `/guarantee` — 50-point score guarantee

- **What it is:** Full terms of the score improvement promise — eligibility, refund process, edge cases.
- **What the user does:** Reads requirements (16-week subscription, 80% session attendance, complete diagnostic, take official SAT), reviews refund FAQ, contacts `guarantee@karmanprep.com` if claiming.
- 🚩 **Red flags:** Refund-claim path is email-based. Make sure `guarantee@karmanprep.com` is monitored. Stated SLA is 3 business days.

### `/refunds` — Refund policy

- **What it is:** Full refund terms — 7-day trial money-back, 50-point guarantee mechanics, cancellation vs refund distinction, non-refundable items.
- **What the user does:** Reads, understands, takes action elsewhere.

### `/privacy` — Privacy policy

- **What it is:** Data collection, third-party services (Clerk, Stripe, Supabase, Resend, Sentry, PostHog), retention (90 days after cancellation), and user rights (CCPA / GDPR).
- **What the user does:** Reads, contacts `privacy@karmanprep.com` for subject access.

### `/terms` — Terms of service

- **What it is:** Full ToS — subscriptions, billing, session policies, the guarantee, acceptable use, IP, disclaimers, Texas governing law.
- 🚩 **Red flags:** Session-recording clause says group sessions are recorded by default, private/elite require explicit consent. The consent collection UI doesn't exist yet — ship that before recording anything.

### `/blog` — Blog hub (placeholder)

- **What it is:** "Coming soon" landing page with email capture for the launch list.
- 🚩 **Red flags:** Publicly linked from the footer with no actual content. Either ship a first article or drop the link from the footer.

### `/coming-soon` — Launch gate

- **What it is:** Holding page shown to all unsigned-in visitors when `NEXT_PUBLIC_KARMAN_LAUNCHED` isn't set. Email-capture for the launch list.
- **What "working" looks like:** Visitor enters email, sees confirmation, gets added to the waitlist. Once `NEXT_PUBLIC_KARMAN_LAUNCHED=true`, the homepage opens up.
- 🚩 **Red flags:** `robots.txt` set to no-index globally while gated. Flip that when you launch.

---

# Part 2 — Sign-up + onboarding flow

The path from "I want in" to "I'm in my first lesson."

### `/auth/sign-up` — Create account

- **What it is:** Clerk-powered signup with Karman branding and a 7-day free trial promise.
- **What the user does:** Enters email + password (or social), accepts terms, lands on onboarding.
- **What "working" looks like:** Account created, no payment yet required, immediately redirected to onboarding.

### `/auth/sign-in` — Sign in

- **What it is:** Clerk login screen.
- **What the user does:** Enters credentials, optionally resets password.
- **What "working" looks like:** Lands on their dashboard or onboarding step (whichever they last left off at).

### `/onboarding` — Role selection

- **What it is:** Single screen asking "are you a student, parent, or tutor?" — first step after signup.
- **What the user does:** Picks a role, clicks Continue.
- **What "working" looks like:** Role is saved to the user record; questionnaire shown next.

### `/onboarding/questionnaire` — Intake form

- **What it is:** Multi-step form collecting SAT target date, current scores, weekly availability (for 1:1 tiers), and family contacts. Runs the placement algorithm at the end.
- **What the user does:** Picks an upcoming SAT date, answers background questions, sets availability (Private/Elite only), gives parent contacts, submits.
- **What "working" looks like:** Sees a confirmation showing the assigned cohort name or tutor, then lands on `/dashboard/student`. The `onboarding_completed_at` timestamp is set.
- 🚩 **Red flags:**
  - If `placeInCohort` or `assignTutorOneToOne` throws, the error is silently caught — onboarding is marked complete with a `warning` field but no UI notification. Students slip through with no cohort/tutor and you only see it via admin alert. Add a clearer error path.
  - The fallback SAT-date list is hardcoded for 2026.

---

# Part 3 — Student experience

Everything a paying student lives in.

### `/dashboard/student` — Home dashboard

- **What it is:** The student's daily landing pad — streak, overall mastery ring, domain-by-domain heatmap, next-lesson card.
- **What the user does:** Sees their progress at a glance, clicks the next-lesson card to continue learning, or jumps to the diagnostic if they haven't taken it yet.
- **What "working" looks like:** Streak is current, mastery ring reflects today's progress, domain bars match the latest diagnostic + node mastery.

### `/diagnostic` — 35-question SAT diagnostic

- **What it is:** The one-time baseline assessment — 35 questions across Math + Reading & Writing, producing a score range, domain breakdown, and weak-topic list.
- **What the user does:** Reads instructions, answers 35 questions, submits, sees a preliminary score and the topics flagged for study.
- **What "working" looks like:** Diagnostic row appears in the database with score range (e.g. 1050–1150), domain percentages, and weak-topic tags. Student lands on a results screen with CTA to start learning.
- 🚩 **Red flags:**
  - **Admin-gated retakes.** A student can take the diagnostic once automatically; subsequent takes require an admin to grant via `actionGrantDiagnosticRetake` on `/admin/users` (writes `users.diagnostic_retakes_remaining`). Document this in the student-facing "no retakes available" message so students know to email support.
  - CTA copy branches on subscription status — test both signed-out and signed-in paths.

### `/learn` — Subject portal (Reading / Math)

- **What it is:** Two-pane chooser showing per-subject mastery stats. Pick Reading or Math to enter the constellation map.
- **What "working" looks like:** Counts (total nodes, mastered, available) match the database; clicking either lobe transitions smoothly.

### `/learn/reading` & `/learn/math` — Constellation maps

- **What it is:** Interactive visual map of every topic in a subject, arranged as a constellation. Each node shows status (locked / available / in-progress / mastered) and prerequisites.
- **What the user does:** Hovers / clicks nodes, sees prerequisites, opens unlocked lessons.
- **What "working" looks like:** Prerequisite chain is enforced (locked nodes stay grey until upstream nodes are mastered); statuses persist after refresh.
- 🚩 **Red flags:** Both lobes render on page load (`ConstellationMap` mounts the whole thing). Test on mobile.

### `/learn/[subject]/[nodeId]` — Lesson page

- **What it is:** A single concept's lesson — concept explanation, worked examples, and 2-5 practice questions.
- **What the user does:** Reads, works through questions, gets instant feedback, marks as mastered (or leaves in-progress).
- **What "working" looks like:** Quiz scores recorded; mastery status updates; downstream nodes unlock; best-score persists across attempts.

### `/dashboard/student/progress` — Progress tracker

- **What it is:** Detailed progress hub — diagnostic delta, domain heatmap, weak topics by domain, mastery counters.
- **What the user does:** Compares current vs first diagnostic, scans weak topics, sees cumulative mastery.
- **What "working" looks like:** Retake CTA shows when `users.diagnostic_retakes_remaining > 0` (admin-granted); otherwise hidden with copy explaining the gate.

### `/dashboard/student/predicted-sat` — SAT trajectory chart

- **What it is:** Multi-week chart projecting where the student's actual SAT score will land based on mastered nodes (+8 points per node).
- **What "working" looks like:** Chart shows projected band + actual diagnostic markers; baseline from first diagnostic.
- 🚩 **Red flags:** The +8-per-node projection is a rough heuristic with no per-domain or per-difficulty weighting. Consider labeling it as "estimate" so families don't take it literally.

### `/dashboard/student/schedule` — Session booking

- **What it is:** Where students see upcoming sessions and (for Private/Elite) book new ones via embedded Cal.com.
- **What the user does:** Sees the next session's date / time / Zoom link / tutor. Private/Elite: opens the Cal widget, picks a time, books it. Reschedules or cancels with the 24-hour rule.
- **What "working" looks like:** Upcoming session card always at top; Cal widget shows real availability; booking creates a row + sends a confirmation email.
- 🚩 **Red flags:**
  - ~~**Hardcoded Cal event-type id `5489022`.**~~ **RESOLVED 2026-05-16** — schedule page reads `users.cal_event_type_id` per tutor. Booking widget is gated when the tutor hasn't set theirs; admin gets a 24h-deduped alert email.
  - Elite token count (monthly limit) must be granted on subscription rollover; verify the granting cron exists.

### `/dashboard/student/chat` — Cohort chat + DMs

- **What it is:** The cohort's group discussion + tutor Q&A channel, plus 1:1 DMs with cohort peers and the tutor.
- **What the user does:** Posts messages, replies in Q&A, sends DMs to the tutor or a peer, attaches images.
- **What "working" looks like:** Messages appear in the right channel (cohort_chat for general, qa for tutor-moderated), show display name + avatar, sort chronologically.
- 🚩 **Red flags:**
  - **Flagged messages get held now (PR #30/#31).** Sender sees their own bubble with a "pending admin review" caption; recipient sees a placeholder. Until admin acts at `/admin/moderation`, the message never reaches Slack/recipient. This is intentional but means the queue must be watched.
  - Private students without a cohort see a "you're not in a cohort yet" empty state — verify the admin auto-assign path works.
  - Channels must be provisioned by admin from the cohort detail page. If skipped, the empty state remains.

### `/dashboard/student/mastered` — Mastered lessons gallery

- **What it is:** Filterable list of every node the student has mastered, with date, best score, attempt count.
- **What the user does:** Browses by subject/domain, sorts, clicks back into lessons to review or retake.

### `/billing` — Subscription management

- **What it is:** Shows current tier, trial status, and a button to Stripe's hosted customer portal.
- **What the user does:** Reviews subscription, opens the Stripe portal to update card / cancel / upgrade.
- 🚩 **Red flags:** Dashboard routes redirect here with `?required=1` if subscription lapses. Make sure that loop is unbreakable (no way to bypass).

---

# Part 4 — Parent portal

Read-only view linked parents get for their children's progress. Built deliberately small to protect student privacy.

### `/dashboard/parent` — Your students

- **What it is:** Landing page showing each student linked to this parent. Clickable cards with name, avatar, target SAT date.
- **What the user does:** Picks a student to drill into.
- **What "working" looks like:** Empty state if no links; otherwise cards render with avatars and dates.
- **Security model:** Parent must have a row in `parent_student_links` to see a student. Admins bypass for debugging.

### `/dashboard/parent/[studentId]` — Student summary

- **What it is:** Four-section read-only summary: student header, cohort card, most recent diagnostic, recent homework (up to 5).
- **What the user does:** Reads through the summary. That's it.
- 🚩 **Red flags:**
  - No messaging — parent can't contact the tutor from here.
  - No upcoming-session view — parent can't see when the next session is.
  - Diagnostic could be weeks stale and there's no "as of date" badge.

---

# Part 5 — Tutor portal

Scoped to "my students / my cohorts only."

### `/tutor` — My students home

- **What it is:** Tutor's home — cards for each cohort they lead + a roster table of all students assigned to them.
- **What the user does:** Clicks a cohort card to open the cohort detail (read-only mirror of admin's view) or clicks a student row to see that student's progress.
- 🚩 **Red flags:** Tutor cannot add/remove cohort members from this UI. Only admins can. Either document this clearly or build the tutor self-manage flow.

### `/tutor/schedule` — My schedule

- **What it is:** Calendar of upcoming + past sessions, filterable by tab (Upcoming / Seminars / Small Groups). Self-serve cancel + reschedule available.
- **What the user does:** Sees session time + student/cohort + tier + Zoom join button. Clicks Cancel or Reschedule on an upcoming row to act on it without admin intervention.
- **What "working" looks like:**
  - Times display in the tutor's `users.time_zone` (set during onboarding, defaults to `America/New_York` if missing).
  - Cancel respects the 24-hour rule from product policy (J4): inside 24h the cancel returns a 409 with a clear message.
  - Reschedule sends a booking-reschedule email to the student.

### `/tutor/earnings` — Earnings home

- **What it is:** Three lifetime cards (hours worked, lifetime earnings split into paid + pending, pending payout amount) + two CTAs (Request payout / View earning data).
- **What the user does:** Sees the headline, clicks through to detail or payouts.
- 🚩 **Red flags:** "Last refreshed" timestamp shown but no force-refresh button.

### `/tutor/earnings/data` — Earnings detail

- **What it is:** Sessions table with time-range filter + 12-week earnings chart.
- **What the user does:** Filters by week / month, inspects sessions and their pay status.

### `/tutor/payouts` — Get paid

- **What it is:** The payout flow — hero with two big buttons (Instant via debit / ACH via bank), eligible-sessions table, payout history (last 10).
- **What the user does:** Confirms Stripe onboarding is done, picks Instant or ACH, sees the request appear in history.
- **What "working" looks like:** Instant button disabled if no debit card on file; ACH always available once onboarded; eligible sessions clear from the table after request.
- 🚩 **Red flags:**
  - History capped at 10 rows.
  - Stripe-account-status fetch failures silently disable the Instant button (no error shown).

### `/tutor/settings/payment` — Payment settings

- **What it is:** Stripe Connect onboarding form.
- **What the user does:** Connects bank + debit card via Stripe-hosted flow.
- **What "working" looks like:** Status changes to "Connected as [name]" and payouts unlock.

### `/tutor/cohort/[id]` — Cohort detail (read-only)

- **What it is:** Members + Notes + Homework tabs, but tutor can only read. No add/remove members, no editing notes.
- 🚩 **Red flags:** UI may _look_ interactive but isn't. If a button is hidden but the row shows hover state, that's a discoverability bug — make read-only state more obvious.

### `/tutor/[studentId]` — Student detail

- **What it is:** Tutor's read-only view of one student — name, SAT target, cohort, current topic, recent diagnostic, recent homework.
- 🚩 **Red flags:** No way to message the student from this view.

---

# Part 6 — Admin console

The most feature-rich surface. Admin-only (real role, not impersonation).

### `/admin/curriculum` — Curriculum browser

- **What it is:** Dark-themed tree of all SAT curriculum nodes with live question counts + a "Flagged" tab for questions awaiting resolution.
- **What the user does:** Clicks into a node to open its editor, or opens the Flagged tab and bulk-accepts bank questions by concept slug.
- 🚩 **Red flags:** Bulk-accept silently skips questions whose slug doesn't map to a node. No UI warning. Easy to lose track of strays.

### `/admin/curriculum/[nodeId]` — Node editor

- **What it is:** The deep editor for one concept — question CRUD, textbook URL, video upload, image upload, flagged-question handling, drag-to-reorder.
- **What the user does:** Adds/edits/deletes questions, uploads videos to Supabase, pastes textbook links, accepts/rejects flagged-on-import questions, reorders.
- 🚩 **Red flags:**
  - No bulk-delete on questions.
  - No undo on save — destructive edits are permanent.

### `/admin/questions/import` — PDF + CSV import

- **What it is:** Two panels: drag PDFs in for automated extraction via the hybrid pipeline, OR drop a hand-built CSV for direct import.
- **What the user does:** Drops PDFs (or CSVs), waits for processing.
- 🚩 **Red flags:**
  - CSV validation runs only client-side for row parsing; server-side schema check happens after upload.
  - No preview-before-upload — admin can't see which rows will be flagged until after.

### `/admin/questions/review` — Triage queue

- **What it is:** Two tabs: "Flagged" (questions PDF-import marked as needing review) and "Bank" (un-flagged but un-routed). One-click accept, route-to-node, or reject. **Bulk-reject available** (multi-select checkboxes + "Reject N selected" — PR #49).
- **What the user does:** Triages questions; bulk-accepts the Bank tab; manually accepts or rejects Flagged tab questions; multi-selects + bulk-rejects bad-import batches; filters by flag type / domain / source PDF.
- 🚩 **Red flags:**
  - Bulk-accept silently skips slug mismatches.

### `/admin/questions/preview` — Search + preview

- **What it is:** Full-text search across all questions with read-only preview.
- **What the user does:** Searches by text, opens results in a preview card, follows back-links to the source node or PDF job.

### `/admin/cohorts` — Cohort list

- **What it is:** Roster of every cohort (active + archived). Create / edit / open detail. Empty cohorts auto-archive, but archived rows still appear in the list with an Unarchive button.
- **What the user does:** Reviews active cohorts, creates a new one (name + tier + max size + SAT date + tutor), opens detail to manage members. To revive an auto-archived cohort, clicks **Unarchive** on its row.
- **What "working" looks like:** Active cohorts render on top; archived ones below (or grouped by a toggle). Unarchiving sets `archived_at = NULL` and the row moves to the active group on the next refresh.

### `/admin/cohorts/[id]` — Cohort detail

- **What it is:** Three tabs — Members (add/remove), Notes (admin freeform), Homework (assignments).
- **What the user does:** Adds students one at a time, posts assignments, writes admin notes.
- 🚩 **Red flags:**
  - **No confirm before remove.** One click kicks a student.
  - No bulk-add.
  - Homework editor auto-saves with no cancel — typos persist.

### `/admin/users` — User management

- **What it is:** Searchable table of every user with role-change dropdown, parent-student link manager, and cohort filter.
- **What the user does:** Searches, changes roles (student/tutor/parent/admin), links a parent to a student.
- 🚩 **Red flags:**
  - No bulk role-change.
  - No soft-delete / deactivation flow.

### `/admin/revenue` — Revenue dashboard

- **What it is:** SaaS metrics — MRR / ARR / ARPU / churn / LTV / cohort retention / per-tutor revenue / dunning queue / 3-6-12mo forecast / MRR trend.
- **What the user does:** Reviews the numbers, clicks "Snapshot now" to capture the current MRR for the trend chart.
- 🚩 **Red flags:**
  - **All metrics computed from Supabase**, not Stripe. The code calls itself a "swap-in point" — when you go live, expect divergence from Stripe's billing dashboard until the queries get migrated.
  - Forecast uses a hardcoded `ESTIMATED_SESSIONS_PER_MONTH = 4` with no per-tier tuning.

### `/admin/jobs` — PDF processing queue

- **What it is:** Status board for in-flight PDF imports. Each PDF runs through 4 modules; the board shows per-module status.
- **What the user does:** Drops a PDF on `/admin/questions/import`, then comes here to watch progress.
- 🚩 **Red flags:**
  - **No auto-refresh.** Must F5 manually.
  - **No retry button.** Failed module = re-upload the whole PDF.

### `/admin/moderation` — Content review queue (NEW, PRs #30–#31)

- **What it is:** Two-tab triage for flagged chat messages + DMs. **Flagged content is now held back from delivery until an admin acts.**
- **What the user does:**
  - **Pending tab** — sees each flagged message with sender, channel, the AI/keyword reason, and prior-warnings badge. Per row: Approve & deliver / Reject / Warn sender.
  - Approve → posts to Slack (chat) or makes visible (DM), writes audit row.
  - Reject → hides permanently, sender sees rejection notice.
  - Warn → records a warning with severity (low / medium / high) + reason; tied to the triggering message in audit.
  - Click sender name → opens drawer: warning count, recent flagged messages, recent admin actions.
  - Content search box filters by substring.
  - **History tab** — read-only rejected backlog.
- 🚩 **Red flags:**
  - **The Slack post is the load-bearing side effect on approve.** If Slack is down when the admin clicks approve, the DB flips to approved but the message doesn't reach Slack. The route returns 502 but the DB write has already happened. Re-clicking approve will 409 ("already approved"). You'd have to manually post via Slack.
  - **No edit-before-approve.** If a flagged message is borderline but fixable (typo + a word), admin can't tweak it.
  - **No bulk action.** One-by-one only.

### Admin impersonation — "View as" menu

- **What it is:** Header dropdown + per-user **Impersonate** button on `/admin/users`. Two cookie layers: `karman_impersonate_role` (which role to render) and `karman_impersonate_user_id` (which specific clerk_id to scope queries to). Both have a 2-hour TTL.
- **What the user does:**
  - Generic mode: clicks View as → picks a role → lands on that role's home with seeded data.
  - **Targeted mode (Phase 1, PR #51):** clicks **Impersonate** on a student row in `/admin/users` → lands on that specific student's actual dashboard / progress / chat. The yellow impersonation banner shows their name + "Exit impersonation".
- **What "working" looks like:** Full UI access scoped to the targeted user's data. Real role stays admin in the DB; all mutations the admin performs log under their true identity (server actions use `resolveEffectiveClerkId` which returns the impersonated user for reads but the admin for audit fields).
- 🚩 **Red flags:**
  - **Tutor + parent surfaces** still use generic impersonation. Phase 2 (PR #64, open) migrates them to `resolveEffectiveClerkId` for proper per-user scoping.

---

# Part 7 — Behind the scenes

What happens when no one is clicking — webhooks, crons, and the moderation pipeline.

## 7.1 Webhooks (Karman listens; someone else triggers)

### Stripe subscription webhook — `/api/stripe/webhook`

- **What it is:** Listens for subscription lifecycle events (created, updated, cancelled, refunded).
- **What triggers it:** Stripe pings every time a customer changes subscription state.
- **What it does:** Upserts subscription row → restores or drops cohort membership → sends welcome email → logs refunds for revenue reporting → auto-provisions Slack channels for restored cohorts.
- **What "working" looks like:** Subscription row matches Stripe's state; student gains/loses cohort access automatically; welcome email arrives; refund shows up on `/admin/revenue`.
- 🚩 **Red flags:**
  - Cohort restore + Slack provision are `.catch()`-wrapped — if Slack provisioning fails, the rest succeeds but Slack channels never get created for that cohort. Logged, not retried.
  - Signature verification is solid (uses `constructEventAsync`).

### Stripe Connect payout webhook — `/api/webhooks/stripe-connect`

- **What it is:** Tracks tutor payouts (Stripe Connect account events).
- **What triggers it:** Stripe fires on `account.updated`, `payout.paid`, `payout.failed`.
- **What it does:** Logs raw payload, dedupes on event ID. `account.updated` refreshes `stripe_payouts_enabled`. `payout.paid` marks request + linked sessions as paid + refreshes earnings view. `payout.failed` marks request as failed + emails admin.
- **Reliability:** Processing failures now retry up to `MAX_PROCESSING_ATTEMPTS` (PR #48). The webhook row tracks `attempts`, `error_message`, and `gave_up_at`. After give-up, the route returns 200 so Stripe stops retrying — admin email is the page.

### Cal.com booking webhook — `/api/webhooks/cal`

- **What it is:** Syncs booking confirms / cancels / reschedules from Cal.com → Karman, then sends emails.
- **What triggers it:** Cal.com fires on `BOOKING_CREATED`, `BOOKING_CANCELLED`, `BOOKING_RESCHEDULED`, `MEETING_ENDED`.
- **What it does:**
  - On create: extracts Zoom meeting id from the location string, sends confirmation email to student + parents + tutor.
  - On cancel: checks the 24-hour window. If inside it + tier policy says forfeit, consumes a session token. Marks booking cancelled. Sends cancellation email with forfeit status.
  - On reschedule: updates times, sends email only if new time differs by >1 second (dedupes Cal redeliveries).
- 🚩 **Red flags:**
  - **Email failures silently swallowed.** Resend down at the wrong moment = booking confirms in DB but student never knows. Webhook returns 200; Cal won't retry.
  - The >1-second freshness check is fragile — millisecond skew could let duplicates through, or a legit edit could get filtered out.
  - Default timezone fallback is `America/New_York` if no attendee has one set.

### Zoom attendance webhook — `/api/webhooks/zoom`

- **What it is:** Tracks join/leave timestamps for Zoom sessions, finalizes attendance.
- **What triggers it:** Zoom fires `meeting.participant_joined`, `meeting.participant_left`, `meeting.ended`.
- **What it does:** Records join/leave intervals in attendance_log. On meeting.ended: closes open intervals + flips bookings to `completed` or `no_show`.
- 🚩 **Red flags:**
  - Email mismatches between Zoom and the booking record silently skip attendance. If a student joins from a different email than what we know, their attendance won't record.
  - Logs warnings (not errors) for unmatched joins — easy to miss in noise.
  - `meeting.ended` falls back to webhook-arrival time if Zoom omits `end_time` — could be minutes off.

### Seminar overflow webhook — `/api/webhooks/seminar-overflow`

- **What it is:** Auto-creates an "Overflow" sibling cohort when a seminar passes 200 students.
- **What triggers it:** Supabase Database Webhook on `cohort_members` INSERT.
- **What it does:** Counts active members; if >200, creates `<name> · Overflow` (or " · Overflow 2") with same tutor + SAT date; emails admins with rebalancing instructions.
- 🚩 **Red flags:**
  - **Doesn't provision Cal event or Zoom integration.** If admin forgets, students sit in a cohort with no meetings. Mitigated _somewhat_ by PR #32 archive-on-empty, but only if students never join.
  - No "this needs Cal/Zoom config" admin badge or follow-up reminder.

### Slack Events webhook — `/api/webhooks/slack`

- **What it is:** Validates signatures + acknowledges Slack Events API callbacks. Currently logs only — no side effects.
- 🚩 **Red flags:**
  - Tutors who post natively _in Slack_ don't get their messages mirrored into Karman's UI, and the moderation pipeline doesn't run on those posts. Known MVP limitation. Document for tutors that they should use Karman's chat surface, not Slack directly, for moderated channels.

### Fireflies transcript webhook — `/api/webhooks/fireflies-transcript`

- **What it is:** Receives meeting transcripts, fetches full text via GraphQL, matches to a booking, generates a recap draft via OpenAI.
- **What triggers it:** Fireflies pings when a transcript is ready.
- **What it does:** Logs raw payload + dedups on `external_event_id`. Fetches transcript. Matches to booking via (1) zoom_meeting_id direct match, (2) URL substring match, (3) ±60-min time-window fallback. Generates recap (personalized for 1:1, anonymized for group). Stores on the booking + notifies the tutor.
- 🚩 **Red flags:**
  - **±60-min time-window fallback can mismatch.** Two sessions within an hour of each other and only one has Zoom IDs → wrong booking gets the recap.
  - OpenAI generation failures fall through to "write recap manually" notification — no retry.
  - Query-param token auth (weaker than HMAC but acceptable for Fireflies).

## 7.2 Crons (Karman runs on a schedule)

### CSV ingestion — `POST /api/cron/ingest-csv-inbox`

- **What it is:** Polls completed PDF jobs, downloads their CSVs from R2, imports questions into the bank.
- **What triggers it:** Cloudflare Worker cron every 5 minutes + manual trigger after PDF upload.
- **What it does:** Auth via `CRON_SECRET`. Finds jobs with `status='complete'` + populated CSV paths + empty imported counts. Downloads via R2 binding (or AWS SDK fallback). Parses + bulk-imports rows. Updates job's `imported_counts` and marks progress complete.
- 🚩 **Red flags:**
  - Caps at 20 jobs per run. If queue grows faster than 5min/20jobs, backlog builds.
  - **CSV parser is a duplicate of the UI's parser.** Drift risk.

### SAT dates sync — `GET /api/cron/sync-sat-dates`

- **What it is:** Daily scrape of College Board's official test-date page to keep `sat_dates` table fresh.
- **What triggers it:** Cloudflare Worker cron `0 6 * * *` (6am daily).
- **What it does:**
  1. Seeds `sat_dates` from `STATIC_SAT_DATES` (12-month list checked into the repo) with `ignoreDuplicates: true` — guarantees the table is never empty even if the scraper fails.
  2. Fetches + parses the College Board page. If the scrape returns ≥1 date, upserts on `test_date` (live data overwrites the seed). If it returns 0 (page layout changed), the seed stays in place and the response includes `used_fallback: true` so Sentry surfaces the regression without breaking onboarding.
- **Why this matters:** Onboarding lists are now resilient to College Board page redesigns — the worst case is "static-seed dates served until the parser is patched", not "no SAT dates available, onboarding broken".

## 7.3 Moderation pipeline (deep dive)

This is the system that decides what happens to every chat message and DM.

### Three layers, fail-CLOSED

- **Layer 1 — Keyword + regex blocklist** (instant, text-only): matches explicit profanity, slurs, sexual terms, self-harm signals, PII patterns. Hit → reject.
- **Layer 2 — OpenAI Moderation** (multimodal, 4-sec hard timeout): categorizes text + image URLs. Returns flagged boolean + per-category scores. Error or timeout → reject (fail-CLOSED).
- **Layer 2.5 — Karman bullying classifier** (text-only, additive, runs in parallel with Layer 2): school-audience-specific prompt ("would a parent be upset to see this?"). Error → logged + ignored (Layer 2 alone is enough).

### Decision logic

- Layer 1 hit → **rejected** (blocklist message shown to sender).
- Recent-approved sender (`hasRecentApprovedSend` within 5 min) → **skip Layer 2 + 2.5**, accept. Layer 1 still ran above, so the cache can't bypass the safety floor. This is the OpenAI-outage uptime path.
- Layer 2 errors → **rejected** (fail-closed) — for senders without a cache hit.
- Layer 2 flagged + HIGH category (sexual/self-harm/violence) → **rejected**.
- Layer 2 flagged + score ≥ 0.5 → **rejected** (school-audience threshold).
- Layer 2.5 flagged → **rejected** (Karman's specific judgment overrides borderline OpenAI scores).
- Layer 2 flagged (score < 0.5) + Layer 2.5 clean → **approved_with_flag**: **HELD** for admin review (PR #30 behavior change). Sender sees own bubble with "pending" caption; recipient sees placeholder. Admin acts at `/admin/moderation`.
- Both clean → **approved** (posts to Slack immediately for chat).

### Downstream

- Rejected + approved_with_flag → `/admin/moderation` Pending tab.
- Admin approves → posts to Slack now + writes `moderation_actions` audit row.
- Admin rejects → permanent hide + audit row.
- Admin warns → audit row with severity, prior-warnings badge updates next time sender appears in queue.

## 7.4 Background jobs

### PDF processing pipeline

- Lifecycle: queued → running → partial / complete → failed.
- Per-module tracking: `key` (answer-key extraction), `m1`–`m4` (SAT R&W Modules 1–2, Math Modules 1–2).
- **Hybrid runner:** admin's local Claude-Code instance picks up queued jobs, extracts content via Claude API, writes CSVs to R2. The cloud cron then ingests those CSVs into the question bank.
- Imported questions land in `quiz_questions` flagged "needs_review" if validation fails; visible on `/admin/questions/review`.

### Empty-cohort archival (PR #32)

- **No cron.** Triggered inline by:
  - Stripe webhook dropping a student (subscription canceled / past-due / etc.).
  - Admin manually removing a student from a cohort.
- If remaining active member count is zero, sets `cohorts.archived_at = now()`. Archived cohorts vanish from `/admin/cohorts`, `/tutor`, dropdowns, and onboarding placement candidates.
- **Reverses automatically** if an admin adds a student back or Stripe restore-last-cohort fires.

---

## Smoke-test checklist

Here's a tight click-through to validate the most important flows. Run `npm run dev:next` and walk these in order. Sign in via Clerk first (the dev preview can't bypass auth).

### Public site (no auth)

- [ ] Homepage loads. CTAs link out correctly.
- [ ] `/about`, `/faq`, `/guarantee`, `/refunds`, `/privacy`, `/terms` all render.
- [ ] `/blog` shows coming-soon (or has been replaced with content).

### Sign-up & onboarding (one test student)

- [ ] `/auth/sign-up` creates an account.
- [ ] `/onboarding` lets you pick student role.
- [ ] `/onboarding/questionnaire` validates required fields per tier and saves answers.
- [ ] On submit, you land on `/dashboard/student` with placement info.

### Student experience

- [ ] `/dashboard/student` renders without errors. Domain bars present.
- [ ] `/diagnostic` works end-to-end. Result saves.
- [ ] `/learn/reading` and `/learn/math` render constellations.
- [ ] Open a lesson, answer questions, mark mastered. Verify mastery persists.
- [ ] `/dashboard/student/progress` shows the latest diagnostic + delta.
- [ ] `/dashboard/student/schedule` loads. Booking widget shows the tutor's actual `cal_event_type_id` (per-tutor lookup). If your assigned tutor hasn't set theirs yet, the widget is gated and an admin email fires — that's the expected pre-onboarding state.
- [ ] `/dashboard/student/chat` loads. Send a clean message — should post to Slack. Send a message containing a profanity — should get rejected with the standard "breaches our terms" line.
- [ ] `/billing` loads. Stripe portal link works (test mode).

### Admin (as an admin user)

- [ ] `/admin/curriculum` shows nodes with counts.
- [ ] `/admin/cohorts` lists cohorts. Create a test cohort.
- [ ] `/admin/cohorts/[id]` Members tab: add a test student, then remove. Verify cohort auto-archives (vanishes from `/admin/cohorts`).
- [ ] `/admin/users` lets you change a user's role.
- [ ] `/admin/revenue` renders metrics.
- [ ] `/admin/moderation` Pending tab: send a borderline chat message as a test student first to populate. Approve from the queue and verify it appears in Slack. Reject another and verify the sender sees the rejection notice.
- [ ] "View as" dropdown: switch to student. Verify you see the student dashboard. Refresh `/admin/*` to switch back.

### Tutor (as a tutor user)

- [ ] `/tutor` shows your cohorts + roster.
- [ ] `/tutor/schedule` shows upcoming + past sessions.
- [ ] `/tutor/earnings` shows three cards.
- [ ] `/tutor/payouts` flow loads (test-mode Stripe Connect).

### Parent (as a parent linked to a student)

- [ ] `/dashboard/parent` shows your linked students.
- [ ] `/dashboard/parent/[studentId]` shows the four-section summary.

### Background (can't fully test from the browser — verify in Supabase)

- [ ] Cancel a test subscription in Stripe → check that the student gets dropped from their cohort.
- [ ] Re-subscribe → check that they get restored.
- [ ] Send a Slack-bound chat message → check the cohort's Slack channel.
- [ ] Wait 24h or trigger manually → check `/admin/jobs` shows the daily SAT-date sync ran.

---

# Feature index

Stable IDs for cross-reference. Use these when an AI needs to cite a specific feature.

## Public marketing

- `feat.marketing.homepage` → `/`
- `feat.marketing.about` → `/about`
- `feat.marketing.faq` → `/faq`
- `feat.marketing.guarantee` → `/guarantee`
- `feat.marketing.refunds` → `/refunds`
- `feat.marketing.privacy` → `/privacy`
- `feat.marketing.terms` → `/terms`
- `feat.marketing.blog` → `/blog` (placeholder)
- `feat.marketing.coming-soon` → `/coming-soon` (launch gate)

## Auth & onboarding

- `feat.auth.sign-up` → `/auth/sign-up`
- `feat.auth.sign-in` → `/auth/sign-in`
- `feat.auth.sync-user` → `POST /api/auth/sync-user`
- `feat.onboarding.role-select` → `/onboarding`
- `feat.onboarding.questionnaire` → `/onboarding/questionnaire`
- `feat.onboarding.submit` → `POST /api/onboarding/submit`

## Student experience

- `feat.student.home` → `/dashboard/student`
- `feat.student.diagnostic` → `/diagnostic`
- `feat.student.learn-portal` → `/learn`
- `feat.student.constellation-reading` → `/learn/reading`
- `feat.student.constellation-math` → `/learn/math`
- `feat.student.lesson` → `/learn/[subject]/[nodeId]`
- `feat.student.progress` → `/dashboard/student/progress`
- `feat.student.predicted-sat` → `/dashboard/student/predicted-sat`
- `feat.student.schedule` → `/dashboard/student/schedule`
- `feat.student.chat` → `/dashboard/student/chat`
- `feat.student.mastered` → `/dashboard/student/mastered`
- `feat.student.billing` → `/billing`

## Booking APIs (student-facing)

- `feat.api.bookings.create` → `POST /api/bookings/create`
- `feat.api.bookings.cancel` → `POST /api/bookings/cancel`
- `feat.api.bookings.reschedule` → `POST /api/bookings/reschedule`

## Chat APIs (student-facing)

- `feat.api.chat.send` → `POST /api/chat/send`
- `feat.api.chat.dm` → `POST /api/chat/dm`
- `feat.api.chat.messages` → `GET /api/chat/messages`
- `feat.api.chat.dm-read` → `POST /api/chat/dm/read`
- `feat.api.chat.pin` → `POST /api/chat/pin`
- `feat.api.chat.highlight` → `POST /api/chat/highlight`
- `feat.api.chat.upload` → `POST /api/chat/upload`

## Parent portal

- `feat.parent.home` → `/dashboard/parent`
- `feat.parent.student-detail` → `/dashboard/parent/[studentId]`

## Tutor portal

- `feat.tutor.home` → `/tutor`
- `feat.tutor.schedule` → `/tutor/schedule`
- `feat.tutor.earnings` → `/tutor/earnings`
- `feat.tutor.earnings-detail` → `/tutor/earnings/data`
- `feat.tutor.payouts` → `/tutor/payouts`
- `feat.tutor.payment-settings` → `/tutor/settings/payment`
- `feat.tutor.cohort-detail` → `/tutor/cohort/[id]` (read-only)
- `feat.tutor.student-detail` → `/tutor/[studentId]` (read-only)

## Admin console

- `feat.admin.curriculum` → `/admin/curriculum`
- `feat.admin.curriculum-node` → `/admin/curriculum/[nodeId]`
- `feat.admin.questions-import` → `/admin/questions/import`
- `feat.admin.questions-review` → `/admin/questions/review`
- `feat.admin.questions-preview` → `/admin/questions/preview`
- `feat.admin.cohorts` → `/admin/cohorts`
- `feat.admin.cohort-detail` → `/admin/cohorts/[id]`
- `feat.admin.users` → `/admin/users`
- `feat.admin.revenue` → `/admin/revenue`
- `feat.admin.jobs` → `/admin/jobs`
- `feat.admin.moderation` → `/admin/moderation` ← PR #30/#31
- `feat.admin.impersonation` → "View as" dropdown in admin header

## Admin moderation APIs

- `feat.api.admin.moderation.list` → `GET /api/admin/moderation`
- `feat.api.admin.moderation.approve` → `POST /api/admin/moderation/approve`
- `feat.api.admin.moderation.reject` → `POST /api/admin/moderation/reject`
- `feat.api.admin.moderation.warn` → `POST /api/admin/moderation/warn`
- `feat.api.admin.moderation.sender` → `GET /api/admin/moderation/sender/[userUuid]`

## Other admin APIs

- `feat.api.sessions.push` → `POST /api/sessions/push` (admin sends out group sessions)
- `feat.api.cohorts.provision` → `POST /api/cohorts/provision` (admin re-runs Slack channel setup)
- `feat.api.attendance.override` → `POST /api/attendance/override` (admin/tutor flips attendance)

## Webhooks (external services call us)

- `feat.webhook.stripe-subscription` → `/api/stripe/webhook`
- `feat.webhook.stripe-connect` → `/api/webhooks/stripe-connect`
- `feat.webhook.cal` → `/api/webhooks/cal`
- `feat.webhook.zoom` → `/api/webhooks/zoom`
- `feat.webhook.seminar-overflow` → `/api/webhooks/seminar-overflow`
- `feat.webhook.slack` → `/api/webhooks/slack` (logging-only today)
- `feat.webhook.fireflies-transcript` → `/api/webhooks/fireflies-transcript`

## Crons (Karman runs on a schedule)

- `feat.cron.ingest-csv-inbox` → `POST /api/cron/ingest-csv-inbox` (every 5 min)
- `feat.cron.sync-sat-dates` → `GET /api/cron/sync-sat-dates` (daily 6am)

## Pipelines (multi-step background)

- `feat.pipeline.moderation` → `src/lib/moderation/pipeline.ts` (3-layer: keyword + OpenAI + Karman)
- `feat.pipeline.pdf-jobs` → `pdf_processing_jobs` lifecycle + hybrid runner
- `feat.pipeline.archive-empty-cohorts` → PR #32 (inline, no cron)

## Journeys

- `journey-signup-to-first-lesson` (J1)
- `journey-seminar-lifecycle` (J2)
- `journey-book-private-session` (J3)
- `journey-cancel-reschedule` (J4)
- `journey-chat-send` (J5)
- `journey-admin-moderation` (J6)
- `journey-session-recap` (J7)
- `journey-tutor-payout` (J8)
- `journey-churn-and-archive` (J9)
- `journey-question-import` (J10)

---

## What's intentionally not in this doc

- **Implementation details.** This is the user-facing inventory. For "how does X work in code," start at the file paths in CLAUDE.md or `docs/architecture.md`.
- **Database schema.** See `supabase/migrations/` for table-by-table truth.
- **Specific bug fixes for the red flags.** Each flagged item is a candidate for its own PR. Pick by impact + urgency.

---

_Generated 2026-05-14 from a three-agent codebase survey + audit. Re-run the survey whenever a big batch of PRs lands._
