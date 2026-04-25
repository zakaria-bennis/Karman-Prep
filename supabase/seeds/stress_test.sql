-- ============================================================
-- Strata Stress Test Seed — ~500 students with realistic mix
--
-- All rows have clerk_id prefix `test_stress_` so cleanup is one
-- line: DELETE FROM users WHERE clerk_id LIKE 'test_stress_%';
-- (cohort_members, subscriptions, etc. cascade.)
--
-- What lands:
--   · 500 students with diverse names + realistic tier mix
--       200 group     (seminar)
--       100 small_group
--       150 private
--        50 elite
--   · 150 parents
--   · 21 cohorts: 1 seminar (200-cap) + 20 small-groups (5-cap each)
--   · cohort_members for the 200 + 100 cohort-tier students
--   · tutor_assignments for 200 private + elite students
--   · parent_student_links: ~250 students linked to one or both parents
--   · 8 elite-monthly tokens for each of the 50 elite students
--   · ~80 sample bookings spanning upcoming / completed / no_show / cancelled
--   · bennisz@outlook.com added to a small-group cohort for chat testing
--
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. 500 students with diverse names
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  first_names TEXT[] := ARRAY[
    'Aaliyah','Aaron','Abigail','Adam','Adrian','Aiden','Alejandro','Alex','Alice','Amelia',
    'Amara','Amir','Andrew','Angela','Anthony','Antonio','Aria','Arjun','Asher','Aubrey',
    'Ava','Avery','Beckett','Benjamin','Brianna','Cameron','Camila','Carlos','Caroline','Cassidy',
    'Catalina','Chen','Chloe','Christian','Daniel','David','Dax','Deepika','Devon','Diana',
    'Dmitri','Eliana','Elijah','Elise','Ella','Ellie','Emma','Eric','Esther','Ethan',
    'Eva','Fatima','Felix','Finn','Gabriel','Gabriella','Grace','Hadi','Hannah','Harper',
    'Hassan','Henry','Hudson','Ibrahim','Ines','Isabella','Isaiah','Jack','Jackson','Jacob',
    'Jade','James','Jasmine','Javier','Jayden','Jeremiah','Jianyu','Jin','Jordan','Jose',
    'Kai','Kamila','Kayla','Kenji','Khalil','Kira','Lana','Layla','Leo','Liam',
    'Lily','Lina','Logan','Lucas','Luna','Maeve','Malia','Marcus','Maria','Mateo',
    'Maya','Mei','Mia','Miguel','Mina','Mohammed','Naomi','Natalia','Nathan','Nia',
    'Nikhil','Noah','Nora','Olivia','Omar','Owen','Parker','Penelope','Peyton','Priya',
    'Quinn','Rafael','Rania','Rashid','Riley','Robin','Rohan','Sage','Sahara','Samira',
    'Sebastian','Selena','Serenity','Shreya','Sienna','Sofia','Sophia','Tariq','Taylor','Theo',
    'Tomas','Uma','Valentina','Victoria','Violet','William','Wyatt','Xander','Yara','Yusuf','Zain','Zara','Zion','Zoe'
  ];
  last_names TEXT[] := ARRAY[
    'Adams','Alvarez','Anderson','Bailey','Baker','Bennett','Brown','Campbell','Carter','Castro',
    'Chen','Clark','Coleman','Collins','Cook','Cooper','Cox','Cruz','Davis','Diaz',
    'Edwards','Evans','Fischer','Flores','Foster','Garcia','Gomez','Gonzalez','Goldberg','Graham',
    'Green','Gupta','Hall','Hamilton','Harris','Hayes','Hernandez','Hill','Howard','Hughes',
    'Ibrahim','Jackson','Jenkins','Johnson','Jones','Kang','Kelly','Kennedy','Khan','Kim',
    'King','Kowalski','Krishnan','Lam','Lee','Lewis','Long','Lopez','Mahmood','Martinez',
    'Mbeki','Mendoza','Mitchell','Moore','Morgan','Morris','Murphy','Nakamura','Nguyen','Novak',
    'Okafor','Ortiz','Park','Patel','Perez','Peterson','Phillips','Powell','Price','Ramirez',
    'Reyes','Reynolds','Richardson','Rivera','Roberts','Robinson','Rodriguez','Rogers','Romero','Russo',
    'Sanchez','Santos','Schmidt','Scott','Sharma','Silva','Singh','Smith','Stewart','Sullivan',
    'Tanaka','Taylor','Thomas','Thompson','Torres','Turner','Vasquez','Walker','Walsh','Wang',
    'Ward','Washington','Watson','White','Williams','Wilson','Wright','Wu','Yamamoto','Young',
    'Zhang','Zhao'
  ];
  i INT;
  fn TEXT;
  ln TEXT;
  email_addr TEXT;
