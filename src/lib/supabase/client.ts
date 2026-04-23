// ============================================================
// Supabase browser-side client
// Use this in Client Components (hooks, event handlers).
// ============================================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

/** Browser-safe Supabase client (uses anon key + RLS) */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
