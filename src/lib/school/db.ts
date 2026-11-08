import "server-only";
/*
 * The service-role client without the generated table types, for the tables this overnight
 * build adds (schools, school_*, parent_invites) and the sibling sessions' tables it reads
 * (plan_grants, tutor_homework), none of which are in src/types yet. Same pattern as
 * src/lib/catalog-assignments/store.ts. Callers validate and cast what they read.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

export type UntypedAdmin = SupabaseClient;

export function untypedAdmin(): UntypedAdmin {
  return createAdminClient() as unknown as SupabaseClient;
}
