-- Extra time per student for countdown sections (quiz engine spec, Data): standard 1x,
-- time and a half 1.5x, double 2x. Set only by an admin or the student's tutor, through a server action.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS timing_accommodation TEXT NOT NULL DEFAULT 'standard'
  CHECK (timing_accommodation IN ('standard', 'time_and_half', 'double'));
