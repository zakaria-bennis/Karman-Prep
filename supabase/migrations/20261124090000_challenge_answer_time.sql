-- Time worked on each daily challenge answer (active time on the question, from the quiz's own
-- record), so the challenge ending can show the student's time beside everyone's average.
-- Rows from before this have no time and are left out of the average.
ALTER TABLE public.daily_challenge_answers
  ADD COLUMN IF NOT EXISTS active_ms integer CHECK (active_ms BETWEEN 0 AND 86400000);
