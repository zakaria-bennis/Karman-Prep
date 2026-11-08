-- ============================================================
-- Parent invites and the school portal (overnight build, 2026-11-08)
--
-- parent_invites   A student makes a link; the parent opens it, signs in
--                  and accepts. Accepting writes parent_student_links.
-- schools          A school customer. The first year is free, then
--                  $8 per student a year (SCHOOL_PLAN in offer.ts).
-- school_members   Who runs the school: admin or teacher. Teachers and
--                  admins stay ordinary users rows; the school role lives
--                  here, never in users.role.
-- school_classes   A class with its teacher and a six-letter join code.
-- school_seats     One student in one class. Each seated student gets a
--                  Practice plan of their own (plan_grants, source
--                  'school', source_ref = the school id), never a pool.
-- school_assignments Work a teacher assigns to a class. Each seated
--                  student sees it in their Homework (src/lib/school/
--                  homework.ts); removing a student removes their copy.
--
-- Every table is server-only: RLS on, no policies for anon or
-- authenticated. Server code checks membership before every read or
-- write (src/lib/school/access.ts, src/lib/parent/access.ts).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.parent_invites (
  id                   uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id      uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token                text         NOT NULL UNIQUE CHECK (token ~ '^[A-Za-z0-9_-]{24,64}$'),
  created_at           timestamptz  NOT NULL DEFAULT now(),
  expires_at           timestamptz  NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at          timestamptz,
  accepted_by_user_id  uuid         REFERENCES public.users(id) ON DELETE SET NULL,
  revoked_at           timestamptz,
  CHECK ((accepted_at IS NULL) = (accepted_by_user_id IS NULL))
);

CREATE INDEX IF NOT EXISTS parent_invites_student_idx
  ON public.parent_invites (student_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.schools (
  id                      uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text         NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  free_until              date         NOT NULL,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  billing_status          text         NOT NULL DEFAULT 'free_year'
    CHECK (billing_status IN ('free_year', 'renewal_set', 'active', 'past_due', 'canceled')),
  created_at              timestamptz  NOT NULL DEFAULT now(),
  updated_at              timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_members (
  school_id   uuid         NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id     uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role        text         NOT NULL CHECK (role IN ('admin', 'teacher')),
  created_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, user_id)
);

CREATE INDEX IF NOT EXISTS school_members_user_idx ON public.school_members (user_id);

CREATE TABLE IF NOT EXISTS public.school_classes (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        uuid         NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name             text         NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  teacher_user_id  uuid         REFERENCES public.users(id) ON DELETE SET NULL,
  join_code        text         NOT NULL UNIQUE CHECK (join_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_at       timestamptz  NOT NULL DEFAULT now(),
  archived_at      timestamptz
);

CREATE INDEX IF NOT EXISTS school_classes_school_idx ON public.school_classes (school_id);

CREATE TABLE IF NOT EXISTS public.school_seats (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           uuid         NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id            uuid         NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  student_user_id     uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at           timestamptz  NOT NULL DEFAULT now(),
  removed_at          timestamptz,
  removed_by_user_id  uuid         REFERENCES public.users(id) ON DELETE SET NULL,
  CHECK ((removed_at IS NULL) OR (removed_by_user_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS school_seats_one_active_key
  ON public.school_seats (class_id, student_user_id) WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS school_seats_student_idx
  ON public.school_seats (student_user_id) WHERE removed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.school_assignments (
  id                   uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id            uuid         NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id             uuid         NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  assigned_by_user_id  uuid         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind                 text         NOT NULL
    CHECK (kind IN ('skill_practice', 'domain_quiz', 'full_length_test')),
  target_id            text         CHECK (target_id IS NULL OR length(target_id) BETWEEN 1 AND 120),
  title                text         NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 140),
  due_on               date         NOT NULL,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  cancelled_at         timestamptz,
  CHECK ((kind = 'full_length_test') = (target_id IS NULL))
);

CREATE INDEX IF NOT EXISTS school_assignments_class_idx
  ON public.school_assignments (class_id, due_on) WHERE cancelled_at IS NULL;

ALTER TABLE public.parent_invites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_classes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_seats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_assignments  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.parent_invites, public.schools, public.school_members,
  public.school_classes, public.school_seats, public.school_assignments
  FROM anon, authenticated;
