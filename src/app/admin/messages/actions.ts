"use server";

// ============================================================
// The team inbox's writes (founder, 2026-11-12): reply to a
// family, mark their messages handled, and ask the assistant to
// read again or redraft. Admin only. Only "Send" posts a message,
// and only a person presses it: the assistant drafts, never sends.
// ============================================================

import { redirect } from "next/navigation";
import { z } from "zod";
import { AdminRequiredError, requireAdmin, type AdminUser } from "@/lib/auth/admin-guard";
import { claudeAssistant } from "@/lib/message-assistant/claude";
import {
  discardDraft,
  isAssistantOn,
  readFamily,
  sendStaffReply,
} from "@/lib/message-assistant/server";
import { isLinkedFamily, markFamilyHandled } from "@/lib/parent/messages";
import { untypedAdmin } from "@/lib/school/db";

const family = z.object({
  parentId: z.string().uuid(),
  studentId: z.string().uuid(),
});

const pageFor = (parentId: string, studentId: string) =>
  /^[0-9a-f-]{36}$/i.test(parentId) && /^[0-9a-f-]{36}$/i.test(studentId)
    ? `/admin/messages/${parentId}/${studentId}`
    : "/admin/messages";

function back(path: string, key: "done" | "error", message: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

async function admin(path: string): Promise<AdminUser> {
  try {
    return await requireAdmin();
  } catch (err) {
    if (err instanceof AdminRequiredError) back(path, "error", "Admins only.");
    throw err;
  }
}

async function firstName(userId: string): Promise<string | null> {
  const { data } = await untypedAdmin()
    .from("users")
    .select("first_name")
    .eq("id", userId)
    .maybeSingle();
  return (data as { first_name: string | null } | null)?.first_name ?? null;
}

const replySchema = family.extend({
  body: z
    .string()
    .transform((s) => s.replace(/\r\n/g, "\n").trim())
    .pipe(z.string().min(1, "Write the reply first.").max(4000, "Keep it under 4,000 characters.")),
  draftId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

/** A person sends a reply, written by them or edited from the assistant's draft. */
export async function sendReplyAction(formData: FormData) {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const page = pageFor(String(raw.parentId ?? ""), String(raw.studentId ?? ""));
  const me = await admin(page);
  const parsed = replySchema.safeParse(raw);
  if (!parsed.success) back(page, "error", parsed.error.issues[0]?.message ?? "Check the reply.");
  const { parentId, studentId, body, draftId } = parsed.data;
  if (!(await isLinkedFamily(parentId, studentId)))
    back(page, "error", "That family isn't linked.");
  try {
    await sendStaffReply({
      parentUserId: parentId,
      studentUserId: studentId,
      staffUserId: me.userId,
      body,
      draftId: draftId ?? null,
    });
  } catch (error) {
    console.error("[admin] reply failed", error instanceof Error ? error.message : error);
    back(page, "error", error instanceof Error ? error.message : "That didn't send. Try again.");
  }
  back(page, "done", "Sent. The family sees it in Messages.");
}

export async function markHandledAction(formData: FormData) {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const page = pageFor(String(raw.parentId ?? ""), String(raw.studentId ?? ""));
  await admin(page);
  const parsed = family.safeParse(raw);
  if (!parsed.success) back("/admin/messages", "error", "Unknown family.");
  try {
    await markFamilyHandled(parsed.data.parentId, parsed.data.studentId);
  } catch (error) {
    console.error("[admin] mark handled failed", error);
    back(page, "error", "That didn't save. Try again.");
  }
  back(page, "done", "Marked handled.");
}

const redraftSchema = family.extend({
  instruction: z
    .string()
    .trim()
    .max(2000, "Keep the instruction under 2,000 characters.")
    .optional(),
});

/** Ask the assistant to read the conversation again and draft, optionally with what to say. */
export async function redraftAction(formData: FormData) {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const page = pageFor(String(raw.parentId ?? ""), String(raw.studentId ?? ""));
  const me = await admin(page);
  if (!isAssistantOn()) back(page, "error", "The assistant is switched off.");
  const parsed = redraftSchema.safeParse(raw);
  if (!parsed.success)
    back(page, "error", parsed.error.issues[0]?.message ?? "Check the instruction.");
  const { parentId, studentId, instruction } = parsed.data;
  let draftId: string | null = null;
  try {
    ({ draftId } = await readFamily(parentId, studentId, {
      client: claudeAssistant(),
      force: true,
      instruction: instruction || null,
      requestedByUserId: me.userId,
      senderFirstName: await firstName(me.userId),
    }));
  } catch (error) {
    console.error("[admin] redraft failed", error);
    back(page, "error", "The assistant couldn't read this one. Try again in a minute.");
  }
  back(
    page,
    draftId ? "done" : "error",
    draftId
      ? "New draft ready. Nothing is sent until you press Send."
      : "The assistant had no draft this time. Write the reply yourself."
  );
}

const draftSchema = family.extend({ draftId: z.string().uuid() });

export async function discardDraftAction(formData: FormData) {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const page = pageFor(String(raw.parentId ?? ""), String(raw.studentId ?? ""));
  await admin(page);
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) back(page, "error", "Unknown draft.");
  try {
    await discardDraft(parsed.data.draftId, parsed.data.parentId, parsed.data.studentId);
  } catch (error) {
    console.error("[admin] discard failed", error);
    back(page, "error", "That didn't save. Try again.");
  }
  back(page, "done", "Draft put away.");
}
