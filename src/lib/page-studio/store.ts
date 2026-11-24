import "server-only";

// Reading and writing the Page Studio's tables (supabase/migrations/20261124230000_page_studio.sql).
// Server only, behind the admin check in src/app/studio/actions.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import type { NoteStatus } from "./schemas";
import { NOTE_COLUMNS, insertMessage, readNotes, toNote, updateNotes, type NoteRow } from "./rows";
import type { PageMark, StudioAccount, StudioMessage, StudioNote } from "./types";

const db = () => createAdminClient() as unknown as SupabaseClient;

/** Notes (oldest first) with their messages. Dropped notes are left out unless asked for. */
export const listNotes = (
  opts: { statuses?: NoteStatus[]; ids?: string[] } = {}
): Promise<StudioNote[]> => readNotes(db(), opts);

export async function insertNote(row: Record<string, unknown>): Promise<StudioNote> {
  const { data, error } = await db()
    .from("page_review_notes")
    .insert(row)
    .select(NOTE_COLUMNS)
    .single();
  if (error) throw new Error(`note save failed: ${error.message}`);
  return toNote(data as NoteRow, []);
}

export const patchNotes = (
  ids: string[],
  patch: Record<string, unknown>,
  onlyStatuses?: NoteStatus[]
) => updateNotes(db(), ids, patch, onlyStatuses);

export async function noteStatus(id: string): Promise<NoteStatus | null> {
  const { data } = await db().from("page_review_notes").select("status").eq("id", id).maybeSingle();
  return ((data as { status?: NoteStatus } | null)?.status ?? null) as NoteStatus | null;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await db().from("page_review_notes").delete().eq("id", id);
  if (error) throw new Error(`note delete failed: ${error.message}`);
}

export const addMessage = (noteId: string, author: StudioMessage["author"], body: string) =>
  insertMessage(db(), noteId, author, body);

export async function listMarks(): Promise<Record<string, PageMark>> {
  const { data, error } = await db().from("page_review_marks").select("page_key, mark");
  if (error) throw new Error(`marks read failed: ${error.message}`);
  return Object.fromEntries(
    ((data ?? []) as { page_key: string; mark: PageMark }[]).map((r) => [r.page_key, r.mark])
  );
}

export async function setMark(pageKey: string, mark: PageMark | null): Promise<void> {
  const q = mark
    ? db()
        .from("page_review_marks")
        .upsert(
          { page_key: pageKey, mark, updated_at: new Date().toISOString() },
          { onConflict: "page_key" }
        )
    : db().from("page_review_marks").delete().eq("page_key", pageKey);
  const { error } = await q;
  if (error) throw new Error(`mark save failed: ${error.message}`);
}

const VIEWABLE = ["student", "parent", "tutor", "affiliate_tutor"] as const;

function isSample(r: { clerk_id: string; email: string | null }): boolean {
  return (
    r.clerk_id.startsWith("dev_seed") ||
    /demo|test|sample|example\.com|karman\.local/i.test(r.email ?? "")
  );
}

/** People the studio can view the site as (never admins), sample and test accounts first. */
export async function listAccounts(): Promise<StudioAccount[]> {
  const { data, error } = await db()
    .from("users")
    .select("id, clerk_id, role, first_name, last_name, email, created_at")
    .in("role", VIEWABLE as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) throw new Error(`accounts read failed: ${error.message}`);
  type Row = {
    id: string;
    clerk_id: string;
    role: StudioAccount["role"];
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  return ((data ?? []) as Row[])
    .map((r) => ({
      userId: r.id,
      role: r.role,
      name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email || "No name",
      detail: r.email ?? "",
      sample: isSample(r),
    }))
    .sort((a, b) => Number(b.sample) - Number(a.sample) || a.name.localeCompare(b.name));
}

export async function accountName(userId: string): Promise<{ name: string; role: string } | null> {
  const { data } = await db()
    .from("users")
    .select("first_name, last_name, email, role")
    .eq("id", userId)
    .maybeSingle();
  const r = data as {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    role: string;
  } | null;
  if (!r) return null;
  return {
    name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email || "No name",
    role: r.role,
  };
}
