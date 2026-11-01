-- Recorded from production supabase_migrations.schema_migrations (20261008081427).
-- Applied by hand on 20261008; this file makes the repo match production history. Do not edit.
-- Complete the already approved service-role privilege limits on four NEW booking tables only.
-- No existing business-table or public-client access changes.
BEGIN;
REVOKE ALL PRIVILEGES ON TABLE public.booking_cancellation_intents FROM service_role;
GRANT INSERT, SELECT, UPDATE ON TABLE public.booking_cancellation_intents TO service_role;
REVOKE ALL PRIVILEGES ON TABLE public.booking_creation_intents FROM service_role;
GRANT INSERT, SELECT, UPDATE ON TABLE public.booking_creation_intents TO service_role;
REVOKE ALL PRIVILEGES ON TABLE public.booking_reschedule_intents FROM service_role;
GRANT INSERT, SELECT, UPDATE ON TABLE public.booking_reschedule_intents TO service_role;
REVOKE ALL PRIVILEGES ON TABLE public.booking_reschedule_receipts FROM service_role;
GRANT INSERT, SELECT ON TABLE public.booking_reschedule_receipts TO service_role;
COMMIT;
