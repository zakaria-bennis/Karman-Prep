"use server";

/*
 * Settings, Scholarship (Cohort students): the student's cohorts and claims, read when the folder
 * opens, and the upload of their official SAT score report. Moved here from the old
 * /dashboard/student/scholarship page, which now opens this folder. The rules and the check of the
 * report are the scholarship's own (src/lib/scholarship/).
 */
import { revalidatePath } from "next/cache";
import { getStudentCohorts, listStudentClaims } from "@/lib/scholarship/queries";
import { reportFileSchema, submitClaimFieldsSchema } from "@/lib/scholarship/schemas";
import { ScholarshipError, submitClaim, type ActionResult } from "@/lib/scholarship/service";
import { StorageUnavailableError } from "@/lib/scholarship/storage";
import { ownStudent, viewedStudent, type Failure } from "./own-student";
import type { ScholarshipClaim } from "./settings-rules";
import { emptySchema } from "./settings-schemas";

export async function actionScholarship(
  input: unknown
): Promise<
  { ok: true; cohorts: { id: string; name: string }[]; claims: ScholarshipClaim[] } | Failure
> {
  if (!emptySchema.safeParse(input).success) return { ok: false, error: "Try that again." };
  const who = await viewedStudent();
  if (!who.ok) return who;
  try {
    const [cohorts, claims] = await Promise.all([
      getStudentCohorts(who.student.id),
      listStudentClaims(who.student.id),
    ]);
    return {
      ok: true,
      cohorts: cohorts.map((c) => ({ id: c.id, name: c.name })),
      claims: claims.map((k) => ({
        id: k.id,
        cohortId: k.cohort_id,
        status: k.status,
        submittedAt: k.submitted_at,
        reviewReason: k.review_reason,
        refundCents: k.refund_amount_cents,
        bonusCents: k.bonus_amount_cents,
      })),
    };
  } catch (e) {
    console.error("[scholarship] read failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "This didn't load. Try again in a moment." };
  }
}

/** The upload: cohort, the score and date the student read on the report, and the PDF itself. */
export async function actionSubmitScholarship(formData: FormData): Promise<ActionResult> {
  const fields = submitClaimFieldsSchema.safeParse({
    cohortId: formData.get("cohortId"),
    declaredTotalScore: formData.get("declaredTotalScore"),
    declaredTestDate: formData.get("declaredTestDate"),
  });
  if (!fields.success)
    return { ok: false, error: fields.error.issues[0]?.message ?? "Check the form." };
  const file = reportFileSchema.safeParse(formData.get("report"));
  if (!file.success) return { ok: false, error: file.error.issues[0]?.message ?? "Choose a PDF." };
  if (formData.get("confirm") !== "on")
    return { ok: false, error: "Tick the box to say this is your official report." };

  const who = await ownStudent();
  if (!who.ok) return who;

  try {
    await submitClaim({
      clerkId: who.student.clerkId,
      cohortId: fields.data.cohortId,
      declaredTotalScore: fields.data.declaredTotalScore,
      declaredTestDate: fields.data.declaredTestDate,
      fileName: file.data.name,
      bytes: new Uint8Array(await file.data.arrayBuffer()),
    });
    revalidatePath("/admin/scholarship");
    return { ok: true };
  } catch (err) {
    if (err instanceof ScholarshipError || err instanceof StorageUnavailableError) {
      return { ok: false, error: err.message };
    }
    console.error("[scholarship] submit failed", err);
    return { ok: false, error: "The upload didn't go through. Try again in a minute." };
  }
}
