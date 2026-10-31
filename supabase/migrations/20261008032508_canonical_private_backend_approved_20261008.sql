-- Recorded from production supabase_migrations.schema_migrations (20261008032508).
-- Applied by hand on 20261008; this file makes the repo match production history. Do not edit.
-- PROPOSAL ONLY. One atomic additive schema + scoped ACL operation.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '90s';
-- Local-only canonical practice lane. Do not apply to production without release review.
CREATE TABLE public.catalog_practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  skill_id text NOT NULL,
  assignment_id uuid,
  snapshots jsonb NOT NULL CHECK (jsonb_typeof(snapshots) = 'array' AND jsonb_array_length(snapshots) BETWEEN 1 AND 10),
  score integer CHECK (score BETWEEN 0 AND 100),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX catalog_practice_sessions_owner_idx ON public.catalog_practice_sessions(student_id, skill_id, started_at DESC);
CREATE UNIQUE INDEX catalog_practice_one_open_idx ON public.catalog_practice_sessions(student_id, skill_id, COALESCE(assignment_id::text, '')) WHERE completed_at IS NULL;
ALTER TABLE public.catalog_practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.catalog_practice_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.catalog_practice_sessions(id) ON DELETE CASCADE,
  ordinal integer NOT NULL CHECK (ordinal BETWEEN 0 AND 9),
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id),
  student_answer text NOT NULL,
  is_correct boolean NOT NULL,
  response_time_seconds integer NOT NULL CHECK (response_time_seconds BETWEEN 0 AND 86400),
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, ordinal),
  UNIQUE(session_id, question_id)
);
ALTER TABLE public.catalog_practice_responses ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.catalog_practice_owned(p_session_id uuid, p_student_id text) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'id', s.id, 'studentId', s.student_id, 'skillId', s.skill_id,
    'assignmentId', s.assignment_id, 'snapshots', s.snapshots,
    'score', s.score, 'completedAt', s.completed_at,
    'responses', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'questionId', r.question_id, 'studentAnswer', r.student_answer,
      'isCorrect', r.is_correct, 'responseTimeSeconds', r.response_time_seconds
    ) ORDER BY r.ordinal) FROM public.catalog_practice_responses r WHERE r.session_id = s.id), '[]'::jsonb)
  ) FROM public.catalog_practice_sessions s WHERE s.id = p_session_id AND s.student_id = p_student_id;
$$;

CREATE FUNCTION public.catalog_practice_start(
  p_student_id text, p_skill_id text, p_assignment_id uuid, p_snapshots jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_id uuid; v_count integer;
BEGIN
  v_count := jsonb_array_length(p_snapshots);
  IF v_count IS NULL OR v_count < 1 OR v_count > 10 THEN RAISE EXCEPTION 'Invalid practice pool'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_snapshots) AS item
    WHERE item->'binding'->>'catalogSkillId' IS DISTINCT FROM p_skill_id
       OR item->'binding'->>'questionId' IS NULL
       OR item->'binding'->>'stableQuestionId' IS NULL
       OR item->'binding'->>'payloadSha256' IS NULL)
  THEN RAISE EXCEPTION 'Invalid practice snapshot'; END IF;
  IF (SELECT count(DISTINCT item->'binding'->>'stableQuestionId') FROM jsonb_array_elements(p_snapshots) AS item) <> v_count
  THEN RAISE EXCEPTION 'Duplicate canonical question'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_student_id), pg_catalog.hashtext(p_skill_id || COALESCE(p_assignment_id::text, '')));
  SELECT id INTO v_id FROM public.catalog_practice_sessions
    WHERE student_id = p_student_id AND skill_id = p_skill_id
      AND assignment_id IS NOT DISTINCT FROM p_assignment_id AND completed_at IS NULL
    ORDER BY started_at DESC LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.catalog_practice_sessions(student_id, skill_id, assignment_id, snapshots)
      VALUES (p_student_id, p_skill_id, p_assignment_id, p_snapshots) RETURNING id INTO v_id;
  END IF;
  RETURN public.catalog_practice_owned(v_id, p_student_id);
END $$;

