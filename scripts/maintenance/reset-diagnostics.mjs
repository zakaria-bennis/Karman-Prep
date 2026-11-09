// ============================================================
// scripts/reset-diagnostics.mjs
//
// Wipes a user's diagnostic: their diagnostic_results rows and their
// bank-fed diagnostic runs (quiz_runs, kind "diagnostic"), so they can
// take the one-time diagnostic again for testing.
//
// Usage:
//   node --env-file=.env.local scripts/reset-diagnostics.mjs
//   node --env-file=.env.local scripts/reset-diagnostics.mjs --email someone@example.com
//
// Default email = bennisz@outlook.com.
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[reset-diagnostics] Missing Supabase env");
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const args = process.argv.slice(2);
let email = "bennisz@outlook.com";
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--email" && args[i + 1]) {
    email = args[i + 1];
    i += 1;
  }
}

const { data: user, error: userErr } = await supa
  .from("users")
  .select("id, email, clerk_id")
  .eq("email", email)
  .maybeSingle();
if (userErr || !user) {
  console.error(`[reset-diagnostics] user not found: ${email}`, userErr);
  process.exit(1);
}

const { count: existing } = await supa
  .from("diagnostic_results")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id);

const { error: delErr } = await supa.from("diagnostic_results").delete().eq("user_id", user.id);
if (delErr) {
  console.error("[reset-diagnostics] delete failed:", delErr);
  process.exit(1);
}
const { data: runs, error: runErr } = await supa
  .from("quiz_runs")
  .delete()
  .eq("student_id", user.clerk_id)
  .eq("kind", "diagnostic")
  .select("id");
if (runErr) {
  console.error("[reset-diagnostics] run delete failed:", runErr);
  process.exit(1);
}

console.log(
  `[reset-diagnostics] ✓ deleted ${existing ?? 0} result row(s) and ${(runs ?? []).length} diagnostic run(s) for ${email}`
);
