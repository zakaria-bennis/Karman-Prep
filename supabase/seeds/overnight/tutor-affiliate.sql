-- Tutor affiliate test data for the local database (never production).
-- Priya Shah (dev_seed_affiliate_tutor) runs the $199 plan with code PRYA-SHAH;
-- Ethan, Chloe and Marcus (dev_seed_affiliate_student_1..3) joined with it.
-- Safe to run again. Skips the parts whose tables don't exist yet.
DO $$
DECLARE
  v_tutor uuid;
  v_aff uuid;
  v_code uuid;
  v_student uuid;
  v_link uuid;
BEGIN
  IF to_regclass('public.tutor_affiliates') IS NULL THEN
    RETURN;
  END IF;
  SELECT id INTO v_tutor FROM public.users WHERE clerk_id = 'dev_seed_affiliate_tutor';
  IF v_tutor IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.users SET role = 'affiliate_tutor' WHERE id = v_tutor;
  -- An affiliate's students are linked by code, not by staff 1:1 assignments.
  UPDATE public.tutor_assignments SET ended_at = now()
   WHERE tutor_user_id = v_tutor AND ended_at IS NULL;

  INSERT INTO public.tutor_affiliates (tutor_user_id) VALUES (v_tutor)
    ON CONFLICT (tutor_user_id) DO NOTHING;
  SELECT id INTO v_aff FROM public.tutor_affiliates WHERE tutor_user_id = v_tutor;

  SELECT id INTO v_code FROM public.tutor_affiliate_codes
   WHERE affiliate_id = v_aff AND retired_at IS NULL;
  IF v_code IS NULL THEN
    INSERT INTO public.tutor_affiliate_codes (affiliate_id, code) VALUES (v_aff, 'PRYA-SHAH')
      ON CONFLICT (code) DO NOTHING
      RETURNING id INTO v_code;
  END IF;

  FOR v_student IN
    SELECT id FROM public.users
     WHERE clerk_id IN ('dev_seed_affiliate_student_1', 'dev_seed_affiliate_student_2',
                        'dev_seed_affiliate_student_3')
     ORDER BY clerk_id
  LOOP
    SELECT id INTO v_link FROM public.tutor_affiliate_redemptions
     WHERE student_user_id = v_student AND removed_at IS NULL;
    IF v_link IS NULL THEN
      INSERT INTO public.tutor_affiliate_redemptions (affiliate_id, code_id, student_user_id, redeemed_at)
      VALUES (v_aff, v_code, v_student, now() - interval '20 days')
      RETURNING id INTO v_link;
    END IF;
    -- The student's Practice grant, once the pricing work's table exists.
    IF to_regclass('public.plan_grants') IS NOT NULL THEN
      EXECUTE $q$
        INSERT INTO public.plan_grants (user_id, plan_id, source, source_ref, sponsor_user_id)
        SELECT u.clerk_id, 'practice', 'tutor-affiliate', $1::text, 'dev_seed_affiliate_tutor'
          FROM public.users u WHERE u.id = $2
        ON CONFLICT (source, source_ref, user_id) DO NOTHING
      $q$ USING v_link, v_student;
    END IF;
  END LOOP;

  -- Priya's $199 subscription, once subscriptions has plan_id (and no longer needs tier).
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'plan_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'tier') THEN
    EXECUTE $q$
      INSERT INTO public.subscriptions
        (user_id, stripe_customer_id, stripe_subscription_id, plan_id, billing_term, status, current_period_end)
      VALUES ('dev_seed_affiliate_tutor', 'cus_dev_affiliate_priya', 'sub_dev_affiliate_priya',
              'tutor-affiliate', 'month', 'active', now() + interval '30 days')
      ON CONFLICT (stripe_subscription_id) DO UPDATE SET status = 'active',
        current_period_end = now() + interval '30 days'
    $q$;
  END IF;
END $$;
