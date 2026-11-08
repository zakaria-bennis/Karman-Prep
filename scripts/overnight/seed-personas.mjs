#!/usr/bin/env node
// Seeds fake test accounts for every role into the LOCAL database only, with
// progress, homework, sessions and history so every portal screen has data.
// Runs scripts/seed-dev.mjs first (the CI personas), then adds the overnight
// personas. Idempotent: re-running replaces the overnight personas' rows.
// Every clerk_id starts with dev_seed_. Role list: docs/overnight/local-db.md
//
// Usage: node scripts/overnight/seed-personas.mjs
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { seedHistory } from "./seed-history.mjs";

const STACK =
  process.env.KARMAN_LOCAL_STACK ?? "/Users/zakariabennis/Karman-Prep-wt/local-supabase";
const DB_CONTAINER = "supabase_db_karman-local";
const here = dirname(fileURLToPath(import.meta.url));

const status = JSON.parse(
  execFileSync("supabase", ["status", "-o", "json", "--workdir", STACK], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
);
const URL_ = status.API_URL;
const KEY = status.SERVICE_ROLE_KEY;
if (!/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(URL_ ?? "") || !KEY) {
  console.error("✗ The local Supabase stack is not running. Refusing to seed anything else.");
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────
async function sb(path, init = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.text();
  if (!res.ok)
    throw new Error(`${init.method ?? "GET"} ${path.split("?")[0]} → ${res.status}: ${body}`);
  return body ? JSON.parse(body) : null;
}
/** Bulk inserts need the same keys on every row; missing keys become null. */
function sameKeys(rows) {
  if (!Array.isArray(rows)) return rows;
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? null])));
}
const post = (table, rows, prefer) =>
  sb(table, {
    method: "POST",
    body: JSON.stringify(sameKeys(rows)),
    ...(prefer ? { headers: { Prefer: prefer } } : {}),
  });
const del = (pathWithFilter) =>
  sb(pathWithFilter, { method: "DELETE", headers: { Prefer: "return=minimal" } });
const inList = (ids) => `in.(${ids.map((id) => `"${id}"`).join(",")})`;

function psql(sql) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "-e",
      "PGPASSWORD=postgres",
      DB_CONTAINER,
      "psql",
      "-X",
      "-At",
      "-U",
      "postgres",
      "-h",
      "127.0.0.1",
      "-d",
      "postgres",
      "-c",
      sql,
    ],
    { encoding: "utf8" }
  ).trim();
}
/** Values a CHECK constraint allows for a column, e.g. users.role. */
function allowedValues(table, column) {
  const defs = psql(
    `select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.${table}'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%(${column} = ANY%'`
  );
  // Two spellings: ARRAY['a'::text, 'b'::text] and '{a,b}'::text[].
  const values = [];
  for (const m of defs.matchAll(/'([^']+)'::text(\[\])?/g)) {
    if (m[2])
      values.push(
        ...m[1]
          .replace(/^\{|\}$/g, "")
          .split(",")
          .map((v) => v.replace(/^"|"$/g, ""))
      );
    else values.push(m[1]);
  }
  return values;
}
const hasColumn = (table, column) =>
  psql(
    `select count(*) from information_schema.columns where table_schema='public' and table_name='${table}' and column_name='${column}'`
  ) === "1";
const hasTable = (table) => psql(`select to_regclass('public.${table}') is not null`) === "t";

const DAY = 24 * 60 * 60_000;
const now = Date.now();
const daysAgo = (n) => new Date(now - n * DAY).toISOString();
const dateOnly = (iso) => iso.slice(0, 10);
/** UTC timestamp on a calendar day; 23:30 UTC is early evening in the US. */
const slot = (ymd, hourUtc = 23, minute = 30, durationMin = 60) => {
  const start = new Date(
    `${ymd}T${String(hourUtc).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`
  );
  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + durationMin * 60_000).toISOString(),
  };
};
let seed = 7;
const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

