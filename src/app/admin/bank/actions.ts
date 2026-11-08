"use server";

// ============================================================
// Server actions: flags for the question import team (admin only).
// Each action Zod-validates its input, checks the admin role on
// the server, and writes ONLY to question_import_flags. The
// question bank tables are read, never written.
// ============================================================

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AdminRequiredError, requireAdmin } from "@/lib/auth/admin-guard";
import { flagInputSchema, resolveFlagInputSchema } from "@/lib/admin/bank";
import { createAdminClient } from "@/lib/supabase/server";

export type FlagActionResult = { ok: true } | { ok: false; error: string };

function invalid(error: { issues: { message: string }[] }): FlagActionResult {
  return { ok: false, error: error.issues[0]?.message ?? "Check the form and try again." };
}

function failed(err: unknown, fallback: string): FlagActionResult {
  if (err instanceof AdminRequiredError) return { ok: false, error: "Only admins can do this." };
  console.error("[admin/bank]", err);
  return { ok: false, error: fallback };
}

function refresh(questionId: string) {
  revalidatePath("/admin/bank");
  revalidatePath(`/admin/bank/${questionId}`);
}

export async function flagQuestion(input: unknown): Promise<FlagActionResult> {
  const v = flagInputSchema.safeParse(input);
  if (!v.success) return invalid(v.error);
  const { questionId, reason, note } = v.data;
  try {
    const admin = await requireAdmin();
    const db = createAdminClient() as unknown as SupabaseClient;
    // There is no foreign key, so check the question exists (a read).
    const { data: question, error: readError } = await db
      .from("quiz_questions")
      .select("id")
      .eq("id", questionId)
      .maybeSingle();
    if (readError) throw readError;
    if (!question) return { ok: false, error: "That question is not in the bank." };
    const { error } = await db
      .from("question_import_flags")
      .insert({ question_id: questionId, reason, note, flagged_by: admin.userId });
    if (error?.code === "23505") {
      return { ok: false, error: "Already flagged for that reason. The import team has it." };
    }
    if (error) throw error;
  } catch (err) {
    return failed(err, "The flag was not saved. Try again.");
  }
  refresh(questionId);
  return { ok: true };
}

export async function resolveFlag(input: unknown): Promise<FlagActionResult> {
  const v = resolveFlagInputSchema.safeParse(input);
  if (!v.success) return invalid(v.error);
  const { flagId, questionId } = v.data;
  try {
    await requireAdmin();
    const db = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await db
      .from("question_import_flags")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", flagId)
      .eq("question_id", questionId)
      .eq("status", "open")
      .select("id");
    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) {
      return { ok: false, error: "That flag is already resolved." };
    }
  } catch (err) {
    return failed(err, "The flag was not updated. Try again.");
  }
  refresh(questionId);
  return { ok: true };
}
