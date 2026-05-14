// ============================================================
// scripts/test-dm-reply.mjs
//
// Sends a 1:1 direct message TO bennisz FROM a random cohort-
// mate so you can test the DM sidebar (unread badge, pull-to-top,
// realtime). Bypasses the API — writes the row directly to
// direct_messages with moderation_status='approved'.
//
// Usage:
//   node --env-file=.env.local scripts/test-dm-reply.mjs
//   node --env-file=.env.local scripts/test-dm-reply.mjs --from <email>
//
// Env overrides:
//   TEST_DM_BENNISZ_EMAIL   default: bennisz@outlook.com
//   TEST_DM_TEXT            default: a friendly SAT-prep ping
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[test-dm-reply] Missing Supabase env");
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Argparse: --from <email>
const args = process.argv.slice(2);
let fromEmailOverride = null;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--from" && args[i + 1]) {
    fromEmailOverride = args[i + 1];
    i += 1;
  }
}

const recipientEmail = process.env.TEST_DM_BENNISZ_EMAIL ?? "bennisz@outlook.com";
const text =
  process.env.TEST_DM_TEXT ?? "Hey! Quick Q on yesterday's reading set when you have a sec.";

const { data: recipient, error: rErr } = await supa
  .from("users")
  .select("id, first_name, last_name, email")
  .eq("email", recipientEmail)
  .maybeSingle();
if (rErr || !recipient) {
  console.error(`[test-dm-reply] recipient not found: ${recipientEmail}`, rErr);
  process.exit(1);
}

const { data: memberships } = await supa
  .from("cohort_members")
  .select("cohort_id")
  .eq("user_id", recipient.id)
  .is("left_at", null);
if (!memberships || memberships.length === 0) {
  console.error("[test-dm-reply] recipient has no active cohort");
  process.exit(1);
}
const cohortId = memberships[0].cohort_id;

// Pick the sender — either an explicit --from email, or a random
// student in the same cohort.
let sender;
if (fromEmailOverride) {
  const { data: s } = await supa
    .from("users")
    .select("id, first_name, last_name, email")
    .eq("email", fromEmailOverride)
    .maybeSingle();
  if (!s) {
    console.error(`[test-dm-reply] --from user not found: ${fromEmailOverride}`);
    process.exit(1);
  }
  sender = s;
} else {
  const { data: roster } = await supa
    .from("cohort_members")
    .select("users(id, first_name, last_name, email, role)")
    .eq("cohort_id", cohortId)
    .is("left_at", null);
  const peers = (roster ?? [])
    .map((r) => r.users)
    .filter((u) => u && u.id !== recipient.id && u.role === "student" && u.first_name);
  if (peers.length === 0) {
    console.error("[test-dm-reply] no peer students to DM from");
    process.exit(1);
  }
  sender = peers[Math.floor(Math.random() * peers.length)];
}

console.log(
  `[test-dm-reply] from ${sender.first_name} ${sender.last_name ?? ""} → ${recipient.email}`
);

const { data: row, error: insErr } = await supa
  .from("direct_messages")
  .insert({
    sender_id: sender.id,
    recipient_id: recipient.id,
    cohort_id: cohortId,
    content: text,
    media_urls: [],
    moderation_status: "approved",
    keyword_flagged: false,
    ai_flagged: false,
    ai_flag_reason: null,
    rejection_message: null,
    read_at: null,
  })
  .select("id, created_at")
  .single();
if (insErr) {
  console.error("[test-dm-reply] insert failed:", insErr);
  process.exit(1);
}
console.log(`[test-dm-reply] ✓ DM ${row.id} (${row.created_at})`);