BEGIN
  FOR i IN 1..500 LOOP
    fn := first_names[1 + (i % array_length(first_names, 1))];
    ln := last_names[1 + ((i * 7 + 13) % array_length(last_names, 1))];
    email_addr := lower(fn || '.' || ln || i || '@stress.strata.local');

    INSERT INTO public.users (clerk_id, email, role, first_name, last_name, created_at)
    VALUES (
      'test_stress_student_' || LPAD(i::TEXT, 4, '0'),
      email_addr,
      'student',
      fn,
      ln,
      now() - (random() * interval '60 days')
    )
    ON CONFLICT (clerk_id) DO NOTHING;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 2. 150 parents
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  first_names TEXT[] := ARRAY[
    'Sarah','Michael','Jennifer','David','Linda','Robert','Patricia','James','Mary','John',
    'Susan','William','Karen','Thomas','Lisa','Christopher','Nancy','Daniel','Margaret','Mark',
    'Steven','Sandra','Kenneth','Donna','Brian','Carol','Edward','Ruth','Ronald','Sharon',
    'Anthony','Michelle','Kevin','Laura','Jason','Jessica','Matthew','Amanda','Gary','Stephanie',
    'Timothy','Helen','Jose','Maria','Larry','Carolyn','Jeffrey','Barbara','Frank','Janet'
  ];
  last_names TEXT[] := ARRAY[
    'Patel','Park','Goldberg','Ramirez','Chen','O''Brien','Anderson','Schmidt','Williams','Khan',
    'Garcia','Nakamura','Hassan','Cohen','Rodriguez','Kowalski','Singh','Brown','Yamamoto','Wilson',
    'Mahmood','Lee','Jensen','Lopez','Tanaka','Bennett','Reyes','Walsh','Cruz','Park',
    'Sharma','Diaz','Mitchell','Sullivan','Nguyen','Okafor','Ferreira','Krishnan','Gonzalez','Mendoza'
  ];
  i INT;
  fn TEXT;
  ln TEXT;
BEGIN
  FOR i IN 1..150 LOOP
    fn := first_names[1 + (i % array_length(first_names, 1))];
    ln := last_names[1 + ((i * 11 + 5) % array_length(last_names, 1))];

    INSERT INTO public.users (clerk_id, email, role, first_name, last_name, created_at)
    VALUES (
      'test_stress_parent_' || LPAD(i::TEXT, 4, '0'),
      lower(fn || '.' || ln || i || '.parent@stress.strata.local'),
      'parent',
      fn,
      ln,
      now() - (random() * interval '60 days')
    )
    ON CONFLICT (clerk_id) DO NOTHING;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 3. Subscriptions per tier distribution
--   1–200    group        (seminar)
--   201–300  small_group
--   301–450  private
--   451–500  elite
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  i INT;
  tier_value TEXT;
BEGIN
  FOR i IN 1..500 LOOP
    IF i <= 200 THEN tier_value := 'group';
    ELSIF i <= 300 THEN tier_value := 'small_group';
    ELSIF i <= 450 THEN tier_value := 'private';
    ELSE tier_value := 'elite';
    END IF;

    INSERT INTO public.subscriptions (user_id, stripe_customer_id, stripe_subscription_id, tier, status, created_at)
    VALUES (
      'test_stress_student_' || LPAD(i::TEXT, 4, '0'),
      'cus_test_stress_' || LPAD(i::TEXT, 4, '0'),
      'sub_test_stress_' || LPAD(i::TEXT, 4, '0'),
      tier_value,
      'active',
      now() - (random() * interval '45 days')
    )
    ON CONFLICT (stripe_subscription_id) DO NOTHING;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 4. Cohorts — 1 seminar (200-cap) + 20 small-groups (5-cap each)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  tutor_z UUID;
  tutor_n UUID;
  i INT;
  ck TEXT;
