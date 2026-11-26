-- The SAT dates College Board lists (satsuite.collegeboard.org/sat/dates-deadlines, read 2026-11-25).
-- The table was seeded from a first-Saturday guess: September 2027 was missing, and March and October
-- 2027 were a week off. This adds the real dates, moves anything pointing at a wrong date to the right
-- one, and removes the two wrong dates.
-- College Board gives no registration deadline for its "anticipated" dates, so a date may be listed
-- without one (the daily sync's fallback list has always sent none).
ALTER TABLE public.sat_dates ALTER COLUMN registration_deadline DROP NOT NULL;

INSERT INTO public.sat_dates (test_date, source_url, imported_at)
SELECT d::date, 'static-seed', now()
FROM unnest(ARRAY[
  '2027-03-06', '2027-05-01', '2027-06-05',
  '2027-08-28', '2027-09-18', '2027-10-09', '2027-11-06', '2027-12-04',
  '2028-03-04', '2028-05-06', '2028-06-03'
]) AS d
ON CONFLICT (test_date) DO NOTHING;

UPDATE public.cohorts SET sat_date = '2027-03-06' WHERE sat_date = '2027-03-13';
UPDATE public.cohorts SET sat_date = '2027-10-09' WHERE sat_date = '2027-10-02';
UPDATE public.cohort_waitlist SET target_sat_date = '2027-03-06' WHERE target_sat_date = '2027-03-13';
UPDATE public.cohort_waitlist SET target_sat_date = '2027-10-09' WHERE target_sat_date = '2027-10-02';

DELETE FROM public.sat_dates WHERE test_date IN ('2027-03-13', '2027-10-02');
