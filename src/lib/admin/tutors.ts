// ============================================================
// Admin tutor roster: each tutor with their regular students and
// their affiliate students. Regular uses the same sources as the
// tutor portal (fetchTutorScope in src/lib/supabase/queries/
// tutor.ts): an active tutor assignment, or current membership of
// a cohort the tutor leads that isn't archived. Affiliate means a
// live code redemption. Reads use the service role on the server,
// are batched (never one query per tutor) and never throw. When
// the affiliate tables are missing, affiliate counts read as zero.
// Pure helpers are tested in tutors.test.ts.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  adminDb,
  isMissingTable,
  loadUsers,
  matchesQuery,
  personName,
  type AdminUserRow,
  type Row,
  type Rows,
} from "@/lib/admin/plans";

export const TUTOR_ROLES = ["tutor", "affiliate_tutor"] as const;
export const TUTOR_KINDS = ["all", "regular", "affiliate"] as const;
export type TutorKindFilter = (typeof TUTOR_KINDS)[number];
export type TutorKind = Exclude<TutorKindFilter, "all">;

export interface StudentLink {
  kind: TutorKind;
  /** "Regular, assigned", "Regular, cohort Spring A" or "Affiliate code XYZ". */
  label: string;
  since: string | null;
}

export interface TutorStudent {
  userId: string;
  user: AdminUserRow | null;
  links: StudentLink[];
}

export interface TutorRow {
  userId: string;
  user: AdminUserRow | null;
  kind: TutorKind;
  regular: number;
  affiliate: number;
  /** null when the tutor has no affiliate program. */
  seatLimit: number | null;
  /** Each student once, even when they are both regular and affiliate. */
  total: number;
  students: TutorStudent[];
}

export interface RosterInput {
  /** Every user row we have: tutors and students. */
  users: AdminUserRow[];
  cohorts: Row[];
  members: Row[];
  assignments: Row[];
  affiliates: Row[];
  codes: Row[];
  redemptions: Row[];
}

// ---------- pure helpers ----------

const text = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

export function isTutorRole(role: string | null | undefined): boolean {
  return !!role && (TUTOR_ROLES as readonly string[]).includes(role);
}

export function parseKind(value: unknown): TutorKindFilter {
  return typeof value === "string" && (TUTOR_KINDS as readonly string[]).includes(value)
    ? (value as TutorKindFilter)
    : "all";
}

const nameOf = (u: AdminUserRow | null, fallback: string) => (u ? personName(u) : fallback);

/**
 * One row per tutor. Rows may include history: ended assignments, members
 * who left, archived cohorts and removed redemptions never count. Users
 * without a tutor role appear only when they have students or an
 * affiliate program (say, an admin who leads a cohort).
 */
