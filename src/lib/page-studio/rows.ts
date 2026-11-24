// The Page Studio's notes as stored (supabase/migrations/20261124230000_page_studio.sql), shared by
// the studio's server code and the `npm run studio` command that Claude runs. Both pass in their own
// service-role client; nothing here reads keys.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NoteStatus } from "./schemas";
import type { StudioMessage, StudioNote } from "./types";

export const NOTE_COLUMNS =
  "id, created_at, page_key, page_path, persona, viewport, kind, category, selector, element_label, element_text, old_text, new_text, body, status, pr_url, sent_at";

export type NoteRow = {
  id: string;
  created_at: string;
  page_key: string;
  page_path: string;
  persona: string;
  viewport: string;
  kind: StudioNote["kind"];
  category: StudioNote["category"];
  selector: string;
  element_label: string;
  element_text: string;
  old_text: string | null;
  new_text: string | null;
  body: string;
  status: NoteStatus;
  pr_url: string | null;
  sent_at: string | null;
};

type MessageRow = {
  id: string;
  note_id: string;
  author: StudioMessage["author"];
  body: string;
  created_at: string;
};

export function toNote(r: NoteRow, messages: StudioMessage[]): StudioNote {
  return {
    id: r.id,
    createdAt: r.created_at,
    pageKey: r.page_key,
    pagePath: r.page_path,
    persona: r.persona,
    viewport: r.viewport,
    kind: r.kind,
    category: r.category,
    selector: r.selector,
    elementLabel: r.element_label,
    elementText: r.element_text,
    oldText: r.old_text,
    newText: r.new_text,
    body: r.body,
    status: r.status,
    prUrl: r.pr_url,
    sentAt: r.sent_at,
    messages,
  };
}

/** Notes (oldest first) with their messages. Dropped notes are left out unless asked for. */
export async function readNotes(
  db: SupabaseClient,
  opts: { statuses?: NoteStatus[]; ids?: string[] } = {}
): Promise<StudioNote[]> {
  let q = db
    .from("page_review_notes")
    .select(NOTE_COLUMNS)
    .order("created_at", { ascending: true });
  if (opts.statuses) q = q.in("status", opts.statuses);
  else q = q.neq("status", "dismissed");
  if (opts.ids) q = q.in("id", opts.ids);
  const { data, error } = await q.limit(2000);
  if (error) throw new Error(`notes read failed: ${error.message}`);
  const rows = (data ?? []) as NoteRow[];
  if (!rows.length) return [];
  const { data: msgs, error: mErr } = await db
    .from("page_review_messages")
    .select("id, note_id, author, body, created_at")
    .in(
      "note_id",
      rows.map((r) => r.id)
    )
    .order("created_at", { ascending: true });
  if (mErr) throw new Error(`messages read failed: ${mErr.message}`);
  const byNote = new Map<string, StudioMessage[]>();
  for (const m of (msgs ?? []) as MessageRow[]) {
    const list = byNote.get(m.note_id) ?? [];
    list.push({ id: m.id, author: m.author, body: m.body, createdAt: m.created_at });
    byNote.set(m.note_id, list);
  }
  return rows.map((r) => toNote(r, byNote.get(r.id) ?? []));
}

/** Changes the given notes (only those in `onlyStatuses`, when given) and returns the ids changed. */
export async function updateNotes(
  db: SupabaseClient,
  ids: string[],
  patch: Record<string, unknown>,
  onlyStatuses?: NoteStatus[]
): Promise<string[]> {
  let q = db
    .from("page_review_notes")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .in("id", ids);
  if (onlyStatuses) q = q.in("status", onlyStatuses);
  const { data, error } = await q.select("id");
  if (error) throw new Error(`note update failed: ${error.message}`);
  return ((data ?? []) as { id: string }[]).map((r) => r.id);
}

export async function insertMessage(
  db: SupabaseClient,
  noteId: string,
  author: StudioMessage["author"],
  body: string
): Promise<void> {
  const { error } = await db.from("page_review_messages").insert({ note_id: noteId, author, body });
  if (error) throw new Error(`message save failed: ${error.message}`);
}
