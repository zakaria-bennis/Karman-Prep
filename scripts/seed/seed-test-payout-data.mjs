// ============================================================
// seed-test-payout-data.mjs — fresh test data for the admin
// to exercise the per-session payout flow.
//
// Creates SESSIONS first, then per-student bookings linked
// to each session. This matches the production flow where
// the session is the unit of payout (and recap), and bookings
// represent per-student enrollment.
//
// Usage:
//   node --env-file=.env.local scripts/seed-test-payout-data.mjs
//   node --env-file=.env.local scripts/seed-test-payout-data.mjs --reset
//
// --reset wipes the admin's existing test sessions + bookings
//         + payout_requests + status_email_log entries before
//         seeding (idempotent fresh start).
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

// Admin (acts as tutor) — bennisz@outlook.com
const TUTOR_USER_ID = "e2245a2b-1932-45c5-a889-157ff031fd85";
const HOURLY_RATE = 35;

// Sessions to create. Each top-level entry = one actual session.
// Group sessions list multiple `students` to create per-student
// bookings linked to the same session.
const SESSIONS = [
  // ─── 5 individual (1:1) sessions ─────────────────────
  {
    type: "private",
    durationMin: 60,
    daysAgo: 1,
    students: [{ firstName: "Maya", lastName: "Patel" }],
  },
  {
    type: "private",
    durationMin: 75,
    daysAgo: 3,
    students: [{ firstName: "Carlos", lastName: "Rivera" }],
  },
  {
    type: "elite",
    durationMin: 90,
    daysAgo: 5,
    students: [{ firstName: "Aisha", lastName: "Johnson" }],
  },
  {
    type: "private",
    durationMin: 65,
    daysAgo: 7,
    students: [{ firstName: "Liam", lastName: "Chen" }],
  },
  {
    type: "elite",
    durationMin: 120,
    daysAgo: 9,
    students: [{ firstName: "Sophia", lastName: "Martinez" }],
  },

  // ─── 1 small group session, 4 students (max 5) ───────
  {
    type: "small_group",
    durationMin: 90,
    daysAgo: 4,
    cohortName: "May 2026 Small Group A",
    students: [
      { firstName: "Ella", lastName: "Williams" },
      { firstName: "Noah", lastName: "Anderson" },
      { firstName: "Olivia", lastName: "Brown" },
      { firstName: "Ben", lastName: "Foster" },
    ],
  },

  // ─── 1 seminar, 8 students (max 250) ─────────────────
  {
    type: "group",
    durationMin: 120,
    daysAgo: 11,
    cohortName: "Spring 2026 Seminar — Math Foundations",
    students: [
      { firstName: "Ava", lastName: "Davis" },
      { firstName: "Mason", lastName: "Wilson" },
      { firstName: "Ethan", lastName: "Park" },
      { firstName: "Layla", lastName: "Singh" },
      { firstName: "Jordan", lastName: "Reed" },
      { firstName: "Zara", lastName: "Khan" },
      { firstName: "Kai", lastName: "Tanaka" },
      { firstName: "Priya", lastName: "Mehta" },
    ],
  },
];

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

function computePayout(min) {
  const paidMinutes = Math.floor(min / 15) * 15;
  const paidHours = Number((paidMinutes / 60).toFixed(2));
  const amount = Number((paidHours * HOURLY_RATE).toFixed(2));
  return { paidHours, amount };
}

function fakeDraft(s) {
  const isGroup = s.type === "small_group" || s.type === "group";
  if (isGroup) {
    return {
      date_and_time_of_session: `${s.daysAgo} days ago — ${s.durationMin} min class`,
      student_performance_progress:
        "The class engaged actively in the linear-equations review and worked through the problem set with strong participation.",
      subjects_covered_during_session:
        "Worked through 12 questions covering: linear equations in two variables (4), systems of equations word problems (5), and slope-intercept interpretation (3).",
      specific_weak_points_or_mistakes:
        "Several students hesitated when faced with negative coefficients in two-step equations.",
      next_steps_homework_assigned: "Bluebook practice test 3, sections 1.1-1.3 (15 questions).",
      subjects_to_cover_next_session:
        "Quadratic functions: factoring, vertex form, and intro to function transformations.",
      homework_practice_before_next_session:
        "Complete the assigned Bluebook section. Review notes from today's class.",
      date_and_time_of_next_session: "TBD — confirm with cohort schedule.",
    };
  }
  // Individual
  return {
    date_and_time_of_session: `${s.daysAgo} days ago — ${s.durationMin} min session`,
    student_performance_progress: `${s.students[0].firstName} engaged well, asked thoughtful questions, and made progress on quadratic equations.`,
    subjects_covered_during_session:
      "Quadratic equations, factoring, vertex form, function transformations.",
    specific_weak_points_or_mistakes:
      "Sometimes flipped signs when factoring; needs more practice with negative coefficients.",
    next_steps_homework_assigned:
      "Bluebook practice test 3, sections 1.1-1.3 (15 questions on quadratics).",
    subjects_to_cover_next_session: "Exponential functions and growth/decay word problems.",
    homework_practice_before_next_session:
      "Complete the assigned Bluebook section. Review notes from today.",
    date_and_time_of_next_session: "TBD — confirm with student.",
  };
}

