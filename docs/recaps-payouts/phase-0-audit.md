# Phase 0 — Codebase Audit for Status Email Automation & Tutor Earnings

**Purpose:** reconcile the spec (which assumes a generic LMS schema) with what
KarmanPrep actually has, before any migrations run. Read top to bottom; the
"Decisions needed" section at the bottom is the only thing blocking Phase 1.

---

## Tables that exist

| Table | Rows | Relevance |
|---|---|---|
| `users` | 665 | Single source of truth for **all roles** — student, tutor, admin, parent. Has `clerk_id`, `role`, `email`, `first_name`, `last_name` plus 20+ student-specific fields (sat_test_date, parent_email_collected, etc.) |
| `bookings` | 86 | The "sessions" of the spec. Has `tutor_id`, `student_id`, `plan_tier`, `zoom_meeting_id` (✓ already exists), `zoom_join_url`, `scheduled_start`, `scheduled_end`, `duration_minutes`, `status` (scheduled/cancelled/completed) |
| `cohorts` | 23 | Has `tutor_user_id` (not `tutor_id`), `tier`, `sat_date`, `current_topic`, `status` |
| `cohort_members` | 309 | Composite PK `(cohort_id, user_id)` |
| `tutor_notes` | 2 | Already supports per-student AND per-cohort notes via `tutor_user_id`/`student_user_id`/`cohort_id` |
| `tutor_node_overrides` | 0 | Empty but exists — skill-tree override audit log |
| `quiz_questions`, `quiz_attempts`, `flagged_questions` | — | Q&A engine, irrelevant here |

## Tables the spec assumes — **DO NOT EXIST**

- `tutors` — collapse into `users` filtered by `role='tutor'`
- `students` — same, `role='student'`
- `sessions` — collapse into `bookings`
- `notifications` — needs to be created
- `homework` — could collapse into `tutor_notes` OR build a dedicated table; recommend dedicated
- `student_parents` — recommend create (cleaner than free-text arrays on a student row)

## Infra already wired

- ✅ **Resend** (`resend ^6.12.2`) — helper layer at [src/lib/resend/client.ts](../src/lib/resend/client.ts), templates at [src/lib/resend/booking-emails.ts](../src/lib/resend/booking-emails.ts), [src/lib/resend/emails.ts](../src/lib/resend/emails.ts). Used in Stripe webhook + booking confirmation + waitlist.
- ✅ **Cloudflare Cron Triggers** in `wrangler.toml` already running 2 jobs (`*/5` and `0 6`). Adding another cron is just one new line in `wrangler.toml` + one new entry in [scripts/patch-cf-worker.mjs](../scripts/patch-cf-worker.mjs)'s `__KARMAN_CRON_ROUTES` map. Vercel Cron config from spec is moot.
- ✅ **`bookings.zoom_meeting_id`** already exists — answers spec Q2 directly. Webhook can match by Zoom meeting ID. (Currently null on samples; Stripe-auto-places flow may need to populate it — confirm separately.)
- ✅ **Stripe** wired up — see [src/app/api/stripe/webhook/route.ts](../src/app/api/stripe/webhook/route.ts)

## Infra **NOT** in place

- ❌ **Twilio** — not installed (`twilio` not in package.json)
- ❌ **OpenAI** — not installed (Gemini installed for the PDF pipeline, separate concern)
- ❌ **RLS via Clerk JWT** — codebase pattern is **server actions + service-role + Clerk-side `requireRole()`**, not Supabase RLS with `auth.jwt() ->> 'sub'`. The spec's RLS policies (Migration 1.8) would be ineffective because Clerk JWT isn't passed to Supabase by default. Recommend: drop the RLS policies from the spec, gate everything in server actions instead (matches existing pattern).

---

## Decisions made automatically by codebase reality

| Spec ambiguity | Resolved by codebase |
|---|---|
| Q2 — Zoom matching | `bookings.zoom_meeting_id` already exists. Webhook keys on it. |
| Q10 — Cron platform | Cloudflare Cron Triggers (already wired) |
| Q11 — Resend wiring | Already done |
| Q12 — RLS pattern | Skip RLS, use server-action role gating |

---

## Decisions still needed (must lock before Phase 1)

The spec's 7 questions plus 2 new ones from the codebase:

