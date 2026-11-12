-- Rewards (founder's reward layer, 2026-11-12): the companions a student has earned, the mystery
-- boxes they opened with tokens, and which companion and accessory they show.
--
-- Tokens are the quiz engine's points in public.student_point_awards (10 or 15 per right answer).
-- A student's balance is every point earned, minus each box's cost, plus each box's token bonus.
-- These are NOT the session credits in public.tokens (paid booking credits): never mix the two.
--
-- Additive only: three new tables and one function. Students read their own rows; every write
-- goes through the server (service role) from Zod-checked server actions.

CREATE TABLE IF NOT EXISTS public.student_companions (
  student_id TEXT        NOT NULL,                       -- Clerk ID
  animal     TEXT        NOT NULL CHECK (animal IN ('fox', 'bunny', 'cat', 'owl', 'bear', 'wolf')),
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_at    TIMESTAMPTZ,                                -- set once its "joins you" moment played
  PRIMARY KEY (student_id, animal)
);

CREATE TABLE IF NOT EXISTS public.student_reward_boxes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  TEXT        NOT NULL,                      -- Clerk ID
  request_id  UUID        NOT NULL,                      -- one per tap: a retried tap opens nothing new
  cost        INTEGER     NOT NULL CHECK (cost > 0),
  prize_kind  TEXT        NOT NULL CHECK (prize_kind IN ('accessory', 'tokens')),
  prize_id    TEXT        NOT NULL,
  bonus       INTEGER     NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  opened_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, request_id),
  CHECK (prize_kind <> 'accessory' OR prize_id IN ('glasses', 'headphones', 'cap', 'bow', 'scarf')),
  CHECK ((prize_kind = 'tokens') = (bonus > 0))
);
CREATE INDEX IF NOT EXISTS student_reward_boxes_student_idx
  ON public.student_reward_boxes (student_id);

CREATE TABLE IF NOT EXISTS public.student_reward_wear (
  student_id TEXT        PRIMARY KEY,                    -- Clerk ID
  animal     TEXT        NOT NULL CHECK (animal IN ('fox', 'bunny', 'cat', 'owl', 'bear', 'wolf')),
  accessory  TEXT        CHECK (accessory IS NULL OR accessory IN ('glasses', 'headphones', 'cap', 'bow', 'scarf')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_reward_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_reward_wear ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companions_own_read" ON public.student_companions;
CREATE POLICY "companions_own_read" ON public.student_companions
  FOR SELECT USING (student_id = auth.jwt() ->> 'sub');
DROP POLICY IF EXISTS "companions_service_write" ON public.student_companions;
CREATE POLICY "companions_service_write" ON public.student_companions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "reward_boxes_own_read" ON public.student_reward_boxes;
CREATE POLICY "reward_boxes_own_read" ON public.student_reward_boxes
  FOR SELECT USING (student_id = auth.jwt() ->> 'sub');
DROP POLICY IF EXISTS "reward_boxes_service_write" ON public.student_reward_boxes;
CREATE POLICY "reward_boxes_service_write" ON public.student_reward_boxes
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "reward_wear_own_read" ON public.student_reward_wear;
CREATE POLICY "reward_wear_own_read" ON public.student_reward_wear
  FOR SELECT USING (student_id = auth.jwt() ->> 'sub');
DROP POLICY IF EXISTS "reward_wear_service_write" ON public.student_reward_wear;
CREATE POLICY "reward_wear_service_write" ON public.student_reward_wear
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Opens one mystery box, atomically. A per-student lock makes two taps (or two tabs) wait for
-- each other, so the balance is read and spent in one step and can never go below zero. The
-- same request_id twice returns the first box and spends nothing. The prize is the first
-- accessory in p_order the student does not own yet; with all of them owned, p_bonus tokens.
CREATE OR REPLACE FUNCTION public.open_reward_box(
  p_student TEXT,
  p_request UUID,
  p_cost    INTEGER,
  p_order   TEXT[],
  p_bonus   INTEGER
)
RETURNS TABLE (box_id UUID, prize_kind TEXT, prize_id TEXT, bonus INTEGER, balance INTEGER, repeated BOOLEAN)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_box     public.student_reward_boxes%ROWTYPE;
  v_earned  INTEGER;
  v_net     INTEGER;
  v_pick    TEXT;
  v_repeat  BOOLEAN := false;
BEGIN
  IF p_student IS NULL OR p_cost IS NULL OR p_cost <= 0 OR p_bonus IS NULL OR p_bonus <= 0 THEN
    RAISE EXCEPTION 'bad_input';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('reward-box:' || p_student, 0));

  SELECT * INTO v_box FROM public.student_reward_boxes b
    WHERE b.student_id = p_student AND b.request_id = p_request;
  IF FOUND THEN
    v_repeat := true;
  ELSE
    SELECT COALESCE(SUM(a.points), 0) INTO v_earned
      FROM public.student_point_awards a WHERE a.student_id = p_student;
    SELECT COALESCE(SUM(b.cost - b.bonus), 0) INTO v_net
      FROM public.student_reward_boxes b WHERE b.student_id = p_student;
    IF v_earned - v_net < p_cost THEN
      RAISE EXCEPTION 'not_enough_tokens';
    END IF;

    SELECT o.x INTO v_pick
      FROM unnest(p_order) WITH ORDINALITY AS o(x, n)
      WHERE o.x IN ('glasses', 'headphones', 'cap', 'bow', 'scarf')
        AND NOT EXISTS (
          SELECT 1 FROM public.student_reward_boxes b
          WHERE b.student_id = p_student AND b.prize_kind = 'accessory' AND b.prize_id = o.x
        )
      ORDER BY o.n
      LIMIT 1;

    INSERT INTO public.student_reward_boxes (student_id, request_id, cost, prize_kind, prize_id, bonus)
      VALUES (
        p_student, p_request, p_cost,
        CASE WHEN v_pick IS NULL THEN 'tokens' ELSE 'accessory' END,
        COALESCE(v_pick, 'tokens'),
        CASE WHEN v_pick IS NULL THEN p_bonus ELSE 0 END
      )
      RETURNING * INTO v_box;
  END IF;

  SELECT COALESCE(SUM(a.points), 0) INTO v_earned
    FROM public.student_point_awards a WHERE a.student_id = p_student;
  SELECT COALESCE(SUM(b.cost - b.bonus), 0) INTO v_net
    FROM public.student_reward_boxes b WHERE b.student_id = p_student;

  RETURN QUERY SELECT v_box.id, v_box.prize_kind, v_box.prize_id, v_box.bonus,
    (v_earned - v_net)::INTEGER, v_repeat;
END;
$$;

REVOKE ALL ON FUNCTION public.open_reward_box(TEXT, UUID, INTEGER, TEXT[], INTEGER) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.open_reward_box(TEXT, UUID, INTEGER, TEXT[], INTEGER) FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.open_reward_box(TEXT, UUID, INTEGER, TEXT[], INTEGER) FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.open_reward_box(TEXT, UUID, INTEGER, TEXT[], INTEGER) TO service_role';
  END IF;
END $$;
