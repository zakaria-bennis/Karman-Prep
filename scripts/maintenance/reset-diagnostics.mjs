// ============================================================
// scripts/reset-diagnostics.mjs
//
// Wipes all diagnostic_results rows for a given user so they
// can re-take the (one-time) diagnostic for testing.
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
  .select("id, email")
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

if (!existing || existing === 0) {
  console.log(`[reset-diagnostics] no diagnostic results for ${email} — nothing to do`);
  process.exit(0);
}

const { error: delErr } = await supa.from("diagnostic_results").delete().eq("user_id", user.id);
if (delErr) {
  console.error("[reset-diagnostics] delete failed:", delErr);
  process.exit(1);
}

console.log(`[reset-diagnostics] ✓ deleted ${existing} diagnostic result row(s) for ${email}`);
console.log(`[reset-diagnostics]   → /diagnostic is now retakeable for this user`);
