import "server-only";
/*
 * Parent invites (founder, 2026-11-07: the student's account menu has "Invite a parent").
 * The student makes a link; whoever opens it signed in as a parent is linked to the student.
 * A brand-new account that has not set up as a student becomes a parent account on accepting.
 * Links last 14 days and work once. Making a new link retires the old one.
 */
import { untypedAdmin, type UntypedAdmin } from "@/lib/school/db";

export const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,64}$/;

export function newInviteToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export interface OpenInvite {
  token: string;
  expiresAt: string;
}

type Admin = UntypedAdmin;

export async function currentInvite(studentUserId: string, supabase: Admin = untypedAdmin()) {
  const { data, error } = await supabase
    .from("parent_invites")
    .select("token, expires_at")
    .eq("student_user_id", studentUserId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data
    ? ({ token: data.token as string, expiresAt: data.expires_at as string } satisfies OpenInvite)
    : null;
}

export async function createInvite(studentUserId: string, supabase: Admin = untypedAdmin()) {
  const now = new Date().toISOString();
  const { error: revokeError } = await supabase
    .from("parent_invites")
    .update({ revoked_at: now })
    .eq("student_user_id", studentUserId)
    .is("accepted_at", null)
    .is("revoked_at", null);
  if (revokeError) throw revokeError;
  const { data, error } = await supabase
    .from("parent_invites")
    .insert({ student_user_id: studentUserId, token: newInviteToken() })
    .select("token, expires_at")
    .single();
  if (error) throw error;
  return { token: data.token as string, expiresAt: data.expires_at as string } satisfies OpenInvite;
}

export async function linkedParents(studentUserId: string, supabase: Admin = untypedAdmin()) {
  const { data, error } = await supabase
    .from("parent_student_links")
    .select("parent:users!parent_student_links_parent_user_id_fkey (first_name, last_name, email)")
    .eq("student_user_id", studentUserId);
  if (error) throw error;
  type P = { first_name: string | null; last_name: string | null; email: string | null };
  return ((data ?? []) as { parent: P | P[] | null }[]).flatMap((r) => {
    const p = Array.isArray(r.parent) ? r.parent[0] : r.parent;
    return p ? [[p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Parent"] : [];
  });
}

export type InviteLookup =
  | { state: "open"; inviteId: string; student: { id: string; firstName: string } }
  | { state: "used" | "expired" | "missing" };

export async function lookupInvite(
  token: string,
  supabase: Admin = untypedAdmin()
): Promise<InviteLookup> {
  if (!INVITE_TOKEN_PATTERN.test(token)) return { state: "missing" };
  const { data } = await supabase
    .from("parent_invites")
    .select(
      "id, accepted_at, revoked_at, expires_at, student:users!parent_invites_student_user_id_fkey (id, first_name)"
    )
    .eq("token", token)
    .maybeSingle();
  if (!data) return { state: "missing" };
  if (data.accepted_at) return { state: "used" };
  if (data.revoked_at || (data.expires_at as string) <= new Date().toISOString())
    return { state: "expired" };
  type S = { id: string; first_name: string | null };
  const raw = (data as { student: S | S[] | null }).student;
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s) return { state: "missing" };
  return {
    state: "open",
    inviteId: data.id as string,
    student: { id: s.id, firstName: s.first_name || "your student" },
  };
}

export type AcceptResult =
  | { ok: true; studentId: string }
  | { ok: false; reason: "invite" | "role" | "self" };

/** Links the parent to the student and spends the invite. Idempotent for the same parent. */
export async function acceptInvite(
  token: string,
  parent: { userId: string; role: string; onboarded: boolean },
  supabase: Admin = untypedAdmin()
): Promise<AcceptResult> {
  const invite = await lookupInvite(token, supabase);
  if (invite.state !== "open") return { ok: false, reason: "invite" };
  if (invite.student.id === parent.userId) return { ok: false, reason: "self" };
  const fresh = parent.role === "student" && !parent.onboarded;
  if (parent.role !== "parent" && !fresh) return { ok: false, reason: "role" };
  const now = new Date().toISOString();
  const { data: spent, error: spendError } = await supabase
    .from("parent_invites")
    .update({ accepted_at: now, accepted_by_user_id: parent.userId })
    .eq("id", invite.inviteId)
    .is("accepted_at", null)
    .select("id");
  if (spendError) throw spendError;
  if (!spent?.length) return { ok: false, reason: "invite" };
  if (fresh) {
    const { error } = await supabase
      .from("users")
      .update({ role: "parent" })
      .eq("id", parent.userId);
    if (error) throw error;
  }
  const { error } = await supabase
    .from("parent_student_links")
    .upsert(
      { parent_user_id: parent.userId, student_user_id: invite.student.id },
      { onConflict: "parent_user_id,student_user_id", ignoreDuplicates: true }
    );
  if (error) throw error;
  return { ok: true, studentId: invite.student.id };
}
