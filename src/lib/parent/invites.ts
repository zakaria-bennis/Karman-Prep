import "server-only";
/*
 * Parent invites (founder, 2026-11-07: the student's account menu has "Invite a parent"; and
 * 2026-11-08: parents have their own account and link to their child). The student makes a
 * link and a short code. The parent opens the link, or types the code in the parent portal,
 * and is linked. Both last 14 days and work once. Making a new one retires the old one.
 * Turning a new account into a parent account is src/lib/parent/account.ts.
 */
import { untypedAdmin, type UntypedAdmin } from "@/lib/school/db";
import { JOIN_CODE_ALPHABET } from "@/lib/school/terms";

export const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,64}$/;
export const LINK_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

export function newInviteToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/** Eight characters without look-alikes, shown as two groups of four ("K7Q2-MP4X"). */
export function newLinkCode(random: (n: number) => Uint8Array = randomBytes): string {
  let code = "";
  for (const b of random(8)) code += JOIN_CODE_ALPHABET[b % JOIN_CODE_ALPHABET.length];
  return code;
}

function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** Typed by hand: accept lower case, spaces and dashes. */
export function normalizeLinkCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, "");
}

export function formatLinkCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export interface OpenInvite {
  token: string;
  code: string;
  expiresAt: string;
}

type Admin = UntypedAdmin;

export async function currentInvite(
  studentUserId: string,
  supabase: Admin = untypedAdmin()
): Promise<OpenInvite | null> {
  const { data, error } = await supabase
    .from("parent_invites")
    .select("token, code, expires_at")
    .eq("student_user_id", studentUserId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { token: data.token, code: data.code, expiresAt: data.expires_at } : null;
}

export async function createInvite(
  studentUserId: string,
  supabase: Admin = untypedAdmin()
): Promise<OpenInvite> {
  const now = new Date().toISOString();
  const { error: revokeError } = await supabase
    .from("parent_invites")
    .update({ revoked_at: now })
    .eq("student_user_id", studentUserId)
    .is("accepted_at", null)
    .is("revoked_at", null);
  if (revokeError) throw revokeError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("parent_invites")
      .insert({ student_user_id: studentUserId, token: newInviteToken(), code: newLinkCode() })
      .select("token, code, expires_at")
      .single();
    if (!error) return { token: data.token, code: data.code, expiresAt: data.expires_at };
    if (error.code !== "23505") throw error;
  }
  throw new Error("Could not make a free link code.");
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

export type InviteKey = { token: string } | { code: string };

export type InviteLookup =
  | { state: "open"; inviteId: string; student: { id: string; firstName: string } }
  | { state: "used" | "expired" | "missing" };

export async function lookupInvite(
  key: InviteKey,
  supabase: Admin = untypedAdmin()
): Promise<InviteLookup> {
  const byToken = "token" in key;
  const value = byToken ? key.token : normalizeLinkCode(key.code);
  if (!(byToken ? INVITE_TOKEN_PATTERN : LINK_CODE_PATTERN).test(value))
    return { state: "missing" };
  const { data } = await supabase
    .from("parent_invites")
    .select(
      "id, accepted_at, revoked_at, expires_at, student:users!parent_invites_student_user_id_fkey (id, first_name)"
    )
    .eq(byToken ? "token" : "code", value)
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
  | { ok: false; reason: "invite" | "self" };

/** Links a parent account to the student and spends the invite. Idempotent for that parent. */
export async function acceptInvite(
  key: InviteKey,
  parentUserId: string,
  supabase: Admin = untypedAdmin()
): Promise<AcceptResult> {
  const invite = await lookupInvite(key, supabase);
  if (invite.state !== "open") return { ok: false, reason: "invite" };
  if (invite.student.id === parentUserId) return { ok: false, reason: "self" };
  const { data: spent, error: spendError } = await supabase
    .from("parent_invites")
    .update({ accepted_at: new Date().toISOString(), accepted_by_user_id: parentUserId })
    .eq("id", invite.inviteId)
    .is("accepted_at", null)
    .select("id");
  if (spendError) throw spendError;
  if (!spent?.length) return { ok: false, reason: "invite" };
  const { error } = await supabase
    .from("parent_student_links")
    .upsert(
      { parent_user_id: parentUserId, student_user_id: invite.student.id },
      { onConflict: "parent_user_id,student_user_id", ignoreDuplicates: true }
    );
  if (error) throw error;
  return { ok: true, studentId: invite.student.id };
}
