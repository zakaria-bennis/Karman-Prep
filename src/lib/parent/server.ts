import "server-only";
/*
 * The parent portal's data: a bigger-picture, less detailed version of the student's view
 * (founder, 2026-11-07). Parents see counts, time, sessions, skills by level and one
 * predicted score. They never see which questions their child got wrong: nothing here reads
 * question ids, question text or answers.
 */
import { notFound, redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import {
  buildProgressGlance,
  predictedScore,
  type ProgressGlance,
} from "@/lib/progress-glance/levels";
import { loadPracticeActivity, loadScoreHistory } from "@/lib/progress-glance/server";
import { listSchoolHomeworkForStudent } from "@/lib/school/homework";
import { resolveEffectiveClerkId, resolveEffectiveRole } from "@/lib/supabase/queries/admin";
import { untypedAdmin, type UntypedAdmin } from "@/lib/school/db";
import { guaranteeFor, type GuaranteeStatus } from "./guarantee";

export interface Child {
  id: string;
  clerkId: string;
  firstName: string;
  name: string;
}

export interface ParentContext {
  viewer: { userId: string; clerkId: string; firstName: string | null; email: string | null };
  isAdmin: boolean;
  children: Child[];
}

type Admin = UntypedAdmin;

function childFrom(u: {
  id: string;
  clerk_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}): Child {
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "Your student";
  return { id: u.id, clerkId: u.clerk_id, firstName: u.first_name || name.split(" ")[0], name };
}

export async function requireParentContext(): Promise<ParentContext> {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) redirect("/auth/sign-in");
  const { clerkId } = await resolveEffectiveClerkId(realUserId);
  const role = await resolveEffectiveRole(clerkId);
  if (role !== "parent" && role !== "admin") redirect("/dashboard/student");
  const supabase = untypedAdmin();
  const { data: me } = await supabase
    .from("users")
    .select("id, clerk_id, first_name, email")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!me) redirect("/dashboard/student");
  const { data: links, error } = await supabase
    .from("parent_student_links")
    .select(
      "created_at, student:users!parent_student_links_student_user_id_fkey (id, clerk_id, first_name, last_name, email)"
    )
    .eq("parent_user_id", me.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  type U = {
    id: string;
    clerk_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  const children = ((links ?? []) as { student: U | U[] | null }[]).flatMap((l) => {
    const s = Array.isArray(l.student) ? l.student[0] : l.student;
    return s ? [childFrom(s)] : [];
  });
  return {
    viewer: {
      userId: me.id as string,
      clerkId: me.clerk_id as string,
      firstName: (me.first_name as string | null) ?? null,
      email: (me.email as string | null) ?? null,
    },
    isAdmin: role === "admin",
    children,
  };
}

/** The linked child, or a 404 (admins may open any student for support). */
export async function requireChild(ctx: ParentContext, studentId: string): Promise<Child> {
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) notFound();
  const linked = ctx.children.find((c) => c.id === studentId);
  if (linked) return linked;
  if (!ctx.isAdmin) notFound();
  const { data } = await untypedAdmin()
    .from("users")
    .select("id, clerk_id, first_name, last_name, email")
    .eq("id", studentId)
    .eq("role", "student")
    .maybeSingle();
  if (!data) notFound();
  return childFrom(data as Parameters<typeof childFrom>[0]);
}

export interface HomeworkGlance {
  done: number;
  late: number;
  dueThisWeek: number;
  /** Titles and due dates only, soonest first. */
  open: { title: string; dueOn: string; late: boolean }[];
}

export interface SessionGlance {
  id: string;
  kind: "1:1" | "Cohort class";
  startsAt: string;
  with: string | null;
  status: string;
  recordingUrl: string | null;
}

export interface ChildWeek {
  homework: HomeworkGlance;
  minutesThisWeek: number;
  upcoming: SessionGlance[];
  past: SessionGlance[];
  glance: ProgressGlance;
  score: { current: number | null; history: { takenAt: string; score: number }[] };
  guarantee: GuaranteeStatus | null;
  tutorNote: { body: string; from: string | null; at: string } | null;
  plan: { tier: string | null; status: string | null; customerId: string | null };
}

const WEEK_MS = 7 * 86_400_000;

async function tutorHomework(supabase: Admin, studentUserId: string) {
  // The tutor-affiliate session's table (claude/overnight-tutor-9d4a20). Read only, and
  // skipped quietly where its migration is not applied yet.
  const { data, error } = await supabase
    .from("tutor_homework")
    .select("title, due_on, status")
    .eq("student_user_id", studentUserId)
    .neq("status", "cancelled");
  if (error) return [];
  return (data ?? []) as { title: string; due_on: string; status: string }[];
}

function homeworkGlance(
  items: { title: string; dueOn: string; done: boolean }[],
  now: Date
): HomeworkGlance {
  const today = now.toISOString().slice(0, 10);
  const weekEnd = new Date(now.getTime() + WEEK_MS).toISOString().slice(0, 10);
  const open = items
    .filter((i) => !i.done)
    .map((i) => ({ title: i.title, dueOn: i.dueOn, late: i.dueOn < today }))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  return {
    done: items.filter((i) => i.done).length,
    late: open.filter((i) => i.late).length,
    dueThisWeek: open.filter((i) => !i.late && i.dueOn <= weekEnd).length,
    open,
  };
}

