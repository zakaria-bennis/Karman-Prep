-- ============================================================
-- 019_revenue_infra.sql
--
-- Adds the columns + tables the admin Revenue dashboard needs to
-- compute real churn, LTV, refund rate, and an MRR-trend
-- sparkline.
--
-- 1. subscriptions.canceled_at — populated by the Stripe webhook
--    on `customer.subscription.deleted` and `customer.subscription.updated`
--    (when status flips to canceled). Required for true monthly
--    churn rate (without it we can only approximate).
--
-- 2. revenue_snapshots — one row per nightly capture of the
--    current MRR + active student count + per-tier breakdown.
--    Powers the MRR-trend sparkline and the forecast band.
--    Production: hit the /api/admin/revenue-snapshot endpoint
--    nightly via cron / pg_cron / Vercel Cron.
--
-- 3. refunds — one row per Stripe refund issued. Powers the
--    refund-rate KPI on the Revenue dashboard.  Webhook handler
--    inserts on `charge.refunded`.
-- ============================================================

-- ─── 1. canceled_at ─────────────────────────────────────────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS subscriptions_canceled_at_idx
  ON public.subscriptions (canceled_at DESC) WHERE canceled_at IS NOT NULL;

-- Backfill: any current canceled rows whose canceled_at is null
-- get their `created_at` as a placeholder (better than null for
-- charts; clearly inaccurate for cancellations that happened
-- months after signup, but acceptable for pre-launch).
UPDATE public.subscriptions
   SET canceled_at = created_at
 WHERE status = 'canceled' AND canceled_at IS NULL;

-- ─── 2. revenue_snapshots ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.revenue_snapshots (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  captured_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- Cents to avoid float drift; multiply by 0.01 when displaying.
  mrr_cents       BIGINT       NOT NULL,
  active_students INTEGER      NOT NULL,
  -- { "group": { "students": 12, "revenue_cents": 48000 }, ... }
  by_tier         JSONB        NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS revenue_snapshots_captured_at_idx
  ON public.revenue_snapshots (captured_at DESC);

-- ─── 3. refunds ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.refunds (
  id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_refund_id   TEXT         UNIQUE,
  -- Optional join to subscriptions — refund may be for a one-off
  -- charge (per-session billing) where there's no parent sub.
  subscription_id    UUID         REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  -- Optional join to a specific student.
  user_id            UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  amount_cents       BIGINT       NOT NULL CHECK (amount_cents >= 0),
  -- Free-form reason (e.g., "score guarantee", "duplicate charge").
  reason             TEXT,
  issued_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refunds_issued_at_idx
  ON public.refunds (issued_at DESC);

CREATE INDEX IF NOT EXISTS refunds_subscription_idx
  ON public.refunds (subscription_id) WHERE subscription_id IS NOT NULL;