// ── personas ─────────────────────────────────────────────
const ROLES = allowedValues("users", "role");
// Pricing replaces subscriptions.tier with plan_id + billing_term. Seed whichever
// the schema has, so this works before and after that migration lands.
// Decided per column, because other migrations can land halfway (plan_id added
// while tier is still required, for example).
const required = (table, column) =>
  psql(
    `select is_nullable from information_schema.columns where table_schema='public' and table_name='${table}' and column_name='${column}'`
  ) === "NO";
const SUB = {
  tier: hasColumn("subscriptions", "tier"),
  tierRequired: required("subscriptions", "tier"),
  planId: hasColumn("subscriptions", "plan_id"),
  planIdRequired: required("subscriptions", "plan_id"),
  billingTerm: hasColumn("subscriptions", "billing_term"),
  periodEnd: hasColumn("subscriptions", "current_period_end"),
};
const TIERS = SUB.tier ? allowedValues("subscriptions", "tier") : [];
const PLAN_VALUES = SUB.planId ? allowedValues("subscriptions", "plan_id") : [];
const teacherRole = ROLES.includes("teacher") ? "teacher" : "tutor";
const affiliateRole = ROLES.includes("affiliate_tutor") ? "affiliate_tutor" : "tutor";

const student = (key, first, last, extra = {}) => ({
  key,
  clerk_id: `dev_seed_${key}`,
  email: `${first}.${last}@karman.local`.toLowerCase(),
  first_name: first,
  last_name: last,
  role: "student",
  onboarding_completed_at: daysAgo(40),
  hs_year: "junior",
  time_zone: "America/Chicago",
  sat_test_date: "2027-03-13",
  heard_about_karman: "friend",
  ...extra,
});

const P = {
  free: student("student_free", "Noah", "Kim", {
    onboarding_completed_at: daysAgo(9),
    psat_score: 1010,
  }),
  practice: student("student_practice", "Ava", "Patel", { psat_score: 1120 }),
  pro: student("student_pro", "Liam", "Chen", {
    psat_score: 1320,
    recent_sat_math: 690,
    recent_sat_reading: 660,
  }),
  cohort: student("student_cohort", "Sofia", "Garcia", {
    sat_test_date: "2026-12-05",
    psat_score: 1190,
  }),
  private: student("student_private", "Maya", "Johnson", {
    hs_year: "senior",
    sat_test_date: "2026-12-05",
    recent_sat_math: 640,
    recent_sat_reading: 650,
  }),
  mate1: student("cohort_mate_1", "Ben", "Walker", { sat_test_date: "2026-12-05" }),
  mate2: student("cohort_mate_2", "Grace", "Liu", { sat_test_date: "2026-12-05" }),
  mate3: student("cohort_mate_3", "Omar", "Haddad", { sat_test_date: "2026-12-05" }),
  aff1: student("affiliate_student_1", "Ethan", "Brooks"),
  aff2: student("affiliate_student_2", "Chloe", "Nguyen"),
  aff3: student("affiliate_student_3", "Marcus", "Lee"),
  school1: student("school_student_1", "Isabella", "Rossi", { hs_year: "sophomore" }),
  school2: student("school_student_2", "Jamal", "Carter", { hs_year: "sophomore" }),
  school3: student("school_student_3", "Hannah", "Schultz", { hs_year: "junior" }),
  school4: student("school_student_4", "Diego", "Morales", { hs_year: "junior" }),
  admin: {
    key: "admin",
    clerk_id: "dev_seed_admin",
    email: "dev-seed-admin@karman.local",
    first_name: "Dev",
    last_name: "Admin",
    role: "admin",
    onboarding_completed_at: daysAgo(90),
  },
  parent: {
    key: "parent_maya",
    clerk_id: "dev_seed_parent_maya",
    email: "rachel.johnson@karman.local",
    first_name: "Rachel",
    last_name: "Johnson",
    role: "parent",
    onboarding_completed_at: daysAgo(60),
    time_zone: "America/Chicago",
  },
  david: {
    key: "tutor_david",
    clerk_id: "dev_seed_tutor_david",
    email: "david@karman.local",
    first_name: "David",
    last_name: "Cole",
    role: "tutor",
    onboarding_completed_at: daysAgo(120),
    time_zone: "America/Chicago",
    hourly_rate: 70,
    stripe_connect_account_id: "acct_dev_seed_david",
    stripe_connect_onboarded_at: daysAgo(110),
    stripe_payouts_enabled: true,
  },
  affiliate: {
    key: "affiliate_tutor",
    clerk_id: "dev_seed_affiliate_tutor",
    email: "priya.shah@karman.local",
    first_name: "Priya",
    last_name: "Shah",
    role: affiliateRole,
    onboarding_completed_at: daysAgo(30),
    time_zone: "America/New_York",
  },
  teacher: {
    key: "teacher",
    clerk_id: "dev_seed_teacher",
    email: "thomas.wright@karman.local",
    first_name: "Thomas",
    last_name: "Wright",
    role: teacherRole,
    onboarding_completed_at: daysAgo(50),
    time_zone: "America/Chicago",
  },
};
const STUDENTS = Object.values(P).filter((p) => p.role === "student");
const ALL_CLERK = Object.values(P).map((p) => p.clerk_id);

