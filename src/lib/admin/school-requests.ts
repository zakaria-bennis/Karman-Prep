// ============================================================
// /admin/schools' reads beside the seat-derived pilots: the
// "book a call" requests schools sent from /schools (marketing_
// leads, source school_call), newest first, and the schools on
// file (the schools table) with their admins. Service role,
// server only, never throws.
// ============================================================

import { SCHOOL_CALL_SOURCE } from "@/lib/marketing/school-call";
import { adminDb, isMissingTable, loadUsers, selectRows, type Row } from "./plans";

export interface SchoolRequest {
  id: string;
  email: string;
  name: string | null;
  school: string;
  role: string | null;
  students: string | null;
  starting: string | null;
  phone: string | null;
  callTime: string | null;
  createdAt: string;
  /** When it was last sent (a school can send the form again). */
  sentAt: string;
  /** The school created from it in this admin, if any. */
  schoolId: string | null;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

export function toSchoolRequest(r: Row): SchoolRequest {
  const d = (r.details && typeof r.details === "object" ? r.details : {}) as Record<
    string,
    unknown
  >;
  const createdAt = String(r.created_at ?? "");
  return {
    id: String(r.id),
    email: String(r.email ?? ""),
    name: str(r.name),
    school: str(d.school) ?? "Unnamed school",
    role: str(d.schoolRole),
    students: str(d.students),
    starting: str(d.starting),
    phone: str(d.phone),
    callTime: str(d.callTime),
    createdAt,
    sentAt: str(r.updated_at) ?? createdAt,
    schoolId: str(d.schoolId),
  };
}

export async function loadSchoolRequests(): Promise<{
  rows: SchoolRequest[];
  missing: boolean;
  error: string | null;
}> {
  try {
    const { data, error } = await adminDb()
      .from("marketing_leads")
      .select("id, email, name, details, created_at, updated_at")
      .eq("source", SCHOOL_CALL_SOURCE)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) return { rows: [], missing: isMissingTable(error), error: error.message };
    return { rows: ((data ?? []) as Row[]).map(toSchoolRequest), missing: false, error: null };
  } catch (err) {
    return { rows: [], missing: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface SchoolOnFile {
  id: string;
  name: string;
  freeUntil: string;
  billingStatus: string;
  createdAt: string;
  /** The school admins' emails (or names when an account has no email). */
  admins: string[];
}

export async function loadSchoolsOnFile(): Promise<{
  rows: SchoolOnFile[];
  missing: boolean;
  error: string | null;
}> {
  const schools = await selectRows("schools", "id, name, free_until, billing_status, created_at");
  if (schools.error) return { rows: [], missing: schools.missing, error: schools.error };
  const ids = schools.rows.map((s) => String(s.id));
  const members = await selectRows("school_members", "school_id, user_id, role", {
    column: "school_id",
    values: ids,
  });
  const adminRows = members.rows.filter((m) => m.role === "admin");
  const users = await loadUsers({
    column: "id",
    values: [...new Set(adminRows.map((m) => String(m.user_id)))],
  });
  const label = new Map(
    users.rows.map((u) => [u.id, u.email ?? ([u.firstName, u.lastName].join(" ").trim() || u.id)])
  );
  const rows = schools.rows
    .map((s) => ({
      id: String(s.id),
      name: String(s.name ?? ""),
      freeUntil: String(s.free_until ?? ""),
      billingStatus: String(s.billing_status ?? ""),
      createdAt: String(s.created_at ?? ""),
      admins: adminRows
        .filter((m) => String(m.school_id) === String(s.id))
        .map((m) => label.get(String(m.user_id)) ?? "Unknown account"),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { rows, missing: false, error: members.error ?? users.error };
}
