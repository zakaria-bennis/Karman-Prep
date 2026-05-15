"use server";

// ============================================================
// Server actions for the cohort setup-completion toggle (#4).
//
// Audit issue #4: the seminar-overflow webhook auto-creates
// sibling cohorts but the admin still has to configure the Cal
// event-type + Zoom integration on Cal.com itself. We track that
// out-of-band step via cohorts.setup_completed_at and surface a
// "Needs setup" badge + daily reminder email until the admin
// clicks Mark complete.
// ============================================================

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { markCohortSetupComplete, markCohortSetupIncomplete } from "@/lib/supabase/queries/cohorts";

async function guardAdmin() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const role = await fetchUserRole(userId);
  if (role !== "admin") throw new Error("Admin role required");
}

export async function actionMarkCohortSetupComplete(cohortId: string) {
  await guardAdmin();
  if (!cohortId) throw new Error("Missing cohortId");
  await markCohortSetupComplete(cohortId);
  revalidatePath(`/admin/cohorts/${cohortId}`);
  revalidatePath("/admin/cohorts");
}

export async function actionMarkCohortSetupIncomplete(cohortId: string) {
  await guardAdmin();
  if (!cohortId) throw new Error("Missing cohortId");
  await markCohortSetupIncomplete(cohortId);
  revalidatePath(`/admin/cohorts/${cohortId}`);
  revalidatePath("/admin/cohorts");
}