export function buildTutorRoster(input: RosterInput): TutorRow[] {
  const userById = new Map(input.users.map((u) => [u.id, u]));
  const byTutor = new Map<string, { students: Map<string, StudentLink[]>; program: Row | null }>();
  const entry = (tutorId: string) => {
    let e = byTutor.get(tutorId);
    if (!e) {
      e = { students: new Map(), program: null };
      byTutor.set(tutorId, e);
    }
    return e;
  };
  const add = (tutorId: string | null, studentId: string | null, link: StudentLink) => {
    if (!tutorId || !studentId || tutorId === studentId) return;
    const students = entry(tutorId).students;
    students.set(studentId, [...(students.get(studentId) ?? []), link]);
  };

  for (const u of input.users) if (isTutorRole(u.role)) entry(u.id);

  for (const a of input.assignments) {
    if (a.ended_at) continue;
    add(text(a.tutor_user_id), text(a.student_user_id), {
      kind: "regular",
      label: "Regular, assigned",
      since: text(a.started_at),
    });
  }

  const cohortById = new Map(
    input.cohorts.filter((c) => !c.archived_at).map((c) => [String(c.id), c])
  );
  for (const m of input.members) {
    const cohort = cohortById.get(String(m.cohort_id));
    if (m.left_at || !cohort) continue;
    const name = text(cohort.name);
    add(text(cohort.tutor_user_id), text(m.user_id), {
      kind: "regular",
      label: name ? `Regular, cohort ${name}` : "Regular, cohort",
      since: text(m.joined_at),
    });
  }

  const programById = new Map(input.affiliates.map((a) => [String(a.id), a]));
  for (const a of input.affiliates) {
    const tutorId = text(a.tutor_user_id);
    if (tutorId) entry(tutorId).program = a;
  }
  const codeById = new Map(input.codes.map((c) => [String(c.id), text(c.code)]));
  for (const r of input.redemptions) {
    const program = programById.get(String(r.affiliate_id));
    if (r.removed_at || !program) continue;
    const code = codeById.get(String(r.code_id)) ?? null;
    add(text(program.tutor_user_id), text(r.student_user_id), {
      kind: "affiliate",
      label: code ? `Affiliate code ${code}` : "Affiliate code",
      since: text(r.redeemed_at),
    });
  }

  const rows: TutorRow[] = [];
  for (const [userId, e] of byTutor) {
    const user = userById.get(userId) ?? null;
    if (!isTutorRole(user?.role) && e.students.size === 0 && !e.program) continue;
    const students: TutorStudent[] = [...e.students]
      .map(([id, links]) => ({
        userId: id,
        user: userById.get(id) ?? null,
        links: [...links].sort((a, b) => (a.since ?? "").localeCompare(b.since ?? "")),
      }))
      .sort((a, b) =>
        nameOf(a.user, "Unknown student").localeCompare(nameOf(b.user, "Unknown student"))
      );
    const has = (s: TutorStudent, kind: TutorKind) => s.links.some((l) => l.kind === kind);
    rows.push({
      userId,
      user,
      kind: e.program || user?.role === "affiliate_tutor" ? "affiliate" : "regular",
      regular: students.filter((s) => has(s, "regular")).length,
      affiliate: students.filter((s) => has(s, "affiliate")).length,
      seatLimit: e.program ? num(e.program.seat_limit) : null,
      total: students.length,
      students,
    });
  }
  return rows.sort(
    (a, b) =>
      b.total - a.total ||
      nameOf(a.user, "Unknown tutor").localeCompare(nameOf(b.user, "Unknown tutor"))
  );
}

/** Kind tab, then search on tutor name or email. */
export function filterTutors(rows: TutorRow[], kind: TutorKindFilter, q: string): TutorRow[] {
  return rows.filter(
    (t) =>
      (kind === "all" || t.kind === kind) &&
      matchesQuery(q, [t.user ? personName(t.user) : null, t.user?.email])
  );
}

export function rosterStats(rows: TutorRow[]): {
  tutors: number;
  students: number;
  seatsUsed: number;
  seatLimit: number;
} {
  const students = new Set<string>();
  let seatsUsed = 0;
  let seatLimit = 0;
  for (const t of rows) {
    for (const s of t.students) students.add(s.userId);
    seatsUsed += t.affiliate;
    seatLimit += t.seatLimit ?? 0;
  }
  return { tutors: rows.length, students: students.size, seatsUsed, seatLimit };
}

/** "Tutor" or "Affiliate tutor", plus a note when the account has another role. */
export function roleLabel(row: Pick<TutorRow, "kind" | "user">): {
  label: string;
  note: string | null;
} {
  const role = row.user?.role ?? null;
  const other = role && !isTutorRole(role) ? role.replace(/_/g, " ") : null;
  return {
    label: row.kind === "affiliate" ? "Affiliate tutor" : "Tutor",
    note: other ? `${other.charAt(0).toUpperCase()}${other.slice(1)} account` : null,
  };
}

// ---------- server reads ----------

const LIMIT = 5000;
const ID_CHUNK = 150;

