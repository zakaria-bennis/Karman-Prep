// ============================================================
// Supabase server-side admin client
// Use this ONLY in Server Components, API routes, and webhooks.
// The service role key bypasses RLS — handle with care.
// ============================================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Returns an admin-level Supabase client that bypasses Row Level Security.
 * Never expose this client to the browser.
 */
export function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role credentials.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
