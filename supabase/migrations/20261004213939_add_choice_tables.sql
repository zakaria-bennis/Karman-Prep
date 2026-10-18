-- A choice may have a native table in addition to its required text description.
-- NULL keeps every existing choice and import path unchanged.
ALTER TABLE public.answer_choices
  ADD COLUMN choice_table_data jsonb;

ALTER TABLE public.answer_choices
  ADD CONSTRAINT answer_choices_table_data_shape
  CHECK (
    choice_table_data IS NULL
    OR (
      jsonb_typeof(choice_table_data) = 'object'
      AND choice_table_data ? 'rows'
      AND jsonb_typeof(choice_table_data -> 'rows') = 'array'
    )
  );

COMMENT ON COLUMN public.answer_choices.choice_table_data IS
  'Optional native table for this answer choice. choice_text remains the accessible text description; raw_choice_text retains source text.';
