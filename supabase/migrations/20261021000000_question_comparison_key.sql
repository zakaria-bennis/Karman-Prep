-- Question comparison key (step 1 of 2). Holds the kimport comparison key
-- ("kn-1:<sha256>") that says two questions are the same question. The column
-- starts empty and is filled by the reviewed backfill SQL; this migration adds
-- no uniqueness. A later migration adds the unique rule once keys are filled.
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS comparison_key text;
CREATE INDEX IF NOT EXISTS quiz_questions_comparison_key_idx ON public.quiz_questions (comparison_key);
