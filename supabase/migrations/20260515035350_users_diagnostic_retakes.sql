-- ============================================================
-- Admin-granted diagnostic retakes — audit issue #7.
--
-- The 35-question SAT diagnostic is one-and-done: once a student
-- has a diagnostic_results row the diagnostic page redirects them
-- to /progress and there's no path to re-take without an admin
-- running SQL by hand. This was a launch blocker — students who
-- want to benchmark progress mid-program had no way to do it.
--
-- We add a per-user counter the admin can increment with a button
-- on /admin/users/[id]. Each retake the student submits decrements
-- the counter. When > 0 (or no prior result exists) the diagnostic
-- gate lets them through.
--
-- Storing a count rather than a boolean lets the admin grant
-- multiple retakes in a row (rare but possible) without us writing
-- additional plumbing later.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS diagnostic_retakes_remaining INTEGER NOT NULL DEFAULT 0;