async function sessionsFor(supabase: Admin, child: Child, now: Date) {
  const [{ data: bookings }, { data: member }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, scheduled_start, status, session_id, tutor:users!bookings_tutor_id_fkey (first_name), session:sessions!bookings_session_id_fkey (zoom_recording_url)"
      )
      .eq("student_id", child.id)
      .order("scheduled_start", { ascending: true }),
    supabase
      .from("cohort_members")
      .select("cohort_id")
      .eq("user_id", child.id)
      .is("left_at", null)
      .limit(1)
      .maybeSingle(),
  ]);
  type One<T> = T | T[] | null;
  const pick = <T>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  const all: SessionGlance[] = (
    (bookings ?? []) as {
      id: string;
      scheduled_start: string;
      status: string;
      tutor: One<{ first_name: string | null }>;
      session: One<{ zoom_recording_url: string | null }>;
    }[]
  ).map((b) => ({
    id: b.id,
    kind: "1:1",
    startsAt: b.scheduled_start,
    with: pick(b.tutor)?.first_name ?? null,
    status: b.status,
    recordingUrl: pick(b.session)?.zoom_recording_url ?? null,
  }));
  if (member?.cohort_id) {
    const { data: classes } = await supabase
      .from("sessions")
      .select(
        "id, scheduled_start, status, zoom_recording_url, tutor:users!sessions_tutor_id_fkey (first_name)"
      )
      .eq("cohort_id", member.cohort_id)
      .order("scheduled_start", { ascending: true });
    for (const s of (classes ?? []) as {
      id: string;
      scheduled_start: string;
      status: string | null;
      zoom_recording_url: string | null;
      tutor: One<{ first_name: string | null }>;
    }[]) {
      all.push({
        id: s.id,
        kind: "Cohort class",
        startsAt: s.scheduled_start,
        with: pick(s.tutor)?.first_name ?? null,
        status: s.status ?? "scheduled",
        recordingUrl: s.zoom_recording_url,
      });
    }
  }
  const nowIso = now.toISOString();
  const live = all.filter((s) => s.status !== "cancelled");
  return {
    upcoming: live
      .filter((s) => s.startsAt >= nowIso)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    past: live
      .filter((s) => s.startsAt < nowIso)
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
  };
}

export async function loadChildWeek(child: Child, now: Date = new Date()): Promise<ChildWeek> {
  const supabase = untypedAdmin();
  const since = new Date(now.getTime() - WEEK_MS);
  const [activity, scores, school, tutorItems, sessions, note, sub] = await Promise.all([
    loadPracticeActivity([child.clerkId], since, supabase),
    loadScoreHistory([child.id], supabase),
    listSchoolHomeworkForStudent({ userId: child.id, clerkId: child.clerkId }, supabase),
    tutorHomework(supabase, child.id),
    sessionsFor(supabase, child, now),
    supabase
      .from("tutor_notes")
      .select("body, created_at, tutor:users!tutor_notes_tutor_user_id_fkey (first_name)")
      .eq("student_user_id", child.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("tier, status, stripe_customer_id")
      .eq("user_id", child.clerkId)
      .maybeSingle(),
  ]);
  const act = activity.get(child.clerkId);
  const history = (scores.get(child.id) ?? []).map((s) => ({
    takenAt: s.takenAt,
    score: predictedScore(s.low, s.high),
  }));
  const homework = homeworkGlance(
    [
      ...school.map((h) => ({ title: h.title, dueOn: h.dueOn, done: h.status === "completed" })),
      ...tutorItems.map((h) => ({
        title: h.title,
        dueOn: h.due_on,
        done: h.status === "completed",
      })),
    ],
    now
  );
  const tier = (sub.data?.tier as string | null) ?? null;
  const noteRow = note.data as {
    body: string;
    created_at: string;
    tutor: { first_name: string | null } | { first_name: string | null }[] | null;
  } | null;
  const noteTutor = noteRow
    ? Array.isArray(noteRow.tutor)
      ? noteRow.tutor[0]
      : noteRow.tutor
    : null;
  return {
    homework,
    minutesThisWeek: Math.round((act?.secondsSince ?? 0) / 60),
    upcoming: sessions.upcoming,
    past: sessions.past,
    glance: buildProgressGlance(act?.answers ?? [], now),
    score: { current: history.at(-1)?.score ?? null, history },
    guarantee: guaranteeFor(tier, history),
    tutorNote: noteRow
      ? { body: noteRow.body, from: noteTutor?.first_name ?? null, at: noteRow.created_at }
      : null,
    plan: {
      tier,
      status: (sub.data?.status as string | null) ?? null,
      customerId: (sub.data?.stripe_customer_id as string | null) ?? null,
    },
  };
}
