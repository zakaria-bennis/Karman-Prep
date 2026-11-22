"use server";

// Server actions for generated questions (admin only, never students; founder, 2026-11-22 round 2).
// Each validates its input with Zod and checks the admin role on the server first.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AdminRequiredError, requireAdmin } from "@/lib/auth/admin-guard";
import { generatedAmong, reportGeneratedQuestion } from "@/lib/generator/admin";
import { setGeneratedHidden } from "@/lib/generator/switch";

export type GeneratedActionResult = { ok: true } | { ok: false; error: string };

const fail = (err: unknown, fallback: string): GeneratedActionResult => {
  if (err instanceof AdminRequiredError) return { ok: false, error: "Only admins can do this." };
  console.error("[admin/generated]", err);
  return { ok: false, error: err instanceof Error ? err.message : fallback };
};

const reportSchema = z.object({
  questionId: z.string().uuid(),
  reason: z.string().trim().min(1, "Say what is wrong").max(500),
});

/** Report a bad generated question: it leaves every pool at once. */
export async function reportGenerated(input: unknown): Promise<GeneratedActionResult> {
  const v = reportSchema.safeParse(input);
  if (!v.success) return { ok: false, error: v.error.issues[0]?.message ?? "Check the form." };
  try {
    const admin = await requireAdmin();
    await reportGeneratedQuestion(v.data.questionId, v.data.reason, admin.clerkId);
    revalidatePath("/admin/generated");
    return { ok: true };
  } catch (err) {
    return fail(err, "The report could not be saved.");
  }
}

const switchSchema = z.object({ hidden: z.boolean() });

/** The sitewide switch: hide (or show again) every generated question. */
export async function setHideGenerated(input: unknown): Promise<GeneratedActionResult> {
  const v = switchSchema.safeParse(input);
  if (!v.success) return { ok: false, error: "Check the switch." };
  try {
    const admin = await requireAdmin();
    await setGeneratedHidden(v.data.hidden, admin.clerkId);
    revalidatePath("/admin/generated");
    return { ok: true };
  } catch (err) {
    return fail(err, "The switch could not be saved.");
  }
}

const marksSchema = z.object({ questionIds: z.array(z.string().uuid()).max(500) });

/** Which of these questions are generated, for the "Generated" mark; empty for anyone but an admin. */
export async function generatedMarks(input: unknown): Promise<string[]> {
  const v = marksSchema.safeParse(input);
  if (!v.success) return [];
  return generatedAmong(v.data.questionIds);
}
