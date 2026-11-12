import "server-only";
/*
 * Reads and writes for the parent portal's Messages, official SAT scores and alert choices
 * (founder, 2026-11-12). The pure parts live in ./messages-model.ts and ./test-day.ts. Callers
 * must have checked the parent's link to the child (requireChild) or that the viewer is an
 * admin (requireAdmin). Parents never see question ids or answers: practice is read only as
 * counts for the week glance under each tutor note.
 */
import { loadPracticeActivity } from "@/lib/progress-glance/server";
import { untypedAdmin, type UntypedAdmin } from "@/lib/school/db";
import {
  noteTimeline,
  weekStats,
  type FamilyMessage,
  type WeekStats,
  type MessageKind,
  type NoteEntry,
} from "./messages-model";
import type { Child } from "./server";
import type { OfficialScore } from "./test-day";

type One<T> = T | T[] | null;
const pick = <T>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

const DAY_MS = 86_400_000;

interface MessageRow {
  id: string;
  author_role: "parent" | "staff";
  kind: MessageKind;
  session_starts_at: string | null;
  body: string;
  status: "open" | "handled";
  created_at: string;
  read_at: string | null;
  author: One<{ first_name: string | null }>;
}

const MESSAGE_COLUMNS =
  "id, author_role, kind, session_starts_at, body, status, created_at, read_at, author:users!family_messages_author_user_id_fkey (first_name)";

function toMessage(r: MessageRow): FamilyMessage {
  return {
    id: r.id,
    from: r.author_role,
    authorName: pick(r.author)?.first_name ?? null,
    kind: r.kind,
    sessionStartsAt: r.session_starts_at,
    body: r.body,
    status: r.status,
    createdAt: r.created_at,
    readAt: r.read_at,
  };
}

/** One family's conversation with the team, oldest first. */
export async function loadFamilyThread(
  parentUserId: string,
  studentUserId: string,
  supabase: UntypedAdmin = untypedAdmin()
): Promise<FamilyMessage[]> {
  const { data, error } = await supabase
    .from("family_messages")
    .select(MESSAGE_COLUMNS)
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentUserId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) {
    // Quiet where the Messages migration is not applied yet, like tutor homework.
    console.error("[parent] messages could not be read", error.message);
    return [];
  }
  return ((data ?? []) as MessageRow[]).map(toMessage);
}

/** Team replies the parent hasn't opened yet. */
export async function unreadStaffCount(parentUserId: string, studentUserId: string) {
  const { count, error } = await untypedAdmin()
    .from("family_messages")
    .select("id", { count: "exact", head: true })
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentUserId)
    .eq("author_role", "staff")
    .is("read_at", null);
  return error ? 0 : (count ?? 0);
}