### 1. Tutor rate model
Spec offers both `hourly_rate` and `rate_per_session`. Pick one:
- **Hourly** — `users.hourly_rate NUMERIC(8,2)`, payout = hourly × duration_minutes/60
- **Per-session flat** — `users.rate_per_session NUMERIC(8,2)`, payout = flat regardless of duration
- **Tier-based default** — admin sets per-tier rate (Seminar / Small Group / Private / Elite), no per-tutor override

Recommendation: **support all three** (hourly_rate + rate_per_session + tier-default fallback) like spec does, but pick one as the default. Tier-based is most aligned with KarmanPrep's plan-tier model.

### 2. Fathom vs Fireflies
Both have webhook + transcript APIs. Pick one for now (you can add the other later by registering a second route — same handler shape).

Recommendation: **Fathom**. Cleaner API, native Zoom integration, $19/mo for Pro.

### 3. Parent SMS opt-in (TCPA)
Texting parents without explicit opt-in is illegal in the US. Required:
- Add `users.sms_opt_in BOOLEAN DEFAULT FALSE` (or on the `student_parents` table if we go that route)
- Onboarding step where parent ticks a consent box ("I agree to receive session recap SMS notifications")
- Reply STOP unsubscribe handler in the Twilio webhook

Decision: **opt out of SMS for v1**, ship email-only. Add SMS in a follow-up once the consent flow is built. Recap email already covers the use case for parents who check email.

### 4. Group-class recaps
For Seminar / Small Group cohorts:
- **Option A** — one personalized recap per student per session (transcript + GPT-4 generates one per student, mentions their specific contributions)
- **Option B** — one shared recap for the whole cohort, sent to all members and parents
- **Option C** — only generate recaps for Private / Elite (1:1) sessions, skip groups entirely in v1

Recommendation: **Option C for v1**. Group classes are a different rhythm — one recap per student is expensive (GPT-4 cost × 8 students), one shared recap is impersonal. Defer until you decide.

### 5. Tutor signature
- **Uniform** — always `Best regards, {first_name} {last_name}` from `users` row
- **Per-tutor customizable** — add `users.email_signature TEXT`, tutor edits in `/tutor/settings/profile`

Recommendation: **uniform for v1**, customizable later. One less field to populate before launch.

### 6. Webhook idempotency
Fathom sends a unique event ID per webhook delivery. Dedup on it.
- Add `webhook_events.external_event_id TEXT` with a unique index per `(source, external_event_id)`
- On duplicate, return 200 immediately without re-processing

Decision: **yes, do this**. Cheap insurance.

### 7. (NEW) `bookings` extended vs separate `sessions` table
Should we extend `bookings` (which is "scheduled or happened"), or create a new `sessions` table for "actually happened"?

- **Extend bookings** (recommended) — a cancelled booking has `status=cancelled` and won't have a transcript. A completed booking with a transcript IS the session record. Simpler, fewer joins.
- **Separate sessions** — cleaner conceptual split, but doubles the row count and forces a join on every recap query

Recommendation: **extend `bookings`**. All transcript / recap / payout columns get added there.

### 8. (NEW) Parent linkage
Parents likely already exist as `users.role='parent'` rows (since `/dashboard/parent/[studentId]` is a working route). How is the student↔parent link stored today?

If there's no current linkage, recommend create:
```sql
CREATE TABLE student_parents (
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_primary      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_user_id, parent_user_id)
);
```

Then recap recipients = student.email + every parent_user_id's email (no free-text arrays).

I need to verify whether the parent linkage already exists before this migration — will check during Phase 1.

### 9. (NEW) Where does the tutor dashboard live?
Spec puts it at `/tutor/dashboard`, but `/tutor` (the existing home) already shows cohorts + roster.
- **Replace** `/tutor` with the new dashboard
- **Add** `/tutor/dashboard` as a new tab/page alongside the home
- **Add** `/tutor/earnings` specifically for earnings (split concerns: home = students/cohorts, earnings = $)

Recommendation: **`/tutor/earnings`**. Keeps the existing home intact. Add an "Earnings" link to the tutor nav.

---

## Rewritten Phase 1 (preview — full SQL after decisions are locked)

Once the 9 decisions above are made, Phase 1 becomes:

