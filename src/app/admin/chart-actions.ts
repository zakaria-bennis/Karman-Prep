"use server";

// ============================================================
// Chart review server actions (Phase 4d, Sub-PR B).
//
// Powers the /admin/questions/chart-review side-by-side review UI:
//   · actionApproveChart      — flip figure_kind='chart' for an AI
//                                 extraction the admin trusts as-is
//   · actionEditChart         — save admin-edited chart data, flip
//                                 figure_kind='chart'
//   · actionRejectChart       — clear figure_chart_data, set
//                                 figure_kind='image' (back to the
//                                 raster screenshot indefinitely)
//
// All three snapshot the question to question_history so the
// existing Restore button can roll back a bad call.
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/queries/admin";
import { z } from "zod";
import type { Database } from "@/types/supabase";
import type { ChartFigure } from "@/types/chart";

async function guardAdmin(): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  const ok = await requireRole(userId, ["admin"]);
  if (!ok) throw new Error("Admin role required");
  return userId;
}

const questionIdSchema = z.object({ questionId: z.string().min(1) });

/** Approve the AI's extraction as-is. Flip figure_kind='chart' so
 *  the student-facing renderer switches from the raster screenshot
 *  to the SVG. figure_chart_data is already populated by the
 *  extractor — we just promote it. */
export async function actionApproveChart(input: { questionId: string }): Promise<void> {
  questionIdSchema.parse(input);
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const { buildSnapshot, insertHistoryRow } = await import("@/lib/supabase/queries/quiz/history");
  const supabase = createAdminClient();

  const { data: before, error: bErr } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", input.questionId)
    .maybeSingle();
  if (bErr) throw bErr;
  if (!before) throw new Error(`Question ${input.questionId} not found`);
  if (!before.figure_chart_data) {
    throw new Error("No chart data to approve. Run extractor first.");
  }
  const beforeSnap = buildSnapshot(before as unknown as Parameters<typeof buildSnapshot>[0]);

  type QQUpdate = Database["public"]["Tables"]["quiz_questions"]["Update"];
  const { error: upErr } = await supabase
    .from("quiz_questions")
    .update({
      figure_kind: "chart",
      updated_at: new Date().toISOString(),
    } satisfies QQUpdate)
    .eq("id", input.questionId);
  if (upErr) throw upErr;

  const { data: after } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", input.questionId)
    .maybeSingle();
  if (after) {
    await insertHistoryRow({
      questionId: input.questionId,
      beforeState: beforeSnap,
      afterState: buildSnapshot(after as unknown as Parameters<typeof buildSnapshot>[0]),
      editedBy: userId,
      source: "inspector",
      note: "Approved AI chart extraction as-is",
    });
  }
  revalidatePath("/admin/questions/chart-review");
  revalidatePath(`/admin/questions/inspect/${input.questionId}`);
}

/** Save admin-edited chart data + flip figure_kind='chart'. The
 *  client validates the ChartFigure shape before calling; this
 *  action does a final defensive check on the kind discriminator
 *  and series shape. */
export async function actionEditChart(input: {
  questionId: string;
  chartData: ChartFigure;
}): Promise<void> {
  questionIdSchema.parse({ questionId: input.questionId });
  if (!input.chartData || typeof input.chartData !== "object") {
    throw new Error("chartData missing or malformed");
  }
  if (!["scatterplot", "line_graph", "bar_chart", "function_plot"].includes(input.chartData.kind)) {
    throw new Error(`Unknown chart kind: ${input.chartData.kind}`);
  }
  if (!Array.isArray(input.chartData.series) || input.chartData.series.length === 0) {
    throw new Error("Chart must have at least one series");
  }

  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const { buildSnapshot, insertHistoryRow } = await import("@/lib/supabase/queries/quiz/history");
  const supabase = createAdminClient();

  const { data: before, error: bErr } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", input.questionId)
    .maybeSingle();
  if (bErr) throw bErr;
  if (!before) throw new Error(`Question ${input.questionId} not found`);
  const beforeSnap = buildSnapshot(before as unknown as Parameters<typeof buildSnapshot>[0]);

  // Mark the chart data as "admin-edited" by overwriting extracted_by
  // so future re-extraction passes know not to clobber human work.
  const chartData: ChartFigure = {
    ...input.chartData,
    extracted_by: `admin:${userId}`,
    extracted_at: new Date().toISOString(),
    // Admin edits start fully confident — flow goes through manual
    // review either way.
    confidence: 1,
  };

  type QQUpdate = Database["public"]["Tables"]["quiz_questions"]["Update"];
  const { error: upErr } = await supabase
    .from("quiz_questions")
    .update({
      figure_kind: "chart",
      // Cast through unknown — the generated Json type doesn't
      // know about our discriminated unions.
      figure_chart_data: chartData as unknown as QQUpdate["figure_chart_data"],
      updated_at: new Date().toISOString(),
    } satisfies QQUpdate)
    .eq("id", input.questionId);
  if (upErr) throw upErr;

  const { data: after } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", input.questionId)
    .maybeSingle();
  if (after) {
    await insertHistoryRow({
      questionId: input.questionId,
      beforeState: beforeSnap,
      afterState: buildSnapshot(after as unknown as Parameters<typeof buildSnapshot>[0]),
      editedBy: userId,
      source: "inspector",
      note: "Edited AI chart extraction",
    });
  }
  revalidatePath("/admin/questions/chart-review");
  revalidatePath(`/admin/questions/inspect/${input.questionId}`);
}

/** Reject the AI's extraction. Clears figure_chart_data + sets
 *  figure_kind='image' so the student keeps seeing the original
 *  screenshot indefinitely (until the admin manually fixes it via
 *  edit, or a future extractor pass succeeds with better signal). */
export async function actionRejectChart(input: {
  questionId: string;
  reason?: string;
}): Promise<void> {
  questionIdSchema.parse({ questionId: input.questionId });
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const { buildSnapshot, insertHistoryRow } = await import("@/lib/supabase/queries/quiz/history");
  const supabase = createAdminClient();

  const { data: before, error: bErr } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", input.questionId)
    .maybeSingle();
  if (bErr) throw bErr;
  if (!before) throw new Error(`Question ${input.questionId} not found`);
  const beforeSnap = buildSnapshot(before as unknown as Parameters<typeof buildSnapshot>[0]);

  type QQUpdate = Database["public"]["Tables"]["quiz_questions"]["Update"];
  const { error: upErr } = await supabase
    .from("quiz_questions")
    .update({
      figure_kind: "image",
      figure_chart_data: null,
      updated_at: new Date().toISOString(),
    } satisfies QQUpdate)
    .eq("id", input.questionId);
  if (upErr) throw upErr;

  const { data: after } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", input.questionId)
    .maybeSingle();
  if (after) {
    await insertHistoryRow({
      questionId: input.questionId,
      beforeState: beforeSnap,
      afterState: buildSnapshot(after as unknown as Parameters<typeof buildSnapshot>[0]),
      editedBy: userId,
      source: "inspector",
      note: input.reason
        ? `Rejected AI chart extraction (${input.reason})`
        : "Rejected AI chart extraction",
    });
  }
  revalidatePath("/admin/questions/chart-review");
  revalidatePath(`/admin/questions/inspect/${input.questionId}`);
}
