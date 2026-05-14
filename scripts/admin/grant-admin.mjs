// ============================================================
// grant-admin.mjs — promote a user to the "admin" role.
//
// Usage:
//   node --env-file=.env.local scripts/grant-admin.mjs <email>
//
// The user must have signed up first (so a row exists in
// public.users). If the email isn't found, the script tells
// you and exits — re-run after they sign up.
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: node --env-file=.env.local scripts/grant-admin.mjs <email>");
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false },
});

async function main() {
  // 1. Look up the user.
  const { data: user, error: selErr } = await supabase
    .from("users")
    .select("id, email, role, first_name, last_name, clerk_id, created_at")
    .ilike("email", email)
    .maybeSingle();

  if (selErr) {
    console.error("Lookup failed:", selErr.message);
    process.exit(1);
  }

  if (!user) {
    console.error(`No user with email "${email}" found.`);
    console.error("They need to sign up at https://karmanprep.com/auth/sign-up first.");
    process.exit(2);
  }

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "(unset)";
  console.log("Found user:");
  console.log(`  id           ${user.id}`);
  console.log(`  email        ${user.email}`);
  console.log(`  name         ${fullName}`);
  console.log(`  current role ${user.role}`);
  console.log(`  signed up    ${user.created_at}`);

  if (user.role === "admin") {
    console.log("\nAlready an admin. Nothing to do.");
    return;
  }

  // 2. Promote.
  const { error: updErr } = await supabase
    .from("users")
    .update({ role: "admin" })
    .eq("id", user.id);

  if (updErr) {
    console.error("Update failed:", updErr.message);
    process.exit(1);
  }

  console.log(`\n✓ Promoted to admin. They now have access to /admin/* on next page load.`);
  console.log("  (If they have an open browser session, ask them to refresh.)");
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
