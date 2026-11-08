-- ============================================================
-- Cohort scholarship (founder decision 2026-11-08)
--
-- $1,500 to the top-scoring student in each cohort, paid as a
-- refund of the cohort price plus a merit bonus for the rest.
--
-- scholarship_claims        one claim per student per cohort:
--                           the uploaded official score report,
--                           what the automatic PDF check read,
--                           the admin review and the payout.
-- scholarship_claim_events  append-only audit trail of every
--                           step (upload, check, review, payout).
--
-- Score reports hold personal data. They are stored privately
-- (see src/lib/scholarship/storage.ts) and served only through
-- an admin-checked route, never from a public URL.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scholarship_claims (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id               UUID         NOT NULL REFERENCES public.cohorts(id) ON DELETE RESTRICT,
  user_id                 UUID         NOT NULL REFERENCES public.users(id)   ON DELETE RESTRICT,

  status                  TEXT         NOT NULL DEFAULT 'submitted'
                                       CHECK (status IN ('submitted', 'approved', 'rejected', 'paid')),

  -- The uploaded score report (private storage).
  report_storage_driver   TEXT         NOT NULL CHECK (report_storage_driver IN ('local', 'r2')),
  report_storage_key      TEXT         NOT NULL CHECK (report_storage_key ~ '^scholarship/[0-9a-f-]{36}/[0-9a-f]{64}\.pdf$'),
  report_file_name        TEXT         NOT NULL CHECK (char_length(report_file_name) BETWEEN 1 AND 200),
  report_size_bytes       INTEGER      NOT NULL CHECK (report_size_bytes > 0 AND report_size_bytes <= 10485760),
  report_sha256           TEXT         NOT NULL CHECK (report_sha256 ~ '^[0-9a-f]{64}$'),
  submitted_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- What the student typed on the upload form.
  declared_total_score    SMALLINT     CHECK (declared_total_score BETWEEN 400 AND 1600),
  declared_test_date      DATE,

  -- What the automatic check read from the PDF.
  extracted_name          TEXT         CHECK (extracted_name IS NULL OR char_length(extracted_name) <= 200),
  extracted_test_date     DATE,
  extracted_total_score   SMALLINT     CHECK (extracted_total_score BETWEEN 400 AND 1600),
  extracted_rw_score      SMALLINT     CHECK (extracted_rw_score BETWEEN 200 AND 800),
  extracted_math_score    SMALLINT     CHECK (extracted_math_score BETWEEN 200 AND 800),

  -- The automatic check: pass, warn or fail, with plain reasons.
  check_verdict           TEXT         CHECK (check_verdict IN ('pass', 'warn', 'fail')),
  check_reasons           JSONB        NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(check_reasons) = 'array'),
  check_metadata          JSONB        NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(check_metadata) = 'object'),
  check_version           SMALLINT,
  checked_at              TIMESTAMPTZ,

  -- Admin review.
  reviewed_by             UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at             TIMESTAMPTZ,
  review_reason           TEXT         CHECK (review_reason IS NULL OR char_length(review_reason) <= 2000),

  -- Payout through Stripe. Test mode only until the founder turns
  -- on live payouts (src/lib/scholarship/payout.ts).
  payout_status           TEXT         NOT NULL DEFAULT 'none'
                                       CHECK (payout_status IN ('none', 'processing', 'refunded', 'paid', 'failed')),
  stripe_livemode         BOOLEAN,
  stripe_payment_intent_id TEXT        CHECK (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$'),
  stripe_customer_id      TEXT         CHECK (stripe_customer_id IS NULL OR stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  stripe_refund_id        TEXT         UNIQUE,
  refund_amount_cents     INTEGER      CHECK (refund_amount_cents >= 0),
  refunded_at             TIMESTAMPTZ,
  bonus_method            TEXT         CHECK (bonus_method IN ('transfer', 'customer_balance')),
  stripe_bonus_id         TEXT         UNIQUE,
  bonus_amount_cents      INTEGER      CHECK (bonus_amount_cents >= 0),
  bonus_paid_at           TIMESTAMPTZ,
  payout_error            TEXT         CHECK (payout_error IS NULL OR char_length(payout_error) <= 2000),
  payout_attempts         SMALLINT     NOT NULL DEFAULT 0 CHECK (payout_attempts >= 0),
  paid_at                 TIMESTAMPTZ,

  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- One claim per student per cohort. A rejected claim can be
  -- resubmitted, which replaces the file on the same row.
  CONSTRAINT scholarship_claims_one_per_student UNIQUE (cohort_id, user_id),
  -- A decision is always stamped with when it was made.
  CONSTRAINT scholarship_claims_review_stamped CHECK (
    status NOT IN ('approved', 'rejected', 'paid') OR reviewed_at IS NOT NULL
  ),
  -- A rejection always says why, so the family can be told.
  CONSTRAINT scholarship_claims_reject_has_reason CHECK (
    status <> 'rejected' OR (review_reason IS NOT NULL AND char_length(btrim(review_reason)) > 0)
  ),
  -- A claim is only "paid" once the payout finished.
  CONSTRAINT scholarship_claims_paid_is_paid CHECK (
    status <> 'paid' OR (payout_status = 'paid' AND paid_at IS NOT NULL)
  )
);

-- One award per cohort, enforced by the database.
CREATE UNIQUE INDEX IF NOT EXISTS scholarship_claims_one_award_per_cohort
  ON public.scholarship_claims (cohort_id)
  WHERE status IN ('approved', 'paid');

CREATE INDEX IF NOT EXISTS scholarship_claims_status_idx
  ON public.scholarship_claims (status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS scholarship_claims_user_idx
  ON public.scholarship_claims (user_id);

-- The same file uploaded for two students is a red flag the check looks for.
CREATE INDEX IF NOT EXISTS scholarship_claims_sha256_idx
  ON public.scholarship_claims (report_sha256);

DROP TRIGGER IF EXISTS scholarship_claims_set_updated_at ON public.scholarship_claims;
CREATE TRIGGER scholarship_claims_set_updated_at
  BEFORE UPDATE ON public.scholarship_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE public.scholarship_claims ENABLE ROW LEVEL SECURITY;

-- Students may read their own claims. Writes go through server
-- actions with the service role, which checks the caller first.
DROP POLICY IF EXISTS "scholarship_claims_own_read" ON public.scholarship_claims;
CREATE POLICY "scholarship_claims_own_read"
  ON public.scholarship_claims FOR SELECT
  USING (
    user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
  );


CREATE TABLE IF NOT EXISTS public.scholarship_claim_events (
  id              BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  claim_id        UUID         NOT NULL REFERENCES public.scholarship_claims(id) ON DELETE CASCADE,
  actor_user_id   UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  kind            TEXT         NOT NULL CHECK (kind IN (
                                 'submitted', 'resubmitted', 'checked', 'approved', 'rejected',
                                 'reopened', 'payout_started', 'refund_succeeded',
                                 'bonus_succeeded', 'payout_failed', 'paid'
                               )),
  detail          JSONB        NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object'),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scholarship_claim_events_claim_idx
  ON public.scholarship_claim_events (claim_id, created_at);

-- Service role only (admin pages read it through the server).
ALTER TABLE public.scholarship_claim_events ENABLE ROW LEVEL SECURITY;
