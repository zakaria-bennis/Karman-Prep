"use server";

// Curated review homework, the two presses: the student starts a set their tutor sent (from
// Homework), and the tutor sends this week's set (from the tutor's student page). Inputs are checked
// with Zod; who may do what is decided here on the server, never from what the page sends.
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { canTutorAccessStudent } from "@/lib/auth/tutor-access";
import { PlanLimitError } from "@/lib/assembler/plan-gate";
import type { RunView } from "@/lib/assembler/run-types";
import { fetchUserRole, resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { sendReviewSet, startReviewSet } from "./review-sets";

type Result<T> = { ok: true; value: T } | { ok: false; error: string; limit?: boolean };

const setInput = z.object({ setId: z.string().uuid() }).strict();

/** The same per-student order of answer choices the other activities use (play-actions.ts). */
const seedOf = (clerkId: string) =>
  createHash("sha256").update(`karman-shuffle:${clerkId}`).digest("hex").slice(0, 16);

export async function actionStartReviewSet(
  input: z.input<typeof setInput>
): Promise<Result<{ view: RunView; seed: string }>> {
  try {
    const { userId } = await safeAuth();
    if (!userId || !["student", "admin"].includes((await fetchUserRole(userId)) ?? ""))
      return { ok: false, error: "Sign in with a student account to practice." };
    const { setId } = setInput.parse(input);
    return { ok: true, value: { view: await startReviewSet(userId, setId), seed: seedOf(userId) } };
  } catch (error) {
    if (error instanceof PlanLimitError) return { ok: false, error: error.message, limit: true };
    const message = error instanceof Error ? error.message : "";
    console.error("[review-sets] start:", message);
    return {
      ok: false,
      error:
        message === "Nothing to review"
          ? "There are no fresh questions for this review yet."
          : "We could not open your review. Try again.",
    };
  }
}

const sendInput = z
  .object({ setId: z.string().uuid(), studentClerkId: z.string().min(3).max(80) })
  .strict();

export async function actionSendReviewSet(input: z.input<typeof sendInput>): Promise<Result<true>> {
  const { userId: realUserId } = await safeAuth();
  if (!realUserId) return { ok: false, error: "Sign in first." };
  const { clerkId, isImpersonating } = await resolveEffectiveClerkId(realUserId);
  if (isImpersonating) return { ok: false, error: "Viewing as someone else: nothing is sent." };
  const parsed = sendInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That review set was not found." };
  const { setId, studentClerkId } = parsed.data;
  if (!(await canTutorAccessStudent(clerkId, studentClerkId)))
    return { ok: false, error: "This student is not yours." };
  const { data: me } = await createAdminClient()
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  const sent = await sendReviewSet(
    setId,
    studentClerkId,
    (me as { id: string } | null)?.id ?? null
  );
  if (!sent) return { ok: false, error: "It was already sent." };
  revalidatePath(`/tutor/${encodeURIComponent(studentClerkId)}`);
  return { ok: true, value: true };
}
