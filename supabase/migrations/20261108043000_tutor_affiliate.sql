-- ============================================================
-- Tutor affiliate plan (overnight build, 2026-11-08)
--
-- External tutors (for example on Leland) pay $199 a month. Each
-- tutor has one live code. Up to 50 students who redeem it get the
-- Practice plan free while the tutor's subscription is active, and
-- the tutor manages those students (progress, homework, roster).
--
--   · users.role gains 'affiliate_tutor'. It is deliberately NOT
--     'tutor': staff tutors are picked by role for cohort dropdowns,
--     automatic 1:1 placement and payouts, and an outside tutor must
--     never enter those pools.
--   · tutor_affiliates            — one row per affiliate tutor (seat limit,
--                                    and the row the seat cap locks).
--   · tutor_affiliate_codes       — one live code per tutor. Regenerating
--                                    retires the old code; linked students
--                                    stay linked.
--   · tutor_affiliate_redemptions — the tutor-to-student link. One live
--                                    link per student. A trigger caps live
--                                    links at the tutor's seat_limit (≤ 50),
--                                    race-safe under concurrent redemptions.
--
-- The $199 subscription itself lives in public.subscriptions (plan
-- "tutor-affiliate", owned by the pricing work). A link grants Practice
-- only while that subscription is active or trialing; the Practice grant
-- is written through src/lib/plans/ (see src/lib/tutor-affiliate/).
-- All writes go through the service role.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. users.role: add 'affiliate_tutor' without dropping any value
--    another migration may have added (union with the current list).
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_def    text;
  v_values text[];
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
   WHERE conrelid = 'public.users'::regclass
     AND conname  = 'users_role_check';

  IF v_def IS NULL THEN
    v_values := ARRAY['student', 'tutor', 'parent', 'admin'];
  ELSE
    SELECT array_agg(DISTINCT m[1]) INTO v_values
      FROM regexp_matches(v_def, '''([^'']+)''', 'g') AS m;
  END IF;

  IF NOT ('affiliate_tutor' = ANY (v_values)) THEN
    v_values := array_append(v_values, 'affiliate_tutor');
  END IF;

  IF v_def IS NOT NULL THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
  END IF;

  EXECUTE format(
    'ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role = ANY (%L::text[]))',
    v_values
  );
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. tutor_affiliates
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tutor_affiliates (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_user_id  uuid         NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  seat_limit     smallint     NOT NULL DEFAULT 50 CHECK (seat_limit BETWEEN 1 AND 50),
  created_at     timestamptz  NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 3. tutor_affiliate_codes — XXXX-XXXX from an unambiguous alphabet
--    (no I, O, 0 or 1). One live code per tutor.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tutor_affiliate_codes (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id  uuid         NOT NULL REFERENCES public.tutor_affiliates(id) ON DELETE CASCADE,
  code          text         NOT NULL UNIQUE
    CHECK (code ~ '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  created_at    timestamptz  NOT NULL DEFAULT now(),
  retired_at    timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS tutor_affiliate_codes_one_live
  ON public.tutor_affiliate_codes (affiliate_id)
  WHERE retired_at IS NULL;

-- Swap a tutor's live code in one transaction. If the new code collides
-- (unique violation), nothing changes and the old code stays live.
CREATE OR REPLACE FUNCTION public.tutor_affiliate_replace_code(p_affiliate_id uuid, p_code text)
RETURNS SETOF public.tutor_affiliate_codes
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.tutor_affiliate_codes
     SET retired_at = now()
   WHERE affiliate_id = p_affiliate_id
     AND retired_at IS NULL;
  RETURN QUERY
    INSERT INTO public.tutor_affiliate_codes (affiliate_id, code)
    VALUES (p_affiliate_id, p_code)
    RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.tutor_affiliate_replace_code(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tutor_affiliate_replace_code(uuid, text) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 4. tutor_affiliate_redemptions — the tutor-to-student link
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tutor_affiliate_redemptions (
  id                      uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id            uuid         NOT NULL REFERENCES public.tutor_affiliates(id) ON DELETE CASCADE,
  code_id                 uuid         NOT NULL REFERENCES public.tutor_affiliate_codes(id) ON DELETE CASCADE,
  student_user_id         uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  redeemed_at             timestamptz  NOT NULL DEFAULT now(),
  removed_at              timestamptz,
  removed_by              text         CHECK (removed_by IN ('tutor', 'student', 'admin')),
  -- When the student dismissed the "your tutor removed you" notice.
  student_notice_seen_at  timestamptz,
  CHECK ((removed_at IS NULL) = (removed_by IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS tutor_affiliate_redemptions_one_live_per_student
  ON public.tutor_affiliate_redemptions (student_user_id)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS tutor_affiliate_redemptions_affiliate_live_idx
  ON public.tutor_affiliate_redemptions (affiliate_id)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS tutor_affiliate_redemptions_student_idx
  ON public.tutor_affiliate_redemptions (student_user_id, redeemed_at DESC);

-- Seat cap. Locking the tutor's row queues concurrent redemptions,
-- so two students can never both take the 50th seat.
CREATE OR REPLACE FUNCTION public.tutor_affiliate_enforce_seat_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_limit smallint;
  v_live  integer;
BEGIN
  IF NEW.removed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT seat_limit INTO v_limit
    FROM public.tutor_affiliates
   WHERE id = NEW.affiliate_id
     FOR UPDATE;
  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'tutor_affiliate_not_found';
  END IF;

  SELECT count(*) INTO v_live
    FROM public.tutor_affiliate_redemptions
   WHERE affiliate_id = NEW.affiliate_id
     AND removed_at IS NULL;

  IF v_live >= v_limit THEN
    RAISE EXCEPTION 'tutor_affiliate_seat_limit_reached';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tutor_affiliate_seat_limit ON public.tutor_affiliate_redemptions;
CREATE TRIGGER tutor_affiliate_seat_limit
BEFORE INSERT ON public.tutor_affiliate_redemptions
FOR EACH ROW EXECUTE FUNCTION public.tutor_affiliate_enforce_seat_limit();

-- A link's identity never changes, and a removed link stays removed
-- (rejoining creates a new row, which passes the seat cap again).
CREATE OR REPLACE FUNCTION public.tutor_affiliate_redemption_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF ROW(NEW.affiliate_id, NEW.code_id, NEW.student_user_id, NEW.redeemed_at)
     IS DISTINCT FROM
     ROW(OLD.affiliate_id, OLD.code_id, OLD.student_user_id, OLD.redeemed_at) THEN
    RAISE EXCEPTION 'tutor_affiliate_redemption_identity_is_immutable';
  END IF;
  IF OLD.removed_at IS NOT NULL
     AND (NEW.removed_at IS DISTINCT FROM OLD.removed_at
          OR NEW.removed_by IS DISTINCT FROM OLD.removed_by) THEN
    RAISE EXCEPTION 'tutor_affiliate_removed_link_is_final';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tutor_affiliate_redemption_guard ON public.tutor_affiliate_redemptions;
CREATE TRIGGER tutor_affiliate_redemption_guard
BEFORE UPDATE ON public.tutor_affiliate_redemptions
FOR EACH ROW EXECUTE FUNCTION public.tutor_affiliate_redemption_guard();

-- ─────────────────────────────────────────────────────────────
-- 5. Row-level security. The app reads and writes with the service
--    role; these read policies only cover the people involved.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.tutor_affiliates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_affiliate_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_affiliate_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tutor_affiliates_self_read" ON public.tutor_affiliates;
CREATE POLICY "tutor_affiliates_self_read"
  ON public.tutor_affiliates FOR SELECT
  USING (tutor_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS "tutor_affiliates_service_write" ON public.tutor_affiliates;
CREATE POLICY "tutor_affiliates_service_write"
  ON public.tutor_affiliates FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "tutor_affiliate_codes_owner_read" ON public.tutor_affiliate_codes;
CREATE POLICY "tutor_affiliate_codes_owner_read"
  ON public.tutor_affiliate_codes FOR SELECT
  USING (affiliate_id IN (
    SELECT a.id FROM public.tutor_affiliates a
      JOIN public.users u ON u.id = a.tutor_user_id
     WHERE u.clerk_id = auth.jwt() ->> 'sub'
  ));

DROP POLICY IF EXISTS "tutor_affiliate_codes_service_write" ON public.tutor_affiliate_codes;
CREATE POLICY "tutor_affiliate_codes_service_write"
  ON public.tutor_affiliate_codes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "tutor_affiliate_redemptions_party_read" ON public.tutor_affiliate_redemptions;
CREATE POLICY "tutor_affiliate_redemptions_party_read"
  ON public.tutor_affiliate_redemptions FOR SELECT
  USING (
    student_user_id IN (SELECT id FROM public.users WHERE clerk_id = auth.jwt() ->> 'sub')
    OR affiliate_id IN (
      SELECT a.id FROM public.tutor_affiliates a
        JOIN public.users u ON u.id = a.tutor_user_id
       WHERE u.clerk_id = auth.jwt() ->> 'sub'
    )
  );

DROP POLICY IF EXISTS "tutor_affiliate_redemptions_service_write" ON public.tutor_affiliate_redemptions;
CREATE POLICY "tutor_affiliate_redemptions_service_write"
  ON public.tutor_affiliate_redemptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
