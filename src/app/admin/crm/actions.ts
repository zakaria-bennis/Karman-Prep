"use server";

// ============================================================
// The CRM's writes: stage by hand, owner, notes, follow-ups and
// tags. Admin only (requireAdmin reads the real role from the
// database), every input through Zod, service-role writes to the
// crm_* tables only. Nothing here touches Stripe, accounts or
// plans.
// ============================================================

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { AdminRequiredError, requireAdmin, type AdminUser } from "@/lib/auth/admin-guard";
import { adminDb } from "@/lib/admin/plans";
import {
  addNoteInput,
  addTaskInput,
  deleteNoteInput,
  setOwnerInput,
  setStageInput,
  setTaskDoneInput,
  tagInput,
} from "./schemas";

export type CrmResult = { ok: true } | { ok: false; error: string };

async function run<S extends z.ZodType>(
  schema: S,
  input: unknown,
  work: (v: z.output<S>, admin: AdminUser) => Promise<void>
): Promise<CrmResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  let admin: AdminUser;
  try {
    admin = await requireAdmin();
  } catch (err) {
    if (err instanceof AdminRequiredError) return { ok: false, error: "Admins only." };
    throw err;
  }
  try {
    await work(parsed.data, admin);
  } catch (err) {
    console.error("[crm] write failed:", err instanceof Error ? err.message : err);
    return { ok: false, error: "Couldn't save. Try again." };
  }
  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/[id]", "page");
  return { ok: true };
}

/** Makes sure the contact has its crm_contacts row (notes, tasks and tags hang off it). */
async function ensureContact(key: string): Promise<void> {
  const { error } = await adminDb()
    .from("crm_contacts")
    .upsert({ contact_key: key }, { onConflict: "contact_key", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

function check(res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(res.error.message);
}

export async function crmSetStage(input: z.input<typeof setStageInput>): Promise<CrmResult> {
  return run(setStageInput, input, async ({ key, stage }, admin) => {
    await ensureContact(key);
    check(
      await adminDb()
        .from("crm_contacts")
        .update({
          stage_override: stage,
          stage_set_at: stage ? new Date().toISOString() : null,
          updated_by: admin.userId,
          updated_at: new Date().toISOString(),
        })
        .eq("contact_key", key)
    );
  });
}

export async function crmSetOwner(input: z.input<typeof setOwnerInput>): Promise<CrmResult> {
  return run(setOwnerInput, input, async ({ key, ownerUserId }, admin) => {
    if (ownerUserId) {
      const { data } = await adminDb()
        .from("users")
        .select("id")
        .eq("id", ownerUserId)
        .eq("role", "admin")
        .maybeSingle();
      if (!data) throw new Error("owner is not an admin");
    }
    await ensureContact(key);
    check(
      await adminDb()
        .from("crm_contacts")
        .update({
          owner_user_id: ownerUserId,
          updated_by: admin.userId,
          updated_at: new Date().toISOString(),
        })
        .eq("contact_key", key)
    );
  });
}

export async function crmAddNote(input: z.input<typeof addNoteInput>): Promise<CrmResult> {
  return run(addNoteInput, input, async ({ key, body }, admin) => {
    await ensureContact(key);
    check(
      await adminDb()
        .from("crm_notes")
        .insert({ contact_key: key, body, author_user_id: admin.userId })
    );
  });
}

export async function crmDeleteNote(input: z.input<typeof deleteNoteInput>): Promise<CrmResult> {
  return run(deleteNoteInput, input, async ({ key, id }) => {
    check(await adminDb().from("crm_notes").delete().eq("id", id).eq("contact_key", key));
  });
}

export async function crmAddTask(input: z.input<typeof addTaskInput>): Promise<CrmResult> {
  return run(addTaskInput, input, async ({ key, title, dueOn }, admin) => {
    await ensureContact(key);
    check(
      await adminDb()
        .from("crm_tasks")
        .insert({ contact_key: key, title, due_on: dueOn, created_by: admin.userId })
    );
  });
}

export async function crmSetTaskDone(input: z.input<typeof setTaskDoneInput>): Promise<CrmResult> {
  return run(setTaskDoneInput, input, async ({ key, id, done }) => {
    check(
      await adminDb()
        .from("crm_tasks")
        .update({ done_at: done ? new Date().toISOString() : null })
        .eq("id", id)
        .eq("contact_key", key)
    );
  });
}

export async function crmAddTag(input: z.input<typeof tagInput>): Promise<CrmResult> {
  return run(tagInput, input, async ({ key, tag }) => {
    await ensureContact(key);
    check(
      await adminDb()
        .from("crm_tags")
        .upsert(
          { contact_key: key, tag },
          { onConflict: "contact_key,tag", ignoreDuplicates: true }
        )
    );
  });
}

export async function crmRemoveTag(input: z.input<typeof tagInput>): Promise<CrmResult> {
  return run(tagInput, input, async ({ key, tag }) => {
    check(await adminDb().from("crm_tags").delete().eq("contact_key", key).eq("tag", tag));
  });
}
