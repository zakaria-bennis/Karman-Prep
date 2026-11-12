-- ============================================================
-- Local seed for the parent Messages inbox, the team inbox and the
-- message assistant (2026-11-12). LOCAL DATABASE ONLY, sample words.
-- Safe to run again: it clears its own rows for this family first.
--
-- * Rachel Johnson (dev_seed_parent_maya) and Maya (dev_seed_student_private).
-- * Three notes from Maya's tutor for the family, a week apart.
-- * A short conversation with the team: a question the team answered,
--   then an open request to move a session.
-- * One real SAT score, and a test date four weeks out.
-- * The assistant's read and a waiting draft, so /admin/messages shows
--   what it looks like with MESSAGE_ASSISTANT=on. Nothing is sent.
-- ============================================================

DO $$
DECLARE
  v_parent uuid;
  v_maya   uuid;
  v_tutor  uuid;
  v_admin  uuid;
  v_open   uuid := gen_random_uuid();
BEGIN
  SELECT id INTO v_parent FROM public.users WHERE clerk_id = 'dev_seed_parent_maya';
  SELECT id INTO v_maya   FROM public.users WHERE clerk_id = 'dev_seed_student_private';
  SELECT id INTO v_tutor  FROM public.users WHERE clerk_id = 'dev_seed_tutor';
  SELECT id INTO v_admin  FROM public.users WHERE clerk_id = 'dev_seed_admin';
  IF v_parent IS NULL OR v_maya IS NULL OR v_tutor IS NULL THEN
    RAISE NOTICE 'parent-messages seed: personas missing, skipped';
    RETURN;
  END IF;

  DELETE FROM public.parent_session_notes WHERE student_user_id = v_maya;
  DELETE FROM public.family_message_drafts WHERE parent_user_id = v_parent AND student_user_id = v_maya;
  DELETE FROM public.family_message_triage WHERE parent_user_id = v_parent AND student_user_id = v_maya;
  DELETE FROM public.family_messages WHERE parent_user_id = v_parent AND student_user_id = v_maya;
  DELETE FROM public.official_sat_scores WHERE student_user_id = v_maya;

  INSERT INTO public.parent_session_notes (student_user_id, tutor_user_id, body, created_at) VALUES
    (v_maya, v_tutor, 'We worked on linear equations in context. Maya set them up well but rushed the last step twice. This week: 20 questions in Linear equations, slowly.', now() - interval '15 days'),
    (v_maya, v_tutor, 'Big jump on Boundaries questions: 9 of 10 today. Transitions are next. Please nudge her to do the Daily 10 on school nights.', now() - interval '8 days'),
    (v_maya, v_tutor, 'Full practice section today, timed. She finished with three minutes to spare and checked her work. Next: Inferences and two short time trials.', now() - interval '1 day');

  INSERT INTO public.family_messages (parent_user_id, student_user_id, author_user_id, author_role, kind, body, status, handled_at, read_at, created_at) VALUES
    (v_parent, v_maya, v_parent, 'parent', 'message', 'Hi, does Maya need to bring anything to her sessions, or is it all online?', 'handled', now() - interval '6 days', NULL, now() - interval '6 days 3 hours'),
    (v_parent, v_maya, v_admin, 'staff', 'message', 'Hi Rachel, it is all online. She just needs her laptop and the Zoom link from her Sessions page. Zakaria', 'handled', now() - interval '6 days', now() - interval '5 days', now() - interval '6 days');

  INSERT INTO public.family_messages (id, parent_user_id, student_user_id, author_user_id, author_role, kind, session_starts_at, body, status, created_at) VALUES
    (v_open, v_parent, v_maya, v_parent, 'parent', 'move_session', date_trunc('day', now()) + interval '2 days 23 hours', 'Maya has a school concert that evening. Could we move this one to the weekend?', 'open', now() - interval '2 hours');

  INSERT INTO public.official_sat_scores (student_user_id, entered_by_user_id, test_date, reading_writing, math)
  VALUES (v_maya, v_parent, '2026-10-04', 640, 650);
  UPDATE public.users SET sat_test_date = (current_date + 28) WHERE id = v_maya;

  INSERT INTO public.family_message_triage (parent_user_id, student_user_id, state, summary, asking, last_message_id, model, updated_at)
  VALUES (v_parent, v_maya, 'needs_you', 'Rachel asks to move Maya''s session this week because of a school concert. Earlier question about materials was answered.', 'Move this week''s session to the weekend', v_open, 'sample (seed)', now());

  INSERT INTO public.family_message_drafts (parent_user_id, student_user_id, kind, draft, model, created_at)
  VALUES (v_parent, v_maya, 'reschedule', E'Hi Rachel,\n\nNo problem, good luck to Maya at the concert! I can move her session to Saturday at [time]. Does that work for you?\n\nZakaria', 'sample (seed)', now());
END $$;
