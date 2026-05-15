#!/usr/bin/env node
// ============================================================
// scripts/seed-dev.mjs — predictable fixtures for local dev.
//
// Pairs with the DEV_IMPERSONATE_CLERK_ID bypass (see
// src/lib/auth/dev-auth.ts). After running this once, you can
// view every meaningful state of the student / parent / tutor /
// admin dashboards just by swapping the env var:
//
//   echo 'DEV_IMPERSONATE_CLERK_ID=dev_seed_student_mid' >> .env.local
//   npm run dev:next
//
// Idempotent: re-running upserts on clerk_id. Safe to call as
// many times as you like; never wipes pre-existing rows.
//
// All seeded clerk_ids are prefixed `dev_seed_` so they're
// trivial to filter / drop later:
//   delete from users where clerk_id like 'dev_seed_%';
//
// Usage: npm run seed:dev
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY.
// ============================================================

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ── .env.local loader (no dotenv dep) ──────────────────────
const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env.local");
try {
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  console.error("⚠  .env.local not found — relying on already-exported env vars");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

// ── REST helper ────────────────────────────────────────────
async function sb(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${body}`);
  }
  return body ? JSON.parse(body) : null;
}

/** Upsert a users row keyed on clerk_id; return the row's id. */
async function upsertUser(row) {
  const rows = await sb(`users?on_conflict=clerk_id`, {
    method: "POST",
    headers: { Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(row),
  });
  return rows[0].id;
}

/** Upsert subscription. Keyed on stripe_subscription_id which we
 *  fake with the clerk_id so reruns merge instead of inserting. */
async function upsertSubscription(row) {
  await sb(`subscriptions?on_conflict=stripe_subscription_id`, {
    method: "POST",
    headers: { Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(row),
  });
}

/** Replace all learn_node_status rows for this user in one go.
 *  Deletes existing (cheap — usually a handful) and inserts the
 *  fresh set. Normalizes every row to the same key shape because
 *  PostgREST bulk-insert requires identical keys across objects. */
async function setLearnStatuses(clerkId, rows) {
  await sb(`learn_node_status?user_id=eq.${encodeURIComponent(clerkId)}`, { method: "DELETE" });
  if (rows.length === 0) return;
  const normalized = rows.map((r) => ({
    user_id: clerkId,
    node_id: r.node_id,
    status: r.status,
    attempts: r.attempts ?? 0,
    best_quiz_score: r.best_quiz_score ?? null,
  }));
  await sb(`learn_node_status`, { method: "POST", body: JSON.stringify(normalized) });
}

/** Upsert a diagnostic_results row keyed on a synthetic id we
 *  derive from (user_id, taken_at) so reruns merge. */
async function upsertDiagnostic(userIdUuid, takenAt, scoreLow, scoreHigh, domainScores) {
  // No natural unique key on diagnostic_results, so delete-and-insert
  // for this (user, taken_at) pair to stay idempotent.
  await sb(
    `diagnostic_results?user_id=eq.${userIdUuid}&taken_at=eq.${encodeURIComponent(takenAt)}`,
    { method: "DELETE" }
  );
  await sb(`diagnostic_results`, {
    method: "POST",
    body: JSON.stringify({
      user_id: userIdUuid,
      taken_at: takenAt,
      score_range_low: scoreLow,
      score_range_high: scoreHigh,
      domain_scores: domainScores,
      weak_concepts: [],
    }),
  });
}

async function upsertParentStudentLink(parentUuid, studentUuid) {
  await sb(
    `parent_student_links?parent_user_id=eq.${parentUuid}&student_user_id=eq.${studentUuid}`,
    { method: "DELETE" }
  );
  await sb(`parent_student_links`, {
    method: "POST",
    body: JSON.stringify({ parent_user_id: parentUuid, student_user_id: studentUuid }),
  });
}

// ── Fixture set ────────────────────────────────────────────
const NOW = new Date().toISOString();
const A_WEEK_AGO = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
const A_MONTH_AGO = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();

const log = (msg) => console.log(`  ${msg}`);
const header = (msg) => console.log(`\n→ ${msg}`);

async function main() {
  console.log("Seeding dev fixtures into", SUPABASE_URL);

  // 1. Admin ─────────────────────────────────────────────
  header("dev_seed_admin (admin)");
  await upsertUser({
    clerk_id: "dev_seed_admin",
    email: "dev-seed-admin@karman.local",
    first_name: "Dev",
    last_name: "Admin",
    role: "admin",
    onboarding_completed_at: A_MONTH_AGO,
  });
  log("✓ admin upserted");

  // 2. Fresh student — just signed up, no progress yet ───
  header("dev_seed_student_fresh (student, no progress)");
  await upsertUser({
    clerk_id: "dev_seed_student_fresh",
    email: "dev-seed-fresh@karman.local",
    first_name: "Fresh",
    last_name: "Student",
    role: "student",
    onboarding_completed_at: null,
  });
  log("✓ fresh student upserted (onboarding_completed_at=null → bounces to /onboarding)");

  // 3. Mid student — active sub, real progress + diagnostics
  header("dev_seed_student_mid (student, halfway through)");
  const midUuid = await upsertUser({
    clerk_id: "dev_seed_student_mid",
    email: "dev-seed-mid@karman.local",
    first_name: "Mid",
    last_name: "Student",
    role: "student",
    onboarding_completed_at: A_MONTH_AGO,
    sat_test_date: "2026-11-07",
    goal_sat_score: 1450,
    recent_sat_math: 600,
    recent_sat_reading: 620,
  });
  await upsertSubscription({
    user_id: "dev_seed_student_mid", // FK is clerk_id string
    stripe_subscription_id: "sub_dev_seed_mid",
    stripe_customer_id: "cus_dev_seed_mid",
    status: "active",
    tier: "private",
    created_at: A_MONTH_AGO,
  });
  log("✓ subscription active (private tier)");
  await setLearnStatuses("dev_seed_student_mid", [
    // 4 mastered + 3 in-progress + 2 available across RW + Math.
    // best_quiz_score is smallint (0-100), not a float ratio.
    { node_id: "rw-00", status: "mastered", attempts: 3, best_quiz_score: 92 },
    { node_id: "rw-01", status: "mastered", attempts: 2, best_quiz_score: 88 },
    { node_id: "rw-02", status: "in_progress", attempts: 1, best_quiz_score: 65 },
    { node_id: "rw-03", status: "available", attempts: 0 },
    { node_id: "ma-00", status: "mastered", attempts: 2, best_quiz_score: 90 },
    { node_id: "ma-01", status: "mastered", attempts: 3, best_quiz_score: 85 },
    { node_id: "ma-02", status: "in_progress", attempts: 1, best_quiz_score: 55 },
    { node_id: "ma-03", status: "in_progress", attempts: 1, best_quiz_score: 60 },
    { node_id: "ma-04", status: "available", attempts: 0 },
  ]);
  log("✓ 4 mastered + 3 in-progress nodes");
  await upsertDiagnostic(midUuid, A_MONTH_AGO, 1050, 1150, {
    algebra: 0.55,
    advanced_math: 0.4,
    geometry: 0.5,
    data_analysis: 0.45,
    info_ideas: 0.6,
    craft_structure: 0.55,
    expression_ideas: 0.5,
    conventions: 0.65,
  });
  await upsertDiagnostic(midUuid, A_WEEK_AGO, 1200, 1300, {
    algebra: 0.72,
    advanced_math: 0.6,
    geometry: 0.68,
    data_analysis: 0.65,
    info_ideas: 0.75,
    craft_structure: 0.72,
    expression_ideas: 0.68,
    conventions: 0.82,
  });
  log("✓ 2 diagnostics (showing 150-pt improvement over the month)");

  // 4. Stuck student — placement failed, no cohort or tutor
  header("dev_seed_student_stuck (placement_failure_at set)");
  await upsertUser({
    clerk_id: "dev_seed_student_stuck",
    email: "dev-seed-stuck@karman.local",
    first_name: "Stuck",
    last_name: "Student",
    role: "student",
    onboarding_completed_at: A_WEEK_AGO,
    placement_failure_at: A_WEEK_AGO,
    sat_test_date: "2026-12-05",
  });
  await upsertSubscription({
    user_id: "dev_seed_student_stuck",
    stripe_subscription_id: "sub_dev_seed_stuck",
    stripe_customer_id: "cus_dev_seed_stuck",
    status: "active",
    tier: "group",
    created_at: A_WEEK_AGO,
  });
  log("✓ stuck-placement banner should appear on /dashboard/student");

  // 5. Tutor — active with payouts enabled
  header("dev_seed_tutor (tutor with payouts enabled)");
  await upsertUser({
    clerk_id: "dev_seed_tutor",
    email: "dev-seed-tutor@karman.local",
    first_name: "Dev",
    last_name: "Tutor",
    role: "tutor",
    onboarding_completed_at: A_MONTH_AGO,
    stripe_connect_account_id: "acct_dev_seed_tutor",
    stripe_connect_onboarded_at: A_MONTH_AGO,
    stripe_payouts_enabled: true,
    hourly_rate: 65,
    time_zone: "America/New_York",
  });
  log("✓ tutor upserted (Cal not configured → schedule page shows setup banner)");

  // 6. Parent linked to mid student
  header("dev_seed_parent (parent linked to mid student)");
  const parentUuid = await upsertUser({
    clerk_id: "dev_seed_parent",
    email: "dev-seed-parent@karman.local",
    first_name: "Dev",
    last_name: "Parent",
    role: "parent",
    onboarding_completed_at: A_MONTH_AGO,
  });
  await upsertParentStudentLink(parentUuid, midUuid);
  log("✓ parent_student_links row → student_mid");

  // ── Summary ──────────────────────────────────────────────
  console.log("\n✓ Seed complete. Switch personas via .env.local:\n");
  for (const id of [
    "dev_seed_admin",
    "dev_seed_student_fresh",
    "dev_seed_student_mid",
    "dev_seed_student_stuck",
    "dev_seed_tutor",
    "dev_seed_parent",
  ]) {
    console.log(`  DEV_IMPERSONATE_CLERK_ID=${id}`);
  }
  console.log("\n  then restart `npm run dev:next`.\n");
}

main().catch((err) => {
  console.error("\n✗ seed failed:", err.message);
  process.exit(1);
});