// Recurring plans. Plan model (pricing): Practice, Pro and the tutor-affiliate
// plan are subscriptions; Cohort and Private are one-time purchases recorded as
// plan_grants by supabase/seeds/overnight/pricing.sql. Free has nothing.
// Old tier model: Cohort is tier group and Private is tier private.
const PLAN_MODEL = {
  practice: ["practice", "month"],
  pro: ["pro", "quarter"],
  affiliate: ["tutor-affiliate", "month"],
};
const TIER_MODEL = {
  cohort: "group",
  private: "private",
  mate1: "group",
  mate2: "group",
  mate3: "group",
};

async function main() {
  console.log(`Seeding overnight personas into ${URL_}`);
  const base = spawnSync("node", [resolve(here, "..", "seed-dev.mjs")], {
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: URL_, SUPABASE_SERVICE_ROLE_KEY: KEY },
    stdio: ["ignore", "ignore", "inherit"],
  });
  if (base.status !== 0)
    console.log(
      "  ! scripts/seed-dev.mjs stopped early (error above). The overnight personas are seeded anyway."
    );
  // seed-dev adds four fake "DEV FIXTURE" questions for CI. The real bank is
  // loaded here, so drop them: QA must never meet a fake question.
  const fixtures = await sb("quiz_questions?source_pdf=eq.dev-fixture&select=id");
  if (fixtures.length > 0) {
    const ids = fixtures.map((f) => f.id);
    await del(`answer_choices?question_id=${inList(ids)}`);
    await del(`quiz_questions?id=${inList(ids)}`);
  }
  console.log("  ✓ base personas from scripts/seed-dev.mjs (its fake questions removed)");

  // Future SAT dates (placeholders ~2 weeks before, like seed-dev).
  await post(
    "sat_dates?on_conflict=test_date",
    [
      { test_date: "2026-12-05", registration_deadline: "2026-11-20" },
      { test_date: "2027-03-13", registration_deadline: "2027-02-26" },
      { test_date: "2027-05-01", registration_deadline: "2027-04-16" },
      { test_date: "2027-06-05", registration_deadline: "2027-05-21" },
    ],
    "return=minimal,resolution=ignore-duplicates"
  );

  // Users
  const id = {};
  for (const [k, p] of Object.entries(P)) {
    const { key: _key, ...row } = p;
    const rows = await post(
      "users?on_conflict=clerk_id",
      row,
      "return=representation,resolution=merge-duplicates"
    );
    id[k] = rows[0].id;
  }
  console.log(`  ✓ ${Object.keys(P).length} users (teacher role: ${teacherRole})`);
  const uuids = Object.values(id);

  // Clear the overnight personas' history before re-inserting it.
  await del(`subscriptions?user_id=${inList(ALL_CLERK)}`);
  await del(`parent_student_links?parent_user_id=eq.${id.parent}`);
  await del(`tutor_assignments?tutor_user_id=${inList([id.david, id.affiliate, id.teacher])}`);
  await del(`cohort_members?user_id=${inList(uuids)}`);
  await del(`tutor_notes?tutor_user_id=${inList([id.david, id.affiliate, id.teacher])}`);
  await del(`tokens?user_id=${inList(uuids)}`);
  await del(`bookings?student_id=${inList(uuids)}`);
  await del(`notifications?user_id=${inList(uuids)}`);
  await del(`diagnostic_results?user_id=${inList(uuids)}`);
  await del(`learn_node_status?user_id=${inList(ALL_CLERK)}`);
  await del(`quiz_attempts?student_id=${inList(ALL_CLERK)}`);

  // Subscriptions (fake Stripe ids sub_<clerk_id>, so re-runs merge)
  const subRow = (k) => ({
    user_id: P[k].clerk_id,
    stripe_subscription_id: `sub_${P[k].clerk_id}`,
    stripe_customer_id: `cus_${P[k].clerk_id}`,
    status: "active",
    created_at: daysAgo(k === "private" ? 70 : 35),
  });
  const subs = [];
  const planOk = (planId) =>
    SUB.planId && !SUB.tierRequired && (PLAN_VALUES.length === 0 || PLAN_VALUES.includes(planId));
  for (const [k, [plan_id, billing_term]] of Object.entries(PLAN_MODEL)) {
    if (!planOk(plan_id)) continue;
    const row = { ...subRow(k), plan_id };
    if (SUB.billingTerm) row.billing_term = billing_term;
    if (SUB.periodEnd)
      row.current_period_end = new Date(
        now + (billing_term === "quarter" ? 60 : 20) * DAY
      ).toISOString();
    subs.push(row);
  }
  for (const [k, tier] of Object.entries(TIER_MODEL)) {
    if (SUB.tier && !SUB.planIdRequired && TIERS.includes(tier)) subs.push({ ...subRow(k), tier });
  }
  await post(
    "subscriptions?on_conflict=stripe_subscription_id",
    subs,
    "return=minimal,resolution=merge-duplicates"
  );
  const who = subs.map((r) => `${r.user_id.replace("dev_seed_", "")} (${r.plan_id ?? r.tier})`);
  console.log(`  ✓ ${subs.length} subscriptions: ${who.join(", ") || "none"}`);
  if (!subs.some((r) => r.plan_id))
    console.log(
      "  · Practice, Pro and tutor-affiliate wait for the pricing migration (plan_id + billing_term)"
    );

  // Parent → Maya
  await post(
    "parent_student_links",
    { parent_user_id: id.parent, student_user_id: id.private },
    "return=minimal"
  );

  // David: 9-week cohort (18 sessions, Tue and Thu, 60 min, at most 6 students)
  const cohortId = await ensureCohort({
    name: "Fall Cohort 1200 to 1400",
    tier: "group",
    sat_date: "2026-12-05",
    tutor_user_id: id.david,
    max_size: 6,
    status: "active",
    current_topic: "Linear equations and transitions",
    setup_completed_at: daysAgo(30),
  });
  await post(
    "cohort_members",
    [id.cohort, id.mate1, id.mate2, id.mate3].map((u) => ({
      cohort_id: cohortId,
      user_id: u,
      joined_at: daysAgo(28),
    })),
    "return=minimal"
  );
  const days = [
    "2026-10-13",
    "2026-10-15",
    "2026-10-20",
    "2026-10-22",
    "2026-10-27",
    "2026-10-29",
    "2026-11-03",
    "2026-11-05",
    "2026-11-10",
    "2026-11-12",
    "2026-11-17",
    "2026-11-19",
    "2026-11-24",
    "2026-11-26",
    "2026-12-01",
    "2026-12-03",
    "2026-12-08",
    "2026-12-10",
  ];
  await del(`sessions?cohort_id=eq.${cohortId}`);
  await post(
    "sessions",
    days.map((d) => {
      const s = slot(d, 0, 0);
      const past = new Date(s.end).getTime() < now;
      return {
        tutor_id: id.david,
        cohort_id: cohortId,
        scheduled_start: s.start,
        scheduled_end: s.end,
        status: past ? "completed" : "scheduled",
        tutor_hours: past ? 1 : null,
        zoom_join_url: "https://zoom.us/j/0000000000",
      };
    }),
    "return=minimal"
  );
  await del(`cohort_homework?cohort_id=eq.${cohortId}`);
  await post(
    "cohort_homework",
    [
      {
        title: "Linear equations: 10-question set",
        body: "Finish before Tuesday. Use the hint only after a real try.",
        assigned_at: daysAgo(9),
        due_at: daysAgo(5),
      },
      {
        title: "Transitions and logical flow",
        body: "Read each explanation, even for the ones you got right.",
        assigned_at: daysAgo(3),
        due_at: new Date(now + 2 * DAY).toISOString(),
      },
      {
        title: "Timed Module 1 drill (Reading and Writing)",
        body: "32 minutes, one sitting. We review it together on Thursday.",
        assigned_at: daysAgo(1),
        due_at: new Date(now + 5 * DAY).toISOString(),
      },
    ].map((h) => ({ ...h, cohort_id: cohortId, created_by_user_id: id.david })),
    "return=minimal"
  );
  console.log("  ✓ David's cohort: 4 students, 18 sessions, 3 homework items");

  // Maya: Private 10 with David (8 done, 2 booked), tokens to match
  await post(
    "tutor_assignments",
    { tutor_user_id: id.david, student_user_id: id.private, started_at: daysAgo(70) },
    "return=minimal"
  );
  const privateDays = [
    "2026-09-19",
    "2026-09-26",
    "2026-10-03",
    "2026-10-10",
    "2026-10-17",
    "2026-10-24",
    "2026-10-31",
    "2026-11-07",
    "2026-11-14",
    "2026-11-21",
  ];
  const bookings = await post(
    "bookings",
    privateDays.map((d) => {
      const s = slot(d, 16, 0);
      const past = new Date(s.end).getTime() < now;
      return {
        student_id: id.private,
        tutor_id: id.david,
        plan_tier: "private",
        scheduled_start: s.start,
        scheduled_end: s.end,
        status: past ? "completed" : "scheduled",
        tutor_hours: past ? 1 : null,
        zoom_join_url: "https://zoom.us/j/0000000000",
      };
    })
  );
  await post(
    "tokens",
    bookings.map((b) => ({
      user_id: id.private,
      source: "private_purchase",
      granted_at: daysAgo(70),
      assigned_booking_id: b.id,
      consumed_at: b.status === "completed" ? b.scheduled_end : null,
      consumed_reason: b.status === "completed" ? "completed" : null,
    })),
    "return=minimal"
  );
  console.log("  ✓ Maya: 10 private sessions with David (8 done, 2 booked), 10 tokens");

  // Notes
  await post(
    "tutor_notes",
    [
      {
        tutor_user_id: id.david,
        student_user_id: id.private,
        body: "Strong on linear equations now. Still rushes the last two questions of a module, so we practise pacing.\n\nBoundaries questions improved a lot. Next: quadratic word problems.",
        created_at: daysAgo(15),
      },
      {
        tutor_user_id: id.david,
        cohort_id: cohortId,
        body: "Group is solid on transitions. Spend Thursday on systems of equations.",
        created_at: daysAgo(4),
      },
      {
        tutor_user_id: id.affiliate,
        student_user_id: id.aff1,
        body: "Ethan should do one Practice set a day before our Leland calls.",
        created_at: daysAgo(6),
      },
    ],
    "return=minimal"
  );

  // Affiliate tutor (Priya) and her three students; teacher (Thomas) and a class
  let affiliateCode = null;
  if (hasTable("tutor_affiliates")) {
    // Deleting the affiliate row also removes its codes and redemptions.
    await del(`tutor_affiliates?tutor_user_id=eq.${id.affiliate}`);
    const [aff] = await post("tutor_affiliates", {
      tutor_user_id: id.affiliate,
      seat_limit: 50,
      created_at: daysAgo(30),
    });
    affiliateCode = "PRYA-K7M2";
    const [code] = await post("tutor_affiliate_codes", {
      affiliate_id: aff.id,
      code: affiliateCode,
      created_at: daysAgo(30),
    });
    await post(
      "tutor_affiliate_redemptions",
      [id.aff1, id.aff2, id.aff3].map((u, i) => ({
        affiliate_id: aff.id,
        code_id: code.id,
        student_user_id: u,
        redeemed_at: daysAgo(20 - i * 4),
      })),
      "return=minimal"
    );
  } else {
    // Stand-in until the tutor-affiliate tables exist.
    await post(
      "tutor_assignments",
      [id.aff1, id.aff2, id.aff3].map((u) => ({
        tutor_user_id: id.affiliate,
        student_user_id: u,
        started_at: daysAgo(20),
      })),
      "return=minimal"
    );
  }
  const classId = await ensureCohort({
    name: "Lincoln High Period 3 SAT",
    tier: "group",
    sat_date: "2027-03-13",
    tutor_user_id: id.teacher,
    max_size: 30,
    status: "active",
    current_topic: "Information and ideas",
    setup_completed_at: daysAgo(45),
  });
  await post(
    "cohort_members",
    [id.school1, id.school2, id.school3, id.school4].map((u) => ({
      cohort_id: classId,
      user_id: u,
      joined_at: daysAgo(44),
    })),
    "return=minimal"
  );
  console.log(
    `  ✓ Priya (${affiliateRole}${affiliateCode ? `, code ${affiliateCode}` : ""}): 3 students · Thomas (${teacherRole}): class of 4`
  );

  // Progress and history for every student
  await seedHistory({ id, P, sb, post, inList, daysAgo, rand });

  // Notifications
  const notes = [];
  for (const k of ["free", "practice", "pro", "cohort", "private"]) {
    notes.push({
      user_id: id[k],
      type: "practice_reminder",
      title: "Your Daily 10 is ready",
      link: "/dashboard/student",
      read: false,
      created_at: daysAgo(0.2),
    });
  }
  notes.push({
    user_id: id.cohort,
    type: "homework_assigned",
    title: "New homework from David",
    body: "Timed Module 1 drill",
    link: "/dashboard/student",
    read: false,
    created_at: daysAgo(1),
  });
  notes.push({
    user_id: id.private,
    type: "session_reminder",
    title: "Session with David on Saturday",
    link: "/dashboard/student",
    read: true,
    created_at: daysAgo(2),
  });
  notes.push({
    user_id: id.parent,
    type: "weekly_summary",
    title: "Maya's week: 4 skills up",
    link: "/dashboard/parent",
    read: false,
    created_at: daysAgo(1),
  });
  await post("notifications", notes, "return=minimal");

  console.log("\n✓ Overnight personas ready. Roles and ids: docs/overnight/local-db.md");
}

async function ensureCohort(row) {
  const found = await sb(
    `cohorts?name=eq.${encodeURIComponent(row.name)}&tutor_user_id=eq.${row.tutor_user_id}`
  );
  if (found.length > 0) {
    await sb(`cohorts?id=eq.${found[0].id}`, { method: "PATCH", body: JSON.stringify(row) });
    return found[0].id;
  }
  return (await post("cohorts", row))[0].id;
}

main().catch((err) => {
  console.error("\n✗ seed failed:", err.message);
  process.exit(1);
});
