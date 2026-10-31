-- Recorded from production supabase_migrations.schema_migrations (20261008080327).
-- Applied by hand on 20261008; this file makes the repo match production history. Do not edit.
-- Exact proposed booking-only migrations. UNAPPLIED. No historical/canonical replay.
-- 20261008041202_booking_creation_intents.sql
-- Local proposal only: durable self-booking retries; no production application.
CREATE TABLE public.booking_creation_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.users(id),
  tutor_id uuid NOT NULL REFERENCES public.users(id),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  event_type_id bigint NOT NULL CHECK (event_type_id > 0),
  plan_tier text NOT NULL CHECK (plan_tier IN ('private', 'elite')),
  scheduled_start timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','creating','provider_confirmed','completed')),
  provider_response jsonb,
  zoom_join_url text,
  booking_id uuid REFERENCES public.bookings(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, request_sha256),
  CHECK (state NOT IN ('provider_confirmed','completed') OR provider_response IS NOT NULL),
  CHECK (state <> 'completed' OR booking_id IS NOT NULL)
);
ALTER TABLE public.booking_creation_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_creation_intents FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.booking_creation_intents TO service_role;

CREATE FUNCTION public.confirm_booking_creation_intent(p_id uuid, p_response jsonb, p_zoom_join_url text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE i public.booking_creation_intents%rowtype;
BEGIN
  SELECT * INTO STRICT i FROM public.booking_creation_intents WHERE id=p_id FOR UPDATE;
  IF i.state='pending' OR (p_response->>'eventTypeId')::bigint IS DISTINCT FROM i.event_type_id
    OR (p_response->>'start')::timestamptz IS DISTINCT FROM i.scheduled_start
    OR coalesce(p_response->>'uid','') = ''
    OR (p_response->>'end')::timestamptz <= i.scheduled_start
    OR p_response->>'end' IS NULL THEN RAISE EXCEPTION 'Invalid provider confirmation'; END IF;
  IF i.provider_response IS NOT NULL AND i.provider_response->>'uid' <> p_response->>'uid'
    THEN RAISE EXCEPTION 'Provider UID conflict'; END IF;
  IF i.state='completed' THEN
    IF p_zoom_join_url IS NOT NULL THEN
      UPDATE public.bookings SET zoom_join_url=p_zoom_join_url,
        zoom_meeting_id=coalesce(p_response->>'zoomMeetingId',zoom_meeting_id) WHERE id=i.booking_id;
    END IF;
    RETURN;
  END IF;
  UPDATE public.booking_creation_intents SET state='provider_confirmed',
    provider_response=coalesce(provider_response,p_response),
    zoom_join_url=coalesce(p_zoom_join_url,zoom_join_url,p_response->>'meetingUrl') WHERE id=p_id;
END $$;

CREATE FUNCTION public.finalize_booking_creation_intent(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE i public.booking_creation_intents%rowtype; b public.bookings%rowtype; token_id uuid;
BEGIN
  SELECT * INTO STRICT i FROM public.booking_creation_intents WHERE id=p_id FOR UPDATE;
  IF i.state='completed' THEN
    SELECT * INTO STRICT b FROM public.bookings WHERE id=i.booking_id;
    RETURN to_jsonb(b);
  END IF;
  IF i.state <> 'provider_confirmed' THEN RAISE EXCEPTION 'Provider reconciliation required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tutor_assignments a JOIN public.users t ON t.id=a.tutor_user_id
    JOIN public.users s ON s.id=a.student_user_id WHERE a.student_user_id=i.student_id
    AND a.tutor_user_id=i.tutor_id AND a.ended_at IS NULL AND s.role='student' AND t.role='tutor'
    AND t.cal_event_type_id=i.event_type_id AND t.cal_connected_at IS NOT NULL)
    THEN RAISE EXCEPTION 'Assigned tutor changed; reconcile booking'; END IF;
  SELECT * INTO b FROM public.bookings WHERE cal_booking_uid=i.provider_response->>'uid' FOR UPDATE;
  IF FOUND AND (b.student_id<>i.student_id OR b.tutor_id<>i.tutor_id OR b.scheduled_start<>i.scheduled_start
    OR b.cal_event_type_id::bigint<>i.event_type_id) THEN RAISE EXCEPTION 'Existing booking binding conflict'; END IF;
  IF b.id IS NULL THEN
    INSERT INTO public.bookings(student_id,tutor_id,plan_tier,cal_booking_uid,cal_event_type_id,
      scheduled_start,scheduled_end,zoom_join_url,zoom_meeting_id)
    VALUES(i.student_id,i.tutor_id,i.plan_tier,i.provider_response->>'uid',i.event_type_id::text,
      i.scheduled_start,(i.provider_response->>'end')::timestamptz,i.zoom_join_url,i.provider_response->>'zoomMeetingId') RETURNING * INTO b;
  END IF;
  SELECT id INTO token_id FROM public.tokens WHERE user_id=i.student_id AND assigned_booking_id=b.id FOR UPDATE;
  IF token_id IS NULL THEN
    SELECT id INTO token_id FROM public.tokens WHERE user_id=i.student_id AND consumed_at IS NULL
      AND assigned_booking_id IS NULL AND (expires_at IS NULL OR expires_at>now())
      ORDER BY expires_at ASC NULLS LAST, id LIMIT 1 FOR UPDATE SKIP LOCKED;
    IF token_id IS NULL THEN RAISE EXCEPTION 'No session credit available; reconcile booking'; END IF;
    UPDATE public.tokens SET assigned_booking_id=b.id WHERE id=token_id;
  END IF;
  UPDATE public.booking_creation_intents SET state='completed',booking_id=b.id WHERE id=p_id;
  RETURN to_jsonb(b);
END $$;
REVOKE ALL ON FUNCTION public.confirm_booking_creation_intent(uuid,jsonb,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finalize_booking_creation_intent(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_booking_creation_intent(uuid,jsonb,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_booking_creation_intent(uuid) TO service_role;

-- 20261008043830_booking_callback_ordering.sql
-- Local proposal: capture cancellation actor before Cal, and separate
-- reschedule notification delivery from the booking's saved start time.
CREATE TABLE public.booking_cancellation_intents (
  booking_id uuid PRIMARY KEY REFERENCES public.bookings(id),
  actor_id uuid NOT NULL REFERENCES public.users(id),
  scheduled_start timestamptz NOT NULL,
  within_window boolean NOT NULL,
  credit_forfeited boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);
CREATE TABLE public.booking_reschedule_receipts (
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  old_start timestamptz NOT NULL,
  email_id uuid NOT NULL REFERENCES public.failed_emails(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (booking_id, scheduled_start, scheduled_end)
);
ALTER TABLE public.booking_cancellation_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_reschedule_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_cancellation_intents, public.booking_reschedule_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.booking_cancellation_intents TO service_role;
GRANT SELECT, INSERT ON public.booking_reschedule_receipts TO service_role;

CREATE FUNCTION public.begin_booking_cancellation(p_booking_id uuid, p_actor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE b public.bookings%rowtype; i public.booking_cancellation_intents%rowtype; w boolean;
BEGIN
  SELECT * INTO STRICT b FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  IF p_actor_id IS NULL OR p_actor_id NOT IN (b.student_id,b.tutor_id) THEN
    RAISE EXCEPTION 'Booking ownership required'; END IF;
  IF b.status<>'scheduled' THEN RAISE EXCEPTION 'Booking is not scheduled'; END IF;
  SELECT * INTO i FROM public.booking_cancellation_intents WHERE booking_id=b.id;
  IF FOUND THEN
    IF i.actor_id<>p_actor_id OR i.scheduled_start<>b.scheduled_start THEN RAISE EXCEPTION 'Cancellation already pending for another actor'; END IF;
    RETURN;
  END IF;
  w := b.scheduled_start - now() < interval '24 hours';
  INSERT INTO public.booking_cancellation_intents(booking_id,actor_id,scheduled_start,within_window,credit_forfeited)
    VALUES(b.id,p_actor_id,b.scheduled_start,w,p_actor_id=b.student_id AND w AND b.plan_tier IN ('private','elite'));
END $$;

CREATE FUNCTION public.apply_booking_cancellation(p_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE b public.bookings%rowtype; i public.booking_cancellation_intents%rowtype; w boolean; f boolean;
BEGIN
  SELECT * INTO STRICT b FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  IF b.status NOT IN ('scheduled','cancelled') THEN RAISE EXCEPTION 'Booking cannot be cancelled'; END IF;
  SELECT * INTO i FROM public.booking_cancellation_intents WHERE booking_id=b.id;
  IF b.status='cancelled' THEN
    w := coalesce(b.cancelled_within_window,false); f := b.credit_forfeited;
  ELSIF i.booking_id IS NOT NULL THEN
    IF i.scheduled_start<>b.scheduled_start THEN RAISE EXCEPTION 'Booking changed; cancellation reconciliation required'; END IF;
    w := i.within_window; f := i.credit_forfeited;
  ELSE
    -- Signed out-of-band callback: retain existing policy; no inferred tutor actor.
    w := b.scheduled_start - now() < interval '24 hours';
    f := w AND b.plan_tier IN ('private','elite');
  END IF;
  UPDATE public.bookings SET status='cancelled',cancelled_at=coalesce(cancelled_at,now()),
    cancelled_within_window=w,credit_forfeited=f WHERE id=b.id RETURNING * INTO b;
  IF f THEN
    UPDATE public.tokens SET consumed_at=now(),consumed_reason='forfeited_within_window'
      WHERE assigned_booking_id=b.id AND consumed_at IS NULL;
  ELSE
    UPDATE public.tokens SET assigned_booking_id=NULL
      WHERE assigned_booking_id=b.id AND consumed_at IS NULL;
  END IF;
  UPDATE public.booking_cancellation_intents SET applied_at=coalesce(applied_at,now()) WHERE booking_id=b.id;
  RETURN to_jsonb(b);
END $$;

CREATE FUNCTION public.queue_booking_reschedule(p_booking_id uuid, p_uid text,
  p_start timestamptz, p_end timestamptz, p_location text, p_email_args jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE b public.bookings%rowtype; previous timestamptz; email uuid; key text; args jsonb;
BEGIN
  SELECT * INTO STRICT b FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  IF b.cal_booking_uid IS DISTINCT FROM p_uid OR b.status<>'scheduled'
    OR p_start IS NULL OR p_end IS NULL OR NOT isfinite(p_start) OR NOT isfinite(p_end)
    OR p_end<=p_start THEN RAISE EXCEPTION 'Invalid reschedule event'; END IF;
  IF b.rescheduled_from=p_start AND b.scheduled_start<>p_start THEN
    RAISE EXCEPTION 'Stale reschedule event'; END IF;
  IF EXISTS(SELECT 1 FROM public.booking_reschedule_receipts WHERE booking_id=b.id
    AND scheduled_start=p_start AND scheduled_end=p_end) THEN RETURN false; END IF;
  IF b.scheduled_start=p_start AND b.scheduled_end=p_end THEN
    previous:=b.rescheduled_from;
    -- No prior time and no difference means this is not a known reschedule.
    IF previous IS NULL THEN RETURN false; END IF;
  ELSE
    previous:=b.scheduled_start;
    UPDATE public.bookings SET rescheduled_from=previous,scheduled_start=p_start,scheduled_end=p_end,
      zoom_join_url=coalesce(p_location,zoom_join_url) WHERE id=b.id RETURNING * INTO b;
  END IF;
  IF jsonb_typeof(p_email_args) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid email arguments'; END IF;
  args:=p_email_args || jsonb_build_object('uid',p_uid,'start',p_start,'end',p_end,'oldStart',previous,
    'meetingUrl',coalesce(b.zoom_join_url,p_location));
  key:=p_uid||':booking_reschedule:'||p_start::text;
  -- Adopt an already queued/succeeded legacy email rather than queue a duplicate.
  SELECT id INTO email FROM public.failed_emails WHERE dedupe_key IN
    (key,p_uid||':booking_reschedule:'||to_char(p_start AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    ORDER BY created_at DESC LIMIT 1;
  IF email IS NULL THEN
    INSERT INTO public.failed_emails(kind,payload,dedupe_key,booking_id,attempts,next_attempt_at,last_error)
      VALUES('booking_reschedule',args,key,b.id,0,now(),NULL) RETURNING id INTO email;
  END IF;
  INSERT INTO public.booking_reschedule_receipts(booking_id,scheduled_start,scheduled_end,old_start,email_id)
    VALUES(b.id,p_start,p_end,previous,email);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.begin_booking_cancellation(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.apply_booking_cancellation(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.queue_booking_reschedule(uuid,text,timestamptz,timestamptz,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_booking_cancellation(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_booking_cancellation(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.queue_booking_reschedule(uuid,text,timestamptz,timestamptz,text,jsonb) TO service_role;

-- 20261008053040_booking_reschedule_reconciliation.sql
-- Local proposal only. A reschedule callback records provider confirmation;
-- only the authorized API's reconciled meeting/credit transaction can notify.
CREATE TABLE public.booking_reschedule_intents (
  booking_id uuid PRIMARY KEY REFERENCES public.bookings(id),
  actor_id uuid NOT NULL REFERENCES public.users(id),
  old_start timestamptz NOT NULL,
  old_end timestamptz NOT NULL,
  old_uid text NOT NULL,
  event_type_id bigint NOT NULL,
  new_start timestamptz NOT NULL CHECK (isfinite(new_start)),
  within_window boolean NOT NULL,
  credit_forfeited boolean NOT NULL,
  state text NOT NULL DEFAULT 'creating'
    CHECK (state IN ('creating','provider_confirmed','completed')),
  provider_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (state='creating' OR provider_response IS NOT NULL)
);
ALTER TABLE public.booking_reschedule_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_reschedule_intents FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.booking_reschedule_intents TO service_role;

CREATE FUNCTION public.begin_booking_reschedule(p_booking_id uuid,p_actor_id uuid,p_start timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE b public.bookings%rowtype; i public.booking_reschedule_intents%rowtype; w boolean; f boolean;
BEGIN
  SELECT * INTO STRICT b FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  IF p_actor_id IS NULL OR p_actor_id NOT IN (b.student_id,b.tutor_id)
    THEN RAISE EXCEPTION 'Booking ownership required'; END IF;
  IF b.status<>'scheduled' OR p_start IS NULL OR NOT isfinite(p_start)
    THEN RAISE EXCEPTION 'Invalid booking reschedule'; END IF;
  SELECT * INTO i FROM public.booking_reschedule_intents WHERE booking_id=b.id;
  IF FOUND THEN
    IF i.actor_id<>p_actor_id OR i.new_start<>p_start
      THEN RAISE EXCEPTION 'Another reschedule already started'; END IF;
    IF i.state='completed' AND b.scheduled_start<>p_start
      THEN RAISE EXCEPTION 'Completed reschedule changed'; END IF;
    RETURN jsonb_build_object('claimed',false,'intent',to_jsonb(i));
  END IF;
  IF b.reschedule_count>=1 OR b.cal_booking_uid IS NULL OR b.cal_event_type_id IS NULL
    OR p_start=b.scheduled_start OR p_start<=now()
    OR EXISTS(SELECT 1 FROM public.booking_cancellation_intents WHERE booking_id=b.id)
    THEN RAISE EXCEPTION 'Booking cannot be rescheduled'; END IF;
  w:=b.scheduled_start-now()<interval '24 hours';
  f:=p_actor_id=b.student_id AND w AND b.plan_tier IN ('private','elite');
  IF f AND NOT EXISTS(SELECT 1 FROM public.tokens WHERE user_id=b.student_id
    AND consumed_at IS NULL AND assigned_booking_id IS NULL AND (expires_at IS NULL OR expires_at>now()))
    THEN RAISE EXCEPTION 'Replacement credit required'; END IF;
  INSERT INTO public.booking_reschedule_intents(booking_id,actor_id,old_start,old_end,old_uid,
    event_type_id,new_start,within_window,credit_forfeited)
    VALUES(b.id,p_actor_id,b.scheduled_start,b.scheduled_end,b.cal_booking_uid,
      b.cal_event_type_id::bigint,p_start,w,f) RETURNING * INTO i;
  RETURN jsonb_build_object('claimed',true,'intent',to_jsonb(i));
END $$;

CREATE FUNCTION public.confirm_booking_reschedule(p_booking_id uuid,p_response jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE i public.booking_reschedule_intents%rowtype;
BEGIN
  -- All reschedule RPCs lock the booking first: callback/API/cancel have one order.
  PERFORM 1 FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  SELECT * INTO STRICT i FROM public.booking_reschedule_intents WHERE booking_id=p_booking_id FOR UPDATE;
  IF coalesce(p_response->>'uid','')='' OR (p_response->>'eventTypeId')::bigint IS DISTINCT FROM i.event_type_id
    OR (p_response->>'start')::timestamptz IS DISTINCT FROM i.new_start
    OR p_response->>'end' IS NULL OR NOT isfinite((p_response->>'end')::timestamptz)
    OR (p_response->>'end')::timestamptz<=i.new_start
    THEN RAISE EXCEPTION 'Invalid reschedule confirmation'; END IF;
  IF i.provider_response IS NOT NULL AND (
    i.provider_response->>'uid' IS DISTINCT FROM p_response->>'uid'
    OR (i.provider_response->>'end')::timestamptz IS DISTINCT FROM (p_response->>'end')::timestamptz)
    THEN RAISE EXCEPTION 'Reschedule provider conflict'; END IF;
  IF i.state<>'completed' THEN
    UPDATE public.booking_reschedule_intents SET state='provider_confirmed',
      provider_response=p_response WHERE booking_id=p_booking_id RETURNING * INTO i;
  END IF;
  RETURN to_jsonb(i);
END $$;

CREATE FUNCTION public.complete_booking_reschedule(p_booking_id uuid,p_join_url text,
  p_meeting_id text,p_email_args jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE b public.bookings%rowtype; i public.booking_reschedule_intents%rowtype;
  replacement uuid; original uuid; email uuid; args jsonb;
BEGIN
  SELECT * INTO STRICT b FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  SELECT * INTO STRICT i FROM public.booking_reschedule_intents WHERE booking_id=b.id FOR UPDATE;
  IF i.state='completed' THEN
    IF b.status<>'scheduled' OR b.scheduled_start<>i.new_start
      THEN RAISE EXCEPTION 'Completed reschedule changed'; END IF;
    RETURN to_jsonb(b);
  END IF;
  IF i.state<>'provider_confirmed' OR b.status<>'scheduled' OR b.reschedule_count<>0
    OR b.scheduled_start<>i.old_start OR b.scheduled_end<>i.old_end OR b.cal_booking_uid<>i.old_uid
    OR b.cal_event_type_id::bigint<>i.event_type_id
    OR EXISTS(SELECT 1 FROM public.booking_cancellation_intents WHERE booking_id=b.id)
    THEN RAISE EXCEPTION 'Reschedule reconciliation required'; END IF;
  IF jsonb_typeof(p_email_args) IS DISTINCT FROM 'object'
    OR coalesce(p_email_args->>'studentEmail','')=''
    OR (p_meeting_id IS NOT NULL AND (p_join_url IS NULL OR p_join_url=i.provider_response->>'meetingUrl'))
    THEN RAISE EXCEPTION 'Reconciled meeting and email context required'; END IF;
  IF i.credit_forfeited THEN
    SELECT id INTO original FROM public.tokens WHERE user_id=b.student_id
      AND assigned_booking_id=b.id AND consumed_at IS NULL FOR UPDATE;
    SELECT id INTO replacement FROM public.tokens WHERE user_id=b.student_id AND consumed_at IS NULL
      AND assigned_booking_id IS NULL AND (expires_at IS NULL OR expires_at>now())
      ORDER BY expires_at ASC NULLS LAST,id LIMIT 1 FOR UPDATE SKIP LOCKED;
    IF original IS NULL OR replacement IS NULL THEN RAISE EXCEPTION 'Credit reconciliation required'; END IF;
    UPDATE public.tokens SET consumed_at=now(),consumed_reason='forfeited_within_window' WHERE id=original;
    UPDATE public.tokens SET assigned_booking_id=b.id WHERE id=replacement;
  END IF;
  UPDATE public.bookings SET rescheduled_from=i.old_start,scheduled_start=i.new_start,
    scheduled_end=(i.provider_response->>'end')::timestamptz,reschedule_count=reschedule_count+1,
    cancelled_within_window=i.within_window,credit_forfeited=i.credit_forfeited,
    cal_booking_uid=i.provider_response->>'uid',zoom_join_url=p_join_url,
    zoom_meeting_id=p_meeting_id,zoom_start_url=NULL WHERE id=b.id RETURNING * INTO b;
  args:=p_email_args || jsonb_build_object('uid',i.old_uid,'start',b.scheduled_start,
    'end',b.scheduled_end,'oldStart',i.old_start,'meetingUrl',b.zoom_join_url);
  INSERT INTO public.failed_emails(kind,payload,dedupe_key,booking_id,attempts,next_attempt_at,last_error)
    VALUES('booking_reschedule',args,b.cal_booking_uid||':booking_reschedule:'||b.scheduled_start::text,
      b.id,0,now(),NULL) RETURNING id INTO email;
  INSERT INTO public.booking_reschedule_receipts(booking_id,scheduled_start,scheduled_end,old_start,email_id)
    VALUES(b.id,b.scheduled_start,b.scheduled_end,i.old_start,email);
  UPDATE public.booking_reschedule_intents SET state='completed',completed_at=now() WHERE booking_id=b.id;
  RETURN to_jsonb(b);
END $$;

-- Keep the existing signed callback adapter, but it can no longer mutate a
-- booking or send a generic URL before the authorized API's atomic completion.
CREATE OR REPLACE FUNCTION public.queue_booking_reschedule(p_booking_id uuid,p_uid text,
  p_start timestamptz,p_end timestamptz,p_location text,p_email_args jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE b public.bookings%rowtype; i public.booking_reschedule_intents%rowtype;
BEGIN
  SELECT * INTO STRICT b FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  SELECT * INTO STRICT i FROM public.booking_reschedule_intents WHERE booking_id=b.id;
  IF b.status<>'scheduled' OR p_uid IS DISTINCT FROM b.cal_booking_uid OR p_start IS DISTINCT FROM i.new_start
    OR p_end IS NULL OR NOT isfinite(p_end) OR p_end<=p_start
    THEN RAISE EXCEPTION 'Reschedule callback reconciliation required'; END IF;
  IF i.state='completed' THEN
    IF b.scheduled_start<>p_start OR b.scheduled_end<>p_end
      THEN RAISE EXCEPTION 'Stale reschedule callback'; END IF;
    RETURN false;
  END IF;
  PERFORM public.confirm_booking_reschedule(b.id,jsonb_build_object('uid',p_uid,'eventTypeId',i.event_type_id,
    'start',p_start,'end',p_end,'status','accepted','meetingUrl',p_location));
  -- Nothing eligible for the email cron exists until complete_booking_reschedule.
  RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.begin_booking_reschedule(uuid,uuid,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.confirm_booking_reschedule(uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.complete_booking_reschedule(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_booking_reschedule(uuid,uuid,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_booking_reschedule(uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_booking_reschedule(uuid,text,text,jsonb) TO service_role;

-- Calendar updates/cancellation keep the original invitation UID if Cal moves
-- the provider booking to a new UID. Provider API calls use the current UID.
CREATE FUNCTION public.booking_calendar_uid(p_booking_id uuid)
RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT coalesce((SELECT i.old_uid FROM public.booking_reschedule_intents i
    WHERE i.booking_id=b.id AND i.state='completed'),b.cal_booking_uid)
    FROM public.bookings b WHERE b.id=p_booking_id;
$$;
REVOKE ALL ON FUNCTION public.booking_calendar_uid(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.booking_calendar_uid(uuid) TO service_role;

-- 20261008053938_booking_creation_meeting_readiness.sql
-- Local proposal only. Signed creation callbacks cannot finalize/send before
-- attendee-specific meeting preparation; saved provider UID still permits retry.
ALTER TABLE public.booking_creation_intents ADD COLUMN meeting_prepared boolean NOT NULL DEFAULT false;
CREATE FUNCTION public.prepare_booking_creation_meeting(p_id uuid,p_join_url text,p_meeting_id text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE i public.booking_creation_intents%rowtype;
BEGIN
  SELECT * INTO STRICT i FROM public.booking_creation_intents WHERE id=p_id FOR UPDATE;
  IF i.state='completed' THEN RETURN; END IF;
  IF i.state<>'provider_confirmed' OR (p_meeting_id IS NOT NULL AND
    (p_join_url IS NULL OR p_join_url=i.provider_response->>'meetingUrl'))
    THEN RAISE EXCEPTION 'Attendee meeting preparation required'; END IF;
  UPDATE public.booking_creation_intents SET meeting_prepared=true,zoom_join_url=p_join_url,
    provider_response=provider_response||jsonb_build_object('zoomMeetingId',p_meeting_id) WHERE id=p_id;
END $$;
CREATE OR REPLACE FUNCTION public.finalize_booking_creation_intent(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE i public.booking_creation_intents%rowtype; b public.bookings%rowtype; token_id uuid;
BEGIN
  SELECT * INTO STRICT i FROM public.booking_creation_intents WHERE id=p_id FOR UPDATE;
  IF i.state='completed' THEN
    SELECT * INTO STRICT b FROM public.bookings WHERE id=i.booking_id;
    RETURN to_jsonb(b);
  END IF;
  IF NOT i.meeting_prepared THEN RAISE EXCEPTION 'Attendee meeting preparation required'; END IF;
  IF i.state <> 'provider_confirmed' THEN RAISE EXCEPTION 'Provider reconciliation required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tutor_assignments a JOIN public.users t ON t.id=a.tutor_user_id
    JOIN public.users s ON s.id=a.student_user_id WHERE a.student_user_id=i.student_id
    AND a.tutor_user_id=i.tutor_id AND a.ended_at IS NULL AND s.role='student' AND t.role='tutor'
    AND t.cal_event_type_id=i.event_type_id AND t.cal_connected_at IS NOT NULL)
    THEN RAISE EXCEPTION 'Assigned tutor changed; reconcile booking'; END IF;
  SELECT * INTO b FROM public.bookings WHERE cal_booking_uid=i.provider_response->>'uid' FOR UPDATE;
  IF FOUND AND (b.student_id<>i.student_id OR b.tutor_id<>i.tutor_id OR b.scheduled_start<>i.scheduled_start
    OR b.cal_event_type_id::bigint<>i.event_type_id) THEN RAISE EXCEPTION 'Existing booking binding conflict'; END IF;
  IF b.id IS NULL THEN
    INSERT INTO public.bookings(student_id,tutor_id,plan_tier,cal_booking_uid,cal_event_type_id,
      scheduled_start,scheduled_end,zoom_join_url,zoom_meeting_id)
    VALUES(i.student_id,i.tutor_id,i.plan_tier,i.provider_response->>'uid',i.event_type_id::text,
      i.scheduled_start,(i.provider_response->>'end')::timestamptz,i.zoom_join_url,i.provider_response->>'zoomMeetingId') RETURNING * INTO b;
  END IF;
  SELECT id INTO token_id FROM public.tokens WHERE user_id=i.student_id AND assigned_booking_id=b.id FOR UPDATE;
  IF token_id IS NULL THEN
    SELECT id INTO token_id FROM public.tokens WHERE user_id=i.student_id AND consumed_at IS NULL
      AND assigned_booking_id IS NULL AND (expires_at IS NULL OR expires_at>now())
      ORDER BY expires_at ASC NULLS LAST, id LIMIT 1 FOR UPDATE SKIP LOCKED;
    IF token_id IS NULL THEN RAISE EXCEPTION 'No session credit available; reconcile booking'; END IF;
    UPDATE public.tokens SET assigned_booking_id=b.id WHERE id=token_id;
  END IF;
  UPDATE public.booking_creation_intents SET state='completed',booking_id=b.id WHERE id=p_id;
  RETURN to_jsonb(b);
END $$;
REVOKE ALL ON FUNCTION public.prepare_booking_creation_meeting(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_booking_creation_meeting(uuid,text,text) TO service_role;

-- 20261008060214_booking_reschedule_uid_lineage.sql
-- Unapplied local proposal. Cal's signed BOOKING_RESCHEDULED identifies the
-- new uid plus rescheduleUid/rescheduleStartTime/rescheduleEndTime of the old
-- booking. Same-UID callbacks are provisional until the API confirms identity.
ALTER TABLE public.booking_reschedule_intents ADD COLUMN callback_response jsonb;

CREATE FUNCTION public.find_booking_for_reschedule(p_uid text,p_previous_uid text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE ids uuid[]; resolved public.bookings%rowtype;
BEGIN
  IF coalesce(p_uid,'')='' THEN RAISE EXCEPTION 'Booking identity required'; END IF;
  SELECT array_agg(DISTINCT b.id) INTO ids FROM public.bookings b
    LEFT JOIN public.booking_reschedule_intents i ON i.booking_id=b.id
    WHERE b.cal_booking_uid=p_uid OR i.old_uid=p_uid OR i.provider_response->>'uid'=p_uid
      OR (coalesce(p_previous_uid,'')<>'' AND
        (b.cal_booking_uid=p_previous_uid OR i.old_uid=p_previous_uid));
  IF cardinality(ids)>1 THEN RAISE EXCEPTION 'Conflicting reschedule identities'; END IF;
  IF ids IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO STRICT resolved FROM public.bookings WHERE id=ids[1];
  RETURN to_jsonb(resolved);
END $$;

CREATE FUNCTION public.record_booking_reschedule_callback(p_booking_id uuid,p_uid text,
  p_start timestamptz,p_end timestamptz,p_location text,p_event_type_id bigint,
  p_previous_uid text,p_previous_start timestamptz,p_previous_end timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE b public.bookings%rowtype; i public.booking_reschedule_intents%rowtype; response jsonb;
BEGIN
  SELECT * INTO STRICT b FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  SELECT * INTO STRICT i FROM public.booking_reschedule_intents WHERE booking_id=b.id FOR UPDATE;
  IF b.status<>'scheduled' OR coalesce(p_uid,'')='' OR p_event_type_id IS DISTINCT FROM i.event_type_id
    OR p_start IS DISTINCT FROM i.new_start OR p_end IS NULL OR NOT isfinite(p_end) OR p_end<=p_start
    OR EXISTS(SELECT 1 FROM public.booking_cancellation_intents WHERE booking_id=b.id)
    OR EXISTS(SELECT 1 FROM public.bookings WHERE cal_booking_uid=p_uid AND id<>b.id)
    THEN RAISE EXCEPTION 'Reschedule callback reconciliation required'; END IF;
  -- Any supplied lineage must be complete and match the locked original intent.
  IF p_previous_uid IS NOT NULL OR p_previous_start IS NOT NULL OR p_previous_end IS NOT NULL THEN
    IF p_previous_uid IS DISTINCT FROM i.old_uid OR p_previous_start IS DISTINCT FROM i.old_start
      OR p_previous_end IS DISTINCT FROM i.old_end
      THEN RAISE EXCEPTION 'Reschedule previous booking mismatch'; END IF;
  END IF;
  IF i.state='completed' THEN
    IF b.scheduled_start<>p_start OR b.scheduled_end<>p_end
      OR p_uid NOT IN(i.old_uid,b.cal_booking_uid)
      THEN RAISE EXCEPTION 'Stale reschedule callback'; END IF;
    RETURN false;
  END IF;
  IF b.cal_booking_uid<>i.old_uid OR b.scheduled_start<>i.old_start OR b.scheduled_end<>i.old_end
    OR b.cal_event_type_id::bigint<>i.event_type_id
    THEN RAISE EXCEPTION 'Original booking changed'; END IF;
  IF p_uid<>i.old_uid AND (p_previous_uid IS DISTINCT FROM i.old_uid
    OR p_previous_start IS DISTINCT FROM i.old_start OR p_previous_end IS DISTINCT FROM i.old_end)
    THEN RAISE EXCEPTION 'Replacement booking lineage required'; END IF;
  IF i.callback_response IS NOT NULL AND (
    (i.callback_response->>'end')::timestamptz IS DISTINCT FROM p_end OR
    (i.callback_response->>'uid'<>i.old_uid AND p_uid<>i.old_uid AND i.callback_response->>'uid'<>p_uid))
    THEN RAISE EXCEPTION 'Conflicting reschedule callbacks'; END IF;
  response:=jsonb_build_object('uid',p_uid,'eventTypeId',p_event_type_id,
    'start',p_start,'end',p_end,'status','accepted','meetingUrl',p_location);
  IF p_uid=i.old_uid THEN
    -- An old-ID event cannot freeze that ID as the replacement. It is recorded
    -- for reconciliation only; retrying the API cannot issue another Cal move.
    IF i.provider_response IS NOT NULL AND
      (i.provider_response->>'end')::timestamptz IS DISTINCT FROM p_end
      THEN RAISE EXCEPTION 'Reschedule provider conflict'; END IF;
    IF i.callback_response IS NULL THEN
      UPDATE public.booking_reschedule_intents SET callback_response=response WHERE booking_id=b.id;
    END IF;
    RETURN false;
  END IF;
  IF p_location IS NULL OR p_location !~ '^https://' THEN
    RAISE EXCEPTION 'Provider meeting URL required for callback recovery';
  END IF;
  UPDATE public.booking_reschedule_intents SET callback_response=response WHERE booking_id=b.id;
  PERFORM public.confirm_booking_reschedule(b.id,response);
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.confirm_booking_reschedule(p_booking_id uuid,p_response jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE i public.booking_reschedule_intents%rowtype;
BEGIN
  PERFORM 1 FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  SELECT * INTO STRICT i FROM public.booking_reschedule_intents WHERE booking_id=p_booking_id FOR UPDATE;
  IF coalesce(p_response->>'uid','')='' OR (p_response->>'eventTypeId')::bigint IS DISTINCT FROM i.event_type_id
    OR (p_response->>'start')::timestamptz IS DISTINCT FROM i.new_start
    OR p_response->>'end' IS NULL OR NOT isfinite((p_response->>'end')::timestamptz)
    OR (p_response->>'end')::timestamptz<=i.new_start
    OR EXISTS(SELECT 1 FROM public.bookings WHERE cal_booking_uid=p_response->>'uid' AND id<>p_booking_id)
    THEN RAISE EXCEPTION 'Invalid reschedule confirmation'; END IF;
  IF i.callback_response IS NOT NULL AND (
    (i.callback_response->>'end')::timestamptz IS DISTINCT FROM (p_response->>'end')::timestamptz OR
    (i.callback_response->>'uid'<>i.old_uid AND i.callback_response->>'uid' IS DISTINCT FROM p_response->>'uid'))
    THEN RAISE EXCEPTION 'Reschedule callback conflict'; END IF;
  IF i.provider_response IS NOT NULL AND (
    i.provider_response->>'uid' IS DISTINCT FROM p_response->>'uid'
    OR (i.provider_response->>'end')::timestamptz IS DISTINCT FROM (p_response->>'end')::timestamptz)
    THEN RAISE EXCEPTION 'Reschedule provider conflict'; END IF;
  IF i.state<>'completed' THEN
    UPDATE public.booking_reschedule_intents SET state='provider_confirmed',
      provider_response=p_response WHERE booking_id=p_booking_id RETURNING * INTO i;
  END IF;
  RETURN to_jsonb(i);
END $$;

-- Retire the adapter that inferred event type and froze an ambiguous old UID.
CREATE OR REPLACE FUNCTION public.queue_booking_reschedule(p_booking_id uuid,p_uid text,
  p_start timestamptz,p_end timestamptz,p_location text,p_email_args jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN RAISE EXCEPTION 'Lineage-aware reschedule callback required'; END $$;

REVOKE ALL ON FUNCTION public.find_booking_for_reschedule(text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.record_booking_reschedule_callback(uuid,text,timestamptz,timestamptz,text,bigint,text,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.find_booking_for_reschedule(text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_booking_reschedule_callback(uuid,text,timestamptz,timestamptz,text,bigint,text,timestamptz,timestamptz) TO service_role;
-- Replaced functions retain their previously pinned service-only ACLs.
