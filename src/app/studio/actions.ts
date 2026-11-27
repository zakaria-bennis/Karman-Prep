"use server";

// Page Studio actions (/studio). Every one checks the caller's REAL role is admin first. Notes and
// copy edits only ever land in the studio's own tables: the live site changes only when Claude's
// pull request is merged by the founder.
import { AdminRequiredError, requireAdmin, type AdminUser } from "@/lib/auth/admin-guard";
import { clearViewAs, setViewAs, type ViewAsRole } from "@/lib/admin/impersonation-cookies";
import { digest } from "@/lib/page-studio/digest";
import {
  founderStatusSchema,
  markSchema,
  newNoteSchema,
  noteIdSchema,
  replySchema,
  sendNotesSchema,
  updateNoteSchema,
  viewAsSchema,
} from "@/lib/page-studio/schemas";
import {
  accountName,
  addMessage,
  deleteNote,
  insertNote,
  listMarks,
  listNotes,
  noteStatus,
  patchNotes,
  setMark,
} from "@/lib/page-studio/store";
import type { PageMark, StudioNote } from "@/lib/page-studio/types";

type Fail = { ok: false; error: string };
type Result<T> = ({ ok: true } & T) | Fail;

/** A refusal whose words are shown to the founder as they are. */
class Refusal extends Error {}

async function run<T>(what: string, fn: (admin: AdminUser) => Promise<T>): Promise<Result<T>> {
  try {
    const admin = await requireAdmin();
    return { ok: true, ...(await fn(admin)) };
  } catch (e) {
    if (e instanceof AdminRequiredError)
      return { ok: false, error: "Only an admin can use the studio." };
    if (e instanceof Refusal) return { ok: false, error: e.message };
    console.error(`[studio] ${what} failed:`, e instanceof Error ? e.message : e);
    return { ok: false, error: "That didn't save. Try again in a moment." };
  }
}

const bad = (error: string): Fail => ({ ok: false, error });

/** Everything the studio shows: notes (not dropped) and page marks. */
export async function actionStudioState(): Promise<
  Result<{ notes: StudioNote[]; marks: Record<string, PageMark> }>
> {
  return run("state", async () => {
    const [notes, marks] = await Promise.all([listNotes(), listMarks()]);
    return { notes, marks };
  });
}

export async function actionSaveNote(input: unknown): Promise<Result<{ note: StudioNote }>> {
  const parsed = newNoteSchema.safeParse(input);
  if (!parsed.success)
    return bad(parsed.error.issues[0]?.message ?? "Check the note and try again.");
  const n = parsed.data;
  return run("save note", async (admin) => {
    const note = await insertNote({
      author_id: admin.userId,
      page_key: n.pageKey,
      page_path: n.pagePath,
      persona: n.persona,
      viewport: n.viewport,
      kind: n.kind,
      category: n.kind === "copy" ? "copy" : n.category,
      selector: n.selector,
      element_label: n.elementLabel,
      element_text: n.elementText,
      element_html: n.elementHtml,
      old_text: n.oldText,
      new_text: n.newText,
      body: n.body,
    });
    return { note };
  });
}

/** Change a note's words or kind while Claude hasn't started on it. */
export async function actionUpdateNote(input: unknown): Promise<Result<{ updated: boolean }>> {
  const parsed = updateNoteSchema.safeParse(input);
  if (!parsed.success) return bad("Check the note and try again.");
  const { id, body, newText, category } = parsed.data;
  return run("update note", async () => {
    const patch: Record<string, unknown> = {};
    if (body !== undefined) patch.body = body;
    if (newText !== undefined) patch.new_text = newText;
    if (category !== undefined) patch.category = category;
    const done = await patchNotes([id], patch, ["draft", "sent", "question"]);
    return { updated: done.length > 0 };
  });
}

/** A draft is deleted; a note Claude has seen is dropped instead, so the record stays. */
export async function actionDeleteNote(input: unknown): Promise<Result<{ deleted: boolean }>> {
  const parsed = noteIdSchema.safeParse(input);
  if (!parsed.success) return bad("Try that again.");
  return run("delete note", async () => {
    const status = await noteStatus(parsed.data.id);
    if (status === "draft") await deleteNote(parsed.data.id);
    else await patchNotes([parsed.data.id], { status: "dismissed" });
    return { deleted: true };
  });
}

/** Send drafts to Claude. Returns the brief, for the copy button. */
export async function actionSendNotes(
  input: unknown
): Promise<Result<{ sent: number; brief: string }>> {
  const parsed = sendNotesSchema.safeParse(input);
  if (!parsed.success) return bad("Try that again.");
  return run("send notes", async () => {
    const drafts = await listNotes({ statuses: ["draft"], ids: parsed.data.ids });
    const ids = drafts.map((n) => n.id);
    if (ids.length)
      await patchNotes(ids, { status: "sent", sent_at: new Date().toISOString() }, ["draft"]);
    const open = await listNotes({ statuses: ["sent", "question", "working"] });
    return { sent: ids.length, brief: digest(open) };
  });
}

/** The brief of every open note (not sent yet included), to paste into a chat with Claude. */
export async function actionBrief(): Promise<Result<{ brief: string }>> {
  return run("brief", async () => ({
    brief: digest(await listNotes({ statuses: ["draft", "sent", "question", "working"] })),
  }));
}

/** The founder answers Claude's question; the note goes back to Claude. */
export async function actionReply(input: unknown): Promise<Result<{ replied: boolean }>> {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return bad("Write your answer first.");
  return run("reply", async () => {
    await addMessage(parsed.data.id, "founder", parsed.data.body);
    await patchNotes([parsed.data.id], { status: "sent" }, ["question"]);
    return { replied: true };
  });
}

export async function actionSetNoteStatus(input: unknown): Promise<Result<{ updated: boolean }>> {
  const parsed = founderStatusSchema.safeParse(input);
  if (!parsed.success) return bad("Try that again.");
  return run("note status", async () => {
    const patch: Record<string, unknown> = { status: parsed.data.status };
    if (parsed.data.status === "sent") patch.sent_at = new Date().toISOString();
    const done = await patchNotes([parsed.data.id], patch);
    return { updated: done.length > 0 };
  });
}

export async function actionMarkPage(input: unknown): Promise<Result<{ mark: PageMark | null }>> {
  const parsed = markSchema.safeParse(input);
  if (!parsed.success) return bad("Try that again.");
  return run("mark page", async () => {
    await setMark(parsed.data.pageKey, parsed.data.mark);
    return { mark: parsed.data.mark };
  });
}

/** Who the frame shows the site as: yourself, a role, or one account (never another admin). */
export async function actionViewAs(
  input: unknown
): Promise<Result<{ role: string | null; name: string | null }>> {
  const parsed = viewAsSchema.safeParse(input);
  if (!parsed.success) return bad("Pick someone to view as.");
  const v = parsed.data;
  return run("view as", async () => {
    if (v.mode === "self") {
      await clearViewAs();
      return { role: null, name: null };
    }
    if (v.mode === "role") {
      await setViewAs(v.role, null);
      return { role: v.role, name: null };
    }
    const who = await accountName(v.userId);
    if (!who) throw new Refusal("That account wasn't found.");
    if (who.role === "admin") throw new Refusal("The studio can't view the site as another admin.");
    await setViewAs(who.role as ViewAsRole, v.userId);
    return { role: who.role, name: who.name };
  });
}