const cohortCache = new Map();
async function ensureCohort(name, tier) {
  if (cohortCache.has(name)) return cohortCache.get(name);
  const { data: existing } = await supabase
    .from("cohorts")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (existing) {
    cohortCache.set(name, existing.id);
    return existing.id;
  }
  // Pick the next upcoming SAT date — cohorts.sat_date FK requires a real one
  const { data: nextDate } = await supabase
    .from("sat_dates")
    .select("test_date")
    .gte("test_date", new Date().toISOString().slice(0, 10))
    .order("test_date")
    .limit(1)
    .single();
  const satDate = nextDate?.test_date ?? "2026-06-06";
  const { data, error } = await supabase
    .from("cohorts")
    .insert({
      name,
      tier,
      sat_date: satDate,
      tutor_user_id: TUTOR_USER_ID,
      // Per spec: small group ≤ 5, seminar ≤ 250
      max_size: tier === "small_group" ? 5 : 250,
      status: "active",
      current_topic: "Quadratic equations",
    })
    .select("id")
    .single();
  if (error) throw new Error(`cohort insert failed for ${name}: ${error.message}`);
  cohortCache.set(name, data.id);
  return data.id;
}

async function upsertStudent(s) {
  const clerkId = `test_payout_${s.firstName.toLowerCase()}_${s.lastName.toLowerCase()}`;
  const email = `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@payout-test.karmanprep.local`;
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (existing) return { userId: existing.id, created: false };
  const { data, error } = await supabase
    .from("users")
    .insert({
      clerk_id: clerkId,
      role: "student",
      email,
      first_name: s.firstName,
      last_name: s.lastName,
      onboarding_completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`student insert failed for ${s.firstName}: ${error.message}`);
  return { userId: data.id, created: true };
}

async function createSession(meta, cohortId) {
  const start = new Date();
  start.setDate(start.getDate() - meta.daysAgo);
  start.setHours(15, 0, 0, 0);
  const end = new Date(start.getTime() + meta.durationMin * 60_000);
  const payout = computePayout(meta.durationMin);
  const draft = fakeDraft(meta);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      tutor_id: TUTOR_USER_ID,
      cohort_id: cohortId,
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      status: "completed",
      transcript: `(seeded test transcript — ${meta.durationMin} min ${meta.type}${meta.cohortName ? ` for ${meta.cohortName}` : ""})`,
      transcript_source: "manual",
      transcript_received_at: now,
      status_draft: draft,
      status_draft_created_at: now,
      recap_email_sent: true,
      recap_sent_at: now,
      payout_status: "pending",
      payout_amount: payout.amount,
      tutor_hours: payout.paidHours,
    })
    .select("id, scheduled_start, scheduled_end, payout_amount, tutor_hours")
    .single();
  if (error) throw new Error(`session insert failed: ${error.message}`);
  return { sessionId: data.id, start, end, amount: data.payout_amount, hours: data.tutor_hours };
}

async function createBookingForSession(
  meta,
  studentUserId,
  sessionId,
  sessionStart,
  sessionEnd,
  cohortId
) {
  const { error } = await supabase.from("bookings").insert({
    tutor_id: TUTOR_USER_ID,
    student_id: studentUserId,
    session_id: sessionId,
    plan_tier: meta.type,
    cohort_id: cohortId,
    scheduled_start: sessionStart.toISOString(),
    scheduled_end: sessionEnd.toISOString(),
    status: "completed",
    // Per-seat payout fields zeroed out — pay lives on the session row
    payout_status: "not_eligible",
    payout_amount: 0,
    tutor_hours: 0,
    // Recap mirror (per-student log; canonical state lives on session)
    recap_email_sent: true,
    recap_sent_at: new Date().toISOString(),
  });
  if (error) throw new Error(`booking insert failed: ${error.message}`);
}