```sql
-- Migration 1.1: Extend bookings (the real "sessions" table)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS transcript TEXT,
  ADD COLUMN IF NOT EXISTS transcript_source VARCHAR(50),
  ADD COLUMN IF NOT EXISTS transcript_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_draft JSONB,
  ADD COLUMN IF NOT EXISTS status_draft_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_draft_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recap_email_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recap_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recap_resend_message_id TEXT,
  ADD COLUMN IF NOT EXISTS payout_status VARCHAR(50) DEFAULT 'not_eligible',
  ADD COLUMN IF NOT EXISTS payout_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payout_request_id UUID,
  ADD COLUMN IF NOT EXISTS tutor_hours NUMERIC(4,2);
-- Note: duration_minutes, zoom_meeting_id, tutor_id, student_id ALREADY EXIST

-- Migration 1.2: Tutor payment fields on users (with role='tutor' guard at app layer)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS zelle_email TEXT,
  ADD COLUMN IF NOT EXISTS zelle_phone TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS rate_per_session NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'zelle',
  ADD COLUMN IF NOT EXISTS payment_info_updated_at TIMESTAMPTZ;
-- Skip email_signature (Decision 5: uniform v1)

-- Migration 1.3: student_parents linkage (if not already present)
CREATE TABLE IF NOT EXISTS student_parents (
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_primary      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_user_id, parent_user_id)
);

-- Migration 1.4: payout_requests
-- (same as spec — references users.id where it said tutor_id)

-- Migration 1.5: tutor_earnings_summary materialized view
-- (same as spec but joins users + bookings, not tutors + sessions)

-- Migration 1.6: status_email_log
-- (same as spec but FK to users.id, not tutor_id/student_id)

-- Migration 1.7: webhook_events with idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  external_event_id TEXT,                          -- Decision 6
  event_type VARCHAR(100),
  raw_payload JSONB NOT NULL,
  booking_id UUID REFERENCES bookings(id),         -- not session_id
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_dedup
  ON webhook_events(source, external_event_id)
  WHERE external_event_id IS NOT NULL;

-- Migration 1.8: notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, read, created_at DESC);

-- Migration 1.9: NO RLS — gate via server actions + requireRole() (Decision: codebase pattern)
```

---

## Updated phase order

The spec puts notifications in Phase 9, but Phase 3 (webhook) needs to insert a "draft ready" notification. Reordered:

1. **Phase 1** — Migrations (waits on decisions above)
2. **Phase 2** — Env vars: add OPENAI_API_KEY only (skip Twilio per Decision 3)
3. **Phase 3** — Webhook + GPT-4 draft + insert notification
4. **Phase 4** — Tutor draft review page
5. **Phase 5** — Send recap email (skip SMS per Decision 3)
6. **Phase 6** — Tutor earnings page (formerly /tutor/dashboard, now `/tutor/earnings`)
7. **Phase 7** — Tutor payouts page + request endpoint + payment settings
8. **Phase 8** — Admin payouts page + approve/mark-paid/cancel
9. **Phase 9** — Cron jobs (Cloudflare Cron, not Vercel)
10. **Phase 10** — Test the full flow end-to-end

---

## Action items for Zakaria

Lock these 9 decisions, then I generate the real Phase 1 SQL and we run it:

1. Tutor rate model — hourly only / per-session only / both / tier-default? **(my recommendation: all three with tier-default fallback)**
2. Fathom vs Fireflies — pick one **(my recommendation: Fathom)**
3. SMS in v1 or defer? **(my recommendation: defer)**
4. Group-class recaps — A / B / C? **(my recommendation: C, 1:1 only)**
5. Tutor signature — uniform or customizable? **(my recommendation: uniform v1)**
6. Webhook dedup via external_event_id — yes? **(my recommendation: yes)**
7. Extend `bookings` vs separate `sessions` table? **(my recommendation: extend bookings)**
8. `student_parents` table — OK to create? **(my recommendation: yes, after I verify there's no existing linkage)**
9. Earnings page route — `/tutor` replace, `/tutor/dashboard` add, or `/tutor/earnings`? **(my recommendation: `/tutor/earnings`)**

Reply with which recommendations to override and I'll generate the Phase 1 SQL.
