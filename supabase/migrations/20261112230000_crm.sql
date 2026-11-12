-- ============================================================
-- Admin CRM (2026-11-12)
--
-- The People CRM at /admin/crm is built from rows that already
-- exist (marketing_leads, users, subscriptions, plan_grants,
-- refunds, schools, tutor affiliates). These tables hold only what
-- an admin adds by hand: a stage set by hand, an owner, notes,
-- follow-up tasks and tags.
--
-- A contact is keyed by `contact_key`: the lower-cased email, or
-- 'user:<users.id>' for an account with no email. The key outlives
-- the record it came from, so a lead keeps its notes after signing up.
--
-- Additive only: new tables, nothing existing is changed.
-- Written by the admin server actions with the service role. RLS is
-- on; the policies below let a signed-in admin read and write too,
-- and nobody else (anon and other roles get nothing).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  contact_key     TEXT         PRIMARY KEY CHECK (char_length(contact_key) BETWEEN 3 AND 320),
  -- NULL: the stage is worked out from purchases and subscriptions.
  stage_override  TEXT         CHECK (stage_override IN ('lead', 'talking', 'deposit', 'enrolled', 'churned')),
  stage_set_at    TIMESTAMPTZ,
  owner_user_id   UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by      UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_notes (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_key     TEXT         NOT NULL REFERENCES public.crm_contacts(contact_key) ON DELETE CASCADE,
  body            TEXT         NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  author_user_id  UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_notes_contact_idx ON public.crm_notes (contact_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_key     TEXT         NOT NULL REFERENCES public.crm_contacts(contact_key) ON DELETE CASCADE,
  title           TEXT         NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  due_on          DATE         NOT NULL,
  done_at         TIMESTAMPTZ,
  created_by      UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_tasks_open_due_idx ON public.crm_tasks (due_on) WHERE done_at IS NULL;
CREATE INDEX IF NOT EXISTS crm_tasks_contact_idx ON public.crm_tasks (contact_key);

CREATE TABLE IF NOT EXISTS public.crm_tags (
  contact_key     TEXT         NOT NULL REFERENCES public.crm_contacts(contact_key) ON DELETE CASCADE,
  tag             TEXT         NOT NULL CHECK (tag ~ '^[a-z0-9][a-z0-9 -]{0,29}$'),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_key, tag)
);
CREATE INDEX IF NOT EXISTS crm_tags_tag_idx ON public.crm_tags (tag);

COMMENT ON TABLE public.crm_contacts IS
  'Admin CRM: hand-set stage and owner per contact (email or user:<id>). Everything else is derived. See src/lib/admin/crm/.';

-- ---------- Row level security: admins only ----------
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tags     ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.crm_contacts, public.crm_notes, public.crm_tasks, public.crm_tags FROM anon;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_contacts', 'crm_notes', 'crm_tasks', 'crm_tags'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
         USING (EXISTS (SELECT 1 FROM public.users u
                         WHERE u.clerk_id = auth.jwt() ->> ''sub'' AND u.role = ''admin''))
         WITH CHECK (EXISTS (SELECT 1 FROM public.users u
                              WHERE u.clerk_id = auth.jwt() ->> ''sub'' AND u.role = ''admin''))',
      t || '_admin_all', t);
  END LOOP;
END $$;
