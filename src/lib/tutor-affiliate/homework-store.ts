// Supabase implementation of HomeworkStore (public.tutor_homework).
// Service role only; callers check rights first (./homework.ts).

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import type { HomeworkItem, HomeworkKind, HomeworkStatus, HomeworkStore } from "./homework";

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

const COLUMNS =
  "id, student_user_id, assigned_by_user_id, kind, target_id, title, note, due_on, status, completed_at, cancelled_at, created_at";

type Row = {
  id: string;
  student_user_id: string;
  assigned_by_user_id: string;
  kind: HomeworkKind;
  target_id: string | null;
  title: string;
  note: string | null;
  due_on: string;
  status: HomeworkStatus;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};

const toItem = (r: Row): HomeworkItem => ({
  id: r.id,
  studentUserId: r.student_user_id,
  assignedByUserId: r.assigned_by_user_id,
  kind: r.kind,
  targetId: r.target_id,
  title: r.title,
  note: r.note,
  dueOn: r.due_on,
  status: r.status,
  completedAt: r.completed_at,
  cancelledAt: r.cancelled_at,
  createdAt: r.created_at,
});

function check(error: { code: string } | null): void {
  if (error) throw new Error(`Homework could not be saved (${error.code}).`);
}

export const supabaseHomeworkStore: HomeworkStore = {
  async insert(input) {
    const { data, error } = await db()
      .from("tutor_homework")
      .insert({
        student_user_id: input.studentUserId,
        assigned_by_user_id: input.assignedByUserId,
        kind: input.kind,
        target_id: input.targetId,
        title: input.title,
        note: input.note,
        due_on: input.dueOn,
        created_at: input.createdAt,
      })
      .select(COLUMNS)
      .single();
    check(error);
    return toItem(data as Row);
  },
  async byId(id) {
    const { data, error } = await db()
      .from("tutor_homework")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();
    check(error);
    return data ? toItem(data as Row) : null;
  },
  async listForStudent(studentUserId) {
    const { data, error } = await db()
      .from("tutor_homework")
      .select(COLUMNS)
      .eq("student_user_id", studentUserId)
      .order("created_at", { ascending: false })
      .limit(100);
    check(error);
    return ((data ?? []) as Row[]).map(toItem);
  },
  async cancel(id, at) {
    const { error } = await db()
      .from("tutor_homework")
      .update({ status: "cancelled", cancelled_at: at, updated_at: at })
      .eq("id", id)
      .eq("status", "assigned");
    check(error);
  },
  async cancelOpenFromAssigner(studentUserId, assignedByUserId, at) {
    const { data, error } = await db()
      .from("tutor_homework")
      .update({ status: "cancelled", cancelled_at: at, updated_at: at })
      .eq("student_user_id", studentUserId)
      .eq("assigned_by_user_id", assignedByUserId)
      .eq("status", "assigned")
      .select("id");
    check(error);
    return (data ?? []).length;
  },
};