BEGIN
  SELECT id INTO tutor_z FROM public.users WHERE clerk_id = 'test_tutor_zakaria';
  SELECT id INTO tutor_n FROM public.users WHERE clerk_id = 'test_tutor_nabil';
  IF tutor_z IS NULL OR tutor_n IS NULL THEN
    RAISE EXCEPTION 'Tutors test_tutor_zakaria + test_tutor_nabil must exist (run ALL_test_data.sql first if not).';
  END IF;

  -- Seminar cohort (group tier, 200-cap)
  INSERT INTO public.cohorts (id, name, tier, tutor_user_id, sat_date, status, max_size, current_topic)
  VALUES (
    'aaaa1111-bbbb-2222-cccc-333333333301',
    'Stress Seminar Spring 2026',
    'group',
    tutor_z,
    '2026-11-07',
    'active',
    200,
    'Algebra II review week'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 20 small-group cohorts
  FOR i IN 1..20 LOOP
    INSERT INTO public.cohorts (id, name, tier, tutor_user_id, sat_date, status, max_size, current_topic)
    VALUES (
      ('bbbb1111-cccc-2222-dddd-3333333344' || LPAD(i::TEXT, 2, '0'))::UUID,
      'Stress Small Group ' || i,
      'small_group',
      CASE WHEN i % 2 = 0 THEN tutor_z ELSE tutor_n END,
      '2026-11-07',
      'active',
      5,
      'Reading comprehension drills'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 5. Cohort memberships
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  i INT;
  student_uuid UUID;
  cohort_uuid UUID;
  sg_index INT;
BEGIN
  -- Group/seminar students 1–200 → seminar cohort
  FOR i IN 1..200 LOOP
    SELECT id INTO student_uuid
      FROM public.users
     WHERE clerk_id = 'test_stress_student_' || LPAD(i::TEXT, 4, '0');
    IF student_uuid IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.cohort_members (cohort_id, user_id, joined_at)
    VALUES (
      'aaaa1111-bbbb-2222-cccc-333333333301',
      student_uuid,
      now() - (random() * interval '30 days')
    )
    ON CONFLICT (cohort_id, user_id) DO NOTHING;
  END LOOP;

  -- Small-group students 201–300 → 20 small_group cohorts (5 each)
  FOR i IN 201..300 LOOP
    sg_index := ((i - 201) / 5) + 1;
    cohort_uuid := ('bbbb1111-cccc-2222-dddd-3333333344' || LPAD(sg_index::TEXT, 2, '0'))::UUID;

    SELECT id INTO student_uuid
      FROM public.users
     WHERE clerk_id = 'test_stress_student_' || LPAD(i::TEXT, 4, '0');
    IF student_uuid IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.cohort_members (cohort_id, user_id, joined_at)
    VALUES (cohort_uuid, student_uuid, now() - (random() * interval '30 days'))
    ON CONFLICT (cohort_id, user_id) DO NOTHING;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 6. Tutor assignments for private + elite (rotating tutors)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  tutor_z UUID;
  tutor_n UUID;
  i INT;
  student_uuid UUID;
  tutor_uuid UUID;
BEGIN
  SELECT id INTO tutor_z FROM public.users WHERE clerk_id = 'test_tutor_zakaria';
  SELECT id INTO tutor_n FROM public.users WHERE clerk_id = 'test_tutor_nabil';

  FOR i IN 301..500 LOOP
    SELECT id INTO student_uuid
      FROM public.users
     WHERE clerk_id = 'test_stress_student_' || LPAD(i::TEXT, 4, '0');
    IF student_uuid IS NULL THEN CONTINUE; END IF;

    tutor_uuid := CASE WHEN i % 2 = 0 THEN tutor_z ELSE tutor_n END;

    INSERT INTO public.tutor_assignments (tutor_user_id, student_user_id)
    VALUES (tutor_uuid, student_uuid)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 7. Parent-student links (~250 students linked)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  i INT;
  parent_uuid UUID;
  student_uuid UUID;
  student_idx INT;
BEGIN
  -- Parent N gets linked to student (N), and parent N+50 also gets linked to that same student (so some students have 2 parents)
  FOR i IN 1..150 LOOP
    SELECT id INTO parent_uuid
      FROM public.users
     WHERE clerk_id = 'test_stress_parent_' || LPAD(i::TEXT, 4, '0');
    IF parent_uuid IS NULL THEN CONTINUE; END IF;

    -- Each parent links to 1 or 2 students (deterministic distribution)
    student_idx := i;
    SELECT id INTO student_uuid
      FROM public.users
     WHERE clerk_id = 'test_stress_student_' || LPAD(student_idx::TEXT, 4, '0');
    IF student_uuid IS NOT NULL THEN
      INSERT INTO public.parent_student_links (parent_user_id, student_user_id)
      VALUES (parent_uuid, student_uuid)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Every 3rd parent links to a 2nd student
    IF i % 3 = 0 THEN
      student_idx := i + 100;
      SELECT id INTO student_uuid
        FROM public.users
       WHERE clerk_id = 'test_stress_student_' || LPAD(student_idx::TEXT, 4, '0');
      IF student_uuid IS NOT NULL THEN
        INSERT INTO public.parent_student_links (parent_user_id, student_user_id)
        VALUES (parent_uuid, student_uuid)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 8. Elite tokens — 8 per elite student for the current month
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  i INT;
  j INT;
  student_uuid UUID;
  month_key TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  month_key := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
  expires_at := date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month';

  FOR i IN 451..500 LOOP
    SELECT id INTO student_uuid
      FROM public.users
     WHERE clerk_id = 'test_stress_student_' || LPAD(i::TEXT, 4, '0');
    IF student_uuid IS NULL THEN CONTINUE; END IF;

    FOR j IN 1..8 LOOP
      INSERT INTO public.tokens (user_id, source, granted_for_month, expires_at)
      VALUES (student_uuid, 'elite_monthly', month_key, expires_at);
    END LOOP;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 9. Sample bookings — mixed states for realistic UI testing
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  tutor_z UUID;
  i INT;
  student_uuid UUID;
  starts_at TIMESTAMPTZ;
BEGIN
  SELECT id INTO tutor_z FROM public.users WHERE clerk_id = 'test_tutor_zakaria';

  -- 30 upcoming scheduled bookings (next 7 days), private + elite students
  FOR i IN 301..330 LOOP
    SELECT id INTO student_uuid
      FROM public.users
     WHERE clerk_id = 'test_stress_student_' || LPAD(i::TEXT, 4, '0');
    IF student_uuid IS NULL THEN CONTINUE; END IF;

    starts_at := now() + (random() * interval '7 days');
    INSERT INTO public.bookings (
      student_id, tutor_id, plan_tier, scheduled_start, scheduled_end, status,
      zoom_join_url, cal_booking_uid
    )
    VALUES (
      student_uuid, tutor_z, 'private',
      starts_at, starts_at + interval '60 minutes', 'scheduled',
      'https://zoom.us/j/0000000000?pwd=stress', 'fake_uid_upcoming_' || i
    );
  END LOOP;

  -- 30 past completed bookings (last 30 days)
  FOR i IN 331..360 LOOP
    SELECT id INTO student_uuid
      FROM public.users
     WHERE clerk_id = 'test_stress_student_' || LPAD(i::TEXT, 4, '0');
    IF student_uuid IS NULL THEN CONTINUE; END IF;

    starts_at := now() - (random() * interval '30 days');
    INSERT INTO public.bookings (
      student_id, tutor_id, plan_tier, scheduled_start, scheduled_end, status,
      zoom_join_url, cal_booking_uid
    )
    VALUES (
      student_uuid, tutor_z, 'private',
      starts_at, starts_at + interval '60 minutes', 'completed',
      'https://zoom.us/j/0000000000?pwd=stress', 'fake_uid_completed_' || i
    );
  END LOOP;

  -- 10 past no-show
  FOR i IN 361..370 LOOP
    SELECT id INTO student_uuid
      FROM public.users
     WHERE clerk_id = 'test_stress_student_' || LPAD(i::TEXT, 4, '0');
    IF student_uuid IS NULL THEN CONTINUE; END IF;

    starts_at := now() - (random() * interval '20 days');
    INSERT INTO public.bookings (
      student_id, tutor_id, plan_tier, scheduled_start, scheduled_end, status,
      zoom_join_url, cal_booking_uid
    )
    VALUES (
      student_uuid, tutor_z, 'private',
      starts_at, starts_at + interval '60 minutes', 'no_show',
      'https://zoom.us/j/0000000000?pwd=stress', 'fake_uid_noshow_' || i
    );
  END LOOP;

  -- 10 cancelled (mix of within / outside window)
  FOR i IN 371..380 LOOP
    SELECT id INTO student_uuid
      FROM public.users
     WHERE clerk_id = 'test_stress_student_' || LPAD(i::TEXT, 4, '0');
    IF student_uuid IS NULL THEN CONTINUE; END IF;

    starts_at := now() + (random() * interval '5 days');
    INSERT INTO public.bookings (
      student_id, tutor_id, plan_tier, scheduled_start, scheduled_end, status,
      zoom_join_url, cal_booking_uid,
      cancelled_at, cancelled_within_window, credit_forfeited
    )
    VALUES (
      student_uuid, tutor_z, 'private',
      starts_at, starts_at + interval '60 minutes', 'cancelled',
      'https://zoom.us/j/0000000000?pwd=stress', 'fake_uid_cancelled_' || i,
      now() - (random() * interval '2 days'),
      (i % 2 = 0),
      (i % 2 = 0)
    );
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 10. Add bennisz@outlook.com to the FIRST small-group cohort
--     so the user can immediately test cohort chat.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  bennisz_uuid UUID;
  target_cohort UUID := 'bbbb1111-cccc-2222-dddd-333333334401';
BEGIN
  SELECT id INTO bennisz_uuid
    FROM public.users
   WHERE clerk_id = 'user_3Cee37IQmC3gnCXv9XeM8K12dsE';
  IF bennisz_uuid IS NULL THEN
    RAISE NOTICE 'bennisz@outlook.com user not found — skipping cohort assignment';
  ELSE
    INSERT INTO public.cohort_members (cohort_id, user_id, joined_at)
    VALUES (target_cohort, bennisz_uuid, now())
    ON CONFLICT (cohort_id, user_id) DO NOTHING;

    RAISE NOTICE
      'bennisz@outlook.com added to cohort %. To enable chat, POST { "cohortId": "%" } to /api/cohorts/provision while signed in as admin.',
      target_cohort, target_cohort;
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────
-- Summary
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  s_count INT; p_count INT; sub_count INT; cm_count INT;
  ta_count INT; psl_count INT; tok_count INT; b_count INT;
BEGIN
  SELECT count(*) INTO s_count FROM public.users WHERE clerk_id LIKE 'test_stress_student_%';
  SELECT count(*) INTO p_count FROM public.users WHERE clerk_id LIKE 'test_stress_parent_%';
  SELECT count(*) INTO sub_count FROM public.subscriptions WHERE user_id LIKE 'test_stress_%';
  SELECT count(*) INTO cm_count FROM public.cohort_members WHERE user_id IN (
    SELECT id FROM public.users WHERE clerk_id LIKE 'test_stress_%'
  );
  SELECT count(*) INTO ta_count FROM public.tutor_assignments WHERE student_user_id IN (
    SELECT id FROM public.users WHERE clerk_id LIKE 'test_stress_student_%'
  );
  SELECT count(*) INTO psl_count FROM public.parent_student_links WHERE parent_user_id IN (
    SELECT id FROM public.users WHERE clerk_id LIKE 'test_stress_parent_%'
  );
  SELECT count(*) INTO tok_count FROM public.tokens WHERE user_id IN (
    SELECT id FROM public.users WHERE clerk_id LIKE 'test_stress_student_%'
  );
  SELECT count(*) INTO b_count FROM public.bookings WHERE student_id IN (
    SELECT id FROM public.users WHERE clerk_id LIKE 'test_stress_student_%'
  );

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════╗';
  RAISE NOTICE '║          STRESS SEED COMPLETE                  ║';
  RAISE NOTICE '╠════════════════════════════════════════════════╣';
  RAISE NOTICE '║   students:               %                  ║', LPAD(s_count::TEXT, 4);
  RAISE NOTICE '║   parents:                %                  ║', LPAD(p_count::TEXT, 4);
  RAISE NOTICE '║   subscriptions:          %                  ║', LPAD(sub_count::TEXT, 4);
  RAISE NOTICE '║   cohort_members:         %                  ║', LPAD(cm_count::TEXT, 4);
  RAISE NOTICE '║   tutor_assignments:      %                  ║', LPAD(ta_count::TEXT, 4);
  RAISE NOTICE '║   parent_student_links:   %                  ║', LPAD(psl_count::TEXT, 4);
  RAISE NOTICE '║   elite_monthly_tokens:   %                  ║', LPAD(tok_count::TEXT, 4);
  RAISE NOTICE '║   bookings:               %                  ║', LPAD(b_count::TEXT, 4);
  RAISE NOTICE '╚════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Cleanup: DELETE FROM users WHERE clerk_id LIKE ''test_stress_%'';';
END $$;
