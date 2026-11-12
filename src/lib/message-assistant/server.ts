import "server-only";
/*
 * The message assistant's reads and writes (founder, 2026-11-12). It reads a family's
 * conversation, saves where it stands, and logs every draft it writes. Sending is a person's act:
 * sendDraft posts the staff member's final words, edited or not, and records who sent what.
 * Nothing in this file writes to a family on its own.
 */
import { postFamilyMessage, loadFamilyThread } from "@/lib/parent/messages";
import { sessionsFor, type Child } from "@/lib/parent/server";
import { untypedAdmin } from "@/lib/school/db";
import type { AssistantClient } from "./claude";
import {
  assistantEnabled,
  fallbackTriage,
  needsNewRead,
  type AssistantOutput,
  type TriageState,
} from "./model";

export interface Triage {
  parentUserId: string;
  studentUserId: string;
  state: TriageState;
  summary: string;
  asking: string;
  lastMessageId: string | null;
  model: string;
  updatedAt: string;
}

export interface Draft {
  id: string;
  kind: "reply" | "reschedule";
  instruction: string | null;
  draft: string;
  model: string;
  createdAt: string;
  status: "drafted" | "sent" | "discarded";
  sentBody: string | null;
  sentAt: string | null;
  sentBy: string | null;
}

export const isAssistantOn = () => assistantEnabled(process.env);

interface TriageRow {
  parent_user_id: string;
  student_user_id: string;
  state: TriageState;
  summary: string;
  asking: string;
  last_message_id: string | null;
  model: string;
  updated_at: string;
}

const toTriage = (r: TriageRow): Triage => ({
  parentUserId: r.parent_user_id,
  studentUserId: r.student_user_id,
  state: r.state,
  summary: r.summary,
  asking: r.asking,
  lastMessageId: r.last_message_id,
  model: r.model,
  updatedAt: r.updated_at,
});

/** Every saved read, keyed "parent:student". */
export async function loadTriage(): Promise<Map<string, Triage>> {
  const { data, error } = await untypedAdmin().from("family_message_triage").select("*");
  if (error) return new Map();
  return new Map(
    ((data ?? []) as TriageRow[]).map((r) => [
      `${r.parent_user_id}:${r.student_user_id}`,
      toTriage(r),
    ])
  );
}

async function triageFor(parentUserId: string, studentUserId: string): Promise<Triage | null> {
  const { data } = await untypedAdmin()
    .from("family_message_triage")
    .select("*")
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentUserId)
    .maybeSingle();
  return data ? toTriage(data as TriageRow) : null;
}

/** The family's drafts, newest first: the record of what was suggested and what was sent. */
export async function loadDrafts(parentUserId: string, studentUserId: string): Promise<Draft[]> {
  const { data, error } = await untypedAdmin()
    .from("family_message_drafts")
    .select(
      "id, kind, instruction, draft, model, created_at, status, sent_body, sent_at, sender:users!family_message_drafts_sent_by_user_id_fkey (first_name)"
    )
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentUserId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return [];
  type One<T> = T | T[] | null;
  return (
    (data ?? []) as {
      id: string;
      kind: "reply" | "reschedule";
      instruction: string | null;
      draft: string;
      model: string;
      created_at: string;
      status: Draft["status"];
      sent_body: string | null;
      sent_at: string | null;
      sender: One<{ first_name: string | null }>;
    }[]
  ).map((d) => ({
    id: d.id,
    kind: d.kind,
    instruction: d.instruction,
    draft: d.draft,
    model: d.model,
    createdAt: d.created_at,
    status: d.status,
    sentBody: d.sent_body,
    sentAt: d.sent_at,
    sentBy: (Array.isArray(d.sender) ? d.sender[0] : d.sender)?.first_name ?? null,
  }));
}

async function familyPeople(parentUserId: string, studentUserId: string) {
  const { data } = await untypedAdmin()
    .from("users")
    .select("id, clerk_id, first_name, last_name, email")
    .in("id", [parentUserId, studentUserId]);
  const rows = (data ?? []) as {
    id: string;
    clerk_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }[];
  const parent = rows.find((r) => r.id === parentUserId) ?? null;
  const s = rows.find((r) => r.id === studentUserId) ?? null;
  const student: Child | null = s
    ? {
        id: s.id,
        clerkId: s.clerk_id,
        firstName: s.first_name || "your student",
        name: [s.first_name, s.last_name].filter(Boolean).join(" ") || "Student",
      }
    : null;
  return { parentFirstName: parent?.first_name ?? null, student };
}

export interface ReadOptions {
  client: AssistantClient | null;
  /** Read again even when nothing new arrived (a staff member pressed Refresh or Redraft). */
  force?: boolean;
  instruction?: string | null;
  requestedByUserId?: string | null;
  senderFirstName?: string | null;
  now?: Date;
}

/**
 * Reads one family's conversation when something new arrived (or when forced), saves where it
 * stands and logs any draft. With no client, saves the plain read (open or not) and no draft.
 */