type Result = { data: unknown; error: { message: string; code?: string | null } | null };

/** One read with filters PostgREST applies. Never throws. */
async function read(build: (db: SupabaseClient) => PromiseLike<Result>): Promise<Rows> {
  try {
    const { data, error } = await build(adminDb());
    if (error) return { rows: [], missing: isMissingTable(error), error: error.message };
    return { rows: (data ?? []) as Row[], missing: false, error: null };
  } catch (err) {
    return { rows: [], missing: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Users by id in chunks, so a long id list never makes a too-long URL. */
async function loadUsersById(
  ids: string[]
): Promise<{ rows: AdminUserRow[]; error: string | null }> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) chunks.push(ids.slice(i, i + ID_CHUNK));
  const results = await Promise.all(chunks.map((values) => loadUsers({ column: "id", values })));
  return {
    rows: results.flatMap((r) => r.rows),
    error: results.find((r) => r.error)?.error ?? null,
  };
}

export interface TutorRoster {
  tutors: TutorRow[];
  affiliateMissing: boolean;
  error: string | null;
}

export async function loadTutorRoster(): Promise<TutorRoster> {
  const [tutorUsers, cohorts, members, assignments, affiliates, codes, redemptions] =
    await Promise.all([
      loadUsers({ column: "role", values: [...TUTOR_ROLES] }),
      read((db) =>
        db.from("cohorts").select("id, name, tutor_user_id").is("archived_at", null).limit(LIMIT)
      ),
      read((db) =>
        db
          .from("cohort_members")
          .select("cohort_id, user_id, joined_at")
          .is("left_at", null)
          .limit(LIMIT)
      ),
      read((db) =>
        db
          .from("tutor_assignments")
          .select("tutor_user_id, student_user_id, started_at")
          .is("ended_at", null)
          .limit(LIMIT)
      ),
      read((db) =>
        db.from("tutor_affiliates").select("id, tutor_user_id, seat_limit").limit(LIMIT)
      ),
      read((db) => db.from("tutor_affiliate_codes").select("id, code").limit(LIMIT)),
      read((db) =>
        db
          .from("tutor_affiliate_redemptions")
          .select("affiliate_id, code_id, student_user_id, redeemed_at")
          .is("removed_at", null)
          .limit(LIMIT)
      ),
    ]);

  const affiliateMissing = affiliates.missing || codes.missing || redemptions.missing;
  const program = affiliateMissing
    ? { affiliates: [], codes: [], redemptions: [] }
    : { affiliates: affiliates.rows, codes: codes.rows, redemptions: redemptions.rows };

  const known = new Set(tutorUsers.rows.map((u) => u.id));
  const wanted = new Set<string>();
  const want = (v: unknown) => {
    const id = text(v);
    if (id && !known.has(id)) wanted.add(id);
  };
  const liveCohorts = new Set(cohorts.rows.map((c) => String(c.id)));
  for (const c of cohorts.rows) want(c.tutor_user_id);
  for (const m of members.rows) if (liveCohorts.has(String(m.cohort_id))) want(m.user_id);
  for (const a of assignments.rows) [a.tutor_user_id, a.student_user_id].forEach(want);
  for (const a of program.affiliates) want(a.tutor_user_id);
  for (const r of program.redemptions) want(r.student_user_id);
  const others = await loadUsersById([...wanted]);

  const affiliateError = affiliateMissing
    ? null
    : (affiliates.error ?? codes.error ?? redemptions.error);
  return {
    tutors: buildTutorRoster({
      users: [...tutorUsers.rows, ...others.rows],
      cohorts: cohorts.rows,
      members: members.rows,
      assignments: assignments.rows,
      ...program,
    }),
    affiliateMissing,
    error:
      tutorUsers.error ??
      cohorts.error ??
      members.error ??
      assignments.error ??
      affiliateError ??
      others.error,
  };
}