/** Marks the team's replies as seen when the parent opens Messages. */
export async function markStaffRead(parentUserId: string, studentUserId: string): Promise<void> {
  await untypedAdmin()
    .from("family_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentUserId)
    .eq("author_role", "staff")
    .is("read_at", null);
}

export async function postFamilyMessage(row: {
  parentUserId: string;
  studentUserId: string;
  authorUserId: string;
  authorRole: "parent" | "staff";
  kind: MessageKind;
  sessionRef?: string | null;
  sessionStartsAt?: string | null;
  body: string;
}): Promise<string> {
  const { data, error } = await untypedAdmin()
    .from("family_messages")
    .insert({
      parent_user_id: row.parentUserId,
      student_user_id: row.studentUserId,
      author_user_id: row.authorUserId,
      author_role: row.authorRole,
      kind: row.kind,
      session_ref: row.sessionRef ?? null,
      session_starts_at: row.sessionStartsAt ?? null,
      body: row.body,
      // The team's own words never wait on the team.
      status: row.authorRole === "staff" ? "handled" : "open",
      handled_at: row.authorRole === "staff" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** A tutor (or admin) leaves a note for the family after a session. Returns the new id. */
export async function postParentNote(
  input: { studentUserId: string; tutorUserId: string; body: string },
  supabase: UntypedAdmin = untypedAdmin()
): Promise<string> {
  const { data, error } = await supabase
    .from("parent_session_notes")
    .insert({
      student_user_id: input.studentUserId,
      tutor_user_id: input.tutorUserId,
      body: input.body,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** The last few notes the family can see, for the tutor's page. */
export async function recentParentNotes(
  studentUserId: string,
  supabase: UntypedAdmin = untypedAdmin()
): Promise<{ id: string; body: string; at: string; from: string | null }[]> {
  const { data, error } = await supabase
    .from("parent_session_notes")
    .select(
      "id, body, created_at, tutor:users!parent_session_notes_tutor_user_id_fkey (first_name)"
    )
    .eq("student_user_id", studentUserId)
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) return [];
  return (
    (data ?? []) as {
      id: string;
      body: string;
      created_at: string;
      tutor: One<{ first_name: string | null }>;
    }[]
  ).map((n) => ({
    id: n.id,
    body: n.body,
    at: n.created_at,
    from: pick(n.tutor)?.first_name ?? null,
  }));
}

/**
 * Every note for the family about the child, newest first, each with that week's practice, plus this week
 * and the week before it for the inbox's glance.
 */
export async function loadNoteTimeline(
  child: Child,
  now: Date = new Date(),
  supabase: UntypedAdmin = untypedAdmin()
): Promise<{ notes: NoteEntry[]; thisWeek: WeekStats; lastWeek: WeekStats }> {
  // Notes written for the family after each session (parent_session_notes), newest first.
  const { data, error } = await supabase
    .from("parent_session_notes")
    .select(
      "id, body, created_at, tutor:users!parent_session_notes_tutor_user_id_fkey (first_name)"
    )
    .eq("student_user_id", child.id)
    .order("created_at", { ascending: false })
    .limit(40);
  const notes = (
    (error ? [] : (data ?? [])) as {
      id: string;
      body: string;
      created_at: string;
      tutor: One<{ first_name: string | null }>;
    }[]
  ).map((n) => ({
    id: n.id,
    from: pick(n.tutor)?.first_name ?? null,
    body: n.body,
    at: n.created_at,
  }));
  // Practice from a week before the oldest note (or two weeks back), at most 120 days back.
  const oldest = notes.length
    ? Date.parse(notes[notes.length - 1].at) - 7 * DAY_MS
    : now.getTime() - 14 * DAY_MS;
  const since = new Date(
    Math.max(Math.min(oldest, now.getTime() - 14 * DAY_MS), now.getTime() - 120 * DAY_MS)
  );
  const activity = await loadPracticeActivity([child.clerkId], since, supabase).catch(() => null);
  const answers = activity?.get(child.clerkId)?.answers ?? [];
  return {
    notes: noteTimeline(notes, answers),
    thisWeek: weekStats(answers, now.toISOString()),
    lastWeek: weekStats(answers, new Date(now.getTime() - 7 * DAY_MS).toISOString()),
  };
}

// ── Official SAT scores ─────────────────────────────────────

export async function loadOfficialScores(
  studentUserId: string,
  supabase: UntypedAdmin = untypedAdmin()
): Promise<OfficialScore[]> {
  const { data, error } = await supabase
    .from("official_sat_scores")
    .select("test_date, reading_writing, math, total")
    .eq("student_user_id", studentUserId)
    .order("test_date", { ascending: false });
  if (error) return [];
  return (
    (data ?? []) as { test_date: string; reading_writing: number; math: number; total: number }[]
  ).map((s) => ({
    testDate: s.test_date,
    readingWriting: s.reading_writing,
    math: s.math,
    total: s.total,
  }));
}

/** One score per test date: typing the same date again corrects it. */
export async function saveOfficialScore(row: {
  studentUserId: string;
  enteredByUserId: string;
  testDate: string;
  readingWriting: number;
  math: number;
}): Promise<void> {
  const { error } = await untypedAdmin().from("official_sat_scores").upsert(
    {
      student_user_id: row.studentUserId,
      entered_by_user_id: row.enteredByUserId,
      test_date: row.testDate,
      reading_writing: row.readingWriting,
      math: row.math,
    },
    { onConflict: "student_user_id,test_date" }
  );
  if (error) throw error;
}

/** The SAT date the student picked in their settings, if any. */
export async function childTestDate(studentUserId: string): Promise<string | null> {
  const { data, error } = await untypedAdmin()
    .from("users")
    .select("sat_test_date")
    .eq("id", studentUserId)
    .maybeSingle();
  if (error) return null;
  const d = (data as { sat_test_date: string | null } | null)?.sat_test_date ?? null;
  return d ? d.slice(0, 10) : null;
}

// ── Alert choices ───────────────────────────────────────────

export interface AlertPrefs {
  lateHomework: boolean;
  missedSession: boolean;
}

export async function readAlertPrefs(parentUserId: string): Promise<AlertPrefs> {
  const { data, error } = await untypedAdmin()
    .from("parent_email_settings")
    .select("alert_late_homework, alert_missed_session")
    .eq("parent_user_id", parentUserId)
    .maybeSingle();
  const row = error
    ? null
    : (data as { alert_late_homework: boolean; alert_missed_session: boolean } | null);
  return {
    lateHomework: row?.alert_late_homework ?? true,
    missedSession: row?.alert_missed_session ?? true,
  };
}

export async function saveAlertPrefs(parentUserId: string, prefs: AlertPrefs): Promise<void> {
  const { error } = await untypedAdmin().from("parent_email_settings").upsert(
    {
      parent_user_id: parentUserId,
      alert_late_homework: prefs.lateHomework,
      alert_missed_session: prefs.missedSession,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "parent_user_id" }
  );
  if (error) throw error;
}

// ── The team's inbox ────────────────────────────────────────

export interface FamilySummary {
  parentUserId: string;
  studentUserId: string;
  parentName: string;
  studentName: string;
  open: number;
  lastAt: string;
  lastFrom: "parent" | "staff";
  lastBody: string;
  lastKind: MessageKind;
}

const nameOf = (
  u: { first_name: string | null; last_name: string | null; email: string | null } | null
) =>
  u ? [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "Unknown" : "Unknown";

/** Every family that has written, the ones waiting on the team first, then newest. */
export async function listFamilies(): Promise<FamilySummary[]> {
  type U = { first_name: string | null; last_name: string | null; email: string | null };
  const { data, error } = await untypedAdmin()
    .from("family_messages")
    .select(
      "parent_user_id, student_user_id, author_role, kind, body, status, created_at, parent:users!family_messages_parent_user_id_fkey (first_name, last_name, email), student:users!family_messages_student_user_id_fkey (first_name, last_name, email)"
    )
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.error("[admin] family messages could not be read", error.message);
    return [];
  }
  const byFamily = new Map<string, FamilySummary>();
  for (const r of (data ?? []) as {
    parent_user_id: string;
    student_user_id: string;
    author_role: "parent" | "staff";
    kind: MessageKind;
    body: string;
    status: "open" | "handled";
    created_at: string;
    parent: One<U>;
    student: One<U>;
  }[]) {
    const key = `${r.parent_user_id}:${r.student_user_id}`;
    let f = byFamily.get(key);
    if (!f) {
      f = {
        parentUserId: r.parent_user_id,
        studentUserId: r.student_user_id,
        parentName: nameOf(pick(r.parent)),
        studentName: nameOf(pick(r.student)),
        open: 0,
        lastAt: r.created_at,
        lastFrom: r.author_role,
        lastBody: r.body,
        lastKind: r.kind,
      };
      byFamily.set(key, f);
    }
    if (r.status === "open") f.open++;
  }
  return [...byFamily.values()].sort(
    (a, b) => Number(b.open > 0) - Number(a.open > 0) || b.lastAt.localeCompare(a.lastAt)
  );
}

/** The team marks a family's open messages as handled. */
export async function markFamilyHandled(parentUserId: string, studentUserId: string) {
  const { error } = await untypedAdmin()
    .from("family_messages")
    .update({ status: "handled", handled_at: new Date().toISOString() })
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentUserId)
    .eq("status", "open");
  if (error) throw error;
}

/** Names for the admin's family header. */
export async function familyNames(parentUserId: string, studentUserId: string) {
  const { data } = await untypedAdmin()
    .from("users")
    .select("id, first_name, last_name, email")
    .in("id", [parentUserId, studentUserId]);
  const rows = (data ?? []) as ({ id: string } & Parameters<typeof nameOf>[0] & object)[];
  const find = (id: string) => rows.find((r) => r.id === id) ?? null;
  return { parent: nameOf(find(parentUserId)), student: nameOf(find(studentUserId)) };
}

/** Whether this parent is linked to this student (admin replies only go to real families). */
export async function isLinkedFamily(parentUserId: string, studentUserId: string) {
  const { data } = await untypedAdmin()
    .from("parent_student_links")
    .select("parent_user_id")
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentUserId)
    .maybeSingle();
  return !!data;
}