async function reset() {
  console.log("Resetting admin test data…");

  // Find admin's seeded sessions + bookings + payout_requests
  const { data: pr } = await supabase
    .from("payout_requests")
    .select("id")
    .eq("tutor_user_id", TUTOR_USER_ID);
  const prIds = (pr ?? []).map((r) => r.id);
  if (prIds.length > 0) {
    await supabase.from("payout_requests").delete().in("id", prIds);
    console.log(`  deleted ${prIds.length} payout_requests`);
  }

  const { data: sess } = await supabase.from("sessions").select("id").eq("tutor_id", TUTOR_USER_ID);
  const sessIds = (sess ?? []).map((r) => r.id);

  // Delete bookings linked to these sessions (status_email_log cascades from FK)
  if (sessIds.length > 0) {
    const { count: delBookings } = await supabase
      .from("bookings")
      .delete({ count: "exact" })
      .in("session_id", sessIds);
    console.log(`  deleted ${delBookings ?? "?"} bookings`);
    const { count: delSessions } = await supabase
      .from("sessions")
      .delete({ count: "exact" })
      .in("id", sessIds);
    console.log(`  deleted ${delSessions ?? "?"} sessions`);
  }

  // Delete the seeded student users (orphaned now)
  const { count: delStudents } = await supabase
    .from("users")
    .delete({ count: "exact" })
    .like("clerk_id", "test_payout_%");
  console.log(`  deleted ${delStudents ?? "?"} seeded student users`);

  console.log("Reset complete.\n");
}

async function main() {
  if (process.argv.includes("--reset")) await reset();

  console.log(`Tutor (admin): ${TUTOR_USER_ID}`);
  console.log(`Hourly rate: $${HOURLY_RATE}`);
  console.log(`Creating ${SESSIONS.length} sessions…\n`);

  let totalGross = 0;
  let totalHours = 0;
  let totalBookings = 0;

  for (const meta of SESSIONS) {
    const cohortId = meta.cohortName ? await ensureCohort(meta.cohortName, meta.type) : null;
    const { sessionId, start, end, amount, hours } = await createSession(meta, cohortId);
    totalGross += Number(amount);
    totalHours += Number(hours);

    for (const stu of meta.students) {
      const { userId } = await upsertStudent(stu);
      await createBookingForSession(meta, userId, sessionId, start, end, cohortId);
      totalBookings++;
    }

    const label = meta.cohortName ?? `${meta.students[0].firstName} ${meta.students[0].lastName}`;
    console.log(
      `  ${meta.type.padEnd(11)}  ${String(meta.durationMin).padStart(3)}min  ` +
        `${String(hours).padStart(5)}h  $${String(Number(amount).toFixed(2)).padStart(7)}  ` +
        `${meta.students.length} student${meta.students.length === 1 ? "" : "s"}  ${label}`
    );
  }

  console.log("");
  console.log(`Sessions:        ${SESSIONS.length}`);
  console.log(`Bookings:        ${totalBookings} (one per enrolled student)`);
  console.log(`Total hours:     ${totalHours.toFixed(2)}h`);
  console.log(`Total gross:     $${totalGross.toFixed(2)}`);
  console.log("");

  console.log("Refreshing tutor_earnings_summary…");
  const { error: rpcErr } = await supabase.rpc("refresh_tutor_earnings_summary");
  if (rpcErr) console.warn("  (refresh failed, non-fatal):", rpcErr.message);

  const { data: summary } = await supabase
    .from("tutor_earnings_summary")
    .select("*")
    .eq("tutor_user_id", TUTOR_USER_ID)
    .maybeSingle();
  console.log("\nEarnings view now shows:");
  console.log(JSON.stringify(summary, null, 2));

  console.log("");
  console.log("Done. Visit https://karmanprep.com/tutor/earnings to verify.");
  console.log("");
  console.log(`Instant payout net: $${(totalGross * 0.975).toFixed(2)} (after 2.5% fee)`);
  console.log(`ACH payout net:     $${totalGross.toFixed(2)} (no fee)`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
