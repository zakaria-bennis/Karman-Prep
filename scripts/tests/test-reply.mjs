// ============================================================
// scripts/test-reply.mjs
//
// Posts two messages into bennisz's cohort chat AS another
// student in the same cohort: (1) a text reply and (2) an
// image reply. Both round-trip through Slack so they appear
// in both the Karman UI and the Slack channel.
//
// Usage:
//   node --env-file=.env.local scripts/test-reply.mjs
//
// Configurable via env:
//   TEST_REPLY_BENNISZ_EMAIL  default: bennisz@outlook.com
//   TEST_REPLY_TEXT           default: a friendly SAT-prep ping
//   TEST_REPLY_IMAGE_URL      default: a Picsum 600x400 image
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { WebClient } from "@slack/web-api";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

if (!SUPABASE_URL || !SUPABASE_KEY || !SLACK_BOT_TOKEN) {
  console.error(
    "[test-reply] Missing one of NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SLACK_BOT_TOKEN"
  );
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const slack = new WebClient(SLACK_BOT_TOKEN);

const bennisEmail = process.env.TEST_REPLY_BENNISZ_EMAIL ?? "bennisz@outlook.com";
const textBody =
  process.env.TEST_REPLY_TEXT ??
  "Hey! Just wanted to say I really liked your point on the last reading passage — totally helped me crack the inference question.";
const imageSourceUrl =
  process.env.TEST_REPLY_IMAGE_URL ?? "https://picsum.photos/seed/karman-test/600/400.jpg";
const imageCaption = "Here's the diagram from the geometry problem we were stuck on:";

// ─────────────────────────────────────────────────────────────
// 1. Find bennisz, then the cohort_chat channel of his cohort.
// ─────────────────────────────────────────────────────────────
const { data: bennis, error: bennisErr } = await supa
  .from("users")
  .select("id, first_name, last_name, email")
  .eq("email", bennisEmail)
  .maybeSingle();
if (bennisErr || !bennis) {
  console.error(`[test-reply] Could not find user ${bennisEmail}`, bennisErr);
  process.exit(1);
}

const { data: bennisMemberships, error: memErr } = await supa
  .from("cohort_members")
  .select("cohort_id")
  .eq("user_id", bennis.id)
  .is("left_at", null);
if (memErr || !bennisMemberships || bennisMemberships.length === 0) {
  console.error("[test-reply] bennisz is not in any active cohort", memErr);
  process.exit(1);
}
const cohortId = bennisMemberships[0].cohort_id;
console.log(`[test-reply] bennisz cohort: ${cohortId}`);

const { data: channel, error: chErr } = await supa
  .from("chat_channels")
  .select("id, slack_channel_id, display_name")
  .eq("cohort_id", cohortId)
  .eq("channel_type", "cohort_chat")
  .maybeSingle();
if (chErr || !channel) {
  console.error("[test-reply] No cohort_chat channel — provision the cohort first.", chErr);
  process.exit(1);
}
console.log(
  `[test-reply] cohort_chat channel: ${channel.display_name} (slack=${channel.slack_channel_id})`
);

// ─────────────────────────────────────────────────────────────
// 2. Pick another active student in the same cohort.
// ─────────────────────────────────────────────────────────────
const { data: roster, error: rosterErr } = await supa
  .from("cohort_members")
  .select("user_id, users(id, first_name, last_name, email, role)")
  .eq("cohort_id", cohortId)
  .is("left_at", null);
if (rosterErr || !roster) {
  console.error("[test-reply] Failed to load cohort roster", rosterErr);
  process.exit(1);
}

const otherStudents = roster
  .map((r) => r.users)
  .filter((u) => u && u.id !== bennis.id && u.role === "student" && u.first_name);

if (otherStudents.length === 0) {
  console.error("[test-reply] No other active students in the cohort to send AS.");
  process.exit(1);
}

const sender = otherStudents[Math.floor(Math.random() * otherStudents.length)];
const lastInitial = sender.last_name ? `${sender.last_name[0].toUpperCase()}.` : "";
const displayName = lastInitial ? `${sender.first_name} ${lastInitial}` : sender.first_name;
console.log(`[test-reply] sending AS: ${displayName} (${sender.email})`);

// ─────────────────────────────────────────────────────────────
// 3. Post text message — Slack first, then Supabase row.
// ─────────────────────────────────────────────────────────────
async function postSlackAndInsert({ content, mediaUrls }) {
  const slackText =
    `*${displayName}:* ${content}` + (mediaUrls.length ? "\n" + mediaUrls.join("\n") : "");
  const slackRes = await slack.chat.postMessage({
    channel: channel.slack_channel_id,
    text: slackText,
    unfurl_links: false,
    unfurl_media: false,
  });
  if (!slackRes.ok || !slackRes.ts) {
    throw new Error(`Slack postMessage failed: ${JSON.stringify(slackRes)}`);
  }
  const { data: row, error: insErr } = await supa
    .from("chat_messages")
    .insert({
      slack_message_ts: slackRes.ts,
      channel_id: channel.id,
      sender_id: sender.id,
      is_anonymous: false,
      display_name_override: displayName,
      message_type: "cohort_message",
      content,
      media_urls: mediaUrls,
      parent_message_id: null,
      moderation_status: "approved",
      keyword_flagged: false,
      ai_flagged: false,
      ai_flag_reason: null,
      rejection_message: null,
      cohort_label: channel.display_name,
    })
    .select("id, created_at")
    .single();
  if (insErr) throw insErr;
  console.log(`[test-reply]   ↳ chat_messages row: ${row.id} (${row.created_at})`);
}

console.log("[test-reply] posting text reply…");
await postSlackAndInsert({ content: textBody, mediaUrls: [] });

// ─────────────────────────────────────────────────────────────
// 4. Download an image, upload to chat-media bucket, post.
// ─────────────────────────────────────────────────────────────
console.log(`[test-reply] downloading image: ${imageSourceUrl}`);
const imgRes = await fetch(imageSourceUrl);
if (!imgRes.ok) {
  console.error(`[test-reply] image download failed: ${imgRes.status}`);
  process.exit(1);
}
const imgBuf = Buffer.from(await imgRes.arrayBuffer());
const ext = (imgRes.headers.get("content-type") ?? "image/jpeg").includes("png") ? "png" : "jpg";
const objectKey = `cohort/${channel.id}/test-${Date.now()}.${ext}`;
const { error: upErr } = await supa.storage.from("chat-media").upload(objectKey, imgBuf, {
  contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
  upsert: false,
});
if (upErr) {
  console.error("[test-reply] storage upload failed:", upErr);
  process.exit(1);
}
const { data: pub } = supa.storage.from("chat-media").getPublicUrl(objectKey);
console.log(`[test-reply] uploaded → ${pub.publicUrl}`);

console.log("[test-reply] posting image reply…");
await postSlackAndInsert({ content: imageCaption, mediaUrls: [pub.publicUrl] });

console.log("[test-reply] ✓ done");
