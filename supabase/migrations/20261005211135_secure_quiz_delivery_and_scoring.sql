-- Quiz writes run under one Postgres transaction per RPC. Only the server's
-- service role may call these functions; the browser never receives the key.
CREATE OR REPLACE FUNCTION public.start_quiz_attempt_atomic(
  p_student_id text, p_node_id text
) RETURNS public.quiz_attempts
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_attempt public.quiz_attempts%ROWTYPE;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_student_id), pg_catalog.hashtext(p_node_id));
  SELECT * INTO v_attempt FROM public.quiz_attempts
    WHERE student_id = p_student_id AND node_id = p_node_id AND completed_at IS NULL
    ORDER BY started_at DESC, id DESC LIMIT 1;
  IF FOUND THEN RETURN v_attempt; END IF;
  INSERT INTO public.quiz_attempts (student_id, node_id, attempt_number)
    SELECT p_student_id, p_node_id, COALESCE(MAX(attempt_number), 0) + 1
    FROM public.quiz_attempts WHERE student_id = p_student_id AND node_id = p_node_id
    RETURNING * INTO v_attempt;
  RETURN v_attempt;
END $$;

CREATE OR REPLACE FUNCTION public.record_quiz_response_once(
  p_attempt_id uuid, p_student_id text, p_question_id uuid,
  p_answer text, p_correct boolean, p_difficulty public.question_difficulty, p_seconds integer
) RETURNS public.question_responses
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_attempt public.quiz_attempts%ROWTYPE; v_response public.question_responses%ROWTYPE;
BEGIN
  SELECT * INTO v_attempt FROM public.quiz_attempts
    WHERE id = p_attempt_id AND student_id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quiz attempt is unavailable'; END IF;
  SELECT * INTO v_response FROM public.question_responses
    WHERE attempt_id = p_attempt_id AND question_id = p_question_id
    ORDER BY answered_at, id LIMIT 1;
  IF FOUND THEN RETURN v_response; END IF;
  IF v_attempt.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Quiz attempt is complete'; END IF;
  INSERT INTO public.question_responses (
    attempt_id, question_id, student_answer, is_correct, difficulty_at_time, response_time_seconds
  ) VALUES (
    p_attempt_id, p_question_id, p_answer, p_correct, p_difficulty,
    GREATEST(0, LEAST(COALESCE(p_seconds, 0), 86400))
  ) RETURNING * INTO v_response;
  RETURN v_response;
END $$;

CREATE OR REPLACE FUNCTION public.complete_quiz_attempt_atomic(
  p_attempt_id uuid, p_student_id text, p_node_id text,
  p_expected_count integer, p_adaptive_path jsonb
) RETURNS TABLE(result_score integer, result_status text, result_band public.confidence_band)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_attempt public.quiz_attempts%ROWTYPE;
  v_count integer; v_correct integer; v_score integer;
  v_band public.confidence_band; v_status text;
BEGIN
  SELECT * INTO v_attempt FROM public.quiz_attempts
    WHERE id = p_attempt_id AND student_id = p_student_id AND node_id = p_node_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quiz attempt is unavailable'; END IF;
  IF v_attempt.completed_at IS NOT NULL THEN
    SELECT status INTO v_status FROM public.learn_node_status
      WHERE user_id = p_student_id AND node_id = p_node_id;
    RETURN QUERY SELECT v_attempt.score, COALESCE(v_status, 'in_progress'), v_attempt.confidence_band;
    RETURN;
  END IF;
  IF p_expected_count IS NULL OR p_expected_count < 1 OR p_expected_count > 10 THEN
    RAISE EXCEPTION 'Invalid quiz question count';
  END IF;
  SELECT COUNT(*)::integer, COUNT(*) FILTER (WHERE is_correct)::integer
    INTO v_count, v_correct FROM (
      SELECT DISTINCT ON (question_id) question_id, is_correct
      FROM public.question_responses WHERE attempt_id = p_attempt_id
      ORDER BY question_id, answered_at, id
    ) first_responses;
  IF v_count <> p_expected_count THEN RAISE EXCEPTION 'Quiz is not complete yet'; END IF;
  v_score := ROUND(100.0 * v_correct / v_count)::integer;
  v_band := CASE WHEN v_score < 40 THEN 'struggling'::public.confidence_band
    WHEN v_score < 65 THEN 'developing'::public.confidence_band
    WHEN v_score < 80 THEN 'proficient'::public.confidence_band
    ELSE 'mastered'::public.confidence_band END;

  UPDATE public.quiz_attempts SET score = v_score, questions_answered = v_count,
    questions_correct = v_correct, confidence_band = v_band,
    adaptive_path = COALESCE(p_adaptive_path, '[]'::jsonb), completed_at = now()
    WHERE id = p_attempt_id;

  INSERT INTO public.learn_node_status AS current_status (
    user_id, node_id, status, last_quiz_score, best_quiz_score,
    consecutive_passes, confidence_band, attempts, updated_at, completed_at
  ) VALUES (
    p_student_id, p_node_id,
    CASE WHEN v_score >= 80 THEN 'partially_complete' ELSE 'in_progress' END,
    v_score, v_score, CASE WHEN v_score >= 80 THEN 1 ELSE 0 END,
    v_band::text, 1, now(), NULL
  ) ON CONFLICT (user_id, node_id) DO UPDATE SET
    attempts = COALESCE(current_status.attempts, 0) + 1,
    last_quiz_score = v_score,
    best_quiz_score = GREATEST(COALESCE(current_status.best_quiz_score, 0), v_score),
    consecutive_passes = CASE WHEN v_score >= 80
      THEN COALESCE(current_status.consecutive_passes, 0) + 1 ELSE 0 END,
    confidence_band = v_band::text,
    status = CASE WHEN v_score < 80 THEN 'in_progress'
      WHEN COALESCE(current_status.consecutive_passes, 0) + 1 >= 2 THEN 'mastered'
      ELSE 'partially_complete' END,
    completed_at = CASE WHEN v_score >= 80 AND COALESCE(current_status.consecutive_passes, 0) + 1 >= 2
      THEN now() ELSE NULL END,
    updated_at = now()
  RETURNING status INTO v_status;
  RETURN QUERY SELECT v_score, v_status, v_band;
END $$;

REVOKE ALL ON FUNCTION public.start_quiz_attempt_atomic(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_quiz_response_once(uuid, text, uuid, text, boolean, public.question_difficulty, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_quiz_attempt_atomic(uuid, text, text, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_quiz_attempt_atomic(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_quiz_response_once(uuid, text, uuid, text, boolean, public.question_difficulty, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_quiz_attempt_atomic(uuid, text, text, integer, jsonb) TO service_role;