CREATE FUNCTION public.catalog_practice_record_once(
  p_session_id uuid, p_student_id text, p_question_id uuid, p_answer text,
  p_correct boolean, p_seconds integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_session public.catalog_practice_sessions%ROWTYPE; v_response public.catalog_practice_responses%ROWTYPE; v_ordinal integer;
BEGIN
  SELECT * INTO v_session FROM public.catalog_practice_sessions
    WHERE id = p_session_id AND student_id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Practice session is unavailable'; END IF;
  SELECT * INTO v_response FROM public.catalog_practice_responses
    WHERE session_id = p_session_id AND question_id = p_question_id;
  IF FOUND THEN
    RETURN jsonb_build_object('questionId', v_response.question_id, 'studentAnswer', v_response.student_answer,
      'isCorrect', v_response.is_correct, 'responseTimeSeconds', v_response.response_time_seconds);
  END IF;
  IF v_session.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Practice session is complete'; END IF;
  SELECT count(*) INTO v_ordinal FROM public.catalog_practice_responses WHERE session_id = p_session_id;
  IF (v_session.snapshots->v_ordinal->'binding'->>'questionId') IS DISTINCT FROM p_question_id::text
  THEN RAISE EXCEPTION 'Question is not next'; END IF;
  INSERT INTO public.catalog_practice_responses(session_id, ordinal, question_id, student_answer, is_correct, response_time_seconds)
    VALUES (p_session_id, v_ordinal, p_question_id, p_answer, p_correct, p_seconds) RETURNING * INTO v_response;
  RETURN jsonb_build_object('questionId', v_response.question_id, 'studentAnswer', v_response.student_answer,
    'isCorrect', v_response.is_correct, 'responseTimeSeconds', v_response.response_time_seconds);
END $$;

CREATE FUNCTION public.catalog_practice_complete(p_session_id uuid, p_student_id text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_session public.catalog_practice_sessions%ROWTYPE; v_total integer; v_correct integer;
BEGIN
  SELECT * INTO v_session FROM public.catalog_practice_sessions
    WHERE id = p_session_id AND student_id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Practice session is unavailable'; END IF;
  IF v_session.completed_at IS NULL THEN
    SELECT count(*), count(*) FILTER (WHERE is_correct) INTO v_total, v_correct
      FROM public.catalog_practice_responses WHERE session_id = p_session_id;
    IF v_total <> jsonb_array_length(v_session.snapshots) THEN RAISE EXCEPTION 'Practice session is incomplete'; END IF;
    UPDATE public.catalog_practice_sessions SET score = round(100.0 * v_correct / v_total), completed_at = now()
      WHERE id = p_session_id;
  END IF;
  RETURN public.catalog_practice_owned(p_session_id, p_student_id);
END $$;

REVOKE ALL ON public.catalog_practice_sessions, public.catalog_practice_responses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.catalog_practice_owned(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.catalog_practice_start(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.catalog_practice_record_once(uuid, text, uuid, text, boolean, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.catalog_practice_complete(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.catalog_practice_sessions, public.catalog_practice_responses TO service_role;
GRANT EXECUTE ON FUNCTION public.catalog_practice_owned(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.catalog_practice_start(text, text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.catalog_practice_record_once(uuid, text, uuid, text, boolean, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.catalog_practice_complete(uuid, text) TO service_role;

-- Local candidate only. Apply after 20261008020000_catalog_practice_sessions.sql
-- in a disposable database before any separately approved production migration.
-- No legacy quiz, checkpoint, cohort-homework, or student history row is changed.

CREATE TABLE public.catalog_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  request_fingerprint TEXT NOT NULL,
  educator_clerk_id TEXT NOT NULL,
  student_clerk_id TEXT NOT NULL,
  catalog_skill_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 140),
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'cancelled')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (educator_clerk_id, request_id)
);

CREATE INDEX catalog_assignments_student_idx
  ON public.catalog_assignments (student_clerk_id, created_at DESC);

CREATE TABLE public.catalog_assignment_items (
  assignment_id UUID NOT NULL
    REFERENCES public.catalog_assignments(id) ON DELETE RESTRICT,
  position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 10),
  question_id UUID NOT NULL
    REFERENCES public.quiz_questions(id) ON DELETE RESTRICT,
  stable_question_id TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  source_pdf TEXT,
  source_page INTEGER,
  delivery_snapshot JSONB NOT NULL,
  PRIMARY KEY (assignment_id, position),
  UNIQUE (assignment_id, question_id),
  UNIQUE (assignment_id, stable_question_id),
  CHECK (COALESCE(jsonb_typeof(delivery_snapshot) = 'object', FALSE)),
  CHECK (COALESCE(jsonb_typeof(delivery_snapshot -> 'binding') = 'object', FALSE)),
  CHECK (COALESCE(delivery_snapshot -> 'binding' ->> 'questionId' = question_id::text, FALSE)),
  CHECK (COALESCE(delivery_snapshot -> 'binding' ->> 'stableQuestionId' = stable_question_id, FALSE)),
  CHECK (COALESCE(delivery_snapshot -> 'binding' ->> 'payloadSha256' = payload_sha256, FALSE))
);

-- A correction creates a new assignment, not an in-place edit of what was
-- assigned. Cancellation retains both the original refs and student history.
CREATE FUNCTION public.reject_catalog_assignment_item_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Catalog assignment items are immutable';
END;
$$;

CREATE TRIGGER catalog_assignment_items_immutable
BEFORE UPDATE OR DELETE ON public.catalog_assignment_items
FOR EACH ROW EXECUTE FUNCTION public.reject_catalog_assignment_item_change();

CREATE FUNCTION public.reject_catalog_assignment_identity_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.request_id, NEW.request_fingerprint, NEW.educator_clerk_id,
         NEW.student_clerk_id, NEW.catalog_skill_id, NEW.created_at)
     IS DISTINCT FROM
     ROW(OLD.request_id, OLD.request_fingerprint, OLD.educator_clerk_id,
         OLD.student_clerk_id, OLD.catalog_skill_id, OLD.created_at) THEN
    RAISE EXCEPTION 'Catalog assignment identity is immutable';
  END IF;
  IF OLD.status = 'cancelled'
     OR (OLD.status = 'active' AND NEW.status <> 'active' AND NEW.status <> 'cancelled')
     OR NEW.revision <> OLD.revision + 1 THEN
    RAISE EXCEPTION 'Catalog assignment state or revision is invalid';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER catalog_assignment_identity_immutable
BEFORE UPDATE ON public.catalog_assignments
FOR EACH ROW EXECUTE FUNCTION public.reject_catalog_assignment_identity_change();

ALTER TABLE public.catalog_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_assignment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_assignments_service_only
  ON public.catalog_assignments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY catalog_assignment_items_service_only
  ON public.catalog_assignment_items FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
REVOKE ALL ON public.catalog_assignments, public.catalog_assignment_items
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.catalog_assignments TO service_role;
GRANT SELECT, INSERT ON public.catalog_assignment_items TO service_role;

-- One RPC keeps header/items all-or-nothing and makes request retries safe.
-- Authenticated actor and approved snapshot checks are enforced in the server
-- action/service before this service-role-only call.
CREATE FUNCTION public.create_catalog_assignment_draft(
  p_request_id UUID,
  p_request_fingerprint TEXT,
  p_educator_clerk_id TEXT,
  p_student_clerk_id TEXT,
  p_catalog_skill_id TEXT,
  p_title TEXT,
  p_due_at TIMESTAMPTZ,
  p_items JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_id UUID;
  v_prior public.catalog_assignments%ROWTYPE;
  v_item JSONB;
  v_position INTEGER := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 10 THEN
    RAISE EXCEPTION 'Assignment requires 1 to 10 questions';
  END IF;

  INSERT INTO public.catalog_assignments (
    request_id, request_fingerprint, educator_clerk_id, student_clerk_id,
    catalog_skill_id, title, due_at
  ) VALUES (
    p_request_id, p_request_fingerprint, p_educator_clerk_id, p_student_clerk_id,
    p_catalog_skill_id, p_title, p_due_at
  )
  ON CONFLICT (educator_clerk_id, request_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT * INTO v_prior FROM public.catalog_assignments
      WHERE educator_clerk_id = p_educator_clerk_id AND request_id = p_request_id;
    IF NOT FOUND OR v_prior.request_fingerprint <> p_request_fingerprint THEN
      RAISE EXCEPTION 'Request ID was already used for a different assignment';
    END IF;
    RETURN v_prior.id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_position := v_position + 1;
    INSERT INTO public.catalog_assignment_items (
      assignment_id, position, question_id, stable_question_id, payload_sha256,
      source_pdf, source_page, delivery_snapshot
    ) VALUES (
      v_id, v_position, (v_item ->> 'questionId')::UUID,
      v_item ->> 'stableQuestionId', v_item ->> 'payloadSha256',
      v_item ->> 'sourcePdf', (v_item ->> 'sourcePage')::INTEGER,
      v_item -> 'snapshot'
    );
  END LOOP;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_catalog_assignment_draft(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_catalog_assignment_draft(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB
) TO service_role;

-- A session may point to the assignment that supplied its exact ordered
-- bindings. The practice migration intentionally leaves this FK for this
-- later additive migration so each migration has one owner.
ALTER TABLE public.catalog_practice_sessions
  ADD CONSTRAINT catalog_practice_sessions_assignment_fk
  FOREIGN KEY (assignment_id) REFERENCES public.catalog_assignments(id)
  ON DELETE RESTRICT;

-- PROPOSAL ONLY. Not executed anywhere in this assessment.
-- Execute in the SAME transaction as the two pinned CREATE migrations.
-- Current public default ACLs grant anon/authenticated EXECUTE directly and
-- service_role broader table rights. Explicit GRANT alone cannot narrow those.
-- This appendix affects only these four new tables and seven new functions.
REVOKE ALL PRIVILEGES ON TABLE
  public.catalog_practice_sessions, public.catalog_practice_responses,
  public.catalog_assignments, public.catalog_assignment_items
FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE
  public.catalog_practice_sessions, public.catalog_assignments TO service_role;
GRANT SELECT, INSERT ON TABLE
  public.catalog_practice_responses, public.catalog_assignment_items TO service_role;

REVOKE ALL PRIVILEGES ON FUNCTION
  public.catalog_practice_owned(uuid, text),
  public.catalog_practice_start(text, text, uuid, jsonb),
  public.catalog_practice_record_once(uuid, text, uuid, text, boolean, integer),
  public.catalog_practice_complete(uuid, text),
  public.create_catalog_assignment_draft(uuid, text, text, text, text, text, timestamptz, jsonb),
  public.reject_catalog_assignment_item_change(),
  public.reject_catalog_assignment_identity_change()
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION
  public.catalog_practice_owned(uuid, text),
  public.catalog_practice_start(text, text, uuid, jsonb),
  public.catalog_practice_record_once(uuid, text, uuid, text, boolean, integer),
  public.catalog_practice_complete(uuid, text),
  public.create_catalog_assignment_draft(uuid, text, text, text, text, text, timestamptz, jsonb),
  public.reject_catalog_assignment_item_change(),
  public.reject_catalog_assignment_identity_change()
TO service_role;
-- No role memberships, schema grants, auth settings, existing-object grants,
-- SECURITY DEFINER functions, storage policies or global defaults are changed.

-- PROPOSAL ONLY: metadata assertion inside the schema transaction, after ACL appendix.
DO $new_acl_check$
DECLARE rel text; actor text; fn text; privilege text;
BEGIN
 FOREACH rel IN ARRAY ARRAY['catalog_practice_sessions','catalog_practice_responses','catalog_assignments','catalog_assignment_items'] LOOP
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||rel)::regclass) THEN RAISE EXCEPTION 'New table RLS missing'; END IF;
  FOREACH actor IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_table_privilege(actor,'public.'||rel,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') THEN RAISE EXCEPTION 'New table public/inherited privilege remains'; END IF;
  END LOOP;
  IF NOT has_table_privilege('service_role','public.'||rel,'SELECT') OR NOT has_table_privilege('service_role','public.'||rel,'INSERT') THEN RAISE EXCEPTION 'New service read/write missing'; END IF;
  IF has_table_privilege('service_role','public.'||rel,'DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') THEN RAISE EXCEPTION 'Unneeded new service privilege remains'; END IF;
  IF rel IN ('catalog_practice_sessions','catalog_assignments') AND NOT has_table_privilege('service_role','public.'||rel,'UPDATE') THEN RAISE EXCEPTION 'New service update missing'; END IF;
  IF rel IN ('catalog_practice_responses','catalog_assignment_items') AND has_table_privilege('service_role','public.'||rel,'UPDATE') THEN RAISE EXCEPTION 'Unneeded response/item update remains'; END IF;
 END LOOP;
 FOREACH fn IN ARRAY ARRAY[
  'public.catalog_practice_owned(uuid,text)',
  'public.catalog_practice_start(text,text,uuid,jsonb)',
  'public.catalog_practice_record_once(uuid,text,uuid,text,boolean,integer)',
  'public.catalog_practice_complete(uuid,text)',
  'public.create_catalog_assignment_draft(uuid,text,text,text,text,text,timestamptz,jsonb)',
  'public.reject_catalog_assignment_item_change()',
  'public.reject_catalog_assignment_identity_change()'
 ] LOOP
  FOREACH actor IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_function_privilege(actor,fn,'EXECUTE') THEN RAISE EXCEPTION 'New function public/inherited execute remains'; END IF;
  END LOOP;
  IF NOT has_function_privilege('service_role',fn,'EXECUTE') THEN RAISE EXCEPTION 'New service function execute missing'; END IF;
  IF (SELECT prosecdef FROM pg_proc WHERE oid=fn::regprocedure) THEN RAISE EXCEPTION 'Unexpected SECURITY DEFINER function'; END IF;
 END LOOP;
END $new_acl_check$;

COMMIT;