export async function readFamily(
  parentUserId: string,
  studentUserId: string,
  opts: ReadOptions
): Promise<{ triage: Triage | null; draftId: string | null }> {
  const supabase = untypedAdmin();
  const [thread, saved] = await Promise.all([
    loadFamilyThread(parentUserId, studentUserId, supabase),
    triageFor(parentUserId, studentUserId),
  ]);
  if (!thread.length) return { triage: saved, draftId: null };
  if (!opts.force && !opts.instruction && saved && !needsNewRead(thread, saved.lastMessageId))
    return { triage: saved, draftId: null };

  const now = opts.now ?? new Date();
  let output: AssistantOutput = fallbackTriage(thread);
  let model = "none";
  if (opts.client) {
    const { parentFirstName, student } = await familyPeople(parentUserId, studentUserId);
    const upcoming = student
      ? (await sessionsFor(supabase, student, now).catch(() => ({ upcoming: [] }))).upcoming
      : [];
    const answer = await opts.client.read({
      today: now.toISOString().slice(0, 10),
      parentFirstName,
      studentFirstName: student?.firstName ?? "the student",
      senderFirstName: opts.senderFirstName ?? null,
      upcoming: upcoming.map((s) => ({ kind: s.kind, startsAt: s.startsAt, with: s.with })),
      thread,
      instruction: opts.instruction ?? null,
    });
    if (answer) ({ output, model } = answer);
  }

  const newest = thread[thread.length - 1];
  const row = {
    parent_user_id: parentUserId,
    student_user_id: studentUserId,
    state: output.state,
    summary: output.summary,
    asking: output.asking,
    last_message_id: newest.id,
    model,
    updated_at: now.toISOString(),
  };
  const { error } = await supabase
    .from("family_message_triage")
    .upsert(row, { onConflict: "parent_user_id,student_user_id" });
  if (error) throw error;

  let draftId: string | null = null;
  if (output.draft.trim()) {
    const { data, error: draftError } = await supabase
      .from("family_message_drafts")
      .insert({
        parent_user_id: parentUserId,
        student_user_id: studentUserId,
        kind: output.draft_kind,
        instruction: opts.instruction?.trim() || null,
        draft: output.draft.trim(),
        model,
        requested_by_user_id: opts.requestedByUserId ?? null,
      })
      .select("id")
      .single();
    if (draftError) throw draftError;
    draftId = (data as { id: string }).id;
  }
  return { triage: toTriage(row), draftId };
}

/**
 * A staff member sends a reply. With a draft, the draft is marked sent with the words actually
 * sent (they may have edited it). The family's open messages count as answered.
 */
export async function sendStaffReply(input: {
  parentUserId: string;
  studentUserId: string;
  staffUserId: string;
  body: string;
  draftId?: string | null;
}): Promise<string> {
  const supabase = untypedAdmin();
  if (input.draftId) {
    const { data } = await supabase
      .from("family_message_drafts")
      .select("id, status")
      .eq("id", input.draftId)
      .eq("parent_user_id", input.parentUserId)
      .eq("student_user_id", input.studentUserId)
      .maybeSingle();
    if (!data || (data as { status: string }).status !== "drafted")
      throw new Error("That draft was already sent or put away.");
  }
  const messageId = await postFamilyMessage({
    parentUserId: input.parentUserId,
    studentUserId: input.studentUserId,
    authorUserId: input.staffUserId,
    authorRole: "staff",
    kind: "message",
    body: input.body,
  });
  const now = new Date().toISOString();
  await supabase
    .from("family_messages")
    .update({ status: "handled", handled_at: now })
    .eq("parent_user_id", input.parentUserId)
    .eq("student_user_id", input.studentUserId)
    .eq("status", "open");
  if (input.draftId) {
    await supabase
      .from("family_message_drafts")
      .update({
        status: "sent",
        sent_body: input.body,
        sent_message_id: messageId,
        sent_by_user_id: input.staffUserId,
        sent_at: now,
      })
      .eq("id", input.draftId);
  }
  // Older drafts for this family are out of date once someone has answered.
  await supabase
    .from("family_message_drafts")
    .update({ status: "discarded" })
    .eq("parent_user_id", input.parentUserId)
    .eq("student_user_id", input.studentUserId)
    .eq("status", "drafted");
  await supabase
    .from("family_message_triage")
    .update({
      state: "handled",
      last_message_id: messageId,
      updated_at: now,
    })
    .eq("parent_user_id", input.parentUserId)
    .eq("student_user_id", input.studentUserId);
  return messageId;
}

export async function discardDraft(draftId: string, parentUserId: string, studentUserId: string) {
  const { error } = await untypedAdmin()
    .from("family_message_drafts")
    .update({ status: "discarded" })
    .eq("id", draftId)
    .eq("parent_user_id", parentUserId)
    .eq("student_user_id", studentUserId)
    .eq("status", "drafted");
  if (error) throw error;
}

/**
 * The assistant's sweep, run by the cron: every family with a message newer than its last read,
 * oldest waiting first, at most `limit` per run. Nothing is sent; drafts wait for a person.
 */
export async function sweepFamilies(client: AssistantClient | null, limit = 15) {
  const supabase = untypedAdmin();
  const [{ data, error }, triage] = await Promise.all([
    supabase
      .from("family_messages")
      .select("id, parent_user_id, student_user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(2000),
    loadTriage(),
  ]);
  if (error) return { read: 0, skipped: 0 };
  const newest = new Map<string, { id: string; p: string; s: string; at: string }>();
  for (const r of (data ?? []) as {
    id: string;
    parent_user_id: string;
    student_user_id: string;
    created_at: string;
  }[]) {
    const key = `${r.parent_user_id}:${r.student_user_id}`;
    if (!newest.has(key))
      newest.set(key, { id: r.id, p: r.parent_user_id, s: r.student_user_id, at: r.created_at });
  }
  const due = [...newest.entries()]
    .filter(([key, n]) => triage.get(key)?.lastMessageId !== n.id)
    .sort((a, b) => a[1].at.localeCompare(b[1].at))
    .slice(0, limit);
  let read = 0;
  for (const [, n] of due) {
    try {
      await readFamily(n.p, n.s, { client });
      read++;
    } catch (e) {
      console.error("[assistant] sweep read failed", e instanceof Error ? e.message : e);
    }
  }
  return { read, skipped: newest.size - due.length };
}
